import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const base=process.env.HAICUU_BASE_URL||'http://localhost:5173';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const out=path.resolve(process.env.HAICUU_QA_DIR||path.join(import.meta.dirname,'../qa/kujo'));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:430,height:860},isMobile:true,hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.click('#skip');await page.waitForTimeout(1900);await page.waitForFunction(()=>document.querySelector('#kujo-sprite').dataset.ready==='true');
 const geo=await page.evaluate(()=>{const c=document.querySelector('#kujo-sprite'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let bottom=0;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(d[(y*c.width+x)*4+3]>127)bottom=Math.max(bottom,y);const stage=document.querySelector('#stage'),r=stage.getBoundingClientRect();return {bottom:bottom*c.getBoundingClientRect().height/c.height,scale:r.width/stage.width};});
 const x=344,y=Math.round(geo.bottom-30),crop=()=>page.evaluate(({x,y})=>{const c=document.querySelector('#stage'),r=c.getBoundingClientRect(),s=r.width/c.width;return [...c.getContext('2d').getImageData(Math.floor((x-r.left)/s)-5,Math.floor(y/s)-8,12,12).data].join(',');},{x,y});
 const before=await crop();await page.touchscreen.tap(x,y);await page.waitForTimeout(350);assert.notEqual(await crop(),before,'Grass tap must produce visible feedback');await page.screenshot({path:path.join(out,'phone-planted.png')});
 const point=await page.evaluate(()=>{const c=document.querySelector('#stage'),r=c.getBoundingClientRect(),s=r.width/c.width,d=c.getContext('2d').getImageData(0,0,c.width,c.height).data,t=document.querySelector('#toy-sprite').getContext('2d').getImageData(0,0,c.width,c.height).data;for(let y=10;y<c.height*.3;y++)for(let x=10;x<c.width-10;x++){const i=(y*c.width+x)*4;if(d[i]>170&&d[i+2]>135&&d[i]>d[i+1]*1.03&&t[i+3]<10)return {x:r.left+(x+.5)*s,y:(y+.5)*s};}return null;});assert.ok(point,'Visible canopy required');
 const cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x+i*5,y:point.y+i*3}]});await page.waitForTimeout(20);}await page.screenshot({path:path.join(out,'phone-petal-pull.png')});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await page.locator('#scrollbtn').innerText(),'▲','Petal drag must retain camera');
 await page.touchscreen.tap(402,Math.round(geo.bottom-46*geo.scale));await page.waitForTimeout(200);await page.screenshot({path:path.join(out,'phone-pet-llama.png')});assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(out,'world-gestures.json'),JSON.stringify({testedAt:new Date().toISOString(),input:'Chromium touch events',grassFeedback:true,canopyPullRetainsCamera:true,llamaPetJourney:true,browserErrors:errors},null,2)+'\n');console.log('World gestures passed: grass feedback, canopy pull, llama pet journey; no runtime errors.');
}finally{await browser.close();}
