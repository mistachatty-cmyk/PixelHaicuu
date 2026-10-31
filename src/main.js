// The HaiCuu Experience - Kujo-sama page. Wires the Lok Pixel Library (vendored in ../lib) to the DOM:
// intro (LLAMASTE -> petals -> title -> camera glides down to Kujo), interaction, music and the HUD.
import {
  createStage, SakuraWorld, Kujo, Particles, BeatEngine, makeKit, Synth, MusicPlayer,
  attachPointer, revealWords, sleep, VARIANTS, VARIANT_ORDER,
} from '../lib/index.js';
import { HAIKUS } from './haikus.js';

const $ = (id) => document.getElementById(id);
const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const NAMES = { llama: 'LLAMASTÉ' }; // display names with accents (the pixel font only matters on canvas)
const lookName = (def) => NAMES[def.id] || def.name;

// ---- engine ------------------------------------------------------------------------------------------------------
const canvas = $('stage');
const stage = createStage(canvas, { targetH: 230, targetW: 118 });
const kit = makeKit();
const particles = new Particles(kit);
const beat = new BeatEngine();
const synth = new Synth();
const world = new SakuraWorld({ stage, kit, particles, theme: VARIANTS[VARIANT_ORDER[0]].theme });
const kujo = new Kujo({ kit, particles, beat });
world.attachKujo(kujo);
beat.on((info) => world.onBeat(info));

let resizeQueued = false;
window.addEventListener('resize', () => {
  if (resizeQueued) return;
  resizeQueued = true;
  requestAnimationFrame(() => { resizeQueued = false; stage.resize(); });
});

// ---- looks (variants) --------------------------------------------------------------------------------------------
function showLook() { $('look').textContent = lookName(kujo.def); }
function switchLook(dir = 1, id = null) {
  const def = id ? kujo.setVariant(id) : kujo.cycle(dir);
  if (def) world.setTheme(def.theme);
  showLook();
  synth.swap();
  return def;
}
let auto = false;
let autoTimer = null;
function setAuto(on) {
  auto = on;
  $('auto').setAttribute('aria-pressed', String(on));
  clearInterval(autoTimer);
  if (on) autoTimer = setInterval(() => switchLook(1), 18000);
}

// ---- music -------------------------------------------------------------------------------------------------------
const player = new MusicPlayer(synth, beat, {
  tracks: [],
  onTrack: (tr) => {
    $('track').textContent = tr ? '♪ ' + (tr.title || '').toUpperCase() : '';
    $('play').setAttribute('aria-pressed', String(player.playing));
    if (tr && tr.variant && VARIANTS[tr.variant]) switchLook(1, tr.variant);
    else if (tr && tr.id !== 'demo' && player.tracks.length > 1) switchLook(1);
  },
});
fetch('tracks.json', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : [])).then((t) => { if (Array.isArray(t)) player.tracks = t; }).catch(() => {});

function togglePlay() {
  synth.ensure();
  const on = player.toggle();
  $('play').setAttribute('aria-pressed', String(on));
  $('play').textContent = on ? '♪ PAUSE' : '♪ PLAY';
  if (!on) $('track').textContent = '';
}

// ---- input -------------------------------------------------------------------------------------------------------
let ready = false; // true once the intro has handed control over
window.addEventListener('pointerdown', () => synth.ensure(), { once: true });

attachPointer(stage, {
  onTap: (sx, sy) => {
    if (!ready) return;
    const [wx, wy] = world.toWorld(sx, sy);
    if (kujo.hit(wx, wy)) {
      kujo.poke();
      synth.poke();
      switchLook(1);
      return;
    }
    const hit = world.tap(wx, wy);
    if (hit === 'sun' || hit === 'title') synth.sparkle();
    else if (hit === 'alpaca' || hit === 'flower') synth.boop();
    else if (hit) synth.pop();
  },
  onHold: (sx, sy, on) => {
    if (!ready) return;
    const [wx, wy] = world.toWorld(sx, sy);
    if (on && kujo.hit(wx, wy)) { kujo.setHold(true); synth.sparkle(); } else kujo.setHold(false);
  },
  onDragY: (dy) => { if (ready) world.scrollBy(dy); },
  onWheel: (dy) => { if (ready) world.scrollBy(dy); },
  onKey: (k) => {
    if (!ready) return;
    if (k === 'ArrowDown' || k === 'PageDown') world.goTo('bottom');
    else if (k === 'ArrowUp' || k === 'PageUp') world.goTo('top');
    else if (k === 'ArrowRight') switchLook(1);
    else if (k === 'ArrowLeft') switchLook(-1);
    else if (k === ' ') togglePlay();
  },
});
window.addEventListener('pointerup', () => kujo.setHold(false));

$('prev').onclick = () => { synth.ensure(); switchLook(-1); };
$('next').onclick = () => { synth.ensure(); switchLook(1); };
$('look').onclick = () => { synth.ensure(); switchLook(1); kujo.poke(); };
$('play').onclick = togglePlay;
$('mute').onclick = () => {
  synth.ensure();
  synth.setMuted(!synth.muted);
  $('mute').setAttribute('aria-pressed', String(synth.muted));
  $('mute').textContent = synth.muted ? 'MUTED' : 'SOUND';
};
$('auto').onclick = () => setAuto(!auto);
$('scrollbtn').onclick = () => world.goTo(world.progress > 0.5 ? 'top' : 'bottom');

// ---- main loop ---------------------------------------------------------------------------------------------------
let last = performance.now();
let arrow = '▼';
function frame(now) {
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
  last = now;
  beat.update(dt);
  player.update();
  world.update(dt);
  kujo.update(dt);
  particles.update(dt);
  stage.ctx.imageSmoothingEnabled = false;
  world.draw(stage.ctx);
  const a = world.progress > 0.5 ? '▲' : '▼';
  if (a !== arrow) { arrow = a; $('scrollbtn').textContent = a; }
  haikuEl.classList.toggle('on', haikuWanted && world.progress > 0.55);
  requestAnimationFrame(frame);
}

// ---- haiku -------------------------------------------------------------------------------------------------------
const haikuEl = $('haiku');
let haikuWanted = false;
let haikuIx = Math.floor(Math.random() * HAIKUS.length);
async function haikuLoop() {
  for (;;) {
    await sleep(4000);
    while (world.progress < 0.55 || document.hidden) await sleep(1200);
    haikuWanted = true;
    await revealWords(haikuEl, HAIKUS[haikuIx % HAIKUS.length], { stagger: 170, hold: 2600 });
    haikuIx++;
    haikuWanted = false;
    await sleep(14000);
  }
}

// ---- intro -------------------------------------------------------------------------------------------------------
let skipped = false;
const hello = $('hello');
const wait = (ms) => (skipped ? Promise.resolve() : sleep(ms));

function arrive() {
  if (ready) return;
  ready = true;
  hello.className = 'ov gone';
  $('skip').classList.add('gone');
  $('hud').classList.add('on');
  $('brand').style.opacity = 1;
  $('scrollbtn').classList.add('on');
  world.showSign(true);
  showLook();
  kujo.expr = 'happy';
  kujo.exprT = 1.4;
  particles.hearts(kujo.x, kujo.y - 66, 5, 12);
  haikuLoop();
}

async function intro() {
  if (reduce) {
    world.revealTitle(0);
    await sleep(500);
    world.cam.snap(world.maxCam);
    world.cam.t = world.maxCam;
    return arrive();
  }
  await wait(450);
  hello.className = 'ov show';
  synth.greet();
  await wait(1700);
  hello.className = 'ov slide';
  await wait(650);
  synth.whoosh();
  world.inhale(0.95);
  await wait(950);
  hello.className = 'ov gone';
  world.bloom();
  synth.bloom();
  await wait(450);
  world.revealTitle();
  await wait(2700);
  if (!skipped) world.goTo('bottom');
  await wait(1500);
  arrive();
}

$('skip').onclick = () => {
  skipped = true;
  hello.className = 'ov gone';
  world.revealTitle(0.02);
  world.goTo('bottom');
  setTimeout(arrive, 700);
};

requestAnimationFrame(frame);
intro();
