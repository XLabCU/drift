import { WikiArticle, GeoPoint } from '../types.ts';

interface ArticleWithBearing extends WikiArticle {
  distance: number;
  bearing: number;
  bearingDelta: number;
}

// Poetic templates for structure
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
  "memory", "erosion", "whispers", "nothing", "time", "void"
];

const VERBS = [
  "stood", "whispered", "burned", "waited", "watched", "crumbled",
  "sang", "wept", "listened", "dreamed", "forgot", "remembered",
  "faded", "lingered", "dissolved", "returned", "vanished", "slept"
];

class SpectralEngine {
  private ready = false;

  async init(onProgress?: (progress: number) => void) {
    // Instant "initialization" for effect
    onProgress?.(50);
    await new Promise(r => setTimeout(r, 300));
    onProgress?.(100);
    this.ready = true;
    console.log('[SpectralEngine] Linguistic matrix online.');
  }

  // ============ GEO UTILITIES ============

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
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private bearingDelta(b1: number, b2: number): number {
    const delta = Math.abs(b1 - b2);
    return delta > 180 ? 360 - delta : delta;
  }

  private findArticlesAlongHeading(
    articles: WikiArticle[],
    userPos: GeoPoint,
    heading: number,
    coneAngle: number = 60
  ): WikiArticle[] {
    return articles
      .filter(a => a.lat !== undefined && a.lng !== undefined)
      .map(article => ({
        ...article,
        distance: this.calculateDistance(userPos, { lat: article.lat!, lng: article.lng! }),
        bearing: this.calculateBearing(userPos, { lat: article.lat!, lng: article.lng! }),
        bearingDelta: this.bearingDelta(
          heading, 
          this.calculateBearing(userPos, { lat: article.lat!, lng: article.lng! })
        ),
      }))
      .filter(a => a.bearingDelta <= coneAngle)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 2);
  }

  // ============ TEXT EXTRACTION ============

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s'-]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);
  }

  private extractNouns(text: string): string[] {
    const words = this.tokenize(text);
    // Heuristic: longer words, not common verbs/prepositions
    const stopwords = new Set([
      'the', 'and', 'was', 'were', 'been', 'being', 'have', 'has', 'had',
      'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
      'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'that',
      'which', 'who', 'whom', 'this', 'these', 'those', 'what', 'where',
      'when', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more',
      'most', 'other', 'some', 'such', 'only', 'own', 'same', 'than',
      'too', 'very', 'just', 'also', 'now', 'here', 'there', 'then',
      'once', 'from', 'into', 'with', 'about', 'against', 'between',
      'through', 'during', 'before', 'after', 'above', 'below', 'under'
    ]);
    
    return words
      .filter(w => w.length > 3 && !stopwords.has(w))
      .filter((w, i, arr) => arr.indexOf(w) === i); // unique
  }

  private extractKeyPhrase(text: string): string {
    const sentences = text.split(/[.!?]+/);
    const first = sentences[0]?.trim() || '';
    
    // Try to extract a noun phrase fragment
    const words = first.split(/\s+/).slice(0, 6);
    return words.join(' ');
  }

  // ============ GENERATION TECHNIQUES ============

  /**
   * Markov-ish blending: build bigram map from both texts,
   * then walk it starting from a shared or random word
   */
  private markovBlend(textA: string, textB: string, length: number = 8): string {
    const buildBigrams = (text: string): Map<string, string[]> => {
      const words = this.tokenize(text);
      const map = new Map<string, string[]>();
      for (let i = 0; i < words.length - 1; i++) {
        const current = words[i];
        const next = words[i + 1];
        if (!map.has(current)) map.set(current, []);
        map.get(current)!.push(next);
      }
      return map;
    };

    const bigramsA = buildBigrams(textA);
    const bigramsB = buildBigrams(textB);
    
    // Merge the bigram maps
    const merged = new Map<string, string[]>();
    for (const [k, v] of bigramsA) merged.set(k, [...v]);
    for (const [k, v] of bigramsB) {
      if (merged.has(k)) merged.get(k)!.push(...v);
      else merged.set(k, [...v]);
    }

    // Find shared words to start from (more uncanny)
    const wordsA = new Set(this.tokenize(textA));
    const wordsB = new Set(this.tokenize(textB));
    const shared = [...wordsA].filter(w => wordsB.has(w) && merged.has(w));
    
    let current = shared.length > 0 
      ? shared[Math.floor(Math.random() * shared.length)]
      : [...merged.keys()][Math.floor(Math.random() * merged.size)];
    
    const result = [current];
    
    for (let i = 0; i < length && merged.has(current); i++) {
      const options = merged.get(current)!;
      current = options[Math.floor(Math.random() * options.length)];
      result.push(current);
    }

    return result.join(' ');
  }

  /**
   * Cut-up technique: slice both texts into fragments,
   * interleave them (Burroughs/Gysin style)
   */
  private cutUp(textA: string, textB: string): string {
    const fragmentize = (text: string): string[] => {
      const words = text.split(/\s+/);
      const fragments: string[] = [];
      for (let i = 0; i < words.length; i += 2 + Math.floor(Math.random() * 3)) {
        const len = 2 + Math.floor(Math.random() * 3);
        fragments.push(words.slice(i, i + len).join(' '));
      }
      return fragments.filter(f => f.length > 0);
    };

    const fragsA = fragmentize(textA);
    const fragsB = fragmentize(textB);
    
    // Interleave randomly
    const result: string[] = [];
    let a = 0, b = 0;
    while (result.length < 6 && (a < fragsA.length || b < fragsB.length)) {
      if (Math.random() > 0.5 && a < fragsA.length) {
        result.push(fragsA[a++]);
      } else if (b < fragsB.length) {
        result.push(fragsB[b++]);
      }
    }

    return result.slice(0, 4).join(' — ');
  }

  /**
   * Template filling: structured poetry with extracted nouns
   */
  private templateFill(titleA: string, titleB: string, textA: string, textB: string): string {
    const nounsA = this.extractNouns(textA);
    const nounsB = this.extractNouns(textB);
    
    const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)] || 'nothing';
    
    const template = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
    
    return template
      .replace('{A}', titleA.split(/[,(]/)[0].trim())
      .replace('{B}', titleB.split(/[,(]/)[0].trim())
      .replace('{nounA}', pick(nounsA))
      .replace('{nounB}', pick(nounsB))
      .replace('{verbA}', pick(VERBS))
      .replace('{verbB}', pick(VERBS))
      .replace('{abstract}', pick(ABSTRACTS));
  }

  /**
   * Phonetic collision: find words that share sounds
   * (simplified: shared character sequences)
   */
  private phoneticBridge(textA: string, textB: string): string {
    const wordsA = this.extractNouns(textA);
    const wordsB = this.extractNouns(textB);
    
    // Find words with shared trigrams
    const trigrams = (word: string): Set<string> => {
      const t = new Set<string>();
      for (let i = 0; i <= word.length - 3; i++) {
        t.add(word.slice(i, i + 3));
      }
      return t;
    };

    let bestPair: [string, string] | null = null;
    let bestOverlap = 0;

    for (const a of wordsA) {
      const tA = trigrams(a);
      for (const b of wordsB) {
        const tB = trigrams(b);
        const overlap = [...tA].filter(t => tB.has(t)).length;
        if (overlap > bestOverlap && a !== b) {
          bestOverlap = overlap;
          bestPair = [a, b];
        }
      }
    }

    if (bestPair) {
      const bridges = [
        `${bestPair[0]} echoes ${bestPair[1]}`,
        `From ${bestPair[0]} to ${bestPair[1]}: a whisper`,
        `${bestPair[0]}... or was it ${bestPair[1]}?`,
        `The ${bestPair[0]} that became ${bestPair[1]}`,
      ];
      return bridges[Math.floor(Math.random() * bridges.length)];
    }

    return `${wordsA[0] || 'silence'} meets ${wordsB[0] || 'void'}`;
  }

  /**
   * Skip-gram extraction: pull words at intervals,
   * creating ghostly incomplete phrases
   */
  private skipGram(textA: string, textB: string, skip: number = 3): string {
    const wordsA = this.tokenize(textA);
    const wordsB = this.tokenize(textB);
    
    const skipped: string[] = [];
    
    // Alternate sources with skips
    for (let i = 0; i < Math.max(wordsA.length, wordsB.length) && skipped.length < 10; i += skip) {
      if (i < wordsA.length && Math.random() > 0.4) skipped.push(wordsA[i]);
      if (i < wordsB.length && Math.random() > 0.4) skipped.push(wordsB[i]);
    }

    return skipped.slice(0, 8).join(' ') + '...';
  }

  // ============ MAIN GENERATION ============

  async generateWhisper(
    articles: WikiArticle[],
    coords: GeoPoint,
    heading?: number
  ): Promise<string> {
    let selected: WikiArticle[];

    if (heading !== undefined && articles.length >= 2) {
      selected = this.findArticlesAlongHeading(articles, coords, heading);
      if (selected.length < 2) {
        selected = articles.sort(() => 0.5 - Math.random()).slice(0, 2);
      }
    } else {
      selected = articles.sort(() => 0.5 - Math.random()).slice(0, 2);
    }

    if (selected.length === 0) {
      return "The void offers no fragments tonight.";
    }

    if (selected.length === 1) {
      const nouns = this.extractNouns(selected[0].extract || selected[0].title);
      return `Only ${nouns[0] || selected[0].title} persists here. Alone.`;
    }

    const [a, b] = selected;
    const textA = a.extract || a.title;
    const textB = b.extract || b.title;

    // Randomly choose a technique
    const techniques = [
      () => this.templateFill(a.title, b.title, textA, textB),
      () => this.markovBlend(textA, textB),
      () => this.cutUp(textA, textB),
      () => this.phoneticBridge(textA, textB),
      () => this.skipGram(textA, textB),
    ];

    const technique = techniques[Math.floor(Math.random() * techniques.length)];
    
    try {
      const result = technique();
      // Capitalize first letter
      return result.charAt(0).toUpperCase() + result.slice(1);
    } catch (e) {
      console.error('[SpectralEngine] Generation error:', e);
      return `${a.title} and ${b.title} blur at the edges.`;
    }
  }

  // Streaming simulation for UI consistency
  async generateWhisperStreaming(
    articles: WikiArticle[],
    coords: GeoPoint,
    onToken: (token: string, accumulated: string) => void,
    heading?: number
  ): Promise<string> {
    const result = await this.generateWhisper(articles, coords, heading);
    
    // Simulate character-by-character reveal for effect
    let accumulated = '';
    for (const char of result) {
      accumulated += char;
      onToken(char, accumulated);
      await new Promise(r => setTimeout(r, 30 + Math.random() * 40));
    }
    
    return result;
  }
}

export const spectralEngine = new SpectralEngine();
