// Copies the Lok Pixel Library source into ./lib so this repo builds on its own (Vercel never needs the library repo).
// Usage: node tools/sync-lib.mjs [path-to-library]   (default ../lokspixellibrary-)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(process.argv[2] || path.join(here, '..', '..', 'lokspixellibrary-'), 'src');
const dst = path.join(here, '..', 'lib');
if (!fs.existsSync(src)) { console.error('library src not found:', src); process.exit(1); }
fs.rmSync(dst, { recursive: true, force: true });
fs.cpSync(src, dst, { recursive: true });
console.log('synced', src, '->', dst);
