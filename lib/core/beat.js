import { clamp } from './math.js';

// BeatEngine turns "something rhythmic" into a stream of beat events that characters and scenes react to.
// Three ways to drive it:
//   1. attachAnalyser(analyser)  - onset detection on the low band of a WebAudio AnalyserNode (any song, no metadata)
//   2. setClock(bpm)             - free-running metronome (silent ambient pulse, previews)
//   3. emit(strength)            - you call it yourself (synth loops, MusicPlayer grid sync, tap tempo)
// Subscribers get { count, accent, strength, time }. `accent` is true on the first beat of every bar.
export class BeatEngine {
  constructor({ band = [1, 6], sensitivity = 1.3, floor = 0.22, minGap = 0.2, accentEvery = 4 } = {}) {
    this.listeners = new Set();
    this.band = band;
    this.sensitivity = sensitivity;
    this.floor = floor;
    this.minGap = minGap;
    this.accentEvery = accentEvery;
    this.t = 0;
    this.count = 0;
    this.lastBeat = -9;
    this.interval = 0.5;
    this.bpm = 0;
    this.level = 0; // smoothed 0..1 low-band energy, handy for glow/size pulses
    this.phase = 0; // 0..1 progress between beats
    this.avg = 0;
    this.prev = 0;
    this.analyser = null;
    this.buf = null;
    this.clock = null;
  }

  on(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  attachAnalyser(analyser) {
    this.analyser = analyser;
    this.buf = new Uint8Array(analyser.frequencyBinCount);
    this.clock = null;
  }

  setClock(bpm) {
    this.clock = { bpm, next: this.t + 60 / bpm };
    this.analyser = null;
  }

  clear() {
    this.analyser = null;
    this.clock = null;
  }

  reset() {
    this.count = 0;
    this.lastBeat = -9;
    this.avg = 0;
  }

  emit(strength = 1) {
    const gap = this.t - this.lastBeat;
    if (gap > 0.25 && gap < 1.3) {
      this.interval += (gap - this.interval) * 0.25;
      this.bpm = Math.round(60 / this.interval);
    }
    this.lastBeat = this.t;
    this.count++;
    const info = { count: this.count, accent: (this.count - 1) % this.accentEvery === 0, strength, time: this.t };
    for (const fn of this.listeners) fn(info);
  }

  update(dt) {
    this.t += dt;
    if (this.analyser) {
      this.analyser.getByteFrequencyData(this.buf);
      const [lo, hi] = this.band;
      let s = 0;
      for (let i = lo; i <= hi; i++) s += this.buf[i];
      const low = s / ((hi - lo + 1) * 255);
      this.level += (low - this.level) * Math.min(1, dt * 14);
      this.avg += (low - this.avg) * Math.min(1, dt * 1.2);
      if (low > this.avg * this.sensitivity && low > this.floor && low > this.prev && this.t - this.lastBeat > this.minGap) {
        this.emit(clamp((low - this.avg) * 4, 0.35, 1));
      }
      this.prev = low;
    } else if (this.clock) {
      while (this.t >= this.clock.next) {
        this.emit(0.8);
        this.clock.next += 60 / this.clock.bpm;
      }
      this.level += (Math.max(0, 1 - this.phase * 3) - this.level) * Math.min(1, dt * 14);
    } else {
      this.level += (0 - this.level) * Math.min(1, dt * 6);
    }
    this.phase = clamp((this.t - this.lastBeat) / this.interval, 0, 1);
  }
}
