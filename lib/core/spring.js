// Damped spring used for every squash, bounce, nod and wobble in the library.
export class Spring {
  constructor(k = 120, c = 8) {
    this.k = k; // stiffness
    this.c = c; // damping
    this.x = 0; // position
    this.v = 0; // velocity
    this.t = 0; // target
  }
  step(dt) {
    const h = dt / 2;
    for (let i = 0; i < 2; i++) {
      this.v += (this.k * (this.t - this.x) - this.c * this.v) * h;
      this.x += this.v * h;
    }
  }
  kick(v) { this.v += v; return this; }
  snap(x = 0) { this.x = x; this.v = 0; this.t = x; return this; }
}
