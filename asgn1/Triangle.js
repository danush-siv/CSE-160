// Danush Sivarajan
// CSE 160
// Triangle class for drawing triangles on the canvas
class Triangle {
    constructor(x1, y1, x2, y2, x3, y3, color, size) {
        // Check if third argument is an array (color) to determine constructor pattern
        if (arguments.length === 8) {
            // Custom triangle with 6 coordinates (for picture drawing)
            // Arguments: (x1, y1, x2, y2, x3, y3, color, size)
            this.x1 = x1;
            this.y1 = y1;
            this.x2 = x2;
            this.y2 = y2;
            this.x3 = x3;
            this.y3 = y3;
            this.color = color;
        } else if (arguments.length === 4 && Array.isArray(x2)) {
            // Default triangle centered at (x, y) with color and size
            // Arguments: (x, y, color, size)
            var x = x1;
            var y = y1;
            var color = x2; // This is the color array
            var size = y2; // This is the size
            var halfSize = size / 200.0; // Scale size to WebGL coordinates
            
            this.x1 = x;
            this.y1 = y + halfSize;
            this.x2 = x - halfSize;
            this.y2 = y - halfSize;
            this.x3 = x + halfSize;
            this.y3 = y - halfSize;
            this.color = color;
        }
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
        
        // Write triangle vertices to buffer
        var vertices = new Float32Array([
            this.x1, this.y1,
            this.x2, this.y2,
            this.x3, this.y3
        ]);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        
        // Assign buffer to attribute variable
        gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
        
        // Enable assignment
        gl.enableVertexAttribArray(a_Position);
        
        // Draw triangle
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
}
