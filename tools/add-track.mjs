// Add an MP3 to the player: copies it into public/music, estimates its BPM + first-beat offset with ffmpeg, and lists it
// in public/tracks.json so Kujo nods on the true beat grid.
//   node tools/add-track.mjs path/to/song.mp3 "SONG TITLE" [variant] [theme] [artist]
// variant: classic | pinkmask | maroon | bucket | llama     theme: day | dusk | night
// Needs ffmpeg on your PATH. BPM detection is an estimate: check it, and edit public/tracks.json if a song feels off.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const [src, title, variant, theme, artist] = process.argv.slice(2);
if (!src || !title) { console.error('usage: node tools/add-track.mjs song.mp3 "TITLE" [variant] [theme] [artist]'); process.exit(1); }

const SR = 11025, HOP = 128;
const dec = spawnSync('ffmpeg', ['-v', 'error', '-i', src, '-t', '120', '-ac', '1', '-ar', String(SR), '-f', 's16le', '-'], { maxBuffer: 1 << 28 });
if (dec.status !== 0) { console.error('ffmpeg could not read that file:', String(dec.stderr).slice(0, 200)); process.exit(1); }
const pcm = new Int16Array(dec.stdout.buffer, dec.stdout.byteOffset, Math.floor(dec.stdout.length / 2));
const frames = Math.floor(pcm.length / HOP);
const env = new Float32Array(frames);
for (let i = 0; i < frames; i++) { let e = 0; for (let j = 0; j < HOP; j++) { const v = pcm[i * HOP + j] / 32768; e += v * v; } env[i] = Math.sqrt(e / HOP); }
const onset = new Float32Array(frames);
for (let i = 1; i < frames; i++) onset[i] = Math.max(0, env[i] - env[i - 1]);
const fps = SR / HOP;
let best = { bpm: 0, score: -1 };
for (let bpm = 70; bpm <= 180; bpm += 0.5) {
  const lag = (60 / bpm) * fps;
  let s = 0, n = 0;
  for (let i = 0; i + lag * 2 < frames; i++) {
    const a = onset[i];
    if (a === 0) continue;
    const j = Math.round(i + lag); const k = Math.round(i + lag * 2);
    s += a * (onset[j] + 0.5 * onset[k] + 0.5 * onset[Math.max(0, Math.round(i + lag / 2))]);
    n++;
  }
  if (n && s / n > best.score) best = { bpm, score: s / n };
}
const spb = 60 / best.bpm;
let bestPhase = 0, bestSum = -1;
for (let ph = 0; ph < spb; ph += 0.01) {
  let sum = 0;
  for (let t = ph; t < frames / fps - 0.1; t += spb) sum += onset[Math.round(t * fps)] || 0;
  if (sum > bestSum) { bestSum = sum; bestPhase = ph; }
}
const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'track';
const ext = path.extname(src).toLowerCase() || '.mp3';
fs.mkdirSync(path.join(root, 'public', 'music'), { recursive: true });
fs.copyFileSync(src, path.join(root, 'public', 'music', slug + ext));
const jf = path.join(root, 'public', 'tracks.json');
const list = fs.existsSync(jf) ? JSON.parse(fs.readFileSync(jf, 'utf8')) : [];
const entry = { id: slug, title: title.toUpperCase(), artist: artist || 'LLAMASTÉ PRODUCTIONS', src: 'music/' + slug + ext, bpm: Math.round(best.bpm * 10) / 10, offset: Math.round(bestPhase * 100) / 100 };
if (variant) entry.variant = variant;
if (theme) entry.theme = theme;
const at = list.findIndex((t) => t.id === slug);
if (at >= 0) list[at] = entry; else list.push(entry);
fs.writeFileSync(jf, JSON.stringify(list, null, 2) + '\n');
console.log('added', entry);
