// Procedural sakura (cherry blossom) tree: a ragged canopy of blossom clusters over a curving trunk.
// The canopy is a separate canvas so a scene can sway it; `mask` lets the scene hit-test taps.
import { makeCanvas, ditherPick } from '../core/gfx.js';
import { mulberry32, clamp, TAU } from '../core/math.js';

const hash = (x, y) => {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return s - Math.floor(s);
};

export function makeSakura({ w, M, theme, seed = 5 }) {
  const r = mulberry32(seed);
  const ramp = theme.blossom.ramp;

  // ---- canopy -------------------------------------------------------------------------
  const cx = w * 0.5;
  const DY = 14;
  const cy = 112 + DY;
  const rx = Math.max(40, w * 0.5 - 30);
  const ry = 60;
  const blobs = [];
  for (let i = 0; i < 60; i++) {
    const a = r() * TAU;
    const d = Math.sqrt(r());
    blobs.push({ x: cx + Math.cos(a) * d * rx, y: cy + Math.sin(a) * d * ry, r: 14 + r() * 15 });
  }
  const y0 = 24;
  const ch = 214;
  const cw = w;
  const canopy = makeCanvas(cw, ch);
  const cc = canopy.getContext('2d');
  const mask = new Uint8Array(cw * ch);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const wy = y + y0;
      let best = 9;
      let bi = -1;
      for (let i = 0; i < blobs.length; i++) {
        const b = blobs[i];
        const d = Math.hypot(x - b.x, (wy - b.y) * 1.1) / b.r;
        if (d < best) { best = d; bi = i; }
      }
      if (best > 1) continue;
      if (best > 0.84 && hash(x + 3, y + 7) > 0.5) continue; // ragged, lacy edge
      const b = blobs[bi];
      let l = 0.58 - ((wy - b.y) / b.r) * 0.42 - best * 0.18 + (hash(x, y) - 0.5) * 0.22;
      l -= clamp((wy - (cy + 4)) / (ry * 1.3), 0, 1) * 0.42; // purple underside like the poster
      let col = ditherPick(ramp, l, x, y);
      const hs = hash(x * 1.7, y * 2.3);
      if (hs > 0.9) col = ramp[ramp.length - 1];
      else if (hs < 0.06) col = ramp[1];
      cc.fillStyle = col;
      cc.fillRect(x, y, 1, 1);
      mask[y * cw + x] = 1;
    }
  }

  // ---- trunk + branches ---------------------------------------------------------------
  const TH = M + 8;
  const trunk = makeCanvas(w, TH);
  const tc = trunk.getContext('2d');
  const tmask = new Uint8Array(w * TH);
  const stamp = (x, y, rad, tone) => {
    const R = Math.ceil(rad);
    for (let j = -R; j <= R; j++) {
      for (let i = -R; i <= R; i++) {
        const d = Math.hypot(i, j);
        if (d > rad) continue;
        const px = Math.round(x + i);
        const py = Math.round(y + j);
        if (px < 0 || py < 0 || px >= w || py >= TH) continue;
        const lit = 0.55 - (i / rad) * 0.38 - (j / rad) * 0.12 + (hash(px, py) - 0.5) * 0.25 + tone;
        tc.fillStyle = ditherPick(theme.bark, lit, px, py);
        tc.fillRect(px, py, 1, 1);
        tmask[py * w + px] = 1;
      }
    }
  };
  const bx = w * 0.3;
  const by = M + 4;
  const jx = w * 0.43;
  const jy = 176 + DY;
  for (let t = 0; t <= 1.0001; t += 0.004) {
    const x = bx + (jx - bx) * t - Math.sin(t * Math.PI) * 7 + Math.sin(t * 9) * 0.8;
    const y = by + (jy - by) * t;
    stamp(x, y, 7.4 - 3.6 * t + 4 * Math.pow(1 - t, 7), 0);
  }
  [[0.12, 140], [0.3, 110], [0.52, 118], [0.7, 146], [0.86, 160]].forEach(([ex, ey], i) => {
    const X = w * ex;
    for (let t = 0; t <= 1; t += 0.01) {
      const x = jx + (X - jx) * t + Math.sin(t * Math.PI) * (i % 2 ? 6 : -6);
      const y = jy + (ey - jy) * t - Math.sin(t * Math.PI) * 8;
      stamp(x, y, 3.3 - 2.2 * t, 0.04);
    }
  });

  return { canopy, canopyY: y0, mask, maskW: cw, maskH: ch, trunk, tmask, trunkW: w, trunkH: TH, center: { x: cx, y: cy }, base: { x: bx, y: by }, junction: { x: jx, y: jy } };
}
