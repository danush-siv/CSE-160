/**
 * CSE 160 Assignment 3 — Desert Ruins
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
    
    // Fallback: If texture is missing (black), use base color
    if (texColor.a < 0.1) {
        gl_FragColor = u_FragColor;
    } else {
        gl_FragColor = (1.0 - u_texColorWeight) * u_FragColor + u_texColorWeight * texColor;
    }
  }
}
`;

let canvas, gl;
let a_Position, a_UV;
let u_FragColor, u_ModelMatrix, u_ViewMatrix, u_ProjectionMatrix;
let u_texColorWeight, u_whichTexture;
let u_Sampler0, u_Sampler1, u_Sampler2, u_Sampler3, u_Sampler4;

let g_camera;
let g_gameWon = false;
let g_map = [];
const MAP_SIZE = 32;

function buildMap() {
  for (let x = 0; x < MAP_SIZE; x++) {
    g_map[x] = [];
    for (let z = 0; z < MAP_SIZE; z++) {
      g_map[x][z] = 0;
    }
  }
  
  // Boundary walls
  for (let i = 0; i < MAP_SIZE; i++) {
    g_map[0][i] = 1;
    g_map[MAP_SIZE - 1][i] = 1;
    g_map[i][0] = 1;
    g_map[i][MAP_SIZE - 1] = 1;
  }

  // Maze Walls (Dirt)
  for (let x = 2; x < MAP_SIZE - 2; x += 2) {
    for (let z = 2; z < MAP_SIZE - 2; z++) {
      if (Math.random() > 0.6) g_map[x][z] = 1;
    }
  }
  g_map[16][16] = 4; // Gold
}

function initTextures() {
  const textureUnits = [1, 3, 4]; // Sand, Gold, Dirt
  const files = ['sand.jpg', 'gold.jpg', 'dirt.jpg'];
  const samplers = [u_Sampler1, u_Sampler3, u_Sampler4];

  textureUnits.forEach((unit, i) => {
    let texture = gl.createTexture();
    let image = new Image();
    image.onload = function() {
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.uniform1i(samplers[i], unit);
    };
    image.onerror = function() {
       console.log("Failed to load: " + files[i] + ". Using solid colors.");
    };
    image.src = files[i];
  });
}

function drawBatchedBatch(positions, uvs, textureNum, color) {
  if (positions.length === 0) return;
  gl.uniform1i(u_whichTexture, textureNum);
  gl.uniform4f(u_FragColor, color[0], color[1], color[2], color[3]);
  gl.uniform1f(u_texColorWeight, textureNum >= 0 ? 1.0 : 0.0);
  
  gl.uniformMatrix4fv(u_ModelMatrix, false, new Matrix4().elements);
  
  let pBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, pBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  let uBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, uBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);
  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_UV);

  gl.drawArrays(gl.TRIANGLES, 0, positions.length / 3);
}

// Cube vertices and UVs (Simplified)
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
  
  // Ground (Sand)
  let gP = [], gU = [];
  m.setTranslate(-MAP_SIZE/2, -0.8, -MAP_SIZE/2); m.scale(MAP_SIZE, 0.05, MAP_SIZE);
  pushCube(m, gP, gU);
  drawBatchedBatch(gP, gU, 1, [0.9, 0.8, 0.6, 1.0]);

  // Map
  let dP = [], dU = [], goP = [], goU = [];
  for(let x=0; x<MAP_SIZE; x++){
    for(let z=0; z<MAP_SIZE; z++){
      if(g_map[x][z] === 0) continue;
      m.setTranslate(x - MAP_SIZE/2, -0.8, z - MAP_SIZE/2);
      if(g_map[x][z] === 4) pushCube(m, goP, goU);
      else pushCube(m, dP, dU);
    }
  }
  drawBatchedBatch(dP, dU, 4, [0.5, 0.3, 0.1, 1.0]); // Dirt Walls
  drawBatchedBatch(goP, goU, 3, [1.0, 0.9, 0.0, 1.0]); // Gold Treasure

  // Sky
  let sP = [], sU = [];
  m.setTranslate(0,0,0); m.scale(100, 100, 100); m.translate(-0.5, -0.5, -0.5);
  pushCube(m, sP, sU);
  drawBatchedBatch(sP, sU, -2, [0.5, 0.7, 1.0, 1.0]);
}

function main() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
  if(!gl) return;
  gl.enable(gl.DEPTH_TEST);

  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) return;

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
  g_camera.eye.set(new Vector3([-10, 0, -10]).elements); 
  buildMap();
  initTextures();

  document.onkeydown = (ev) => {
    let oldX = g_camera.eye.elements[0];
    let oldZ = g_camera.eye.elements[2];
    
    if(ev.key === 'w') g_camera.moveForward();
    if(ev.key === 's') g_camera.moveBackwards();
    if(ev.key === 'a') g_camera.moveLeft();
    if(ev.key === 'd') g_camera.moveRight();
    if(ev.key === 'q') g_camera.panLeft();
    if(ev.key === 'e') g_camera.panRight();
    
    // Collision logic
    let cell = {x: Math.round(g_camera.eye.elements[0] + MAP_SIZE/2), z: Math.round(g_camera.eye.elements[2] + MAP_SIZE/2)};
    if(g_map[cell.x] && g_map[cell.x][cell.z] === 1) {
        g_camera.eye.elements[0] = oldX;
        g_camera.eye.elements[2] = oldZ;
    }
  };

  function tick() { renderAllShapes(); requestAnimationFrame(tick); }
  tick();
}