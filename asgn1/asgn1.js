// Global variables
var gl;
var canvas;
var shapesList = [];
var g_currentBrushType = 'point';
var g_color = [1.0, 1.0, 1.0]; // RGB color (0-1 range)
var g_size = 10.0;
var g_segments = 20;

// Shader program variables
var g_shaderProgram;
var a_Position;
var u_FragColor;
var u_PointSize;

// Vertex shader source code
var VSHADER_SOURCE = `
    attribute vec4 a_Position;
    uniform float u_PointSize;
    void main() {
        gl_Position = a_Position;
        gl_PointSize = u_PointSize;
    }
`;

// Fragment shader source code
var FSHADER_SOURCE = `
    precision mediump float;
    uniform vec4 u_FragColor;
    void main() {
        gl_FragColor = u_FragColor;
    }
`;

function main() {
    // Test WebGL support before attempting to create context
    var testCanvas = document.createElement('canvas');
    var testGl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
    if (!testGl) {
        console.error('WebGL is not supported in this browser');
        alert('WebGL is not supported in your browser. Please use Chrome, Firefox, or Edge.');
        return;
    }
    
    if (!setupWebGL()) {
        return; // Exit if WebGL setup failed
    }
    
    if (!connectVariablesToGLSL()) {
        return; // Exit if shader setup failed
    }
    
    // Set canvas event listeners
    canvas.onmousedown = click;
    canvas.onmousemove = function(ev) {
        if (ev.buttons == 1) {
            click(ev);
        }
    };
    
    // Initialize UI with default values
    g_color = [0.0, 0.5, 1.0]; // Red=0, Green=50, Blue=100
    g_size = 1.0;
    g_segments = 3;
    
    // Initial render
    renderAllShapes();
}

function setupWebGL() {
    // Retrieve <canvas> element
    canvas = document.getElementById('gl-canvas');
    if (!canvas) {
        console.error('Canvas element not found');
        return false;
    }
    
    console.log('Canvas found:', canvas);
    console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);
    
    // Try to get WebGL context - start simple, then add attributes
    // First try: webgl with preserveDrawingBuffer (for performance)
    gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
    
    // Second try: experimental-webgl with preserveDrawingBuffer
    if (!gl) {
        console.log('Trying experimental-webgl with attributes...');
        gl = canvas.getContext('experimental-webgl', { preserveDrawingBuffer: true });
    }
    
    // Third try: webgl without attributes
    if (!gl) {
        console.log('Trying webgl without attributes...');
        gl = canvas.getContext('webgl');
    }
    
    // Fourth try: experimental-webgl without attributes
    if (!gl) {
        console.log('Trying experimental-webgl without attributes...');
        gl = canvas.getContext('experimental-webgl');
    }
    
    if (!gl) {
        console.error('Unable to get WebGL context after all attempts.');
        console.error('Canvas element:', canvas);
        console.error('Canvas width:', canvas.width, 'height:', canvas.height);
        console.error('Canvas style:', window.getComputedStyle(canvas).display);
        
        // Check if WebGL is available at all
        var testCanvas = document.createElement('canvas');
        var testGl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
        if (testGl) {
            console.error('WebGL IS available, but failed on the actual canvas. This might be a canvas-specific issue.');
            alert('WebGL is available but cannot be initialized on this canvas. Please check browser settings or try refreshing the page.');
        } else {
            console.error('WebGL is NOT available in this browser.');
            alert('WebGL is not supported in your browser. Please enable hardware acceleration in Chrome settings.');
        }
        return false;
    }
    
    console.log('WebGL context created successfully!');
    console.log('WebGL version:', gl.getParameter(gl.VERSION));
    console.log('WebGL vendor:', gl.getParameter(gl.VENDOR));
    
    // Set viewport to match canvas size
    gl.viewport(0, 0, canvas.width, canvas.height);
    
    // Set clear color to white
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    return true;
}

function connectVariablesToGLSL() {
    // Create shader program
    if (!initShaders()) {
        console.error('Failed to initialize shaders');
        return false;
    }
    
    // Get storage locations of attribute and uniform variables
    a_Position = gl.getAttribLocation(g_shaderProgram, 'a_Position');
    if (a_Position < 0) {
        console.error('Failed to get storage location of a_Position');
        return false;
    }
    
    u_FragColor = gl.getUniformLocation(g_shaderProgram, 'u_FragColor');
    if (!u_FragColor) {
        console.error('Failed to get storage location of u_FragColor');
        return false;
    }
    
    u_PointSize = gl.getUniformLocation(g_shaderProgram, 'u_PointSize');
    if (!u_PointSize) {
        console.error('Failed to get storage location of u_PointSize');
        return false;
    }
    
    return true;
}

function initShaders() {
    // Check if WebGL context exists
    if (!gl) {
        console.error('WebGL context not available in initShaders');
        return false;
    }
    
    // Create vertex shader
    var vertexShader = loadShader(gl.VERTEX_SHADER, VSHADER_SOURCE);
    if (!vertexShader) {
        console.error('Failed to create vertex shader');
        return false;
    }
    
    // Create fragment shader
    var fragmentShader = loadShader(gl.FRAGMENT_SHADER, FSHADER_SOURCE);
    if (!fragmentShader) {
        console.error('Failed to create fragment shader');
        return false;
    }
    
    // Create shader program
    g_shaderProgram = gl.createProgram();
    if (!g_shaderProgram) {
        console.error('Failed to create program');
        return false;
    }
    
    // Attach shaders to program
    gl.attachShader(g_shaderProgram, vertexShader);
    gl.attachShader(g_shaderProgram, fragmentShader);
    
    // Link program
    gl.linkProgram(g_shaderProgram);
    if (!gl.getProgramParameter(g_shaderProgram, gl.LINK_STATUS)) {
        console.error('Failed to link program: ' + gl.getProgramInfoLog(g_shaderProgram));
        gl.deleteProgram(g_shaderProgram);
        return false;
    }
    
    // Use program
    gl.useProgram(g_shaderProgram);
    
    return true;
}

function loadShader(type, source) {
    var shader = gl.createShader(type);
    if (!shader) {
        console.error('Unable to create shader');
        return null;
    }
    
    // Send source to shader object
    gl.shaderSource(shader, source);
    
    // Compile shader
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('An error occurred compiling the shader: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    
    return shader;
}

function click(ev) {
    // Get mouse coordinates relative to canvas
    var rect = ev.target.getBoundingClientRect();
    var x = ev.clientX - rect.left;
    var y = ev.clientY - rect.top;
    
    // Convert to WebGL coordinates (-1 to 1)
    var x_webgl = (x / canvas.width) * 2 - 1;
    var y_webgl = -((y / canvas.height) * 2 - 1);
    
    // Create shape based on current brush type
    if (g_currentBrushType === 'point') {
        var point = new Point(x_webgl, y_webgl, g_color, g_size);
        shapesList.push(point);
    } else if (g_currentBrushType === 'triangle') {
        // Triangle constructor: (x, y, color, size) - 4 args for default triangle
        var triangle = new Triangle(x_webgl, y_webgl, g_color, g_size);
        shapesList.push(triangle);
    } else if (g_currentBrushType === 'circle') {
        var circle = new Circle(x_webgl, y_webgl, g_color, g_size, g_segments);
        shapesList.push(circle);
    }
    
    renderAllShapes();
}

function renderAllShapes() {
    if (!gl) {
        console.error('WebGL context not available');
        return;
    }
    
    // Clear canvas
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    // Render all shapes
    for (var i = 0; i < shapesList.length; i++) {
        if (shapesList[i] && typeof shapesList[i].render === 'function') {
            shapesList[i].render();
        }
    }
}

function setBrushType(type) {
    g_currentBrushType = type;
    
    // Update button styles
    document.getElementById('point-button').classList.remove('active');
    document.getElementById('triangle-button').classList.remove('active');
    document.getElementById('circle-button').classList.remove('active');
    
    if (type === 'point') {
        document.getElementById('point-button').classList.add('active');
    } else if (type === 'triangle') {
        document.getElementById('triangle-button').classList.add('active');
    } else if (type === 'circle') {
        document.getElementById('circle-button').classList.add('active');
    }
}

function updateColor() {
    var red = document.getElementById('red-slider').value / 100.0;
    var green = document.getElementById('green-slider').value / 100.0;
    var blue = document.getElementById('blue-slider').value / 100.0;
    
    g_color = [red, green, blue];
}

function updateSize() {
    g_size = parseFloat(document.getElementById('size-slider').value);
}

function updateSegments() {
    g_segments = parseInt(document.getElementById('segments-slider').value);
}

function clearCanvas() {
    shapesList = [];
    renderAllShapes();
}

function drawPicture() {
    // This function draws a picture using triangles
    // You should replace this with your own picture design
    // The picture should use at least 20 triangles with various colors
    
    // Clear existing shapes first (optional - remove this line if you want to keep user drawings)
    // shapesList = [];
    
    // Example: Draw a simple house scene using triangles
    // House base (rectangle made of 2 triangles)
    var houseColor = [0.8, 0.6, 0.4]; // Brown
    var base1 = new Triangle(-0.5, -0.3, 0.5, -0.3, 0.5, 0.0, houseColor, 1.0);
    var base2 = new Triangle(-0.5, -0.3, 0.5, 0.0, -0.5, 0.0, houseColor, 1.0);
    
    // Roof (triangle)
    var roofColor = [0.6, 0.2, 0.2]; // Dark red
    var roof = new Triangle(0.0, 0.3, -0.5, 0.0, 0.5, 0.0, roofColor, 1.0);
    
    // Door (rectangle made of 2 triangles)
    var doorColor = [0.4, 0.2, 0.1]; // Dark brown
    var door1 = new Triangle(-0.1, -0.3, 0.1, -0.3, 0.1, -0.1, doorColor, 1.0);
    var door2 = new Triangle(-0.1, -0.3, 0.1, -0.1, -0.1, -0.1, doorColor, 1.0);
    
    // Windows (4 triangles each, 2 windows = 8 triangles)
    var windowColor = [0.3, 0.5, 0.8]; // Blue
    // Left window
    var winL1 = new Triangle(-0.4, -0.1, -0.3, -0.1, -0.3, 0.0, windowColor, 1.0);
    var winL2 = new Triangle(-0.4, -0.1, -0.3, 0.0, -0.4, 0.0, windowColor, 1.0);
    // Right window
    var winR1 = new Triangle(0.3, -0.1, 0.4, -0.1, 0.4, 0.0, windowColor, 1.0);
    var winR2 = new Triangle(0.3, -0.1, 0.4, 0.0, 0.3, 0.0, windowColor, 1.0);
    
    // Sun (multiple triangles for rays - 8 triangles)
    var sunColor = [1.0, 0.9, 0.0]; // Yellow
    var sunCenterX = 0.7;
    var sunCenterY = 0.7;
    var sunRadius = 0.15;
    var sunTriangles = [];
    for (var i = 0; i < 8; i++) {
        var angle1 = (i * 2 * Math.PI) / 8;
        var angle2 = ((i + 1) * 2 * Math.PI) / 8;
        var x1 = sunCenterX + sunRadius * Math.cos(angle1);
        var y1 = sunCenterY + sunRadius * Math.sin(angle1);
        var x2 = sunCenterX + sunRadius * Math.cos(angle2);
        var y2 = sunCenterY + sunRadius * Math.sin(angle2);
        var ray = new Triangle(sunCenterX, sunCenterY, x1, y1, x2, y2, sunColor, 1.0);
        sunTriangles.push(ray);
    }
    
    // Ground (2 triangles)
    var groundColor = [0.2, 0.6, 0.2]; // Green
    var ground1 = new Triangle(-1.0, -0.3, 1.0, -0.3, 1.0, -1.0, groundColor, 1.0);
    var ground2 = new Triangle(-1.0, -0.3, 1.0, -1.0, -1.0, -1.0, groundColor, 1.0);
    
    // Add all shapes to the list (total: 2 base + 1 roof + 2 door + 4 windows + 8 sun + 2 ground = 19 triangles)
    // Let's add one more triangle to make it 20+
    var cloudColor = [0.9, 0.9, 0.9]; // Light gray
    var cloud1 = new Triangle(-0.8, 0.5, -0.7, 0.5, -0.75, 0.6, cloudColor, 1.0);
    var cloud2 = new Triangle(-0.7, 0.5, -0.6, 0.5, -0.65, 0.6, cloudColor, 1.0);
    
    // Add all shapes to the list
    shapesList.push(base1, base2, roof, door1, door2, winL1, winL2, winR1, winR2);
    shapesList.push.apply(shapesList, sunTriangles);
    shapesList.push(ground1, ground2, cloud1, cloud2);
    
    console.log('Picture drawn with ' + shapesList.length + ' shapes');
    console.log('First triangle:', base1);
    
    // Force a render
    renderAllShapes();
}
