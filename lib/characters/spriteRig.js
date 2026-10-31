// Registered illustrated parts. Source models stay outside the page build.
import { Spring } from '../core/spring.js';
import { rand } from '../core/math.js';
import { SpriteMesh } from './spriteMesh.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function loadImage(src){return new Promise((resolve,reject)=>{const im=new Image();im.decoding='async';im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('Unable to load character artwork'));im.src=src;});}

export class SpriteLook {
  constructor(manifest,images){
    if(!Array.isArray(manifest.canvas)||manifest.canvas.length!==2||manifest.canvas.some(n=>!Number.isFinite(n)||n<=0)||!Array.isArray(manifest.seat)||!Array.isArray(manifest.layers))throw new Error('Invalid character manifest');
    this.m=manifest;this.id=manifest.id;this.name=manifest.name||manifest.id;this.theme=manifest.theme||null;
    this.aura=manifest.aura||'#ff7fbc';this.canvas=manifest.canvas;this.seat=manifest.seat;
    this.heightStage=manifest.heightStage||78;this.hitbox=manifest.hit||[0,0,...manifest.canvas];this.images=images;this.layers=manifest.layers;
    this.gazeX=new Spring(100,20);this.gazeY=new Spring(100,20);this.reduced=false;
    this.lag={};for(const l of this.layers){const lag=clamp(l.motion?.lag||0,0,1);this.lag[l.id]={y:new Spring(220-lag*150,18),r:new Spring(180-lag*120,16)};}
    this.blinkT=rand(2.5,5);this.blink=0;this.expr='calm';
    this.corrected=true;this.mesh=null;
  }
  static async load(manifestUrl,{parts=false}={}){
    const response=await fetch(manifestUrl,{cache:'no-store'});if(!response.ok)throw new Error('Character manifest unavailable');
    const m=await response.json(),base=new URL('.',new URL(manifestUrl,document.baseURI));
    const images={},jobs=[];
    for(const l of (!m.surface||parts?m.layers:[])||[]){
      if(l.src)jobs.push(loadImage(new URL(l.src,base).href).then(im=>{images[l.id]=im;}));
      if(l.set){images[l.id]={};for(const [key,src]of Object.entries(l.set))jobs.push(loadImage(new URL(src,base).href).then(im=>{images[l.id][key]=im;}));}
    }
    if(m.surface){
      images.surface={};const unique=new Map();
      for(const [color,states]of Object.entries(m.surface.colors)){
        images.surface[color]={};
        for(const [state,src]of Object.entries(states)){
          if(!unique.has(src))unique.set(src,loadImage(new URL(src,base).href));
          jobs.push(unique.get(src).then(im=>{images.surface[color][state]=im;}));
        }
      }
    }
    await Promise.all(jobs);
    const validate=group=>{for(const im of Object.values(group)){if(im.width){if(im.width!==m.canvas[0]||im.height!==m.canvas[1])throw new Error('Character layers must share a canvas');}else validate(im);}};
    validate(images);
    return new SpriteLook(m,images);
  }
  setGaze(x=0,y=0){this.gazeX.t=clamp(x,-1,1);this.gazeY.t=clamp(y,-1,1);}
  reset(){this.gazeX.snap();this.gazeY.snap();for(const s of Object.values(this.lag)){s.y.snap();s.r.snap();}this.blink=0;}
  update(dt,pose,{reducedMotion=false}={}){
    this.reduced=reducedMotion;dt=clamp(dt,0,1/20);
    if(reducedMotion){this.reset();this.expr=pose.expr;return;}
    this.gazeX.step(dt);this.gazeY.step(dt);
    this.blinkT-=dt;if(this.blinkT<=0){this.blink=.12;this.blinkT=rand(2.5,5);}this.blink=Math.max(0,this.blink-dt);
    const head=this.headMotion(pose);
    for(const l of this.layers){if(!l.motion?.follow)continue;const s=this.lag[l.id];s.y.t=head.dy;s.r.t=head.r;s.y.step(dt);s.r.step(dt);}
    this.expr=pose.expr;
  }
  headMotion(pose){
    if(this.reduced)return {dx:0,dy:0,r:0};
    const u=this.canvas[1]/this.heightStage;
    const limit=this.m.surface?10:3*u,rotation=this.m.surface ? .05 : .085;
    return {dx:this.gazeX.x*5,dy:clamp(((pose.nod||0)*.55-(pose.bounce||0)*.15+(pose.breath||0)*.2)*u+this.gazeY.x*3,-limit,limit),r:clamp((pose.sway||0)*.02+(pose.nod||0)*.006+this.gazeX.x*.025,-rotation,rotation)};
  }
  exprKeys(pose){
    if(pose.lift>.5)return {eyes:'closed',mouth:'calm'};
    const e=this.m.expressions?.[pose.expr]||{eyes:'open',mouth:'calm'};
    return this.blink>0&&e.eyes==='open'?{...e,eyes:'closed'}:e;
  }
  draw(ctx,pose,x,y,s){
    const ox=x-this.seat[0]*s,oy=y-this.seat[1]*s,head=this.headMotion(pose),keys=this.exprKeys(pose),bounce=this.reduced?0:clamp(pose.bounce||0,-3,3);
    if(this.m.surface&&this.images.surface&&!this.drawParts){
      const watching=this.m.species==='llama'&&!this.reduced&&Math.hypot(this.gazeX.x,this.gazeY.x)>.15;
      const state=pose.lift>.5||this.blink>0?'closed':pose.expr==='shock'||watching?'wide':pose.expr==='laugh'?'closed':'calm';
      const colors=this.images.surface[this.corrected?'corrected':'original'];
      if(!this.mesh){try{this.mesh=new SpriteMesh(this.m);}catch(error){this.rendererError=error.message;this.mesh=new SpriteMesh(this.m,{forceCanvas:true});}}
      this.mesh.awake=state!=='closed';
      const image=this.mesh.render(colors[state]||colors.calm,pose,head,[this.gazeX.x,this.gazeY.x],this.lag.headwear?.y.x||0,this.reduced);
      ctx.imageSmoothingEnabled=false;ctx.drawImage(image,Math.round(ox),Math.round(oy),this.canvas[0]*s,this.canvas[1]*s);return;
    }
    for(const l of this.layers){
      let im=this.images[l.id];if(!im)continue;
      if(l.set){const key=keys[l.id]||(l.id==='mouth'?'calm':'open');im=im[key]||im.open||im.calm||Object.values(im)[0];}
      const mo=l.motion||{};let dx=0,dy=0,r=0,sx=1,sy=1;
      if(mo.bounce){sy=1+bounce*.009*mo.bounce;sx=1-bounce*.004*mo.bounce;}
      else if(mo.follow){const lg=this.lag[l.id],mix=this.reduced?0:clamp(mo.lag||0,0,1);dx=head.dx;dy=head.dy*(1-mix)+lg.y.x*mix;r=(head.r*(1-mix)+lg.r.x*mix)*(mo.sway||1);}
      else if(mo.nod){dx=head.dx;dy=head.dy;r=head.r*(mo.tilt?1:.5);}
      if(mo.gaze&&!this.reduced){dx+=this.gazeX.x*2;dy+=this.gazeY.x;}
      const [px,py]=l.pivot;
      ctx.save();ctx.translate(Math.round(ox+(px+dx)*s),Math.round(oy+(py+dy)*s));if(r)ctx.rotate(r);if(sx!==1||sy!==1)ctx.scale(sx,sy);
      ctx.imageSmoothingEnabled=false;ctx.drawImage(im,-px*s,-py*s,this.canvas[0]*s,this.canvas[1]*s);ctx.restore();
    }
  }
  destroy(){this.mesh?.destroy();this.mesh=null;}
}

export class SpriteOverlay {
  constructor({canvas,stage,world}){this.canvas=canvas;this.stage=stage;this.world=world;this.ctx=canvas.getContext('2d');this.resize=this.resize.bind(this);this.resize();if(typeof window!=='undefined')window.addEventListener('resize',this.resize);}
  resize(){this.dpr=Math.min(2,globalThis.devicePixelRatio||1);const w=globalThis.innerWidth||800,h=globalThis.innerHeight||600;this.canvas.width=Math.round(w*this.dpr);this.canvas.height=Math.round(h*this.dpr);this.canvas.style.width=w+'px';this.canvas.style.height=h+'px';}
  clear(){this.ctx.setTransform(1,0,0,1,0,0);this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);}
  rectOf(look,kujo){const st=this.stage,rc=st.canvas.getBoundingClientRect(),s=look.heightStage*st.scale/look.canvas[1];const [hx,hy,w,h]=look.hitbox;return {x:rc.left+kujo.x*st.scale+(hx-look.seat[0])*s,y:rc.top+(kujo.y-Math.round(this.world.cam.x))*st.scale+(hy-look.seat[1])*s,w:w*s,h:h*s};}
  draw(look,kujo,dt,options){this.clear();if(!look)return;const st=this.stage,rc=st.canvas.getBoundingClientRect(),pose=kujo.pose();look.update(dt,pose,options);look.draw(this.ctx,pose,Math.round((rc.left+kujo.x*st.scale)*this.dpr),Math.round((rc.top+(kujo.y-Math.round(this.world.cam.x))*st.scale)*this.dpr),look.heightStage*st.scale/look.canvas[1]*this.dpr);}
  destroy(){if(typeof window!=='undefined')window.removeEventListener('resize',this.resize);this.clear();}
}
