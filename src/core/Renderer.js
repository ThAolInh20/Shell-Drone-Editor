import * as THREE from 'three';
import { renderingConfig } from '../config/rendering.js';

export class Renderer {
  constructor() {
    this.resizeListeners = [];
    this.instance = new THREE.WebGLRenderer({
      antialias: renderingConfig.renderer.antialias,
      alpha: false
    });

    this.instance.outputColorSpace = THREE.SRGBColorSpace;
    this.instance.toneMapping = THREE.ACESFilmicToneMapping;
    this.instance.toneMappingExposure = renderingConfig.renderer.exposure;
    this.instance.physicallyCorrectLights = true;

    this.instance.setSize(window.innerWidth, window.innerHeight);
    this.instance.setPixelRatio(Math.min(window.devicePixelRatio, renderingConfig.renderer.maxPixelRatio));
    
    // Important for Three.js environments that we append the DOM
    document.body.appendChild(this.instance.domElement);

    window.addEventListener('resize', this.onResize.bind(this));
  }

  addResizeListener(listener) {
    this.resizeListeners.push(listener);
  }

  onResize() {
    this.instance.setSize(window.innerWidth, window.innerHeight);
    this.instance.setPixelRatio(Math.min(window.devicePixelRatio, renderingConfig.renderer.maxPixelRatio));

    for (const listener of this.resizeListeners) {
      listener(window.innerWidth, window.innerHeight, this.instance.getPixelRatio());
    }
  }

  render(scene, camera) {
    this.instance.render(scene, camera);
  }
}
