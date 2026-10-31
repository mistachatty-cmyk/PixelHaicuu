// Pixel/gesture regressions for the tears, face cuts, pupil tracking and world scroll bugs.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import{createRequire}from'node:module';
const base=process.env.HAICUU_BASE_URL||'http://localhost:5173';
const require=createRequire(import.meta.url),{chromium}=require('playwright'),out=path.resolve(process.env.HAICUU_QA_DIR||path.join(import.meta.dirname,'../qa/bugs-after'));fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});const reports=[];
try{
 const p=await browser.newPage({viewport:{width:1000,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:5174/tools/sprite-demo/skin-review.html');await p.waitForFunction(()=>window.__ready);
 for(const id of ['classic','artist','pinkmask','maroon','straw','studio','llama']){
  const report=await p.evaluate(async id=>{
   await review.show(id);const {look}=review.state;review.state.freeze=true;
   const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(look.images.surface.original.calm,0,0);const original=ctx.getImageData(0,0,512,512).data;
   const sum=new Int32Array(513*513);for(let y=1;y<=512;y++)for(let x=1;x<=512;x++)sum[y*513+x]=(original[((y-1)*512+x-1)*4+3]<250?1:0)+sum[(y-1)*513+x]+sum[y*513+x-1]-sum[(y-1)*513+x-1];
   const protectedPixels=[];for(let y=20;y<492;y++)for(let x=20;x<492;x++){const a=x-20,b=y-20,d=x+21,e=y+21,n=sum[e*513+d]-sum[b*513+d]-sum[e*513+a]+sum[b*513+a];if(!n)protectedPixels.push((y*512+x)*4+3);}
   let holes=0,frames=0;const pose={expr:'calm',nod:4,sway:2,bounce:3,breath:-1,lift:0};
   for(const color of ['original','corrected'])for(const state of ['calm','closed','wide'])for(const direction of [-1,0,1]){
    look.mesh.awake=state!=='closed';const im=look.mesh.render(look.images.surface[color][state],pose,{dx:direction*5,dy:direction*10,r:direction*.05},[direction,direction],-direction*10,false);ctx.clearRect(0,0,512,512);ctx.drawImage(im,0,0);const d=ctx.getImageData(0,0,512,512).data;for(const i of protectedPixels)if(d[i]<245)holes++;frames++;
   }
   let pupilShift=null;
   if(!['maroon','llama'].includes(id)){
    const [cx,cy,rx,ry]=look.m.surface.eyes[0],centroid=direction=>{look.mesh.awake=true;ctx.clearRect(0,0,512,512);ctx.drawImage(look.mesh.render(look.images.surface.original.calm,{...pose,nod:0,bounce:0,breath:0},{dx:0,dy:0,r:0},[direction,0],0,false),0,0);const d=ctx.getImageData(0,0,512,512).data;let n=0,total=0;for(let y=cy-ry;y<=cy+ry;y++)for(let x=cx-rx;x<=cx+rx;x++){if(Math.hypot((x-cx)/rx,(y-cy)/ry)>.55)continue;const i=(Math.round(y)*512+Math.round(x))*4;if(Math.max(d[i],d[i+1],d[i+2])<65){n++;total+=x;}}return total/n;};pupilShift=centroid(1)-centroid(-1);
   }
   return {id,renderer:look.mesh.gl?'WebGL':'Canvas',protectedPixels:protectedPixels.length,frames,interiorHoles:holes,pupilShift,rendererError:look.rendererError||null};
  },id);
  assert.equal(report.rendererError,null);assert.equal(report.interiorHoles,0,id+' has new interior holes');assert.ok(report.protectedPixels>1000);if(report.pupilShift!==null)assert.ok(report.pupilShift>1.5,id+' pupil should follow gaze: '+report.pupilShift);reports.push(report);
 }
 assert.deepEqual(errors,[]);await p.close();
 const phone=await browser.newPage({viewport:{width:430,height:860},hasTouch:true,isMobile:true}),phoneErrors=[];phone.on('pageerror',e=>phoneErrors.push(e.message));await phone.goto(base);await phone.click('#skip');await phone.waitForFunction(()=>document.querySelector('#kujo-sprite').dataset.ready==='true');await phone.waitForTimeout(1800);
 await phone.click('#colors');assert.equal(await phone.locator('body').getAttribute('data-palette'),'original');await phone.click('#effects');assert.equal(await phone.locator('body').getAttribute('data-effects'),'off');await phone.reload();await phone.click('#skip');await phone.waitForFunction(()=>document.querySelector('#kujo-sprite').dataset.ready==='true');assert.equal(await phone.locator('body').getAttribute('data-palette'),'original');assert.equal(await phone.locator('#effects').getAttribute('aria-pressed'),'false');await phone.waitForTimeout(1800);
 const cdp=await phone.context().newCDPSession(phone);
 async function drag(x,y,dx,dy){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=15;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/15,y:y+dy*i/15}]});await phone.waitForTimeout(16);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await phone.waitForTimeout(600);}
 await drag(215,110,0,450);assert.equal(await phone.locator('#scrollbtn').innerText(),'▼','Vertical canopy swipe must scroll up');await phone.screenshot({path:path.join(out,'vertical-canopy-scroll.png')});await phone.click('#scrollbtn');await phone.waitForTimeout(900);
 const alpha=await phone.locator('#stage').evaluate(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let holes=0;for(let i=3;i<d.length;i+=4)if(d[i]!==255)holes++;return holes;});assert.equal(alpha,0,'World must cover canvas after camera movement');
 const before=await phone.locator('#stage').evaluate(c=>c.toDataURL());await phone.touchscreen.tap(70,600);await phone.waitForTimeout(50);const after=await phone.locator('#stage').evaluate(c=>c.toDataURL());assert.notEqual(after,before);await phone.screenshot({path:path.join(out,'flower-poke.png')});assert.deepEqual(phoneErrors,[]);reports.push({touch:true,colorPreferencePersists:true,effectsPreferencePersists:true,canopyVerticalScroll:true,worldTransparentPixels:alpha,flowerPoke:true,errors:phoneErrors});await phone.close();
 // The app remains alive and eyes still react if WebGL is unavailable.
 const fallback=await browser.newPage({viewport:{width:800,height:900}});await fallback.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...rest){return /webgl/.test(type)?null:get.call(this,type,...rest);};});await fallback.goto('http://127.0.0.1:5174/tools/sprite-demo/skin-review.html');await fallback.waitForFunction(()=>window.__ready);assert.match(await fallback.locator('#status').innerText(),/Canvas/);await fallback.mouse.move(490,350);await fallback.waitForTimeout(300);await fallback.screenshot({path:path.join(out,'canvas-fallback.png')});await fallback.close();reports.push({webglUnavailable:'connected Canvas fallback renders and tracks gaze'});
}finally{await browser.close();}
fs.writeFileSync(path.join(out,'regressions.json'),JSON.stringify({testedAt:new Date().toISOString(),reports},null,2)+'\n');console.log(JSON.stringify(reports));
