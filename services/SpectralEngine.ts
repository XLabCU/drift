import { WikiArticle, GeoPoint } from '../types.ts';

interface ArticleWithBearing extends WikiArticle {
  distance: number;
  bearing: number;
  bearingDelta: number;
}

export class SpectralEngine {
  private ready = false;

  private ABSTRACTS = [
    "silence", "dust", "echoes", "loss", "shadow", "waiting", "static", "void", 
    "rust", "ether", "marrow", "salt", "ash", "mercury", "petrichor", "erosion",
    "absence", "gravity", "fever", "liminality", "decay", "starlight", "drift",
    "nothingness", "distortion", "amber", "frequency", "residue", "entropy"
  ];

  private VERBS = [
    "stood", "whispered", "burned", "crumbled", "sang", "faded", "dissolved", "slept",
    "fractured", "rotted", "haunted", "collapsed", "bloomed", "anchored", "shattered",
    "drifted", "waited", "glowed", "gasped", "withered", "lingered", "returned",
    "vibrated", "stuttered", "erased", "folded", "echoed", "vanished"
  ];

  private TEMPLATES = [
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
    "The {nounA} of {A} is haunted by the {nounB} of {B}.",
    "In the {abstract}, {A} and {B} become one.",
    "A map of {A} is etched into the {nounB} of {B}.",
    "The {nounA} was {verbA}. The {nounB} was {verbB}. Only {abstract} remains.",
    "{A} is a monument to {nounB}. {B} is a monument to {nounA}.",
    "The {nounA} of the past meets the {nounB} of the future.",
    "Every {nounA} in {A} is a ghost of {B}.",
    "The {abstract} is heavy between {A} and {B}.",
    "{verbA} in {A}, {verbB} in {B}. The {nounA} is the same.",
    "The ruins of {A} are built from the {nounB} of {B}.",
    "The {nounA} of {A} is a mirror for the {nounB} of {B}.",
    "Beneath the {nounA}, {A} is still {verbA}.",
    "The {abstract} of {B} has swallowed the {nounA} of {A}.",
    "There is no {nounA} in {A} that does not know {B}.",
    "The {nounA} is {A}. The {nounB} is {B}. The {abstract} is you.",
    "A bridge of {abstract} connects {A} to {B}.",
    "The {nounA} of {A} is older than the {nounB} of {B}.",
    "Neither {A} nor {B} can escape the {abstract}.",
    "What was lost in {A} was found in the {nounB} of {B}.",
    "The {nounA} of {A} is a prayer to {B}.",
    "The {verbA} of {A} is the {verbB} of {B}.",
    "Before {A}, there was only {nounB}. After {B}, only {abstract}.",
    "A ghost in {A} is searching for its {nounB} in {B}.",
    "{A} is the question, {B} is the {nounA}.",
    "The {nounA} of {A} is written in the {abstract} of {B}.",
    "The {abstract} of the land knows both {A} and {B}.",
    "If {A} is the body, {B} is the {nounA}.",
    "A symphony of {abstract} played over {A} and {B}.",
    "A scent of {abstract} lingers at the border of {A} and {B}.",
    "{A} is a dream that {B} is having.",
    "The {nounA} of {A} is the only key to {B}.",
    "To {verbA} in {A} is to {verbB} in {B}.",
    "Where {A} ends, the {nounB} of {B} begins.",
    "The {abstract} of {A} is a shadow cast by {B}.",
    "A path of {nounA} leads from {A} to the heart of {B}.",
    "In the {nounA} of {A}, the {nounB} of {B} is still {verbB}.",
    "{A} is a memory of {nounB}.",
    "The {nounA} in {A} is the same {nounA} in {B}.",
    "The {abstract} of {A} is the {abstract} of {B}.",
    "The {nounA} of {A} is the heartbeat of {B}.",
    "A whisper of {abstract} is all that connects {A} to {B}.",
    "The {verbA} {nounA} of {A} is the {verbB} {nounB} of {B}.",
    "In {A}, the {nounA} is {abstract}.",
    "A {nounA} of {A} for a {nounB} of {B}.",
    "The {abstract} is a thickness between {A} and {B}.",
    "The {nounA} was never there. {B} was never there. Only {abstract}.",
    "Listen. {A} is {verbA} in the {nounB} of {B}.",
    "The architecture of {A} is merely the {nounB} of {B} folded in time.",
    "They said {A} was {abstract}. They lied. It was {nounB}.",
    "A transmission from {A} was intercepted by {B}.",
    "The frequency of {A} is the {abstract} of {B}.",
    "There is a door in {A} that opens into {B}.",
    "You are standing on the {nounA} of {A}, but seeing the {nounB} of {B}.",
    "The {abstract} has no name in {A}.",
    "In {B}, the {nounB} is a ritual of {A}.",
    "The {nounA} of {A} bled into the {nounB} of {B}.",
    "Neither the {nounA} nor the {nounB} survived the {abstract}.",
    "History is a {nounA} that {A} tells to {B}.",
    "The {verbA} lights of {A} are seen from {B}.",
    "A {nounA} from {A} was found in the {abstract}.",
    "The {nounB} of {B} is the only witness to {A}.",
    "Time in {A} is measured in {abstract}.",
    "The {nounA} of {A} is {verbA}. The {nounB} of {B} is {verbB}.",
    "A {nounA} for the {abstract}.",
    "Do you hear the {nounA}? It comes from {A}.",
    "The {nounB} of {B} is {verbB} in the static.",
    "What {verbA} in {A} will {verbB} in {B}.",
    "The {nounA} of {A} is a glitch in the {nounB} of {B}.",
    "We are the {abstract} between {A} and {B}.",
    "Forget {A}. Remember the {nounB} of {B}.",
    "The {nounA} of {A} is {verbA} by the {nounB} of {B}.",
    "The {abstract} of {A} is a {nounB}.",
    "To {verbA} is to become {abstract}.",
    "The {nounA} is {A}. The {nounB} is {B}."
  ];

  async init(onProgress?: (progress: number) => void) {
    onProgress?.(100);
    this.ready = true;
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
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
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
      .filter(a => (a as any).bearingDelta <= 60)
      .sort((a, b) => (a as any).distance - (b as any).distance)
      .slice(0, 2);
  }

  // ============ NLP ============

  private tokenize(text: string): string[] {
    return text.toLowerCase().replace(/[^\w\s'-]/g, ' ').split(/\s+/).filter(w => w.length > 2);
  }

  private extractNouns(text: string): string[] {
    const stopwords = new Set(['the', 'and', 'was', 'were', 'been', 'with', 'from', 'that', 'which', 'their', 'this']);
    return this.tokenize(text).filter(w => w.length > 4 && !stopwords.has(w));
  }

  // ============ GENERATION ============

  async generateWhisper(articles: WikiArticle[], coords: GeoPoint, heading?: number): Promise<string> {
    const selected = (heading !== undefined && articles.length >= 2) 
      ? this.findArticlesAlongHeading(articles, coords, heading) 
      : articles.sort(() => 0.5 - Math.random()).slice(0, 2);

    if (selected.length === 0) return "The void is silent tonight.";
    if (selected.length === 1) return `The ghost of ${selected[0].title} persists alone.`;

    const [a, b] = selected;
    const nounsA = this.extractNouns(a.extract || a.title);
    const nounsB = this.extractNouns(b.extract || b.title);
    
    const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
    const template = pick(this.TEMPLATES);
    
    const result = template
      .replace('{A}', a.title.split(/[,(]/)[0].trim())
      .replace('{B}', b.title.split(/[,(]/)[0].trim())
      .replace('{nounA}', pick(nounsA) || 'stone')
      .replace('{nounB}', pick(nounsB) || 'echo')
      .replace('{verbA}', pick(this.VERBS))
      .replace('{verbB}', pick(this.VERBS))
      .replace('{abstract}', pick(this.ABSTRACTS));

    return result.charAt(0).toUpperCase() + result.slice(1);
  }

  async generateWhisperStreaming(articles: WikiArticle[], coords: GeoPoint, onToken: (t: string, acc: string) => void, heading?: number): Promise<string> {
    const res = await this.generateWhisper(articles, coords, heading);
    let acc = "";
    for (const char of res) {
      acc += char;
      onToken(char, acc);
      await new Promise(r => setTimeout(r, 40 + Math.random() * 30));
    }
    return res;
  }
}

export const spectralEngine = new SpectralEngine();
