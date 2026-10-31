// A connected skin keeps illustrated clothes, hair and facial edges joined during motion.
// The original registered parts remain available to authoring tools.
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export class SpriteMesh {
  constructor(manifest,{forceCanvas=false}={}) {
    this.m = manifest;
    this.canvas = document.createElement('canvas');
    this.canvas.width = manifest.canvas[0]; this.canvas.height = manifest.canvas[1];
    const gl = forceCanvas?null:this.canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: true, preserveDrawingBuffer: true });
    this.gl = gl;
    if (!gl) { this.fallback = this.canvas.getContext('2d'); this.fallback.imageSmoothingEnabled=false; return; }
    const shader = (type, text) => { const s = gl.createShader(type); gl.shaderSource(s, text); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('Character renderer unavailable'); return s; };
    const program = gl.createProgram();
    gl.attachShader(program, shader(gl.VERTEX_SHADER, `precision highp float; attribute vec2 position; attribute vec2 uv; varying vec2 vUV; uniform vec2 size; void main(){vUV=uv;gl_Position=vec4(position/size*vec2(2.,-2.)+vec2(-1.,1.),0.,1.);}`));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, `precision highp float;
      varying vec2 vUV; uniform sampler2D art; uniform vec2 size; uniform vec2 gaze;
      uniform vec4 eyes; uniform vec4 radii; uniform vec4 mouth; uniform float awake; uniform float smile;
      void main(){vec2 p=vUV*size; vec2 q=p;
        float left=1.-smoothstep(.25,1.,length((p-eyes.xy)/radii.xy));
        float right=1.-smoothstep(.25,1.,length((p-eyes.zw)/radii.zw));
        q-=gaze*vec2(4.,2.5)*max(left,right)*awake;
        vec2 d=(p-mouth.xy)/mouth.zw;
        float lip=(1.-smoothstep(.55,1.,abs(d.x)))*(1.-smoothstep(.25,1.,abs(d.y)));
        q.y+=smile*2.2*d.x*d.x*lip;
        gl_FragColor=texture2D(art,q/size);
      }`));
    gl.linkProgram(program); if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program)||'Character renderer unavailable');
    gl.useProgram(program); this.program = program;
    this.uniforms = Object.fromEntries(['size', 'gaze', 'eyes', 'radii', 'mouth', 'awake', 'smile'].map(k => [k, gl.getUniformLocation(program, k)]));
    this.buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    for (const [name, offset] of [['position', 0], ['uv', 8]]) { const a = gl.getAttribLocation(program, name); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 16, offset); }
    this.n = 32; this.vertices = new Float32Array((this.n + 1) ** 2 * 4);
    const indices = [];
    for (let y = 0; y < this.n; y++) for (let x = 0; x < this.n; x++) { const a = y * (this.n + 1) + x, b = a + this.n + 1; indices.push(a, b, a + 1, a + 1, b, b + 1); }
    this.count = indices.length;
    const elements = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elements); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    this.texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    this.canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();this.lost=true;});
  }

  render(image, pose, head, gaze, lag, reduced) {
    const [w, h] = this.m.canvas, [px, py] = this.m.headPivot || [w / 2, h / 2];
    if(this.lost){this.gl=null;this.image=null;this.canvas=document.createElement('canvas');this.canvas.width=w;this.canvas.height=h;this.fallback=this.canvas.getContext('2d');this.fallback.imageSmoothingEnabled=false;this.lost=false;}
    if (!this.gl) {
      if(!this.eyeCanvas){this.eyeCanvas=document.createElement('canvas');this.eyeCanvas.width=w;this.eyeCanvas.height=h;this.eyeCtx=this.eyeCanvas.getContext('2d',{willReadFrequently:true});}
      if(image!==this.image){this.eyeCtx.clearRect(0,0,w,h);this.eyeCtx.drawImage(image,0,0);this.native=this.eyeCtx.getImageData(0,0,w,h);this.eyePixels=this.eyeCtx.createImageData(w,h);this.image=image;}
      const d=this.eyePixels.data,source=this.native.data;d.set(source);
      if(this.awake&&!reduced)for(const [cx,cy,rx,ry]of this.m.surface.eyes)for(let y=Math.floor(cy-ry);y<=cy+ry;y++)for(let x=Math.floor(cx-rx);x<=cx+rx;x++){
        const k=1-smooth(.25,1,Math.hypot((x-cx)/rx,(y-cy)/ry));if(!k)continue;
        const sx=clamp(Math.round(x-gaze[0]*4*k),0,w-1),sy=clamp(Math.round(y-gaze[1]*2.5*k),0,h-1),i=(y*w+x)*4,j=(sy*w+sx)*4;
        d[i]=source[j];d[i+1]=source[j+1];d[i+2]=source[j+2];d[i+3]=source[j+3];
      }
      this.eyeCtx.putImageData(this.eyePixels,0,0);
      const c = this.fallback; c.clearRect(0, 0, w, h);
      // Shared overlapping scan lines are a safe, connected fallback when WebGL is unavailable.
      for (let y = 0; y < h; y += 2) { const k = 1 - smooth(py - 12, py + 55, y), dy = head.dy * k; c.drawImage(this.eyeCanvas, 0, y, w, Math.min(4, h - y), head.dx * k + (py - y) * head.r * k, y + dy, w, Math.min(4, h - y)); }
      return this.canvas;
    }
    const gl = this.gl;
    gl.useProgram(this.program); gl.bindTexture(gl.TEXTURE_2D, this.texture);
    if (image !== this.image) { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image); this.image = image; }
    const r = head.r, cs = Math.cos(r), sn = Math.sin(r), body = reduced ? 0 : clamp((pose.bounce || 0) * .14 + (pose.breath || 0) * .7, -2.5, 2.5);
    for (let y = 0; y <= this.n; y++) for (let x = 0; x <= this.n; x++) {
      const bx = x / this.n * w, by = y / this.n * h, k = 1 - smooth(py - 10, py + 55, by), dx = bx - px, dy = by - py;
      const side = smooth(48, 90, Math.abs(dx)) * smooth(80, 150, by) * (1 - smooth(py + 12, py + 65, by));
      const hat = 1 - smooth(py - 125, py - 60, by);
      const extra = reduced ? 0 : clamp(lag - head.dy, -2, 2) * (.45 * side + .3 * hat);
      const i = (y * (this.n + 1) + x) * 4;
      this.vertices[i] = bx + k * (dx * cs - dy * sn - dx + head.dx) + extra * .35;
      this.vertices[i + 1] = by + k * (dx * sn + dy * cs - dy + head.dy) + body * (1 - smooth(py, h - 12, by)) + extra;
      this.vertices[i + 2] = x / this.n; this.vertices[i + 3] = y / this.n;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer); gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.DYNAMIC_DRAW);
    const eyes = this.m.surface.eyes, mouth = this.m.surface.mouth;
    gl.uniform2f(this.uniforms.size, w, h); gl.uniform2f(this.uniforms.gaze, reduced ? 0 : gaze[0], reduced ? 0 : gaze[1]);
    gl.uniform4f(this.uniforms.eyes, eyes[0][0], eyes[0][1], eyes[1][0], eyes[1][1]);
    gl.uniform4f(this.uniforms.radii, eyes[0][2], eyes[0][3], eyes[1][2], eyes[1][3]);
    gl.uniform4f(this.uniforms.mouth, mouth[0] + mouth[2] / 2, mouth[1] + mouth[3] * .65, mouth[2] / 2, mouth[3] / 2);
    gl.uniform1f(this.uniforms.awake, this.awake ? 1 : 0); gl.uniform1f(this.uniforms.smile, /happy|laugh/.test(pose.expr) ? 1 : 0);
    gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_SHORT, 0);
    return this.canvas;
  }

  destroy() { this.gl?.getExtension('WEBGL_lose_context')?.loseContext(); this.image = null; }
}
