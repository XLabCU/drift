import { WikiArticle, GeoPoint } from '../types.ts';

interface ArticleWithBearing extends WikiArticle {
  distance: number;
  bearing: number;
  bearingDelta: number;
}

const TEMPLATES = [
  "Where {A} once {verbA}, now {B} {verbB}.",
  "The {nounA} remembers {nounB}.",
  "{nounA} and {nounB} share the same {abstract}.",
  "Beneath {A}, the echo of {B} persists.",
  "They buried {nounA} here. {nounB} grew from the soil.",
  "{nounA} dissolves into {nounB} at dusk.",
  "The {nounA} speaks in the voice of {nounB}.",
  "Once {nounA}, now {nounB}. Always {abstract}.",
  "Between {nounA} and {nounB}: {abstract}.",
  "{verbA} the {nounA}. {verbB} the {nounB}. Forget neither.",
];

const ABSTRACTS = [
  "silence", "forgetting", "dust", "echoes", "loss", "hunger",
  "waiting", "absence", "shadow", "longing", "static", "drift",
  "memory", "erosion", "whispers", "nothing", "time", "void", "haze"
];

const VERBS = [
  "stood", "whispered", "burned", "waited", "watched", "crumbled",
  "sang", "wept", "listened", "dreamed", "forgot", "remembered",
  "faded", "lingered", "dissolved", "returned", "vanished", "slept"
];

class SpectralEngine {
  private ready = false;

  async init(onProgress?: (progress: number) => void) {
    onProgress?.(30);
    await new Promise(r => setTimeout(r, 150));
    onProgress?.(100);
    this.ready = true;
    console.log('[SpectralEngine] NLP Matrix Online.');
  }

  // ============ GEO UTILITIES ============

  private calculateBearing(from: GeoPoint, to: GeoPoint): number {
    const lat1 = (from.lat * Math.PI) / 180;
    const lat2 = (to.lat * Math.PI) / 180;
    const dLng = ((to.lng - from.lng) * Math.PI) / 180;
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }

  private calculateDistance(from: GeoPoint, to: GeoPoint): number {
    const R = 6371000;
    const dLat = (to.lat - from.lat) * Math.PI / 180;
    const dLng = (to.lng - from.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + 
              Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) * 
              Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private findArticlesAlongHeading(articles: WikiArticle[], userPos: GeoPoint, heading: number): WikiArticle[] {
    return articles
      .filter(a => a.lat !== undefined && a.lng !== undefined)
      .map(article => {
        const bearing = this.calculateBearing(userPos, { lat: article.lat!, lng: article.lng! });
        let delta = Math.abs(heading - bearing);
        if (delta > 180) delta = 360 - delta;
        return {
          ...article,
          distance: this.calculateDistance(userPos, { lat: article.lat!, lng: article.lng! }),
          bearing,
          bearingDelta: delta
        };
      })
      .filter(a => a.bearingDelta <= 60)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 2);
  }

  // ============ NLP HELPERS ============

  private tokenize(text: string): string[] {
    return text.toLowerCase().replace(/[^\w\s'-]/g, ' ').split(/\s+/).filter(w => w.length > 2);
  }

  private extractNouns(text: string): string[] {
    const stopwords = new Set(['the', 'and', 'with', 'from', 'that', 'this', 'was', 'were', 'which', 'their']);
    return this.tokenize(text).filter(w => w.length > 4 && !stopwords.has(w));
  }

  // ============ TECHNIQUES ============

  private markovBlend(textA: string, textB: string): string {
    const wordsA = this.tokenize(textA);
    const wordsB = this.tokenize(textB);
    const map = new Map<string, string[]>();

    const build = (words: string[]) => {
      for (let i = 0; i < words.length - 1; i++) {
        const list = map.get(words[i]) || [];
        list.push(words[i + 1]);
        map.set(words[i], list);
      }
    };

    build(wordsA); build(wordsB);

    const common = wordsA.filter(w => wordsB.includes(w));
    let cur = common.length ? common[Math.floor(Math.random() * common.length)] : wordsA[0];
    const res = [cur];

    for (let i = 0; i < 8; i++) {
      const nexts = map.get(cur);
      if (!nexts) break;
      cur = nexts[Math.floor(Math.random() * nexts.length)];
      res.push(cur);
    }
    return res.join(' ');
  }

  private cutUp(textA: string, textB: string): string {
    const chunk = (t: string) => t.split(/\s+/).slice(0, 15).sort(() => Math.random() - 0.5).slice(0, 3).join(' ');
    return `${chunk(textA)} — ${chunk(textB)} — ${chunk(textA)}`;
  }

  private phoneticBridge(textA: string, textB: string): string {
    const nA = this.extractNouns(textA);
    const nB = this.extractNouns(textB);
    for (const a of nA) {
      for (const b of nB) {
        if (a.slice(0, 3) === b.slice(0, 3) && a !== b) {
          return `${a} becomes ${b} in the dark`;
        }
      }
    }
    return `${nA[0] || 'stone'} and ${nB[0] || 'ash'}`;
  }

  private templateFill(a: WikiArticle, b: WikiArticle): string {
    const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
    const nA = this.extractNouns(a.extract || '');
    const nB = this.extractNouns(b.extract || '');
    
    return pick(TEMPLATES)
      .replace('{A}', a.title.split('(')[0].trim())
      .replace('{B}', b.title.split('(')[0].trim())
      .replace('{nounA}', nA[0] || 'shadow')
      .replace('{nounB}', nB[0] || 'echo')
      .replace('{verbA}', pick(VERBS))
      .replace('{verbB}', pick(VERBS))
      .replace('{abstract}', pick(ABSTRACTS));
  }

  // ============ PUBLIC API ============

  async generateWhisper(articles: WikiArticle[], coords: GeoPoint, heading?: number): Promise<string> {
    if (!articles.length) return "The static is silent here.";
    
    const selected = heading !== undefined 
      ? this.findArticlesAlongHeading(articles, coords, heading) 
      : articles.sort(() => 0.5 - Math.random()).slice(0, 2);

    if (selected.length < 2) return `The ghost of ${selected[0]?.title || 'nothing'} lingers.`;

    const [a, b] = selected;
    const techniques = [
      () => this.templateFill(a, b),
      () => this.markovBlend(a.extract || '', b.extract || ''),
      () => this.cutUp(a.extract || '', b.extract || ''),
      () => this.phoneticBridge(a.extract || '', b.extract || '')
    ];

    const result = techniques[Math.floor(Math.random() * techniques.length)]();
    return result.charAt(0).toUpperCase() + result.slice(1);
  }

  async generateWhisperStreaming(
    articles: WikiArticle[],
    coords: GeoPoint,
    onToken: (token: string, accumulated: string) => void,
    heading?: number
  ): Promise<string> {
    const fullText = await this.generateWhisper(articles, coords, heading);
    let current = "";
    // Faster streaming for NLP
    for (const char of fullText) {
      current += char;
      onToken(char, current);
      await new Promise(r => setTimeout(r, 20 + Math.random() * 30));
    }
    return fullText;
  }
}

export const spectralEngine = new SpectralEngine();
