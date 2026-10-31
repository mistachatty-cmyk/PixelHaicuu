// The Bible reader overlay: opens like a book, shows a verse card first, then lets people read any chapter (KJV).
// Book text is data (public/bible/kjv/<book>.json), loaded one book at a time. Verses can be tapped to highlight.
const $ = (id) => document.getElementById(id);

// A short list of well-loved verses for the opening card: [book id, chapter, verse].
const FEATURED = [
  ['psalms', 23, 1], ['john', 3, 16], ['philippians', 4, 13], ['proverbs', 3, 5], ['isaiah', 40, 31], ['jeremiah', 29, 11],
  ['romans', 8, 28], ['matthew', 11, 28], ['joshua', 1, 9], ['psalms', 46, 10], ['psalms', 121, 1], ['matthew', 5, 9],
  ['1-corinthians', 13, 4], ['romans', 12, 2], ['psalms', 118, 24], ['galatians', 5, 22], ['micah', 6, 8], ['matthew', 6, 33],
  ['john', 14, 27], ['isaiah', 41, 10], ['psalms', 27, 1], ['proverbs', 16, 3], ['2-timothy', 1, 7], ['john', 8, 12],
];

// Where the "Get the Lok Bible" button goes (owner-provided).
const LOK_BIBLE_URL = 'https://gsix.online/lokbounce';

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (_) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) { /* private mode: fine */ } },
};

export class BibleReader {
  /** hooks: { sfx(name), buzz(ms), onOpen(), onClose() } - all optional */
  constructor(hooks = {}) {
    this.h = hooks;
    this.el = $('bible');
    this.isOpen = false;
    this.index = null;
    this.cache = new Map();
    this.book = 'john';
    this.chap = 1;
    this.mode = 'verse';
    this.fi = Math.floor(Math.random() * FEATURED.length);
    this.hl = new Set(store.get('hx.hl', []));
    this.fresh = true;
    const lok = $('blok');
    if (lok) { if (LOK_BIBLE_URL) lok.href = LOK_BIBLE_URL; else lok.parentNode.remove(); }
    this.bind();
  }

  sfx(n, a) { this.h.sfx && this.h.sfx(n, a); }

  bind() {
    $('bx').onclick = () => this.close();
    this.el.addEventListener('pointerdown', (e) => { if (e.target === this.el) this.close(); });
    $('bnew').onclick = () => { this.sfx('page'); this.h.buzz && this.h.buzz(8); this.nextFeatured(); };
    $('bread').onclick = () => { this.sfx('page'); this.showChapter(this.card.book, this.card.chap, this.card.verse); };
    $('bcopy').onclick = () => this.copy();
    $('bmode').onclick = () => { this.sfx('page'); this.showCard(); };
    $('bprev').onclick = () => this.step(-1);
    $('bnext').onclick = () => this.step(1);
    $('bbook').onchange = () => { this.sfx('page'); this.showChapter($('bbook').value, 1); };
    $('bchap').onchange = () => { this.sfx('page'); this.showChapter(this.book, +$('bchap').value); };
    window.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;
      if (e.key === 'Escape') { e.preventDefault(); this.close(); }
      else if (this.mode === 'read' && !/SELECT|INPUT/.test((e.target || {}).tagName || '') && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault(); this.step(e.key === 'ArrowLeft' ? -1 : 1);
      }
    });
    $('btext').addEventListener('click', (e) => {
      const v = e.target.closest && e.target.closest('.v');
      if (!v) return;
      const id = `${this.book}.${this.chap}.${v.dataset.n}`;
      if (this.hl.has(id)) this.hl.delete(id); else this.hl.add(id);
      v.classList.toggle('hl', this.hl.has(id));
      v.classList.remove('pop'); void v.offsetWidth; v.classList.add('pop');
      store.set('hx.hl', [...this.hl].slice(-400));
      this.sfx('tick', this.hl.has(id) ? 220 : 0);
      this.h.buzz && this.h.buzz(6);
    });
  }

  async load() {
    if (this.index) return;
    const r = await fetch('bible/index.json');
    this.index = await r.json();
    const sel = $('bbook');
    sel.innerHTML = '';
    this.index.books.forEach((b) => { const o = document.createElement('option'); o.value = b.id; o.textContent = b.name; sel.appendChild(o); });
  }

  async chapters(id) {
    if (!this.cache.has(id)) {
      const r = await fetch(`bible/kjv/${id}.json`);
      this.cache.set(id, await r.json());
    }
    return this.cache.get(id);
  }

  meta(id) { return this.index.books.find((b) => b.id === id); }

  async open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.last = document.activeElement;
    this.el.hidden = false;
    this.el.classList.remove('shut');
    void this.el.offsetWidth;
    this.el.classList.add('open');
    this.sfx('bookOpen');
    this.h.buzz && this.h.buzz(14);
    this.h.onOpen && this.h.onOpen();
    try {
      await this.load();
      const saved = store.get('hx.pos', null);
      if (saved && this.fresh && this.meta(saved.book)) { this.book = saved.book; this.chap = saved.chap; }
      this.fresh = false;
      await this.showCard(true);
    } catch (_) {
      $('bverse').hidden = false; $('bread-wrap').hidden = true; $('bchapview').hidden = true;
      $('bvt').textContent = 'The Bible could not load. Check your connection and try again.';
      $('bvr').textContent = '';
    }
    $('bx').focus();
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.el.classList.remove('open');
    this.el.classList.add('shut');
    this.sfx('bookClose');
    this.h.buzz && this.h.buzz(10);
    setTimeout(() => { if (!this.isOpen) this.el.hidden = true; }, 380);
    this.h.onClose && this.h.onClose();
    try { this.last && this.last.focus && this.last.focus(); } catch (_) { /* ignore */ }
  }

  // ---- verse card ----
  async showCard(initial = false) {
    this.mode = 'verse';
    $('bverse').hidden = false;
    $('bchapview').hidden = true;
    await this.nextFeatured(initial);
  }

  async nextFeatured(initial = false) {
    const [b, c, v] = FEATURED[this.fi % FEATURED.length];
    this.fi++;
    const chaps = await this.chapters(b);
    const text = (chaps[c - 1] || [])[v - 1] || '';
    this.card = { book: b, chap: c, verse: v, text };
    const card = $('bcard');
    card.classList.remove('flip'); void card.offsetWidth; card.classList.add('flip');
    $('bvt').textContent = text;
    $('bvr').textContent = `${this.meta(b).name} ${c}:${v}`;
    $('bvt').style.fontSize = text.length > 150 ? '' : text.length < 70 ? '1.18em' : '1.06em';
  }

  async copy() {
    const c = this.card;
    if (!c) return;
    const s = `“${c.text}” — ${this.meta(c.book).name} ${c.chap}:${c.verse} (KJV)`;
    try { await navigator.clipboard.writeText(s); $('bcopy').textContent = 'COPIED ✓'; } catch (_) { $('bcopy').textContent = 'PRESS & HOLD TO COPY'; }
    this.sfx('sparkle');
    setTimeout(() => { $('bcopy').textContent = 'COPY'; }, 1400);
  }

  // ---- chapter view ----
  async showChapter(book, chap, focusVerse = 0) {
    this.mode = 'read';
    const chaps = await this.chapters(book);
    chap = Math.max(1, Math.min(chaps.length, chap));
    this.book = book;
    this.chap = chap;
    store.set('hx.pos', { book, chap });
    $('bverse').hidden = true;
    $('bchapview').hidden = false;
    $('bbook').value = book;
    const cs = $('bchap');
    cs.innerHTML = '';
    for (let i = 1; i <= chaps.length; i++) { const o = document.createElement('option'); o.value = i; o.textContent = i; cs.appendChild(o); }
    cs.value = chap;
    const box = $('btext');
    box.innerHTML = '';
    const frag = document.createDocumentFragment();
    const h = document.createElement('h2');
    h.textContent = `${this.meta(book).name} ${chap}`;
    frag.appendChild(h);
    chaps[chap - 1].forEach((t, i) => {
      const s = document.createElement('span');
      s.className = 'v' + (this.hl.has(`${book}.${chap}.${i + 1}`) ? ' hl' : '');
      s.dataset.n = i + 1;
      const n = document.createElement('sup');
      n.textContent = i + 1;
      s.appendChild(n);
      s.appendChild(document.createTextNode(t + ' '));
      frag.appendChild(s);
    });
    box.appendChild(frag);
    box.scrollTop = 0;
    box.classList.remove('turn'); void box.offsetWidth; box.classList.add('turn');
    $('bprev').disabled = book === this.index.books[0].id && chap === 1;
    const last = this.index.books[this.index.books.length - 1];
    $('bnext').disabled = book === last.id && chap === chaps.length;
    if (focusVerse) {
      const el = box.querySelector(`.v[data-n="${focusVerse}"]`);
      if (el) { el.classList.add('hl', 'pop'); setTimeout(() => { el.classList.remove('hl'); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 60); }
    }
  }

  async step(d) {
    this.sfx('page');
    this.h.buzz && this.h.buzz(6);
    const chaps = await this.chapters(this.book);
    let c = this.chap + d;
    let b = this.book;
    const ix = this.index.books.findIndex((x) => x.id === b);
    if (c < 1) {
      if (ix === 0) return;
      b = this.index.books[ix - 1].id;
      c = (await this.chapters(b)).length;
    } else if (c > chaps.length) {
      if (ix === this.index.books.length - 1) return;
      b = this.index.books[ix + 1].id;
      c = 1;
    }
    this.showChapter(b, c);
  }
}
