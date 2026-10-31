// A Rig is the skeleton: where each part is anchored relative to the character's seat point (x = centre, y = ground).
// buildRig() turns a variant definition (pure data) into sprites using the parts registry.
import { HEADS, TORSOS, LEGS, ARMS, HATS, COLORS } from './parts.js';
import { DreadSystem } from './dreads.js';

export const RIGS = {
  // Human sitting crisscross: head 30x37, torso 30x26, legs 52x16, arms 12x24.
  sitter: {
    head: [-15, -62], torso: [-15, -34], legs: [-26, -16], armL: [-22, -32], armR: [10, -32], hat: [-19, -65],
    hitbox: { x: -27, y: -72, w: 54, h: 72 },
    aura: { x: 0, y: -34, r: 38 },
    strands: {
      back: [[4, 10, -0.55, 13], [8, 6, -0.36, 15], [12, 4, -0.16, 16], [18, 4, 0.16, 16], [22, 6, 0.36, 15], [26, 10, 0.55, 13], [3, 14, -0.5, 12], [27, 14, 0.5, 12]],
      front: [[2, 14, -0.1, 10], [4, 17, -0.05, 11], [28, 14, 0.1, 10], [26, 17, 0.05, 11], [1, 19, -0.17, 9], [29, 19, 0.17, 9]],
    },
  },
  // Llama in the same pose, a bit shorter, hooves together.
  llama: {
    head: [-15, -56], torso: [-15, -30], legs: [-22, -14], armL: [-11, -27], armR: [-1, -27], hat: [-19, -59],
    hitbox: { x: -24, y: -64, w: 48, h: 64 },
    aura: { x: 0, y: -30, r: 34 },
    strands: null,
  },
};

export class Rig {
  constructor(def, anchors, sprites, hairRamp) {
    this.def = def;
    this.id = def.id;
    this.anchors = anchors;
    this.sprites = sprites;
    this.hairRamp = hairRamp;
    this.aura = def.aura || ['#ff9ccb', '#ffc2de', '#ffe3ee'];
  }

  makeDreads(seed = 7) {
    return this.anchors.strands ? new DreadSystem(this.anchors.strands, this.hairRamp, seed) : null;
  }

  /** Where the head is this frame (the dread strands and the hat both hang from it). */
  headPos(pose) {
    const { head } = this.anchors;
    const up = Math.round(pose.bounce * 0.8) + (pose.breath || 0);
    return [pose.x + head[0] + Math.round(pose.sway * 0.7), pose.y + head[1] + up + Math.round(pose.nod)];
  }

  draw(ctx, pose, dreads) {
    const A = this.anchors;
    const S = this.sprites;
    const up = Math.round(pose.bounce * 0.8) + (pose.breath || 0);
    const sw = Math.round(pose.sway * 0.7);
    const [hx, hy] = this.headPos(pose);
    const img = (cv, x, y) => ctx.drawImage(cv, Math.round(x), Math.round(y));
    if (dreads) dreads.draw(ctx, 'back', hx, hy, pose.lift || 0);
    img(S.torso, pose.x + A.torso[0] + Math.round(sw * 0.35), pose.y + A.torso[1] + up);
    img(S.legs, pose.x + A.legs[0], pose.y + A.legs[1]);
    img(S.armL, pose.x + A.armL[0] + Math.round(sw * 0.3), pose.y + A.armL[1] + up);
    img(S.armR, pose.x + A.armR[0] + Math.round(sw * 0.3), pose.y + A.armR[1] + up);
    img(S.head[pose.expr === 'happy' ? 'happy' : 'calm'], hx, hy);
    if (S.hat) img(S.hat, hx + (A.hat[0] - A.head[0]), hy + (A.hat[1] - A.head[1]));
    if (dreads) dreads.draw(ctx, 'front', hx, hy, pose.lift || 0);
  }
}

export function buildRig(def) {
  const anchors = RIGS[def.rig || 'sitter'];
  const head = HEADS[def.head.kind](def.head);
  const torso = TORSOS[def.torso.kind](def.torso);
  const legs = LEGS[def.legs.kind](def.legs);
  const arms = ARMS[def.arms.kind]({ ...def.arms, skin: def.head.skin }, torso);
  const hat = def.hat ? HATS[def.hat.kind](def.hat) : null;
  const hairRamp = (def.head.hair && def.head.hair.length ? def.head.hair : COLORS.coral);
  return new Rig(def, anchors, { head, torso: torso.body, legs, armL: arms.L, armR: arms.R, hat }, hairRamp);
}
