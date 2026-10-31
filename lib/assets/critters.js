// Little living things for the sky and meadow: the cardinal (two wing frames, faces right; flip to fly left).
import { spriteFromRows } from '../core/gfx.js';

const CARDINAL_UP = [
  '...dd..rr...',
  '..dddrrrrr..',
  '..ddrrrrkk..',
  '..drrrrkwkoo',
  'drrrrrrrkkoo',
  'ddrrrrrrrrr.',
  '.drrrrrrrrr.',
  '..drrrrrrr..',
  '...rrrr.r...',
];
const CARDINAL_DOWN = [
  '......rr....',
  '.....rrrrr..',
  '....rrrrkk..',
  '..rrrrrkwkoo',
  'rrrrrrrrkkoo',
  'ddrrrrrrrrr.',
  'dddddrrrrrr.',
  '..ddddrrr...',
  '...dd.r.r...',
];
const PAL = { r: '#d8262f', d: '#9a1424', k: '#1b0e17', w: '#ffffff', o: '#ff9a2a' };

export function makeCardinal() {
  return [spriteFromRows(CARDINAL_UP, PAL), spriteFromRows(CARDINAL_DOWN, PAL)];
}
