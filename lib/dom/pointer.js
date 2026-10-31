// Pointer input for the stage: tap, long-press (hold), vertical drag-to-scroll and mouse wheel / arrow keys.
// Callbacks receive stage-pixel coordinates (not screen pixels).
export function attachPointer(stage, { onTap, onHold, onDragY, onWheel, onKey, holdMs = 450, slop = 6 } = {}) {
  const el = stage.canvas;
  let down = null;
  let holdTimer = null;
  const pos = (e) => stage.toStage(e.clientX, e.clientY);

  const endHold = () => {
    clearTimeout(holdTimer);
    if (down && down.holding) onHold && onHold(down.sx, down.sy, false);
  };

  const onDown = (e) => {
    if (e.button !== undefined && e.button > 0) return;
    const [sx, sy] = pos(e);
    down = { id: e.pointerId, cx: e.clientX, cy: e.clientY, lastY: e.clientY, sx, sy, moved: false, holding: false };
    try { el.setPointerCapture(e.pointerId); } catch (_) { /* not all environments support capture */ }
    holdTimer = setTimeout(() => {
      if (down && !down.moved) {
        down.holding = true;
        onHold && onHold(down.sx, down.sy, true);
      }
    }, holdMs);
  };
  const onMove = (e) => {
    if (!down || e.pointerId !== down.id) return;
    if (!down.moved && Math.hypot(e.clientX - down.cx, e.clientY - down.cy) > slop) {
      down.moved = true;
      clearTimeout(holdTimer);
      if (down.holding) { onHold && onHold(down.sx, down.sy, false); down.holding = false; }
    }
    if (down.moved) {
      onDragY && onDragY((down.lastY - e.clientY) / stage.scale);
      down.lastY = e.clientY;
    }
  };
  const onUp = (e) => {
    if (!down || e.pointerId !== down.id) return;
    clearTimeout(holdTimer);
    const d = down;
    down = null;
    if (d.holding) { onHold && onHold(d.sx, d.sy, false); return; }
    if (!d.moved) { const [sx, sy] = pos(e); onTap && onTap(sx, sy); }
  };
  const onCancel = () => { endHold(); down = null; };
  const wheel = (e) => { e.preventDefault(); onWheel && onWheel(e.deltaY / stage.scale / 2); };
  const key = (e) => {
    if (!onKey) return;
    if (['ArrowDown', 'PageDown', ' ', 'ArrowUp', 'PageUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      if (e.key === ' ' && e.target && /BUTTON|INPUT/.test(e.target.tagName)) return;
      e.preventDefault();
      onKey(e.key);
    }
  };
  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onCancel);
  el.addEventListener('wheel', wheel, { passive: false });
  window.addEventListener('keydown', key);
  return () => {
    el.removeEventListener('pointerdown', onDown);
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerup', onUp);
    el.removeEventListener('pointercancel', onCancel);
    el.removeEventListener('wheel', wheel);
    window.removeEventListener('keydown', key);
  };
}
