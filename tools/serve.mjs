// Tiny static server for local testing: node tools/serve.mjs [port]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const types = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.png': 'image/png' };
const port = Number(process.argv[2]) || 5173;
http.createServer((req, res) => {
  let p = path.join(dist, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(dist)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(p).pipe(res);
}).listen(port, () => console.log('http://localhost:' + port));
