import * as THREE from 'three';

export class CameraManager {
  constructor() {
    // 75 degree FOV, standard far clip for vast environments
    this.instance = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
    this.instance.position.set(0, 2, 0); // Start slightly above where the ground would be
    
    window.addEventListener('resize', this.onResize.bind(this));
  }

  onResize() {
    this.instance.aspect = window.innerWidth / window.innerHeight;
    this.instance.updateProjectionMatrix();
  }
}
