/**
 * CSE 160 Assignment 2 — 3D Blocky Lion
 * Danush Sivarajan
 * dsivaraj@ucsc.edu
 * 1932047
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

let canvas;
let gl;
let a_Position;
let u_ModelMatrix;
let u_FragColor;
let u_GlobalRotationMatrix;

function getCanvasAndContext() {
	canvas = document.getElementById("webgl");
	gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
	if (!gl) {
		throw new Error("Failed to get the rendering context for WebGL");
	}
	gl.enable(gl.DEPTH_TEST);
}

function compileShadersAndConnectVariables() {
	if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
		throw new Error("Failed to intialize shaders");
	}
	const identity = new Matrix4();
	a_Position = gl.getAttribLocation(gl.program, "a_Position");
	u_ModelMatrix = gl.getUniformLocation(gl.program, "u_ModelMatrix");
	u_FragColor = gl.getUniformLocation(gl.program, "u_FragColor");
	u_GlobalRotationMatrix = gl.getUniformLocation(gl.program, "u_GlobalRotationMatrix");
	gl.uniformMatrix4fv(u_ModelMatrix, false, identity.elements);
	gl.uniformMatrix4fv(u_GlobalRotationMatrix, false, identity.elements);
}

// State variables
let g_globalRotation_y = 0;
let g_globalRotation_x = 0;
let g_headRotation = 0;
let g_headScale = 1;
let g_animation_enabled_head = false;
let g_tongueBaseRotation = 0;
let g_animation_enabled_tongueBase = false;
let g_tongueTipRotation = 0;
let g_animation_enabled_tongueTip = false;
let g_leg_front_leftRotation = 0;
let g_leg_front_rightRotation = 0;
let g_leg_back_leftRotation = 0;
let g_leg_back_rightRotation = 0;
let g_animation_enabled_legs = false;
let g_tailProximalAngle = 0;
let g_tailMidAngle = 0;
let g_tailDistalAngle = 0;
let g_animation_enabled_tail = false;
let g_interactiveAnimationPlaying = false;

function createUIEvents() {
	document.getElementById("globalRotationSlider_y").oninput = function() { g_globalRotation_y = this.value; renderAllShapes(); };
	document.getElementById("globalRotationSlider_x").oninput = function() { g_globalRotation_x = this.value; renderAllShapes(); };
	document.getElementById("headRotationSlider").oninput = function() { g_headRotation = this.value; renderAllShapes(); };
	document.getElementById("toggleAnimationButton_Head").onclick = () => g_animation_enabled_head = !g_animation_enabled_head;
	document.getElementById("tongueBaseRotationSlider").oninput = function() { g_tongueBaseRotation = this.value; renderAllShapes(); };
	document.getElementById("toggleAnimationButton_TongueBase").onclick = () => g_animation_enabled_tongueBase = !g_animation_enabled_tongueBase;
	document.getElementById("tongueTipRotationSlider").oninput = function() { g_tongueTipRotation = this.value; renderAllShapes(); };
	document.getElementById("toggleAnimationButton_TongueTip").onclick = () => g_animation_enabled_tongueTip = !g_animation_enabled_tongueTip;
	document.getElementById("toggleAnimationButton_Legs").onclick = () => g_animation_enabled_legs = !g_animation_enabled_legs;
	document.getElementById("tailProximalSlider").oninput = function() { g_tailProximalAngle = parseFloat(this.value); renderAllShapes(); };
	document.getElementById("tailMidSlider").oninput = function() { g_tailMidAngle = parseFloat(this.value); renderAllShapes(); };
	document.getElementById("tailDistalSlider").oninput = function() { g_tailDistalAngle = parseFloat(this.value); renderAllShapes(); };
	document.getElementById("toggleAnimationButton_Tail").onclick = () => g_animation_enabled_tail = !g_animation_enabled_tail;
}

function main() {
	getCanvasAndContext();
	compileShadersAndConnectVariables();
	createUIEvents();
	canvas.onmousedown = function(e) { if (e.shiftKey) { g_interactiveAnimationStartTime = g_elapsedTime; g_interactiveAnimationPlaying = true; } };
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	requestAnimationFrame(tick);
}

const g_startTime = performance.now() / 1000.0;
let g_elapsedTime = 0;
let g_interactiveAnimationStartTime = 0;

function tick() {
	g_elapsedTime = (performance.now() / 1000.0) - g_startTime;
	if (g_interactiveAnimationPlaying) {
		g_headScale += 0.01;
		if (g_elapsedTime - g_interactiveAnimationStartTime >= 1) { g_headScale = 1; g_interactiveAnimationPlaying = false; }
	} else {
		updateAnimationAngles();
	}
	renderAllShapes();
	requestAnimationFrame(tick);
}

function updateAnimationAngles() {
	if (g_animation_enabled_head) g_headRotation = 45 * Math.sin(g_elapsedTime);
	if (g_animation_enabled_tongueBase) g_tongueBaseRotation = 15 * Math.sin(g_elapsedTime * 20);
	if (g_animation_enabled_tongueTip) g_tongueTipRotation = 30 * Math.sin(g_elapsedTime * 20);
	if (g_animation_enabled_legs) {
		g_leg_front_leftRotation = 45 * Math.sin(g_elapsedTime * 4);
		g_leg_front_rightRotation = 45 * Math.sin(g_elapsedTime * 4 + Math.PI);
		g_leg_back_leftRotation = 45 * Math.sin(g_elapsedTime * 4);
		g_leg_back_rightRotation = 45 * Math.sin(g_elapsedTime * 4 + Math.PI);
	}
	if (g_animation_enabled_tail) {
		g_tailProximalAngle = 25 * Math.sin(g_elapsedTime * 3);
		g_tailMidAngle = 35 * Math.sin(g_elapsedTime * 3 + 0.5);
		g_tailDistalAngle = 40 * Math.sin(g_elapsedTime * 3 + 1.0);
	}
}

function renderAllShapes() {
	const startTime = performance.now();
	const globalRotationMatrix = new Matrix4();
	globalRotationMatrix.rotate(g_globalRotation_x, 1, 0, 0);
	globalRotationMatrix.rotate(-g_globalRotation_y, 0, 1, 0);
	gl.uniformMatrix4fv(u_GlobalRotationMatrix, false, globalRotationMatrix.elements);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	const lionTan = [0.82, 0.65, 0.45, 1];
	const lionTanDark = [0.72, 0.55, 0.38, 1];

	// Body
	const body = new Cube();
	body.color = lionTan;
	body.matrix.translate(-0.25, -0.25, 0);
	body.matrix.scale(0.5, 0.5, 1);
	body.render();

	// Legs (Simplified loop for brevity)
	[ [0.15, 0.2, g_leg_front_leftRotation], [-0.15, 0.2, g_leg_front_rightRotation], 
	  [0.15, 0.95, g_leg_back_leftRotation], [-0.15, 0.95, g_leg_back_rightRotation] ].forEach(cfg => {
		let leg = new Cube();
		leg.color = lionTanDark;
		leg.matrix.translate(cfg[0], -0.2, cfg[1]);
		leg.matrix.rotate(-cfg[2], 1, 0, 0);
		leg.matrix.scale(0.22, 0.32, 0.22);
		leg.matrix.translate(-0.5, -1, -0.5);
		leg.render();
	});

	// Head Base Transform
	let headBase = new Matrix4();
	headBase.translate(0, 0.18, -0.1);
	headBase.rotate(g_headRotation, 0, 0, 1);
	headBase.scale(g_headScale, g_headScale, g_headScale);
	const headCoordsMatrix = new Matrix4(headBase);

	// Mane (Outline logic)
	const maneDarkBrown = [0.32, 0.16, 0.05, 1];
	const pad = 0.28;
	[[-pad, -pad, -pad], [pad, -pad, -pad], [-pad, pad, -pad], [pad, pad, -pad],
	 [-pad, -pad, pad], [pad, -pad, pad], [-pad, pad, pad], [pad, pad, pad]].forEach(pos => {
		let m = new Cube();
		m.color = maneDarkBrown;
		m.matrix = new Matrix4(headCoordsMatrix);
		m.matrix.translate(pos[0], pos[1], pos[2]);
		m.matrix.scale(0.15, 0.15, 0.15);
		m.matrix.translate(-0.5, -0.5, -0.5);
		m.render();
	});

	// Head Cube
	const head = new Cube();
	head.color = lionTan;
	head.matrix = new Matrix4(headCoordsMatrix);
	head.matrix.scale(0.5, 0.5, 0.5);
	head.matrix.translate(-0.5, -0.5, -0.5);
	head.render();

	// Eyes (Centered symmetrically)
	[ -0.12, 0.12 ].forEach(x => {
		let eye = new Cube();
		eye.color = [0.92, 0.68, 0.2, 1];
		eye.matrix = new Matrix4(headCoordsMatrix);
		eye.matrix.translate(x, 0.1, -0.26);
		eye.matrix.scale(0.1, 0.1, 0.05);
		eye.matrix.translate(-0.5, -0.5, -0.5);
		eye.render();
		
		let pupil = new Cube();
		pupil.color = [0, 0, 0, 1];
		pupil.matrix = new Matrix4(headCoordsMatrix);
		pupil.matrix.translate(x, 0.1, -0.28);
		pupil.matrix.scale(0.04, 0.04, 0.02);
		pupil.matrix.translate(-0.5, -0.5, -0.5);
		pupil.render();
	});

	// Nose (Black Pyramid)
	const nose = new Pyramid();
	nose.color = [0, 0, 0, 1];
	nose.matrix = new Matrix4(headCoordsMatrix);
	nose.matrix.translate(0, -0.05, -0.3);
	nose.matrix.rotate(90, 1, 0, 0); 
	nose.matrix.scale(0.12, 0.12, 0.12);
	nose.matrix.translate(-0.5, 0, -0.5);
	nose.render();

	const duration = performance.now() - startTime;
	document.getElementById("fpsCounter").innerHTML = `ms: ${duration.toFixed(2)}, fps: ${Math.floor(1000/duration)}`;
}