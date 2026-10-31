// The HaiCuu Experience - Kujo-sama page. Wires the Lok Pixel Library (vendored in ../lib) to the DOM:
// intro (LLAMASTE -> petals -> title -> camera glides down to Kujo), interaction, music and the HUD.
import {
  createStage, SakuraWorld, Kujo, Particles, BeatEngine, makeKit, Synth, MusicPlayer, BibleBounce, pixelQTracks, PIXELQ, THEMES,
  attachPointer, revealWords, sleep, VARIANTS, VARIANT_ORDER, SpriteLook, SpriteOverlay,
} from '../lib/index.js';
import { HAIKUS } from './haikus.js';
import { BibleReader } from './reader.js';

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
world.calm = reduce; // reduced motion: no beat-driven petal bursts
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
const soundFor = { plant: () => synth.pop(), catch: () => synth.sparkle(), chirp: () => synth.chirp(), cardinal: () => synth.chirp(), wish: () => synth.chime(), firefly: () => synth.boop(), shake: () => synth.boop(), pluck: () => { synth.sparkle(); buzz(5); }, pet: () => synth.boop(), pull: () => synth.tick(300) };

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

// ---- music: the Lok Services pull-up drawer -----------------------------------------------------------------------
// Three soundtracks, one drawer. REALITY = Cuu Jo's Mixverse (his real tracks from tracks.json, the main soundtrack),
// PIXEL = the built-in Pixel Q Music, LOK = the shared Lok library (ungated tracks from Lok Services' catalog).
// The player only ever holds the list for the active side.
const MODES = {
  reality: { name: "Cuu Jo's Mixverse", note: 'THE MAIN SOUNDTRACK', theme: 'night' },
  pixel: { name: PIXELQ.name, note: 'LLAMASTÉ PRODUCTIONS', theme: 'day' },
  lok: { name: 'Lok Library', note: 'FROM LOK SERVICES', theme: 'dusk' },
};
const MODE_BTN = { reality: 'sreal', pixel: 'spix', lok: 'slok' };
const CATALOG_URL = 'https://gsix.online/lok-music-catalog.json';
let mode = 'pixel';
let mp3 = [];
let lok = [];
const lastIdx = { reality: 0, pixel: 0, lok: 0 };
const fmtTitle = (t) => (t || '').toUpperCase().replaceAll('LLAMASTÉ', 'Llamasté');
const tracksFor = (m) => (m === 'pixel' ? pixelQTracks() : m === 'reality' ? mp3 : lok);

const player = new MusicPlayer(synth, beat, {
  tracks: pixelQTracks(),
  onTrack: (tr) => {
    $('track').textContent = tr ? '♪ ' + fmtTitle(tr.title) : '';
    syncPlayer();
    if (tr && tr.variant && VARIANTS[tr.variant]) switchLook(1, tr.variant);
    else if (tr && player.tracks.length > 1) switchLook(1);
    if (tr && tr.theme && THEMES[tr.theme]) world.setTheme(tr.theme);
    markPlaying();
  },
});

// Pixel-art transport icons (8x8 grids, crisp edges), so the controls never fall back to generic system glyphs.
const ICONS = {
  play: ['1', '11', '111', '1111', '1111', '111', '11', '1'],
  pause: ['11 11', '11 11', '11 11', '11 11', '11 11', '11 11', '11 11', '11 11'],
  next: ['1      1', '11     1', '111    1', '1111   1', '1111   1', '111    1', '11     1', '1      1'],
  prev: ['1      1', '1     11', '1    111', '1   1111', '1   1111', '1    111', '1     11', '1      1'],
  down: ['        ', '11    11', ' 11  11 ', '  1111  ', '   11   ', '        ', '        ', '        '],
};
function ico(name) {
  const rows = ICONS[name];
  const w = Math.max(...rows.map((r) => r.length));
  let d = '';
  rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] === '1') d += `<rect x="${x}" y="${y}" width="1" height="1"/>`; });
  return `<svg viewBox="0 0 ${w} 8" aria-hidden="true">${d}</svg>`;
}
$('tprev').innerHTML = ico('prev');
$('tnext').innerHTML = ico('next');
$('tx').innerHTML = ico('down');

function syncPlayer() {
  const tr = player.current;
  const on = player.playing;
  $('play').setAttribute('aria-pressed', String(on));
  $('play').innerHTML = ico(on ? 'pause' : 'play') + '<span>' + (on ? 'PAUSE' : 'PLAY') + '</span>';
  $('songs').classList.toggle('live', on);
  $('npt').textContent = tr && player.index >= 0 ? fmtTitle(tr.title) : 'PICK A SONG';
  $('npa').textContent = tr && player.index >= 0 ? (tr.artist || MODES[mode].name) : MODES[mode].name;
}
function syncModeUI() {
  Object.entries(MODE_BTN).forEach(([m, id]) => $(id).setAttribute('aria-pressed', String(m === mode)));
  $('tsub').textContent = MODES[mode].name + ' · ' + MODES[mode].note;
  $('mixlink').hidden = !(mode === 'reality' && mp3.length);
  if (mode === 'lok' && !flight) { $('conntxt').textContent = 'CONNECTED · LOK SERVICES'; $('conn').className = 'conn done'; $('conn').hidden = false; }
  else if (!flight) $('conn').hidden = true;
  syncPlayer();
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
function setMode(m, { silent = false, fx = true } = {}) {
  if (m === mode && !silent) return;
  const list = tracksFor(m);
  if (!list.length && !silent) return;
  const wasPlaying = player.playing;
  if (player.index >= 0) lastIdx[mode] = player.index;
  mode = m;
  player.pause();
  player.tracks = list;
  player.index = -1;
  buildList();
  syncModeUI();
  if (silent) return;
  if (fx) modeFx();
  if (wasPlaying) player.play(lastIdx[m] || 0);
}
Object.entries(MODE_BTN).forEach(([m, id]) => { $(id).onclick = () => { synth.ensure(); setMode(m); }; });

fetch('tracks.json', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : [])).then((t) => {
  mp3 = Array.isArray(t) ? t.filter((x) => x && x.src && x.title) : [];
  if (mp3.length) { $('sreal').hidden = false; setMode('reality', { silent: true }); }
}).catch(() => {});

// The shared Lok library. Only ungated https tracks hosted on gsix.online; Cuu Jo's own release is skipped (it is REALITY).
fetch(CATALOG_URL, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((c) => {
  if (!c || c.schema !== 'lok.catalog/v1' || !Array.isArray(c.playlists)) return;
  const out = [];
  for (const rel of c.playlists) {
    if (!rel || !Array.isArray(rel.tracks) || (rel.source && rel.source.app === 'haicuu')) continue;
    for (const t of rel.tracks) {
      let ok = false;
      try { const u = new URL(t.url); ok = u.protocol === 'https:' && (u.hostname === 'gsix.online' || u.hostname.endsWith('.gsix.online')); } catch (_) { /* bad url */ }
      if (!ok || !t.title || (t.gate && t.gate.objectives > 0)) continue;
      out.push({ id: rel.id + ':' + t.id, title: String(t.title), artist: t.artist || rel.artist || '', src: t.url, group: String(rel.title || '') + (rel.source && rel.source.name ? ' · ' + rel.source.name : '') });
    }
  }
  lok = out;
  syncLok();
}).catch(() => {});

// ---- Lok Services cartridge (adapted from the Lok Expansion Pack in DJ Shoey's Arcade) --------------------------
// The card in the drawer flies into the Lok slot, clicks in, and the Lok library loads in with a burst.
const LOK_KEY = 'hx.lok';
let lokInstalled = false;
try { lokInstalled = localStorage.getItem(LOK_KEY) === '1'; } catch (_) { /* storage blocked */ }
const saveLok = () => { try { localStorage.setItem(LOK_KEY, lokInstalled ? '1' : '0'); } catch (_) { /* storage blocked */ } };
let flight = null;
const timers = [];
const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };
const TL = { lift: 230, fall: 390, squash: 190, absorb: 210 };
const IMPACT_AT = TL.lift + TL.fall;
const TOTAL = IMPACT_AT + TL.squash + TL.absorb;
const XP_COLORS = ['#ffe566', '#ff2ea6', '#5eead4', '#b58cff', '#fff4fa'];

function burst(x, y, n, big) {
  const box = document.createElement('div');
  box.className = 'xp-burst';
  box.style.left = x + 'px';
  box.style.top = y + 'px';
  const ring = document.createElement('i');
  ring.className = 'xp-ring' + (big ? ' big' : '');
  box.appendChild(ring);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
    const d = (big ? 70 : 38) + Math.random() * (big ? 120 : 62);
    const el = document.createElement('span');
    const bit = i % 5 === 4;
    el.className = 'xp-p' + (bit ? ' bit' : '');
    if (bit) el.textContent = i & 1 ? '1' : '0';
    el.style.setProperty('--dx', Math.cos(a) * d + 'px');
    el.style.setProperty('--dy', Math.sin(a) * d - (big ? 26 : 12) + 'px');
    el.style.setProperty('--r', (Math.random() - 0.5) * 540 + 'deg');
    el.style.setProperty('--c', XP_COLORS[i % XP_COLORS.length]);
    el.style.setProperty('--sz', (big ? 8 : 6) + Math.floor(Math.random() * (big ? 8 : 5)) * 2 + 'px');
    el.style.animationDelay = Math.random() * 0.09 + 's';
    box.appendChild(el);
  }
  $('xpfx').appendChild(box);
  later(() => box.remove(), 1500);
}
function popText(cls, text, x, y) {
  const el = document.createElement('span');
  el.className = cls;
  el.textContent = text;
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  $('xpfx').appendChild(el);
  later(() => el.remove(), 1600);
}
function syncLok() {
  const have = lok.length > 0;
  const on = have && lokInstalled;
  $('slok').hidden = !on;
  $('cartseat').hidden = !on;
  $('slot').classList.toggle('full', on);
  $('eject').hidden = !on;
  $('cardwrap').hidden = !have;
  $('cardwrap').classList.toggle('collapse', on);
  $('lokcard').classList.remove('launched');
  $('lokcount').textContent = '+' + lok.length + ' TRACKS · TAP TO INSERT';
  $('seatn').textContent = '+' + lok.length;
}
function insertLok() {
  if (lokInstalled || flight || !lok.length) return;
  const card = $('lokcard');
  const slot = $('slot');
  if (reduce || typeof card.animate !== 'function') {
    lokInstalled = true; saveLok(); syncLok(); synth.ensure(); synth.chime();
    setMode('lok', { fx: false });
    return;
  }
  synth.ensure();
  const from = card.getBoundingClientRect();
  const to = slot.getBoundingClientRect();
  const fx0 = from.left + from.width / 2, fy0 = from.top + from.height / 2;
  const tx = to.left + to.width / 2, ty = to.top + to.height / 2;
  const sx = (to.width * 0.8) / from.width, sy = (to.height * 0.78) / from.height;
  const dx = tx - fx0, dy = ty - fy0;
  const fly = card.cloneNode(true);
  fly.removeAttribute('id');
  fly.className = 'xcard xp-flyer';
  fly.style.cssText = `left:${from.left}px;top:${from.top}px;width:${from.width}px;height:${from.height}px;animation:none`;
  $('xpfx').appendChild(fly);
  card.classList.add('launched');
  flight = fly;
  $('conn').hidden = false; $('conntxt').textContent = 'CONNECTING TO LOK SERVICES';
  $('conn').className = 'conn run';
  burst(fx0, fy0, 16, false);
  synth.tone(660, { dur: 0.09, type: 'square', vol: 0.1, slide: 240 });
  buzz(8);
  const o = (ms) => ms / TOTAL;
  fly.animate([
    { transform: 'translate(0,0) scale(1) rotate(0deg)', offset: 0, easing: 'ease-out' },
    { transform: 'translate(0,5px) scale(1.07,.88) rotate(0deg)', offset: o(70), easing: 'cubic-bezier(.2,.9,.3,1)' },
    { transform: 'translate(0,-34px) scale(1.14,1.12) rotate(-9deg)', offset: o(TL.lift), easing: 'cubic-bezier(.45,0,.8,.4)' },
    { transform: `translate(${dx * 0.55}px,${dy * 0.3 - 22}px) scale(${1 + (sx - 1) * 0.5},${1 + (sy - 1) * 0.5}) rotate(7deg)`, offset: o(TL.lift + TL.fall * 0.55), easing: 'cubic-bezier(.5,0,.9,.5)' },
    { transform: `translate(${dx}px,${dy}px) scale(${sx},${sy}) rotate(-2deg)`, offset: o(IMPACT_AT), opacity: 1, easing: 'ease-out' },
    { transform: `translate(${dx}px,${dy + 4}px) scale(${sx * 1.12},${sy * 0.8})`, offset: o(IMPACT_AT + 70), opacity: 0 },
    { transform: `translate(${dx}px,${dy + 4}px) scale(${sx},${sy})`, offset: 1, opacity: 0 },
  ], { duration: TOTAL, fill: 'forwards' });
  later(() => {
    // landing: the cabinet reacts, the cartridge seats, the library loads in
    lokInstalled = true; saveLok();
    flight = null;
    syncLok();
    $('cartseat').className = 'cartseat seat-in';
    $('slot').classList.remove('hot'); void $('slot').offsetWidth; $('slot').classList.add('hot');
    burst(tx, ty, 40, true);
    later(() => burst(tx, ty, 14, false), 140);
    popText('xp-plus', '+' + lok.length + ' TRACKS!', tx, to.top - 10);
    popText('xp-click', 'CLICK!', to.left - 18, ty - 20);
    const fl = document.createElement('i'); fl.className = 'xp-flash'; $('xpfx').appendChild(fl); later(() => fl.remove(), 500);
    synth.tone(110, { dur: 0.2, type: 'sine', vol: 0.3, slide: -40 }); synth.noise({ t: 0.03, dur: 0.12, vol: 0.06, hp: 1500 });
    later(() => synth.tone(1100, { dur: 0.05, type: 'square', vol: 0.07 }), 70);
    later(() => synth.chime(), 170);
    buzz([20, 30, 12]);
    canvas.classList.remove('shake'); void canvas.offsetWidth; canvas.classList.add('shake'); later(() => canvas.classList.remove('shake'), 540);
    $('sheet').classList.remove('bump'); void $('sheet').offsetWidth; $('sheet').classList.add('bump'); later(() => $('sheet').classList.remove('bump'), 500);
    kujo.poke(); synth.poke();
    particles.stars(kujo.x, kujo.y - 24, 10, 6, 50);
    later(() => { setMode('lok', { fx: false }); world.setTheme(MODES.lok.theme); }, 280);
  }, IMPACT_AT);
  later(() => fly.remove(), TOTAL + 60);
}
function ejectLok() {
  if (!lokInstalled || flight) return;
  lokInstalled = false; saveLok();
  synth.ensure();
  synth.whoosh();
  buzz([10, 20]);
  $('cartseat').className = 'cartseat eject';
  const wasLok = mode === 'lok';
  if (wasLok) setMode(mp3.length ? 'reality' : 'pixel', { fx: false });
  later(() => {
    syncLok();
    $('cartseat').className = 'cartseat';
    $('cardwrap').classList.remove('collapse');
    $('lokcard').classList.add('back');
    later(() => $('lokcard').classList.remove('back'), 700);
  }, 480);
}
$('lokcard').onclick = insertLok;
let ejectArm = null;
$('eject').onclick = () => {
  if (ejectArm) { clearTimeout(ejectArm); ejectArm = null; $('eject').classList.remove('sure'); $('eject').textContent = 'EJECT LOK SERVICES'; ejectLok(); return; }
  $('eject').classList.add('sure'); $('eject').textContent = 'TAP TO CONFIRM';
  ejectArm = setTimeout(() => { ejectArm = null; $('eject').classList.remove('sure'); $('eject').textContent = 'EJECT LOK SERVICES'; }, 3500);
};

// ---- drawer ------------------------------------------------------------------------------------------------------
const sheet = $('tracks');
const tab = $('songs');
let drawerOpen = false;
let tickTimer = null;
function buildList() {
  const list = $('tlist');
  list.innerHTML = '';
  let group = null;
  player.tracks.forEach((tr, i) => {
    const g = tr.group || (tr.song ? PIXELQ.name + ' · Llamasté Productions' : MODES.reality.name + ' · the main soundtrack');
    if (g !== group) {
      group = g;
      const h = document.createElement('div');
      h.className = 'grp';
      h.textContent = fmtTitle(g);
      list.appendChild(h);
    }
    const b = document.createElement('button');
    b.className = 'trk in';
    b.style.setProperty('--i', Math.min(i, 14));
    b.dataset.i = i;
    const look = tr.variant && VARIANTS[tr.variant] ? lookName(VARIANTS[tr.variant]) : '';
    b.innerHTML = '<span class="n">' + (i + 1) + '</span><span class="nm"></span><span class="eq"><i></i><i></i><i></i></span>';
    b.querySelector('.nm').textContent = fmtTitle(tr.title);
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
  syncPlayer();
}
function tick() {
  const a = player.audio;
  $('barfill').style.width = a && a.duration ? Math.min(100, (a.currentTime / a.duration) * 100) + '%' : '0%';
}
function openSheet() {
  if (drawerOpen) return;
  drawerOpen = true;
  synth.ensure();
  sheet.hidden = false;
  void sheet.offsetWidth;
  sheet.classList.add('open');
  tab.classList.add('gone');
  tab.setAttribute('aria-expanded', 'true');
  synth.pop();
  buzz(6);
  if (!reduce && ready) particles.stars(kujo.x, kujo.y - 24, 6, 5, 40);
  clearInterval(tickTimer);
  tickTimer = setInterval(tick, 250);
  tick();
}
function closeSheet() {
  if (!drawerOpen) return;
  drawerOpen = false;
  sheet.classList.remove('open');
  tab.classList.remove('gone');
  tab.setAttribute('aria-expanded', 'false');
  clearInterval(tickTimer);
  synth.pop();
  setTimeout(() => { if (!sheet.classList.contains('open')) sheet.hidden = true; }, 520);
  tab.focus({ preventScroll: true });
}
// pull the tab up to open, pull the panel's grip down to close; a plain tap also toggles
function pullable(el, { up }) {
  let y0 = null, done = false;
  el.addEventListener('pointerdown', (e) => { y0 = e.clientY; done = false; if (e.target.closest && e.target.closest('button') && el !== tab) return; try { el.setPointerCapture(e.pointerId); } catch (_) { /* ok */ } });
  el.addEventListener('pointermove', (e) => {
    if (y0 == null || done) return;
    const dy = e.clientY - y0;
    if (up ? dy < -22 : dy > 30) { done = true; up ? openSheet() : closeSheet(); }
  });
  el.addEventListener('pointerup', (e) => {
    const tap = y0 != null && !done && Math.abs(e.clientY - y0) < 8;
    y0 = null;
    if (tap && el === tab) openSheet();
  });
}
pullable(tab, { up: true });
tab.addEventListener('click', (e) => { if (e.detail === 0) openSheet(); }); // keyboard activation
pullable($('grab'), { up: false });
pullable(sheet.querySelector('header'), { up: false });
window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && drawerOpen) closeSheet(); });
buildList();
syncModeUI();

function togglePlay() {
  synth.ensure();
  const on = player.toggle();
  if (!on) $('track').textContent = '';
  markPlaying();
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
  enabled: () => !reader.isOpen,
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
    world.pull(wx, wy);
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
$('tx').onclick = closeSheet;
$('tprev').onclick = () => { synth.ensure(); player.prev(); };
$('tnext').onclick = () => { synth.ensure(); player.next(); };
$('bibtn').onclick = () => { synth.ensure(); reader.open(); };
// hover feedback: pointer cursor over anything touchable
canvas.addEventListener('pointermove', (e) => {
  if (!ready || reader.isOpen) return;
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
  world.calm = reduce;
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
  tab.classList.add('on');
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
