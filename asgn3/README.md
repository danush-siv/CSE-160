# CSE 160 Assignment 3 — Desert Ruins

**Live demo:** https://danush-siv.github.io/CSE-160/asgn3/asg3.html

To run locally (e.g. for development), use a web server from this folder:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/asg3.html` in your browser.

## Optional: use your own textures (JPG/PNG)

If the scene looks wrong or you want custom textures, add these image files into the `asgn3` folder (same folder as `asg3.html`). Use **power-of-2** sizes (e.g. 64×64, 128×128, 256×256, 512×512):

| File       | Used for              |
|-----------|------------------------|
| `stone.jpg` | Stone walls           |
| `sand.jpg`  | Ground                |
| `grass.jpg` | Grass-style blocks    |
| `gold.jpg`  | Treasure block       |
| `dirt.jpg`  | Wall blocks (ruins)   |

If a file is missing, the app falls back to built-in procedural textures. Put the files in the repo so they load on GitHub Pages (e.g. `asgn3/stone.jpg`).

## Rubric coverage

- **Ground & sky:** Flattened cube for ground, large cube for sky.
- **Texture:** Textures on ground and walls; sky and solid elements use base color.
- **Texture + color together:** `u_texColorWeight` mixes base color and texture (0 = solid, 1 = full texture).
- **Camera movement:** W/S/A/D for forward/back/left/right.
- **Q/E rotation:** Q = pan left, E = pan right.
- **Perspective camera:** View and projection matrices in vertex shader.
- **World:** 32×32 map-based ruins with variable-height walls.
- **Mouse rotation:** Drag to look around.
- **Multiple textures:** Stone, sand, grass, gold (4 texture units).
- **Add/delete blocks:** R adds a block in front, F removes one (no raytracer).
- **Simple game:** Find the golden treasure block in the center ruins.
- **Performance:** Single draw per cube face batch; procedural textures; target 10+ FPS on 32×32 world.

## Files

- `asg3.html` — Entry page.
- `asg3.js` — Shaders, camera input, map, rendering, add/delete, game logic.
- `camera.js` — Camera class (view/projection, move, pan).
- `Cube.js` — Cube with UVs and texture/base-color mixing.
- `lib/` — cuon-matrix, cuon-utils, webgl-utils, webgl-debug.