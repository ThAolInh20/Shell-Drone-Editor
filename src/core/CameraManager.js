import * as THREE from 'three';

export class CameraManager {
  constructor() {
    // 65 degree FOV for cinematic landscape depth
    this.instance = new THREE.PerspectiveCamera(
      65,
      window.innerWidth / window.innerHeight,
      0.1,
      10000
    );

    // Position camera close to water surface (50% sky, 50% lake composition)
    this.instance.position.set(0, 6, 420);
    this.instance.lookAt(0, 75, 0);

    window.addEventListener('resize', this.onResize.bind(this));
  }

  onResize() {
    this.instance.aspect = window.innerWidth / window.innerHeight;
    this.instance.updateProjectionMatrix();
  }
}

