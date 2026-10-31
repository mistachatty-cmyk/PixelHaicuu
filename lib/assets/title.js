// Pixel versions of the three lettering styles on "The HaiCuu Experience" poster:
//   THE        - liquid chrome
//   HAICUU     - glossy pink balloon letters
//   EXPERIENCE - ransom-note paper tiles
import { makeCanvas, ditherPick } from '../core/gfx.js';
import { GLYPHS5 } from './pixelfont.js';

function glyphMask(rows, scale, pad) {
  const W = rows[0].length * scale + pad * 2;
  const H = rows.length * scale + pad * 2;
  const m = new Uint8Array(W * H);
  rows.forEach((row, gy) => {
    for (let gx = 0; gx < row.length; gx++) {
      if (row[gx] !== '#') continue;
      for (let j = 0; j < scale; j++) for (let i = 0; i < scale; i++) m[(pad + gy * scale + j) * W + pad + gx * scale + i] = 1;
    }
  });
  return { m, W, H };
}

function dilate(m, W, H, r) {
  const out = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!m[y * W + x]) continue;
      for (let j = -r; j <= r; j++) {
        for (let i = -r; i <= r; i++) {
          if (i * i + j * j > r * r + 0.5) continue;
          const xx = x + i;
          const yy = y + j;
          if (xx >= 0 && yy >= 0 && xx < W && yy < H) out[yy * W + xx] = 1;
        }
      }
    }
  }
  return out;
}

function renderBlob(m, W, H, paint, edge) {
  const cv = makeCanvas(W, H);
  const c = cv.getContext('2d');
  const at = (x, y) => x >= 0 && y >= 0 && x < W && y < H && m[y * W + x] === 1;
  let y0 = H;
  let y1 = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (m[y * W + x]) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!at(x, y)) {
        if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) {
          c.fillStyle = edge;
          c.fillRect(x, y, 1, 1);
        }
        continue;
      }
      c.fillStyle = paint(x, y, (y - y0) / Math.max(1, y1 - y0), { at, topEdge: !at(x, y - 1), leftEdge: !at(x - 1, y), botEdge: !at(x, y + 1) });
      c.fillRect(x, y, 1, 1);
    }
  }
  return cv;
}

const PINK = ['#e0559a', '#f270ae', '#ff8fc4', '#ffb4d8', '#ffd6ea'];
const CHROME = ['#161a2c', '#3b4666', '#8d9cc4', '#e9f0ff', '#ffffff', '#c1b0ec', '#7b6bb0', '#2b2a4a'];

export function bubbleLetter(ch, { scale = 3, round = 1 } = {}) {
  const pad = round + 2;
  const g = glyphMask(GLYPHS5[ch], scale, pad);
  const m = dilate(g.m, g.W, g.H, round);
  return renderBlob(m, g.W, g.H, (x, y, ly, f) => {
    if (f.topEdge && ly < 0.5) return ((x * 7 + y * 3) % 5 === 0) ? '#ffffff' : PINK[4];
    if (f.leftEdge && ly < 0.7) return PINK[4];
    return ditherPick(PINK, 1 - ly * 0.95, x, y);
  }, '#bf3f80');
}

export function chromeLetter(ch, { scale = 2, round = 1 } = {}) {
  const pad = round + 2;
  const g = glyphMask(GLYPHS5[ch], scale, pad);
  const m = dilate(g.m, g.W, g.H, round);
  return renderBlob(m, g.W, g.H, (x, y, ly) => {
    const band = ly * 7.5 + Math.sin(x * 0.55) * 1.3;
    return CHROME[((Math.floor(band) % CHROME.length) + CHROME.length) % CHROME.length];
  }, '#0c0f1c');
}

const RANSOM = [
  ['#ffd23c', '#3a2a8a'], ['#8e5ae0', '#fff6c8'], ['#ffb3cf', '#7a2a5a'], ['#f4f0ff', '#2a6a9a'], ['#e8473f', '#ffffff'],
  ['#58c457', '#1f3a2a'], ['#fff0c0', '#9a3a3a'], ['#7ec8ff', '#2a2a5a'], ['#ff9a3c', '#2a1a3a'], ['#c8f0a0', '#6a2a8a'],
];
export function ransomLetter(ch, index) {
  const [bg, fg] = RANSOM[index % RANSOM.length];
  const cv = makeCanvas(9, 11);
  const c = cv.getContext('2d');
  c.fillStyle = '#4a3550';
  c.fillRect(0, 0, 9, 11);
  c.fillStyle = bg;
  c.fillRect(1, 1, 7, 9);
  c.fillStyle = fg;
  GLYPHS5[ch].forEach((row, j) => {
    for (let i = 0; i < 5; i++) if (row[i] === '#') c.fillRect(2 + i, 2 + j, 1, 1);
  });
  return cv;
}

/**
 * Lay out the whole title for a stage `w` pixels wide. Returns letters with world-space home positions.
 * Each letter: { ch, word, spr, x, y }.
 */
export function makeTitle(w, { top = 14 } = {}) {
  const letters = [];
  const place = (word, make, advance, y, yJitter = () => 0) => {
    const chars = [...word];
    const sprs = chars.map((ch, i) => make(ch, i));
    const total = advance * (chars.length - 1) + sprs[sprs.length - 1].width;
    const x0 = Math.round((w - total) / 2);
    chars.forEach((ch, i) => {
      letters.push({ ch, word: word.name || word, spr: sprs[i], x: x0 + i * advance, y: y + yJitter(i), index: letters.length });
    });
    return Math.max(...sprs.map((s) => s.height));
  };
  const hThe = place('THE', (ch) => chromeLetter(ch), 12, top, (i) => [1, -1, 1][i]);
  const hBub = place('HAICUU', (ch) => bubbleLetter(ch), 17, top + hThe - 1);
  const yEx = top + hThe + hBub + 1;
  place('EXPERIENCE', (ch, i) => ransomLetter(ch, i), 9, yEx, (i) => (i % 3 === 0 ? 1 : i % 3 === 1 ? -1 : 0));
  return { letters, height: yEx + 12 - top };
}
