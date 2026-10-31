// The HaiCuu Experience - Kujo-sama page. Wires the Lok Pixel Library (vendored in ../lib) to the DOM:
// intro (LLAMASTE -> petals -> title -> camera glides down to Kujo), interaction, music and the HUD.
import {
  createStage, SakuraWorld, Kujo, Particles, BeatEngine, makeKit, Synth, MusicPlayer, BibleBounce, pixelQTracks, PIXELQ, THEMES,
  attachPointer, revealWords, sleep, VARIANTS, VARIANT_ORDER, SpriteLook, SpriteOverlay,
} from '../lib/index.js';
import { HAIKUS } from './haikus.js';
import { BibleReader } from './reader.js';
import { bindDialogFocus } from './dialog-focus.js';

const $ = (id) => document.getElementById(id);
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
let reduce = motionPreference.matches;
motionPreference.addEventListener('change', (e) => { reduce = e.matches; if (reduce) { kujo.sprite?.reset(); kujo.setHold(false); } });

const NAMES = { llama: 'Llamasté' };
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
const spriteCanvas = $('kujo-sprite');
const overlay = new SpriteOverlay({ canvas: spriteCanvas, stage, world });
const toyCanvas = $('toy-sprite');
const toyCtx = toyCanvas.getContext('2d');
function fitToyCanvas() {
  toyCanvas.width = stage.w; toyCanvas.height = stage.h;
  toyCanvas.style.width = stage.w * stage.scale + 'px'; toyCanvas.style.height = stage.h * stage.scale + 'px';
  toyCtx.imageSmoothingEnabled = false;
}
stage.onResize.push(fitToyCanvas);
fitToyCanvas();
const spriteLooks = new Map();
const spriteLoads = new Map();
let spriteRequest = 0;
function loadLook(id) {
  if (!spriteLoads.has(id)) spriteLoads.set(id, SpriteLook.load('kujo/' + id + '/manifest.json').then((look) => { spriteLooks.set(id, look); return look; }).catch(() => { spriteLoads.delete(id); return null; }));
  return spriteLoads.get(id);
}
async function applySprite() {
  const id = kujo.id;
  const request = ++spriteRequest;
  kujo.sprite = spriteLooks.get(id) || null;
  spriteCanvas.dataset.look = id;
  spriteCanvas.dataset.ready = String(!!kujo.sprite);
  const look = kujo.sprite || await loadLook(id);
  if (request !== spriteRequest || kujo.id !== id) return;
  kujo.sprite = look;
  spriteCanvas.dataset.ready = String(!!look);
  if (look) { look.reset(); look.setGaze(...gazeTarget); }
}
let gazeTarget = [0, 0];
function trackAt(sx, sy) {
  const [wx, wy] = world.toWorld(sx, sy);
  gazeTarget = [Math.max(-1, Math.min(1, (wx - kujo.x) / 55)), Math.max(-1, Math.min(1, (wy - (kujo.y - 52)) / 65))];
  kujo.sprite?.setGaze(...gazeTarget);
}
function resetGaze() { gazeTarget = [0, 0]; kujo.sprite?.setGaze(0, 0); }
applySprite().then(() => { for (const id of VARIANT_ORDER) if (id !== kujo.id) loadLook(id); });
beat.on((info) => world.onBeat(info));
// the world tells us about its little events (cardinal, wishes, planted flowers): give them sound and a tiny buzz
const soundFor = { plant: () => synth.pop(), catch: () => synth.sparkle(), chirp: () => synth.chirp(), cardinal: () => synth.chirp(), wish: () => synth.chime(), firefly: () => synth.boop(), shake: () => synth.boop(), pluck: () => { synth.sparkle(); buzz(5); }, pet: () => synth.boop() };

// ---- feel helpers ------------------------------------------------------------------------------------------------
world.onEvent = (name) => { synth.ensure(); const f = soundFor[name]; if (f) f(); };
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
  let hudTop = window.innerHeight - 120;
  if (hud && hud.offsetHeight) {
    const bottom = parseFloat(getComputedStyle(hud).bottom) || 20;
    const top = window.innerHeight - bottom - hud.offsetHeight;
    hudTop = top;
    world.setBottomReserve(stage.h + 26 - (top - 14) / stage.scale);
  }
  bible.setBounds(Math.ceil(46 / stage.scale), Math.floor((hudTop - 8) / stage.scale));
}
stage.onResize.push(fitBible);
const hudResize = new ResizeObserver(() => requestAnimationFrame(fitBible));
hudResize.observe($('hud'));

let resizeQueued = false;
window.addEventListener('resize', () => {
  if (resizeQueued) return;
  resizeQueued = true;
  requestAnimationFrame(() => { resizeQueued = false; stage.resize(); });
});

// ---- looks (variants) --------------------------------------------------------------------------------------------
function showLook() { const name = lookName(kujo.def); $('look').textContent = name; $('look').setAttribute('aria-label', 'Current look: ' + name + '. Activate to change.'); }
function switchLook(dir = 1, id = null) {
  const def = id ? kujo.setVariant(id) : kujo.cycle(dir);
  if (def) world.setTheme(def.theme);
  applySprite();
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
fetch('tracks.json', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : [])).then((t) => {
  if (Array.isArray(t) && t.length) { player.tracks = [...pixelQTracks(), ...t.filter((x) => x && x.src && x.title)]; buildList(); }
}).catch(() => {});

// ---- song sheet --------------------------------------------------------------------------------------------------
const sheet = $('tracks');
bindDialogFocus(sheet);
let sheetReturnFocus = null;
function buildList() {
  const list = $('tlist');
  list.innerHTML = '';
  let group = null;
  player.tracks.forEach((tr, i) => {
    const g = tr.song ? PIXELQ.name : 'YOUR TRACKS';
    if (g !== group) {
      group = g;
      const h = document.createElement('div');
      h.className = 'grp';
      h.textContent = tr.song ? PIXELQ.name + ' · LLAMASTÉ PRODUCTIONS' : 'MP3 TRACKS';
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
  sheetReturnFocus = document.activeElement;
  synth.ensure();
  sheet.hidden = false;
  void sheet.offsetWidth;
  sheet.classList.add('open');
  $('tx').focus();
  synth.pop();
}
function closeSheet() {
  sheet.classList.remove('open');
  setTimeout(() => { if (!sheet.classList.contains('open')) sheet.hidden = true; }, 380);
  sheetReturnFocus?.focus();
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
  if (!on) $('track').textContent = '';
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
let claimed = null;
let characterHold = null;
attachPointer(stage, {
  enabled: () => !reader.isOpen && sheet.hidden,
  onDown: (sx, sy, info) => {
    if (!ready) return false;
    if (bible.pointerDown(sx, sy)) { claimed = { kind: 'bible' }; return true; }
    const [wx, wy] = world.toWorld(sx, sy);
    if (!kujo.hit(wx, wy)) {
      if (world.alpacaAt(wx, wy)) { claimed = { kind: 'alpaca' }; world.petAlpaca(wx, wy); return true; }
      if (world.beginPetalPull(wx, wy)) { claimed = { kind: 'petal', x: wx, y: wy, vx: 0, vy: 0 }; return true; }
      return false;
    }
    claimed = { kind: 'character', x: sx, y: sy, moved: false, held: false, pointerType: info.pointerType };
    trackAt(sx, sy);
    if (!reduce) kujo.nod.kick(-8);
    characterHold = setTimeout(() => {
      if (claimed?.kind === 'character' && !claimed.moved) { claimed.held = true; kujo.setHold(true); synth.sparkle(); buzz(8); }
    }, 450);
    return true;
  },
  onClaimMove: (sx, sy) => {
    if (claimed?.kind === 'bible') return bible.pointerMove(sx, sy);
    if (claimed?.kind === 'alpaca') { const [wx, wy] = world.toWorld(sx, sy); world.petAlpaca(wx, wy); return; }
    if (claimed?.kind === 'petal') {
      const [wx, wy] = world.toWorld(sx, sy);
      claimed.vx = (wx - claimed.x) * 10; claimed.vy = (wy - claimed.y) * 10; claimed.x = wx; claimed.y = wy;
      world.movePetalPull(wx, wy); return;
    }
    if (claimed?.kind !== 'character') return;
    trackAt(sx, sy);
    if (Math.hypot(sx - claimed.x, sy - claimed.y) * stage.scale > 8) {
      claimed.moved = true; clearTimeout(characterHold); kujo.setHold(false);
    }
  },
  onClaimUp: (sx, sy, info = {}) => {
    clearTimeout(characterHold);
    const gesture = claimed; claimed = null;
    if (gesture?.kind === 'bible') return bible.pointerUp();
    if (gesture?.kind === 'petal') return world.releasePetalPull(gesture.vx, gesture.vy, info.cancelled);
    if (gesture?.kind === 'alpaca') return;
    kujo.setHold(false);
    if (gesture?.kind === 'character' && !info.cancelled && !gesture.moved && !gesture.held) { kujo.poke(); synth.poke(); switchLook(1); buzz(8); }
    if (gesture?.pointerType === 'touch' || info.cancelled) resetGaze();
  },
  onDragXY: ([sx, sy], dx, dy) => {
    if (!ready) return;
    const [wx, wy] = world.toWorld(sx, sy);
    if (world.gust(wx, wy, dx * 2, dy * 2, 40) && Math.random() < 0.25) particles.stars(wx, wy, 1, 3, 20);
    world.plant(wx, wy, true);
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
  if (!ready || reader.isOpen || !sheet.hidden) return;
  const [sx, sy] = stage.toStage(e.clientX, e.clientY);
  if (e.pointerType !== 'touch') trackAt(sx, sy);
  const onBible = bible.hit(sx, sy);
  bible.setHover(onBible);
  const [wx, wy] = world.toWorld(sx, sy);
  canvas.style.cursor = onBible ? 'grab' : kujo.hit(wx, wy) ? 'pointer' : 'default';
});
canvas.addEventListener('pointerleave', () => { if (!claimed) resetGaze(); });
window.addEventListener('blur', resetGaze);
document.addEventListener('visibilitychange', () => { if (document.hidden) { resetGaze(); kujo.setHold(false); } });
$('scrollbtn').onclick = () => world.goTo(world.progress > 0.5 ? 'top' : 'bottom');

// ---- main loop ---------------------------------------------------------------------------------------------------
let last = performance.now();
let arrow = '▼';
function frame(now) {
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
  last = now;
  if (document.hidden) { requestAnimationFrame(frame); return; }
  beat.update(dt);
  player.update();
  world.reducedMotion = reduce;
  world.update(dt);
  kujo.update(dt);
  if (reduce) { kujo.nod.snap(); kujo.sway.snap(); kujo.bounce.snap(); }
  particles.update(dt);
  stage.ctx.imageSmoothingEnabled = false;
  world.draw(stage.ctx);
  overlay.draw(kujo.sprite, kujo, dt, { reducedMotion: reduce });
  bible.update(dt);
  toyCtx.clearRect(0, 0, stage.w, stage.h);
  bible.draw(toyCtx);
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
  setTimeout(() => { if (!reduce) { bible.spawn(); synth.pop(); } }, 900);
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
