class AudioEngine {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private radioStaticGain: GainNode | null = null;

  async init() {
    if (this.context) return;
    this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = 1.0;
    this.masterGain.connect(this.context.destination);

    this.setupOldRadioStatic();
  }

  private setupOldRadioStatic() {
    if (!this.context || !this.masterGain) return;

    // Create White Noise
    const bufferSize = 2 * this.context.sampleRate;
    const noiseBuffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.context.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Old Radio Filter (Bandpass + Highshelf)
    // Filters out most lows and highs to sound like a tiny, old speaker
    const filter = this.context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1200, this.context.currentTime);
    filter.Q.setValueAtTime(1.5, this.context.currentTime);

    this.radioStaticGain = this.context.createGain();
    this.radioStaticGain.gain.setValueAtTime(0.04, this.context.currentTime);

    whiteNoise.connect(filter);
    filter.connect(this.radioStaticGain);
    this.radioStaticGain.connect(this.masterGain);
    
    whiteNoise.start();

    // Begin the intermittent signal glitches
    this.startSignalDrift();
  }

  private startSignalDrift() {
    const drift = () => {
      if (!this.radioStaticGain || !this.context) return;
      
      const now = this.context.currentTime;
      // Randomly spike gain for "crackles" or drop it for "fades"
      const chance = Math.random();
      
      if (chance > 0.9) { // Pop/Crackle
        this.radioStaticGain.gain.setTargetAtTime(0.08, now, 0.01);
        this.radioStaticGain.gain.setTargetAtTime(0.04, now + 0.05, 0.01);
      } else if (chance < 0.1) { // Signal Fade
        this.radioStaticGain.gain.setTargetAtTime(0.01, now, 0.1);
        this.radioStaticGain.gain.setTargetAtTime(0.04, now + 0.5, 0.2);
      }

      setTimeout(drift, 500 + Math.random() * 3000);
    };
    drift();
  }

  async playSonarPing() {
    if (!this.context) await this.init();
    if (this.context!.state === 'suspended') await this.context!.resume();

    const osc = this.context!.createOscillator();
    const gain = this.context!.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, this.context!.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, this.context!.currentTime + 2);

    gain.gain.setValueAtTime(0.2, this.context!.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.context!.currentTime + 2);

    osc.connect(gain);
    gain.connect(this.masterGain!);
    
    osc.start();
    osc.stop(this.context!.currentTime + 2);
  }

  async speak(text: string) {
    if (!window.speechSynthesis) return;
    if (this.context && this.context.state === 'suspended') await this.context.resume();

    // Kill existing speech to prevent overlap
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    
    // Choose a slow, deep voice
    utterance.voice = voices.find(v => v.lang.startsWith('en')) || voices[0];
    utterance.pitch = 0.35; // Eldritch low
    utterance.rate = 0.7;   // Slow
    utterance.volume = 0.8;

    window.speechSynthesis.speak(utterance);
  }
}

export const audioEngine = new AudioEngine();
