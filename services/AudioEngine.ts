
import { decodeBase64, decodeAudioData } from '../utils';

class AudioEngine {
  private context: AudioContext | null = null;
  private noiseNode: AudioNode | null = null;
  private whisperGain: GainNode | null = null;

  async init() {
    if (this.context) return;
    this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Background static/noise
    const bufferSize = 2 * this.context.sampleRate;
    const noiseBuffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.context.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const biquadFilter = this.context.createBiquadFilter();
    biquadFilter.type = "lowpass";
    biquadFilter.frequency.setValueAtTime(350, this.context.currentTime);
    biquadFilter.Q.setValueAtTime(8, this.context.currentTime);

    const noiseGain = this.context.createGain();
    noiseGain.gain.setValueAtTime(0.015, this.context.currentTime);

    whiteNoise.connect(biquadFilter);
    biquadFilter.connect(noiseGain);
    noiseGain.connect(this.context.destination);
    
    whiteNoise.start();
    this.noiseNode = whiteNoise;

    this.whisperGain = this.context.createGain();
    this.whisperGain.gain.setValueAtTime(0.7, this.context.currentTime);
    this.whisperGain.connect(this.context.destination);
  }

  async playSonarPing() {
    if (!this.context) await this.init();
    if (!this.context) return;

    if (this.context.state === 'suspended') await this.context.resume();

    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, this.context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, this.context.currentTime + 2);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(660, this.context.currentTime);
    
    gain.gain.setValueAtTime(0.2, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + 2.5);

    // FM Distortion
    const fmOsc = this.context.createOscillator();
    const fmGain = this.context.createGain();
    fmOsc.frequency.setValueAtTime(15, this.context.currentTime);
    fmGain.gain.setValueAtTime(80, this.context.currentTime);
    fmOsc.connect(fmGain);
    fmGain.connect(osc.frequency);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.context.destination);

    fmOsc.start();
    osc.start();
    fmOsc.stop(this.context.currentTime + 2.5);
    osc.stop(this.context.currentTime + 2.5);
  }

  async speak(text: string) {
    if (!window.speechSynthesis) return;

    // Ensure noise is running
    if (this.context && this.context.state === 'suspended') await this.context.resume();

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    
    // Attempt to find a deep/interesting voice
    const preferred = voices.find(v => v.name.toLowerCase().includes('google') && v.lang.startsWith('en')) || voices[0];
    
    utterance.voice = preferred;
    utterance.pitch = 0.4; // Low eldritch pitch
    utterance.rate = 0.75;  // Slow deliberate speech
    utterance.volume = 0.8;

    window.speechSynthesis.speak(utterance);
  }
}

export const audioEngine = new AudioEngine();
