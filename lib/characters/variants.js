// Kujo-sama's looks, as data. To add a new look: copy one, change the options, give it an id. No drawing code needed.
// For a new body shape (different anchors) add a rig in rig.js; for a new kind of part add a builder in parts.js.
import { COLORS } from './parts.js';

export const VARIANTS = {
  classic: {
    id: 'classic', name: 'PINK DREADS', era: 'now', rig: 'sitter', theme: 'day',
    head: { kind: 'human', glasses: true, beard: COLORS.beard, hair: COLORS.coral },
    torso: { kind: 'hoodie', ramp: COLORS.tiedye },
    legs: { kind: 'crisscross', pants: COLORS.black, shoes: COLORS.shoePink },
    arms: { kind: 'sleeves' },
    hat: null,
    aura: ['#ff7ab8', '#ffa3cf', '#ffd0e6'],
  },
  pinkmask: {
    id: 'pinkmask', name: 'PINK MASK', era: 'now', rig: 'sitter', theme: 'day',
    head: { kind: 'mask', knit: COLORS.hotPink, doodle: ['#ffffff', '#1a1a22', '#ffe566'], hair: COLORS.coral },
    torso: { kind: 'jacket', ramp: COLORS.black, accent: '#ff2ea6' },
    legs: { kind: 'crisscross', pants: COLORS.black, shoes: COLORS.shoePink },
    arms: { kind: 'sleeves' },
    hat: null,
    aura: ['#ff2ea6', '#ff62bd', '#ffb0dc'],
  },
  maroon: {
    id: 'maroon', name: 'MAROON MASK', era: 'now', rig: 'sitter', theme: 'dusk',
    head: { kind: 'mask', knit: COLORS.maroon, doodle: ['#ffffff', '#ffd23c', '#ff9ccb'], hair: COLORS.coral },
    torso: { kind: 'jacket', ramp: COLORS.black },
    legs: { kind: 'crisscross', pants: COLORS.denim, shoes: COLORS.shoePink },
    arms: { kind: 'sleeves' },
    hat: null,
    aura: ['#b52a55', '#e0507c', '#ffb0c4'],
  },
  bucket: {
    id: 'bucket', name: 'BUCKET HAT', era: 'now', rig: 'sitter', theme: 'day',
    head: { kind: 'human', glasses: true, beard: COLORS.beard, hair: COLORS.coral },
    torso: { kind: 'hoodie', ramp: COLORS.tiedye },
    legs: { kind: 'crisscross', pants: COLORS.denim, shoes: COLORS.shoePink },
    arms: { kind: 'sleeves' },
    hat: { kind: 'bucket', ramp: COLORS.hotPink, band: '#ffffff' },
    aura: ['#ff7ab8', '#ffc2de', '#fff0f7'],
  },
  llama: {
    id: 'llama', name: 'LLAMASTE', era: 'logo', rig: 'llama', theme: 'day',
    head: { kind: 'llama', wool: COLORS.wool },
    torso: { kind: 'llama', wool: COLORS.wool },
    legs: { kind: 'llama', wool: COLORS.wool },
    arms: { kind: 'prayer', wool: COLORS.wool },
    hat: null,
    aura: ['#ff9ccb', '#ffc2de', '#ffe3ee'],
  },
};

export const VARIANT_ORDER = ['classic', 'pinkmask', 'maroon', 'bucket', 'llama'];
