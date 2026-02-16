/**
 * CSE 160 Assignment 3 — Desert Ruins
 * Danush Sivarajan, 1932047, CSE 160
 */

// ... (VSHADER and FSHADER remain the same)

let canvas, gl;
let a_Position, a_UV;
let u_FragColor, u_ModelMatrix, u_ViewMatrix, u_ProjectionMatrix;
let u_texColorWeight, u_whichTexture;
let u_Sampler1, u_Sampler3, u_Sampler4;

let g_camera;
let g_gameWon = false;
let g_map = [];
const MAP_SIZE = 32; 
const g_textureLoaded = { 1: false, 3: false, 4: false };

// Physics and Mouse control variables
let g_verVelocity = 0;      
const G_GRAVITY = -0.01;    
const G_JUMP_FORCE = 0.25;  
let g_isJumping = false;
let g_mouseDown = false;
let g_lastMouseX = -1;

function buildMap() {
  for (let x = 0; x < MAP_SIZE; x++) {
    g_map[x] = [];
    for (let z = 0; z < MAP_SIZE; z++) {
      g_map[x][z] = 0;
    }
  }

  // Create boundary walls at a 14-unit limit (centered)
  // This ensures the player stays within the 14x14 area you requested.
  const limit = 7; 
  for (let i = -limit; i <= limit; i++) {
    let x_wall1 = Math.round(limit + MAP_SIZE/2);
    let x_wall2 = Math.round(-limit + MAP_SIZE/2);
    let z_coord = Math.round(i + MAP_SIZE/2);
    
    g_map[x_wall1][z_coord] = 1;
    g_map[x_wall2][z_coord] = 1;
    g_map[z_coord][x_wall1] = 1;
    g_map[z_coord][x_wall2] = 1;
  }

  // Place Maze Walls (Dirt) inside the boundary
  for (let x = 10; x < 22; x++) {
    for (let z = 10; z < 22; z++) {
      if (Math.random() > 0.7) g_map[x][z] = 1;
    }
  }

  // FIXED: Place Gold Block at (16, 16) - exactly in the middle of the 32x32 array
  // This is effectively (0,0) in world coordinates.
  g_map[16][16] = 4; 

  // Clear spawn area at one corner of the 14x14 box
  g_map[10][10] = 0;
  g_map[10][11] = 0;
  g_map[11][10] = 0;
}

// ... (initTextures and drawBatchedBatch remain the same)

function restartGame() {
  g_gameWon = false;
  document.getElementById('titleCanvas').style.display = 'none';
  buildMap();
  
  // FIXED: Spawn point inside the 14x14 box boundary
  // World space (-6, -6) is inside the limit.
  g_camera.eye.set(new Vector3([-6, 0, -6]).elements); 
  g_camera.at.set(new Vector3([0, 0, 0]).elements); 
  g_camera.updateViewMatrix();
}

function main() {
  // ... (Shader initialization and variable linking same as before)

  g_camera = new Camera();
  g_camera.updateProjectionMatrix(canvas);
  
  restartGame();
  initTextures();

  // Mouse drag logic
  canvas.onmousedown = function(ev) { g_mouseDown = true; g_lastMouseX = ev.clientX; };
  canvas.onmouseup = function() { g_mouseDown = false; };
  canvas.onmousemove = function(ev) {
    if (g_mouseDown) {
      let deltaX = ev.clientX - g_lastMouseX;
      g_camera.panRight(-deltaX * 0.2);
      g_lastMouseX = ev.clientX;
    }
  };

  document.onkeydown = (ev) => {
    if (g_gameWon) return;
    let oldX = g_camera.eye.elements[0];
    let oldZ = g_camera.eye.elements[2];
    
    if (ev.code === 'Space' && !g_isJumping) {
      g_verVelocity = G_JUMP_FORCE;
      g_isJumping = true;
    }
    
    if(ev.key === 'w') g_camera.moveForward();
    if(ev.key === 's') g_camera.moveBackwards();
    if(ev.key === 'a') g_camera.moveLeft();
    if(ev.key === 'd') g_camera.moveRight();
    if(ev.key === 'q') g_camera.panLeft();
    if(ev.key === 'e') g_camera.panRight();
    
    // Updated collision logic
    let cell = {x: Math.round(g_camera.eye.elements[0] + MAP_SIZE/2), z: Math.round(g_camera.eye.elements[2] + MAP_SIZE/2)};
    if(g_map[cell.x] && g_map[cell.x][cell.z] === 1) {
        g_camera.eye.elements[0] = oldX;
        g_camera.eye.elements[2] = oldZ;
    }
  };

  // ... (Tick and render logic remain the same with coordinate display)
  
  // Initialize Tick
  function tick() {
    // Jump physics
    if (g_isJumping || g_camera.eye.elements[1] > 0) {
      g_camera.eye.elements[1] += g_verVelocity;
      g_camera.at.elements[1] += g_verVelocity;
      g_verVelocity += G_GRAVITY;
      if (g_camera.eye.elements[1] <= 0) {
        g_camera.eye.elements[1] = 0;
        g_verVelocity = 0;
        g_isJumping = false;
      }
      g_camera.updateViewMatrix();
    }
    renderAllShapes();
    // Update display
    let x = g_camera.eye.elements[0].toFixed(1);
    let y = g_camera.eye.elements[1].toFixed(1);
    let z = g_camera.eye.elements[2].toFixed(1);
    document.getElementById('fpsCounter').textContent = `Coord: (${x}, ${y}, ${z})`;
    requestAnimationFrame(tick);
  }
  tick();
}