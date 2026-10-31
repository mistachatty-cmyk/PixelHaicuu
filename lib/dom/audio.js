// Audio for pixel pages: a WebAudio Synth (sfx + music buses, analyser on music), a procedural DemoLoop that emits
// exact beat events, and a MusicPlayer that plays real tracks and drives a BeatEngine from them.
// Browsers only start audio after a user gesture - call synth.ensure() from a click/tap handler.

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

export class Synth {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.9;
      this.master.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = 0.55;
      this.sfxBus.connect(this.master);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0.75;
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.55;
      this.musicBus.connect(this.analyser);
      this.musicBus.connect(this.master);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.03);
  }

  tone(freq, { t = 0, dur = 0.15, type = 'square', vol = 0.12, slide = 0, bus = null, attack = 0.005 } = {}) {
    if (!this.ensure() || this.muted && !bus) return;
    const c = this.ctx;
    const t0 = c.currentTime + t;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(bus || this.sfxBus);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  noise({ t = 0, dur = 0.08, vol = 0.1, hp = 5000, bus = null } = {}) {
    if (!this.ensure()) return;
    const c = this.ctx;
    const t0 = c.currentTime + t;
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = hp;
    const g = c.createGain();
    g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(bus || this.sfxBus);
    src.start(t0);
  }

  // --- sound effects ---------------------------------------------------------------
  pop() { this.tone(520, { dur: 0.09, type: 'square', vol: 0.1, slide: 380 }); }
  poke() { this.tone(660, { dur: 0.08, type: 'triangle', vol: 0.14, slide: 220 }); this.tone(990, { t: 0.07, dur: 0.12, type: 'triangle', vol: 0.1 }); }
  swap() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, { t: i * 0.055, dur: 0.12, type: 'square', vol: 0.08 })); }
  sparkle() { [1319, 1568, 2093].forEach((f, i) => this.tone(f, { t: i * 0.04, dur: 0.1, type: 'sine', vol: 0.07 })); }
  boop() { this.tone(330, { dur: 0.1, type: 'triangle', vol: 0.12, slide: -60 }); }
  /** the LLAMASTE greeting: a warm rising chord, then the "suck" glide */
  greet() { [392, 494, 587, 784].forEach((f, i) => this.tone(f, { t: i * 0.09, dur: 0.5, type: 'triangle', vol: 0.09 })); }
  whoosh() { this.tone(900, { dur: 0.5, type: 'sine', vol: 0.08, slide: -780 }); this.noise({ dur: 0.45, vol: 0.05, hp: 2500 }); }
  bloom() { [523, 659, 784, 988, 1175, 1568].forEach((f, i) => this.tone(f, { t: i * 0.05, dur: 0.6, type: 'triangle', vol: 0.07 })); }
}

/**
 * DemoLoop - a procedural lo-fi loop (no audio files needed). Schedules notes ahead of time on the audio clock and
 * queues exact beat events, so Kujo's nods land on the actual kicks. Call update() every frame.
 */
export class DemoLoop {
  constructor(synth, beat, { bpm = 82 } = {}) {
    this.synth = synth;
    this.beat = beat;
    this.bpm = bpm;
    this.playing = false;
    this.step = 0;
    this.next = 0;
    this.queue = [];
    this.timer = null;
    this.chords = [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 65]]; // Am7 Fmaj7 Cmaj7 G6-ish
  }

  start() {
    if (this.playing || !this.synth.ensure()) return;
    this.playing = true;
    this.step = 0;
    this.next = this.synth.ctx.currentTime + 0.08;
    this.beat.clear();
    this.timer = setInterval(() => this.schedule(), 25);
    this.schedule();
  }

  stop() {
    this.playing = false;
    clearInterval(this.timer);
    this.queue.length = 0;
  }

  schedule() {
    const s = this.synth;
    const c = s.ctx;
    const spb = 60 / this.bpm / 2; // eighth-note grid
    while (this.next < c.currentTime + 0.18) {
      const t = this.next - c.currentTime;
      const st = this.step % 16; // two beats per 4 steps -> 8 beats = 1 chord pair
      const bar = Math.floor(this.step / 16) % 4;
      const chord = this.chords[bar];
      const bus = s.musicBus;
      if (st % 2 === 0) { // quarter-note kick = the beat
        s.tone(110, { t, dur: 0.16, type: 'sine', vol: 0.5, slide: -70, bus });
        this.queue.push({ at: this.next, accent: st === 0 });
      }
      if (st % 4 === 2) s.noise({ t, dur: 0.07, vol: 0.18, hp: 1800, bus }); // snare-ish
      s.noise({ t, dur: 0.03, vol: st % 2 ? 0.07 : 0.04, hp: 7000, bus }); // hats
      if (st === 0) chord.forEach((m, i) => s.tone(mtof(m + 12), { t: t + i * 0.015, dur: spb * 15, type: 'triangle', vol: 0.06, bus, attack: 0.04 }));
      if (st === 0 || st === 6 || st === 10) s.tone(mtof(chord[0] - 12), { t, dur: spb * 3.2, type: 'sine', vol: 0.3, bus });
      if ([3, 7, 11, 14].includes(st)) s.tone(mtof(chord[(st >> 1) % 4] + 24), { t, dur: spb * 1.6, type: 'square', vol: 0.025, bus });
      this.next += spb;
      this.step++;
    }
  }

  /** flush due beat events - call every frame */
  update() {
    if (!this.playing) return;
    const now = this.synth.ctx.currentTime;
    while (this.queue.length && this.queue[0].at <= now) {
      const q = this.queue.shift();
      this.beat.count = q.accent ? 0 : this.beat.count; // keep accent on the downbeat
      this.beat.emit(q.accent ? 1 : 0.75);
    }
  }
}

/**
 * MusicPlayer - plays tracks from a list ({ id, title, artist, src, bpm?, offset?, variant?, theme? }).
 * With bpm+offset the beats come from a grid locked to the audio clock (tight); otherwise the BeatEngine listens to
 * the analyser. With an empty list it falls back to the DemoLoop. Fires onTrack(track) when the song changes.
 */
export class MusicPlayer {
  constructor(synth, beat, { tracks = [], onTrack = null, demo = true } = {}) {
    this.synth = synth;
    this.beat = beat;
    this.tracks = tracks;
    this.onTrack = onTrack;
    this.index = -1;
    this.playing = false;
    this.audio = null;
    this.demo = demo ? new DemoLoop(synth, beat) : null;
    this.grid = null;
    this.gridN = 0;
  }

  get current() { return this.tracks[this.index] || null; }
  get hasTracks() { return this.tracks.length > 0; }

  async play(i = Math.max(0, this.index)) {
    if (!this.synth.ensure()) return;
    this.stopAll();
    if (!this.hasTracks) {
      if (this.demo) { this.demo.start(); this.playing = true; this.onTrack && this.onTrack({ id: 'demo', title: 'DEMO LOOP', artist: 'LOK' }); }
      return;
    }
    this.index = ((i % this.tracks.length) + this.tracks.length) % this.tracks.length;
    const tr = this.tracks[this.index];
    const a = new Audio();
    a.crossOrigin = 'anonymous';
    a.src = tr.src;
    a.preload = 'auto';
    a.addEventListener('ended', () => this.next());
    const node = this.synth.ctx.createMediaElementSource(a);
    node.connect(this.synth.musicBus);
    this.audio = a;
    this.grid = tr.bpm ? { spb: 60 / tr.bpm, offset: tr.offset || 0 } : null;
    this.gridN = 0;
    if (this.grid) this.beat.clear();
    else this.beat.attachAnalyser(this.synth.analyser);
    this.beat.reset();
    try { await a.play(); this.playing = true; } catch (e) { this.playing = false; }
    this.onTrack && this.onTrack(tr);
  }

  stopAll() {
    if (this.audio) { this.audio.pause(); this.audio = null; }
    if (this.demo) this.demo.stop();
    this.playing = false;
  }

  pause() {
    if (this.audio) this.audio.pause();
    if (this.demo) this.demo.stop();
    this.playing = false;
    this.beat.clear();
  }

  toggle() { return this.playing ? (this.pause(), false) : (this.play(), true); }
  next() { return this.play(this.index + 1); }

  update() {
    if (this.demo && this.demo.playing) this.demo.update();
    if (this.audio && this.grid && this.playing) {
      const t = this.audio.currentTime - this.grid.offset;
      if (t >= 0) {
        const n = Math.floor(t / this.grid.spb);
        if (n > this.gridN) { this.gridN = n; this.beat.count = n - 1; this.beat.emit(n % 4 === 0 ? 1 : 0.75); }
      }
    }
  }
}
