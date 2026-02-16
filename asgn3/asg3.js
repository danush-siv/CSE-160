/**
 * CSE 160 Assignment 3 — Desert Ruins
 * Danush Sivarajan, CSE 160, 1932047
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
const BLOCK_SCALE = 1.0; // Scaled to 1.0 for easier collision math

let g_map = [];
const MAP_SIZE = 32;

function buildMap() {
  for (var x = 0; x < MAP_SIZE; x++) {
    g_map[x] = [];
    for (var z = 0; z < MAP_SIZE; z++) {
      g_map[x][z] = 0;
    }
  }
  
  // Create outer walls
  for (var i = 0; i < MAP_SIZE; i++) {
    g_map[0][i] = 1;
    g_map[MAP_SIZE - 1][i] = 1;
    g_map[i][0] = 1;
    g_map[i][MAP_SIZE - 1] = 1;
  }

  // Generate maze walls using Dirt texture (value 1)
  for (var x = 2; x < MAP_SIZE - 2; x += 2) {
    for (var z = 2; z < MAP_SIZE - 2; z++) {
      if (Math.random() > 0.3) g_map[x][z] = 1;
    }
  }

  // Place singular yellow treasure block (value 4)
  g_map[15][15] = 4;
}

function worldToMap(wx, wz) {
  const gx = Math.round(wx + MAP_SIZE / 2);
  const gz = Math.round(wz + MAP_SIZE / 2);
  if (gx >= 0 && gx < MAP_SIZE && gz >= 0 && gz < MAP_SIZE) return { x: gx, z: gz };
  return null;
}

// Collision helper: prevents walking through blocks
function canMove(newX, newZ) {
  const cell = worldToMap(newX, newZ);
  if (!cell) return false;
  // Block movement if the map contains a wall (1), but allow walking into treasure (4)
  if (g_map[cell.x][cell.z] === 1) return false;
  return true;
}

function getBlockInFront() {
  const f = new Vector3(g_camera.at.elements);
  f.sub(g_camera.eye);
  f.normalize();
  const step = 1.2;
  const wx = g_camera.eye.elements[0] + f.elements[0] * step;
  const wz = g_camera.eye.elements[2] + f.elements[2] * step;
  return worldToMap(wx, wz);
}

function addBlock() {
  const b = getBlockInFront();
  if (b && g_map[b.x][b.z] === 0) {
    g_map[b.x][b.z] = 1;
    return true;
  }
  return false;
}

function deleteBlock() {
  const b = getBlockInFront();
  if (b && g_map[b.x][b.z] === 1) {
    g_map[b.x][b.z] = 0;
    return true;
  }
  return false;
}

function checkTreasure() {
  const ex = g_camera.eye.elements[0];
  const ez = g_camera.eye.elements[2];
  const cell = worldToMap(ex, ez);
  return (cell && g_map[cell.x][cell.z] === 4);
}

function drawBatchedBatch(positions, uvs, textureNum, color) {
  if (positions.length === 0) return;
  gl.uniform1i(u_whichTexture, textureNum);
  gl.uniform4f(u_FragColor, color[0], color[1], color[2], color[3]);
  gl.uniform1f(u_texColorWeight, textureNum >= 0 ? 1 : 0);
  var idMatrix = new Matrix4();
  gl.uniformMatrix4fv(u_ModelMatrix, false, idMatrix.elements);
  
  const posBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  const uvBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.DYNAMIC_DRAW);
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

function initTextures() {
  const TEXTURE_FILES = [
    { unit: 0, url: 'stone.jpg' },
    { unit: 1, url: 'sand.jpg' },
    { unit: 2, url: 'grass.jpg' },
    { unit: 3, url: 'gold.jpg' },
    { unit: 4, url: 'dirt.jpg' }
  ];
  TEXTURE_FILES.forEach(t => {
    const img = new Image();
    img.onload = () => sendTexture(t.unit, img);
    img.src = t.url;
  });
}

function sendTexture(unit, image) {
  const texture = gl.createTexture();
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  const sampler = [u_Sampler0, u_Sampler1, u_Sampler2, u_Sampler3, u_Sampler4][unit];
  gl.uniform1i(sampler, unit);
}

function setupCanvas() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
  gl.enable(gl.DEPTH_TEST);
}

function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) throw new Error('Failed to init shaders');
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

function keydown(ev) {
  if (g_gameWon) return;
  const key = ev.key.toLowerCase();
  
  // Save old position
  const oldX = g_camera.eye.elements[0];
  const oldZ = g_camera.eye.elements[2];

  if (key === 'w') g_camera.moveForward();
  else if (key === 's') g_camera.moveBackwards();
  else if (key === 'a') g_camera.moveLeft();
  else if (key === 'd') g_camera.moveRight();
  else if (key === 'q') g_camera.panLeft();
  else if (key === 'e') g_camera.panRight();
  else if (key === 'r') addBlock();
  else if (key === 'f') deleteBlock();

  // If moved into a wall, revert
  if (!canMove(g_camera.eye.elements[0], g_camera.eye.elements[2])) {
    g_camera.eye.elements[0] = oldX;
    g_camera.eye.elements[2] = oldZ;
  }
}

function onMouseMove(ev) {
  if (!g_mouseDown) return;
  const dx = ev.clientX - g_lastMouseX;
  const dy = ev.clientY - g_lastMouseY;
  g_lastMouseX = ev.clientX;
  g_lastMouseY = ev.clientY;
  g_camera.panRight(-dx * 0.3);
}

function drawGround() {
  var pos = [], uv = [];
  var m = new Matrix4();
  m.translate(-MAP_SIZE / 2, -0.75, -MAP_SIZE / 2);
  m.scale(MAP_SIZE, 0.05, MAP_SIZE);
  transformCubeAndAppend(m, pos, uv);
  drawBatchedBatch(pos, uv, 1, [1, 1, 1, 1]); // Sand texture
}

function drawSky() {
  var pos = [], uv = [];
  var m = new Matrix4();
  m.translate(-50, -50, -50);
  m.scale(100, 100, 100);
  transformCubeAndAppend(m, pos, uv);
  gl.uniform1f(u_texColorWeight, 0);
  drawBatchedBatch(pos, uv, -2, [0.4, 0.6, 1.0, 1]);
}

function drawMap() {
  var dirtBatch = { pos: [], uv: [] };
  var goldBatch = { pos: [], uv: [] };
  var m = new Matrix4();
  for (var x = 0; x < MAP_SIZE; x++) {
    for (var z = 0; z < MAP_SIZE; z++) {
      var val = g_map[x][z];
      if (val === 0) continue;
      m.setIdentity();
      m.translate(x - MAP_SIZE / 2, -0.75, z - MAP_SIZE / 2);
      m.scale(BLOCK_SCALE, BLOCK_SCALE, BLOCK_SCALE);
      if (val === 4) transformCubeAndAppend(m, goldBatch.pos, goldBatch.uv);
      else transformCubeAndAppend(m, dirtBatch.pos, dirtBatch.uv);
    }
  }
  drawBatchedBatch(dirtBatch.pos, dirtBatch.uv, 4, [1, 1, 1, 1]); // Wall ruins (Dirt)
  drawBatchedBatch(goldBatch.pos, goldBatch.uv, 3, [1, 1, 1, 1]); // Treasure (Gold)
}

function showTitleScreen() {
  g_gameWon = true;
  const tc = document.getElementById('titleCanvas');
  tc.style.display = 'block';
  const ctx = tc.getContext('2d');
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0,0,600,600);
  ctx.fillStyle = 'gold';
  ctx.font = '40px Arial';
  ctx.fillText("YOU FOUND THE TREASURE!", 50, 250);
  ctx.font = '20px Arial';
  ctx.fillText("Click anywhere to restart", 180, 300);
}

function restartGame() {
  g_gameWon = false;
  document.getElementById('titleCanvas').style.display = 'none';
  buildMap();
  g_camera.eye.set(new Vector3([-6, 0, -6]).elements);
  g_camera.at.set(new Vector3([0, 0, -7]).elements);
  g_camera.updateViewMatrix();
}

function renderAllShapes() {
  if (!g_gameWon && checkTreasure()) showTitleScreen();
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, g_camera.projectionMatrix.elements);
  gl.uniformMatrix4fv(u_ViewMatrix, false, g_camera.viewMatrix.elements);
  drawGround();
  drawMap();
  drawSky();
}

function main() {
  setupCanvas();
  connectVariablesToGLSL();
  buildMap();
  g_camera = new Camera();
  restartGame();
  initTextures();
  document.onkeydown = keydown;
  canvas.onmousedown = (e) => { g_mouseDown = true; g_lastMouseX = e.clientX; };
  canvas.onmouseup = () => g_mouseDown = false;
  canvas.onmousemove = onMouseMove;
  document.getElementById('titleCanvas').onclick = restartGame; // Fixed restart link
  
  function tick() { renderAllShapes(); requestAnimationFrame(tick); }
  tick();
}