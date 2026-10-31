// The HaiCuu Experience - Kujo-sama page. Wires the Lok Pixel Library (vendored in ../lib) to the DOM:
// intro (LLAMASTE -> petals -> title -> camera glides down to Kujo), interaction, music and the HUD.
import {
  createStage, SakuraWorld, Kujo, Particles, BeatEngine, makeKit, Synth, MusicPlayer, BibleBounce, pixelQTracks, PIXELQ, THEMES,
  attachPointer, revealWords, sleep, VARIANTS, VARIANT_ORDER,
} from '../lib/index.js';
import { HAIKUS } from './haikus.js';
import { BibleReader } from './reader.js';

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

// ---- feel helpers ------------------------------------------------------------------------------------------------
const buzz = (ms) => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (_) { /* unsupported */ } };

// ---- Bible: a pixel Bible bounces around the screen (grab/fling it, tap to read) -----------------------------
const reader = new BibleReader({
  sfx: (n, a) => { synth.ensure(); if (typeof synth[n] === 'function') synth[n](a); },
  buzz,
  onOpen: () => { bible.hide(); },
  onClose: () => { bible.popBack(); },
});
const bible = new BibleBounce({
  stage, kit,
  onOpen: () => { synth.ensure(); reader.open(); },
  onGrab: () => { synth.ensure(); synth.grab(); buzz(6); },
  onFling: (sp) => { synth.fling(sp); buzz(10); },
  onBounce: (sp) => { synth.tok(sp); if (sp > 90) buzz(4); },
  onCorner: () => { synth.chime(); buzz([8, 30, 8]); },
});
function fitBible() {
  const hud = $('hud');
  const hh = hud && hud.offsetHeight ? hud.offsetHeight + 18 : 110;
  bible.setBounds(Math.ceil(46 / stage.scale), stage.h - Math.ceil(hh / stage.scale));
}
stage.onResize.push(fitBible);

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
// Pixel Q Music (procedural songs) first, then any MP3s listed in tracks.json
const player = new MusicPlayer(synth, beat, {
  tracks: pixelQTracks(),
  onTrack: (tr) => {
    $('track').textContent = tr ? '♪ ' + (tr.title || '').toUpperCase() : '';
    $('play').setAttribute('aria-pressed', String(player.playing));
    $('play').textContent = player.playing ? '♪ PAUSE' : '♪ PLAY';
    if (tr && tr.variant && VARIANTS[tr.variant]) switchLook(1, tr.variant);
    else if (tr && player.tracks.length > 1) switchLook(1);
    if (tr && tr.theme && THEMES[tr.theme]) world.setTheme(tr.theme);
    markPlaying();
  },
});
// Two soundtracks, one switch: REALITY = Cuu Jo's Mixverse (his real tracks from tracks.json, the main soundtrack)
// and PIXEL = the built-in Pixel Q Music. The player only ever holds the list for the active side.
const MODES = {
  reality: { name: "CUU JO'S MIXVERSE", theme: 'night' },
  pixel: { name: PIXELQ.name, theme: 'day' },
};
let mode = 'pixel';
let mp3 = [];
const lastIdx = { reality: 0, pixel: 0 };
const idleLabel = () => '◉ ' + MODES[mode].name;
function syncModeUI() {
  const r = mode === 'reality';
  [['mreal', 'sreal'], ['mpix', 'spix']].forEach(([a, b], i) => {
    const on = i === 0 ? r : !r;
    $(a).setAttribute('aria-pressed', String(on));
    $(b).setAttribute('aria-pressed', String(on));
  });
  $('tsub').textContent = r ? MODES.reality.name + ' · THE MAIN SOUNDTRACK' : PIXELQ.name + ' · LLAMASTÉ PRODUCTIONS';
  $('play').setAttribute('aria-pressed', String(player.playing));
  $('play').textContent = player.playing ? '♪ PAUSE' : '♪ PLAY';
  if (!player.playing) $('track').textContent = idleLabel();
}
function modeFx() {
  synth.ensure();
  synth.sparkle();
  buzz([8, 30, 8]);
  kujo.poke();
  world.setTheme(MODES[mode].theme);
  if (!reduce) {
    const fx = $('fx');
    fx.classList.remove('go'); void fx.offsetWidth; fx.classList.add('go');
    canvas.classList.remove('flip'); void canvas.offsetWidth; canvas.classList.add('flip');
  }
}
function setMode(m, { silent = false } = {}) {
  if (m === mode && !silent) return;
  const wasPlaying = player.playing;
  if (player.index >= 0) lastIdx[mode] = player.index;
  mode = m;
  player.pause();
  player.tracks = m === 'pixel' ? pixelQTracks() : mp3;
  player.index = -1;
  buildList();
  syncModeUI();
  if (silent) return;
  modeFx();
  if (wasPlaying) player.play(lastIdx[m] || 0);
}
fetch('tracks.json', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : [])).then((t) => {
  mp3 = Array.isArray(t) ? t.filter((x) => x && x.src && x.title) : [];
  if (!mp3.length) return;
  $('modewrap').hidden = false;
  $('seg').hidden = false;
  setMode('reality', { silent: true });
}).catch(() => {});
$('mreal').onclick = () => { synth.ensure(); setMode('reality'); };
$('mpix').onclick = () => { synth.ensure(); setMode('pixel'); };
$('sreal').onclick = () => { synth.ensure(); setMode('reality'); };
$('spix').onclick = () => { synth.ensure(); setMode('pixel'); };

// ---- song sheet --------------------------------------------------------------------------------------------------
const sheet = $('tracks');
function buildList() {
  const list = $('tlist');
  list.innerHTML = '';
  let group = null;
  player.tracks.forEach((tr, i) => {
    const g = tr.song ? PIXELQ.name : 'MIXVERSE';
    if (g !== group) {
      group = g;
      const h = document.createElement('div');
      h.className = 'grp';
      h.textContent = tr.song ? PIXELQ.name + ' · LLAMASTÉ PRODUCTIONS' : MODES.reality.name + ' · THE MAIN SOUNDTRACK';
      list.appendChild(h);
    }
    const b = document.createElement('button');
    b.className = 'trk';
    b.dataset.i = i;
    const look = tr.variant && VARIANTS[tr.variant] ? lookName(VARIANTS[tr.variant]) : '';
    b.innerHTML = '<span class="n">' + (i + 1) + '</span><span class="nm"></span><span class="eq"><i></i><i></i><i></i></span>';
    b.querySelector('.nm').textContent = (tr.title || '').toUpperCase();
    const sm = document.createElement('small');
    sm.textContent = [tr.bpm ? tr.bpm + ' BPM' : '', look].filter(Boolean).join(' · ');
    b.querySelector('.nm').appendChild(sm);
    b.onclick = () => { synth.ensure(); player.play(i); };
    list.appendChild(b);
  });
  if (mode === 'reality' && mp3.length) {
    const a = document.createElement('a');
    a.className = 'tlink';
    a.href = '/mixverse/';
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = "OPEN CUU JO'S MIXVERSE JUKEBOX ↗";
    list.appendChild(a);
  }
  markPlaying();
}
function markPlaying() {
  document.querySelectorAll('.trk').forEach((b) => {
    const on = +b.dataset.i === player.index;
    b.setAttribute('aria-current', String(on));
    b.classList.toggle('live', on && player.playing);
  });
}
function openSheet() {
  synth.ensure();
  sheet.hidden = false;
  void sheet.offsetWidth;
  sheet.classList.add('open');
  synth.pop();
}
function closeSheet() {
  sheet.classList.remove('open');
  setTimeout(() => { if (!sheet.classList.contains('open')) sheet.hidden = true; }, 380);
}
sheet.addEventListener('pointerdown', (e) => { if (e.target === sheet) closeSheet(); });
window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !sheet.hidden) closeSheet(); });
buildList();

function togglePlay() {
  synth.ensure();
  const on = player.toggle();
  markPlaying();
  $('play').setAttribute('aria-pressed', String(on));
  $('play').textContent = on ? '♪ PAUSE' : '♪ PLAY';
  if (!on) $('track').textContent = idleLabel();
}

// ---- input -------------------------------------------------------------------------------------------------------
let ready = false; // true once the intro has handed control over
window.addEventListener('pointerdown', () => synth.ensure(), { once: true });
// every button gets a click sound, a pop and a little buzz
document.addEventListener('pointerdown', (e) => {
  const b = e.target.closest && e.target.closest('button');
  if (!b || b.classList.contains('trk') || b.id === 'bnew' || b.id === 'bprev' || b.id === 'bnext' || b.id === 'bmode' || b.id === 'bread') return;
  synth.ensure();
  if (b.id !== 'look' && b.id !== 'prev' && b.id !== 'next') synth.pop();
  buzz(5);
  b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
});

let lastTap = [0, 0];
attachPointer(stage, {
  enabled: () => !reader.isOpen && sheet.hidden,
  onDown: (sx, sy) => (ready ? bible.pointerDown(sx, sy) : false),
  onClaimMove: (sx, sy) => bible.pointerMove(sx, sy),
  onClaimUp: () => bible.pointerUp(),
  onDragXY: ([sx, sy], dx, dy) => {
    if (!ready) return;
    const [wx, wy] = world.toWorld(sx, sy);
    if (world.gust(wx, wy, dx * 2, dy * 2, 40) && Math.random() < 0.25) particles.stars(wx, wy, 1, 3, 20);
  },
  onTap: (sx, sy) => {
    if (!ready) return;
    const [wx, wy] = world.toWorld(sx, sy);
    lastTap = [wx, wy];
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
    if (!hit || hit === 'ground') { particles.stars(wx, wy, 3, 4, 30); world.gust(wx, wy, 0, -6, 34); }
    buzz(hit ? 8 : 4);
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
$('songs').onclick = openSheet;
$('tx').onclick = closeSheet;
$('tprev').onclick = () => { synth.ensure(); player.prev(); };
$('tnext').onclick = () => { synth.ensure(); player.next(); };
$('bibtn').onclick = () => { synth.ensure(); reader.open(); };
// hover feedback: pointer cursor over anything touchable
canvas.addEventListener('pointermove', (e) => {
  if (!ready || reader.isOpen || e.pointerType === 'touch') return;
  const [sx, sy] = stage.toStage(e.clientX, e.clientY);
  const onBible = bible.hit(sx, sy);
  bible.setHover(onBible);
  const [wx, wy] = world.toWorld(sx, sy);
  canvas.style.cursor = onBible ? 'grab' : kujo.hit(wx, wy) ? 'pointer' : 'default';
});
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
  bible.update(dt);
  bible.draw(stage.ctx);
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
  fitBible();
  setTimeout(() => { bible.spawn(); synth.pop(); }, 900);
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
