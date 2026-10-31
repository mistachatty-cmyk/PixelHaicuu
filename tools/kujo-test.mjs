// Full browser story: page -> manifests -> registered PNGs -> reactions/controls/reader.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'qa/kujo');fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const reports=[];
async function componentRect(page){return page.evaluate(()=>{
 const cv=document.querySelector('#kujo-sprite'),{width:w,height:h}=cv,d=cv.getContext('2d').getImageData(0,0,w,h).data,seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let best=null;
 for(let i=0;i<w*h;i++){if(seen[i]||d[i*4+3]<100)continue;let read=0,write=1,x0=w,y0=h,x1=0,y1=0;queue[0]=i;seen[i]=1;
  while(read<write){const k=queue[read++],x=k%w,y=Math.floor(k/w);x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);for(const n of [x>0?k-1:-1,x<w-1?k+1:-1,y>0?k-w:-1,y<h-1?k+w:-1])if(n>=0&&!seen[n]&&d[n*4+3]>=100){seen[n]=1;queue[write++]=n;}}
  if(x0<=w*.5&&x1>=w*.5&&y1>h*.5&&(!best||write>best.count))best={x:x0,y:y0,w:x1-x0+1,h:y1-y0+1,count:write};
 }
 const s=cv.getBoundingClientRect().width/w;return best&&{x:best.x*s,y:best.y*s,w:best.w*s,h:best.h*s};
});}
try{
 for(const [name,width,height]of [['phone',430,860],['desktop',1280,720],['compact',320,568],['landscape',844,390]]){
  const page=await browser.newPage({viewport:{width,height}}),errors=[],failed=[],remote=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text()+' '+m.location().url);});page.on('response',r=>{if(r.status()>=400)failed.push(r.status()+' '+r.url());});page.on('request',r=>{if(!r.url().startsWith('http://localhost:5173')&&!r.url().startsWith('data:'))remote.push(r.url());});
  await page.goto('http://localhost:5173');await page.click('#skip');await page.waitForFunction(()=>document.querySelector('#kujo-sprite').dataset.ready==='true');await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(1900);
  const seen=[];
  for(let i=0;i<7;i++){
   await page.waitForFunction(()=>document.querySelector('#kujo-sprite').dataset.ready==='true');
   const id=await page.locator('#kujo-sprite').getAttribute('data-look');seen.push(id);
   await page.screenshot({path:path.join(out,name+'-'+id+'.png')});
   const box=await componentRect(page),hud=await page.locator('#hud').boundingBox();assert.ok(box&&box.y>=0&&box.y+box.h<hud.y-5,name+' '+id+' overlaps controls: '+JSON.stringify({box,hud}));
   await page.click('#next');await page.waitForTimeout(180);
  }
  assert.equal(new Set(seen).size,7);
  const before=await page.locator('#look').innerText(),box=await componentRect(page),cx=width/2,cy=box.y+box.h*.62;
  await page.mouse.move(cx,cy);await page.mouse.down();await page.mouse.move(cx+35,cy-22,{steps:8});await page.mouse.up();assert.equal(await page.locator('#look').innerText(),before,'Drag must not change look');assert.equal(await page.locator('#scrollbtn').innerText(),'▲');
  await page.mouse.move(cx,cy);await page.mouse.down();await page.waitForTimeout(850);await page.screenshot({path:path.join(out,name+'-om.png')});await page.mouse.up();assert.equal(await page.locator('#look').innerText(),before,'Hold must not change look');
  await page.click('#bibtn');await page.waitForFunction(()=>document.querySelector('#bvt').textContent.length>20);assert.equal(await page.locator('#lok-bible-download').getAttribute('href'),'https://gsix.online/lokbounce');
  await page.locator('#lok-bible-download').focus();await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'bx','Reader focus wraps');
  await page.waitForTimeout(450);await page.screenshot({path:path.join(out,name+'-reader.png')});await page.keyboard.press('Escape');await page.waitForTimeout(450);
  await page.click('#songs');await page.locator('.trk').nth(2).click();await page.waitForTimeout(700);assert.equal(await page.locator('#look').innerText(),'MAROON MASK');await page.screenshot({path:path.join(out,name+'-music.png')});await page.click('#tx');await page.waitForTimeout(450);
  const credit=await page.locator('#credit').boundingBox(),hud=await page.locator('#hud').boundingBox();assert.ok(credit.y>=hud.y+hud.height,'Credit must be below controls');
  assert.deepEqual(errors,[],name+' browser errors');assert.deepEqual(failed,[],name+' failed assets');assert.deepEqual(remote,[],name+' unexpected external request');
  reports.push({viewport:name,size:[width,height],looks:seen,dragKeepsLook:true,holdKeepsLook:true,readerLink:true,focusTrap:true,musicChangesLook:true,footerBelowControls:true,browserErrors:errors,failedAssets:failed,externalRequests:remote});await page.close();
 }
 // A missing look must keep the coded fallback usable, including fast look changes while loading.
 const fallback=await browser.newPage({viewport:{width:430,height:860}});const runtimeErrors=[];fallback.on('pageerror',e=>runtimeErrors.push(e.message));await fallback.route('**/kujo/studio/manifest.json',route=>route.fulfill({status:503,body:'Unavailable'}));await fallback.goto('http://localhost:5173');await fallback.click('#skip');await fallback.waitForTimeout(1800);for(let i=0;i<5;i++)await fallback.click('#next');await fallback.waitForTimeout(200);assert.equal(await fallback.locator('#kujo-sprite').getAttribute('data-look'),'studio');assert.equal(await fallback.locator('#kujo-sprite').getAttribute('data-ready'),'false');await fallback.screenshot({path:path.join(out,'fallback-studio.png')});await fallback.click('#next');await fallback.waitForFunction(()=>document.querySelector('#kujo-sprite').dataset.ready==='true');assert.deepEqual(runtimeErrors,[]);reports.push({fallback:'missing Studio manifest',codedRigRemains:true,recoveryOnNextLook:true,runtimeErrors});await fallback.close();
 const reduced=await browser.newPage({viewport:{width:430,height:860},reducedMotion:'reduce'});await reduced.goto('http://localhost:5173');await reduced.waitForFunction(()=>document.querySelector('#kujo-sprite').dataset.ready==='true'&&document.querySelector('#hud').classList.contains('on'));await reduced.waitForTimeout(2200);await reduced.mouse.move(10,10);const first=await reduced.locator('#kujo-sprite').evaluate(c=>c.toDataURL());await reduced.mouse.move(420,400);await reduced.waitForTimeout(350);const second=await reduced.locator('#kujo-sprite').evaluate(c=>c.toDataURL());assert.equal(first,second,'Reduced motion must suppress pointer/idle motion');await reduced.screenshot({path:path.join(out,'phone-reduced.png')});reports.push({reducedMotion:true,stableCharacter:true});await reduced.close();
 const touch=await browser.newPage({viewport:{width:430,height:860},hasTouch:true,isMobile:true});const touchErrors=[];touch.on('pageerror',e=>touchErrors.push(e.message));await touch.goto('http://localhost:5173');await touch.click('#skip');await touch.waitForTimeout(1900);await touch.waitForFunction(()=>document.querySelector('#kujo-sprite').dataset.ready==='true');
 const cdp=await touch.context().newCDPSession(touch),tb=await componentRect(touch),tx=215,ty=Math.round(tb.y+tb.h*.58),touchBefore=await touch.locator('#look').innerText();
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:tx,y:ty}]});for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:tx+i*5,y:ty-i*3}]});await touch.waitForTimeout(20);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await touch.locator('#look').innerText(),touchBefore,'Finger drag must not change look');assert.equal(await touch.locator('#scrollbtn').innerText(),'▲');
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:tx,y:ty}]});await touch.waitForTimeout(800);await touch.screenshot({path:path.join(out,'phone-touch-om.png')});await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});assert.equal(await touch.locator('#look').innerText(),touchBefore,'Touch cancellation must not trigger tap');assert.deepEqual(touchErrors,[]);reports.push({touchInput:'Chromium CDP touchStart/move/end/cancel',dragKeepsLook:true,holdCancelKeepsLook:true,browserErrors:touchErrors});await touch.close();
}finally{await browser.close();}
fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({testedAt:new Date().toISOString(),story:'HaiCuu loads the registered character layers, renders seven looks, reacts to input and music, and opens the Lok Bible reader without a backend.',reports},null,2)+'\n');
console.log(JSON.stringify({verifiedViewports:4,looksPerViewport:7,fallback:true,reducedMotion:true,reports:reports.length}));
