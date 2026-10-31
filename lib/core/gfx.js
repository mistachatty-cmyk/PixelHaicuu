// Lok Pixel Library - low-level pixel helpers.
// The canvas factory is injectable so the same code runs in the browser and in Node
// (headless previews and asset export use @napi-rs/canvas).
import { clamp } from './math.js';

let factory = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};
export const setCanvasFactory = (fn) => { factory = fn; };
export const makeCanvas = (w, h) => factory(Math.max(1, w | 0), Math.max(1, h | 0));

// 4x4 Bayer matrix - the dither pattern behind the whole Digiflower look.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const bayer = (x, y) => BAYER[((y & 3) << 2) | (x & 3)] / 16;

/** Pick a colour from a dark->light ramp for a 0..1 light value, ordered-dithered. */
export function ditherPick(ramp, light, x, y) {
  const v = clamp(light, 0, 1) * (ramp.length - 1);
  return ramp[clamp(Math.floor(v + bayer(x, y)), 0, ramp.length - 1)];
}

/** Build a sprite from ascii rows. Characters map to colours through `palette`; anything else is transparent. */
export function spriteFromRows(rows, palette) {
  const w = rows[0].length;
  const h = rows.length;
  const cv = makeCanvas(w, h);
  const cx = cv.getContext('2d');
  rows.forEach((row, y) => {
    for (let x = 0; x < w; x++) {
      const col = palette[row[x]];
      if (col) {
        cx.fillStyle = col;
        cx.fillRect(x, y, 1, 1);
      }
    }
  });
  return cv;
}

export function flipH(src) {
  const c = makeCanvas(src.width, src.height);
  const x = c.getContext('2d');
  x.translate(src.width, 0);
  x.scale(-1, 1);
  x.drawImage(src, 0, 0);
  return c;
}

/** Nearest-neighbour upscale for exports and previews. */
export function upscale(src, k) {
  const c = makeCanvas(src.width * k, src.height * k);
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  x.drawImage(src, 0, 0, src.width * k, src.height * k);
  return c;
}
