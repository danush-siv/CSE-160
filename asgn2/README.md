# CSE 160 Assignment 2 - Blocky 3D Lion

**Name:** Danush Sivarajan  
**Email:** dsivaraj@ucsc.edu  
**ID:** 1932047

A web-based interactive 3D lion built with WebGL. The creature is made from cubes and a pyramid (for the nose), with controllable joints, a three-joint tail, tongue (base only), orange mane outline, and camera rotation. The page includes a header, sliders, and a "What You're Looking At" section.

## Features

- **3D Lion:** Blocky lion with body, four legs, head with small brown eyes, orange mane (outline of head cube), black triangle nose, and pink tongue (base only)
- **Third-Joint Tail:** Three-segment tail on the back with a dark tuft at the tip
- **Tongue:** Animated tongue (base only) with slider and optional animation
- **Camera Control:** Sliders or **mouse drag** on the canvas to rotate the view (used ChatGPT for mouse control)
- **Joint Sliders:** Head, tongue base, four legs, and tail (proximal, mid, distal)
- **Animation Toggles:** Turn on/off animation for head, tongue, legs, or tail
- **Poke Reaction:** Hold Shift and click on the canvas to trigger a reaction
- **Performance:** Single triangle buffer created once in `main()` (not per draw); FPS display shows raw fps and fps capped at 60
- **Rendering:** Central `renderScene()` function for all drawing

## How to Use

1. Open `asgn2.html` in a modern browser (or use the live demo link below)
2. Use the camera sliders or **click and drag** on the canvas to rotate the lion
3. Adjust the head, tongue, leg, and tail sliders to pose the creature
4. Use the "Toggle Animation" buttons to animate head, tongue, legs, or tail
5. Hold Shift and click on the canvas for the poke reaction

## Credits / Tools

- Used ChatGPT for mouse control (drag to rotate camera).

## Live Demo

Visit: https://danush-siv.github.io/CSE-160/asgn2/asgn2.html
