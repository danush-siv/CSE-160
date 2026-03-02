/**
 * CSE 160 Assignment 4 — Sphere with normals for Phong lighting.
 * Danush Sivarajan, 1932047, CSE 160
 */
class Sphere {
  constructor(latBands, lonBands) {
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.matrix = new Matrix4();
    this.textureNum = -1;
    this.verts = null;
    this.normals = null;
    this.uvs = null;
    this.indices = null;
    this.numIndices = 0;
    this._vBuf = null;
    this._nBuf = null;
    this._uBuf = null;
    this._iBuf = null;
    this._generate(latBands || 20, lonBands || 20);
  }

  _generate(latBands, lonBands) {
    const verts = [], norms = [], uvs = [], idx = [];
    for (let lat = 0; lat <= latBands; lat++) {
      const theta = lat * Math.PI / latBands;
      const sinT = Math.sin(theta), cosT = Math.cos(theta);
      for (let lon = 0; lon <= lonBands; lon++) {
        const phi = lon * 2 * Math.PI / lonBands;
        const x = Math.cos(phi) * sinT;
        const y = cosT;
        const z = Math.sin(phi) * sinT;
        norms.push(x, y, z);
        verts.push(x, y, z);
        uvs.push(lon / lonBands, lat / latBands);
      }
    }
    for (let lat = 0; lat < latBands; lat++) {
      for (let lon = 0; lon < lonBands; lon++) {
        const a = lat * (lonBands + 1) + lon;
        const b = a + lonBands + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    this.verts = new Float32Array(verts);
    this.normals = new Float32Array(norms);
    this.uvs = new Float32Array(uvs);
    this.indices = new Uint16Array(idx);
    this.numIndices = idx.length;
  }

  render() {
    gl.uniform1i(u_whichTexture, this.textureNum);
    gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
    gl.uniform1f(u_texColorWeight, 0.0);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    const nm = new Matrix4();
    nm.setInverseOf(this.matrix);
    nm.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, nm.elements);

    if (!this._vBuf) this._vBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vBuf);
    gl.bufferData(gl.ARRAY_BUFFER, this.verts, gl.STATIC_DRAW);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    if (!this._nBuf) this._nBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this._nBuf);
    gl.bufferData(gl.ARRAY_BUFFER, this.normals, gl.STATIC_DRAW);
    gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Normal);

    if (!this._uBuf) this._uBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this._uBuf);
    gl.bufferData(gl.ARRAY_BUFFER, this.uvs, gl.STATIC_DRAW);
    gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_UV);

    if (!this._iBuf) this._iBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._iBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

    gl.drawElements(gl.TRIANGLES, this.numIndices, gl.UNSIGNED_SHORT, 0);
  }
}
