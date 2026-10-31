// Kujo - the animated, beat-reactive, switchable character. Owns the springs and the interaction state;
// the Rig owns the sprites. Scenes just call update(dt) and draw(ctx).
import { Spring } from '../core/spring.js';
import { rand, pick, TAU } from '../core/math.js';
import { buildRig } from './rig.js';
import { VARIANTS, VARIANT_ORDER } from './variants.js';
import { makeGlow } from '../assets/props.js';

export class Kujo {
  constructor({ variants = VARIANTS, order = VARIANT_ORDER, kit, particles, beat, x = 0, y = 0, start = order[0] } = {}) {
    this.variants = variants;
    this.order = order;
    this.kit = kit;
    this.particles = particles;
    this.x = x;
    this.y = y;
    this.rigs = {};
    this.glows = {};
    this.nod = new Spring(300, 15);
    this.sway = new Spring(150, 9);
    this.bounce = new Spring(240, 13);
    this.focus = new Spring(40, 9);
    this.t = 0;
    this.expr = 'calm';
    this.exprT = 0;
    this.holding = false;
    this.rings = [];
    this.noteT = rand(3, 6);
    this.smileT = rand(6, 11);
    this.swing = 1;
    this.prev = null;
    this.beat = beat || null;
    this.level = 0;
    this.id = null;
    this.sprite = null; // optional SpriteLook: when set, the overlay draws the character and the coded rig stays hidden
    this.setVariant(start, { fx: false });
    if (beat) beat.on((info) => this.onBeat(info));
  }

  rigOf(id) {
    return this.rigs[id] || (this.rigs[id] = buildRig(this.variants[id]));
  }

  get rig() { return this.rigOf(this.id); }
  get def() { return this.variants[this.id]; }
  get index() { return this.order.indexOf(this.id); }

  setVariant(id, { fx = true } = {}) {
    if (id === 'bucket' && this.variants.artist) id = 'artist';
    if (!this.variants[id]) return;
    this.id = id;
    const rig = this.rigOf(id);
    this.dreads = rig.makeDreads(11 + this.order.indexOf(id));
    this.prev = null;
    if (!this.glows[id]) this.glows[id] = makeGlow(rig.anchors.aura.r, rig.aura);
    if (fx) {
      const b = this.bounds();
      this.bounce.kick(46);
      this.nod.kick(-30);
      this.expr = 'happy';
      this.exprT = 1.1;
      if (this.particles) {
        this.particles.burst(this.x, this.y - 34, 16, 70, rig.aura);
        this.particles.stars(this.x, this.y - 40, 8, 20, 50);
        this.particles.hearts(this.x, b.y + 10, 3, 12);
      }
    }
    return this.def;
  }

  cycle(dir = 1) {
    const n = this.order.length;
    return this.setVariant(this.order[(this.index + dir + n) % n]);
  }

  bounds() {
    if (this.sprite) {
      const s = this.sprite.heightStage / this.sprite.canvas[1];
      const [x, y, w, h] = this.sprite.hitbox;
      return { x: this.x + (x - this.sprite.seat[0]) * s, y: this.y + (y - this.sprite.seat[1]) * s, w: w * s, h: h * s };
    }
    const h = this.rig.anchors.hitbox;
    return { x: this.x + h.x, y: this.y + h.y, w: h.w, h: h.h };
  }

  hit(px, py) {
    const b = this.bounds();
    return px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h;
  }

  /** A gentle tap: giggle, hop, little hearts. */
  poke() {
    this.bounce.kick(34);
    this.nod.kick(24);
    this.expr = 'happy';
    this.exprT = 1.3;
    this.dreads && this.dreads.kick(1.4, true);
    if (this.particles) this.particles.hearts(this.x, this.y - 66, 4, 10);
  }

  /** Press-and-hold: he focuses, the aura swells and rings radiate. */
  setHold(on) { this.holding = on; }

  onBeat({ strength, accent }) {
    this.swing = -this.swing;
    this.nod.kick((accent ? 62 : 44) * (0.55 + 0.45 * strength));
    this.sway.kick(16 * this.swing);
    this.bounce.kick(accent ? 34 : 14);
    this.dreads && this.dreads.kick(strength, accent);
    if (accent) this.rings.push({ r: 8, a: 1 });
  }

  update(dt) {
    this.t += dt;
    for (const s of [this.nod, this.sway, this.bounce]) s.step(dt);
    this.focus.t = this.holding ? 1 : 0;
    this.focus.step(dt);
    if (this.exprT > 0) {
      this.exprT -= dt;
      if (this.exprT <= 0) this.expr = 'calm';
    }
    // idle life: a slow smile and a floating note now and then
    this.smileT -= dt;
    if (this.smileT <= 0 && this.expr === 'calm') {
      this.expr = 'happy';
      this.exprT = 0.9;
      this.smileT = rand(7, 13);
    }
    this.noteT -= dt;
    if (this.noteT <= 0 && this.particles && this.kit.notes) {
      this.noteT = rand(4, 8);
      this.particles.add({ x: this.x + rand(-26, 26), y: this.y - 52, vx: rand(-4, 4), vy: rand(-16, -10), life: rand(2, 3), spr: pick(this.kit.notes), w: 6 });
    }
    if (this.holding) {
      if (Math.random() < dt * 14 && this.particles) {
        const a = rand(0, TAU);
        this.particles.add({ x: this.x + Math.cos(a) * 26, y: this.y - 32 + Math.sin(a) * 22, vx: 0, vy: rand(-22, -10), life: rand(0.7, 1.2), spr: pick(this.kit.spark) });
      }
      this.ringT = (this.ringT || 0) - dt;
      if (this.ringT <= 0) { this.rings.push({ r: 6, a: 1 }); this.ringT = 0.7; }
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const rg = this.rings[i];
      rg.r += dt * 62;
      rg.a -= dt * 1.1;
      if (rg.a <= 0) this.rings.splice(i, 1);
    }
    if (this.beat) this.level = this.beat.level;
    const pose = this.pose();
    const [hx, hy] = this.rig.headPos(pose);
    if (this.prev && this.dreads) this.dreads.update(dt, hx - this.prev[0], hy - this.prev[1]);
    this.prev = [hx, hy];
  }

  pose() {
    // one-pixel breathing step, ~5s cycle
    const breath = Math.sin(this.t * 1.25) > 0.45 ? -1 : 0;
    return {
      x: this.x, y: this.y, expr: this.expr,
      nod: this.nod.x, sway: this.sway.x, bounce: this.bounce.x - this.focus.x * 1.5,
      breath, lift: this.focus.x,
    };
  }

  /** Aura + rings. Draw before the character. */
  drawBehind(ctx) {
    const a = this.rig.anchors.aura;
    const g = this.glows[this.id];
    const swell = this.focus.x * 6 + this.level * 5;
    ctx.globalAlpha = 0.28 + 0.3 * Math.min(1, this.level + this.focus.x);
    const gw = g.width + swell * 2;
    ctx.drawImage(g, Math.round(this.x + a.x - gw / 2), Math.round(this.y + a.y - gw / 2), Math.round(gw), Math.round(gw));
    ctx.globalAlpha = 1;
    const col = this.rig.aura;
    for (const rg of this.rings) {
      ctx.globalAlpha = Math.max(0, Math.min(1, rg.a));
      ctx.fillStyle = col[1];
      const n = Math.max(12, Math.round(rg.r * 1.6));
      for (let i = 0; i < n; i++) {
        const t = (i / n) * TAU;
        ctx.fillRect(Math.round(this.x + a.x + Math.cos(t) * rg.r), Math.round(this.y + a.y + Math.sin(t) * rg.r * 0.8), 1, 1);
      }
    }
    ctx.globalAlpha = 1;
  }

  draw(ctx) {
    if (this.sprite) return;
    this.rig.draw(ctx, this.pose(), this.dreads);
  }
}
