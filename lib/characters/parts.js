// Part builders. A "part" is a function that paints one body part into a sprite (or a pair of sprites for
// expressions / left+right). Variants (variants.js) are just data that name a builder and its options, so a new
// outfit, hat or era is a few lines of data - not new drawing code. See docs/CHARACTER_RIGS.md.
import { Painter, hash2 } from '../core/painter.js';
import { ditherPick } from '../core/gfx.js';

export const COLORS = {
  skin: ['#3a2216', '#54331f', '#7a4a2c', '#9a6238', '#b87a4a'],
  beard: ['#120a07', '#1d110c', '#2c1a13', '#40291e'],
  coral: ['#8a2f4a', '#b94a64', '#dc6a82', '#f08fa3', '#ffc0cc'],
  tiedye: ['#a63a78', '#c8588f', '#e07ab0', '#f6a8cf', '#ffe0ee'],
  black: ['#0c0c10', '#17171e', '#23232c', '#32323e'],
  denim: ['#1d2b4a', '#2a3d68', '#3b5388', '#5470a8'],
  shoePink: ['#b0306f', '#e0509a', '#ff7bbd', '#ffa8d4'],
  hotPink: ['#c4107a', '#e8199a', '#ff2ea6', '#ff62bd', '#ff93d2'],
  maroon: ['#4a0a22', '#6e1230', '#8f1a3e', '#ad2850', '#c9446a'],
  wool: ['#c47a9c', '#e098b8', '#f4bad2', '#ffe0ec'],
  llamaFace: ['#c49a90', '#dfbfb2', '#f2ddd2', '#fff2ea'],
  hoof: ['#8f3a64', '#b8527f', '#e07aa6'],
  lens: ['#241a38', '#3a2a58', '#5a4a82'],
};

const AMB = { amb: 0.42, gain: 0.62 };
const inEllipse = (x, y, cx, cy, rx, ry, grow = 0) => ((x - cx) / (rx + grow)) ** 2 + ((y - cy) / (ry + grow)) ** 2 <= 1;

/** paint `fn(painter)` on a scratch layer, give it a dark outline, then blit it onto `p` (keeps overlapping limbs readable). */
function layer(p, outline, fn, diag = false) {
  const q = new Painter(p.w, p.h);
  fn(q);
  if (outline) q.outline(outline, diag);
  p.blit(q);
}

// ------------------------------------------------------------------------------------ HEADS
function eyesClosed(p, happy, col, ox = 0) {
  const arcs = happy
    ? [[8, 18], [9, 17], [10, 16], [11, 17], [12, 18]]
    : [[8, 17], [9, 18], [10, 18], [11, 18], [12, 17]];
  arcs.forEach(([x, y]) => { p.set(x + ox, y, col); p.set(x + 10 + ox, y, col); });
}

function mouth(p, happy, cx, y, lip, inner = '#2a0e12', tongue = '#d0606a') {
  if (happy) {
    p.rect(cx - 3, y, 7, 1, '#f6efe8');
    p.rect(cx - 3, y + 1, 7, 2, inner);
    p.rect(cx - 2, y + 2, 5, 1, tongue);
    p.set(cx - 4, y - 1, lip); p.set(cx + 4, y - 1, lip);
  } else {
    [[-3, -1], [-2, 0], [-1, 1], [0, 1], [1, 1], [2, 0], [3, -1]].forEach(([dx, dy]) => p.set(cx + dx, y + dy, lip));
  }
}

function headHuman(expr, o) {
  const p = new Painter(30, 37);
  const happy = expr === 'happy';
  const skin = o.skin || COLORS.skin;
  const hair = o.hair === undefined ? COLORS.coral : o.hair;
  const beard = o.beard === undefined ? COLORS.beard : o.beard;
  if (hair) {
    for (let i = 0; i < 9; i++) {
      const a = Math.PI + (i / 8) * Math.PI;
      p.ellipse(15 + Math.cos(a) * 12.6, 11 + Math.sin(a) * 10.4, 2.9, 2.9, hair, { amb: 0.45, gain: 0.6 });
    }
  }
  p.ellipse(3.8, 22, 2.4, 3.4, skin, AMB);
  p.ellipse(26.2, 22, 2.4, 3.4, skin, AMB);
  p.ellipse(15, 21, 11, 13, skin, AMB);
  p.ellipse(7, 25, 2, 2, [skin[2], skin[3]], { amb: 0.5 }); // subtle cheek light
  const inFace = (x, y) => inEllipse(x, y, 15, 21, 11.8, 13.8);
  if (beard) {
    p.ellipse(15, 27.5, 11.4, 8.8, beard, { amb: 0.45, gain: 0.6, only: (x, y) => y >= 24 + 2.2 * Math.pow(Math.abs(x - 15) / 11, 2) && inFace(x, y) });
    p.ellipse(5.2, 22, 1.6, 3.2, beard, { amb: 0.5, only: inFace });
    p.ellipse(24.8, 22, 1.6, 3.2, beard, { amb: 0.5, only: inFace });
    p.ellipse(15, 24.6, 6, 1.9, beard, { amb: 0.55, gain: 0.5 });
  }
  // nose
  p.ellipse(15, 20.6, 2.5, 2.3, [skin[2], skin[3], skin[4]], { amb: 0.5, gain: 0.55 });
  p.set(14, 22.6, skin[0]); p.set(16, 22.6, skin[0]);
  mouth(p, happy, 15, beard ? 27 : 26, beard ? '#b86870' : skin[0]);
  // brows
  const bc = beard ? beard[1] : skin[0];
  p.line(7, 14, 12, 13, bc); p.line(18, 13, 23, 14, bc);
  p.line(7, 15, 12, 14, bc);  p.line(18, 14, 23, 15, bc);
  if (o.glasses) {
    const lens = o.lens || COLORS.lens;
    const frame = o.frame || '#14141c';
    [10.5, 19.5].forEach((cx) => {
      for (let y = 12; y <= 23; y++) for (let x = Math.floor(cx - 5); x <= Math.ceil(cx + 5); x++) {
        const d = Math.hypot(x + 0.5 - cx, (y + 0.5 - 17.6) * 1.05);
        if (d <= 3.1) p.set(x, y, ditherPick(lens, 0.62 - (d / 3.1) * 0.2 - ((y - 16) * 0.05), x, y));
        else if (d <= 4.3) p.set(x, y, frame);
      }
      p.set(Math.round(cx - 2), 16, happy ? '#ffd0f0' : '#a898e0');
      p.set(Math.round(cx - 2), 15, happy ? '#ffffff' : '#7a6ab8');
      if (happy) { p.set(Math.round(cx + 1), 19, '#ffffff'); p.set(Math.round(cx + 1), 18, '#ffd0f0'); p.set(Math.round(cx), 19, '#ffd0f0'); }
    });
    p.rect(14, 16, 3, 1, frame);
    p.rect(5, 16, 2, 1, frame); p.rect(24, 16, 2, 1, frame);
  } else {
    eyesClosed(p, happy, '#140a08');
    p.set(7, happy ? 17 : 16, '#140a08'); p.set(23, happy ? 17 : 16, '#140a08');
  }
  if (happy) { p.rect(6, 23, 2, 1, '#c4605f'); p.rect(22, 23, 2, 1, '#c4605f'); }
  // hair cap with dread parting lines, over everything above the hairline
  if (hair) {
    p.ellipse(15, 10.5, 12.8, 10.2, hair, {
      amb: 0.3, gain: 0.62,
      only: (x, y) => y < 11 + 6 * Math.pow(Math.abs(x - 15) / 12.8, 2.2),
      shift: (x, y) => (x % 3 === 0 ? -0.24 : x % 3 === 1 ? 0.08 : 0) + (hash2(x, y) - 0.5) * 0.1 - (y - 8) * 0.012,
    });
  }
  p.innerEdge((c) => c);
  return p.toCanvas();
}

function headMask(expr, o) {
  const p = new Painter(30, 37);
  const happy = expr === 'happy';
  const knit = o.knit || COLORS.hotPink;
  const skin = o.skin || COLORS.skin;
  const dd = o.doodle || ['#ffffff', '#1a1a22', '#ffe566'];
  p.rbox(15, 18.5, 13.4, 16.8, 2.7, knit, {
    amb: 0.4, gain: 0.66,
    shift: (x, y) => (y % 2 ? 0.05 : -0.03) + (x % 2 ? 0.03 : 0),
  });
  // rolled neck rim
  for (let y = 31; y < 37; y++) for (let x = 0; x < 30; x++) if (p.has(x, y) && (y - 31) % 2 === 1) p.set(x, y, knit[1]);
  // eye + mouth cut-outs: dark rim then skin
  [10, 20].forEach((cx) => {
    p.ellipse(cx, 16.2, 5.3, 3.9, [knit[0]], { amb: 1 });
    p.ellipse(cx, 16.2, 4.4, 3, skin, { amb: 0.5, gain: 0.55 });
  });
  p.ellipse(15, 27.4, 6, 3.8, [knit[0]], { amb: 1 });
  p.ellipse(15, 27.4, 5, 2.9, skin, { amb: 0.5, gain: 0.55 });
  eyesClosed(p, happy, '#140a08');
  mouth(p, happy, 15, 27, '#b86870');
  // nose bump
  p.ellipse(15, 21.4, 2, 1.6, [knit[2], knit[3]], { amb: 0.6 });
  // scribbled designs
  for (let x = 5; x <= 23; x += 3) { p.set(x, 6 + ((x / 3) % 2) * 3, dd[0]); p.set(x + 1, 7 + ((x / 3) % 2) * 2, dd[0]); p.set(x + 2, 8 - ((x / 3) % 2) * 2, dd[0]); }
  [[5, 22], [6, 21], [7, 22], [8, 21], [6, 23]].forEach(([x, y]) => p.set(x, y, dd[1]));
  p.set(22, 22, dd[2]); p.set(21, 23, dd[2]); p.set(23, 23, dd[2]); p.set(22, 24, dd[2]); p.set(22, 23, '#ffffff');
  p.set(14, 3, dd[1]); p.set(16, 3, dd[1]); p.set(15, 4, dd[1]); p.set(14, 5, dd[1]); p.set(16, 5, dd[1]);
  p.set(4, 12, dd[2]); p.set(25, 13, dd[0]); p.set(5, 14, dd[0]); p.set(24, 11, dd[1]);
  if (happy) { p.rect(5, 26, 2, 1, '#ff9ab8'); p.rect(23, 26, 2, 1, '#ff9ab8'); }
  p.innerEdge((c) => c);
  return p.toCanvas();
}

function headLlama(expr, o) {
  const p = new Painter(30, 37);
  const happy = expr === 'happy';
  const wool = o.wool || COLORS.wool;
  const face = COLORS.llamaFace;
  p.ellipse(8.5, 8, 2.8, 7, face, { amb: 0.5 }); p.ellipse(21.5, 8, 2.8, 7, face, { amb: 0.5 });
  p.ellipse(8.5, 9, 1.2, 4, ['#e79ab4'], { amb: 1 }); p.ellipse(21.5, 9, 1.2, 4, ['#e79ab4'], { amb: 1 });
  p.ellipse(15, 33, 11.5, 6.5, wool, { amb: 0.45, gain: 0.6 });
  p.ellipse(15, 21, 10, 12.5, face, { amb: 0.5, gain: 0.55 });
  p.ellipse(15, 27.6, 6, 5, [face[1], face[2], face[3]], { amb: 0.5, gain: 0.55 });
  // wool topknot
  for (let i = 0; i < 7; i++) p.ellipse(8 + i * 2.35, 9 - Math.sin((i / 6) * Math.PI) * 4, 4.6, 4.6, wool, { amb: 0.45, gain: 0.62 });
  for (let i = 0; i < 4; i++) p.ellipse(10 + i * 3.4, 4 - (i === 1 || i === 2 ? 1 : 0), 3.6, 3.6, wool, { amb: 0.5, gain: 0.6 });
  // face
  eyesClosed(p, happy, '#5a3a4a');
  p.set(7, 17, '#5a3a4a'); p.set(23, 17, '#5a3a4a');
  p.set(13, 26, '#8a5a68'); p.set(17, 26, '#8a5a68');
  [[-3, 0], [-2, 1], [-1, 2], [0, 2], [1, 2], [2, 1], [3, 0]].forEach(([dx, dy]) => p.set(15 + dx, 29 + dy - (happy ? 1 : 0), '#8a5a68'));
  if (happy) p.rect(13, 31, 5, 1, '#e87a98');
  p.rect(6, 22, 3, 2, '#ffb0c4'); p.rect(21, 22, 3, 2, '#ffb0c4');
  p.innerEdge((c) => c);
  return p.toCanvas();
}

export const HEADS = {
  human: (o) => ({ calm: headHuman('calm', o), happy: headHuman('happy', o) }),
  mask: (o) => ({ calm: headMask('calm', o), happy: headMask('happy', o) }),
  llama: (o) => ({ calm: headLlama('calm', o), happy: headLlama('happy', o) }),
};

// ------------------------------------------------------------------------------------ TORSOS
function tieDye(ramp) {
  return (x, y, l) => {
    const d = Math.hypot(x - 11, y - 13);
    const a = Math.atan2(y - 13, x - 11);
    const w = 0.5 + 0.5 * Math.sin(d * 0.62 + a * 2.2);
    return ditherPick(ramp, 0.12 + 0.28 * l + 0.62 * w * (0.75 + 0.25 * l), x, y);
  };
}

export const TORSOS = {
  hoodie(o = {}) {
    const ramp = o.ramp || COLORS.tiedye;
    const p = new Painter(30, 26);
    p.ellipse(15, 4.5, 11.8, 4.8, ramp.map((c) => c), { amb: 0.2, gain: 0.5 });
    p.rbox(15, 14.2, 14.7, 12.3, 3.4, ramp, { amb: 0.4, gain: 0.7, color: o.plain ? undefined : tieDye(ramp) });
    p.rect(12, 5, 1, 7, '#ffffff'); p.rect(18, 5, 1, 7, '#ffffff');
    p.set(12, 12, '#d8c8e0'); p.set(18, 12, '#d8c8e0');
    // pocket seams
    p.line(7, 19, 23, 19, ramp[0]);
    p.line(7, 19, 5, 24, ramp[0]); p.line(23, 19, 25, 24, ramp[0]);
    p.innerEdge((c) => c);
    return { body: p.toCanvas(), sleeve: { ramp, color: o.plain ? undefined : tieDye(ramp) } };
  },
  jacket(o = {}) {
    const ramp = o.ramp || COLORS.black;
    const p = new Painter(30, 26);
    p.rbox(15, 14.2, 14.7, 12.3, 3.4, ramp, { amb: 0.4, gain: 0.7, shift: (x, y) => (x % 7 === 3 ? -0.04 : 0) });
    p.poly([[10, 2], [20, 2], [15, 11]], o.shirt || '#efe6f4');
    p.line(15, 11, 15, 25, o.zip || '#c8c8d8');
    p.ellipse(15, 3.2, 10, 3.2, ramp, { amb: 0.25, gain: 0.5, only: (x, y) => !(Math.abs(x - 15) < (y - 1) * 0.65 + 1 && y < 11) });
    // pink graphic on the chest
    if (o.accent) { p.rect(19, 12, 4, 1, o.accent); p.rect(20, 11, 2, 3, o.accent); }
    p.innerEdge((c) => c);
    return { body: p.toCanvas(), sleeve: { ramp } };
  },
  llama(o = {}) {
    const wool = o.wool || COLORS.wool;
    const p = new Painter(30, 26);
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2;
      p.ellipse(15 + Math.cos(a) * 10.5, 14 + Math.sin(a) * 7.5, 5.2, 5.2, wool, { amb: 0.45, gain: 0.6 });
    }
    p.ellipse(15, 14, 11, 8.5, wool, { amb: 0.45, gain: 0.6 });
    p.innerEdge((c) => c);
    return { body: p.toCanvas(), sleeve: { ramp: wool } };
  },
};

// ------------------------------------------------------------------------------------ LEGS
export const LEGS = {
  crisscross(o = {}) {
    const pants = o.pants || COLORS.black;
    const shoes = o.shoes || COLORS.shoePink;
    const edge = pants[0];
    const p = new Painter(52, 16);
    const shoe = (cx) => (q) => q.ellipse(cx, 12.6, 5.6, 3.3, shoes, { amb: 0.5, gain: 0.6, color: (x, y, l) => (y >= 14 ? '#f4eaf2' : ditherPick(shoes, l, x, y)) });
    layer(p, edge, (q) => q.capsule(5, 8.2, 34, 11, 5.4, 4.3, pants, { amb: 0.4, gain: 0.7 }));
    layer(p, edge, shoe(36));
    layer(p, edge, (q) => q.capsule(47, 8.2, 18, 11, 5.4, 4.3, pants, { amb: 0.4, gain: 0.7 }));
    layer(p, edge, shoe(16));
    return p.toCanvas();
  },
  llama(o = {}) {
    const wool = o.wool || COLORS.wool;
    const p = new Painter(44, 14);
    const edge = wool[0];
    layer(p, edge, (q) => q.capsule(5, 7, 28, 9.5, 4.8, 4, wool, { amb: 0.45, gain: 0.6 }));
    layer(p, edge, (q) => q.ellipse(30, 10.2, 4, 2.8, COLORS.hoof, { amb: 0.5 }));
    layer(p, edge, (q) => q.capsule(39, 7, 16, 9.5, 4.8, 4, wool, { amb: 0.45, gain: 0.6 }));
    layer(p, edge, (q) => q.ellipse(14, 10.2, 4, 2.8, COLORS.hoof, { amb: 0.5 }));
    return p.toCanvas();
  },
};

// ------------------------------------------------------------------------------------ ARMS
export const ARMS = {
  /** Arms resting on the knees. `sleeve` comes from the torso so outfit and sleeves always match. */
  sleeves(o = {}, torso) {
    const skin = o.skin || COLORS.skin;
    const sl = (torso && torso.sleeve) || { ramp: COLORS.black };
    const p = new Painter(12, 24);
    layer(p, sl.ramp[0], (q) => q.capsule(8.4, 4.6, 4.8, 17.4, 4.9, 4, sl.ramp, { amb: 0.4, gain: 0.7, color: sl.color }), false);
    layer(p, skin[0], (q) => q.ellipse(4.6, 20.6, 3.3, 2.9, skin, { amb: 0.45, gain: 0.6 }));
    p.rect(2, 22, 1, 1, skin[1]); p.rect(4, 23, 1, 1, skin[1]); p.rect(6, 22, 1, 1, skin[1]);
    return { L: p.toCanvas(), R: p.flipH().toCanvas() };
  },
  /** Llama arms: hooves pressed together in front of the chest (the Llamasté pose). */
  prayer(o = {}) {
    const wool = o.wool || COLORS.wool;
    const p = new Painter(12, 20);
    layer(p, wool[0], (q) => q.capsule(2.4, 2.4, 8, 13, 3.8, 3, wool, { amb: 0.45, gain: 0.6 }));
    layer(p, COLORS.hoof[0], (q) => q.ellipse(8.4, 15.8, 2.6, 3.2, COLORS.hoof, { amb: 0.5 }));
    return { L: p.toCanvas(), R: p.flipH().toCanvas() };
  },
};

// ------------------------------------------------------------------------------------ HATS
export const HATS = {
  bucket(o = {}) {
    const ramp = o.ramp || COLORS.hotPink;
    const band = o.band || '#ffffff';
    const p = new Painter(38, 18);
    p.rbox(19, 8.4, 12.8, 7.6, 3.2, ramp, { amb: 0.4, gain: 0.68 });
    p.ellipse(19, 13.2, 18.4, 4.6, ramp, { amb: 0.35, gain: 0.7, only: (x, y) => y < 11.5, under: false });
    p.ellipse(19, 13.2, 18.4, 4.6, ramp, { amb: 0.3, gain: 0.62, only: (x, y) => y >= 11.5 });
    p.rect(7, 10, 24, 1, band);
    for (let x = 7; x < 31; x += 3) p.set(x + 1, 11, o.stitch || ramp[0]);
    p.innerEdge((c) => c);
    p.outline(ramp[0]);
    return p.toCanvas();
  },
};
