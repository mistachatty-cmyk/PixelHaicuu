(function(){
  var $=function(id){return document.getElementById(id)};
  var tracks=[],idx=0,playing=false,shuffle=false,repeat=true,order=[];
  var au=new Audio();au.preload="metadata";
  var stage=$("stage"),list=$("list"),wave=$("wave"),ctx=wave.getContext("2d");
  var master=0.85;

  function fmt(s){s=Math.max(0,s|0);return (s/60|0)+":"+("0"+(s%60)).slice(-2)}
  function hueOf(i){return 160+i*17}
  function el(tag,cls,html){var e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e}

  function build(){
    tracks.forEach(function(t,i){
      var d=el("div","disc");d.style.setProperty("--dh",hueOf(i));d.setAttribute("role","button");d.setAttribute("aria-label","Track "+(i+1)+": "+t.title);
      var b=el("div","bob"),s=el("div","spin");
      b.style.cssText="position:absolute;inset:0;animation-delay:"+(-i*0.7)+"s";
      s.appendChild(el("div","face"));s.appendChild(el("div","glint"));s.appendChild(el("div","num",("0"+(i+1)).slice(-2)));
      b.appendChild(s);d.appendChild(b);
      d.addEventListener("click",function(){ i===idx?toggle():select(i,true) });
      stage.appendChild(d);
      var li=el("li",null,'<span class="i"><span class="n">'+(i+1)+'</span><span class="eq"><i></i><i></i><i></i></span></span><span>'+esc(t.title)+'</span><span class="d">'+fmt(t.duration)+'</span>');
      li.addEventListener("click",function(){ i===idx?toggle():select(i,true) });
      list.appendChild(li);
    });
    $("count").textContent=tracks.length+" tracks";
  }
  function esc(s){return s.replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}

  function layout(){
    var narrow=window.innerWidth<640,step=narrow?0.62:0.72;
    var discs=stage.children,w=discs[0]?discs[0].offsetWidth:200;
    for(var i=0;i<discs.length;i++){
      var o=i-idx,a=Math.abs(o),vis=a<=(narrow?1:3);
      var x=o*w*step*(a>1?0.8:1);
      var sc=1-Math.min(a,3)*0.17, ry=Math.max(-55,Math.min(55,-o*28));
      discs[i].style.transform="translate3d("+x+"px,0,"+(-a*90)+"px) rotateY("+ry+"deg) scale("+sc+")";
      discs[i].style.opacity=vis?(a===0?1:Math.max(.18,.62-a*.18)):0;
      discs[i].style.pointerEvents=vis?"auto":"none";
      discs[i].style.zIndex=100-a;
      discs[i].classList.toggle("on",a===0);
      discs[i].classList.toggle("paused",!playing);
    }
    var rows=list.children;
    for(var j=0;j<rows.length;j++){rows[j].classList.toggle("cur",j===idx);rows[j].classList.toggle("playing",j===idx&&playing)}
    document.documentElement.style.setProperty("--hue",hueOf(idx));
  }

  function applyVol(){
    var g=Math.pow(10,(tracks[idx]?tracks[idx].gainDb:0)/20);
    au.volume=Math.max(0,Math.min(1,master*g));
  }

  function select(i,go){
    idx=(i+tracks.length)%tracks.length;
    var t=tracks[idx];
    au.src=t.src;applyVol();
    $("title").textContent=t.title;
    $("meta").textContent="TRACK "+("0"+(idx+1)).slice(-2)+" / "+("0"+tracks.length).slice(-2)+"  ·  "+fmt(t.duration);
    $("dur").textContent=fmt(t.duration);$("cur").textContent="0:00";
    if("mediaSession" in navigator){try{navigator.mediaSession.metadata=new MediaMetadata({title:t.title,artist:"Cuu Jo",album:"Cuu Jo's Mixverse"})}catch(e){}}
    if(go){au.play().catch(function(){})}
    layout();drawWave();
  }
  function toggle(){ if(au.paused){au.play().catch(function(){})} else au.pause() }
  function nextIdx(dir){
    if(shuffle&&tracks.length>1){var n;do{n=Math.floor(Math.random()*tracks.length)}while(n===idx);return n}
    return idx+dir;
  }

  au.addEventListener("play",function(){playing=true;setIco();layout()});
  au.addEventListener("pause",function(){playing=false;setIco();layout()});
  au.addEventListener("timeupdate",function(){$("cur").textContent=fmt(au.currentTime);drawWave()});
  au.addEventListener("ended",function(){
    if(!repeat&&!shuffle&&idx===tracks.length-1){playing=false;setIco();layout();return}
    select(nextIdx(1),true);
  });
  function setIco(){
    $("ico").innerHTML=playing?'<path d="M6 5h4v14H6zm8 0h4v14h-4z"/>':'<path d="M8 5v14l11-7z"/>';
    $("play").setAttribute("aria-label",playing?"Pause":"Play");
  }

  /* waveform */
  function drawWave(){
    var r=window.devicePixelRatio||1,w=wave.clientWidth,h=wave.clientHeight;
    if(wave.width!==(w*r|0)){wave.width=w*r|0;wave.height=h*r|0}
    ctx.setTransform(r,0,0,r,0,0);ctx.clearRect(0,0,w,h);
    var t=tracks[idx];if(!t)return;
    var p=t.peaks,n=p.length,bw=w/n,prog=au.duration?au.currentTime/au.duration:0;
    var hue=hueOf(idx);
    for(var i=0;i<n;i++){
      var bh=Math.max(3,p[i]*(h-6)),x=i*bw+bw*.18,y=(h-bh)/2;
      ctx.fillStyle=(i/n)<prog?"hsl("+hue+",85%,70%)":"rgba(236,254,251,.22)";
      var rw=bw*.64,rad=Math.min(rw/2,3);
      ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,rw,bh,rad);else ctx.rect(x,y,rw,bh);ctx.fill();
    }
  }
  var seeking=false;
  function seekAt(e){
    var b=wave.getBoundingClientRect(),f=Math.max(0,Math.min(1,(e.clientX-b.left)/b.width));
    if(au.duration){au.currentTime=f*au.duration;drawWave()}
  }
  wave.addEventListener("pointerdown",function(e){seeking=true;wave.setPointerCapture(e.pointerId);seekAt(e)});
  wave.addEventListener("pointermove",function(e){if(seeking)seekAt(e)});
  wave.addEventListener("pointerup",function(){seeking=false});

  /* controls */
  $("play").onclick=toggle;
  $("next").onclick=function(){select(nextIdx(1),true)};
  $("prev").onclick=function(){ if(au.currentTime>3){au.currentTime=0}else select(nextIdx(-1),true) };
  $("shuf").onclick=function(){shuffle=!shuffle;this.setAttribute("aria-pressed",shuffle)};
  $("rep").onclick=function(){repeat=!repeat;this.setAttribute("aria-pressed",repeat)};
  $("vol").oninput=function(){master=+this.value;applyVol()};
  document.addEventListener("keydown",function(e){
    if(e.target.tagName==="INPUT")return;
    if(e.code==="Space"){e.preventDefault();toggle()}
    else if(e.code==="ArrowRight"){select(nextIdx(1),true)}
    else if(e.code==="ArrowLeft"){select(nextIdx(-1),true)}
  });
  if("mediaSession" in navigator){
    try{
      navigator.mediaSession.setActionHandler("play",toggle);navigator.mediaSession.setActionHandler("pause",toggle);
      navigator.mediaSession.setActionHandler("nexttrack",function(){select(nextIdx(1),true)});
      navigator.mediaSession.setActionHandler("previoustrack",function(){select(nextIdx(-1),true)});
    }catch(e){}
  }
  window.addEventListener("resize",function(){layout();drawWave()});
  var sx=null;
  stage.addEventListener("pointerdown",function(e){sx=e.clientX});
  stage.addEventListener("pointerup",function(e){
    if(sx==null)return;var dx=e.clientX-sx;sx=null;
    if(Math.abs(dx)>60){e.preventDefault();select(idx+(dx<0?1:-1),playing)}
  });

  fetch("manifest.json").then(function(r){return r.json()}).then(function(m){
    tracks=m.tracks;build();select(0,false);
    requestAnimationFrame(function(){layout();drawWave()});
  }).catch(function(){
    stage.innerHTML='<div class="err">Could not load the track list.</div>';
  });
  window.LokJukebox={select:select,toggle:toggle};
})();
