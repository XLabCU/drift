
import { GoogleGenAI } from "@google/genai";
import { WikiArticle, GeoPoint } from '../types.ts';

class SpectralEngine {
  private ai: GoogleGenAI | null = null;

  async init(onProgress?: (progress: number) => void) {
    if (onProgress) onProgress(100);
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async generateWhisper(articles: WikiArticle[], coords: GeoPoint): Promise<string> {
    if (!this.ai) {
      this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }

    const anchors = articles.length > 0 
      ? articles.sort(() => 0.5 - Math.random()).slice(0, 3).map(a => a.title)
      : ["the featureless void", "the silent gaps between coordinates"];

    const prompt = `You are a sensor translating spectral echoes from a parallel dimension tied to physical geography.
The current anchors are: ${anchors.join(', ')}.
Location: ${coords.lat.toFixed(4)}N, ${coords.lng.toFixed(4)}E.

Generate a single, short, haunting sentence (under 15 words) about what is "drifting" in the latent space at this specific location. 
Incorporate the anchors cryptically. Do not use conversational filler. Be eldritch, poetic, and mysterious.`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          temperature: 0.9,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 60,
        },
      });

      return response.text?.trim() || "A presence lingers here, unanchored and cold.";
    } catch (error) {
      console.error("SpectralEngine: API Error:", error);
      return "Spectral static obscures the signal. The void remains silent.";
    }
  }
}

export const spectralEngine = new SpectralEngine();
