// Browser test for the Pixel -> Reality auto-mix and the MIX / SHUFFLE toggles: node tools/mix-test.mjs (Playwright + Chromium).
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const shots = path.join(root, 'shots');
fs.mkdirSync(shots, { recursive: true });
const server = http.createServer((q, r) => {
  let p = path.join(dist, q.url.split('?')[0]);
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { r.writeHead(404); return r.end(); }
  const type = ({ '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.html': 'text/html', '.mp3': 'audio/mpeg', '.jpg': 'image/jpeg' })[path.extname(p)] || 'application/octet-stream';
  const size = fs.statSync(p).size; const range = q.headers.range;
  if (range) { const [a, b] = range.replace('bytes=', '').split('-'); const s = +a, e = b ? +b : size - 1; r.writeHead(206, { 'content-type': type, 'content-range': `bytes ${s}-${e}/${size}`, 'accept-ranges': 'bytes', 'content-length': e - s + 1 }); fs.createReadStream(p, { start: s, end: e }).pipe(r); }
  else { r.writeHead(200, { 'content-type': type, 'accept-ranges': 'bytes', 'content-length': size }); fs.createReadStream(p).pipe(r); }
}).listen(0);
const port = server.address().port;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const errors = []; const results = [];
const ok = (n, v) => results.push((v ? 'PASS ' : 'FAIL ') + n);
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|ERR_TUNNEL|catalog|gsix\.online|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
await page.route('https://gsix.online/**', (r) => r.abort());
await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded' });
await page.click('#skip'); await page.waitForTimeout(3200);
await page.click('#songs'); await page.waitForTimeout(700);
const side = async () => ((await page.locator('#spix').getAttribute('aria-pressed')) === 'true' ? 'pixel' : (await page.locator('#sreal').getAttribute('aria-pressed')) === 'true' ? 'reality' : '?');
ok('both toggles visible', (await page.locator('#mixtgl').isVisible()) && (await page.locator('#shuftgl').isVisible()));
ok('AUTO-MIX defaults on, SHUFFLE off', (await page.locator('#mixtgl').getAttribute('aria-checked')) === 'true' && (await page.locator('#shuftgl').getAttribute('aria-checked')) === 'false');
ok('drawer opens on REALITY before play', (await side()) === 'reality');
await page.click('#play'); await page.waitForTimeout(1200);
ok('first play starts on a PIXEL song', (await side()) === 'pixel');
const seq = [await side()];
for (let i = 0; i < 4; i++) { await page.click('#tnext'); await page.waitForTimeout(900); seq.push(await side()); }
ok('mix pattern pixel,reality,reality,pixel,reality (' + seq.join(',') + ')', seq.join(',') === 'pixel,reality,reality,pixel,reality');
const first = await page.locator('#npt').textContent();
ok('a REALITY song is on deck (' + first + ')', !!first && first !== 'PICK A SONG');
await page.screenshot({ path: path.join(shots, 'phone-mix.png') });
// MIX off: next stays on the same side
await page.click('#mixtgl'); await page.waitForTimeout(300);
ok('AUTO-MIX switch turns off', (await page.locator('#mixtgl').getAttribute('aria-checked')) === 'false');
const s0 = await side();
for (let i = 0; i < 3; i++) { await page.click('#tnext'); await page.waitForTimeout(700); }
ok('with MIX off the side does not change', (await side()) === s0);
// SHUFFLE on: persists and next still plays
await page.click('#shuftgl'); await page.waitForTimeout(300);
ok('SHUFFLE switch turns on', (await page.locator('#shuftgl').getAttribute('aria-checked')) === 'true');
const seen = new Set();
for (let i = 0; i < 8; i++) { await page.click('#tnext'); await page.waitForTimeout(500); seen.add(await page.locator('#npt').textContent()); }
ok('shuffle plays several different songs (' + seen.size + ')', seen.size >= 3);
const saved = await page.evaluate(() => [localStorage.getItem('hx.mix'), localStorage.getItem('hx.shuffle')].join());
ok('toggles are saved (' + saved + ')', saved === 'false,true');
await page.reload({ waitUntil: 'domcontentloaded' });
await page.click('#skip'); await page.waitForTimeout(3200);
await page.click('#songs'); await page.waitForTimeout(700);
ok('toggles restored after reload', (await page.locator('#mixtgl').getAttribute('aria-checked')) === 'false' && (await page.locator('#shuftgl').getAttribute('aria-checked')) === 'true');
await browser.close(); server.close();
console.log(results.join('\n'));
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
process.exitCode = errors.length || results.some((r) => r.startsWith('FAIL ')) ? 1 : 0;
