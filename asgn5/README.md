# CSE 160 Assignment 5 - Lava Atrium (Three.js)

**Name:** Danush Sivarajan  
**Email:** dsivaraj@ucsc.edu  
**ID:** 1932047

This assignment recreates a 3D scene using the Three.js library instead of raw WebGL. The world is a lava-tiled atrium with a custom horse model at the center, surrounded by animated shapes and lights. The goal is to satisfy all of the assignment requirements (primary shapes, textures, custom model, lights, skybox, controls, and a "wow" feature) while keeping the scene readable and interactive.

## Features

- **Primary shapes:** Multiple boxes, spheres, and cylinders arranged in a ring plus three spinning shapes at the center.
- **Textured ground:** The floor uses a lava tile texture (`lavatile.jpg`) for a distinct surface.
- **Custom 3D model:** A GLB horse model (`Horse.glb`) loaded with `GLTFLoader`, scaled and positioned so it stands in the middle of the scene.
- **Camera controls:** `OrbitControls` allow the user to orbit around the scene and zoom in/out with the mouse.
- **Lighting:** Hemisphere light for ambient fill, directional light for a "sun" direction, and a pulsing point light near the center to highlight the horse and nearby geometry.
- **Skybox:** A six-sided cubemap creates an indoor atrium / gallery environment around the world.
- **20+ objects:** The central shapes plus a ring of additional primitives and orbiting spheres give more than 20 distinct primary shapes.
- **Extra feature ("Wow")**: Colorful glowing spheres orbit around the center on animated circular paths while the central point light pulses in intensity and color over time, giving the scene a magical, energetic feel.

## How to Use

1. From the repository root, start a local web server, for example:
   - `cd CSE\ 160`
   - `python3 -m http.server 8000`
2. Open a modern browser and navigate to:  
   `http://localhost:8000/asgn5/asg5.html`
3. Interact with the scene:
   - Mouse drag: orbit the camera around the center
   - Scroll: zoom in and out

## Live Demo

If deployed, the page can be viewed at (example):  
`https://danush-siv.github.io/CSE-160/asgn5/asg5.html`

## Credits / Tools

- Horse GLB model: `Horse.glb` from the student's assets (converted/provided externally).
- Skybox images: `Assets/Skybox/*.jpg` from the student's local skybox set.
- Lava floor texture: `lavatile.jpg` from the student's assets.
- Three.js and its examples modules (OrbitControls, GLTFLoader) loaded from jsDelivr CDN.
- For small syntax/organization help and scaffolding of the Three.js boilerplate, I used ChatGPT.

