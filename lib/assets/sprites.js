// The sprite kit: small ascii-defined sprites shared by every scene (particles, critters, little flowers).
// makeKit() builds canvases once; scenes pass the kit to Particles.
import { spriteFromRows } from '../core/gfx.js';

export const ROWS = {
  heart: ['.aa.aa.', 'awaaaaa', 'aaaaaaa', '.bbbbb.', '..bbb..', '...b...'],
  heartSm: ['.a.a.', 'aaaaa', '.bbb.', '..b..'],
  star: ['..a..', '.aaa.', 'aaaaa', '.aaa.', '..a..'],
  starBig: ['...a...', '...a...', '..aaa..', 'aaaaaaa', '..aaa..', '...a...', '...a...'],
  spark: ['.a.', 'aaa', '.a.'],
  dot: ['a'],
  butterfly1: ['aa...aa', 'aaa.aaa', '.aabaa.', '..aba..', '.a...a.'],
  butterfly2: ['.......', 'a..b..a', 'aabbbaa', '.aabaa.', '..a.a..'],
  bird1: ['b.b', '.b.'],
  bird2: ['.b.', 'b.b'],
  petal: ['aa', 'ab'],
  miniFlower: ['..a.a..', '.aaaaa.', '.aacaa.', '.aaaaa.', '..a.a..', '...g...', '..gg...'],
  note: ['..aa', '..a.', '..a.', 'aa..', 'aa..'],
  zzz: ['aaa', '..a', '.a.', 'aaa'],
};

const HEARTS = [
  { a: '#ff6fa6', b: '#e84a86', w: '#ffd0e2' },
  { a: '#ff93c1', b: '#f26aa4', w: '#ffffff' },
  { a: '#ffb3d1', b: '#ff82b3', w: '#ffffff' },
  { a: '#c88cff', b: '#a766e6', w: '#ecd8ff' },
];
const STARS = ['#ffe566', '#fff4b0', '#ffffff', '#ffc4e2'];

export function makeKit() {
  const hearts = HEARTS.map((p) => spriteFromRows(ROWS.heart, p));
  const heartsSm = HEARTS.map((p) => spriteFromRows(ROWS.heartSm, p));
  const stars = STARS.map((c) => spriteFromRows(ROWS.star, { a: c }));
  const starsBig = STARS.map((c) => spriteFromRows(ROWS.starBig, { a: c }));
  const spark = STARS.map((c) => spriteFromRows(ROWS.spark, { a: c }));
  const butterflies = [
    { a: '#ffd23c', b: '#6a3a8a' }, { a: '#ff9ccb', b: '#7a2a5a' }, { a: '#9ad6ff', b: '#2a4a8a' },
  ].map((p) => [spriteFromRows(ROWS.butterfly1, p), spriteFromRows(ROWS.butterfly2, p)]);
  const birds = ['#2c2a4a', '#ffffff'].map((c) => [spriteFromRows(ROWS.bird1, { b: c }), spriteFromRows(ROWS.bird2, { b: c })]);
  const miniFlowers = [
    { a: '#ff9ccb', c: '#ffe566', g: '#4f9a3a' }, { a: '#ffffff', c: '#ffd23c', g: '#4f9a3a' },
    { a: '#c88cff', c: '#fff4b0', g: '#4f9a3a' }, { a: '#ffd1e6', c: '#ff7ab0', g: '#4f9a3a' },
  ].map((p) => spriteFromRows(ROWS.miniFlower, p));
  const petals = ['#ffc2de', '#ff9ccb', '#fff0f7'].map((c) => spriteFromRows(ROWS.petal, { a: c, b: '#ff9ccb' }));
  const notes = ['#ffffff', '#ffe566', '#ff9ccb'].map((c) => spriteFromRows(ROWS.note, { a: c }));
  const zzz = spriteFromRows(ROWS.zzz, { a: '#ffffff' });
  return { hearts, heartsSm, stars, starsBig, spark, butterflies, birds, miniFlowers, petals, notes, zzz };
}
