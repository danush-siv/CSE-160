/**
 * CSE 160 Assignment 2 — 3D Blocky Lion
 * Danush Sivarajan
 * dsivaraj@ucsc.edu
 * 1932047
 */	

/**
 * CSE 160 Assignment 2 — 3D Blocky Lion
 * Features: Triangular nose, small brown eyes, orange mane, and an animated tongue (base only).
 */	

const VSHADER_SOURCE = `
attribute vec4 a_Position;
uniform mat4 u_ModelMatrix;
uniform mat4 u_GlobalRotationMatrix;
void main() {
	gl_Position = u_GlobalRotationMatrix * u_ModelMatrix * a_Position;
}
`;

const FSHADER_SOURCE = `
precision mediump float;
uniform vec4 u_FragColor;
void main() {
	gl_FragColor = u_FragColor;
}
`;

let canvas, gl, a_Position, u_ModelMatrix, u_FragColor, u_GlobalRotationMatrix;

function getCanvasAndContext() {
canvas = document.getElementById("webgl");
gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
if (!gl) throw new Error("Failed to get WebGL context");
gl.enable(gl.DEPTH_TEST);
}

function compileShadersAndConnectVariables() {
if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) throw new Error("Failed to initialize shaders");
a_Position = gl.getAttribLocation(gl.program, "a_Position");
u_ModelMatrix = gl.getUniformLocation(gl.program, "u_ModelMatrix");
u_FragColor = gl.getUniformLocation(gl.program, "u_FragColor");
u_GlobalRotationMatrix = gl.getUniformLocation(gl.program, "u_GlobalRotationMatrix");
}

// Global UI State
let g_globalRotation_y = 0, g_globalRotation_x = 0;
let g_headRotation = 0, g_headScale = 1, g_animation_enabled_head = false;
let g_tongueBaseRotation = 0, g_animation_enabled_tongueBase = false;
let g_leg_front_leftRotation = 0, g_leg_front_rightRotation = 0;
let g_leg_back_leftRotation = 0, g_leg_back_rightRotation = 0;
let g_animation_enabled_legs = false;
let g_tailProximalAngle = 0, g_tailMidAngle = 0, g_tailDistalAngle = 0, g_animation_enabled_tail = false;
let g_interactiveAnimationPlaying = false, g_interactiveAnimationStartTime = 0;

function createUIEvents() {
document.getElementById("globalRotationSlider_y").oninput = function() { g_globalRotation_y = this.value; renderScene(); };
document.getElementById("globalRotationSlider_x").oninput = function() { g_globalRotation_x = this.value; renderScene(); };
document.getElementById("headRotationSlider").oninput = function() { g_headRotation = this.value; renderScene(); };
document.getElementById("toggleAnimationButton_Head").onclick = () => g_animation_enabled_head = !g_animation_enabled_head;
document.getElementById("toggleAnimationButton_TongueBase").onclick = () => g_animation_enabled_tongueBase = !g_animation_enabled_tongueBase;
document.getElementById("toggleAnimationButton_Legs").onclick = () => g_animation_enabled_legs = !g_animation_enabled_legs;
document.getElementById("toggleAnimationButton_Tail").onclick = () => g_animation_enabled_tail = !g_animation_enabled_tail;

document.getElementById("tongueBaseRotationSlider").oninput = function() { g_tongueBaseRotation = this.value; renderScene(); };
document.getElementById("tailProximalSlider").oninput = function() { g_tailProximalAngle = parseFloat(this.value); renderScene(); };
document.getElementById("tailMidSlider").oninput = function() { g_tailMidAngle = parseFloat(this.value); renderScene(); };
document.getElementById("tailDistalSlider").oninput = function() { g_tailDistalAngle = parseFloat(this.value); renderScene(); };
}

function mouseToRotation(e) {
	const rect = canvas.getBoundingClientRect();
	const x = ((e.clientX - rect.left) - canvas.width / 2) / (canvas.width / 2);
	const y = (canvas.height / 2 - (e.clientY - rect.top)) / (canvas.height / 2);
	return [180 * x, 180 * y];
}

function main() {
getCanvasAndContext();
window.g_triangleBuffer = gl.createBuffer();
if (!window.g_triangleBuffer) throw new Error("Failed to create triangle buffer");
compileShadersAndConnectVariables();
createUIEvents();
canvas.onmousemove = (e) => {
	if (e.buttons === 1) {
		const [rotY, rotX] = mouseToRotation(e);
		g_globalRotation_y = rotY;
		g_globalRotation_x = rotX;
	}
};
canvas.onmousedown = (e) => { if (e.shiftKey) { g_interactiveAnimationStartTime = g_elapsedTime; g_interactiveAnimationPlaying = true; } };
gl.clearColor(0, 0, 0, 1);
requestAnimationFrame(tick);
}

const g_startTime = performance.now() / 1000.0;
let g_elapsedTime = 0;

function tick() {
g_elapsedTime = (performance.now() / 1000.0) - g_startTime;
updateAnimationAngles();
renderScene();
requestAnimationFrame(tick);
}

function updateAnimationAngles() {
if (g_interactiveAnimationPlaying) {
	g_headScale += 0.01;
	if (g_elapsedTime - g_interactiveAnimationStartTime >= 1) { g_headScale = 1; g_interactiveAnimationPlaying = false; }
}
if (g_animation_enabled_head) g_headRotation = 45 * Math.sin(g_elapsedTime);
if (g_animation_enabled_tongueBase) g_tongueBaseRotation = 15 * Math.sin(g_elapsedTime * 15);
if (g_animation_enabled_legs) {
	const t = g_elapsedTime * 4;
	g_leg_front_leftRotation = 45 * Math.sin(t);
	g_leg_front_rightRotation = 45 * Math.sin(t + Math.PI);
	g_leg_back_leftRotation = 45 * Math.sin(t);
	g_leg_back_rightRotation = 45 * Math.sin(t + Math.PI);
}
if (g_animation_enabled_tail) {
	const t = g_elapsedTime * 3;
	g_tailProximalAngle = 25 * Math.sin(t);
	g_tailMidAngle = 35 * Math.sin(t + 0.5);
	g_tailDistalAngle = 40 * Math.sin(t + 1.0);
}
}

function renderScene() {
const startRender = performance.now();
const globalRotationMatrix = new Matrix4();
globalRotationMatrix.rotate(g_globalRotation_x, 1, 0, 0);
globalRotationMatrix.rotate(-g_globalRotation_y, 0, 1, 0);
gl.uniformMatrix4fv(u_GlobalRotationMatrix, false, globalRotationMatrix.elements);
gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

const lionTan = [0.82, 0.65, 0.45, 1], lionTanDark = [0.72, 0.55, 0.38, 1];

// Body
const body = new Cube();
body.color = lionTan;
body.matrix.translate(-0.25, -0.25, 0).scale(0.5, 0.5, 1);
body.render();

// Legs
const legConfigs = [[0.15, 0.2, g_leg_front_leftRotation], [-0.15, 0.2, g_leg_front_rightRotation], [0.15, 0.95, g_leg_back_leftRotation], [-0.15, 0.95, g_leg_back_rightRotation]];
legConfigs.forEach(c => {
	let l = new Cube(); l.color = lionTanDark;
	l.matrix.translate(c[0], -0.2, c[1]).rotate(-c[2], 1, 0, 0).scale(0.22, 0.32, 0.22).translate(-0.5, -1, -0.5);
	l.render();
});

// Tail
let tp = new Cube(); tp.color = lionTan;
tp.matrix.translate(0, 0, 1).rotate(g_tailProximalAngle, 0, 1, 0);
let tpMat = new Matrix4(tp.matrix);
tp.matrix.scale(0.14, 0.11, 0.24).translate(0.5, -0.5, -0.5); tp.render();

let tm = new Cube(); tm.color = lionTanDark;
tm.matrix = new Matrix4(tpMat).translate(0, 0, 0.25).rotate(g_tailMidAngle, 0, 1, 0);
let tmMat = new Matrix4(tm.matrix);
tm.matrix.scale(0.11, 0.09, 0.18).translate(0.5, -0.5, -0.5); tm.render();

// Head Base Transform
let headMatrix = new Matrix4().translate(0, 0.18, -0.1).rotate(g_headRotation, 0, 0, 1).scale(g_headScale, g_headScale, g_headScale);

// --- HOLLOW SQUARE ORANGE MANE ---
const maneOrange = [0.85, 0.4, 0.1, 1], zM = -0.255;
const thickness = 0.04, size = 0.52;
[ [0, size/2, size+thickness, thickness], [0, -size/2, size+thickness, thickness],
  [-size/2, 0, thickness, size+thickness], [size/2, 0, thickness, size+thickness] 
].forEach(b => {
	let m = new Cube(); m.color = maneOrange;
	m.matrix = new Matrix4(headMatrix).translate(b[0], b[1], zM).scale(b[2], b[3], 0.05).translate(-0.5, -0.5, -0.5);
	m.render();
});

// Head Cube (Original proportions)
const h = new Cube(); h.color = lionTan;
h.matrix = new Matrix4(headMatrix).scale(0.52, 0.52, 0.5).translate(-0.5, -0.5, -0.5);
h.render();

// --- SMALL BROWN EYES ---
[-0.12, 0.12].forEach(x => {
	let e = new Cube(); e.color = [0.4, 0.2, 0.1, 1];
	e.matrix = new Matrix4(headMatrix).translate(x, 0.1, -0.26).scale(0.06, 0.06, 0.02).translate(-0.5, -0.5, -0.5); e.render();
	let p = new Cube(); p.color = [0.1, 0.05, 0, 1];
	p.matrix = new Matrix4(headMatrix).translate(x, 0.1, -0.27).scale(0.02, 0.02, 0.01).translate(-0.5, -0.5, -0.5); p.render();
});

// --- TRIANGULAR NOSE ---
const n = new Pyramid(); n.color = [0, 0, 0, 1];
n.matrix = new Matrix4(headMatrix).translate(0, -0.05, -0.26).rotate(180, 0, 0, 1).rotate(90, 1, 0, 0).scale(0.12, 0.12, 0.1).translate(-0.5, 0, -0.5);
n.render();

// --- ANIMATED TONGUE (base only) ---
const tonguePink = [0.95, 0.35, 0.4, 1];
let tBase = new Cube(); tBase.color = tonguePink;
tBase.matrix = new Matrix4(headMatrix).translate(0, -0.16, -0.255).rotate(g_tongueBaseRotation, 1, 0, 0);
tBase.matrix.scale(0.12, 0.06, 0.12).translate(-0.5, -0.5, -0.5); tBase.render();

const dur = performance.now() - startRender;
const rawFps = Math.floor(1000 / dur);
document.getElementById("fpsCounter").innerHTML = `ms: ${dur.toFixed(2)}, fps: ${rawFps}, fps (capped): ${Math.min(60, rawFps)}`;
}