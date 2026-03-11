# CSE 160 Assignment 5 - Lava Atrium (Three.js)

**Name:** Danush Sivarajan  
**Email:** dsivaraj@ucsc.edu  
**ID:** 1932047

This assignment recreates a 3D scene using the Three.js library instead of raw WebGL. The world is a lava-tiled atrium with a custom horse model at the center, surrounded by animated shapes and lights.

## Features

- **Primary shapes:** Multiple boxes, spheres, and cylinders arranged in a ring plus three spinning shapes at the center.
- **Textured ground:** The floor uses a lava tile texture (`lavatile.jpg`) for a distinct surface.
- **Custom 3D model:** A GLB horse model (`Horse.glb`) loaded with `GLTFLoader`, scaled and positioned so it stands in the middle of the scene.
- **Camera controls:** `OrbitControls` allow the user to orbit around the scene and zoom in/out with the mouse.
- **Lighting:** Hemisphere light for ambient fill, directional light for a "sun" direction, and a pulsing point light near the center to highlight the horse and nearby geometry.
- **Skybox:** A single equirectangular environment map (Tears of Steel Bridge) creates the background around the world.
- **20+ objects:** The central shapes plus a ring of additional primitives and orbiting spheres give more than 20 distinct primary shapes.
- **Extra feature ("Wow")**: Colorful glowing spheres orbit around the center on animated circular paths while the central point light pulses in intensity and color over time, giving the scene a magical, energetic feel.

`https://danush-siv.github.io/CSE-160/asgn5/asg5.html`

## Credits / Tools

- Skybox: [Tears of Steel Bridge](https://polyhaven.com/a/tears_of_steel_bridge) from Poly Haven (CC0).
- Lava floor texture: `lavatile.jpg` from the student's assets.
- Three.js and its examples modules (OrbitControls, GLTFLoader) loaded from jsDelivr CDN.
- For small syntax/organization help and scaffolding with Three.js, I used ChatGPT.