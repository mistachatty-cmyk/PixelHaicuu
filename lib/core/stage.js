// A Stage is a tiny canvas (about 230px tall) scaled up by a whole number with pixelated rendering.
// Everything in the library draws in stage pixels, never screen pixels.

export function fitScale(w, h, targetH = 230, targetW = 118, min = 2) {
  return Math.max(min, Math.min(Math.round(h / targetH), Math.floor(w / targetW)));
}

export function createStage(canvas, { targetH = 230, targetW = 118, minScale = 2, size } = {}) {
  const getSize = size || (() => ({ w: window.innerWidth, h: window.innerHeight }));
  const stage = {
    canvas,
    ctx: canvas.getContext('2d'),
    w: 0,
    h: 0,
    scale: 3,
    onResize: [],
    resize() {
      const { w: iw, h: ih } = getSize();
      stage.scale = fitScale(iw, ih, targetH, targetW, minScale);
      stage.w = Math.ceil(iw / stage.scale);
      stage.h = Math.ceil(ih / stage.scale);
      canvas.width = stage.w;
      canvas.height = stage.h;
      if (canvas.style) {
        canvas.style.width = stage.w * stage.scale + 'px';
        canvas.style.height = stage.h * stage.scale + 'px';
      }
      stage.ctx.imageSmoothingEnabled = false;
      stage.onResize.forEach((fn) => fn(stage));
    },
    /** client (screen) coordinates -> stage pixel coordinates */
    toStage(clientX, clientY) {
      const r = canvas.getBoundingClientRect();
      return [(clientX - r.left) / stage.scale, (clientY - r.top) / stage.scale];
    },
  };
  stage.resize();
  return stage;
}
