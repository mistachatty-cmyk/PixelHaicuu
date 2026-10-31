// Painter - a tiny indexed pixel painter. Everything is drawn into a colour array first (so shapes can
// read what is already underneath), then flattened to a canvas with toCanvas().
// Shading is "lit shape" shading: every shape gets a fake surface normal, a light direction picks a
// 0..1 brightness, and ditherPick() turns that into a ramp colour with Bayer dithering.
import { makeCanvas, ditherPick } from './gfx.js';
import { clamp } from './math.js';

const LIGHT = { x: -0.5, y: -0.62, z: 0.6 };

export class Painter {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.px = new Array(w * h).fill(null);
  }

  inb(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  set(x, y, c) { x = Math.round(x); y = Math.round(y); if (this.inb(x, y)) this.px[y * this.w + x] = c; }
  get(x, y) { return this.inb(x, y) ? this.px[y * this.w + x] : null; }
  has(x, y) { return this.get(x, y) !== null; }

  /** brightness 0..1 from a surface normal */
  static lit(nx, ny, nz, o = {}) {
    const L = o.light || LIGHT;
    const d = nx * L.x + ny * L.y + nz * L.z;
    return (o.amb ?? 0.34) + (o.gain ?? 0.66) * clamp(d, 0, 1);
  }

  /** Generic shaded fill. `shape(x,y)` -> null (outside) or {nx,ny,nz} / number (brightness). */
  shaded(x0, y0, x1, y1, shape, ramp, o = {}) {
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
      for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
        if (!this.inb(x, y)) continue;
        if (o.only && !o.only(x, y)) continue;
        if (o.under === false && this.has(x, y)) continue;
        const s = shape(x + 0.5, y + 0.5);
        if (s === null || s === undefined) continue;
        let light = typeof s === 'number' ? s : Painter.lit(s.nx, s.ny, s.nz, o);
        if (o.shift) light += o.shift(x, y);
        if (o.noise) light += (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453 % 1) * o.noise - o.noise / 2;
        const col = o.color ? o.color(x, y, light) : ditherPick(ramp, light, x, y);
        if (col) this.px[y * this.w + x] = col;
      }
    }
    return this;
  }

  ellipse(cx, cy, rx, ry, ramp, o = {}) {
    return this.shaded(cx - rx, cy - ry, cx + rx, cy + ry, (x, y) => {
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      const d2 = nx * nx + ny * ny;
      if (d2 > 1) return null;
      return { nx, ny, nz: Math.sqrt(1 - d2) };
    }, ramp, o);
  }

  /** Rounded box / superellipse. n=2 is an ellipse, ~4 a soft rounded rectangle. */
  rbox(cx, cy, rx, ry, n, ramp, o = {}) {
    return this.shaded(cx - rx, cy - ry, cx + rx, cy + ry, (x, y) => {
      const ax = Math.abs((x - cx) / rx);
      const ay = Math.abs((y - cy) / ry);
      const s = Math.pow(ax, n) + Math.pow(ay, n);
      if (s > 1) return null;
      const h = Math.pow(1 - s, 1 / n);
      const nx = Math.sign(x - cx) * Math.pow(ax, n - 1);
      const ny = Math.sign(y - cy) * Math.pow(ay, n - 1);
      const len = Math.hypot(nx, ny, h) || 1;
      return { nx: nx / len, ny: ny / len, nz: h / len };
    }, ramp, o);
  }

  /** Thick line with round ends and a cylinder normal (limbs, strands, mic stands). */
  capsule(x0, y0, x1, y1, r0, r1, ramp, o = {}) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len2 = dx * dx + dy * dy || 1;
    const R = Math.max(r0, r1);
    return this.shaded(Math.min(x0, x1) - R, Math.min(y0, y1) - R, Math.max(x0, x1) + R, Math.max(y0, y1) + R, (x, y) => {
      const t = clamp(((x - x0) * dx + (y - y0) * dy) / len2, 0, 1);
      const px = x0 + dx * t;
      const py = y0 + dy * t;
      const r = r0 + (r1 - r0) * t;
      const ox = (x - px) / r;
      const oy = (y - py) / r;
      const d2 = ox * ox + oy * oy;
      if (d2 > 1) return null;
      return { nx: ox, ny: oy, nz: Math.sqrt(1 - d2) };
    }, ramp, o);
  }

  rect(x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
    return this;
  }

  line(x0, y0, x1, y1, c, t = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    for (;;) {
      for (let j = 0; j < t; j++) for (let i = 0; i < t; i++) this.set(x0 + i, y0 + j, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = err * 2;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
    return this;
  }

  /** Even-odd polygon fill. `c` is a colour or (x,y)=>colour. */
  poly(pts, c, o = {}) {
    let y0 = Infinity;
    let y1 = -Infinity;
    for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
      const xs = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        const yy = y + 0.5;
        if ((a[1] <= yy && b[1] > yy) || (b[1] <= yy && a[1] > yy)) xs.push(a[0] + ((yy - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) {
          if (o.only && !o.only(x, y)) continue;
          this.set(x, y, typeof c === 'function' ? c(x, y) : c);
        }
      }
    }
    return this;
  }

  /** Remove pixels inside a shape (cut-outs for masks, eyes of a hood...). */
  erase(test) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (test(x, y)) this.px[y * this.w + x] = null;
    return this;
  }

  /** Paint a 1px border on the transparent pixels around the shape. `diag` also includes corners. */
  outline(color, diag = false) {
    const add = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.has(x, y)) continue;
        if (this.has(x - 1, y) || this.has(x + 1, y) || this.has(x, y - 1) || this.has(x, y + 1) ||
          (diag && (this.has(x - 1, y - 1) || this.has(x + 1, y - 1) || this.has(x - 1, y + 1) || this.has(x + 1, y + 1)))) add.push([x, y]);
      }
    }
    for (const [x, y] of add) this.px[y * this.w + x] = typeof color === 'function' ? color(x, y) : color;
    return this;
  }

  /** Darken the edge pixels of the shape itself (a softer, inner outline). */
  innerEdge(fn) {
    const add = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const c = this.get(x, y);
        if (!c) continue;
        if (!this.has(x - 1, y) || !this.has(x + 1, y) || !this.has(x, y - 1) || !this.has(x, y + 1)) add.push([x, y, fn(c, x, y)]);
      }
    }
    for (const [x, y, c] of add) this.px[y * this.w + x] = c;
    return this;
  }

  blit(other, ox = 0, oy = 0) {
    for (let y = 0; y < other.h; y++) for (let x = 0; x < other.w; x++) {
      const c = other.px[y * other.w + x];
      if (c) this.set(x + ox, y + oy, c);
    }
    return this;
  }

  flipH() {
    const out = new Painter(this.w, this.h);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) out.px[y * this.w + (this.w - 1 - x)] = this.px[y * this.w + x];
    return out;
  }

  /** Swap exact colours (variant recolours). */
  recolor(map) {
    for (let i = 0; i < this.px.length; i++) if (this.px[i] && map[this.px[i]]) this.px[i] = map[this.px[i]];
    return this;
  }

  toCanvas() {
    const cv = makeCanvas(this.w, this.h);
    const c = cv.getContext('2d');
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const col = this.px[y * this.w + x];
        if (col) { c.fillStyle = col; c.fillRect(x, y, 1, 1); }
      }
    }
    return cv;
  }
}

export const hash2 = (x, y) => {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return s - Math.floor(s);
};
