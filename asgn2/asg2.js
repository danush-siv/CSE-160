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
let g_tongueTipRotation = 0, g_animation_enabled_tongueTip = false;
let g_leg_front_leftRotation = 0, g_leg_front_rightRotation = 0;
let g_leg_back_leftRotation = 0, g_leg_back_rightRotation = 0;
let g_animation_enabled_legs = false;
let g_tailProximalAngle = 0, g_tailMidAngle = 0, g_tailDistalAngle = 0, g_animation_enabled_tail = false;
let g_interactiveAnimationPlaying = false, g_interactiveAnimationStartTime = 0;

function createUIEvents() {
	document.getElementById("globalRotationSlider_y").oninput = function() { g_globalRotation_y = this.value; renderAllShapes(); };
	document.getElementById("globalRotationSlider_x").oninput = function() { g_globalRotation_x = this.value; renderAllShapes(); };
	document.getElementById("headRotationSlider").oninput = function() { g_headRotation = this.value; renderAllShapes(); };
	document.getElementById("toggleAnimationButton_Head").onclick = () => g_animation_enabled_head = !g_animation_enabled_head;
	document.getElementById("toggleAnimationButton_TongueBase").onclick = () => g_animation_enabled_tongueBase = !g_animation_enabled_tongueBase;
	document.getElementById("toggleAnimationButton_TongueTip").onclick = () => g_animation_enabled_tongueTip = !g_animation_enabled_tongueTip;
	document.getElementById("toggleAnimationButton_Legs").onclick = () => g_animation_enabled_legs = !g_animation_enabled_legs;
	document.getElementById("toggleAnimationButton_Tail").onclick = () => g_animation_enabled_tail = !g_animation_enabled_tail;
    
    document.getElementById("tongueBaseRotationSlider").oninput = function() { g_tongueBaseRotation = this.value; renderAllShapes(); };
    document.getElementById("tongueTipRotationSlider").oninput = function() { g_tongueTipRotation = this.value; renderAllShapes(); };
    document.getElementById("tailProximalSlider").oninput = function() { g_tailProximalAngle = parseFloat(this.value); renderAllShapes(); };
	document.getElementById("tailMidSlider").oninput = function() { g_tailMidAngle = parseFloat(this.value); renderAllShapes(); };
	document.getElementById("tailDistalSlider").oninput = function() { g_tailDistalAngle = parseFloat(this.value); renderAllShapes(); };
}

function main() {
	getCanvasAndContext();
	compileShadersAndConnectVariables();
	createUIEvents();
	canvas.onmousedown = (e) => { if (e.shiftKey) { g_interactiveAnimationStartTime = g_elapsedTime; g_interactiveAnimationPlaying = true; } };
	gl.clearColor(0, 0, 0, 1);
	requestAnimationFrame(tick);
}

const g_startTime = performance.now() / 1000.0;
let g_elapsedTime = 0;

function tick() {
	g_elapsedTime = (performance.now() / 1000.0) - g_startTime;
	updateAnimationAngles();
	renderAllShapes();
	requestAnimationFrame(tick);
}

function updateAnimationAngles() {
	if (g_interactiveAnimationPlaying) {
		g_headScale += 0.01;
		if (g_elapsedTime - g_interactiveAnimationStartTime >= 1) { g_headScale = 1; g_interactiveAnimationPlaying = false; }
	}
	if (g_animation_enabled_head) g_headRotation = 45 * Math.sin(g_elapsedTime);
	if (g_animation_enabled_tongueBase) g_tongueBaseRotation = 15 * Math.sin(g_elapsedTime * 20);
	if (g_animation_enabled_tongueTip) g_tongueTipRotation = 30 * Math.sin(g_elapsedTime * 20);
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

function renderAllShapes() {
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

	// REFINED MANE SQUARE OUTLINE (Connected and Smaller)
	const maneColor = [0.32, 0.16, 0.05, 1], b = 0.21, zM = -0.252;
	[
        [-b, b], [0, b], [b, b],    // Top row
        [-b, 0],         [b, 0],    // Sides
        [-b, -b], [0, -b], [b, -b]  // Bottom row
    ].forEach(p => {
		let m = new Cube(); m.color = maneColor;
		m.matrix = new Matrix4(headMatrix).translate(p[0], p[1], zM);
        // Smaller blocks (0.12 instead of 0.18) make it look less bulky
		m.matrix.scale(0.12, 0.12, 0.08).translate(-0.5, -0.5, -0.5);
		m.render();
	});

	// Head Cube
	const h = new Cube(); h.color = lionTan;
	h.matrix = new Matrix4(headMatrix).scale(0.5, 0.5, 0.5).translate(-0.5, -0.5, -0.5);
	h.render();

	// Eyes & Pupils
	[-0.1, 0.1].forEach(x => {
		let e = new Cube(); e.color = [0.92, 0.68, 0.2, 1];
		e.matrix = new Matrix4(headMatrix).translate(x, 0.08, -0.26).scale(0.08, 0.08, 0.05).translate(-0.5, -0.5, -0.5); e.render();
		let p = new Cube(); p.color = [0, 0, 0, 1];
		p.matrix = new Matrix4(headMatrix).translate(x, 0.08, -0.27).scale(0.03, 0.03, 0.02).translate(-0.5, -0.5, -0.5); p.render();
	});

	// Nose (Pyramid)
	const n = new Pyramid(); n.color = [0, 0, 0, 1];
	n.matrix = new Matrix4(headMatrix).translate(0, -0.05, -0.26).rotate(90, 1, 0, 0).scale(0.1, 0.1, 0.1).translate(-0.5, 0, -0.5);
	n.render();

	const dur = performance.now() - startRender;
	document.getElementById("fpsCounter").innerHTML = `ms: ${dur.toFixed(2)}, fps: ${Math.floor(1000/dur)}`;
}