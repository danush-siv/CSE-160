// Danush Sivarajan
// CSE 160
// Point class for drawing points on the canvas
class Point {
    constructor(x, y, color, size) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = size;
    }
    
    render() {
        // Set point size
        gl.uniform1f(u_PointSize, this.size);
        
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
        
        // Write data to buffer
        var vertices = new Float32Array([this.x, this.y]);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        
        // Assign buffer to attribute variable
        gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
        
        // Enable assignment
        gl.enableVertexAttribArray(a_Position);
        
        // Draw point
        gl.drawArrays(gl.POINTS, 0, 1);
    }
}
