// Danush Sivarajan
// CSE 160
// Circle class for drawing circles on the canvas
class Circle {
    constructor(x, y, color, size, segments) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.radius = size / 200.0; // Scale size to WebGL coordinates
        // Ensure minimum of 3 segments (triangle) - can't have fewer than 3 sides
        this.segments = Math.max(3, segments || 20);
    }
    
    render() {
        // Set color
        gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], 1.0);
        
        // Create buffer
        var buffer = gl.createBuffer();
        if (!buffer) {
            console.error('Failed to create buffer');
            return;
        }
        
        // Bind buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        
        // Calculate circle vertices
        var vertices = [];
        var angleStep = (2 * Math.PI) / this.segments;
        
        // Center point
        vertices.push(this.x, this.y);
        
        // Circle points
        for (var i = 0; i <= this.segments; i++) {
            var angle = i * angleStep;
            var px = this.x + this.radius * Math.cos(angle);
            var py = this.y + this.radius * Math.sin(angle);
            vertices.push(px, py);
        }
        
        // Write vertices to buffer
        var vertexBuffer = new Float32Array(vertices);
        gl.bufferData(gl.ARRAY_BUFFER, vertexBuffer, gl.STATIC_DRAW);
        
        // Assign buffer to attribute variable
        gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
        
        // Enable assignment
        gl.enableVertexAttribArray(a_Position);
        
        // Draw circle as triangle fan
        gl.drawArrays(gl.TRIANGLE_FAN, 0, this.segments + 2);
    }
}
