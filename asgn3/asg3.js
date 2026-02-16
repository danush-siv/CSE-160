/**
 * CSE 160 Assignment 3 — Desert Ruins
 * Danush Sivarajan, 1932047, CSE 160
 */

// ... (VSHADER and FSHADER remain the same as previous version)

// --- Global Variables for Physics and Display ---
let g_verVelocity = 0;      // Vertical velocity for jumping
const G_GRAVITY = -0.01;    // Gravity constant
const G_JUMP_FORCE = 0.25;  // Initial jump power
let g_isJumping = false;

// ... (Other global variables remain the same)

function main() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext('webgl');
  if(!gl) return;
  gl.enable(gl.DEPTH_TEST);

  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) return;

  // ... (Attrib/Uniform location fetching remains the same)

  g_camera = new Camera();
  g_camera.updateProjectionMatrix(canvas);
  
  restartGame();
  initTextures();

  // Mouse controls
  canvas.onmousedown = function(ev) { g_mouseDown = true; g_lastMouseX = ev.clientX; };
  canvas.onmouseup = function(ev) { g_mouseDown = false; };
  canvas.onmousemove = function(ev) {
    if (g_mouseDown) {
      let deltaX = ev.clientX - g_lastMouseX;
      g_camera.panRight(-deltaX * 0.2);
      g_lastMouseX = ev.clientX;
    }
  };

  // Keyboard controls with Jump logic
  document.onkeydown = (ev) => {
    if (g_gameWon) return;
    let oldX = g_camera.eye.elements[0];
    let oldZ = g_camera.eye.elements[2];
    
    // Jump Logic
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
    
    // Collision logic for X/Z movement
    let cell = {
        x: Math.round(g_camera.eye.elements[0] + MAP_SIZE/2), 
        z: Math.round(g_camera.eye.elements[2] + MAP_SIZE/2)
    };
    if(g_map[cell.x] && g_map[cell.x][cell.z] === 1) {
        g_camera.eye.elements[0] = oldX;
        g_camera.eye.elements[2] = oldZ;
    }
  };

  document.getElementById('titleCanvas').onclick = restartGame;

  let frames = 0, fpsTime = performance.now();
  const fpsEl = document.getElementById('fpsCounter');

  function tick() {
    // Apply Physics (Gravity and Jumping)
    if (g_isJumping || g_camera.eye.elements[1] > 0) {
      g_camera.eye.elements[1] += g_verVelocity;
      g_camera.at.elements[1] += g_verVelocity;
      g_verVelocity += G_GRAVITY;

      // Ground collision (prevent falling through floor)
      if (g_camera.eye.elements[1] <= 0) {
        let diff = 0 - g_camera.eye.elements[1];
        g_camera.eye.elements[1] = 0;
        g_camera.at.elements[1] += diff;
        g_verVelocity = 0;
        g_isJumping = false;
      }
      g_camera.updateViewMatrix();
    }

    renderAllShapes();
    frames++;
    const now = performance.now();
    
    // Update FPS and Coordinates Display
    if (now - fpsTime >= 1000 && fpsEl) {
      let xPos = g_camera.eye.elements[0].toFixed(1);
      let yPos = g_camera.eye.elements[1].toFixed(1);
      let zPos = g_camera.eye.elements[2].toFixed(1);
      let fps = Math.round(frames * 1000 / (now - fpsTime));
      
      fpsEl.textContent = `FPS: ${fps} | Coord: (${xPos}, ${yPos}, ${zPos})`;
      
      frames = 0; 
      fpsTime = now;
    }
    requestAnimationFrame(tick);
  }
  tick();
}

// ... (Rest of buildMap, initTextures, and draw functions remain same)