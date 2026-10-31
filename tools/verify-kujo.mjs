// Shipping contract checks, using Node built-ins so the page remains independently buildable.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'../public/kujo');
const atlas=JSON.parse(fs.readFileSync(path.join(root,'atlas.json')));
assert.deepEqual(atlas.order,['classic','artist','pinkmask','maroon','straw','studio','llama']);
let images=0,strips=0,surfaces=0;
const resolve=(base,src)=>{assert.ok(typeof src==='string'&&!src.includes('..')&&!/^(?:https?:|data:|\/)/.test(src),'Art references must be local relative paths');return path.join(base,src);};
for(const id of atlas.order){
 const dir=path.join(root,id),m=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json')));
 assert.equal(m.id,id);assert.equal(m.v,1);assert.deepEqual(m.canvas,[512,512]);assert.deepEqual(m.seat,[256,500]);
 assert.ok(m.hit[0]>=0&&m.hit[1]>=0&&m.hit[0]+m.hit[2]<=512&&m.hit[1]+m.hit[3]<=512);
 const ids=new Set(m.layers.map(l=>l.id));for(const key of ['back_hair','torso','head','eyes','mouth','headwear','front_hair'])assert.ok(ids.has(key),id+' is missing '+key);
 assert.deepEqual(Object.keys(m.layers.find(l=>l.id==='eyes').set),['open','closed','happy','wide']);
 for(const l of m.layers){
  assert.ok(l.pivot.length===2&&l.pivot.every(n=>Number.isFinite(n)&&n>=0&&n<=512));
  for(const src of l.src?[l.src]:Object.values(l.set)){
   const b=fs.readFileSync(resolve(dir,src));assert.equal(b.subarray(1,4).toString(),'PNG');assert.equal(b.readUInt32BE(16),512);assert.equal(b.readUInt32BE(20),512);assert.equal(b[25],6,'Layer PNG must retain RGBA');images++;
  }
 }
 assert.equal(m.surface?.renderer,'connected-skin');
 for(const color of ['original','corrected'])for(const state of ['calm','closed','wide']){
  const b=fs.readFileSync(resolve(dir,m.surface.colors[color][state]));assert.equal(b.subarray(1,4).toString(),'PNG');assert.equal(b.readUInt32BE(16),512);assert.equal(b.readUInt32BE(20),512);assert.equal(b[25],6);surfaces++;
 }
 assert.deepEqual(Object.keys(m.rigAnimations),['idle','nod','om','laugh','shock','walk']);
 for(const a of Object.values(m.rigAnimations)){
  assert.equal(a.frames,4);assert.deepEqual(a.cell,[256,256]);
  const b=fs.readFileSync(resolve(dir,a.src));assert.equal(b.subarray(0,4).toString(),'RIFF');assert.equal(b.subarray(8,12).toString(),'WEBP');
  const off=b.indexOf(Buffer.from('VP8L'));assert.ok(off>=12,'Strips must use lossless WebP');const bits=b.readUInt32LE(off+9);assert.equal((bits&0x3fff)+1,1024);assert.equal(((bits>>>14)&0x3fff)+1,256);strips++;
 }
}
const rigAtlas=JSON.parse(fs.readFileSync(path.join(root,'rig-atlas.json')));for(const animations of Object.values(rigAtlas.looks))for(const a of Object.values(animations))assert.ok(fs.existsSync(resolve(root,a.src)));
console.log('Kujo verified: 7 looks, '+images+' registered RGBA layers, '+surfaces+' continuous color/expression skins, '+strips+' lossless four-cell strips.');
