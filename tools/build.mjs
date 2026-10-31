// Bundles src/main.js with esbuild (minified IIFE, no source maps, no console) and inlines it into dist/index.html.
// Nothing readable or mappable ships: one minified script, no .map files, no service worker.
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

const res = await build({
  entryPoints: [path.join(root, 'src/main.js')],
  bundle: true, minify: true, format: 'iife', target: 'es2020', write: false,
  sourcemap: false, legalComments: 'none', drop: ['console', 'debugger'], mangleProps: undefined,
});
const js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = fs.readFileSync(path.join(root, 'src/index.template.html'), 'utf8');
if (!html.includes('/*INLINE_JS*/')) throw new Error('template is missing /*INLINE_JS*/');
fs.writeFileSync(path.join(dist, 'index.html'), html.replace('/*INLINE_JS*/', () => js));
// Cuu Jo's Mixverse jukebox page (dist/mixverse/index.html): same rules, minified script + css inlined, no source maps.
if (fs.existsSync(path.join(root, 'src/mixverse.js'))) {
  const { build: bundle, transform } = await import('esbuild');
  const mj = await bundle({
    entryPoints: [path.join(root, 'src/mixverse.js')],
    bundle: true, minify: true, format: 'iife', target: 'es2020', write: false,
    sourcemap: false, legalComments: 'none', drop: ['console', 'debugger'],
  });
  const mcss = await transform(fs.readFileSync(path.join(root, 'src/mixverse.css'), 'utf8'), { loader: 'css', minify: true, legalComments: 'none' });
  const mhtml = fs.readFileSync(path.join(root, 'src/mixverse.template.html'), 'utf8')
    .replace('/*INLINE_CSS*/', () => mcss.code.replace(/<\/style/gi, '<\\/style'))
    .replace('/*INLINE_JS*/', () => mj.outputFiles[0].text.replace(/<\/script/gi, '<\\/script'));
  fs.mkdirSync(path.join(dist, 'mixverse'), { recursive: true });
  fs.writeFileSync(path.join(dist, 'mixverse', 'index.html'), mhtml);
  console.log('built dist/mixverse/index.html', (mhtml.length / 1024).toFixed(1) + ' KB');
}
if (fs.existsSync(path.join(root, 'public'))) {
  fs.cpSync(path.join(root, 'public'), dist, { recursive: true, filter: (s) => !s.endsWith('README.md') });
}
console.log('built dist/index.html', (fs.statSync(path.join(dist, 'index.html')).size / 1024).toFixed(1) + ' KB');
