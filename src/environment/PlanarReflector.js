import * as THREE from 'three';
import { LAYER_REFLECTION } from '../config/layers.js';

export class PlanarReflector {
  constructor(options = {}) {
    this.waterY = options.waterY || 0.0;
    this.resolutionScale = options.resolutionScale || 0.5;
    this.clipBias = options.clipBias || 0.0;

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

    this.textureMatrix = new THREE.Matrix4();

    // Reusable math objects
    this._reflectorPlane = new THREE.Plane();
    this._normal = new THREE.Vector3(0, 1, 0);
    this._reflectorWorldPos = new THREE.Vector3(0, this.waterY, 0);
    this._cameraWorldPos = new THREE.Vector3();
    this._lookAtPos = new THREE.Vector3();
    this._view = new THREE.Vector3();
    this._target = new THREE.Vector3();
    this._rotMatrix = new THREE.Matrix4();
    this._clipPlane = new THREE.Vector4();
    this._q = new THREE.Vector4();
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

    this._reflectorWorldPos.set(0, this.waterY, 0);
    this._cameraWorldPos.setFromMatrixPosition(mainCamera.matrixWorld);

    // Plane normal in world space is Y up
    this._normal.set(0, 1, 0);

    this._view.subVectors(this._reflectorWorldPos, this._cameraWorldPos);
    // Avoid rendering when camera is behind plane
    if (this._view.dot(this._normal) > 0) {
      return;
    }

    this._view.reflect(this._normal).negate();
    this._view.add(this._reflectorWorldPos);

    this._rotMatrix.extractRotation(mainCamera.matrixWorld);

    this._lookAtPos.set(0, 0, -1);
    this._lookAtPos.applyMatrix4(this._rotMatrix);
    this._lookAtPos.add(this._cameraWorldPos);

    this._target.subVectors(this._reflectorWorldPos, this._lookAtPos);
    this._target.reflect(this._normal).negate();
    this._target.add(this._reflectorWorldPos);

    this.reflectionCamera.position.copy(this._view);
    this.reflectionCamera.up.set(0, 1, 0);
    this.reflectionCamera.up.applyMatrix4(this._rotMatrix);
    this.reflectionCamera.up.reflect(this._normal);
    this.reflectionCamera.lookAt(this._target);

    this.reflectionCamera.near = mainCamera.near;
    this.reflectionCamera.far = mainCamera.far;
    this.reflectionCamera.updateMatrixWorld();
    this.reflectionCamera.projectionMatrix.copy(mainCamera.projectionMatrix);

    // Update the texture matrix for projective texture mapping
    this.textureMatrix.set(
      0.5, 0.0, 0.0, 0.5,
      0.0, 0.5, 0.0, 0.5,
      0.0, 0.0, 0.5, 0.5,
      0.0, 0.0, 0.0, 1.0
    );
    this.textureMatrix.multiply(this.reflectionCamera.projectionMatrix);
    this.textureMatrix.multiply(this.reflectionCamera.matrixWorldInverse);

    // Oblique Near-Plane Clipping
    this._reflectorPlane.setFromNormalAndCoplanarPoint(
      this._normal,
      this._reflectorWorldPos
    );
    this._reflectorPlane.applyMatrix4(this.reflectionCamera.matrixWorldInverse);

    this._clipPlane.set(
      this._reflectorPlane.normal.x,
      this._reflectorPlane.normal.y,
      this._reflectorPlane.normal.z,
      this._reflectorPlane.constant
    );

    const projMatrix = this.reflectionCamera.projectionMatrix;
    this._q.x = (Math.sign(this._clipPlane.x) + projMatrix.elements[8]) / projMatrix.elements[0];
    this._q.y = (Math.sign(this._clipPlane.y) + projMatrix.elements[9]) / projMatrix.elements[5];
    this._q.z = -1.0;
    this._q.w = (1.0 + projMatrix.elements[10]) / projMatrix.elements[14];

    // Scale clip plane
    this._clipPlane.multiplyScalar(
      2.0 / this._clipPlane.dot(this._q)
    );

    projMatrix.elements[2] = this._clipPlane.x;
    projMatrix.elements[6] = this._clipPlane.y;
    projMatrix.elements[10] = this._clipPlane.z + 1.0 - this.clipBias;
    projMatrix.elements[14] = this._clipPlane.w;

    // Render reflection scene into renderTarget
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
