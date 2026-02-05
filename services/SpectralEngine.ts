
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
      console.log("Initializing Spectral Core...");
      // Allocate the pipeline for text generation using OpenELM-270M
      // Note: Transformers.js v3 sometimes returns progress as 0-100
      this.generator = await pipeline('text-generation', 'Xenova/OpenELM-270M-Instruct', {
        progress_callback: (data: any) => {
          if (data.status === 'progress' && onProgress) {
            // Normalize progress to 0-100
            const p = data.progress > 1 ? data.progress : data.progress * 100;
            onProgress(Math.min(p, 100));
          }
          if (data.status === 'done' && onProgress) {
            onProgress(100);
          }
        }
      });
      console.log("Spectral Core stabilized.");
    } catch (error) {
      console.error("Aethereal Core failed to stabilize:", error);
      throw error;
    }
  }

  async generateWhisper(articles: WikiArticle[], coords: GeoPoint): Promise<string> {
    if (!this.generator) {
      return "The aethereal core is dormant. No whispers can be captured.";
    }

    const anchors = articles.length > 0 
      ? articles.sort(() => 0.5 - Math.random()).slice(0, 2).map(a => a.title)
      : ["the void", "the silence"];

    // Simple cryptic prompt
    const prompt = `Location: ${anchors.join(' and ')}. Coords: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}. Write a spooky, short sentence about the parallel dimension here. One sentence only.`;
    const formattedPrompt = `<user>\n${prompt}\n<assistant>\n`;

    try {
      const output = await this.generator(formattedPrompt, {
        max_new_tokens: 30,
        temperature: 0.9,
        do_sample: true,
        top_k: 50,
        repetition_penalty: 1.1
      });

      let text = output[0].generated_text;
      
      // Clean and isolate assistant response
      if (text.includes('<assistant>')) {
        text = text.split('<assistant>')[1].trim();
      } else {
        text = text.replace(formattedPrompt, '').trim();
      }

      // Final sanitization: grab first sentence, remove tags
      const finalized = text.split(/[.!?\n]/)[0].replace(/[<>]/g, '').trim();
      return finalized ? finalized + "." : "A presence lingers here, unanchored and cold.";
    } catch (error) {
      console.error("Drift inference error:", error);
      return "Spectral static obscures the message from the other side.";
    }
  }
}

export const spectralEngine = new SpectralEngine();
