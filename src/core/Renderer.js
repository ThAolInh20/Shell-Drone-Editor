import * as THREE from 'three';

export class Renderer {
  constructor() {
    this.instance = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.instance.setSize(window.innerWidth, window.innerHeight);
    this.instance.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Important for Three.js environments that we append the DOM
    document.body.appendChild(this.instance.domElement);

    window.addEventListener('resize', this.onResize.bind(this));
  }

  onResize() {
    this.instance.setSize(window.innerWidth, window.innerHeight);
    this.instance.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  render(scene, camera) {
    this.instance.render(scene, camera);
  }
}
