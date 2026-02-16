/**
 * CSE 160 Assignment 3 — Cube with UV coordinates and texture/base-color mixing.
 */
class Cube {
  constructor() {
    this.type = 'cube';
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.matrix = new Matrix4();
    this.textureNum = -2;  // -2 = solid color only (no texture)
  }

  render() {
    const rgba = this.color;
    gl.uniform1i(u_whichTexture, this.textureNum);
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    const uv = [0, 0, 1, 1, 1, 0,  0, 0, 0, 1, 1, 1];

    // Front
    drawTriangle3DUV([0, 0, 0,  1, 1, 0,  1, 0, 0], [0, 0, 1, 1, 1, 0]);
    drawTriangle3DUV([0, 0, 0,  0, 1, 0,  1, 1, 0], [0, 0, 0, 1, 1, 1]);

    gl.uniform4f(u_FragColor, rgba[0] * 0.9, rgba[1] * 0.9, rgba[2] * 0.9, rgba[3]);
    // Top
    drawTriangle3DUV([0, 1, 0,  1, 1, 1,  1, 1, 0], uv);
    drawTriangle3DUV([0, 1, 0,  0, 1, 1,  1, 1, 1], uv);

    // Bottom
    drawTriangle3DUV([0, 0, 0,  1, 0, 1,  0, 0, 1], uv);
    drawTriangle3DUV([0, 0, 0,  1, 0, 0,  1, 0, 1], uv);

    gl.uniform4f(u_FragColor, rgba[0] * 0.8, rgba[1] * 0.8, rgba[2] * 0.8, rgba[3]);
    // Right (x=1)
    drawTriangle3DUV([1, 0, 0,  1, 1, 1,  1, 1, 0], uv);
    drawTriangle3DUV([1, 0, 0,  1, 0, 1,  1, 1, 1], uv);

    // Left (x=0)
    drawTriangle3DUV([0, 0, 0,  0, 1, 1,  0, 1, 0], uv);
    drawTriangle3DUV([0, 0, 0,  0, 0, 1,  0, 1, 1], uv);

    gl.uniform4f(u_FragColor, rgba[0] * 0.7, rgba[1] * 0.7, rgba[2] * 0.7, rgba[3]);
    // Back
    drawTriangle3DUV([0, 0, 1,  1, 1, 1,  0, 1, 1], uv);
    drawTriangle3DUV([0, 0, 1,  1, 0, 1,  1, 1, 1], uv);
  }
}
