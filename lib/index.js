// Lok Pixel Library - public API. Import from here; everything is ES modules and tree-shakes.
export * from './core/math.js';
export * from './core/gfx.js';
export * from './core/stage.js';
export { Spring } from './core/spring.js';
export { Particles } from './core/particles.js';
export { Toy } from './core/toy.js';
export { BeatEngine } from './core/beat.js';
export { Painter, hash2 } from './core/painter.js';

export { THEMES, THEME_NAMES } from './assets/palettes.js';
export { makeKit, ROWS } from './assets/sprites.js';
export { makeSunFace, makeCloudPuff, makeSmileyHead, makeAlpaca, makeSign, makeGlow, makeBible } from './assets/props.js';
export { makeSakura } from './assets/tree.js';
export { makeTitle, bubbleLetter, chromeLetter, ransomLetter } from './assets/title.js';
export { GLYPHS3, GLYPHS5, drawText3, width3 } from './assets/pixelfont.js';

export { makeCardinal } from './assets/critters.js';
export { SakuraWorld } from './scenes/sakuraWorld.js';
export { BibleBounce } from './scenes/bibleBounce.js';

export { Kujo } from './characters/kujo.js';
export { VARIANTS, VARIANT_ORDER } from './characters/variants.js';
export { RIGS, Rig, buildRig } from './characters/rig.js';
export { HEADS, TORSOS, LEGS, ARMS, HATS, COLORS } from './characters/parts.js';
export { DreadSystem } from './characters/dreads.js';
export { SpriteLook, SpriteOverlay } from './characters/spriteRig.js';

// DOM helpers (browser only - they touch window/document/WebAudio when called)
export { Synth, DemoLoop, MusicPlayer } from './dom/audio.js';
export { PIXELQ, SONGS, PixelQ, pixelQTracks } from './music/pixelq.js';
export { attachPointer } from './dom/pointer.js';
export { revealWords, sleep } from './dom/words.js';
