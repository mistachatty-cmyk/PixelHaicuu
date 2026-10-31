import { rand, pick, TAU } from './math.js';

// Sprite-or-pixel particles: hearts, stars, sparkles, dust, rings. `kit` comes from assets/makeKit().
export class Particles {
  constructor(kit) {
    this.kit = kit;
    this.list = [];
    this.clock = 0;
  }

  add(p) {
    p.life = p.life || 1;
    p.max = p.life;
    p.g = p.g || 0;
    p.w = p.w || 0;
    p.vx = p.vx || 0;
    p.vy = p.vy || 0;
    p.drag = p.drag || 0;
    p.ph = rand(0, 6);
    this.list.push(p);
    return p;
  }

  hearts(x, y, n, spread = 14) {
    for (let i = 0; i < n; i++) {
      this.add({ x: x + rand(-spread, spread), y: y + rand(-6, 6), vx: rand(-12, 12), vy: rand(-42, -22), g: 4, life: rand(1.1, 1.9), spr: pick(this.kit.hearts), w: 10 });
    }
  }

  stars(x, y, n, spread = 14, speed = 40) {
    const pool = [...this.kit.stars, ...this.kit.spark];
    for (let i = 0; i < n; i++) {
      this.add({ x: x + rand(-spread, spread), y: y + rand(-spread, spread), vx: rand(-speed, speed), vy: rand(-speed, speed * 0.3) - 12, g: 20, life: rand(0.7, 1.4), spr: pick(pool), drag: 1.2 });
    }
  }

  dust(x, y, n, colors, speed = 60, gravity = 70) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU);
      const s = rand(speed * 0.3, speed);
      this.add({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, g: gravity, life: rand(0.6, 1.3), col: pick(colors), sz: rand(0, 1) < 0.4 ? 2 : 1, drag: 1.1 });
    }
  }

  /** Evenly spaced radial burst (fireworks, blooms). */
  burst(x, y, n, speed, colors) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      this.add({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, g: 25, life: rand(0.9, 1.4), spr: rand(0, 1) < 0.5 ? pick(this.kit.stars) : null, col: pick(colors), sz: 2, drag: 1.4 });
    }
  }

  update(dt) {
    this.clock += dt;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.list.splice(i, 1);
        continue;
      }
      p.vy += p.g * dt;
      if (p.drag) {
        const f = Math.max(0, 1 - p.drag * dt);
        p.vx *= f;
        p.vy *= f;
      }
      p.x += p.vx * dt + (p.w ? Math.sin(3 * this.clock + p.ph) * p.w * dt : 0);
      p.y += p.vy * dt;
    }
  }

  draw(ctx) {
    for (const p of this.list) {
      ctx.globalAlpha = Math.min(1, p.life / (0.35 * p.max));
      if (p.spr) ctx.drawImage(p.spr, Math.round(p.x - p.spr.width / 2), Math.round(p.y - p.spr.height / 2));
      else {
        ctx.fillStyle = p.col;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.sz || 1, p.sz || 1);
      }
    }
    ctx.globalAlpha = 1;
  }
}
