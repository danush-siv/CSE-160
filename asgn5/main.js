import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let renderer;
let camera;
let scene;
let controls;

const spinningShapes = [];
const orbitingSpheres = [];

let centralPointLight;

function main() {
  const canvas = document.querySelector('#c');

  renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    500
  );
  // Pull the camera back and up so we see the whole horse
  camera.position.set(30, 18, 40);

  controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 5, -8);
  controls.enableDamping = true;

  addFogAndSkybox();
  addLights();
  addGroundAndShapes();
  addCustomModel();

  onWindowResize();
  window.addEventListener('resize', onWindowResize);

  requestAnimationFrame(render);
}

function addFogAndSkybox() {
  const fogColor = new THREE.Color(0x0b1020);
  scene.fog = new THREE.Fog(fogColor, 40, 160);

  const loader = new THREE.CubeTextureLoader();
  const skybox = loader.load([
    'Assets/Skybox/posx.jpg',
    'Assets/Skybox/negx.jpg',
    'Assets/Skybox/posy.jpg',
    'Assets/Skybox/negy.jpg',
    'Assets/Skybox/posz.jpg',
    'Assets/Skybox/negz.jpg',
  ]);
  scene.background = skybox;
}

function addLights() {
  const hemi = new THREE.HemisphereLight(0xb1e1ff, 0x222211, 0.6);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 0.6);
  dir.position.set(20, 30, 10);
  scene.add(dir);
  scene.add(dir.target);

  centralPointLight = new THREE.PointLight(0xff4477, 40, 80);
  centralPointLight.position.set(0, 10, 0);
  scene.add(centralPointLight);
}

function addGroundAndShapes() {
  const texLoader = new THREE.TextureLoader();
  const groundTex = texLoader.load('Assets/Textures/lavatile.jpg');
  groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping;
  groundTex.repeat.set(20, 20);
  groundTex.colorSpace = THREE.SRGBColorSpace;

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.9 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  scene.add(ground);

  const boxGeo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
  const sphereGeo = new THREE.SphereGeometry(1.1, 32, 16);
  const cylGeo = new THREE.CylinderGeometry(0.8, 0.8, 2.0, 24);

  const box = makeShapeInstance(boxGeo, 0x4caf50, -4, 1);
  const sphere = makeShapeInstance(sphereGeo, 0xffc107, 0, 1.2);
  const cylinder = makeShapeInstance(cylGeo, 0x03a9f4, 4, 1);

  spinningShapes.push(box, sphere, cylinder);

  const count = 22;
  const radius = 14;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const geo = i % 3 === 0 ? boxGeo : i % 3 === 1 ? sphereGeo : cylGeo;
    const color = i % 3 === 0 ? 0xd32f2f : i % 3 === 1 ? 0x7b1fa2 : 0x1976d2;
    const mesh = makeShapeInstance(
      geo,
      color,
      Math.cos(angle) * radius,
      1 + Math.random() * 2
    );
    mesh.position.z = Math.sin(angle) * radius;
  }

  const orbitRadius = 6;
  const orbitCount = 12;
  const smallSphereGeo = new THREE.SphereGeometry(0.4, 16, 12);
  for (let i = 0; i < orbitCount; i++) {
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(i / orbitCount, 0.7, 0.5),
      emissive: 0x111111,
    });
    const mesh = new THREE.Mesh(smallSphereGeo, mat);
    mesh.position.set(
      Math.cos((i / orbitCount) * Math.PI * 2) * orbitRadius,
      6,
      Math.sin((i / orbitCount) * Math.PI * 2) * orbitRadius
    );
    scene.add(mesh);
    orbitingSpheres.push(mesh);
  }
}

function makeShapeInstance(geometry, color, x, y) {
  const material = new THREE.MeshPhongMaterial({ color });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, 0);
  scene.add(mesh);
  return mesh;
}

function addCustomModel() {
  const loader = new GLTFLoader();
  loader.load(
    'Assets/Models/Horse.glb',
    (gltf) => {
      const model = gltf.scene;
      // Move the horse slightly back so it fits nicely in view
      model.position.set(0, 0, -8);
      model.scale.set(0.5, 0.5, 0.5);
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      scene.add(model);
    },
    undefined,
    (err) => {
      console.warn('Could not load custom model:', err);
    }
  );
}

function onWindowResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
}

let lastTime = 0;
function render(time) {
  time *= 0.001;
  const delta = time - lastTime;
  lastTime = time;

  spinningShapes.forEach((mesh, index) => {
    const speed = 0.5 + index * 0.2;
    mesh.rotation.x += delta * speed;
    mesh.rotation.y += delta * speed * 1.2;
  });

  const orbitSpeed = 0.4;
  orbitingSpheres.forEach((mesh, index) => {
    const baseAngle = (index / orbitingSpheres.length) * Math.PI * 2;
    const angle = baseAngle + time * orbitSpeed;
    const radius = 6 + Math.sin(time * 0.7 + index) * 0.6;
    mesh.position.x = Math.cos(angle) * radius;
    mesh.position.z = Math.sin(angle) * radius;
  });

  if (centralPointLight) {
    const t = (Math.sin(time * 1.5) + 1) / 2;
    centralPointLight.intensity = 30 + t * 20;
    centralPointLight.color.setHSL(0.95 - t * 0.3, 0.9, 0.6);
  }

  controls.update();
  renderer.render(scene, camera);

  requestAnimationFrame(render);
}

main();

