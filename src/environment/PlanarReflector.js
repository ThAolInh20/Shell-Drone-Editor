import * as THREE from 'three';
import { LAYER_REFLECTION } from '../config/layers.js';

export class PlanarReflector {
  constructor(options = {}) {
    this.waterY = options.waterY || 0.0;
    this.resolutionScale = options.resolutionScale || 0.5;

    const initialWidth = Math.floor(
      (typeof window !== 'undefined' ? window.innerWidth : 1280) * this.resolutionScale
    );
    const initialHeight = Math.floor(
      (typeof window !== 'undefined' ? window.innerHeight : 720) * this.resolutionScale
    );

    this.renderTarget = new THREE.WebGLRenderTarget(
      initialWidth,
      initialHeight,
      {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.HalfFloatType,
        generateMipmaps: false,
        depthBuffer: true,
        stencilBuffer: false
      }
    );

    this.reflectionCamera = new THREE.PerspectiveCamera();
    this.reflectionCamera.layers.disableAll();
    this.reflectionCamera.layers.enable(LAYER_REFLECTION);

    // Reusable math objects
    this._reflectorPlane = new THREE.Plane(
      new THREE.Vector3(0, 1, 0),
      -this.waterY
    );
    this._normal = new THREE.Vector3(0, 1, 0);
    this._clipPlane = new THREE.Plane();
    this._clipVector = new THREE.Vector4();
    this._q = new THREE.Vector4();
    this._cameraWorldPos = new THREE.Vector3();
    this._cameraDirection = new THREE.Vector3();
    this._targetWorldPos = new THREE.Vector3();
  }

  get texture() {
    return this.renderTarget.texture;
  }

  setSize(width, height) {
    const targetW = Math.max(
      1,
      Math.floor(width * this.resolutionScale)
    );
    const targetH = Math.max(
      1,
      Math.floor(height * this.resolutionScale)
    );
    this.renderTarget.setSize(
      targetW,
      targetH
    );
  }

  update(renderer, scene, mainCamera) {
    // If camera is below water surface, skip reflection render
    if (mainCamera.position.y < this.waterY) {
      return;
    }

    // Sync camera parameters
    this.reflectionCamera.fov = mainCamera.fov;
    this.reflectionCamera.aspect = mainCamera.aspect;
    this.reflectionCamera.near = mainCamera.near;
    this.reflectionCamera.far = mainCamera.far;
    this.reflectionCamera.updateProjectionMatrix();

    // Calculate reflected position
    this._cameraWorldPos.setFromMatrixPosition(mainCamera.matrixWorld);
    const reflectedY = 2.0 * this.waterY - this._cameraWorldPos.y;
    this.reflectionCamera.position.set(
      this._cameraWorldPos.x,
      reflectedY,
      this._cameraWorldPos.z
    );

    // Calculate reflected look-at target
    mainCamera.getWorldDirection(this._cameraDirection);
    this._cameraDirection.y *= -1.0;
    this._targetWorldPos.copy(this.reflectionCamera.position).add(this._cameraDirection);

    // Up vector inverted on Y
    this.reflectionCamera.up.set(0, 1, 0);
    this.reflectionCamera.lookAt(this._targetWorldPos);
    this.reflectionCamera.updateMatrixWorld();

    // Oblique Near-Plane Clipping
    this._clipPlane.copy(this._reflectorPlane).applyMatrix4(
      this.reflectionCamera.matrixWorldInverse
    );
    this._clipVector.set(
      this._clipPlane.normal.x,
      this._clipPlane.normal.y,
      this._clipPlane.normal.z,
      this._clipPlane.constant
    );

    const projectionMatrix = this.reflectionCamera.projectionMatrix;
    this._q.x = (Math.sign(this._clipVector.x) + projectionMatrix.elements[8]) / projectionMatrix.elements[0];
    this._q.y = (Math.sign(this._clipVector.y) + projectionMatrix.elements[9]) / projectionMatrix.elements[5];
    this._q.z = -1.0;
    this._q.w = (1.0 + projectionMatrix.elements[10]) / projectionMatrix.elements[14];

    // Scale clip plane
    this._clipVector.multiplyScalar(
      2.0 / this._clipVector.dot(this._q)
    );

    projectionMatrix.elements[2] = this._clipVector.x;
    projectionMatrix.elements[6] = this._clipVector.y;
    projectionMatrix.elements[10] = this._clipVector.z + 1.0;
    projectionMatrix.elements[14] = this._clipVector.w;

    // Render into target
    const currentRenderTarget = renderer.getRenderTarget();
    const currentAutoClear = renderer.autoClear;

    renderer.setRenderTarget(this.renderTarget);
    renderer.clear();
    renderer.render(scene, this.reflectionCamera);

    // Restore original renderer state
    renderer.setRenderTarget(currentRenderTarget);
    renderer.autoClear = currentAutoClear;
  }

  dispose() {
    this.renderTarget.dispose();
  }
}
