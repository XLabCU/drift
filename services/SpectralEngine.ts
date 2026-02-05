import { pipeline, env, TextStreamer } from '@huggingface/transformers';
import { WikiArticle, GeoPoint } from '../types.ts';

// Configure Transformers.js for browser environment
env.allowLocalModels = false;
env.useBrowserCache = true;

interface ArticleWithBearing extends WikiArticle {
  distance: number;
  bearing: number;
  bearingDelta: number;
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

  private calculateDistance(from: GeoPoint, to: GeoPoint): number {
    const R = 6371000;
    const lat1 = (from.lat * Math.PI) / 180;
    const lat2 = (to.lat * Math.PI) / 180;
    const dLat = lat2 - lat1;
    const dLng = ((to.lng - from.lng) * Math.PI) / 180;

    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }

  private bearingDelta(bearing1: number, bearing2: number): number {
    let delta = Math.abs(bearing1 - bearing2);
    return delta > 180 ? 360 - delta : delta;
  }

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

        return { ...article, distance, bearing, bearingDelta };
      })
      .filter(a => a.bearingDelta <= coneAngle)
      .sort((a, b) => a.distance - b.distance);

    return articlesWithBearing.slice(0, 2);
  }

  private extractSnippet(article: WikiArticle, maxLength: number = 80): string {
    const text = article.extract || article.title;
    const firstSentence = text.split(/[.!?]/)[0];
    if (firstSentence.length <= maxLength) {
      return firstSentence.trim();
    }
    return text.slice(0, maxLength).trim() + '…';
  }

  /**
   * Stream a whisper token by token
   * @param onToken - Called with each new token and the accumulated text
   * @returns Promise that resolves with the final complete text
   */
  async generateWhisperStreaming(
    articles: WikiArticle[], 
    coords: GeoPoint,
    onToken: (token: string, accumulated: string) => void,
    heading?: number
  ): Promise<string> {
    if (!this.generator) {
      throw new Error("Spectral core not initialized. Call init() first.");
    }

    let selectedArticles: WikiArticle[];
    
    if (heading !== undefined && articles.length >= 2) {
      selectedArticles = this.findArticlesAlongHeading(articles, coords, heading);
      if (selectedArticles.length < 2) {
        selectedArticles = articles.sort(() => 0.5 - Math.random()).slice(0, 2);
      }
    } else {
      selectedArticles = articles.sort(() => 0.5 - Math.random()).slice(0, 2);
    }

    if (selectedArticles.length === 0) {
      const fallback = "The void hums with absent histories.";
      onToken(fallback, fallback);
      return fallback;
    }
    
    if (selectedArticles.length === 1) {
      const fallback = `Echoes of ${selectedArticles[0].title} dissolve into static.`;
      onToken(fallback, fallback);
      return fallback;
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

    let accumulated = '';

    try {
      // Create a custom streamer
      const streamer = new TextStreamer(this.generator.tokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
        callback_function: (token: string) => {
          // Stop at newlines or sentence endings for cleaner output
          if (token.includes('\n')) {
            return; // Don't add newlines
          }
          accumulated += token;
          onToken(token, accumulated);
        },
      });

      await this.generator(prompt, {
        max_new_tokens: 40,
        temperature: 0.9,
        top_p: 0.92,
        do_sample: true,
        return_full_text: false,
        streamer,
      });

      // Clean up final result
      const cleaned = accumulated
        .split('\n')[0]
        .split(/[.!?]/)[0]
        .replace(/<[^>]*>/g, '')
        .trim();

      return cleaned || `Where ${article1.title} fades, ${article2.title} begins to whisper.`;
    } catch (error) {
      console.error("[SpectralEngine] Generation error:", error);
      const fallback = `${article1.title} and ${article2.title} drift through spectral static.`;
      onToken(fallback, fallback);
      return fallback;
    }
  }

  // Keep non-streaming version for backwards compatibility
  async generateWhisper(
    articles: WikiArticle[], 
    coords: GeoPoint,
    heading?: number
  ): Promise<string> {
    return this.generateWhisperStreaming(articles, coords, () => {}, heading);
  }
}

export const spectralEngine = new SpectralEngine();
