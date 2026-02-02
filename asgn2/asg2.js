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
/** Fragment shader: single uniform color per draw call. */
const FSHADER_SOURCE = `
	precision mediump float;
	uniform vec4 u_FragColor;
	void main() {
		gl_FragColor = u_FragColor;
	}
`;

// --- WebGL and shader interface handles (set during init) ---
let canvas;
let gl;
let a_Position;
let u_ModelMatrix;
let u_FragColor;
let u_GlobalRotationMatrix;

/**
 * Grabs the WebGL canvas and context; enables depth testing so faces render in correct order.
 */
function getCanvasAndContext() {
	canvas = document.getElementById("webgl");
	gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
	if (!gl) {
		throw new Error("Failed to get the rendering context for WebGL");
	}
	gl.enable(gl.DEPTH_TEST);
}

/**
 * Compiles vertex/fragment shaders and looks up attribute/uniform locations.
 * Initializes uniform matrices to identity.
 */
function compileShadersAndConnectVariables() {
	if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
		throw new Error("Failed to intialize shaders");
	}

	const identity = new Matrix4();

	a_Position = gl.getAttribLocation(gl.program, "a_Position");
	if (a_Position < 0) {
		throw new Error("Failed to get the storage location of a_Position");
	}

	u_ModelMatrix = gl.getUniformLocation(gl.program, "u_ModelMatrix");
	if (!u_ModelMatrix) {
		throw new Error("Failed to get the storage location of u_ModelMatrix");
	}
	gl.uniformMatrix4fv(u_ModelMatrix, false, identity.elements);

	u_FragColor = gl.getUniformLocation(gl.program, "u_FragColor");
	if (!u_FragColor) {
		throw new Error("Failed to get the storage location of u_FragColor");
	}

	u_GlobalRotationMatrix = gl.getUniformLocation(gl.program, "u_GlobalRotationMatrix");
	if (!u_GlobalRotationMatrix) {
		throw new Error("Failed to get the storage location of u_GlobalRotationMatrix");
	}
	gl.uniformMatrix4fv(u_GlobalRotationMatrix, false, identity.elements);
}

// --- Camera / view rotation (sliders + mouse) ---
let g_globalRotation_y = 0;
let g_globalRotation_x = 0;

// --- Head: rotation and “poke” scale ---
let g_headRotation = 0;
let g_headScale = 1;
let g_animation_enabled_head = false;

// --- Tongue: two joints (base and tip) ---
let g_tongueBaseRotation = 0;
let g_animation_enabled_tongueBase = false;
let g_tongueTipRotation = 0;
let g_animation_enabled_tongueTip = false;

// --- Legs: four joints (one per leg) ---
let g_leg_front_leftRotation = 0;
let g_leg_front_rightRotation = 0;
let g_leg_back_leftRotation = 0;
let g_leg_back_rightRotation = 0;
let g_animation_enabled_legs = false;

/**
 * Tail: third-joint limb — three segments (proximal → mid → distal) with three joint angles.
 * Chain: body → tail_proximal → tail_mid → tail_distal.
 */
let g_tailProximalAngle = 0;
let g_tailMidAngle = 0;
let g_tailDistalAngle = 0;
let g_animation_enabled_tail = false;

// --- Shift-click “poke” reaction ---
let g_interactiveAnimationPlaying = false;

/**
 * Binds slider and button elements to global state and redraws on input.
 */
function createUIEvents() {
	// Camera rotation sliders
	document.getElementById("globalRotationSlider_y").addEventListener("mousemove", function() {
		g_globalRotation_y = this.value;
		renderAllShapes();
	});
	document.getElementById("globalRotationSlider_x").addEventListener("mousemove", function() {
		g_globalRotation_x = this.value;
		renderAllShapes();
	});

	// Head
	document.getElementById("headRotationSlider").addEventListener("mousemove", function() {
		g_headRotation = this.value;
		renderAllShapes();
	});
	document.getElementById("toggleAnimationButton_Head").onclick = () => g_animation_enabled_head = !g_animation_enabled_head;

	// Tongue base and tip
	document.getElementById("tongueBaseRotationSlider").addEventListener("mousemove", function() {
		g_tongueBaseRotation = this.value;
		renderAllShapes();
	});
	document.getElementById("toggleAnimationButton_TongueBase").onclick = () => g_animation_enabled_tongueBase = !g_animation_enabled_tongueBase;
	document.getElementById("tongueTipRotationSlider").addEventListener("mousemove", function() {
		g_tongueTipRotation = this.value;
		renderAllShapes();
	});
	document.getElementById("toggleAnimationButton_TongueTip").onclick = () => g_animation_enabled_tongueTip = !g_animation_enabled_tongueTip;

	// Legs
	document.getElementById("leg_front_leftRotationSlider").addEventListener("mousemove", function() {
		g_leg_front_leftRotation = this.value;
		renderAllShapes();
	});
	document.getElementById("leg_front_rightRotationSlider").addEventListener("mousemove", function() {
		g_leg_front_rightRotation = this.value;
		renderAllShapes();
	});
	document.getElementById("leg_back_leftRotationSlider").addEventListener("mousemove", function() {
		g_leg_back_leftRotation = this.value;
		renderAllShapes();
	});
	document.getElementById("leg_back_rightRotationSlider").addEventListener("mousemove", function() {
		g_leg_back_rightRotation = this.value;
		renderAllShapes();
	});
	document.getElementById("toggleAnimationButton_Legs").onclick = () => g_animation_enabled_legs = !g_animation_enabled_legs;

	// Tail (third-joint limb): three sliders + animation toggle
	document.getElementById("tailProximalSlider").addEventListener("mousemove", function() {
		g_tailProximalAngle = parseFloat(this.value);
		renderAllShapes();
	});
	document.getElementById("tailMidSlider").addEventListener("mousemove", function() {
		g_tailMidAngle = parseFloat(this.value);
		renderAllShapes();
	});
	document.getElementById("tailDistalSlider").addEventListener("mousemove", function() {
		g_tailDistalAngle = parseFloat(this.value);
		renderAllShapes();
	});
	document.getElementById("toggleAnimationButton_Tail").onclick = () => g_animation_enabled_tail = !g_animation_enabled_tail;
}

/**
 * Entry point: init WebGL, shaders, UI, and start the render loop.
 */
function main() {
	getCanvasAndContext();
	compileShadersAndConnectVariables();
	createUIEvents();

	// Mouse: drag to rotate camera; shift+click for “poke” reaction
	canvas.onmousemove = function(e) {
		if (e.buttons === 1) {
			rotateCamera(e);
		}
	};
	canvas.onmousedown = function(e) {
		if (e.shiftKey) {
			g_interactiveAnimationStartTime = g_elapsedTime;
			g_interactiveAnimationPlaying = true;
		}
	};

	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	requestAnimationFrame(tick);
}

/**
 * Map mouse position to rotation angles (x → y-axis rotation, y → x-axis rotation).
 */
function rotateCamera(e) {
	const [x, y] = mouseToNormalizedCoords(e);
	g_globalRotation_y = 180 * x;
	g_globalRotation_x = 180 * y;
}

/** Convert mouse event to normalized device-like coordinates for rotation. */
function mouseToNormalizedCoords(e) {
	let x = e.clientX;
	let y = e.clientY;
	const rect = e.target.getBoundingClientRect();
	x = ((x - rect.left) - canvas.width / 2) / (canvas.width / 2);
	y = (canvas.height / 2 - (y - rect.top)) / (canvas.height / 2);
	return [x, y];
}

// --- Animation timing ---
const g_startTime = getTimeSeconds();
let g_elapsedTime = 0;
const g_interactiveAnimationDuration = 1;
let g_interactiveAnimationStartTime = 0;

function getTimeSeconds() {
	return performance.now() / 1000.0;
}

/**
 * Called every frame: advance time, run animation updates, then render.
 */
function tick() {
	g_elapsedTime = getTimeSeconds() - g_startTime;

	if (g_interactiveAnimationPlaying) {
		updateInteractiveAnimation();
	} else {
		updateAnimationAngles();
	}

	renderAllShapes();
	requestAnimationFrame(tick);
}

/**
 * “Poke” reaction: scale head up then reset when duration has passed.
 */
function updateInteractiveAnimation() {
	g_headScale += 0.01;
	const elapsed = g_elapsedTime - g_interactiveAnimationStartTime;
	if (elapsed >= g_interactiveAnimationDuration) {
		g_headScale = 1;
		g_interactiveAnimationPlaying = false;
	}
}

/**
 * When animation is on for a part, drive its joint angles from time (overrides sliders for that part).
 */
function updateAnimationAngles() {
	if (g_animation_enabled_head) {
		g_headRotation = 45 * Math.sin(g_elapsedTime);
	}
	if (g_animation_enabled_tongueBase) {
		g_tongueBaseRotation = 15 * Math.sin(g_elapsedTime * 20);
	}
	if (g_animation_enabled_tongueTip) {
		g_tongueTipRotation = 30 * Math.sin(g_elapsedTime * 20);
	}
	if (g_animation_enabled_legs) {
		g_leg_front_leftRotation = 45 * Math.sin(g_elapsedTime * 4);
		g_leg_back_leftRotation = 45 * Math.sin(g_elapsedTime * 4);
		g_leg_front_rightRotation = 45 * Math.sin(g_elapsedTime * 4 + Math.PI);
		g_leg_back_rightRotation = 45 * Math.sin(g_elapsedTime * 4 + Math.PI);
	}
	// Tail (third joint): wave all three segments for a simple motion
	if (g_animation_enabled_tail) {
		const t = g_elapsedTime * 3;
		g_tailProximalAngle = 25 * Math.sin(t);
		g_tailMidAngle = 35 * Math.sin(t + 0.5);
		g_tailDistalAngle = 40 * Math.sin(t + 1.0);
	}
}

const fpsCounter = document.getElementById("fpsCounter");

/**
 * Main draw routine: set global rotation, clear color+depth, then draw all parts.
 * Joint hierarchy is expressed by copying parent matrices and applying local transforms.
 */
function renderAllShapes() {
	const startTime = performance.now();

	// Apply camera (global) rotation so the whole creature rotates
	const globalRotationMatrix = new Matrix4();
	globalRotationMatrix.rotate(g_globalRotation_x, 1, 0, 0);
	globalRotationMatrix.rotate(-g_globalRotation_y, 0, 1, 0);
	gl.uniformMatrix4fv(u_GlobalRotationMatrix, false, globalRotationMatrix.elements);

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	// Lion body color: tan/sandy
	const lionTan = [0.82, 0.65, 0.45, 1];
	const lionTanDark = [0.72, 0.55, 0.38, 1];
	const maneColor = [0.68, 0.42, 0.18, 1];
	const maneColorLight = [0.78, 0.5, 0.22, 1];

	// --- Body (root) ---
	const body = new Cube();
	body.color = lionTan;
	body.matrix.translate(-0.25, -0.25, 0);
	body.matrix.scale(0.5, 0.5, 1);
	body.render();

	// --- Legs (one joint per leg, same tan as body) ---
	const leg_front_left = new Cube();
	leg_front_left.color = lionTanDark;
	leg_front_left.matrix.translate(0.15, -0.2, 0.2);
	leg_front_left.matrix.rotate(-g_leg_front_leftRotation, 1, 0, 0);
	leg_front_left.matrix.scale(0.22, 0.32, 0.22);
	leg_front_left.matrix.translate(-0.5, -1, -0.5);
	leg_front_left.render();

	const leg_front_right = new Cube();
	leg_front_right.color = lionTanDark;
	leg_front_right.matrix.translate(-0.15, -0.2, 0.2);
	leg_front_right.matrix.rotate(-g_leg_front_rightRotation, 1, 0, 0);
	leg_front_right.matrix.scale(0.22, 0.32, 0.22);
	leg_front_right.matrix.translate(-0.5, -1, -0.5);
	leg_front_right.render();

	const leg_back_left = new Cube();
	leg_back_left.color = lionTanDark;
	leg_back_left.matrix.translate(0.15, -0.2, 0.95);
	leg_back_left.matrix.rotate(-g_leg_back_leftRotation, 1, 0, 0);
	leg_back_left.matrix.scale(0.22, 0.32, 0.22);
	leg_back_left.matrix.translate(-0.5, -1, -0.5);
	leg_back_left.render();

	const leg_back_right = new Cube();
	leg_back_right.color = lionTanDark;
	leg_back_right.matrix.translate(-0.15, -0.2, 0.95);
	leg_back_right.matrix.rotate(-g_leg_back_rightRotation, 1, 0, 0);
	leg_back_right.matrix.scale(0.22, 0.32, 0.22);
	leg_back_right.matrix.translate(-0.5, -1, -0.5);
	leg_back_right.render();

	// --- Tail: third-joint limb on back (body → proximal → mid → distal), tan with dark tuft ---
	const tailProximal = new Cube();
	tailProximal.color = lionTan;
	tailProximal.matrix.translate(0, 0, 1);
	tailProximal.matrix.rotate(g_tailProximalAngle, 0, 1, 0);
	const tailProximalMatrix = new Matrix4(tailProximal.matrix);
	tailProximal.matrix.scale(0.14, 0.11, 0.24);
	tailProximal.matrix.translate(0.5, -0.5, -0.5);
	tailProximal.render();

	const tailMid = new Cube();
	tailMid.color = lionTanDark;
	tailMid.matrix = new Matrix4(tailProximalMatrix);
	tailMid.matrix.translate(0, 0, 0.25);
	tailMid.matrix.rotate(g_tailMidAngle, 0, 1, 0);
	const tailMidMatrix = new Matrix4(tailMid.matrix);
	tailMid.matrix.scale(0.11, 0.09, 0.18);
	tailMid.matrix.translate(0.5, -0.5, -0.5);
	tailMid.render();

	const tailDistal = new Cube();
	tailDistal.color = lionTanDark;
	tailDistal.matrix = new Matrix4(tailMidMatrix);
	tailDistal.matrix.translate(0, 0, 0.2);
	tailDistal.matrix.rotate(g_tailDistalAngle, 0, 1, 0);
	const tailDistalTipMatrix = new Matrix4(tailDistal.matrix);
	tailDistal.matrix.scale(0.09, 0.07, 0.14);
	tailDistal.matrix.translate(0.5, -0.5, -0.5);
	tailDistal.render();

	// Dark tuft at tip of tail
	const tailTuft = new Cube();
	tailTuft.color = [0.28, 0.2, 0.14, 1];
	tailTuft.matrix = new Matrix4(tailDistalTipMatrix);
	tailTuft.matrix.translate(0, 0, 0.14);
	tailTuft.matrix.scale(0.08, 0.08, 0.06);
	tailTuft.matrix.translate(-0.5, -0.5, -0.5);
	tailTuft.render();

	// --- Head: big face (larger scale for lion), tan ---
	const head = new Cube();
	head.color = lionTan;
	head.matrix.translate(0, 0.18, -0.28);
	head.matrix.rotate(g_headRotation, 0, 0, 1);
	head.matrix.scale(g_headScale, g_headScale, g_headScale);
	const headCoordsMatrix = new Matrix4(head.matrix);
	head.matrix.scale(0.52, 0.52, 0.48);
	head.matrix.translate(-0.5, -0.5, 0);
	head.render();

	// Muzzle/snout (big face detail)
	const muzzle = new Cube();
	muzzle.color = lionTanDark;
	muzzle.matrix = new Matrix4(headCoordsMatrix);
	muzzle.matrix.translate(0, -0.08, 0.28);
	muzzle.matrix.scale(0.35, 0.2, 0.2);
	muzzle.matrix.translate(-0.5, -0.5, -0.5);
	muzzle.render();

	// Nose: black triangle (pyramid), base up / point down on muzzle
	const nose = new Pyramid();
	nose.color = [0.06, 0.06, 0.06, 1];
	nose.matrix = new Matrix4(headCoordsMatrix);
	nose.matrix.translate(0.08, -0.14, 0.38);
	nose.matrix.rotate(180, 1, 0, 0);
	nose.matrix.scale(0.1, 0.08, 0.08);
	nose.matrix.translate(-0.5, -0.5, -0.5);
	nose.render();

	// Eyes: centered on face (symmetric, same y), amber with pupils
	const eyeY = 0.2;
	const eyeZ = -0.02;
	const eyeLeftX = 0.14;
	const eyeRightX = 0.38;
	const eye_left = new Cube();
	eye_left.color = [0.92, 0.68, 0.2, 1];
	eye_left.matrix = new Matrix4(headCoordsMatrix);
	eye_left.matrix.translate(eyeLeftX, eyeY, eyeZ);
	eye_left.matrix.scale(0.12, 0.1, 0.05);
	eye_left.matrix.translate(-0.5, -0.5, -0.5);
	eye_left.render();

	const eye_right = new Cube();
	eye_right.color = [0.92, 0.68, 0.2, 1];
	eye_right.matrix = new Matrix4(headCoordsMatrix);
	eye_right.matrix.translate(eyeRightX, eyeY, eyeZ);
	eye_right.matrix.scale(0.12, 0.1, 0.05);
	eye_right.matrix.translate(-0.5, -0.5, -0.5);
	eye_right.render();

	const pupil_left = new Cube();
	pupil_left.color = [0.04, 0.04, 0.04, 1];
	pupil_left.matrix = new Matrix4(headCoordsMatrix);
	pupil_left.matrix.translate(eyeLeftX + 0.02, eyeY, eyeZ - 0.015);
	pupil_left.matrix.scale(0.04, 0.04, 0.02);
	pupil_left.matrix.translate(-0.5, -0.5, -0.5);
	pupil_left.render();

	const pupil_right = new Cube();
	pupil_right.color = [0.04, 0.04, 0.04, 1];
	pupil_right.matrix = new Matrix4(headCoordsMatrix);
	pupil_right.matrix.translate(eyeRightX - 0.02, eyeY, eyeZ - 0.015);
	pupil_right.matrix.scale(0.04, 0.04, 0.02);
	pupil_right.matrix.translate(-0.5, -0.5, -0.5);
	pupil_right.render();

	// --- Mane: darker brown box around the head cube (frame on all sides) ---
	const maneDarkBrown = [0.38, 0.22, 0.08, 1];
	// Head in headCoords is 0.52 x 0.52 x 0.48 from (0,0,0) to (0.52, 0.52, 0.48). Frame just outside.
	const maneFrame = [
		[-0.1, 0.1, 0.1], [-0.1, 0.1, 0.4], [-0.1, 0.42, 0.1], [-0.1, 0.42, 0.4],
		[0.62, 0.1, 0.1], [0.62, 0.1, 0.4], [0.62, 0.42, 0.1], [0.62, 0.42, 0.4],
		[0.1, 0.62, 0.1], [0.42, 0.62, 0.1], [0.1, 0.62, 0.4], [0.42, 0.62, 0.4],
		[0.1, -0.1, 0.1], [0.42, -0.1, 0.1], [0.1, -0.1, 0.4], [0.42, -0.1, 0.4],
		[0.1, 0.1, 0.56], [0.42, 0.1, 0.56], [0.1, 0.42, 0.56], [0.42, 0.42, 0.56],
		[0.1, 0.1, -0.08], [0.42, 0.1, -0.08], [0.1, 0.42, -0.08], [0.42, 0.42, -0.08]
	];
	for (let i = 0; i < maneFrame.length; i++) {
		const m = new Cube();
		m.color = maneDarkBrown;
		m.matrix = new Matrix4(headCoordsMatrix);
		m.matrix.translate(maneFrame[i][0], maneFrame[i][1], maneFrame[i][2]);
		m.matrix.scale(0.16, 0.16, 0.16);
		m.matrix.translate(-0.5, -0.5, -0.5);
		m.render();
	}

	// --- Tongue: two joints (base then tip), kept out and pink ---
	const tongue_base = new Cube();
	tongue_base.color = [0.95, 0.35, 0.4, 1];
	tongue_base.matrix = new Matrix4(headCoordsMatrix);
	tongue_base.matrix.translate(0, -0.18, 0.15);
	tongue_base.matrix.rotate(g_tongueBaseRotation, 1, 0, 0);
	tongue_base.matrix.rotate(55, 1, 0, 0);
	const tongueBaseCoordsMatrix = new Matrix4(tongue_base.matrix);
	tongue_base.matrix.scale(0.18, 0.08, 0.04);
	tongue_base.matrix.translate(-0.5, -1, -0.5);
	tongue_base.render();

	const tongue_tip = new Cube();
	tongue_tip.color = [0.95, 0.35, 0.4, 1];
	tongue_tip.matrix = new Matrix4(tongueBaseCoordsMatrix);
	tongue_tip.matrix.translate(0, -0.12, 0);
	tongue_tip.matrix.rotate(g_tongueTipRotation, 1, 0, 0);
	tongue_tip.matrix.scale(0.18, 0.08, 0.04);
	tongue_tip.matrix.translate(-0.5, -1, -0.5);
	tongue_tip.render();

	const duration = performance.now() - startTime;
	fpsCounter.innerHTML = `ms: ${duration.toFixed(2)}, fps: ${Math.floor(1000 / duration)}`;
}
