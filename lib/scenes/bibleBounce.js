// BibleBounce - a pixel Bible that drifts and bounces around the screen like a DVD logo. Grab it and fling it; tap it to
// open the reader. Screen/stage space (draw it after the world). Every contact has feedback: squash, dust, sound hooks.
import { Toy } from '../core/toy.js';
import { Particles } from '../core/particles.js';
import { Spring } from '../core/spring.js';
import { makeBible, makeGlow } from '../assets/props.js';
import { rand, clamp, TAU } from '../core/math.js';

const GOLD = ['#ffd24a', '#fff2a8', '#ffe36b', '#ffffff'];

export class BibleBounce {
  /**
   * kit: from makeKit(). Hooks (all optional): onOpen(), onGrab(), onFling(speed), onBounce(speed, axis), onCorner(), onHover(on).
   */
  constructor({ stage, kit, onOpen, onGrab, onFling, onBounce, onCorner, cruise = 36 } = {}) {
    this.stage = stage;
    this.sprite = makeBible(32);
    this.glow = makeGlow(18, ['#ffe36b', '#fff2a8', '#fff2a8', '#ffffff']);
    this.fx = new Particles(kit);
    this.hooks = { onOpen, onGrab, onFling, onBounce, onCorner };
    this.toy = new Toy({ r: 12, drag: 0.35, rest: 0.92, cruise, spin: 0.02, onBounce: (axis, sp) => this.bounced(axis, sp) });
    this.bounds = { top: 6, bottom: stage.h - 6 };
    this.visible = false;
    this.hover = false;
    this.scale = new Spring(180, 11);
    this.scale.snap(0);
    this.t = 0;
    this.trailT = 0;
    this.down = null;
    this.cornerCd = 0;
  }

  /** Set the vertical play area (so the HUD buttons stay clear). */
  setBounds(top, bottom) { this.bounds.top = top; this.bounds.bottom = bottom; }

  /** Drop it in from above the screen. */
  spawn() {
    const { stage, toy } = this;
    toy.x = rand(stage.w * 0.25, stage.w * 0.75);
    toy.y = -30;
    toy.vx = rand(-30, 30);
    toy.vy = 150;
    toy.ang = rand(-0.4, 0.4);
    toy.av = rand(-1.5, 1.5);
    this.visible = true;
    this.scale.snap(0.2);
    this.scale.t = 1;
  }

  get open() { return this.down === null || !this.down.moved; }

  hit(sx, sy) { return this.visible && this.toy.hit(sx, sy, 5); }

  setHover(on) {
    if (on !== this.hover) { this.hover = on; }
  }

  // ---- gesture (stage coordinates) -------------------------------------------------------------
  pointerDown(sx, sy) {
    if (!this.hit(sx, sy)) return false;
    this.down = { x: sx, y: sy, moved: false, t: this.t };
    this.toy.grab(sx, sy);
    this.scale.t = 1.18;
    this.hooks.onGrab && this.hooks.onGrab();
    return true;
  }

  pointerMove(sx, sy) {
    if (!this.down) return;
    if (!this.down.moved && Math.hypot(sx - this.down.x, sy - this.down.y) > 2.5) this.down.moved = true;
    this.toy.dragTo(sx, sy);
  }

  pointerUp({cancelled=false}={}) {
    const d = this.down;
    if (!d) return;
    this.down = null;
    this.toy.release();
    this.scale.t = 1;
    if(cancelled){this.toy.vx=0;this.toy.vy=0;return;}
    const speed = Math.hypot(this.toy.vx, this.toy.vy);
    if (!d.moved && this.t - d.t < 0.45) {
      // a tap: hop, sparkle and open
      this.toy.vy = -90; this.toy.vx *= 0.3;
      this.fx.stars(this.toy.x, this.toy.y, 8, 10, 60);
      this.hooks.onOpen && this.hooks.onOpen();
    } else if (speed > 40) {
      this.hooks.onFling && this.hooks.onFling(speed);
    }
  }

  /** The reader closed: pop back in where it was. */
  popBack() {
    this.visible = true;
    this.scale.snap(0.2);
    this.scale.t = 1;
    this.toy.vy = -60;
    this.fx.burst(this.toy.x, this.toy.y, 10, 45, GOLD);
  }

  hide() { this.visible = false; }

  bounced(axis, speed) {
    const { x, y, r } = this.toy;
    const { stage } = this;
    this.fx.dust(clamp(x, 0, stage.w), clamp(y, 0, stage.h), Math.min(6, 2 + Math.floor(speed / 40)), GOLD, 30, 20);
    // corner = within a few px of two walls at once
    const nearX = x < r + 5 || x > stage.w - r - 5;
    const nearY = y < this.bounds.top + r + 5 || y > this.bounds.bottom - r - 5;
    if (nearX && nearY && this.cornerCd <= 0) {
      this.cornerCd = 0.6;
      this.fx.burst(x, y, 14, 70, GOLD);
      this.toy.sq.kick(55);
      this.hooks.onCorner && this.hooks.onCorner();
    } else {
      this.hooks.onBounce && this.hooks.onBounce(speed, axis);
    }
  }

  update(dt) {
    this.t += dt;
    this.cornerCd -= dt;
    this.scale.step(dt);
    this.fx.update(dt);
    if (!this.visible) return;
    const { stage, toy } = this;
    toy.update(dt, { x0: 0, y0: this.bounds.top, x1: stage.w, y1: Math.max(this.bounds.top + 40, this.bounds.bottom) });
    // shimmer trail while moving
    this.trailT -= dt;
    if (this.trailT <= 0 && Math.hypot(toy.vx, toy.vy) > 20) {
      this.trailT = toy.grabbed ? 0.04 : 0.22;
      this.fx.add({ x: toy.x + rand(-6, 6), y: toy.y + rand(-6, 6), vx: rand(-6, 6), vy: rand(-8, 4), g: 2, life: rand(0.5, 0.9), col: GOLD[(Math.random() * 4) | 0], sz: 1, drag: 1 });
    }
  }

  draw(ctx) {
    if(this.effects!==false)this.fx.draw(ctx);
    if (!this.visible) return;
    const { toy, sprite } = this;
    const idx = ((Math.round((toy.ang / TAU) * sprite.n) % sprite.n) + sprite.n) % sprite.n;
    const fr = sprite.frames[idx];
    const k = Math.max(0.05, this.scale.x);
    const s = clamp(toy.sq.x * 0.12, -0.3, 0.4); // squash: wide + short against walls
    const sx = toy.sqAxis === 'x' ? 1 - s : 1 + s * 0.6;
    const sy = toy.sqAxis === 'x' ? 1 + s * 0.6 : 1 - s;
    const bob = toy.grabbed ? 0 : Math.sin(this.t * 3.2) * 1.2;
    const w = Math.round(fr.width * k * sx);
    const h = Math.round(fr.height * k * sy);
    const x = Math.round(toy.x - w / 2);
    const y = Math.round(toy.y + bob - h / 2);
    // halo: always faint, bright when hovered/held so it reads as touchable
    ctx.globalAlpha = this.effects===false ? 0 : toy.grabbed ? 0.9 : this.hover ? 0.7 : 0.28 + 0.1 * Math.sin(this.t * 2.4);
    const g = this.glow;
    ctx.drawImage(g, Math.round(toy.x - g.width / 2), Math.round(toy.y + bob - g.height / 2));
    ctx.globalAlpha = 1;
    ctx.drawImage(fr, x, y, w, h);
  }
}
