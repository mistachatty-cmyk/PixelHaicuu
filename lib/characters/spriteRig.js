// SpriteLook: an illustrated, layered character (see docs/LAYERED_RIG_SPEC.md). Each layer is a PNG drawn on a
// high-resolution overlay canvas. The existing Kujo springs (nod, sway, bounce, focus) drive the layers, and
// followers (headwear, hair, glasses) get their own lagging springs for secondary motion.
// Browser only (loads images). Pure transforms, no DOM besides Image/canvas contexts passed in.
import { Spring } from '../core/spring.js';
import { rand } from '../core/math.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function loadImage(src) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => res(im);
    im.onerror = () => rej(new Error('image failed: ' + src));
    im.src = src;
  });
}

export class SpriteLook {
  constructor(manifest, images) {
    this.m = manifest;
    this.id = manifest.id;
    this.name = manifest.name || manifest.id;
    this.theme = manifest.theme || null;
    this.aura = manifest.aura || '#ff9ccb';
    this.canvas = manifest.canvas;
    this.seat = manifest.seat;
    this.heightStage = manifest.heightStage || 78;
    this.hitbox = manifest.hit || [0, 0, manifest.canvas[0], manifest.canvas[1]];
    this.images = images; // layer id -> image or { key: image }
    this.layers = manifest.layers;
    // secondary springs per follower layer (x offset, y offset, rotation)
    this.lag = {};
    for (const l of this.layers) {
      const lag = (l.motion && l.motion.lag) || 0;
      this.lag[l.id] = { y: new Spring(220 - lag * 150, 11), r: new Spring(180 - lag * 120, 8), lag };
    }
    this.blinkT = rand(2, 4);
    this.blink = 0;
    this.expr = 'calm';
  }

  /** manifestUrl: URL of <look>/manifest.json. Layer srcs are relative to it. */
  static async load(manifestUrl) {
    const base = manifestUrl.replace(/[^/]*$/, '');
    const m = await (await fetch(manifestUrl)).json();
    const images = {};
    const jobs = [];
    for (const l of m.layers) {
      if (l.src) jobs.push(loadImage(base + l.src).then((im) => { images[l.id] = im; }));
      if (l.set) {
        images[l.id] = {};
        for (const k of Object.keys(l.set)) jobs.push(loadImage(base + l.set[k]).then((im) => { images[l.id][k] = im; }));
      }
    }
    await Promise.all(jobs);
    return new SpriteLook(m, images);
  }

  /** dt in seconds; pose from Kujo.pose() (nod, sway, bounce, lift). */
  update(dt, pose) {
    this.blinkT -= dt;
    if (this.blinkT <= 0) { this.blink = 0.12; this.blinkT = rand(2.5, 5); }
    if (this.blink > 0) this.blink -= dt;
    const head = this.headMotion(pose);
    for (const l of this.layers) {
      const s = this.lag[l.id];
      if (!l.motion || !l.motion.follow) continue;
      s.y.t = head.dy;
      s.r.t = head.r;
      s.y.step(dt);
      s.r.step(dt);
    }
    this.expr = pose.expr;
  }

  headMotion(pose) {
    // Kujo's springs are in stage pixels (peak about 2 after a beat). u converts stage px to art px.
    const u = this.canvas[1] / this.heightStage;
    const dy = ((pose.nod || 0) * 0.9 - (pose.bounce || 0) * 0.6 + (pose.breath || 0)) * u;
    const r = (pose.sway || 0) * 0.06 + (pose.nod || 0) * 0.02;
    return { dy: clamp(dy, -4 * u, 4 * u), r: clamp(r, -0.12, 0.12) };
  }

  exprKeys(pose) {
    if (pose.lift > 0.5) return { eyes: 'closed', mouth: 'calm' };
    const e = (this.m.expressions && this.m.expressions[pose.expr]) || { eyes: 'open', mouth: 'calm' };
    return this.blink > 0 && e.eyes === 'open' ? { ...e, eyes: 'closed' } : e;
  }

  /** Draw at seat point (x, y) in ctx pixels. s = ctx pixels per art pixel. */
  draw(ctx, pose, x, y, s) {
    const ox = x - this.seat[0] * s;
    const oy = y - this.seat[1] * s;
    const head = this.headMotion(pose);
    const keys = this.exprKeys(pose);
    const bounce = pose.bounce || 0;
    for (const l of this.layers) {
      let img = this.images[l.id];
      if (!img) continue;
      if (l.set) img = img[keys[l.id] || keys.eyes] || Object.values(img)[0];
      const mo = l.motion || {};
      let dx = 0, dy = 0, r = 0, sx = 1, sy = 1;
      if (mo.bounce) {
        sy = 1 + bounce * 0.012 * mo.bounce + (pose.breath ? -0.006 : 0);
        sx = 1 - bounce * 0.006 * mo.bounce;
        dy = 0;
      } else if (mo.follow) {
        const lg = this.lag[l.id];
        const lagMix = mo.lag || 0;
        dy = head.dy * (1 - lagMix) + lg.y.x * lagMix;
        r = (head.r * (1 - lagMix) + lg.r.x * lagMix) * (mo.sway || 1);
      } else if (mo.nod) {
        dy = head.dy;
        r = head.r * (mo.tilt ? 1 : 0.5);
      }
      const px = l.pivot[0], py = l.pivot[1];
      ctx.save();
      ctx.translate(ox + (px + dx) * s, oy + (py + dy) * s);
      if (r) ctx.rotate(r);
      if (sx !== 1 || sy !== 1) ctx.scale(sx, sy);
      ctx.drawImage(img, -px * s, -py * s, this.canvas[0] * s, this.canvas[1] * s);
      ctx.restore();
    }
  }
}

/** The overlay canvas that sits above the pixel stage and shows the high-resolution sprite look. */
export class SpriteOverlay {
  constructor({ canvas, stage, world }) {
    this.canvas = canvas;
    this.stage = stage;
    this.world = world;
    this.ctx = canvas.getContext('2d');
    this.dpr = 1;
    this.resize = this.resize.bind(this);
    this.resize();
    if (typeof window !== 'undefined') window.addEventListener('resize', this.resize);
  }

  resize() {
    this.dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
    const w = (typeof window !== 'undefined' ? window.innerWidth : 800), h = (typeof window !== 'undefined' ? window.innerHeight : 600);
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
  }

  clear() { this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); }

  /** Screen-space rect (CSS px) of the sprite for hit testing: {x,y,w,h} or null. */
  rectOf(look, kujo) {
    const st = this.stage, rc = st.canvas.getBoundingClientRect();
    const sx = rc.left + kujo.x * st.scale;
    const sy = rc.top + (kujo.y - Math.round(this.world.cam.x)) * st.scale;
    const s = (look.heightStage * st.scale) / look.canvas[1];
    const [hx, hy, hw, hh] = look.hitbox;
    return { x: sx + (hx - look.seat[0]) * s, y: sy + (hy - look.seat[1]) * s, w: hw * s, h: hh * s };
  }

  /** Call once per frame after world.draw. look = SpriteLook or null (then it only clears). */
  draw(look, kujo, dt) {
    this.clear();
    if (!look) return;
    const st = this.stage, rc = st.canvas.getBoundingClientRect();
    const pose = kujo.pose();
    look.update(dt, pose);
    const x = (rc.left + kujo.x * st.scale) * this.dpr;
    const y = (rc.top + (kujo.y - Math.round(this.world.cam.x)) * st.scale) * this.dpr;
    const s = ((look.heightStage * st.scale) / look.canvas[1]) * this.dpr;
    this.ctx.imageSmoothingEnabled = false;
    look.draw(this.ctx, pose, Math.round(x), Math.round(y), s);
  }
}
