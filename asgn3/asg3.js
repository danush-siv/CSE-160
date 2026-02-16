/**
 * CSE 160 Assignment 3 — Desert Ruins
 * Danush Sivarajan, CSE 160, UCSC, 1932047
 * Ground + sky + textured walls from map, camera, add/delete blocks, simple "find the treasure" game.
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
uniform sampler2D u_Sampler0;
uniform sampler2D u_Sampler1;
uniform sampler2D u_Sampler2;
uniform sampler2D u_Sampler3;
uniform sampler2D u_Sampler4;
void main() {
  if (u_whichTexture == -2) {
    gl_FragColor = u_FragColor;
  } else {
    vec4 texColor;
    if (u_whichTexture == 0) texColor = texture2D(u_Sampler0, v_UV);
    else if (u_whichTexture == 1) texColor = texture2D(u_Sampler1, v_UV);
    else if (u_whichTexture == 2) texColor = texture2D(u_Sampler2, v_UV);
    else if (u_whichTexture == 3) texColor = texture2D(u_Sampler3, v_UV);
    else if (u_whichTexture == 4) texColor = texture2D(u_Sampler4, v_UV);
    else texColor = u_FragColor;
    float t = u_texColorWeight;
    gl_FragColor = (1.0 - t) * u_FragColor + t * texColor;
  }
}
`;

let canvas, gl;
let a_Position, a_UV;
let u_FragColor, u_ModelMatrix, u_ViewMatrix, u_ProjectionMatrix;
let u_texColorWeight, u_whichTexture;
let u_Sampler0, u_Sampler1, u_Sampler2, u_Sampler3, u_Sampler4;

let g_camera;
let g_mouseDown = false;
let g_lastMouseX = 0, g_lastMouseY = 0;
let g_gameWon = false;
const BLOCK_SCALE = 1.0; 

let g_map = [];
const MAP_SIZE = 32;

function buildMap() {
  for (var x = 0; x < MAP_SIZE; x++) {
    g_map[x] = [];
    for (var z = 0; z < MAP_SIZE; z++) {
      g_map[x][z] = 0;
    }
  }
  
  // Outer boundary walls
  for (var i = 0; i < MAP_SIZE; i++) {
    g_map[0][i] = 1;
    g_map[MAP_SIZE - 1][i] = 1;
    g_map[i][0] = 1;
    g_map[i][MAP_SIZE - 1] = 1;
  }

  // Generate Maze Walls (Value 1 = Dirt)
  for (var x = 2; x < MAP_SIZE - 2; x += 2) {
    for (var z = 2; z < MAP_SIZE - 2; z++) {
      if (Math.random() > 0.4) g_map[x][z] = 1;
    }
  }

  // Singular Golden Block (Value 4)
  g_map[16][16] = 4;
  // Clear starting area
  g_map[4][4] = 0; 
}

function worldToMap(wx, wz) {
  const gx = Math.round(wx + MAP_SIZE / 2);
  const gz = Math.round(wz + MAP_SIZE / 2);
  if (gx >= 0 && gx < MAP_SIZE && gz >= 0 && gz < MAP_SIZE) return { x: gx, z: gz };
  return null;
}

// Collision Check: Prevents walking through walls (1)
function canMove(newX, newZ) {
  const cell = worldToMap(newX, newZ);
  if (!cell) return false;
  if (g_map[cell.x][cell.z] === 1) return false;
  return true;
}

function drawBatchedBatch(positions, uvs, textureNum, color) {
  if (positions.length === 0) return;
  gl.uniform1i(u_whichTexture, textureNum);
  gl.uniform4f(u_FragColor, color[0], color[1], color[2], color[3]);
  gl.uniform1f(u_texColorWeight, textureNum >= 0 ? 1 : 0);
  
  var idMatrix = new Matrix4();
  gl.uniformMatrix4fv(u_ModelMatrix, false, idMatrix.elements);
  
  const pBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, pBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  const uBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, uBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);
  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_UV);

  gl.drawArrays(gl.TRIANGLES, 0, positions.length / 3);
}

var CUBE_VERTS = [0,0,0, 1,1,0, 1,0,0, 0,0,0, 0,1,0, 1,1,0, 0,1,0, 1,1,1, 1,1,0, 0,1,0, 0,1,1, 1,1,1, 0,0,0, 1,0,1, 0,0,1, 0,0,0, 1,0,0, 1,0,1, 1,0,0, 1,1,1, 1,1,0, 1,0,0, 1,0,1, 1,1,1, 0,0,0, 0,1,1, 0,1,0, 0,0,0, 0,0,1, 0,1,1, 0,0,1, 1,1,1, 0,1,1, 0,0,1, 1,0,1, 1,1,1];
var CUBE_UVS = [0,0,1,1,1,0, 0,0,0,1,1,1, 0,0,1,1,1,0, 0,0,0,1,1,1, 0,0,1,1,1,0, 0,0,0,1,1,1, 0,0,1,1,1,0, 0,0,0,1,1,1, 0,0,1,1,1,0, 0,0,0,1,1,1, 0,0,1,1,1,0, 0,0,0,1,1,1];

function transformCubeAndAppend(matrix, positions, uvs) {
  for (var i = 0; i < CUBE_VERTS.length; i += 3) {
    var v = new Vector3([CUBE_VERTS[i], CUBE_VERTS[i+1], CUBE_VERTS[i+2]]);
    var t = matrix.multiplyVector3(v);
    positions.push(t.elements[0], t.elements[1], t.elements[2]);
  }
  for (var j = 0; j < CUBE_UVS.length; j++) uvs.push(CUBE_UVS[j]);
}

function setupCanvas() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
  gl.enable(gl.DEPTH_TEST);
}

function initTextures() {
  const files = [
    { u: 1, url: 'sand.jpg' }, 
    { u: 3, url: 'gold.jpg' }, 
    { u: 4, url: 'dirt.jpg' }
  ];
  files.forEach(f => {
    const img = new Image();
    img.onload = () => {
      const tex = gl.createTexture();
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
      gl.activeTexture(gl.TEXTURE0 + f.u);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.uniform1i([u_Sampler0, u_Sampler1, u_Sampler2, u_Sampler3, u_Sampler4][f.u], f.u);
    };
    img.src = f.url;
  });
}

function keydown(ev) {
  if (g_gameWon) return;
  const key = ev.key.toLowerCase();
  const oldX = g_camera.eye.elements[0];
  const oldZ = g_camera.eye.elements[2];

  if (key === 'w') g_camera.moveForward();
  else if (key === 's') g_camera.moveBackwards();
  else if (key === 'a') g_camera.moveLeft();
  else if (key === 'd') g_camera.moveRight();
  else if (key === 'q') g_camera.panLeft();
  else if (key === 'e') g_camera.panRight();

  if (!canMove(g_camera.eye.elements[0], g_camera.eye.elements[2])) {
    g_camera.eye.elements[0] = oldX;
    g_camera.eye.elements[2] = oldZ;
  }
}

function restartGame() {
  g_gameWon = false;
  document.getElementById('titleCanvas').style.display = 'none';
  buildMap();
  // Spawn camera in a cleared corner
  g_camera.eye.set(new Vector3([-12, 0, -12]).elements);
  g_camera.at.set(new Vector3([0, 0, 0]).elements);
  g_camera.updateViewMatrix();
}

function renderAllShapes() {
  const cell = worldToMap(g_camera.eye.elements[0], g_camera.eye.elements[2]);
  if (!g_gameWon && cell && g_map[cell.x][cell.z] === 4) {
      g_gameWon = true;
      const tc = document.getElementById('titleCanvas');
      tc.style.display = 'block';
      const ctx = tc.getContext('2d');
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0,0,600,600);
      ctx.fillStyle = 'gold';
      ctx.font = '30px Arial';
      ctx.fillText("GOLD FOUND!", 200, 300);
  }

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, g_camera.projectionMatrix.elements);
  gl.uniformMatrix4fv(u_ViewMatrix, false, g_camera.viewMatrix.elements);

  // Draw Ground
  var gPos = [], gUv = [];
  var m = new Matrix4();
  m.translate(-MAP_SIZE/2, -0.75, -MAP_SIZE/2);
  m.scale(MAP_SIZE, 0.01, MAP_SIZE);
  transformCubeAndAppend(m, gPos, gUv);
  drawBatchedBatch(gPos, gUv, 1, [1,1,1,1]);

  // Draw Map
  var dPos = [], dUv = [], goPos = [], goUv = [];
  for(var x=0; x<MAP_SIZE; x++){
    for(var z=0; z<MAP_SIZE; z++){
      if(g_map[x][z] === 0) continue;
      m.setIdentity();
      m.translate(x - MAP_SIZE/2, -0.75, z - MAP_SIZE/2);
      if(g_map[x][z] === 4) transformCubeAndAppend(m, goPos, goUv);
      else transformCubeAndAppend(m, dPos, dUv);
    }
  }
  drawBatchedBatch(dPos, dUv, 4, [1,1,1,1]);
  drawBatchedBatch(goPos, goUv, 3, [1,1,1,1]);

  // Draw Sky
  gl.uniform1f(u_texColorWeight, 0);
  var sPos = [], sUv = [];
  m.setIdentity(); m.scale(100, 100, 100); m.translate(-0.5, -0.5, -0.5);
  transformCubeAndAppend(m, sPos, sUv);
  drawBatchedBatch(sPos, sUv, -2, [0.5, 0.8, 1, 1]);
}

function main() {
  setupCanvas();
  connectVariablesToGLSL();
  g_camera = new Camera();
  buildMap();
  restartGame();
  initTextures();
  document.onkeydown = keydown;
  document.getElementById('titleCanvas').onclick = restartGame;
  
  function tick() { renderAllShapes(); requestAnimationFrame(tick); }
  tick();
}

function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) return;
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  a_UV = gl.getAttribLocation(gl.program, 'a_UV');
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  u_texColorWeight = gl.getUniformLocation(gl.program, 'u_texColorWeight');
  u_whichTexture = gl.getUniformLocation(gl.program, 'u_whichTexture');
  u_Sampler0 = gl.getUniformLocation(gl.program, 'u_Sampler0');
  u_Sampler1 = gl.getUniformLocation(gl.program, 'u_Sampler1');
  u_Sampler2 = gl.getUniformLocation(gl.program, 'u_Sampler2');
  u_Sampler3 = gl.getUniformLocation(gl.program, 'u_Sampler3');
  u_Sampler4 = gl.getUniformLocation(gl.program, 'u_Sampler4');
}