// Toy - a tiny physics object for things people can grab, throw and watch bounce (the Bible, flower pots, balls...).
// Screen/stage space. Gravity, restitution, drag, optional "cruise" (keeps drifting at a gentle speed forever, like a
// DVD logo), squash-and-stretch via a spring, spin from horizontal motion, and a grab/throw API for pointers.
import { Spring } from './spring.js';
import { clamp } from './math.js';

export class Toy {
  constructor({ x = 0, y = 0, r = 10, g = 0, drag = 0.25, rest = 0.9, cruise = 0, spin = 0.02, onBounce = null } = {}) {
    Object.assign(this, { x, y, r, g, drag, rest, cruise, spin, onBounce });
    this.vx = 0;
    this.vy = 0;
    this.ang = 0;
    this.av = 0;
    this.sq = new Spring(300, 12); // squash amount: + = flattened against a wall
    this.sqAxis = 'y';
    this.grabbed = false;
    this.tx = 0;
    this.ty = 0;
    this.hist = [];
    this.t = 0;
  }

  /** Launch in a direction at a speed (px/s). */
  launch(angle, speed) { this.vx = Math.cos(angle) * speed; this.vy = Math.sin(angle) * speed; }

  hit(px, py, slop = 3) { return Math.hypot(px - this.x, py - this.y) <= this.r + slop; }

  grab(px, py) {
    this.grabbed = true;
    this.ox = this.x - px;
    this.oy = this.y - py;
    this.tx = px;
    this.ty = py;
    this.hist.length = 0;
    this.sq.kick(-40);
  }

  dragTo(px, py) { this.tx = px; this.ty = py; }

  /** Release; the velocity comes from the last ~100ms of drag, so flicks throw naturally. */
  release() {
    this.grabbed = false;
    const h = this.hist;
    if (h.length >= 2) {
      const a = h[0];
      const b = h[h.length - 1];
      const dt = Math.max(0.016, b.t - a.t);
      this.vx = clamp((b.x - a.x) / dt, -520, 520);
      this.vy = clamp((b.y - a.y) / dt, -520, 520);
    }
    this.sq.kick(30);
  }

  update(dt, b) {
    this.t += dt;
    this.sq.step(dt);
    if (this.grabbed) {
      const px = this.tx + this.ox;
      const py = this.ty + this.oy;
      this.x += (px - this.x) * Math.min(1, dt * 22);
      this.y += (py - this.y) * Math.min(1, dt * 22);
      this.hist.push({ x: this.x, y: this.y, t: this.t });
      while (this.hist.length > 1 && this.t - this.hist[0].t > 0.11) this.hist.shift();
      this.av += (clamp((px - this.x) * 0.5, -6, 6) - this.av) * Math.min(1, dt * 8);
      this.ang += this.av * dt;
      return;
    }
    this.vy += this.g * dt;
    const f = Math.max(0, 1 - this.drag * dt);
    this.vx *= f;
    this.vy *= f;
    if (this.cruise) {
      const sp = Math.hypot(this.vx, this.vy) || 0.001;
      if (sp < this.cruise) { const k = 1 + dt * 1.4; this.vx *= k; this.vy *= k; if (sp < 4) { this.vx = this.cruise; this.vy = this.cruise * 0.6; } }
      else if (sp > this.cruise * 1.8) { const k = 1 - dt * 1.6; this.vx *= k; this.vy *= k; }
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const { x0, y0, x1, y1 } = b;
    let hitN = 0;
    const bounce = (axis, sign) => {
      const sp = axis === 'x' ? Math.abs(this.vx) : Math.abs(this.vy);
      if (axis === 'x') this.vx = Math.abs(this.vx) * this.rest * sign; else this.vy = Math.abs(this.vy) * this.rest * sign;
      this.sq.kick(clamp(sp * 0.35, 8, 60));
      this.sqAxis = axis;
      this.av += (Math.random() < 0.5 ? 1 : -1) * clamp(sp * this.spin * 2, 0.4, 5);
      hitN = Math.max(hitN, sp);
      if (this.onBounce) this.onBounce(axis, sp);
    };
    if (this.x < x0 + this.r) { this.x = x0 + this.r; bounce('x', 1); }
    if (this.x > x1 - this.r) { this.x = x1 - this.r; bounce('x', -1); }
    if (this.y < y0 + this.r) { this.y = y0 + this.r; bounce('y', 1); }
    if (this.y > y1 - this.r) { this.y = y1 - this.r; bounce('y', -1); }
    // spin eases toward a gentle roll that follows horizontal motion
    this.av += (this.vx * this.spin - this.av) * Math.min(1, dt * 1.2);
    this.ang += this.av * dt;
  }
}
