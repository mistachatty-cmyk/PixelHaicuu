// PIXEL Q MUSIC - Llamasté Productions' procedural song project.
// Songs are plain data (chords + 16-step patterns). The PixelQ engine plays them on the WebAudio clock and emits exact
// beat events (one per quarter note, accent on the downbeat), so Kujo nods on the real kicks. No audio files needed.
// Add a song by adding an object to SONGS - nothing else changes.
//
// Pattern strings are 16 eighth-note steps: '.' = rest, 'x' = hit, 'X' = accent. One chord lasts 16 steps (2 bars).
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

export const PIXELQ = {
  id: 'pixelq',
  name: 'PIXEL Q MUSIC',
  artist: 'LLAMASTÉ PRODUCTIONS',
  tagline: 'Little songs made of pure pixels.',
};

export const SONGS = [
  {
    id: 'llamaste-lofi', title: 'LLAMASTÉ LO-FI', bpm: 82, variant: 'classic', theme: 'day', swing: 0,
    chords: [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 65]],
    drums: { kick: 'x.x.x.x.x.x.x.x.', snare: '..x...x...x...x.', hat: 'xXxXxXxXxXxXxXxX', kickVol: 0.5, hatVol: 0.05 },
    bass: { steps: 'x.....x...x.....', oct: -12, wave: 'sine', vol: 0.3, len: 3.2 },
    pad: { wave: 'triangle', vol: 0.06, oct: 12 },
    arp: { steps: '...x...x...x..x.', wave: 'square', vol: 0.025, oct: 24 },
  },
  {
    id: 'sakura-hour', title: 'SAKURA HOUR', bpm: 72, variant: 'pinkmask', theme: 'day', swing: 0.08,
    chords: [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 64]],
    drums: { kick: 'x.......x.....x.', snare: '........x.......', hat: 'x...x...x...x...', kickVol: 0.4, hatVol: 0.035, snareVol: 0.09 },
    bass: { steps: 'x.......x.......', oct: -12, wave: 'sine', vol: 0.28, len: 6 },
    pad: { wave: 'sine', vol: 0.075, oct: 12 },
    lead: {
      wave: 'bell', vol: 0.06,
      phrases: [
        [[0, 76, 3], [4, 79, 2], [6, 81, 3], [10, 79, 2], [12, 76, 4]],
        [[0, 72, 2], [2, 76, 3], [6, 79, 3], [10, 76, 2], [12, 74, 4]],
        [[0, 76, 3], [4, 72, 2], [6, 74, 3], [10, 76, 3], [14, 74, 2]],
        [[0, 74, 3], [4, 79, 3], [8, 76, 2], [10, 74, 2], [12, 72, 4]],
      ],
    },
  },
  {
    id: 'dreadlock-drift', title: 'DREADLOCK DRIFT', bpm: 90, variant: 'maroon', theme: 'dusk', swing: 0.2,
    chords: [[50, 53, 57, 60], [55, 59, 62, 65], [52, 55, 59, 62], [57, 62, 64, 67]],
    drums: { kick: 'x.....x...x..x..', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.X.', kickVol: 0.5, hatVol: 0.05 },
    bass: { steps: 'x..x..x.x..x.x..', oct: -12, wave: 'triangle', vol: 0.3, len: 1.4 },
    pad: { wave: 'triangle', vol: 0.05, oct: 12 },
    lead: {
      wave: 'triangle', vol: 0.05,
      phrases: [
        [[2, 81, 1], [3, 79, 1], [6, 77, 2], [10, 74, 2], [13, 77, 1], [14, 79, 2]],
        [[2, 79, 1], [3, 77, 1], [6, 74, 2], [10, 79, 2], [13, 81, 1], [14, 79, 2]],
        [[2, 76, 1], [3, 79, 1], [6, 83, 2], [10, 79, 2], [13, 76, 1], [14, 74, 2]],
        [[0, 81, 2], [4, 84, 2], [8, 81, 2], [10, 79, 1], [11, 77, 1], [12, 76, 4]],
      ],
    },
  },
  {
    id: 'alpaca-afternoon', title: 'ALPACA AFTERNOON', bpm: 104, variant: 'llama', theme: 'day', swing: 0.05,
    chords: [[53, 57, 60, 65], [58, 62, 65, 69], [55, 58, 62, 65], [48, 52, 55, 58]],
    drums: { kick: 'x.....x.x.....x.', snare: '....x.......x...', hat: 'xxxxxxxxxxxxxxxx', kickVol: 0.45, hatVol: 0.03 },
    bass: { steps: 'x.x.x.x.x.x.x.x.', oct: -12, wave: 'square', vol: 0.09, len: 1.2 },
    pad: { wave: 'triangle', vol: 0.04, oct: 12 },
    arp: { steps: '.x.x.x.x.x.x.x.x', wave: 'square', vol: 0.02, oct: 24 },
    lead: {
      wave: 'square', vol: 0.04,
      phrases: [
        [[0, 77, 2], [2, 81, 2], [4, 84, 2], [6, 81, 2], [8, 79, 2], [10, 77, 2], [12, 81, 4]],
        [[0, 82, 2], [2, 86, 2], [4, 84, 2], [6, 82, 2], [8, 81, 2], [10, 77, 2], [12, 79, 4]],
        [[0, 79, 2], [2, 82, 2], [4, 86, 2], [6, 82, 2], [8, 79, 2], [10, 77, 2], [12, 74, 4]],
        [[0, 76, 2], [2, 79, 2], [4, 82, 2], [6, 79, 2], [8, 76, 2], [10, 79, 2], [12, 77, 4]],
      ],
    },
  },
  {
    id: 'om-at-midnight', title: 'OM AT MIDNIGHT', bpm: 64, variant: 'bucket', theme: 'night', swing: 0,
    chords: [[52, 55, 59, 62], [48, 52, 55, 59], [57, 60, 64, 67], [59, 64, 66, 69]],
    drums: { kick: 'x...............', snare: '', hat: '', kickVol: 0.45 },
    bass: { steps: 'x...............', oct: -24, wave: 'sine', vol: 0.34, len: 15 },
    pad: { wave: 'sine', vol: 0.09, oct: 12 },
    lead: {
      wave: 'bell', vol: 0.05,
      phrases: [
        [[0, 76, 8], [8, 79, 8]],
        [[0, 76, 6], [8, 71, 8]],
        [[0, 72, 8], [8, 76, 8]],
        [[0, 74, 4], [4, 71, 4], [8, 69, 8]],
      ],
    },
  },
];

const has = (pat, st) => !!pat && pat[st] !== undefined && pat[st] !== '.';

export class PixelQ {
  constructor(synth, beat) {
    this.synth = synth;
    this.beat = beat;
    this.song = null;
    this.playing = false;
    this.step = 0;
    this.next = 0;
    this.queue = [];
    this.timer = null;
    this.cycles = 0;
    this.maxCycles = 0;
    this.onEnd = null;
    this.ended = false;
  }

  /** Start a song. `cycles` = how many times the chord loop plays before onEnd fires (0 = forever). */
  start(song, { cycles = 0, onEnd = null } = {}) {
    if (!this.synth.ensure()) return false;
    this.stop();
    this.song = song;
    this.playing = true;
    this.ended = false;
    this.step = 0;
    this.maxCycles = cycles;
    this.onEnd = onEnd;
    this.next = this.synth.ctx.currentTime + 0.08;
    this.beat.clear();
    this.timer = setInterval(() => this.schedule(), 25);
    this.schedule();
    return true;
  }

  stop() {
    this.playing = false;
    clearInterval(this.timer);
    this.queue.length = 0;
  }

  schedule() {
    const song = this.song;
    if (!song || !this.playing) return;
    const s = this.synth;
    const c = s.ctx;
    const spb = 60 / song.bpm / 2;
    const bus = s.musicBus;
    const n = song.chords.length;
    while (this.next < c.currentTime + 0.18) {
      const stepInSong = this.step;
      const st = stepInSong % 16;
      const ci = Math.floor(stepInSong / 16) % n;
      if (this.maxCycles && stepInSong >= this.maxCycles * n * 16) {
        // stop scheduling; let the tail ring, then tell the player once the last notes have faded
        if (!this.ended) {
          this.ended = true;
          clearInterval(this.timer);
          const wait = Math.max(0, (this.next - c.currentTime) * 1000) + 600;
          setTimeout(() => { this.playing = false; this.onEnd && this.onEnd(); }, wait);
        }
        return;
      }
      const chord = song.chords[ci];
      const swing = st % 2 ? (song.swing || 0) * spb : 0;
      const t = this.next - c.currentTime + swing;
      const d = song.drums || {};
      if (has(d.kick, st)) s.tone(110, { t, dur: 0.16, type: 'sine', vol: d.kickVol ?? 0.5, slide: -70, bus });
      if (st % 2 === 0) this.queue.push({ at: this.next, accent: st === 0 });
      if (has(d.snare, st)) s.noise({ t, dur: 0.07, vol: d.snareVol ?? 0.18, hp: 1800, bus });
      if (has(d.hat, st)) s.noise({ t, dur: 0.03, vol: (d.hatVol ?? 0.05) * (d.hat[st] === 'X' ? 1.5 : 1), hp: 7000, bus });
      const p = song.pad;
      if (p && st === 0) chord.forEach((m, i) => s.tone(mtof(m + p.oct), { t: t + i * 0.015, dur: spb * 15, type: p.wave, vol: p.vol, bus, attack: 0.05 }));
      const b = song.bass;
      if (b && has(b.steps, st)) s.tone(mtof(chord[0] + b.oct), { t, dur: spb * b.len, type: b.wave, vol: b.vol, bus });
      const a = song.arp;
      if (a && has(a.steps, st)) s.tone(mtof(chord[(st >> 1) % chord.length] + a.oct), { t, dur: spb * 1.6, type: a.wave, vol: a.vol, bus });
      const l = song.lead;
      if (l) {
        const ph = l.phrases[ci % l.phrases.length];
        for (const [ns, midi, len] of ph) {
          if (ns !== st) continue;
          const f = mtof(midi);
          if (l.wave === 'bell') {
            s.tone(f, { t, dur: spb * len * 1.4, type: 'sine', vol: l.vol, bus, attack: 0.01 });
            s.tone(f * 2.76, { t, dur: spb * 1.2, type: 'sine', vol: l.vol * 0.35, bus, attack: 0.005 });
          } else s.tone(f, { t, dur: spb * len * 0.95, type: l.wave, vol: l.vol, bus, attack: 0.008 });
        }
      }
      this.next += spb;
      this.step++;
    }
  }

  update() {
    if (!this.playing && !this.queue.length) return;
    const now = this.synth.ctx.currentTime;
    while (this.queue.length && this.queue[0].at <= now) {
      const q = this.queue.shift();
      if (now - q.at > 0.15) continue; // the tab was hidden: skip beats we missed instead of replaying them in a burst
      if (q.accent) this.beat.count = 0;
      this.beat.emit(q.accent ? 1 : 0.75);
    }
  }
}

/** Playlist entries for MusicPlayer: one per song, tagged so the player knows to use the PixelQ engine. */
export function pixelQTracks() {
  return SONGS.map((song) => ({
    id: song.id, title: song.title, artist: PIXELQ.artist, project: PIXELQ.name, bpm: song.bpm,
    variant: song.variant, theme: song.theme, song,
  }));
}
