// Keep keyboard focus in the active sheet without changing the page's canvas input model.
export function bindDialogFocus(dialog) {
  dialog.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab' || dialog.hidden) return;
    const items = [...dialog.querySelectorAll('button:not(:disabled),a[href],select:not(:disabled),[tabindex="0"]')].filter(el => el.getClientRects().length && !el.hidden);
    const first = items[0], last = items.at(-1);
    if (!first) { event.preventDefault(); return; }
    if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
}
