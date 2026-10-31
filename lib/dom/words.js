// Word-by-word text reveal (the Daisy page's signature move). Needs the .w/.in/.out CSS from the page template
// (see docs/INTERACTION_SYSTEMS.md). Returns a promise that resolves after the last word has left.
// A lone "/" token starts a new line (haiku lines).
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function revealWords(el, text, { stagger = 140, hold = 1400, out = true, sep = ' ', cancel = () => false } = {}) {
  el.textContent = '';
  const spans = [];
  text.split(sep).forEach((word, i, arr) => {
    if (word === '/') { el.appendChild(document.createElement('br')); return; }
    const s = document.createElement('span');
    s.className = 'w';
    s.textContent = word + (i < arr.length - 1 ? ' ' : '');
    el.appendChild(s);
    spans.push(s);
  });
  await sleep(30);
  for (const s of spans) { if (cancel()) break; s.classList.add('in'); await sleep(stagger); }
  await sleep(hold);
  if (out) {
    for (const s of spans) { s.classList.add('out'); await sleep(stagger * 0.6); }
    await sleep(350);
  }
  return spans;
}
