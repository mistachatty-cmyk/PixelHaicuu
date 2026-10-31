// Spring-driven dreadlock strands. Each strand is a chain of short segments whose angles follow a damped spring,
// so strands lag behind the head, flick on beats and drift gently when idle. Cheap enough for 20+ strands.
import { Spring } from '../core/spring.js';
import { mulberry32, clamp } from '../core/math.js';

const SEG = 2.3;

export class DreadSystem {
  /**
   * roots: { back: [[x, y, baseAngle, segments], ...], front: [...] } in head-local pixels.
   * baseAngle: 0 hangs straight down, negative leans left, positive leans right (radians).
   */
  constructor(roots, ramp, seed = 7) {
    const r = mulberry32(seed);
    this.ramp = ramp;
    this.t = 0;
    this.layers = {};
    for (const key of ['back', 'front']) {
      this.layers[key] = (roots[key] || []).map(([x, y, ang, n]) => ({
        x, y, ang, n, ph: r() * 6.28, sp: 0.8 + r() * 0.8,
        s: new Spring(70 + r() * 25, 5 + r() * 1.2),
        knot: 2 + Math.floor(r() * 2),
      }));
    }
  }

  /** dx, dy: how far the head moved this frame (px). Strands trail behind the motion. */
  update(dt, dx, dy) {
    this.t += dt;
    for (const key of ['back', 'front']) {
      for (const st of this.layers[key]) {
        const side = st.ang === 0 ? 1 : Math.sign(st.ang);
        st.s.kick(-dx * 1.6 * (0.7 + 0.3 * st.sp) + dy * 0.9 * side);
        st.s.step(dt);
        st.s.x = clamp(st.s.x, -1.1, 1.1);
      }
    }
  }

  /** Beat flick - strands whip outward a little, accents more. */
  kick(strength = 1, accent = false) {
    for (const key of ['back', 'front']) {
      for (const st of this.layers[key]) {
        const side = st.ang === 0 ? 1 : Math.sign(st.ang);
        st.s.kick(side * (accent ? 0.9 : 0.5) * strength * (0.6 + st.sp * 0.4));
      }
    }
  }

  /** lift: 0..1 makes strands float outward (used while he is "focusing"). */
  draw(ctx, layer, hx, hy, lift = 0) {
    const ramp = this.ramp;
    const dark = layer === 'back' ? 1 : 0;
    for (const st of this.layers[layer]) {
      let x = hx + st.x;
      let y = hy + st.y;
      for (let j = 0; j < st.n; j++) {
        const settle = clamp(j / (st.n * 0.55), 0, 1);
        let a = st.ang * (1 - settle * 0.85);
        a += st.s.x * (0.05 + j * 0.03);
        a += Math.sin(this.t * st.sp * 1.6 + st.ph + j * 0.42) * 0.011 * (j + 1);
        a += lift * Math.sign(st.ang || 1) * 0.35 * (j / st.n);
        const dx = Math.sin(a);
        const dy = Math.cos(a);
        const tip = j >= st.n - 2;
        for (let k = 0; k < 3; k++) {
          x += dx * (SEG / 3);
          y += dy * (SEG / 3);
          const px = Math.round(x);
          const py = Math.round(y);
          const knot = (j + 1) % st.knot === 0 && k === 1;
          const li = Math.max(0, (knot ? 1 : 2) - dark);
          const ri = Math.max(0, (knot ? 2 : 3) - dark + (j % 5 === 2 && k === 0 ? 1 : 0));
          if (!tip) {
            ctx.fillStyle = ramp[li];
            ctx.fillRect(px, py, 1, 1);
            ctx.fillStyle = ramp[Math.min(ramp.length - 1, ri)];
            ctx.fillRect(px + 1, py, 1, 1);
          } else {
            ctx.fillStyle = ramp[Math.max(0, 3 - dark)];
            ctx.fillRect(px, py, 1, 1);
            if (j === st.n - 2) ctx.fillRect(px + 1, py, 1, 1);
          }
        }
      }
    }
  }
}
