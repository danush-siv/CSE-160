// Site link: http://danush-siv.github.io/CSE-160/asgn1/asgn1.html

// Global variables for WebGL drawing application
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
    
    // Get WebGL context with preserveDrawingBuffer for better performance
    // Try 'webgl' first, then fallback to 'experimental-webgl'
    gl = canvas.getContext('webgl', { preserveDrawingBuffer: true }) || 
         canvas.getContext('experimental-webgl', { preserveDrawingBuffer: true });
    
    if (!gl) {
        // Try without attributes as fallback
        gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    }
    
    if (!gl) {
        console.error('Unable to get WebGL context');
        alert('WebGL is not supported in your browser. Please use a modern browser like Chrome, Firefox, or Edge.');
        return false;
    }
    
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

// Alias function name as required by assignment criteria
function handleClicks(ev) {
    click(ev);
}

function renderAllShapes() {
    if (!gl) {
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
    // The picture uses ONLY the current slider values - no hardcoded colors
    
    // Clear existing shapes first
    shapesList = [];
    
    // Get current color from sliders - this is the ONLY color source
    var redSlider = document.getElementById('red-slider');
    var greenSlider = document.getElementById('green-slider');
    var blueSlider = document.getElementById('blue-slider');
    
    var red = parseFloat(redSlider.value) / 100.0;
    var green = parseFloat(greenSlider.value) / 100.0;
    var blue = parseFloat(blueSlider.value) / 100.0;
    var currentColor = [red, green, blue];
    
    // Debug: log the slider values
    console.log('RGB Sliders - Red:', redSlider.value, 'Green:', greenSlider.value, 'Blue:', blueSlider.value);
    console.log('Current Color (0-1):', currentColor);
    
    // Get current size - affects all elements
    var sizeSlider = document.getElementById('size-slider');
    var currentSize = parseFloat(sizeSlider.value);
    var sizeScale = currentSize / 10.0; // Normalize size
    console.log('Size Slider:', currentSize, 'Size Scale:', sizeScale);
    
    // Get current segments for circles/sun
    var segmentsSlider = document.getElementById('segments-slider');
    var segments = parseInt(segmentsSlider.value);
    console.log('Segments Slider:', segments);
    
    // Draw picture using ONLY slider values - no hardcoded colors
    console.log('Creating triangles with color:', currentColor);
    
    // House base (rectangle made of 2 triangles) - uses current color
    var base1 = new Triangle(-0.5, -0.3, 0.5, -0.3, 0.5, 0.0, currentColor, 1.0);
    var base2 = new Triangle(-0.5, -0.3, 0.5, 0.0, -0.5, 0.0, currentColor, 1.0);
    console.log('Base1 color:', base1.color, 'Base2 color:', base2.color);
    
    // Roof (triangle) - uses current color
    var roof = new Triangle(0.0, 0.3, -0.5, 0.0, 0.5, 0.0, currentColor, 1.0);
    
    // Door (rectangle made of 2 triangles) - uses current color
    var door1 = new Triangle(-0.1, -0.3, 0.1, -0.3, 0.1, -0.1, currentColor, 1.0);
    var door2 = new Triangle(-0.1, -0.3, 0.1, -0.1, -0.1, -0.1, currentColor, 1.0);
    
    // Windows (4 triangles each, 2 windows = 8 triangles) - uses current color
    // Left window
    var winL1 = new Triangle(-0.4, -0.1, -0.3, -0.1, -0.3, 0.0, currentColor, 1.0);
    var winL2 = new Triangle(-0.4, -0.1, -0.3, 0.0, -0.4, 0.0, currentColor, 1.0);
    // Right window
    var winR1 = new Triangle(0.3, -0.1, 0.4, -0.1, 0.4, 0.0, currentColor, 1.0);
    var winR2 = new Triangle(0.3, -0.1, 0.4, 0.0, 0.3, 0.0, currentColor, 1.0);
    
    // Sun (multiple triangles) - uses current color and segment count, size affects radius
    var sunCenterX = 0.7;
    var sunCenterY = 0.7;
    var sunRadius = 0.05 + (sizeScale * 0.15); // Size slider affects sun size
    console.log('Sun radius:', sunRadius, 'Sun segments:', segments);
    var sunTriangles = [];
    for (var i = 0; i < segments; i++) { // Segment slider affects sun smoothness
        var angle1 = (i * 2 * Math.PI) / segments;
        var angle2 = ((i + 1) * 2 * Math.PI) / segments;
        var x1 = sunCenterX + sunRadius * Math.cos(angle1);
        var y1 = sunCenterY + sunRadius * Math.sin(angle1);
        var x2 = sunCenterX + sunRadius * Math.cos(angle2);
        var y2 = sunCenterY + sunRadius * Math.sin(angle2);
        var ray = new Triangle(sunCenterX, sunCenterY, x1, y1, x2, y2, currentColor, 1.0);
        sunTriangles.push(ray);
    }
    console.log('Created', sunTriangles.length, 'sun triangles');
    
    // Ground (2 triangles) - uses current color
    var ground1 = new Triangle(-1.0, -0.3, 1.0, -0.3, 1.0, -1.0, currentColor, 1.0);
    var ground2 = new Triangle(-1.0, -0.3, 1.0, -1.0, -1.0, -1.0, currentColor, 1.0);
    
    // Mountains (2 triangles) - uses current color
    var mountain1 = new Triangle(-0.8, 0.3, -0.7, 0.5, -0.6, 0.3, currentColor, 1.0);
    var mountain2 = new Triangle(-0.6, 0.3, -0.5, 0.5, -0.4, 0.3, currentColor, 1.0);
    
    // Add all shapes to the list
    shapesList.push(base1, base2, roof, door1, door2, winL1, winL2, winR1, winR2);
    shapesList.push.apply(shapesList, sunTriangles);
    shapesList.push(ground1, ground2, mountain1, mountain2);
    
    console.log('Total shapes in list:', shapesList.length);
    console.log('First shape color:', shapesList[0].color);
    
    renderAllShapes();
}
