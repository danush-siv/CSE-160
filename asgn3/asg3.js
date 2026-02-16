/**
 * CSE 160 Assignment 3 — Desert Ruins
 * Danush Sivarajan, 1932047, CSE 160
 */

// Shaders
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
    
    // Fallback if texture is empty/black
    if (texColor.a < 0.1) gl_FragColor = u_FragColor;
    else gl_FragColor = mix(u_FragColor, texColor, u_texColorWeight);
  }
}
`;

// Global Variables
let canvas, gl;
let a_Position, a_UV, u_FragColor, u_ModelMatrix, u_ViewMatrix, u_ProjectionMatrix;
let u_texColorWeight, u_whichTexture, u_Sampler1, u_Sampler3, u_Sampler4;

let g_camera;
let g_gameWon = false;
let g_map = [];
const MAP_SIZE = 32;
const g_textureLoaded = { 1: false, 3: false, 4: false };

// Physics and Mouse
let g_verVelocity = 0;      
const G_GRAVITY = -0.01;    
const G_JUMP_FORCE = 0.25;  
let g_isJumping = false;
let g_mouseDown = false;
let g_lastMouseX = -1;

function buildMap() {
  for (let x = 0; x < MAP_SIZE; x++) {
    g_map[x] = [];
    for (let z = 0; z < MAP_SIZE; z++) g_map[x][z] = 0;
  }
  // Boundary 14x14 area (limit 7 from center)
  const limit = 7;
  for (let i = -limit; i <= limit; i++) {
    let x_w1 = Math.round(limit + MAP_SIZE/2), x_w2 = Math.round(-limit + MAP_SIZE/2);
    let z_c = Math.round(i + MAP_SIZE/2);
    g_map[x_w1][z_c] = 1; g_map[x_w2][z_c] = 1;
    g_map[z_c][x_w1] = 1; g_map[z_c][x_w2] = 1;
  }
  // Dirt Walls
  for (let x = 10; x < 22; x++) {
    for (let z = 10; z < 22; z++) {
      if (Math.random() > 0.7) g_map[x][z] = 1;
    }
  }
  g_map[16][16] = 4; // Gold in middle
  // Clear spawn area
  for (let x = 9; x < 13; x++) {
    for (let z = 9; z < 13; z++) g_map[x][z] = 0;
  }
}

function initTextures() {
  const textureData = [
    { unit: 1, file: 'sand.jpg', sampler: u_Sampler1 },
    { unit: 3, file: 'gold.jpg', sampler: u_Sampler3 },
    { unit: 4, file: 'dirt.jpg', sampler: u_Sampler4 }
  ];
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
    image.src = data.file;
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
  const cell = {x: Math.round(g_camera.eye.elements[0] + MAP_SIZE/2), z: Math.round(g_camera.eye.elements[2] + MAP_SIZE/2)};
  if (!g_gameWon && g_map[cell.x] && g_map[cell.x][cell.z] === 4) {
      g_gameWon = true;
      let tc = document.getElementById('titleCanvas');
      tc.style.display = 'block';
      let ctx = tc.getContext('2d');
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0,0,600,600);
      ctx.fillStyle = 'gold'; ctx.font = '30px Arial';
      ctx.fillText("GOLD FOUND! Click to Restart", 100, 300);
  }
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, g_camera.projectionMatrix.elements);
  gl.uniformMatrix4fv(u_ViewMatrix, false, g_camera.viewMatrix.elements);
  
  let m = new Matrix4();
  let gP = [], gU = []; // Ground
  m.setTranslate(-MAP_SIZE/2, -0.8, -MAP_SIZE/2); m.scale(MAP_SIZE, 0.05, MAP_SIZE);
  pushCube(m, gP, gU);
  drawBatchedBatch(gP, gU, 1, [0.8, 0.7, 0.5, 1.0]);

  let dP = [], dU = [], goP = [], goU = []; // Walls & Treasure
  for(let x=0; x<MAP_SIZE; x++){
    for(let z=0; z<MAP_SIZE; z++){
      if(g_map[x][z] === 0) continue;
      m.setTranslate(x - MAP_SIZE/2, -0.8, z - MAP_SIZE/2);
      if(g_map[x][z] === 4) pushCube(m, goP, goU);
      else pushCube(m, dP, dU);
    }
  }
  drawBatchedBatch(dP, dU, 4, [0.4, 0.2, 0.0, 1.0]); // Brown fallback
  drawBatchedBatch(goP, goU, 3, [1.0, 0.9, 0.0, 1.0]); // Gold fallback

  let sP = [], sU = []; // Sky
  m.setTranslate(0,0,0); m.scale(200, 200, 200); m.translate(-0.5, -0.5, -0.5);
  pushCube(m, sP, sU);
  drawBatchedBatch(sP, sU, -2, [0.5, 0.8, 1.0, 1.0]);
}

function restartGame() {
  g_gameWon = false;
  document.getElementById('titleCanvas').style.display = 'none';
  buildMap();
  g_camera.eye.set(new Vector3([-6, 0, -6]).elements); // Safe spawn
  g_camera.at.set(new Vector3([0, 0, 0]).elements);
  g_camera.updateViewMatrix();
}

function main() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext('webgl');
  if(!gl || !initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) return;

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

  // Mouse rotation
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
    if (ev.code === 'Space' && !g_isJumping) { g_verVelocity = G_JUMP_FORCE; g_isJumping = true; } // Jump
    if(ev.key === 'w') g_camera.moveForward();
    if(ev.key === 's') g_camera.moveBackwards();
    if(ev.key === 'a') g_camera.moveLeft();
    if(ev.key === 'd') g_camera.moveRight();
    if(ev.key === 'q') g_camera.panLeft();
    if(ev.key === 'e') g_camera.panRight();
    // Collision
    let c = {x: Math.round(g_camera.eye.elements[0] + MAP_SIZE/2), z: Math.round(g_camera.eye.elements[2] + MAP_SIZE/2)};
    if(g_map[c.x] && g_map[c.x][c.z] === 1) { g_camera.eye.elements[0] = oldX; g_camera.eye.elements[2] = oldZ; }
  };

  document.getElementById('titleCanvas').onclick = restartGame;

  function tick() {
    // Jump Physics
    if (g_isJumping || g_camera.eye.elements[1] > 0) {
      g_camera.eye.elements[1] += g_verVelocity; g_camera.at.elements[1] += g_verVelocity;
      g_verVelocity += G_GRAVITY;
      if (g_camera.eye.elements[1] <= 0) { g_camera.eye.elements[1] = 0; g_verVelocity = 0; g_isJumping = false; }
      g_camera.updateViewMatrix();
    }
    renderAllShapes();
    // Coordinates UI
    let x = g_camera.eye.elements[0].toFixed(1), y = g_camera.eye.elements[1].toFixed(1), z = g_camera.eye.elements[2].toFixed(1);
    document.getElementById('fpsCounter').textContent = `Coord: (${x}, ${y}, ${z})`;
    requestAnimationFrame(tick);
  }
  tick();
}