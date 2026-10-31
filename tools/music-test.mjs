// Browser test for the song sheet + Pixel Q Music: node tools/music-test.mjs (Playwright + Chromium). Shots go to ./shots.
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
  r.writeHead(200, { 'content-type': ({'.json':'application/json','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.ttf':'font/ttf','.html':'text/html'})[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(r);
}).listen(0);
const port = server.address().port;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const errors = []; const results = [];
const ok = (n, v) => results.push((v ? 'PASS ' : 'FAIL ') + n);
for (const [name, vp] of [['desktop', { width: 1280, height: 720 }], ['phone', { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport: vp });
  page.on('pageerror', (e) => errors.push(name + ': ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|ERR_TUNNEL/.test(m.text())) errors.push(name + ' console: ' + m.text()); });
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded' });
  await page.click('#skip'); await page.waitForTimeout(3200);
  await page.click('#songs'); await page.waitForTimeout(700);
  await page.click('#spix'); await page.waitForTimeout(400);
  const n = await page.locator('.trk').count();
  ok(name + ' sheet lists 5 Pixel Q songs (' + n + ')', n === 5);
  await page.screenshot({ path: path.join(shots, `${name}-songs-1-sheet.png`) });
  const wanted = [['SAKURA HOUR', 'PINK MASK'], ['DREADLOCK DRIFT', 'MAROON MASK'], ['ALPACA AFTERNOON', 'Llamasté'], ['OM AT MIDNIGHT', 'ARTIST'], ['Llamasté LO-FI', 'PINK DREADS']];
  const idx = [1, 2, 3, 4, 0];
  for (let k = 0; k < idx.length; k++) {
    await page.locator('.trk').nth(idx[k]).click(); await page.waitForTimeout(1500);
    const tr = (await page.locator('#track').textContent()) || '';
    const look = (await page.locator('#look').textContent()) || '';
    ok(name + ' plays ' + wanted[k][0] + ' -> look ' + wanted[k][1], tr.includes(wanted[k][0]) && look === wanted[k][1]);
    if (k === 3) { await page.waitForTimeout(600); await page.screenshot({ path: path.join(shots, `${name}-songs-2-night.png`) }); }
  }
  await page.click('#tnext'); await page.waitForTimeout(700);
  ok(name + ' next song works', ((await page.locator('#track').textContent()) || '').includes('SAKURA'));
  await page.click('#tprev'); await page.waitForTimeout(500);
  ok(name + ' prev song works', ((await page.locator('#track').textContent()) || '').includes('Llamasté'));
  await page.click('#tx'); await page.waitForTimeout(600);
  ok(name + ' sheet closes', await page.locator('#tracks').isHidden());
  await page.click('#songs'); await page.waitForTimeout(700);
  await page.click('#play'); await page.waitForTimeout(400);
  ok(name + ' pause button', ((await page.locator('#play').textContent()) || '').includes('PLAY'));
  await page.screenshot({ path: path.join(shots, `${name}-songs-3-paused.png`) });
  await page.close();
}
await browser.close(); server.close();
console.log(results.join('\n'));
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
process.exitCode = errors.length || results.some(r => r.startsWith('FAIL ')) ? 1 : 0;
