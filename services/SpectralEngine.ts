import { pipeline, env } from '@huggingface/transformers';
import { WikiArticle, GeoPoint } from '../types.ts';

// Configure Transformers.js for browser environment
env.allowLocalModels = false;
env.useBrowserCache = true;

interface ArticleWithBearing extends WikiArticle {
  distance: number;
  bearing: number;
  bearingDelta: number; // How far off the user's heading
}

class SpectralEngine {
  private generator: any = null;
  private isLoading = false;
  private modelId = 'Xenova/OpenELM-270M-Instruct';

  async init(onProgress?: (progress: number) => void) {
    if (this.generator || this.isLoading) return;
    this.isLoading = true;

    try {
      console.log(`[SpectralEngine] Initializing local core: ${this.modelId}`);
      
      this.generator = await pipeline('text-generation', this.modelId, {
        progress_callback: (data: any) => {
          if (data.status === 'progress' && data.progress !== undefined) {
            onProgress?.(Math.round(data.progress));
          } else if (data.status === 'done') {
            onProgress?.(100);
          }
        },
      });
      console.log('[SpectralEngine] Local core online.');
    } catch (error) {
      console.error('[SpectralEngine] Initialization failed:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Calculate bearing from point A to point B in degrees (0-360)
   */
  private calculateBearing(from: GeoPoint, to: GeoPoint): number {
    const lat1 = (from.lat * Math.PI) / 180;
    const lat2 = (to.lat * Math.PI) / 180;
    const dLng = ((to.lng - from.lng) * Math.PI) / 180;

    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - 
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    
    let bearing = (Math.atan2(y, x) * 180) / Math.PI;
    return (bearing + 360) % 360;
  }

  /**
   * Calculate distance between two points in meters (Haversine)
   */
  private calculateDistance(from: GeoPoint, to: GeoPoint): number {
    const R = 6371000; // Earth's radius in meters
    const lat1 = (from.lat * Math.PI) / 180;
    const lat2 = (to.lat * Math.PI) / 180;
    const dLat = lat2 - lat1;
    const dLng = ((to.lng - from.lng) * Math.PI) / 180;

    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }

  /**
   * Calculate smallest angle difference between two bearings
   */
  private bearingDelta(bearing1: number, bearing2: number): number {
    let delta = Math.abs(bearing1 - bearing2);
    return delta > 180 ? 360 - delta : delta;
  }

  /**
   * Find the two closest articles along the user's heading
   * @param articles - Available articles with coordinates
   * @param userPos - User's current position
   * @param heading - User's heading in degrees (0 = North, 90 = East)
   * @param coneAngle - How wide the "ahead" cone is (default 60° each side)
   */
  private findArticlesAlongHeading(
    articles: WikiArticle[],
    userPos: GeoPoint,
    heading: number,
    coneAngle: number = 60
  ): WikiArticle[] {
    const articlesWithBearing: ArticleWithBearing[] = articles
      .filter(a => a.lat !== undefined && a.lng !== undefined)
      .map(article => {
        const articlePos: GeoPoint = { lat: article.lat!, lng: article.lng! };
        const bearing = this.calculateBearing(userPos, articlePos);
        const distance = this.calculateDistance(userPos, articlePos);
        const bearingDelta = this.bearingDelta(heading, bearing);

        return {
          ...article,
          distance,
          bearing,
          bearingDelta,
        };
      })
      // Filter to only articles within the cone ahead
      .filter(a => a.bearingDelta <= coneAngle)
      // Sort by distance (closest first)
      .sort((a, b) => a.distance - b.distance);

    // Return the two closest along heading
    return articlesWithBearing.slice(0, 2);
  }

  /**
   * Extract a meaningful snippet from article content
   */
  private extractSnippet(article: WikiArticle, maxLength: number = 80): string {
    const text = article.extract || article.title;
    
    // Take first sentence or truncate
    const firstSentence = text.split(/[.!?]/)[0];
    if (firstSentence.length <= maxLength) {
      return firstSentence.trim();
    }
    
    return text.slice(0, maxLength).trim() + '…';
  }

  async generateWhisper(
    articles: WikiArticle[], 
    coords: GeoPoint,
    heading?: number // User's heading in degrees
  ): Promise<string> {
    if (!this.generator) {
      throw new Error("Spectral core not initialized. Call init() first.");
    }

    let selectedArticles: WikiArticle[];
    
    if (heading !== undefined && articles.length >= 2) {
      // Find articles along heading
      selectedArticles = this.findArticlesAlongHeading(articles, coords, heading);
      
      // Fall back to random if we don't have 2 along heading
      if (selectedArticles.length < 2) {
        selectedArticles = articles
          .sort(() => 0.5 - Math.random())
          .slice(0, 2);
      }
    } else {
      // No heading data - use random selection
      selectedArticles = articles
        .sort(() => 0.5 - Math.random())
        .slice(0, 2);
    }

    // Handle edge cases
    if (selectedArticles.length === 0) {
      return "The void hums with absent histories.";
    }
    
    if (selectedArticles.length === 1) {
      const snippet = this.extractSnippet(selectedArticles[0]);
      return `Echoes of ${selectedArticles[0].title} dissolve into static.`;
    }

    const [article1, article2] = selectedArticles;
    const snippet1 = this.extractSnippet(article1);
    const snippet2 = this.extractSnippet(article2);

    const prompt = `<|user|>
You are a spectral oracle weaving connections between places.

FRAGMENT A - "${article1.title}":
"${snippet1}"

FRAGMENT B - "${article2.title}":
"${snippet2}"

Task: These two fragments combine in your fever dreams, a message from an eldritch dimension waiting to be born. Write ONE haunting sentence (max 15 words) that result. Be cryptic and poetic.
<|assistant|>
`;

    try {
      const result = await this.generator(prompt, {
        max_new_tokens: 40,
        temperature: 0.9,
        top_p: 0.92,
        do_sample: true,
        return_full_text: false,
      });

      let text = '';
      if (Array.isArray(result) && result.length > 0) {
        text = result[0].generated_text || '';
      }

      // Clean up: take first sentence, remove artifacts
      const cleaned = text
        .split('\n')[0]
        .split(/[.!?]/)[0]
        .replace(/<[^>]*>/g, '') // Remove any HTML-like tags
        .trim();

      return cleaned || `Where ${article1.title} fades, ${article2.title} begins to whisper.`;
    } catch (error) {
      console.error("[SpectralEngine] Generation error:", error);
      return `${article1.title} and ${article2.title} drift through spectral static.`;
    }
  }
}

export const spectralEngine = new SpectralEngine();
