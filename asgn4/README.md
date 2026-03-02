# CSE 160 Assignment 4 - Phong Lighting

**Name:** Danush Sivarajan  
**Email:** dsivaraj@ucsc.edu  
**ID:** 1932047

I integrated the world from Assignment 3 into this project with some changes. The scene keeps the sky, ground, and boundary walls from the desert world but removes the maze and golden block. Phong lighting (ambient, diffuse, specular), a point light, spotlight, sphere, and OBJ-loaded model are added with full lighting control.

## Features

- **World from ASG3 (simplified):** Same sky gradient and sun, textured ground (sand), and dark boundary walls; maze and gold block removed
- **Phong lighting:** Ambient, diffuse, and specular on all objects; light color and position controllable via sliders
- **Point light:** Moves over time (toggle) and via Light X/Y/Z sliders; small yellow cube marks its position
- **Spotlight:** Toggle on/off; cone from above
- **Sphere:** Lit sphere in the scene
- **OBJ model:** Loads `model.obj` and renders it with the same lighting
- **Controls:** Lighting on/off, Normal visualization, Spotlight on/off, Animate light on/off; Light X/Y/Z and R/G/B sliders
- **Camera:** W/S/A/D move, Q/E turn, mouse drag to look, Space to jump

## How to Use

1. Open `asg4.html` in a modern browser
2. Use the control panel to toggle lighting, normal vis, spotlight, and light animation
3. Adjust Light X/Y/Z to move the point light; Light R/G/B to change its color
4. Move with W/S/A/D and turn with Q/E or mouse drag

## Credits / Tools

- World and camera setup adapted from Assignment 3 (Desert Ruins) with modifications as described above.
- For some minor syntax correction I used ChatGPT.
