// World props: the smiling sun, dithered clouds, the smiley flower, the peeking alpaca and a wooden sign.
import { makeCanvas, ditherPick, rotateSprite } from '../core/gfx.js';
import { Painter, hash2 } from '../core/painter.js';
import { mulberry32, TAU } from '../core/math.js';
import { drawText3, width3 } from './pixelfont.js';

/** Smiling sun. Returns the disc and two ray frames (alternate them for a shimmer). */
export function makeSunFace(theme, r = 15) {
  const S = r * 2 + 2;
  const p = new Painter(S, S);
  const c = S / 2;
  p.ellipse(c, c, r, r, theme.sun.disc, { amb: 0.5, gain: 0.55 });
  p.innerEdge(() => theme.sun.edge);
  // face: closed happy eyes, rosy cheeks, open smile
  const f = theme.sun.face;
  const ey = Math.round(c - 1);
  [[-5, 1], [5, 1]].forEach(([dx]) => {
    p.set(c + dx - 2, ey + 1, f); p.set(c + dx - 1, ey, f); p.set(c + dx, ey, f); p.set(c + dx + 1, ey + 1, f);
  });
  [[-9, 4], [8, 4]].forEach(([dx, dy]) => p.rect(Math.round(c + dx), Math.round(c + dy), 3, 2, theme.sun.cheek));
  for (let i = -4; i <= 4; i++) {
    const yy = Math.round(c + 5 + (Math.abs(i) < 4 ? Math.round(Math.cos((i / 4) * 1.2) * 2.4) : 0) - 2 + Math.abs(i) * 0.15);
    p.set(c + i, yy + 1, f);
  }
  p.rect(Math.round(c - 3), Math.round(c + 6), 6, 1, f);
  const disc = p.toCanvas();

  const R = r + 10;
  const rays = [0, 1].map((frame) => {
    const q = new Painter(R * 2 + 2, R * 2 + 2);
    const cc = R + 1;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU + frame * (TAU / 24);
      const len = i % 2 ? 7 : 9;
      const x0 = cc + Math.cos(a) * (r + 3);
      const y0 = cc + Math.sin(a) * (r + 3);
      q.capsule(x0, y0, cc + Math.cos(a) * (r + 3 + len), cc + Math.sin(a) * (r + 3 + len), 1.7, 0.8, [theme.sun.edge, theme.sun.ray, theme.sun.disc[3]], { amb: 0.6, gain: 0.5 });
    }
    return q.toCanvas();
  });
  return { disc, rays, size: S, rayR: R };
}

/** Fluffy cloud built from overlapping circles, shaded with the theme's three cloud tones (dithered). */
export function makeCloudPuff(theme, w, h, seed = 1) {
  const r = mulberry32(seed);
  const p = new Painter(w, h);
  const n = Math.max(4, Math.round(w / 9));
  const puffs = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const rad = (h * 0.34) + Math.sin(t * Math.PI) * h * 0.26 + r() * 3;
    puffs.push({ x: 3 + rad * 0.4 + t * (w - rad - 6), y: h - rad - 1 - r() * 2, r: rad });
  }
  const ramp = [theme.cloud.lo, theme.cloud.mid, theme.cloud.hi];
  // flat-ish bottom: clip to a baseline
  const base = h - 2;
  for (const q of puffs) {
    p.shaded(q.x - q.r, q.y - q.r, q.x + q.r, q.y + q.r, (x, y) => {
      if (y > base) return null;
      const nx = (x - q.x) / q.r;
      const ny = (y - q.y) / q.r;
      const d2 = nx * nx + ny * ny;
      if (d2 > 1) return null;
      return Painter.lit(nx, ny, Math.sqrt(1 - d2), { amb: 0.4, gain: 0.8, light: { x: -0.35, y: -0.85, z: 0.4 } });
    }, ramp, { under: true });
  }
  // underside gets the cool tone so the cloud has weight
  for (let y = base - 3; y <= base; y++) {
    for (let x = 0; x < w; x++) if (p.has(x, y) && (x + y) % 2 === 0 && hash2(x, y) > 0.35) p.set(x, y, theme.cloud.lo);
  }
  return p.toCanvas();
}

/** The smiley pink flower from the poster's bottom-left corner. */
export function makeSmileyHead(theme, { r = 9, petal = ['#c93b86', '#ec5aa4', '#ff86c1', '#ffb4d8'], center = ['#ffc425', '#ffe36b', '#fff2a8'] } = {}) {
  const S = r * 4 + 4;
  const p = new Painter(S, S);
  const c = S / 2;
  const pr = r * 0.62;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    p.ellipse(c + Math.cos(a) * r * 1.15, c + Math.sin(a) * r * 1.15, pr, pr, petal, { amb: 0.4, gain: 0.7 });
  }
  p.ellipse(c, c, r * 0.95, r * 0.95, center, { amb: 0.55, gain: 0.55 });
  p.innerEdge((col) => col);
  const fc = '#8a3a1a';
  p.set(c - 3, c - 2, fc); p.set(c - 3, c - 1, fc); p.set(c + 2, c - 2, fc); p.set(c + 2, c - 1, fc);
  p.rect(Math.round(c - 5), Math.round(c + 1), 2, 1, '#ff8a8a');
  p.rect(Math.round(c + 4), Math.round(c + 1), 2, 1, '#ff8a8a');
  p.set(c - 2, c + 2, fc); p.set(c - 1, c + 3, fc); p.set(c, c + 3, fc); p.set(c + 1, c + 2, fc);
  return p.toCanvas();
}

/** White alpaca head + neck, peeking in from the bottom-right. Origin is the bottom of the neck. */
export function makeAlpaca() {
  const wool = ['#c9b3c6', '#e3d3df', '#f4eaf1', '#ffffff'];
  const skin = ['#a98a7e', '#c9aa9c', '#e2c8bb'];
  const p = new Painter(34, 46);
  // neck
  p.capsule(18, 46, 17, 24, 8, 6, wool, { amb: 0.5, gain: 0.55 });
  // ears
  p.ellipse(10, 6, 2.6, 6, skin, { amb: 0.5 });
  p.ellipse(25, 6, 2.6, 6, skin, { amb: 0.5 });
  // fluffy topknot
  for (let i = 0; i < 6; i++) p.ellipse(11 + i * 2.5, 12 - Math.sin(i * 1.1) * 2.5, 4.2, 4.2, wool, { amb: 0.5, gain: 0.55 });
  // head + muzzle
  p.ellipse(18, 21, 10, 10, wool, { amb: 0.5, gain: 0.55 });
  p.ellipse(19, 26, 6, 5, skin, { amb: 0.55, gain: 0.5 });
  // face
  p.rect(13, 19, 2, 2, '#2c1f2c'); p.rect(22, 19, 2, 2, '#2c1f2c');
  p.set(13, 19, '#ffffff'); p.set(22, 19, '#ffffff');
  p.set(17, 25, '#6a4a4a'); p.set(20, 25, '#6a4a4a');
  p.set(17, 28, '#6a4a4a'); p.set(18, 29, '#6a4a4a'); p.set(19, 29, '#6a4a4a'); p.set(20, 28, '#6a4a4a');
  p.rect(11, 24, 2, 1, '#ffb0c4'); p.rect(25, 24, 2, 1, '#ffb0c4');
  p.outline('#6c5568');
  return p.toCanvas();
}

/** Wooden sign with 3x5 pixel text lines. */
export function makeSign(lines = ['COMING', 'SOON']) {
  const tw = Math.max(...lines.map((l) => width3(l)));
  const w = tw + 8;
  const h = lines.length * 7 + 5;
  const cv = makeCanvas(w, h + 10);
  const c = cv.getContext('2d');
  c.fillStyle = '#6b4630';
  c.fillRect(w / 2 - 1, h, 3, 10);
  c.fillStyle = '#4a2e26';
  c.fillRect(w / 2 + 1, h, 1, 10);
  c.fillStyle = '#4a2e26';
  c.fillRect(0, 0, w, h);
  c.fillStyle = '#d9a86c';
  c.fillRect(1, 1, w - 2, h - 2);
  c.fillStyle = '#e8c08a';
  c.fillRect(1, 1, w - 2, 1);
  c.fillStyle = '#b98a54';
  c.fillRect(1, h - 2, w - 2, 1);
  lines.forEach((l, i) => drawText3(c, l, Math.round((w - width3(l)) / 2), 3 + i * 7, '#4a2e26'));
  return cv;
}

/** Soft dithered disc used for auras and glows. */
export function makeGlow(r, ramp) {
  const p = new Painter(r * 2 + 2, r * 2 + 2);
  p.shaded(0, 0, r * 2 + 2, r * 2 + 2, (x, y) => {
    const d = Math.hypot(x - r - 1, y - r - 1) / r;
    return d > 1 ? null : 1 - d;
  }, ramp, { color: (x, y, l) => (l < 0.12 ? null : ditherPick(ramp, l * 1.4, x, y)) });
  return p.toCanvas();
}

/**
 * Pixel Bible: maroon leather cover, gold cross + border, cream page edges, pink ribbon. 20x28.
 * Returns { base, frames, n } where frames are `n` pre-rotated copies (nearest-neighbour, so pixels stay crisp)
 * ready to blit without any per-frame rotation cost.
 */
export function makeBible(n = 32) {
  const W = 20;
  const H = 28;
  const cv = makeCanvas(W, H);
  const c = cv.getContext('2d');
  const R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  R(1, 0, 17, 25, '#2a1420'); R(0, 1, 19, 23, '#2a1420'); // outline
  R(1, 1, 17, 22, '#8f2d52'); // cover
  R(1, 1, 4, 22, '#6b1f3a'); // spine
  R(4, 1, 1, 22, '#4d1428'); // spine groove
  R(5, 1, 13, 1, '#b84a73'); R(5, 1, 1, 22, '#a33a62'); // lit top + left edge
  R(1, 22, 17, 1, '#5a1830'); R(17, 2, 1, 21, '#7a2646'); // shade bottom + right
  // page block peeking out of the bottom and right edges
  R(3, 23, 15, 2, '#fff2d6'); R(3, 24, 15, 1, '#e6c997'); R(18, 3, 1, 21, '#fff2d6'); R(18, 5, 1, 1, '#e6c997'); R(18, 9, 1, 1, '#e6c997'); R(18, 14, 1, 1, '#e6c997');
  R(2, 25, 17, 1, '#2a1420'); R(19, 2, 1, 23, '#2a1420'); R(3, 22, 1, 1, '#4d1428');
  // gold border
  R(6, 3, 10, 1, '#d99a1e'); R(6, 20, 10, 1, '#d99a1e'); R(6, 3, 1, 18, '#d99a1e'); R(15, 3, 1, 18, '#d99a1e');
  R(7, 4, 8, 1, '#ffd24a'); R(7, 4, 1, 16, '#ffd24a');
  // cross
  R(10, 6, 2, 11, '#ffd24a'); R(7, 9, 8, 2, '#ffd24a');
  R(11, 6, 1, 11, '#d99a1e'); R(7, 10, 8, 1, '#d99a1e'); R(10, 6, 1, 2, '#fff2a8'); R(7, 9, 2, 1, '#fff2a8');
  // ribbon bookmark hanging from the bottom
  R(13, 24, 2, 4, '#ff3d7f'); R(13, 25, 1, 3, '#ff7ab0'); R(13, 27, 1, 1, '#2a1420'); R(14, 26, 1, 1, '#2a1420');
  const frames = [];
  for (let i = 0; i < n; i++) frames.push(rotateSprite(cv, (i / n) * TAU));
  return { base: cv, frames, n };
}
