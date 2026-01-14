var gl;
var canvas;
var ctx;

function main() {
    // Retrieve <canvas> element
    canvas = document.getElementById('gl-canvas');
    
    // Get 2D context for drawing
    ctx = canvas.getContext("2d");
    if (!ctx) {
        console.error('Unable to get 2D context');
        return;
    }
    
    // Clear canvas with black background
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw initial v1 vector (2.25, 2.25) in red
    var v1 = new Vector3([2.25, 2.25, 0]);
    drawVector(v1, "red");
}

function drawVector(v, color) {
    // Canvas is 400x400, center is at (200, 200)
    var centerX = 200;
    var centerY = 200;
    
    // Scale coordinates by 20
    var x = centerX + v.elements[0] * 20;
    var y = centerY + v.elements[1] * 20;
    
    // Set color
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    
    // Draw line from center to vector endpoint
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(x, y);
    ctx.stroke();
}

function handleDrawEvent() {
    // Clear the canvas with black background
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Read v1 values
    var v1x = parseFloat(document.getElementById('v1x').value);
    var v1y = parseFloat(document.getElementById('v1y').value);
    var v1 = new Vector3([v1x, v1y, 0]);
    
    // Read v2 values
    var v2x = parseFloat(document.getElementById('v2x').value);
    var v2y = parseFloat(document.getElementById('v2y').value);
    var v2 = new Vector3([v2x, v2y, 0]);
    
    // Draw v1 in red
    drawVector(v1, "red");
    
    // Draw v2 in blue
    drawVector(v2, "blue");
}

function handleDrawOperationEvent() {
    // Clear the canvas with black background
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Read v1 values
    var v1x = parseFloat(document.getElementById('v1x').value);
    var v1y = parseFloat(document.getElementById('v1y').value);
    var v1 = new Vector3([v1x, v1y, 0]);
    
    // Read v2 values
    var v2x = parseFloat(document.getElementById('v2x').value);
    var v2y = parseFloat(document.getElementById('v2y').value);
    var v2 = new Vector3([v2x, v2y, 0]);
    
    // Draw v1 in red
    drawVector(v1, "red");
    
    // Draw v2 in blue
    drawVector(v2, "blue");
    
    // Get operation selector value
    var operation = document.getElementById('operation-selector').value;
    var scalar = parseFloat(document.getElementById('scalar-input').value);
    
    if (operation === "add") {
        // v3 = v1 + v2
        var v3 = new Vector3([v1x, v1y, 0]);
        v3.add(v2);
        drawVector(v3, "green");
    } else if (operation === "sub") {
        // v3 = v1 - v2
        var v3 = new Vector3([v1x, v1y, 0]);
        v3.sub(v2);
        drawVector(v3, "green");
    } else if (operation === "mul") {
        // v3 = v1 * s, v4 = v2 * s
        var v3 = new Vector3([v1x, v1y, 0]);
        v3.mul(scalar);
        drawVector(v3, "green");
        
        var v4 = new Vector3([v2x, v2y, 0]);
        v4.mul(scalar);
        drawVector(v4, "green");
    } else if (operation === "div") {
        // v3 = v1 / s, v4 = v2 / s
        var v3 = new Vector3([v1x, v1y, 0]);
        v3.div(scalar);
        drawVector(v3, "green");
        
        var v4 = new Vector3([v2x, v2y, 0]);
        v4.div(scalar);
        drawVector(v4, "green");
    } else if (operation === "magnitude") {
        // Calculate and print magnitudes
        var mag1 = v1.magnitude();
        var mag2 = v2.magnitude();
        console.log("Magnitude v1: " + mag1);
        console.log("Magnitude v2: " + mag2);
    } else if (operation === "normalize") {
        // Normalize and draw
        var v1Norm = new Vector3([v1x, v1y, 0]);
        v1Norm.normalize();
        drawVector(v1Norm, "green");
        
        var v2Norm = new Vector3([v2x, v2y, 0]);
        v2Norm.normalize();
        drawVector(v2Norm, "green");
    } else if (operation === "angle") {
        // Calculate angle between v1 and v2
        var angle = angleBetween(v1, v2);
        console.log("Angle between v1 and v2: " + angle + " radians (" + (angle * 180 / Math.PI) + " degrees)");
    } else if (operation === "area") {
        // Calculate area of triangle
        var area = areaTriangle(v1, v2);
        console.log("Area of triangle: " + area);
    }
}

function angleBetween(v1, v2) {
    // dot(v1, v2) = ||v1|| * ||v2|| * cos(alpha)
    // alpha = arccos(dot(v1, v2) / (||v1|| * ||v2||))
    var dotProduct = Vector3.dot(v1, v2);
    var mag1 = v1.magnitude();
    var mag2 = v2.magnitude();
    
    if (mag1 === 0 || mag2 === 0) {
        return 0;
    }
    
    var cosAlpha = dotProduct / (mag1 * mag2);
    // Clamp cosAlpha to [-1, 1] to avoid numerical errors
    cosAlpha = Math.max(-1, Math.min(1, cosAlpha));
    return Math.acos(cosAlpha);
}

function areaTriangle(v1, v2) {
    // ||v1 x v2|| equals the area of the parallelogram
    // Area of triangle = (1/2) * ||v1 x v2||
    var crossProduct = Vector3.cross(v1, v2);
    var parallelogramArea = crossProduct.magnitude();
    return 0.5 * parallelogramArea;
}
