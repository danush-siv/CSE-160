/**
 * CSE 160 Assignment 4 — Desert Ruins with Phong Lighting
 * Danush Sivarajan, 1932047, CSE 160
 */

// ─── Shaders ────────────────────────────────────────────────────────────────

const VSHADER_SOURCE = `
attribute vec4 a_Position;
attribute vec2 a_UV;
attribute vec3 a_Normal;
uniform mat4 u_ModelMatrix;
uniform mat4 u_NormalMatrix;
uniform mat4 u_ViewMatrix;
uniform mat4 u_ProjectionMatrix;
varying vec2 v_UV;
varying vec3 v_WorldPos;
varying vec3 v_Normal;
void main() {
  vec4 w = u_ModelMatrix * a_Position;
  v_WorldPos = w.xyz;
  gl_Position = u_ProjectionMatrix * u_ViewMatrix * w;
  v_UV = a_UV;
  v_Normal = normalize(mat3(u_NormalMatrix) * a_Normal);
}
`;

const FSHADER_SOURCE = `
precision mediump float;
varying vec2 v_UV;
varying vec3 v_WorldPos;
varying vec3 v_Normal;

uniform vec4 u_FragColor;
uniform float u_texColorWeight;
uniform int u_whichTexture;
uniform sampler2D u_Sampler1;
uniform sampler2D u_Sampler3;
uniform sampler2D u_Sampler4;

uniform bool u_LightOn;
uniform bool u_NormalVis;
uniform vec3 u_LightPos;
uniform vec3 u_LightColor;
uniform vec3 u_CameraPos;

uniform bool u_SpotOn;
uniform vec3 u_SpotPos;
uniform vec3 u_SpotDir;
uniform float u_SpotCutoff;

void main() {
  // Normal visualization
  if (u_NormalVis) {
    gl_FragColor = vec4((v_Normal + 1.0) / 2.0, 1.0);
    return;
  }

  // Skybox — no lighting, same sky gradient as before
  if (u_whichTexture == -2) {
    float t = (v_WorldPos.y + 75.0) / 150.0;
    gl_FragColor = mix(vec4(0.6,0.85,1.0,1.0), vec4(0.2,0.4,0.7,1.0), t);
    vec3 sunDir = normalize(vec3(0.4, 1.0, 0.3));
    float sun = pow(max(0.0, dot(normalize(v_WorldPos), sunDir)), 64.0);
    gl_FragColor.rgb += sun * vec3(1.0, 0.98, 0.9);
    return;
  }

  // Base / diffuse color
  vec4 baseColor;
  if (u_whichTexture == -1) {
    baseColor = u_FragColor;
  } else {
    vec4 tex = vec4(1.0);
    if (u_whichTexture == 1) tex = texture2D(u_Sampler1, v_UV);
    else if (u_whichTexture == 3) tex = texture2D(u_Sampler3, v_UV);
    else if (u_whichTexture == 4) tex = texture2D(u_Sampler4, v_UV);
    baseColor = (u_texColorWeight < 0.1 || tex.a < 0.1)
      ? u_FragColor
      : mix(u_FragColor, tex, u_texColorWeight);
  }

  // Lighting off → flat color
  if (!u_LightOn) { gl_FragColor = baseColor; return; }

  // ── Phong shading ─────────────────────────────────────────
  vec3 N = normalize(v_Normal);
  vec3 L = normalize(u_LightPos - v_WorldPos);
  vec3 V = normalize(u_CameraPos - v_WorldPos);
  vec3 H = normalize(L + V);

  vec3 ambient  = 0.15 * baseColor.rgb;
  float nDotL   = max(dot(N, L), 0.0);
  vec3 diffuse  = nDotL * baseColor.rgb * u_LightColor;
  float spec    = pow(max(dot(N, H), 0.0), 64.0);
  vec3 specular = spec * u_LightColor * 0.6;

  vec3 result = ambient + diffuse + specular;

  // ── Spotlight (additive) ──────────────────────────────────
  if (u_SpotOn) {
    vec3 SL = normalize(u_SpotPos - v_WorldPos);
    float cosA = dot(normalize(v_WorldPos - u_SpotPos), normalize(u_SpotDir));
    if (cosA > u_SpotCutoff) {
      float edge = clamp((cosA - u_SpotCutoff) / (1.0 - u_SpotCutoff), 0.0, 1.0);
      edge *= edge;
      float sD = max(dot(N, SL), 0.0);
      float sS = pow(max(dot(N, normalize(SL + V)), 0.0), 64.0);
      result += edge * (sD * baseColor.rgb * 0.8 + sS * vec3(1.0) * 0.4);
    }
  }

  gl_FragColor = vec4(clamp(result, 0.0, 1.0), baseColor.a);
}
`;

// ─── Globals ────────────────────────────────────────────────────────────────

let canvas, gl;
let a_Position, a_UV, a_Normal;
let u_ModelMatrix, u_NormalMatrix, u_ViewMatrix, u_ProjectionMatrix;
let u_FragColor, u_texColorWeight, u_whichTexture;
let u_Sampler1, u_Sampler3, u_Sampler4;
let u_LightOn, u_NormalVis, u_LightPos, u_LightColor, u_CameraPos;
let u_SpotOn, u_SpotPos, u_SpotDir, u_SpotCutoff;

let g_camera;
let g_gameWon = false;
let g_map = [];
const MAP_SIZE = 32;
const g_textureLoaded = { 1: false, 3: false, 4: false };

let g_verVelocity = 0;
const G_GRAVITY = -0.01;
const G_JUMP_FORCE = 0.25;
let g_isJumping = false;
let g_mouseDown = false;
let g_lastMouseX = -1;
let g_lastMouseY = -1;

// Lighting state
let g_lightOn = true;
let g_normalVis = false;
let g_spotOn = false;
let g_animateLight = true;
let g_lightPos = [0, 5, 0];
let g_lightColor = [1, 1, 1];

// Scene objects
let g_sphere1, g_sphere2, g_torus;

// ─── Cube geometry (36 verts) with face normals ─────────────────────────────

const V = [
  0,0,0, 1,1,0, 1,0,0,  0,0,0, 0,1,0, 1,1,0,   // Front  z=0
  0,1,0, 1,1,1, 1,1,0,  0,1,0, 0,1,1, 1,1,1,   // Top    y=1
  0,0,0, 1,0,1, 0,0,1,  0,0,0, 1,0,0, 1,0,1,   // Bottom y=0
  1,0,0, 1,1,1, 1,1,0,  1,0,0, 1,0,1, 1,1,1,   // Right  x=1
  0,0,0, 0,1,1, 0,1,0,  0,0,0, 0,0,1, 0,1,1,   // Left   x=0
  0,0,1, 1,1,1, 0,1,1,  0,0,1, 1,0,1, 1,1,1    // Back   z=1
];
const UV = [
  0,0,1,1,1,0, 0,0,0,1,1,1,  0,0,1,1,1,0, 0,0,0,1,1,1,
  0,0,1,1,1,0, 0,0,0,1,1,1,  0,0,1,1,1,0, 0,0,0,1,1,1,
  0,0,1,1,1,0, 0,0,0,1,1,1,  0,0,1,1,1,0, 0,0,0,1,1,1
];
const CUBE_N = [
  0,0,-1,0,0,-1,0,0,-1, 0,0,-1,0,0,-1,0,0,-1,
  0,1,0,0,1,0,0,1,0,    0,1,0,0,1,0,0,1,0,
  0,-1,0,0,-1,0,0,-1,0, 0,-1,0,0,-1,0,0,-1,0,
  1,0,0,1,0,0,1,0,0,    1,0,0,1,0,0,1,0,0,
  -1,0,0,-1,0,0,-1,0,0, -1,0,0,-1,0,0,-1,0,0,
  0,0,1,0,0,1,0,0,1,    0,0,1,0,0,1,0,0,1
];

function pushCube(matrix, pA, uA, nA) {
  for (let i = 0; i < V.length; i += 3) {
    const t = matrix.multiplyVector3(new Vector3([V[i], V[i+1], V[i+2]]));
    pA.push(t.elements[0], t.elements[1], t.elements[2]);
  }
  uA.push(...UV);
  nA.push(...CUBE_N);
}

// ─── Batched draw ───────────────────────────────────────────────────────────

function drawBatch(pos, uvs, norms, texNum, color) {
  if (pos.length === 0) return;
  gl.uniform1i(u_whichTexture, texNum);
  gl.uniform4f(u_FragColor, color[0], color[1], color[2], color[3]);
  gl.uniform1f(u_texColorWeight, (texNum >= 0 && g_textureLoaded[texNum]) ? 1.0 : 0.0);
  gl.uniformMatrix4fv(u_ModelMatrix, false, new Matrix4().elements);
  gl.uniformMatrix4fv(u_NormalMatrix, false, new Matrix4().elements);

  const pBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, pBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pos), gl.STATIC_DRAW);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  const uBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, uBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);
  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_UV);

  const nBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, nBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(norms), gl.STATIC_DRAW);
  gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Normal);

  gl.drawArrays(gl.TRIANGLES, 0, pos.length / 3);
  gl.deleteBuffer(pBuf);
  gl.deleteBuffer(uBuf);
  gl.deleteBuffer(nBuf);
}

// ─── Torus mesh (OBJ-style complex shape) ───────────────────────────────────

function buildTorus(R, r, N, n) {
  const verts = [], norms = [], uvs = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const theta = 2 * Math.PI * i / N;
    const ct = Math.cos(theta), st = Math.sin(theta);
    for (let j = 0; j <= n; j++) {
      const phi = 2 * Math.PI * j / n;
      const cp = Math.cos(phi), sp = Math.sin(phi);
      const x = (R + r * cp) * ct;
      const y = r * sp;
      const z = (R + r * cp) * st;
      verts.push(x, y, z);
      norms.push(cp * ct, sp, cp * st);
      uvs.push(i / N, j / n);
    }
  }
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < n; j++) {
      const a = i * (n + 1) + j, b = a + n + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  return {
    verts: new Float32Array(verts),
    normals: new Float32Array(norms),
    uvs: new Float32Array(uvs),
    indices: new Uint16Array(idx),
    numIndices: idx.length
  };
}

class TorusModel {
  constructor() {
    this.color = [0.85, 0.45, 0.15, 1.0];
    this.matrix = new Matrix4();
    this.textureNum = -1;
    const d = buildTorus(0.6, 0.25, 30, 16);
    this.verts = d.verts;
    this.normals = d.normals;
    this.uvs = d.uvs;
    this.indices = d.indices;
    this.numIndices = d.numIndices;
    this._vB = null; this._nB = null; this._uB = null; this._iB = null;
  }

  render() {
    gl.uniform1i(u_whichTexture, this.textureNum);
    gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
    gl.uniform1f(u_texColorWeight, 0.0);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
    const nm = new Matrix4(); nm.setInverseOf(this.matrix); nm.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, nm.elements);

    if (!this._vB) this._vB = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vB);
    gl.bufferData(gl.ARRAY_BUFFER, this.verts, gl.STATIC_DRAW);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    if (!this._nB) this._nB = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this._nB);
    gl.bufferData(gl.ARRAY_BUFFER, this.normals, gl.STATIC_DRAW);
    gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Normal);

    if (!this._uB) this._uB = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this._uB);
    gl.bufferData(gl.ARRAY_BUFFER, this.uvs, gl.STATIC_DRAW);
    gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_UV);

    if (!this._iB) this._iB = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._iB);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

    gl.drawElements(gl.TRIANGLES, this.numIndices, gl.UNSIGNED_SHORT, 0);
  }
}

// ─── Map builder (same recursive backtracking maze as asg3) ─────────────────

function buildMap() {
  g_map = new Array(MAP_SIZE);
  for (let x = 0; x < MAP_SIZE; x++) g_map[x] = new Int8Array(MAP_SIZE).fill(1);
  for (let i = 0; i < MAP_SIZE; i++) {
    g_map[0][i] = 2; g_map[MAP_SIZE-1][i] = 2;
    g_map[i][0] = 2; g_map[i][MAP_SIZE-1] = 2;
  }
  const R = 10, C = 10;
  const visited = new Array(R * C).fill(false);
  const stack = [{r:0,c:0}];
  visited[0] = true;
  g_map[2][2] = 0;
  const dr = [-1,1,0,0], dc = [0,0,-1,1];
  while (stack.length) {
    const curr = stack[stack.length - 1];
    const nb = [];
    for (let i = 0; i < 4; i++) {
      const nr = curr.r+dr[i], nc = curr.c+dc[i];
      if (nr>=0 && nr<R && nc>=0 && nc<C && !visited[nr*C+nc]) nb.push({r:nr,c:nc,dir:i});
    }
    if (!nb.length) { stack.pop(); continue; }
    const next = nb[Math.floor(Math.random()*nb.length)];
    visited[next.r*C+next.c] = true;
    g_map[2+3*next.r][2+3*next.c] = 0;
    g_map[2+3*curr.r+(next.r-curr.r)][2+3*curr.c+(next.c-curr.c)] = 0;
    g_map[2+3*curr.r+2*(next.r-curr.r)][2+3*curr.c+2*(next.c-curr.c)] = 0;
    stack.push(next);
  }
  for (let x=15;x<=17;x++) for(let z=15;z<=17;z++) g_map[x][z]=0;
  for (let x=10;x<=12;x++) for(let z=10;z<=12;z++) g_map[x][z]=0;
  g_map[16][16] = 4;
  for (let x=1;x<MAP_SIZE-1;x++) for(let z=1;z<MAP_SIZE-1;z++) if(g_map[x][z]===1) g_map[x][z]=3;
}

// ─── Textures ───────────────────────────────────────────────────────────────

function initTextures() {
  const data = [
    {unit:1, file:'sand.jpg', sampler:u_Sampler1},
    {unit:3, file:'gold.jpg', sampler:u_Sampler3},
    {unit:4, file:'dirt.jpg', sampler:u_Sampler4}
  ];
  const base = window.location.href.replace(/[^/]*$/, '');
  data.forEach(d => {
    const tex = gl.createTexture(), img = new Image();
    img.onload = () => {
      g_textureLoaded[d.unit] = true;
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
      gl.activeTexture(gl.TEXTURE0 + d.unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.uniform1i(d.sampler, d.unit);
    };
    img.onerror = () => console.warn('Texture failed: ' + d.file);
    img.src = base + d.file;
  });
}

// ─── Ray / gold hit ─────────────────────────────────────────────────────────

function rayHitGold(ox,oy,oz,dx,dy,dz) {
  const min=[0,-0.8,0], max=[1,0.2,1], o=[ox,oy,oz], d=[dx,dy,dz];
  let tMin=-Infinity, tMax=Infinity;
  for (let i=0;i<3;i++) {
    if (Math.abs(d[i])<1e-6) { if(o[i]<min[i]||o[i]>max[i]) return null; }
    else {
      let t1=(min[i]-o[i])/d[i], t2=(max[i]-o[i])/d[i];
      if(t1>t2){const tmp=t1;t1=t2;t2=tmp;}
      tMin=Math.max(tMin,t1); tMax=Math.min(tMax,t2);
      if(tMin>tMax) return null;
    }
  }
  const t = tMin>=0?tMin:tMax;
  return t>=0&&t<100?{hit:true,t}:null;
}

// ─── Render ─────────────────────────────────────────────────────────────────

function renderAllShapes() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, g_camera.projectionMatrix.elements);
  gl.uniformMatrix4fv(u_ViewMatrix, false, g_camera.viewMatrix.elements);

  // Pass lighting uniforms every frame
  gl.uniform1i(u_LightOn, g_lightOn ? 1 : 0);
  gl.uniform1i(u_NormalVis, g_normalVis ? 1 : 0);
  gl.uniform3f(u_LightPos, g_lightPos[0], g_lightPos[1], g_lightPos[2]);
  gl.uniform3f(u_LightColor, g_lightColor[0], g_lightColor[1], g_lightColor[2]);
  gl.uniform3f(u_CameraPos,
    g_camera.eye.elements[0], g_camera.eye.elements[1], g_camera.eye.elements[2]);

  gl.uniform1i(u_SpotOn, g_spotOn ? 1 : 0);
  gl.uniform3f(u_SpotPos, 0, 8, 0);
  gl.uniform3f(u_SpotDir, 0, -1, 0);
  gl.uniform1f(u_SpotCutoff, Math.cos(25 * Math.PI / 180));

  let m = new Matrix4();

  // ── Ground ──
  let gP=[], gU=[], gN=[];
  m.setTranslate(-16, -0.8, -16); m.scale(32, 0.01, 32);
  pushCube(m, gP, gU, gN);
  drawBatch(gP, gU, gN, 1, [0.8, 0.7, 0.5, 1.0]);

  // ── Map walls ──
  let bndP=[], bndU=[], bndN=[];
  let dP=[], dU=[], dN=[];
  let goP=[], goU=[], goN=[];
  for (let x=0; x<MAP_SIZE; x++) {
    for (let z=0; z<MAP_SIZE; z++) {
      const v = g_map[x][z];
      if (v===0) continue;
      const tx=x-16, tz=z-16;
      if (v===2) {
        m.setTranslate(tx+.5,-.8,tz+.5); m.scale(.75,1,.75); m.translate(-.5,-.5,-.5);
        pushCube(m, bndP, bndU, bndN);
      } else if (v===4) {
        m.setTranslate(tx, -.8, tz);
        pushCube(m, goP, goU, goN);
      } else {
        m.setTranslate(tx+.5,-.8,tz+.5); m.scale(.75,1,.75); m.translate(-.5,-.5,-.5);
        pushCube(m, dP, dU, dN);
        if (v===3) {
          m.setTranslate(tx+.5,.2,tz+.5); m.scale(.75,1,.75); m.translate(-.5,-.5,-.5);
          pushCube(m, dP, dU, dN);
        }
      }
    }
  }
  drawBatch(bndP, bndU, bndN, -1, [0.15,0.15,0.15,1]);
  drawBatch(dP,   dU, dN,   -1, [0.45,0.28,0.12,1]);
  drawBatch(goP,  goU, goN,  -1, [1.0,0.9,0.0,1]);

  // ── Skybox ──
  let sP=[], sU=[], sN=[];
  m.setTranslate(0,0,0); m.scale(150,150,150); m.translate(-.5,-.5,-.5);
  pushCube(m, sP, sU, sN);
  gl.enable(gl.CULL_FACE); gl.cullFace(gl.FRONT);
  drawBatch(sP, sU, sN, -2, [0.5,0.8,1,1]);
  gl.disable(gl.CULL_FACE);

  // ── Light indicator cube ──
  let lP=[], lU=[], lN=[];
  m.setTranslate(g_lightPos[0]-.15, g_lightPos[1]-.15, g_lightPos[2]-.15);
  m.scale(0.3, 0.3, 0.3);
  pushCube(m, lP, lU, lN);
  const prevLightOn = g_lightOn;
  gl.uniform1i(u_LightOn, 0);
  drawBatch(lP, lU, lN, -1, [1,1,0.3,1]);
  gl.uniform1i(u_LightOn, prevLightOn ? 1 : 0);

  // ── Spheres ──
  g_sphere1.matrix.setTranslate(-4, 0.7, -4);
  g_sphere1.matrix.scale(1.5, 1.5, 1.5);
  g_sphere1.color = [0.2, 0.6, 1.0, 1.0];
  g_sphere1.render();

  g_sphere2.matrix.setTranslate(2, 0.2, -2);
  g_sphere2.color = [1.0, 0.3, 0.3, 1.0];
  g_sphere2.render();

  // ── Torus (OBJ-style complex model) ──
  g_torus.matrix.setTranslate(-2, 1.5, -3);
  g_torus.matrix.rotate(performance.now() * 0.03, 0, 1, 0);
  g_torus.matrix.rotate(30, 1, 0, 0);
  g_torus.render();
}

// ─── Game logic ─────────────────────────────────────────────────────────────

function restartGame() {
  g_gameWon = false;
  const tc = document.getElementById('titleCanvas');
  if (tc) tc.style.display = 'none';
  buildMap();
  g_camera.eye.set(new Vector3([-5.5, 0.0, -5.5]).elements);
  g_camera.at.set(new Vector3([0, 0, 0]).elements);
  g_camera.updateViewMatrix();
}

// ─── Controls setup ─────────────────────────────────────────────────────────

function setupControls() {
  const btn = (id, cb) => document.getElementById(id).addEventListener('click', cb);
  const slider = (id, cb) => {
    const el = document.getElementById(id);
    el.addEventListener('input', () => cb(parseFloat(el.value)));
    cb(parseFloat(el.value));
  };

  btn('btnLightToggle', () => {
    g_lightOn = !g_lightOn;
    document.getElementById('btnLightToggle').textContent = 'Lighting: ' + (g_lightOn ? 'ON' : 'OFF');
  });
  btn('btnNormalVis', () => {
    g_normalVis = !g_normalVis;
    document.getElementById('btnNormalVis').textContent = 'Normal Vis: ' + (g_normalVis ? 'ON' : 'OFF');
  });
  btn('btnSpotlight', () => {
    g_spotOn = !g_spotOn;
    document.getElementById('btnSpotlight').textContent = 'Spotlight: ' + (g_spotOn ? 'ON' : 'OFF');
  });
  btn('btnAnimate', () => {
    g_animateLight = !g_animateLight;
    document.getElementById('btnAnimate').textContent = 'Animate Light: ' + (g_animateLight ? 'ON' : 'OFF');
  });

  slider('lightX', v => { g_lightPos[0] = v; document.getElementById('lightXVal').textContent = v.toFixed(1); });
  slider('lightY', v => { g_lightPos[1] = v; document.getElementById('lightYVal').textContent = v.toFixed(1); });
  slider('lightZ', v => { g_lightPos[2] = v; document.getElementById('lightZVal').textContent = v.toFixed(1); });

  slider('lightR', v => { g_lightColor[0] = v; });
  slider('lightG', v => { g_lightColor[1] = v; });
  slider('lightB', v => { g_lightColor[2] = v; });
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext('webgl');
  if (!gl || !initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) return;

  gl.enable(gl.DEPTH_TEST);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.5, 0.8, 1.0, 1.0);

  // Attribute locations
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  a_UV       = gl.getAttribLocation(gl.program, 'a_UV');
  a_Normal   = gl.getAttribLocation(gl.program, 'a_Normal');

  // Uniform locations
  u_ModelMatrix      = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_NormalMatrix     = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
  u_ViewMatrix       = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  u_FragColor        = gl.getUniformLocation(gl.program, 'u_FragColor');
  u_texColorWeight   = gl.getUniformLocation(gl.program, 'u_texColorWeight');
  u_whichTexture     = gl.getUniformLocation(gl.program, 'u_whichTexture');
  u_Sampler1         = gl.getUniformLocation(gl.program, 'u_Sampler1');
  u_Sampler3         = gl.getUniformLocation(gl.program, 'u_Sampler3');
  u_Sampler4         = gl.getUniformLocation(gl.program, 'u_Sampler4');
  u_LightOn          = gl.getUniformLocation(gl.program, 'u_LightOn');
  u_NormalVis        = gl.getUniformLocation(gl.program, 'u_NormalVis');
  u_LightPos         = gl.getUniformLocation(gl.program, 'u_LightPos');
  u_LightColor       = gl.getUniformLocation(gl.program, 'u_LightColor');
  u_CameraPos        = gl.getUniformLocation(gl.program, 'u_CameraPos');
  u_SpotOn           = gl.getUniformLocation(gl.program, 'u_SpotOn');
  u_SpotPos          = gl.getUniformLocation(gl.program, 'u_SpotPos');
  u_SpotDir          = gl.getUniformLocation(gl.program, 'u_SpotDir');
  u_SpotCutoff       = gl.getUniformLocation(gl.program, 'u_SpotCutoff');

  // Scene objects
  g_sphere1 = new Sphere(24, 24);
  g_sphere2 = new Sphere(20, 20);
  g_torus   = new TorusModel();

  g_camera = new Camera();
  g_camera.updateProjectionMatrix(canvas);
  restartGame();
  initTextures();
  setupControls();

  // ── Mouse interaction ──
  canvas.onmousedown = e => {
    if (e.button === 0 && !g_gameWon) {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / canvas.width * 2 - 1;
      const y = 1 - (e.clientY - rect.top) / canvas.height * 2;
      const pv = new Matrix4(g_camera.projectionMatrix).multiply(g_camera.viewMatrix);
      const inv = new Matrix4(pv).invert();
      const nearW = inv.multiplyVector4(new Vector4([x, y, -1, 1]));
      const farW  = inv.multiplyVector4(new Vector4([x, y, 1, 1]));
      const nw = nearW.elements[3], fw = farW.elements[3];
      if (Math.abs(nw) >= 1e-6) {
        const ox=nearW.elements[0]/nw, oy=nearW.elements[1]/nw, oz=nearW.elements[2]/nw;
        const fx=farW.elements[0]/fw,  fy=farW.elements[1]/fw,  fz=farW.elements[2]/fw;
        let dx=fx-ox, dy=fy-oy, dz=fz-oz;
        const len=Math.sqrt(dx*dx+dy*dy+dz*dz)||1;
        dx/=len; dy/=len; dz/=len;
        if (rayHitGold(ox,oy,oz,dx,dy,dz)) {
          e.preventDefault();
          g_gameWon = true;
          const tc = document.getElementById('titleCanvas');
          if (tc) {
            tc.style.display = 'block';
            const ctx = tc.getContext('2d');
            ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0,0,600,600);
            ctx.fillStyle = 'gold'; ctx.font = '30px Arial';
            ctx.fillText('GOLD FOUND! Click to Restart', 100, 300);
          }
        }
      }
    }
    g_mouseDown = true;
    g_lastMouseX = e.clientX;
    g_lastMouseY = e.clientY;
  };
  canvas.onmouseup = () => { g_mouseDown = false; };
  canvas.onmousemove = e => {
    if (g_mouseDown) {
      const dx = (e.clientX - g_lastMouseX) * 0.2;
      const dy = (e.clientY - g_lastMouseY) * 0.2;
      g_camera.panRight(-dx);
      if (dy > 0) g_camera.panDown(dy); else if (dy < 0) g_camera.panUp(-dy);
      g_lastMouseX = e.clientX; g_lastMouseY = e.clientY;
    }
  };

  // ── Keyboard ──
  document.onkeydown = ev => {
    if (g_gameWon) return;
    const oldX = g_camera.eye.elements[0], oldZ = g_camera.eye.elements[2];
    if (ev.code==='Space' && !g_isJumping) { g_verVelocity=G_JUMP_FORCE; g_isJumping=true; }
    if (ev.key==='w') g_camera.moveForward();
    if (ev.key==='s') g_camera.moveBackwards();
    if (ev.key==='a') g_camera.moveLeft();
    if (ev.key==='d') g_camera.moveRight();
    if (ev.key==='q') g_camera.panLeft();
    if (ev.key==='e') g_camera.panRight();

    const fx=g_camera.eye.elements[0], fz=g_camera.eye.elements[2];
    const dx=g_camera.at.elements[0]-fx, dz=g_camera.at.elements[2]-fz;
    const len=Math.sqrt(dx*dx+dz*dz)||1;
    const nx=Math.round(fx+(dx/len)*1.5+16), nz=Math.round(fz+(dz/len)*1.5+16);

    if (ev.key==='r' && nx>0 && nx<MAP_SIZE-1 && nz>0 && nz<MAP_SIZE-1) {
      if (g_map[nx][nz]===0 && !(nx===16&&nz===16)) g_map[nx][nz]=3;
    }
    if (ev.key==='f' && nx>0 && nx<MAP_SIZE-1 && nz>0 && nz<MAP_SIZE-1) {
      const cell = g_map[nx][nz];
      if (cell===3) g_map[nx][nz]=1; else if(cell===1) g_map[nx][nz]=0;
    }
    if (ev.key==='r'||ev.key==='f') ev.preventDefault();

    const c = {x:Math.round(g_camera.eye.elements[0]+16), z:Math.round(g_camera.eye.elements[2]+16)};
    if (g_map[c.x] && (g_map[c.x][c.z]===1||g_map[c.x][c.z]===2||g_map[c.x][c.z]===3)) {
      g_camera.eye.elements[0]=oldX; g_camera.eye.elements[2]=oldZ;
    }
  };

  document.getElementById('titleCanvas').onclick = restartGame;

  // ── Render loop ──
  let frames = 0, fpsTime = performance.now();
  const fpsEl = document.getElementById('fpsCounter');

  function tick() {
    // Gravity / jump
    if (g_camera.eye.elements[1] < 0) {
      g_camera.eye.elements[1]=0; g_camera.at.elements[1]=0;
      g_verVelocity=0; g_isJumping=false;
    }
    if (g_isJumping || g_camera.eye.elements[1] > 0) {
      g_camera.eye.elements[1] += g_verVelocity;
      g_camera.at.elements[1]  += g_verVelocity;
      g_verVelocity += G_GRAVITY;
      g_camera.updateViewMatrix();
    }

    // Animate light (orbit around center)
    if (g_animateLight) {
      const t = performance.now() * 0.001;
      g_lightPos[0] = 6 * Math.cos(t);
      g_lightPos[2] = 6 * Math.sin(t);
      g_lightPos[1] = 3 + 2 * Math.sin(t * 0.7);
      document.getElementById('lightX').value = g_lightPos[0];
      document.getElementById('lightY').value = g_lightPos[1];
      document.getElementById('lightZ').value = g_lightPos[2];
      document.getElementById('lightXVal').textContent = g_lightPos[0].toFixed(1);
      document.getElementById('lightYVal').textContent = g_lightPos[1].toFixed(1);
      document.getElementById('lightZVal').textContent = g_lightPos[2].toFixed(1);
    }

    renderAllShapes();

    // Pointer / reticle
    const ptr = document.getElementById('pointer');
    if (ptr) {
      ptr.style.display = g_gameWon ? 'none' : '';
      if (!g_gameWon) {
        const fx=g_camera.eye.elements[0], fz=g_camera.eye.elements[2];
        const dx=g_camera.at.elements[0]-fx, dz=g_camera.at.elements[2]-fz;
        const len=Math.sqrt(dx*dx+dz*dz)||1;
        const nx=Math.round(fx+(dx/len)*1.5+16), nz=Math.round(fz+(dz/len)*1.5+16);
        const canRemove = nx>=0 && nx<MAP_SIZE && nz>=0 && nz<MAP_SIZE && g_map[nx] && (g_map[nx][nz]===1||g_map[nx][nz]===3);
        ptr.classList.toggle('can-remove', !!canRemove);
      }
    }

    // FPS
    frames++;
    const now = performance.now();
    if (now - fpsTime >= 1000 && fpsEl) {
      const [cx,cy,cz] = [g_camera.eye.elements[0].toFixed(1), g_camera.eye.elements[1].toFixed(1), g_camera.eye.elements[2].toFixed(1)];
      fpsEl.textContent = `FPS: ${Math.round(frames*1000/(now-fpsTime))} | Coord: (${cx}, ${cy}, ${cz})`;
      frames=0; fpsTime=now;
    }
    requestAnimationFrame(tick);
  }
  tick();
}
