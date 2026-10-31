// Optional visual smoke test (needs Playwright + Chromium, e.g. in the Claude workspace): node tools/browser-test.mjs
// Serves dist/, walks through the intro, taps Kujo, and writes screenshots to ./shots (git-ignored).
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
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
const errors = [];
for (const [name, vp] of [['desktop', { width: 1280, height: 720 }], ['phone', { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport: vp });
  page.on('pageerror', (e) => errors.push(name + ': ' + e.message + ' @ ' + (e.stack||'').split('\n').slice(1,3).join(' ')));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) errors.push(name + ' console: ' + m.text()); });
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded' });
  for (const [label, ms] of [['1-greeting', 1000], ['2-suck', 2600], ['3-title', 4000], ['4-arrived', 9600]]) {
    await page.waitForTimeout(ms - (page._t || 0));
    page._t = ms;
    await page.screenshot({ path: path.join(shots, `${name}-${label}.png`) });
  }
  // tap Kujo (centre-bottom) a couple of times
  const box = await page.locator('#stage').boundingBox();
  await page.mouse.click(vp.width / 2, vp.height * 0.74);
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(shots, `${name}-5-tap.png`) });
  if (name === 'desktop') {
    for (let i = 0; i < 6; i++) {
      await page.click('#next');
      await page.waitForTimeout(900);
      await page.screenshot({ path: path.join(shots, `variant-${i + 1}.png`) });
    }
  }
  await page.click('#play');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(shots, `${name}-6-music.png`) });
  await page.close();
}
await browser.close();
server.close();
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
process.exitCode = errors.length ? 1 : 0;
