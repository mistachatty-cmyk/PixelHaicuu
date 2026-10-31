// Lok Pixel Library - math helpers (no DOM, safe in Node and the browser)
export const TAU = Math.PI * 2;

let rng = Math.random;
/** Swap the RNG (tests, deterministic previews, seeded cards). Pass nothing to restore Math.random. */
export const setRandom = (fn) => { rng = fn || Math.random; };
export const random = () => rng();

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a, b) => a + rng() * (b - a);
export const pick = (arr) => arr[Math.floor(rng() * arr.length)];
export const smoothstep = (t) => t * t * (3 - 2 * t);

/** Small seeded PRNG. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
