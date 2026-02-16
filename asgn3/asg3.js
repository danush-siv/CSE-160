/**
 * CSE 160 Assignment 3 — Desert Ruins
 * Danush Sivarajan, 1932047, CSE 160
 */

const VSHADER_SOURCE = `
attribute vec4 a_Position;
attribute vec2 a_UV;
varying vec2 v_UV;
uniform mat4 u_ModelMatrix;
uniform mat4 u_ViewMatrix;
uniform mat4 u_ProjectionMatrix;
void main() {
  gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;
  v_UV = a_UV;
}
`;

const FSHADER_SOURCE = `
precision mediump float;
varying vec2 v_UV;
uniform vec4 u_FragColor;
uniform float u_texColorWeight;
uniform int u_whichTexture;
uniform sampler2D u_Sampler1; // Sand
uniform sampler2D u_Sampler3; // Gold
uniform sampler2D u_Sampler4; // Dirt
void main() {
  if (u_whichTexture == -2) {
    gl_FragColor = u_FragColor; // Sky
  } else {
    vec4 texColor = vec4(1.0);
    if (u_whichTexture == 1) texColor = texture2D(u_Sampler1, v_UV);
    else if (u_whichTexture == 3) texColor = texture2D(u_Sampler3, v_UV);
    else if (u_whichTexture == 4) texColor = texture2D(u_Sampler4, v_UV);
    
    if (u_texColorWeight < 0.1 || texColor.a < 0.1) {
       gl_FragColor = u_FragColor;
    } else {
       gl_FragColor = mix(u_FragColor, texColor, u_texColorWeight);
    }
  }
}
`;

// --- Global Variables ---
let canvas, gl;
let a_Position, a_UV, u_FragColor, u_ModelMatrix, u_ViewMatrix, u_ProjectionMatrix;
let u_texColorWeight, u_whichTexture, u_Sampler1, u_Sampler3, u_Sampler4;

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

/**
 * Builds a maze of connected walls using Recursive Backtracking.
 */
function buildMap() {
  g_map = new Array(MAP_SIZE);
  for (let x = 0; x < MAP_SIZE; x++) {
    g_map[x] = new Int8Array(MAP_SIZE).fill(1); // Fill with solid brown walls
  }

  // Boundary walls (permanent black boundary)
  for (let i = 0; i < MAP_SIZE; i++) {
    g_map[0][i] = 2;
    g_map[MAP_SIZE - 1][i] = 2;
    g_map[i][0] = 2;
    g_map[i][MAP_SIZE - 1] = 2;
  }

  // Recursive Backtracking to carve connected paths
  const R = 14, C = 14;
  const visited = new Array(R * C).fill(false);
  const stack = [{r: 0, c: 0}];
  visited[0] = true;
  g_map[2][2] = 0;

  const dr = [-1, 1, 0, 0];
  const dc = [0, 0, -1, 1];

  while (stack.length > 0) {
    const curr = stack[stack.length - 1];
    const neighbors = [];
    for (let i = 0; i < 4; i++) {
      const nr = curr.r + dr[i], nc = curr.c + dc[i];
      if (nr >= 0 && nr < R && nc >= 0 && nc < C && !visited[nr * C + nc]) {
        neighbors.push({r: nr, c: nc, dir: i});
      }
    }

    if (neighbors.length === 0) {
      stack.pop();
    } else {
      const next = neighbors[Math.floor(Math.random() * neighbors.length)];
      visited[next.r * C + next.c] = true;
      g_map[2 + 2 * next.r][2 + 2 * next.c] = 0;
      g_map[2 + 2 * curr.r + dr[next.dir]][2 + 2 * curr.c + dc[next.dir]] = 0;
      stack.push(next);
    }
  }

  // Clear spawn and area around gold
  for (let x = 15; x <= 17; x++) for (let z = 15; z <= 17; z++) g_map[x][z] = 0;
  for (let x = 10; x <= 12; x++) for (let z = 10; z <= 12; z++) g_map[x][z] = 0;

  g_map[16][16] = 4; // Gold Block

  // Interior walls that remain are two blocks tall (3). Value 1 = one block left after F.
  for (let x = 1; x < MAP_SIZE - 1; x++)
    for (let z = 1; z < MAP_SIZE - 1; z++)
      if (g_map[x][z] === 1) g_map[x][z] = 3;
}

function initTextures() {
  const textureData = [
    { unit: 1, file: 'sand.jpg', sampler: u_Sampler1 },
    { unit: 3, file: 'gold.jpg', sampler: u_Sampler3 },
    { unit: 4, file: 'dirt.jpg', sampler: u_Sampler4 }
  ];
  const base = window.location.href.replace(/[^/]*$/, '');
  textureData.forEach(data => {
    let texture = gl.createTexture();
    let image = new Image();
    image.onload = function() {
      g_textureLoaded[data.unit] = true;
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
      gl.activeTexture(gl.TEXTURE0 + data.unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.uniform1i(data.sampler, data.unit);
    };
    image.onerror = function() { console.warn('Texture failed: ' + data.file); };
    image.src = base + data.file;
  });
}

function drawBatchedBatch(positions, uvs, textureNum, color) {
  if (positions.length === 0) return;
  gl.uniform1i(u_whichTexture, textureNum);
  gl.uniform4f(u_FragColor, color[0], color[1], color[2], color[3]);
  const useTex = textureNum >= 0 && g_textureLoaded[textureNum];
  gl.uniform1f(u_texColorWeight, useTex ? 1.0 : 0.0);
  gl.uniformMatrix4fv(u_ModelMatrix, false, new Matrix4().elements);
  
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);
  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_UV);
  gl.drawArrays(gl.TRIANGLES, 0, positions.length / 3);
}

const V = [0,0,0, 1,1,0, 1,0,0, 0,0,0, 0,1,0, 1,1,0, 0,1,0, 1,1,1, 1,1,0, 0,1,0, 0,1,1, 1,1,1, 0,0,0, 1,0,1, 0,0,1, 0,0,0, 1,0,0, 1,0,1, 1,0,0, 1,1,1, 1,1,0, 1,0,0, 1,0,1, 1,1,1, 0,0,0, 0,1,1, 0,1,0, 0,0,0, 0,0,1, 0,1,1, 0,0,1, 1,1,1, 0,1,1, 0,0,1, 1,0,1, 1,1,1];
const U = [0,0,1,1,1,0, 0,0,0,1,1,1, 0,0,1,1,1,0, 0,0,0,1,1,1, 0,0,1,1,1,0, 0,0,0,1,1,1, 0,0,1,1,1,0, 0,0,0,1,1,1, 0,0,1,1,1,0, 0,0,0,1,1,1, 0,0,1,1,1,0, 0,0,0,1,1,1];

function pushCube(matrix, posArr, uvArr) {
  for (let i = 0; i < V.length; i += 3) {
    let v = new Vector3([V[i], V[i+1], V[i+2]]);
    let t = matrix.multiplyVector3(v);
    posArr.push(t.elements[0], t.elements[1], t.elements[2]);
  }
  uvArr.push(...U);
}

function renderAllShapes() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, g_camera.projectionMatrix.elements);
  gl.uniformMatrix4fv(u_ViewMatrix, false, g_camera.viewMatrix.elements);
  
  let m = new Matrix4();
  
  // Ground
  let gP = [], gU = []; 
  m.setTranslate(-16, -0.8, -16); m.scale(32, 0.01, 32);
  pushCube(m, gP, gU);
  drawBatchedBatch(gP, gU, 1, [0.8, 0.7, 0.5, 1.0]);

  // Map: 0=empty, 1=one block (half wall), 2=boundary, 3=two blocks (full wall), 4=gold
  let bndP = [], bndU = [], dP = [], dU = [], goP = [], goU = [];
  for (let x = 0; x < MAP_SIZE; x++) {
    for (let z = 0; z < MAP_SIZE; z++) {
      const v = g_map[x][z];
      if (v === 0) continue;
      const tx = x - 16, tz = z - 16;
      if (v === 2) {
        m.setTranslate(tx, -0.8, tz);
        pushCube(m, bndP, bndU);
      } else if (v === 4) {
        m.setTranslate(tx, -0.8, tz);
        pushCube(m, goP, goU);
      } else {
        // v === 1 or 3: brown wall. Bottom cube always; top cube only if 3.
        m.setTranslate(tx, -0.8, tz);
        pushCube(m, dP, dU);
        if (v === 3) {
          m.setTranslate(tx, 0.2, tz);
          pushCube(m, dP, dU);
        }
      }
    }
  }
  drawBatchedBatch(bndP, bndU, -1, [0.15, 0.15, 0.15, 1.0]); // Boundary
  drawBatchedBatch(dP, dU, -1, [0.45, 0.28, 0.12, 1.0]);     // Brown walls (solid)
  drawBatchedBatch(goP, goU, -1, [1.0, 0.9, 0.0, 1.0]);      // Gold

  // Skybox
  let sP = [], sU = []; 
  m.setTranslate(0,0,0); m.scale(150, 150, 150); m.translate(-0.5, -0.5, -0.5);
  pushCube(m, sP, sU);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.FRONT);  
  drawBatchedBatch(sP, sU, -2, [0.5, 0.8, 1.0, 1.0]);
  gl.disable(gl.CULL_FACE);
}

function restartGame() {
  g_gameWon = false;
  let tc = document.getElementById('titleCanvas');
  if (tc) tc.style.display = 'none';
  buildMap();
  g_camera.eye.set(new Vector3([-5.5, 0.0, -5.5]).elements); 
  g_camera.at.set(new Vector3([0, 0, 0]).elements);
  g_camera.updateViewMatrix();
}

function main() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext('webgl');
  if(!gl || !initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) return;

  gl.enable(gl.DEPTH_TEST);
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  a_UV = gl.getAttribLocation(gl.program, 'a_UV');
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  u_texColorWeight = gl.getUniformLocation(gl.program, 'u_texColorWeight');
  u_whichTexture = gl.getUniformLocation(gl.program, 'u_whichTexture');
  u_Sampler1 = gl.getUniformLocation(gl.program, 'u_Sampler1');
  u_Sampler3 = gl.getUniformLocation(gl.program, 'u_Sampler3');
  u_Sampler4 = gl.getUniformLocation(gl.program, 'u_Sampler4');

  g_camera = new Camera();
  g_camera.updateProjectionMatrix(canvas);
  restartGame();
  initTextures();

  canvas.onmousedown = e => { g_mouseDown = true; g_lastMouseX = e.clientX; };
  canvas.onmouseup = () => { g_mouseDown = false; };
  canvas.onmousemove = e => {
    if (g_mouseDown) {
      g_camera.panRight(-(e.clientX - g_lastMouseX) * 0.2);
      g_lastMouseX = e.clientX;
    }
  };

  document.onkeydown = (ev) => {
    if (g_gameWon) return;
    let oldX = g_camera.eye.elements[0], oldZ = g_camera.eye.elements[2];
    if (ev.code === 'Space' && !g_isJumping) { g_verVelocity = G_JUMP_FORCE; g_isJumping = true; } 
    if(ev.key === 'w') g_camera.moveForward();
    if(ev.key === 's') g_camera.moveBackwards();
    if(ev.key === 'a') g_camera.moveLeft();
    if(ev.key === 'd') g_camera.moveRight();
    if(ev.key === 'q') g_camera.panLeft();
    if(ev.key === 'e') g_camera.panRight();
    
    const fx = g_camera.eye.elements[0], fz = g_camera.eye.elements[2];
    const dx = g_camera.at.elements[0] - fx, dz = g_camera.at.elements[2] - fz;
    const len = Math.sqrt(dx * dx + dz * dz) || 1;
    const nx = Math.round(fx + (dx / len) * 1.5 + 16), nz = Math.round(fz + (dz / len) * 1.5 + 16);
    
    // R: add two-block wall in front
    if (ev.key === 'r' && nx > 0 && nx < MAP_SIZE - 1 && nz > 0 && nz < MAP_SIZE - 1) {
      if (g_map[nx][nz] === 0 && !(nx === 16 && nz === 16)) g_map[nx][nz] = 3;
    }
    // F: deconstruct block by block (3 -> 1 -> 0)
    if (ev.key === 'f' && nx > 0 && nx < MAP_SIZE - 1 && nz > 0 && nz < MAP_SIZE - 1) {
      const cell = g_map[nx][nz];
      if (cell === 3) g_map[nx][nz] = 1;
      else if (cell === 1) g_map[nx][nz] = 0;
    }
    if (ev.key === 'r' || ev.key === 'f') ev.preventDefault();

    // Collision: can't walk through boundary (2), half wall (1), or full wall (3)
    let c = { x: Math.round(g_camera.eye.elements[0] + 16), z: Math.round(g_camera.eye.elements[2] + 16) };
    if (g_map[c.x] && (g_map[c.x][c.z] === 1 || g_map[c.x][c.z] === 2 || g_map[c.x][c.z] === 3)) { 
      g_camera.eye.elements[0] = oldX; 
      g_camera.eye.elements[2] = oldZ; 
    }
  };

  document.getElementById('titleCanvas').onclick = restartGame;

  let frames = 0, fpsTime = performance.now();
  const fpsEl = document.getElementById('fpsCounter');
  function tick() {
    if (g_camera.eye.elements[1] < 0) {
      g_camera.eye.elements[1] = 0; g_camera.at.elements[1] = 0;
      g_verVelocity = 0; g_isJumping = false;
    }
    if (g_isJumping || g_camera.eye.elements[1] > 0) {
      g_camera.eye.elements[1] += g_verVelocity; 
      g_camera.at.elements[1] += g_verVelocity;
      g_verVelocity += G_GRAVITY;
      g_camera.updateViewMatrix();
    }
    renderAllShapes();
    frames++;
    const now = performance.now();
    if (now - fpsTime >= 1000 && fpsEl) {
      let x = g_camera.eye.elements[0].toFixed(1), y = g_camera.eye.elements[1].toFixed(1), z = g_camera.eye.elements[2].toFixed(1);
      fpsEl.textContent = `FPS: ${Math.round(frames * 1000 / (now - fpsTime))} | Coord: (${x}, ${y}, ${z})`;
      frames = 0; fpsTime = now;
    }
    requestAnimationFrame(tick);
  }
  tick();
}