import { pipeline, env } from '@huggingface/transformers';
import { WikiArticle, GeoPoint } from '../types';

// Environment setup for browser-side HuggingFace Transformers
env.allowLocalModels = false;
env.useBrowserCache = true;

class SpectralEngine {
  private generator: any = null;

  async init(onProgress?: (progress: number) => void) {
    if (this.generator) {
      if (onProgress) onProgress(100);
      return;
    }

    try {
      console.log("SpectralEngine: Initializing Core...");
      this.generator = await pipeline('text-generation', 'Xenova/OpenELM-270M-Instruct', {
        progress_callback: (data: any) => {
          if (data.status === 'progress' && onProgress) {
            // Transformers.js v3 provides progress as 0 to 1
            // We ensure we don't multiply if it's already over 1 (just in case)
            const p = data.progress > 1 ? data.progress : data.progress * 100;
            onProgress(Math.min(Math.round(p), 100));
          }
          if (data.status === 'done' && onProgress) {
            onProgress(100);
          }
        }
      });
      console.log("SpectralEngine: Core stabilized.");
    } catch (error) {
      console.error("SpectralEngine: Core failure:", error);
      throw error;
    }
  }

  async generateWhisper(articles: WikiArticle[], coords: GeoPoint): Promise<string> {
    if (!this.generator) {
      return "The aethereal core is dormant.";
    }

    const anchors = articles.length > 0 
      ? articles.sort(() => 0.5 - Math.random()).slice(0, 2).map(a => a.title)
      : ["the void", "the empty silence"];

    const prompt = `Location: ${anchors.join(' and ')}. Coords: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}. Write a spooky, very short sentence about a parallel dimension here.`;
    const formattedPrompt = `<user>\n${prompt}\n<assistant>\n`;

    try {
      const output = await this.generator(formattedPrompt, {
        max_new_tokens: 35,
        temperature: 0.85,
        do_sample: true,
        top_k: 40,
        repetition_penalty: 1.2
      });

      let text = output[0].generated_text;
      
      if (text.includes('<assistant>')) {
        text = text.split('<assistant>')[1].trim();
      } else {
        text = text.replace(formattedPrompt, '').trim();
      }

      const finalized = text.split(/[.!?\n]/)[0].replace(/[<>]/g, '').trim();
      return finalized ? finalized + "." : "A presence lingers here, unanchored and cold.";
    } catch (error) {
      console.error("SpectralEngine: Inference error:", error);
      return "Spectral static obscures the signal.";
    }
  }
}

export const spectralEngine = new SpectralEngine();