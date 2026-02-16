/**
 * CSE 160 Assignment 3 — Camera class (Matsuda Ch7).
 * Stores and controls View and Projection matrices.
 */

class Camera {
  constructor() {
    this.fov = 60;
    this.eye = new Vector3([0, 0, 0]);
    this.at = new Vector3([0, 0, -1]);
    this.up = new Vector3([0, 1, 0]);
    this.viewMatrix = new Matrix4();
    this.projectionMatrix = new Matrix4();
    this.updateViewMatrix();
  }

  updateViewMatrix() {
    this.viewMatrix.setLookAt(
      this.eye.elements[0], this.eye.elements[1], this.eye.elements[2],
      this.at.elements[0], this.at.elements[1], this.at.elements[2],
      this.up.elements[0], this.up.elements[1], this.up.elements[2]
    );
  }

  updateProjectionMatrix(canvas) {
    const aspect = canvas.width / canvas.height;
    this.projectionMatrix.setPerspective(this.fov, aspect, 0.1, 1000);
  }

  moveForward(speed = 0.5) {
    const f = new Vector3(this.at.elements);
    f.sub(this.eye);
    f.normalize();
    f.mul(speed);
    this.eye.add(f);
    this.at.add(f);
    this.updateViewMatrix();
  }

  moveBackwards(speed = 0.5) {
    const b = new Vector3(this.eye.elements);
    b.sub(this.at);
    b.normalize();
    b.mul(speed);
    this.eye.add(b);
    this.at.add(b);
    this.updateViewMatrix();
  }

  moveLeft(speed = 0.5) {
    const f = new Vector3(this.at.elements);
    f.sub(this.eye);
    f.normalize();
    const s = Vector3.cross(this.up, f);
    s.normalize();
    s.mul(speed);
    this.eye.add(s);
    this.at.add(s);
    this.updateViewMatrix();
  }

  moveRight(speed = 0.5) {
    const f = new Vector3(this.at.elements);
    f.sub(this.eye);
    f.normalize();
    const s = Vector3.cross(f, this.up);
    s.normalize();
    s.mul(speed);
    this.eye.add(s);
    this.at.add(s);
    this.updateViewMatrix();
  }

  panLeft(alpha = 5) {
    const f = new Vector3(this.at.elements);
    f.sub(this.eye);
    const rotationMatrix = new Matrix4();
    rotationMatrix.setRotate(alpha, this.up.elements[0], this.up.elements[1], this.up.elements[2]);
    const fPrime = rotationMatrix.multiplyVector3(f);
    this.at.set(this.eye);
    this.at.add(fPrime);
    this.updateViewMatrix();
  }

  panRight(alpha = 5) {
    const f = new Vector3(this.at.elements);
    f.sub(this.eye);
    const rotationMatrix = new Matrix4();
    rotationMatrix.setRotate(-alpha, this.up.elements[0], this.up.elements[1], this.up.elements[2]);
    const fPrime = rotationMatrix.multiplyVector3(f);
    this.at.set(this.eye);
    this.at.add(fPrime);
    this.updateViewMatrix();
  }

  panUp(alpha = 5) {
    const f = new Vector3(this.at.elements);
    f.sub(this.eye);
    const right = Vector3.cross(f, this.up);
    right.normalize();
    if (right.elements[0] === 0 && right.elements[1] === 0 && right.elements[2] === 0) return;
    const rotationMatrix = new Matrix4();
    rotationMatrix.setRotate(-alpha, right.elements[0], right.elements[1], right.elements[2]);
    const fPrime = rotationMatrix.multiplyVector3(f);
    this.at.set(this.eye);
    this.at.add(fPrime);
    this.updateViewMatrix();
  }

  panDown(alpha = 5) {
    const f = new Vector3(this.at.elements);
    f.sub(this.eye);
    const right = Vector3.cross(f, this.up);
    right.normalize();
    if (right.elements[0] === 0 && right.elements[1] === 0 && right.elements[2] === 0) return;
    const rotationMatrix = new Matrix4();
    rotationMatrix.setRotate(alpha, right.elements[0], right.elements[1], right.elements[2]);
    const fPrime = rotationMatrix.multiplyVector3(f);
    this.at.set(this.eye);
    this.at.add(fPrime);
    this.updateViewMatrix();
  }
}
