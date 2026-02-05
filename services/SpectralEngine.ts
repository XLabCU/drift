
import { pipeline, env } from '@huggingface/transformers';
import { WikiArticle, GeoPoint } from '../types.ts';

// Configure Transformers.js for browser environment
env.allowLocalModels = false;
env.useBrowserCache = true;

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
            // progress is 0-100 from transformers.js
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

  async generateWhisper(articles: WikiArticle[], coords: GeoPoint): Promise<string> {
    if (!this.generator) {
      throw new Error("Spectral core not initialized. Call init() first.");
    }

    const anchors = articles.length > 0 
      ? articles.sort(() => 0.5 - Math.random()).slice(0, 3).map(a => a.title)
      : ["the featureless void", "the silent gaps"];

    // Prompt optimized for a small instruct model
    const prompt = `<|user|>
System: You are an eldritch sensor translating echoes from a parallel dimension.
Location: ${coords.lat.toFixed(4)}N, ${coords.lng.toFixed(4)}E. 
Anchors: ${anchors.join(', ')}.
Task: Generate one short, haunting, poetic sentence (max 12 words) about what is drifting here. Cryptically include an anchor. No filler.
<|assistant|>
`;

    try {
      const result = await this.generator(prompt, {
        max_new_tokens: 30,
        temperature: 0.85,
        top_p: 0.9,
        do_sample: true,
        return_full_text: false,
      });

      let text = '';
      if (Array.isArray(result) && result.length > 0) {
        text = result[0].generated_text || '';
      }

      // Clean up text (remove any trailing weirdness or multiple sentences)
      const cleaned = text.split('\n')[0].split('.')[0].trim();
      return cleaned || "A presence lingers here, unanchored and cold.";
    } catch (error) {
      console.error("[SpectralEngine] Generation error:", error);
      return "Spectral static obscures the signal.";
    }
  }
}

export const spectralEngine = new SpectralEngine();
