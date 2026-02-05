// types.ts (Internalized for completeness)
export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface WikiArticle {
  title: string;
  extract?: string;
  lat?: number;
  lng?: number;
}

// ==========================================
// 1. SPECTRAL ENGINE (Fast NLP Generation)
// ==========================================
class SpectralEngine {
  private TEMPLATES = [
    "Where {A} once {verbA}, now {B} {verbB}.",
    "The {nounA} remembers {nounB}.",
    "{nounA} and {nounB} share the same {abstract}.",
    "Beneath {A}, the echo of {B} persists.",
    "They buried {nounA} here. {nounB} grew from the soil.",
    "{nounA} dissolves into {nounB} at dusk.",
    "The {nounA} speaks in the voice of {nounB}.",
    "Once {nounA}, now {nounB}. Always {abstract}.",
  ];

  private ABSTRACTS = ["silence", "dust", "echoes", "loss", "shadow", "waiting", "static", "void"];
  private VERBS = ["stood", "whispered", "burned", "crumbled", "sang", "faded", "dissolved", "slept"];

  async init(onProgress?: (p: number) => void) {
    onProgress?.(100);
    return true;
  }

  private tokenize(text: string) {
    return text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 2);
  }

  private extractNouns(text: string) {
    const stops = new Set(['the', 'and', 'with', 'from', 'that', 'this', 'was', 'were']);
    return this.tokenize(text).filter(w => w.length > 4 && !stops.has(w));
  }

  // BURROUGHS CUT-UP: Randomly interleave fragments
  private cutUp(textA: string, textB: string): string {
    const getFrag = (t: string) => t.split('. ')[0].split(' ').slice(0, 5).join(' ');
    return `${getFrag(textA)} — ${getFrag(textB)} — ${this.ABSTRACTS[Math.floor(Math.random() * this.ABSTRACTS.length)]}`;
  }

  // MARKOV BLEND: Simple bigram mix
  private markov(textA: string, textB: string): string {
    const words = [...this.tokenize(textA), ...this.tokenize(textB)];
    const res = [words[Math.floor(Math.random() * words.length)]];
    for(let i=0; i<7; i++) {
      const filtered = words.filter((w, idx) => words[idx-1] === res[i]);
      res.push(filtered.length ? filtered[Math.floor(Math.random() * filtered.length)] : words[Math.floor(Math.random() * words.length)]);
    }
    return res.join(' ');
  }

  async generateWhisper(articles: WikiArticle[]): Promise<string> {
    if (articles.length < 2) return "The signal is too weak here.";
    const [a, b] = articles.sort(() => 0.5 - Math.random());
    
    const methods = [
      () => this.cutUp(a.extract || a.title, b.extract || b.title),
      () => this.markov(a.extract || a.title, b.extract || b.title),
      () => {
        const nA = this.extractNouns(a.extract || '');
        const nB = this.extractNouns(b.extract || '');
        return this.TEMPLATES[Math.floor(Math.random() * this.TEMPLATES.length)]
          .replace('{A}', a.title.split('(')[0])
          .replace('{B}', b.title.split('(')[0])
          .replace('{nounA}', nA[0] || 'stone').replace('{nounB}', nB[0] || 'ash')
          .replace('{verbA}', this.VERBS[0]).replace('{verbB}', this.VERBS[1])
          .replace('{abstract}', this.ABSTRACTS[0]);
      }
    ];

    const result = methods[Math.floor(Math.random() * methods.length)]();
    return result.charAt(0).toUpperCase() + result.slice(1);
  }

  async generateWhisperStreaming(articles: WikiArticle[], onToken: (t: string, acc: string) => void): Promise<string> {
    const text = await this.generateWhisper(articles);
    let acc = "";
    for (const char of text) {
      acc += char;
      onToken(char, acc);
      await new Promise(r => setTimeout(r, 40 + Math.random() * 30));
    }
    return text;
  }
}

// ==========================================
// 2. AUDIO ENGINE (Old Radio Static & TTS)
// ==========================================
class AudioEngine {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private radioStatic: GainNode | null = null;

  async init() {
    if (this.context) return;
    this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.context.createGain();
    this.masterGain.connect(this.context.destination);

    this.setupOldRadioStatic();
  }

  private setupOldRadioStatic() {
    if (!this.context || !this.masterGain) return;

    // 1. Generate White Noise Buffer
    const bufferSize = 2 * this.context.sampleRate;
    const noiseBuffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

    const noise = this.context.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    // 2. Radio Filtering (Tinny, mid-range)
    const radioFilter = this.context.createBiquadFilter();
    radioFilter.type = "bandpass";
    radioFilter.frequency.value = 1200; // Radio focus
    radioFilter.Q.value = 1.5;

    // 3. Static Gain + Random "Glitch" Modulation
    this.radioStatic = this.context.createGain();
    this.radioStatic.gain.value = 0.04;

    noise.connect(radioFilter);
    radioFilter.connect(this.radioStatic);
    this.radioStatic.connect(this.masterGain);
    noise.start();

    // 4. Signal Drift & Crackle Loop
    this.startSignalDrift();
  }

  private startSignalDrift() {
    const drift = () => {
      if (!this.radioStatic || !this.context) return;
      const now = this.context.currentTime;
      
      // Occasional "Crackle/Pop"
      if (Math.random() > 0.8) {
        this.radioStatic.gain.setValueAtTime(0.08, now);
        this.radioStatic.gain.exponentialRampToValueAtTime(0.02, now + 0.1);
      }
      
      // Random Signal Fade
      const nextDrift = 100 + Math.random() * 2000;
      setTimeout(drift, nextDrift);
    };
    drift();
  }

  async playSonarPing() {
    if (!this.context) await this.init();
    const osc = this.context!.createOscillator();
    const gain = this.context!.createGain();
    osc.frequency.setValueAtTime(880, this.context!.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, this.context!.currentTime + 1.5);
    gain.gain.setValueAtTime(0.1, this.context!.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.context!.currentTime + 1.5);
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start();
    osc.stop(this.context!.currentTime + 1.5);
  }

  async speak(text: string) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find(v => v.lang.startsWith('en')) || null;
    utterance.pitch = 0.3; // Very low
    utterance.rate = 0.7;  // Slow
    utterance.volume = 0.6;
    window.speechSynthesis.speak(utterance);
  }
}

export const spectralEngine = new SpectralEngine();
export const audioEngine = new AudioEngine();
