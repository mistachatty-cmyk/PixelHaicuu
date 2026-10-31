// SakuraWorld - the HaiCuu poster world: sky, smiling sun, clouds, the big sakura tree, the title lettering,
// a meadow with the smiley flower and the peeking alpaca, and a camera that scrolls from the sky down to Kujo.
// Everything is in "stage pixels" (see core/stage.js). The world is a fixed 140px taller than the stage.
import { Spring } from '../core/spring.js';
import { clamp, rand, pick, TAU, mulberry32 } from '../core/math.js';
import { makeCanvas, ditherPick } from '../core/gfx.js';
import { THEMES } from '../assets/palettes.js';
import { makeSakura } from '../assets/tree.js';
import { makeTitle } from '../assets/title.js';
import { makeSunFace, makeCloudPuff, makeSmileyHead, makeAlpaca, makeSign } from '../assets/props.js';
import { makeCardinal } from '../assets/critters.js';
import { hash2 } from '../core/painter.js';

const EXTRA = 140; // world height beyond one screen = how far the camera can scroll
const GROUND_H = 72; // tall enough that Kujo sits above the page's HUD buttons

export class SakuraWorld {
  constructor({ stage, kit, particles, theme = 'day', seed = 21 }) {
    this.stage = stage;
    this.kit = kit;
    this.particles = particles;
    this.seed = seed;
    this.t = 0;
    this.cam = new Spring(46, 10);
    this.canopySway = new Spring(60, 4);
    this.sunPulse = new Spring(200, 11);
    this.flower = new Spring(120, 6);
    this.alpaca = new Spring(110, 7);
    this.flash = 0;
    this.titleShown = false;
    this.signShown = false;
    this.petals = [];
    this.vortex = [];
    this.vortexT = 0;
    this.extraFlowers = [];
    this.themeName = theme;
    this.kujo = null;
    this.rayT = 0;
    this.onEvent = null; // (name, info) => void: the page hooks sound and haptics here
    this.cardinalSpr = makeCardinal();
    this.cardinal = null;
    this.birdT = 9;
    this.shoot = null;
    this.shootT = 6;
    this.flies = [];
    this.caught = 0;
    this.pulledPetal = null;
    this.petCooldown = 0;
    this.alpacaLove = 0;
    this.reducedMotion = false;
    stage.onResize.push(() => this.layout());
    this.layout();
  }

  get theme() { return THEMES[this.themeName]; }
  get worldH() { return this.stage.h + EXTRA; }
  get maxCam() { return EXTRA; }
  get groundHeight() { return this.bottomReserve || GROUND_H; }
  get groundY() { return this.worldH - this.groundHeight; }
  get progress() { return clamp(this.cam.x / EXTRA, 0, 1); }

  setBottomReserve(height) {
    const next = Math.max(GROUND_H, Math.ceil(height));
    if (next === this.groundHeight) return;
    this.bottomReserve = next;
    this.layout();
  }

  /** Where Kujo should sit (seat point = centre of his legs, on the grass). */
  kujoSpot() { return { x: Math.round(this.stage.w * 0.5), y: this.groundY + 26 }; }

  setTheme(name) {
    if (!THEMES[name] || name === this.themeName) return;
    this.themeName = name;
    this.layout();
  }

  // ------------------------------------------------------------------ build
  layout() {
    const { w } = this.stage;
    const WH = this.worldH;
    const th = this.theme;
    if (Number.isFinite(this.previousGroundY)) for (const f of this.extraFlowers) f.y += this.groundY - this.previousGroundY;
    this.previousGroundY = this.groundY;
    const r = mulberry32(this.seed);
    this.W = w;
    this.WH = WH;
    // sky: dark at the top, bright at the horizon, ordered-dithered
    this.sky = makeCanvas(w, WH);
    const sc = this.sky.getContext('2d');
    for (let y = 0; y < WH; y++) {
      const v = 0.04 + 0.96 * Math.pow(y / (WH - this.groundHeight), 0.85);
      for (let x = 0; x < w; x++) {
        sc.fillStyle = ditherPick(th.sky, v, x, y);
        sc.fillRect(x, y, 1, 1);
      }
    }
    // stars (dusk/night)
    this.stars = [];
    const n = Math.round(w * WH * 0.004 * th.stars * 4);
    for (let i = 0; i < n; i++) this.stars.push({ x: Math.floor(r() * w), y: Math.floor(r() * (WH * 0.55)), ph: r() * 6, big: r() < 0.15 });
    // far hills
    this.hills = makeCanvas(w, 40);
    const hc = this.hills.getContext('2d');
    for (let x = 0; x < w; x++) {
      const h1 = 14 + Math.sin(x * 0.035 + 1) * 6 + Math.sin(x * 0.011) * 5;
      const h2 = 8 + Math.sin(x * 0.05 + 3) * 4 + Math.sin(x * 0.02 + 2) * 3;
      for (let y = 0; y < 40; y++) {
        const fromBottom = 40 - y;
        if (fromBottom < h1) { hc.fillStyle = ditherPick(th.farHill, 0.2 + (fromBottom / h1) * 0.9 - (y > 34 ? 0.5 : 0), x, y); hc.fillRect(x, y, 1, 1); }
        if (fromBottom < h2) { hc.fillStyle = ditherPick(th.farHill, 0.0 + (fromBottom / h2) * 0.45, x + 1, y); hc.fillRect(x, y, 1, 1); }
      }
    }
    // sun
    this.sun = makeSunFace(th, 15);
    // clouds
    this.clouds = [];
    const defs = [[112, 40, 70], [84, 32, 150], [136, 46, 215], [72, 28, 108], [100, 36, 262], [64, 24, 186]];
    defs.forEach(([cw, ch, y], i) => {
      this.clouds.push({ spr: makeCloudPuff(th, cw, ch, 3 + i * 5), x: r() * (w + 60) - 30, y, sp: 1.6 + r() * 2.4, par: 0.9 + r() * 0.1, bob: r() * 6, hit: 0 });
    });
    // tree
    const tw = Math.min(w, 190);
    this.treeX = Math.round((w - tw) * 0.42);
    this.tree = makeSakura({ w: tw, M: this.groundY, theme: th, seed: 5 });
    // title
    this.title = makeTitle(w, { top: 8 });
    this.title.letters.forEach((l, i) => {
      const old = this.titleState && this.titleState[i];
      l.s = new Spring(150, 9);
      l.s.snap(old && this.titleShown ? 0 : -140);
      l.at = old ? old.at : null;
      l.on = !!(old && old.on);
    });
    this.titleState = this.title.letters;
    // ground: dithered grass strip + soil
    this.ground = makeCanvas(w, this.groundHeight);
    const gc = this.ground.getContext('2d');
    const g = th.ground;
    for (let y = 0; y < this.groundHeight; y++) {
      for (let x = 0; x < w; x++) {
        let col;
        if (y < 3) col = y === 0 ? g.top : g.g1;
        else if (y < 22) col = ditherPick([g.g2, g.g1, g.blades[0]], 0.55 - (y - 3) / 40 + (hash2(x >> 2, y >> 1) - 0.5) * 0.3, x, y);
        else col = ditherPick(g.soil, 0.7 - (y - 22) / 28, x, y);
        gc.fillStyle = col;
        gc.fillRect(x, y, 1, 1);
      }
    }
    // grass blades along the top edge
    for (let x = 0; x < w; x++) {
      const k = hash2(x, 3);
      if (k > 0.5) { gc.fillStyle = g.blades[Math.floor(hash2(x, 5) * 3)]; gc.fillRect(x, 1, 1, 1 + Math.floor(hash2(x, 9) * 3)); }
    }
    // scattered mini flowers on the grass
    this.flowers = [];
    const fn = Math.round(w / 14);
    for (let i = 0; i < fn; i++) {
      this.flowers.push({ x: Math.round(r() * w), y: this.groundY + 4 + Math.round(r() * 26), spr: pick2(r, this.kit.miniFlowers), ph: r() * 6, k: 0 });
    }
    this.flowers.sort((a, b) => a.y - b.y);
    // props
    this.smiley = makeSmileyHead(th);
    this.alpacaSpr = makeAlpaca();
    this.sign = makeSign(['COMING', 'SOON']);
    this.layoutBase();
    this.flies = [];
    for (let i = 0; i < 16; i++) this.flies.push({ x: r() * w, y: this.groundY - 6 + r() * 40, ph: r() * 6, sp: 0.4 + r() * 0.8, k: 0 });
    if (this.kujo) { const s = this.kujoSpot(); this.kujo.x = s.x; this.kujo.y = s.y; }
    this.cam.t = clamp(this.cam.t, 0, this.maxCam);
    this.cam.x = clamp(this.cam.x, 0, this.maxCam);
  }

  attachKujo(k) {
    this.kujo = k;
    const s = this.kujoSpot();
    k.x = s.x;
    k.y = s.y;
  }

  /** Grounds the tree: finds where the trunk meets the grass and builds shadow, roots and a drift of fallen petals. */
  layoutBase() {
    const t = this.tree, th = this.theme;
    const bx = Math.round(t.base.x);
    this.base = { x: this.treeX + bx, y: this.groundY };
    const cv = makeCanvas(60, 16);
    const c = cv.getContext('2d');
    // soft dithered shadow on the grass
    c.fillStyle = th.ground.g2;
    for (let y = 0; y < 6; y++) {
      const half = Math.round(24 * Math.sqrt(1 - ((y - 2.5) / 3.2) ** 2 || 0));
      for (let x = 30 - half; x <= 30 + half; x++) if ((x + y) % 2 === 0 || y > 1 && y < 5) c.fillRect(x, 6 + y, 1, 1);
    }
    // root flare
    c.fillStyle = th.bark[1];
    [[-9, 0, 5, 2], [4, 0, 5, 2], [-6, -2, 3, 2], [3, -2, 3, 2]].forEach(([dx, dy, w2, h2]) => c.fillRect(30 + dx, 5 + dy, w2, h2));
    c.fillStyle = th.bark[2];
    c.fillRect(24, 5, 12, 2);
    // fallen petals
    const pr = mulberry32(this.seed + 3);
    for (let i = 0; i < 14; i++) { c.fillStyle = th.petals[Math.floor(pr() * th.petals.length)]; c.fillRect(30 + Math.round((pr() - 0.5) * 44), 8 + Math.round(pr() * 5), 1 + (pr() < 0.4 ? 1 : 0), 1); }
    this.baseDeco = cv;
  }

  emit(name, info) { if (this.onEvent) this.onEvent(name, info); }

  canopyAt(wx, wy) {
    const t = this.tree, x = Math.floor(wx - this.treeX), y = Math.floor(wy - t.canopyY);
    return x >= 0 && y >= 0 && x < t.maskW && y < t.maskH && !!t.mask[y * t.maskW + x];
  }

  beginPetalPull(wx, wy) {
    if (!this.canopyAt(wx, wy)) return false;
    this.pulledPetal = { originX: wx, originY: wy, x: wx, y: wy, detached: false, spr: pick(this.kit.petals) };
    return true;
  }

  movePetalPull(wx, wy) {
    const p = this.pulledPetal;
    if (!p) return;
    p.x = wx; p.y = wy;
    if (!p.detached && Math.hypot(wx - p.originX, wy - p.originY) > 7) {
      p.detached = true;
      if (!this.reducedMotion) this.canopySway.kick((wx - p.originX) * 1.5);
      this.emit('pluck');
    }
  }

  releasePetalPull(vx = 0, vy = 0, cancelled = false) {
    const p = this.pulledPetal; this.pulledPetal = null;
    if (!p || cancelled) return;
    if (!p.detached) { this.tap(p.originX, p.originY); return; }
    this.petals.push({ x: p.x, y: p.y, vx: clamp(vx, -55, 55), vy: clamp(vy, -30, 45), ph: rand(0, TAU), sp: 1.8, spr: p.spr, life: 8 });
    this.particles.stars(p.x, p.y, 3, 4, 18);
  }

  alpacaAt(wx, wy) { return wx > this.W - 40 && wx < this.W && wy > this.groundY - 43 && wy < this.groundY + 4; }

  petAlpaca(wx, wy) {
    if (!this.alpacaAt(wx, wy)) return false;
    this.alpacaLove = 1.2;
    if (this.petCooldown <= 0) {
      this.petCooldown = .25;
      if (!this.reducedMotion) this.alpaca.kick(-35);
      this.particles.hearts(this.W - 21, this.groundY - 38, 1, 4);
      this.emit('pet');
    }
    return true;
  }

  /** Plant a flower where the pointer touched the grass. quiet = used while dragging (no spark every time). */
  plant(wx, wy, quiet = false) {
    if (wy < this.groundY + 2) return false;
    const gy = Math.min(wy, this.groundY + 38);
    for (const f of this.extraFlowers) if (Math.hypot(f.x - wx, f.y - gy) < (quiet ? 9 : 5)) return false;
    if (this.extraFlowers.length >= 60) this.extraFlowers.shift();
    this.extraFlowers.push({ x: wx, y: gy, spr: pick(this.kit.miniFlowers), ph: rand(0, 6), k: 0 });
    this.particles.stars(wx, gy - 6, quiet ? 1 : 4, 5, 26);
    if (!quiet) { this.particles.hearts(wx, gy - 10, 1, 4); this.emit('plant', { x: wx, y: gy }); }
    return true;
  }

  spawnCardinal() {
    const dir = Math.random() < 0.5 ? 1 : -1;
    const camTop = Math.round(this.cam.x);
    this.cardinal = {
      dir, x: dir > 0 ? -14 : this.W + 14, base: this.groundY - rand(60, 110) , y: 0, vx: 34 * dir, t: 0, loop: 0, perch: 0,
    };
    this.cardinal.y = this.cardinal.base;
    this.emit('cardinal');
    return camTop;
  }

  spawnShootingStar() {
    const camTop = Math.round(this.cam.x);
    const dir = Math.random() < 0.5 ? 1 : -1;
    this.shoot = { x: dir > 0 ? rand(0, this.W * 0.4) : rand(this.W * 0.6, this.W), y: camTop + rand(6, 60), vx: 90 * dir, vy: 38, life: 1.3, t: 0 };
  }

  // ------------------------------------------------------------------ control
  scrollBy(dy) { this.cam.t = clamp(this.cam.t + dy, 0, this.maxCam); }
  goTo(where) { this.cam.t = where === 'top' ? 0 : this.maxCam; }
  toWorld(sx, sy) { return [sx, sy + Math.round(this.cam.x)]; }

  revealTitle(stagger = 0.07) {
    this.titleShown = true;
    this.title.letters.forEach((l, i) => { l.at = this.t + i * stagger; l.on = false; l.s.snap(-150); });
  }

  /** Petals spiral into a point (used when the LLAMASTE greeting is "sucked into the world"). */
  inhale(dur = 0.9, x = null, y = null) {
    const c = this.tree.center;
    this.vortexT = dur;
    this.vortexTarget = { x: x ?? this.treeX + c.x, y: y ?? c.y + 20 };
    for (let i = 0; i < 46; i++) {
      this.vortex.push({ a: rand(0, TAU), r: rand(60, 150), sp: rand(1.8, 3.2), spr: pick(this.kit.petals), d: rand(0, 0.2) });
    }
  }

  bloom() {
    const c = this.tree.center;
    const cx = this.treeX + c.x;
    const cy = c.y + 10;
    this.flash = 1;
    this.canopySway.kick(26);
    this.sunPulse.kick(60);
    for (let i = 0; i < 70; i++) {
      const a = rand(0, TAU);
      const s = rand(30, 120);
      this.particles.add({ x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.7 - 20, g: 16, life: rand(1.4, 2.4), spr: pick(this.kit.petals), w: 14, drag: 1.2 });
    }
    this.particles.stars(cx, cy, 14, 30, 70);
  }

  showSign(on = true) { this.signShown = on; }

  // ------------------------------------------------------------------ interaction
  /** Tap at world coords. Returns what was hit (or null). The caller decides about Kujo. */
  tap(wx, wy) {
    const w = this.W;
    // a falling petal: catch it
    for (let i = this.petals.length - 1; i >= 0; i--) {
      const p = this.petals[i];
      if (Math.abs(p.x + 1 - wx) < 7 && Math.abs(p.y + 1 - wy) < 7) {
        this.petals.splice(i, 1);
        this.caught++;
        this.particles.stars(p.x, p.y, 4, 6, 34);
        this.particles.hearts(p.x, p.y - 4, 1, 4);
        this.emit('catch', { n: this.caught });
        return 'petal';
      }
    }
    // cardinal
    const cd = this.cardinal;
    if (cd && Math.abs(cd.x + 6 - wx) < 11 && Math.abs(cd.y + 4 - wy) < 10) {
      cd.loop = 1.1; cd.vx *= 1.8;
      this.particles.hearts(cd.x + 6, cd.y - 2, 3, 6);
      this.particles.stars(cd.x + 6, cd.y + 4, 5, 8, 40);
      this.alpaca.kick(-50);
      this.emit('chirp');
      return 'cardinal';
    }
    // shooting star: make a wish
    const ss = this.shoot;
    if (ss && Math.hypot(ss.x - wx, ss.y - wy) < 12) {
      this.particles.burst(ss.x, ss.y, 22, 60, ['#ffffff', '#ffe566', '#ffc4e2']);
      this.particles.hearts(ss.x, ss.y, 3, 8);
      if (this.kujo) { this.kujo.expr = 'happy'; this.kujo.exprT = 2; }
      this.shoot = null;
      this.emit('wish');
      return 'wish';
    }
    // firefly
    for (const f of this.flies) {
      if (f.k > 0.3 && Math.hypot(f.fx - wx, f.fy - wy) < 8) {
        f.k = -3; // caught: dark for a few seconds
        this.particles.stars(f.fx, f.fy, 4, 5, 26);
        this.emit('firefly');
        return 'firefly';
      }
    }
    // title letters
    for (const l of this.title.letters) {
      if (this.titleShown && wx >= l.x && wx <= l.x + l.spr.width && wy >= l.y - 2 && wy <= l.y + l.spr.height + 2) {
        l.s.kick(-110);
        this.particles.stars(l.x + l.spr.width / 2, l.y + l.spr.height / 2, 4, 6, 40);
        return 'title';
      }
    }
    // sun
    const { x: sx, y: sy } = this.sunPos();
    if (Math.hypot(wx - sx, wy - sy) < 20) {
      this.sunPulse.kick(120);
      this.rayT = 1.2;
      this.particles.stars(sx, sy, 8, 16, 55);
      return 'sun';
    }
    // alpaca
    const ax = w - 36;
    if (this.alpacaAt(wx, wy)) {
      this.alpacaLove = 1.5;
      this.alpaca.kick(-90);
      this.particles.hearts(ax + 14, this.groundY - 36, 4, 8);
      return 'alpaca';
    }
    // smiley flower
    if (wx < 44 && wy > this.groundY - 34 && wy < this.groundY + 6) {
      this.flower.kick(60);
      this.particles.hearts(22, this.groundY - 26, 3, 8);
      return 'flower';
    }
    // clouds
    for (const c of this.clouds) {
      const cx = this.cloudX(c);
      if (wx >= cx && wx <= cx + c.spr.width && wy >= c.y && wy <= c.y + c.spr.height) {
        c.hit = 1;
        this.particles.stars(wx, wy, 5, 10, 35);
        return 'cloud';
      }
    }
    // tree canopy
    const t = this.tree;
    const mx = Math.floor(wx - this.treeX);
    const my = Math.floor(wy - t.canopyY);
    if (mx >= 0 && my >= 0 && mx < t.maskW && my < t.maskH && t.mask[my * t.maskW + mx]) {
      this.canopySway.kick(rand(-14, 14));
      for (let i = 0; i < 9; i++) this.spawnPetal(wx + rand(-14, 14), wy + rand(-6, 10), true);
      this.emit('shake');
      return 'canopy';
    }
    // grass: grow a flower
    if (wy > this.groundY + 2) {
      this.plant(wx, wy);
      return 'ground';
    }
    return null;
  }

  /** Push nearby petals (world coords) sideways/up - used when the pointer swipes through the scene. */
  gust(wx, wy, dx, dy, radius = 46) {
    let n = 0;
    for (const p of this.petals) {
      const d = Math.hypot(p.x - wx, p.y - wy);
      if (d < radius) {
        const k = 1 - d / radius;
        p.vx = Math.max(-90, Math.min(90, p.vx + dx * 5 * k));
        p.vy = Math.max(-60, Math.min(60, p.vy + dy * 4 * k - 8 * k));
        n++;
      }
    }
    return n;
  }

  spawnPetal(x, y, burst = false) {
    this.petals.push({
      x, y, vx: burst ? rand(-14, 14) : rand(6, 16), vy: burst ? rand(-6, 10) : rand(9, 16),
      ph: rand(0, TAU), sp: rand(1.2, 2.4), spr: pick(this.kit.petals), life: burst ? rand(5, 8) : 99,
    });
  }

  onBeat({ accent }) {
    this.canopySway.kick(accent ? 6 : 2.5);
    this.sunPulse.kick(accent ? 38 : 16);
    if (accent && this.petals.length < 60) for (let i = 0; i < 3; i++) this.spawnPetal(this.treeX + this.tree.center.x + rand(-60, 60), this.tree.center.y + rand(0, 40), true);
  }

  /** On narrow (phone) stages the sun drops below the title so they never overlap. */
  sunPos() { return this.W < 200 ? { x: this.W - 22, y: 96 } : { x: this.W - 28, y: 32 }; }

  cloudX(c) { return ((c.x - this.t * c.sp) % (this.W + 120) + (this.W + 120)) % (this.W + 120) - 90; }

  // ------------------------------------------------------------------ update/draw
  update(dt) {
    this.petCooldown = Math.max(0, this.petCooldown - dt);
    this.alpacaLove = Math.max(0, this.alpacaLove - dt);
    if (this.reducedMotion) {
      this.cam.snap(this.cam.t);
      this.canopySway.snap(); this.sunPulse.snap(); this.flower.snap(); this.alpaca.snap();
      for (const f of this.extraFlowers) f.k = 1;
      return;
    }
    this.t += dt;
    this.cam.step(dt);
    this.canopySway.step(dt);
    this.sunPulse.step(dt);
    this.flower.step(dt);
    this.alpaca.step(dt);
    this.flash = Math.max(0, this.flash - dt * 2.4);
    this.rayT = Math.max(0, this.rayT - dt);
    for (const l of this.title.letters) {
      if (l.at !== null && !l.on && this.t >= l.at) {
        l.on = true;
        l.s.snap(-150);
        l.s.t = 0;
      }
      if (l.on) l.s.step(dt);
    }
    for (const c of this.clouds) if (c.hit > 0) c.hit = Math.max(0, c.hit - dt * 3);
    // cardinal fly-by (day and dusk, after the title is up)
    if (this.titleShown && this.themeName !== 'night') {
      this.birdT -= dt;
      if (!this.cardinal && this.birdT <= 0) { this.spawnCardinal(); this.birdT = rand(20, 38); }
    }
    const cd = this.cardinal;
    if (cd) {
      cd.t += dt;
      cd.x += cd.vx * dt;
      if (cd.loop > 0) { cd.loop -= dt; cd.y = cd.base - Math.sin((1.1 - cd.loop) * 6) * 16; }
      else cd.y = cd.base + Math.sin(cd.t * 2.4) * 6;
      if ((cd.dir > 0 && cd.x > this.W + 20) || (cd.dir < 0 && cd.x < -20)) this.cardinal = null;
    }
    // shooting star at night
    if (this.themeName === 'night' && this.titleShown) {
      this.shootT -= dt;
      if (!this.shoot && this.shootT <= 0) { this.spawnShootingStar(); this.shootT = rand(7, 14); }
    }
    const ss = this.shoot;
    if (ss) {
      ss.t += dt; ss.x += ss.vx * dt; ss.y += ss.vy * dt;
      if (ss.t > ss.life) this.shoot = null;
    }
    // fireflies (dusk and night)
    if (this.themeName !== 'day') {
      for (const f of this.flies) {
        f.ph += dt * f.sp;
        f.fx = f.x + Math.sin(f.ph * 1.3) * 10;
        f.fy = f.y + Math.cos(f.ph) * 6;
        f.k = f.k < 0 ? Math.min(1, f.k + dt) : 0.5 + 0.5 * Math.sin(f.ph * 3.1);
      }
    }
    for (const f of this.extraFlowers) f.k = Math.min(1, f.k + dt * 3);
    // ambient petals
    if (this.petals.length < 16 && Math.random() < dt * 3) {
      const c = this.tree.center;
      this.spawnPetal(this.treeX + c.x + rand(-80, 80), c.y + rand(10, 60));
    }
    for (let i = this.petals.length - 1; i >= 0; i--) {
      const p = this.petals[i];
      p.life -= dt;
      p.x += (p.vx + Math.sin(this.t * p.sp + p.ph) * 9) * dt;
      p.y += p.vy * dt;
      if (p.y > this.groundY + 28 || p.x > this.W + 10 || p.life <= 0) this.petals.splice(i, 1);
    }
    if (this.vortexT > 0) {
      this.vortexT -= dt;
      for (const v of this.vortex) {
        if (v.d > 0) { v.d -= dt; continue; }
        v.a += v.sp * dt * 4;
        v.r = Math.max(0, v.r - dt * (110 + (1 - Math.max(0, this.vortexT)) * 100));
      }
      if (this.vortexT <= 0) this.vortex.length = 0;
    }
  }

  draw(ctx) {
    const { w, h } = this.stage;
    const cy = Math.round(this.cam.x);
    const th = this.theme;
    const t = this.t;
    ctx.save();
    ctx.translate(0, -cy);
    ctx.drawImage(this.sky, 0, 0);
    // stars
    if (this.stars.length) {
      ctx.fillStyle = th.starColor;
      for (const s of this.stars) {
        const tw = Math.sin(t * 1.5 + s.ph);
        if (tw > -0.6) { ctx.fillRect(s.x, s.y, 1, 1); if (s.big && tw > 0.3) { ctx.fillRect(s.x - 1, s.y, 3, 1); ctx.fillRect(s.x, s.y - 1, 1, 3); } }
      }
    }
    // sun
    const { x: sx, y: sy } = this.sunPos();
    const sun = this.sun;
    const pulse = Math.round(this.sunPulse.x * 0.05);
    const frame = Math.abs(Math.floor(t * (this.rayT > 0 ? 9 : 2))) % 2;
    ctx.globalAlpha = 0.95;
    ctx.drawImage(sun.rays[frame], Math.round(sx - sun.rayR - 1), Math.round(sy - sun.rayR - 1 - pulse));
    ctx.globalAlpha = 1;
    ctx.drawImage(sun.disc, Math.round(sx - sun.size / 2), Math.round(sy - sun.size / 2 - pulse));
    // clouds (a little parallax against the camera)
    for (const c of this.clouds) {
      const y = Math.round(c.y + Math.sin(t * 0.5 + c.bob) * 1.5 + cy * (1 - c.par) - c.hit * 3);
      ctx.drawImage(c.spr, Math.round(this.cloudX(c)), y);
    }
    // far hills
    ctx.drawImage(this.hills, 0, this.groundY - 38);
    // tree
    const tr = this.tree;
    ctx.drawImage(tr.trunk, this.treeX, 0);
    const sway = Math.round(this.canopySway.x * 0.12 + Math.sin(t * 0.7) * 0.8);
    ctx.drawImage(tr.canopy, this.treeX + sway, tr.canopyY + Math.round(Math.sin(t * 0.9) * 0.6));
    // alpaca peeks from the right edge, smiley flower sits bottom-left; the ground is drawn over their bases
    const ax = this.W - 36;
    const aY = this.groundY - 40 + Math.round(this.alpaca.x * 0.1) + Math.round(Math.sin(t * 1.3) * 1.2);
    ctx.save();
    ctx.translate(ax + this.alpacaSpr.width / 2, aY + this.alpacaSpr.height);
    if (this.alpacaLove > 0 && !this.reducedMotion) ctx.rotate(Math.sin(t * 9) * .035);
    ctx.drawImage(this.alpacaSpr, -this.alpacaSpr.width / 2, -this.alpacaSpr.height);
    if (this.alpacaLove > 0) {
      ctx.fillStyle = '#ff7fbc';
      ctx.fillRect(-11, -23, 3, 2); ctx.fillRect(8, -23, 3, 2);
    }
    ctx.restore();
    const fl = Math.round(this.flower.x * 0.08);
    ctx.drawImage(this.smiley, 4, this.groundY - 31 - Math.abs(fl));
    ctx.drawImage(this.ground, 0, this.groundY);
    if (this.baseDeco && this.base) ctx.drawImage(this.baseDeco, this.base.x - 30, this.groundY - 5);
    // grass flowers
    const all = this.flowers.concat(this.extraFlowers);
    for (const f of all) {
      const sw = Math.round(Math.sin(t * 1.6 + f.ph) * 0.8);
      const k = f.k === undefined ? 1 : f.k;
      ctx.drawImage(f.spr, Math.round(f.x - 3 + sw), Math.round(f.y - 7 * (0.4 + 0.6 * k)), f.spr.width, Math.max(1, Math.round(f.spr.height * (0.4 + 0.6 * k))));
    }
    if (this.signShown) {
      const narrow = this.W < 200;
      ctx.drawImage(this.sign, Math.round(narrow ? this.W - 44 : this.W * 0.5 + 40), this.groundY - (narrow ? 8 : 20));
    }
    // shooting star: a short fading trail with a bright head
    if (this.shoot) {
      const ss = this.shoot, sp = Math.hypot(ss.vx, ss.vy);
      for (let i = 0; i < 18; i++) {
        const k = 1 - i / 18;
        ctx.globalAlpha = Math.max(0, k * Math.min(1, (ss.life - ss.t) * 2));
        ctx.fillStyle = i < 3 ? '#ffffff' : i < 9 ? '#ffe566' : '#ffc4e2';
        ctx.fillRect(Math.round(ss.x - (ss.vx / sp) * i * 2), Math.round(ss.y - (ss.vy / sp) * i * 2), i < 3 ? 3 : i < 10 ? 2 : 1, i < 3 ? 3 : i < 10 ? 2 : 1);
      }
      ctx.globalAlpha = 1;
    }
    // fireflies
    if (this.themeName !== 'day') {
      for (const f of this.flies) {
        if (f.k <= 0) continue;
        ctx.globalAlpha = 0.25 + 0.6 * f.k;
        ctx.fillStyle = '#fff4a0';
        ctx.fillRect(Math.round(f.fx), Math.round(f.fy), 1, 1);
        if (f.k > 0.6) { ctx.globalAlpha = 0.25; ctx.fillRect(Math.round(f.fx) - 1, Math.round(f.fy), 3, 1); ctx.fillRect(Math.round(f.fx), Math.round(f.fy) - 1, 1, 3); }
      }
      ctx.globalAlpha = 1;
    }
    // cardinal
    if (this.cardinal) {
      const cd = this.cardinal, fr = this.cardinalSpr[Math.floor(cd.t * (cd.loop > 0 ? 14 : 8)) % 2];
      ctx.save();
      if (cd.dir < 0) { ctx.translate(Math.round(cd.x) + fr.width, Math.round(cd.y)); ctx.scale(-1, 1); ctx.drawImage(fr, 0, 0); }
      else ctx.drawImage(fr, Math.round(cd.x), Math.round(cd.y));
      ctx.restore();
    }
    // Kujo
    if (this.kujo) {
      if (!this.reducedMotion) this.kujo.drawBehind(ctx);
      this.kujo.draw(ctx);
    }
    // title, in the sky (drawn last so it floats above the blossom)
    for (const l of this.title.letters) {
      if (!l.on) continue;
      const bob = Math.round(Math.sin(t * 2 + l.index * 0.55) * 1.1);
      ctx.drawImage(l.spr, l.x, Math.round(l.y + l.s.x + bob));
    }
    // particles belong to the world
    if (!this.reducedMotion) this.particles.draw(ctx);
    // falling blossom petals
    for (const p of this.petals) {
      ctx.globalAlpha = Math.min(1, p.life);
      ctx.drawImage(p.spr, Math.round(p.x), Math.round(p.y));
    }
    ctx.globalAlpha = 1;
    if (this.pulledPetal) {
      const p = this.pulledPetal;
      if (!p.detached) {
        ctx.strokeStyle = '#d4529a'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(Math.round(p.originX), Math.round(p.originY)); ctx.lineTo(Math.round(p.x), Math.round(p.y)); ctx.stroke();
      }
      ctx.drawImage(p.spr, Math.round(p.x - p.spr.width / 2), Math.round(p.y - p.spr.height / 2));
    }
    // vortex petals (greeting sucked into the tree)
    if (this.vortexT > 0 || this.vortex.length) {
      const tg = this.vortexTarget;
      for (const v of this.vortex) {
        if (v.d > 0) continue;
        ctx.drawImage(v.spr, Math.round(tg.x + Math.cos(v.a) * v.r), Math.round(tg.y + Math.sin(v.a) * v.r * 0.6));
      }
    }
    ctx.restore();
    if (this.flash > 0) {
      ctx.globalAlpha = Math.min(0.85, this.flash);
      ctx.fillStyle = '#fff4fa';
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }
  }
}

function pick2(r, arr) { return arr[Math.floor(r() * arr.length)]; }
