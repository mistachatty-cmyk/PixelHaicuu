// Fails the build if anything that could expose or enable decompiling the code is in dist/.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const bad = [];
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
  const p = path.join(d, e.name);
  if (e.isDirectory()) return walk(p);
  if (/\.(map|ts|tsx|jsx)$/.test(e.name) || /service-?worker|sw\.js|manifest\.webmanifest/i.test(e.name)) bad.push('forbidden file: ' + p);
  if (/\.(html|js|css)$/.test(e.name)) {
    const t = fs.readFileSync(p, 'utf8');
    if (/sourceMappingURL/.test(t)) bad.push('sourceMappingURL in ' + p);
    if (/serviceWorker\s*\.\s*register|navigator\.serviceWorker/.test(t)) bad.push('service worker registration in ' + p);
    if (/console\.(log|debug|trace)/.test(t)) bad.push('console call left in ' + p);
    if (/\/Users\/|\/home\/|node_modules/.test(t)) bad.push('local path leaked in ' + p);
  }
});
if (!fs.existsSync(path.join(dist, 'index.html'))) bad.push('dist/index.html missing');
else walk(dist);
if (bad.length) { console.error('VERIFY FAILED\n' + bad.join('\n')); process.exit(1); }
console.log('dist verified: no source maps, no service worker, no console calls, no local paths');
