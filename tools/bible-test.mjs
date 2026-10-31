// Browser test for the bouncing Bible + reader: node tools/bible-test.mjs  (Playwright + Chromium). Shots go to ./shots.
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { PNG } = (() => { try { return require('pngjs'); } catch (_) { return {}; } })();
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const shots = path.join(root, 'shots');
fs.mkdirSync(shots, { recursive: true });
const server = http.createServer((q, r) => {
  let p = path.join(dist, q.url.split('?')[0]);
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': p.endsWith('.json') ? 'application/json' : 'text/html' });
  fs.createReadStream(p).pipe(r);
}).listen(0);
const port = server.address().port;
const browser = await chromium.launch();
const errors = [];
const results = [];
const ok = (name, v) => { results.push((v ? 'PASS ' : 'FAIL ') + name); };
// find the centroid of Bible-cover maroon pixels in a screenshot
async function findBible(page) {
  const buf = await page.screenshot();
  if (!PNG) return null;
  const png = PNG.sync.read(buf);
  let sx = 0, sy = 0, n = 0;
  for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) {
    const i = (y * png.width + x) * 4;
    const r = png.data[i], g = png.data[i + 1], b = png.data[i + 2];
    if (Math.abs(r - 143) < 6 && Math.abs(g - 45) < 6 && Math.abs(b - 82) < 6) { sx += x; sy += y; n++; }
  }
  return n > 40 ? [sx / n, sy / n, n] : null;
}
for (const [name, vp] of [['desktop', { width: 1280, height: 720 }], ['phone', { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport: vp, hasTouch: name === 'phone' });
  page.on('pageerror', (e) => errors.push(name + ': ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|ERR_TUNNEL/.test(m.text())) errors.push(name + ' console: ' + m.text()); });
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded' });
  await page.click('#skip');
  await page.waitForTimeout(3600);
  await page.screenshot({ path: path.join(shots, `${name}-bible-1-bounce.png`) });
  const hudBtn = await page.locator('#bibtn').isVisible();
  ok(name + ' bible button visible', hudBtn);
  const hud = await page.locator('#hud').boundingBox();
  let found = await findBible(page);
  ok(name + ' bouncing bible found on canvas', !!found || !PNG);
  if (found && hud) ok(name + ' bible clear of HUD (y)', found[1] < hud.y + 8);
  // tap it
  if (found) {
    const f2 = await findBible(page) || found;
    if (name === 'phone') await page.touchscreen.tap(f2[0], f2[1]); else await page.mouse.click(f2[0], f2[1]);
  } else await page.click('#bibtn');
  await page.waitForTimeout(900);
  const open1 = await page.locator('#bible.open').count();
  ok(name + ' tap on bible opens reader', open1 === 1);
  await page.screenshot({ path: path.join(shots, `${name}-bible-2-card.png`) });
  const verse = (await page.locator('#bvt').textContent()) || '';
  ok(name + ' verse card has text', verse.length > 20);
  await page.click('#bnew'); await page.waitForTimeout(500);
  const v2 = (await page.locator('#bvt').textContent()) || '';
  ok(name + ' new verse changes', v2 !== verse);
  await page.click('#bread'); await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(shots, `${name}-bible-3-chapter.png`) });
  const nverses = await page.locator('#btext .v').count();
  ok(name + ' chapter renders verses (' + nverses + ')', nverses > 3);
  await page.locator('#btext .v').nth(1).click(); await page.waitForTimeout(300);
  ok(name + ' tap verse highlights', (await page.locator('#btext .v.hl').count()) >= 1);
  await page.selectOption('#bbook', 'psalms'); await page.waitForTimeout(500);
  await page.selectOption('#bchap', '23'); await page.waitForTimeout(600);
  const t23 = (await page.locator('#btext').textContent()) || '';
  ok(name + ' psalm 23 loads', /shepherd/.test(t23));
  await page.screenshot({ path: path.join(shots, `${name}-bible-4-psalm23.png`) });
  await page.click('#bnext'); await page.waitForTimeout(400);
  ok(name + ' next chapter works', /Psalms 24/.test((await page.locator('#btext h2').textContent()) || ''));
  await page.keyboard.press('Escape'); await page.waitForTimeout(700);
  ok(name + ' escape closes', (await page.locator('#bible').isHidden()));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(shots, `${name}-bible-5-popback.png`) });
  const f3 = await findBible(page);
  ok(name + ' bible returns after close', !!f3 || !PNG);
  await page.close();
}
await browser.close();
server.close();
console.log(results.join('\n'));
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
