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
    stage.onResize.push(() => this.layout());
    this.layout();
  }

  get theme() { return THEMES[this.themeName]; }
  get worldH() { return this.stage.h + EXTRA; }
  get maxCam() { return EXTRA; }
  get groundY() { return this.worldH - GROUND_H; }
  get progress() { return clamp(this.cam.x / EXTRA, 0, 1); }

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
    const r = mulberry32(this.seed);
    this.W = w;
    this.WH = WH;
    // sky: dark at the top, bright at the horizon, ordered-dithered
    this.sky = makeCanvas(w, WH);
    const sc = this.sky.getContext('2d');
    for (let y = 0; y < WH; y++) {
      const v = 0.04 + 0.96 * Math.pow(y / (WH - GROUND_H), 0.85);
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
    this.ground = makeCanvas(w, GROUND_H);
    const gc = this.ground.getContext('2d');
    const g = th.ground;
    for (let y = 0; y < GROUND_H; y++) {
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
    if (wx > ax - 4 && wx < w && wy > this.groundY - 40) {
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
      return 'canopy';
    }
    // grass: grow a flower
    if (wy > this.groundY + 2) {
      if (this.extraFlowers.length < 40) {
        const f = { x: wx, y: wy, spr: pick(this.kit.miniFlowers), ph: rand(0, 6), k: 0 };
        this.extraFlowers.push(f);
        this.particles.stars(wx, wy - 4, 3, 5, 25);
      }
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
    ctx.drawImage(this.alpacaSpr, ax, aY);
    const fl = Math.round(this.flower.x * 0.08);
    ctx.drawImage(this.smiley, 4, this.groundY - 31 - Math.abs(fl));
    ctx.drawImage(this.ground, 0, this.groundY);
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
    // Kujo
    if (this.kujo) {
      this.kujo.drawBehind(ctx);
      this.kujo.draw(ctx);
    }
    // title, in the sky (drawn last so it floats above the blossom)
    for (const l of this.title.letters) {
      if (!l.on) continue;
      const bob = Math.round(Math.sin(t * 2 + l.index * 0.55) * 1.1);
      ctx.drawImage(l.spr, l.x, Math.round(l.y + l.s.x + bob));
    }
    // particles belong to the world
    this.particles.draw(ctx);
    // falling blossom petals
    for (const p of this.petals) {
      ctx.globalAlpha = Math.min(1, p.life);
      ctx.drawImage(p.spr, Math.round(p.x), Math.round(p.y));
    }
    ctx.globalAlpha = 1;
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
