class Cube {
	constructor() {
		this.color = [1.0, 1.0, 1.0, 1.0];  // white
		this.matrix = new Matrix4();
	}

	render() {
		const rgba = this.color;

		gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
		gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

		// front
		drawTriangle3D([0.0, 0.0, 0.0,		1.0, 1.0, 0.0,		1.0, 0.0, 0.0]);
		drawTriangle3D([0.0, 0.0, 0.0,		0.0, 1.0, 0.0,		1.0, 1.0, 0.0]);

		// back
		drawTriangle3D([0.0, 0.0, 1.0,		1.0, 1.0, 1.0,		1.0, 0.0, 1.0]);
		drawTriangle3D([0.0, 0.0, 1.0,		0.0, 1.0, 1.0,		1.0, 1.0, 1.0]);

		gl.uniform4f(u_FragColor, rgba[0]*0.9, rgba[1]*0.9, rgba[2]*0.9, rgba[3]);

		// left
		drawTriangle3D([0.0, 0.0, 0.0,		0.0, 1.0, 1.0,		0.0, 0.0, 1.0]);
		drawTriangle3D([0.0, 0.0, 0.0,		0.0, 1.0, 0.0,		0.0, 1.0, 1.0]);

		// right
		drawTriangle3D([1.0, 0.0, 0.0,		1.0, 1.0, 1.0,		1.0, 0.0, 1.0]);
		drawTriangle3D([1.0, 0.0, 0.0,		1.0, 1.0, 0.0,		1.0, 1.0, 1.0]);

		gl.uniform4f(u_FragColor, rgba[0]*0.8, rgba[1]*0.8, rgba[2]*0.8, rgba[3]);

		// top
		drawTriangle3D([0.0, 1.0, 0.0,		1.0, 1.0, 1.0,		1.0, 1.0, 0.0]);
		drawTriangle3D([0.0, 1.0, 0.0,		0.0, 1.0, 1.0,		1.0, 1.0, 1.0]);

		// bottom
		drawTriangle3D([0.0, 0.0, 0.0,		1.0, 0.0, 1.0,		1.0, 0.0, 0.0]);
		drawTriangle3D([0.0, 0.0, 0.0,		0.0, 0.0, 1.0,		1.0, 0.0, 1.0]);
	}
}

function drawTriangle3D(vertices) {
	// Reuse single buffer (created once in main) for performance
	gl.bindBuffer(gl.ARRAY_BUFFER, window.g_triangleBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
	gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(a_Position);
	gl.drawArrays(gl.TRIANGLES, 0, 3);
}