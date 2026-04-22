import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';

export class PostProcessingPipeline {
  constructor(renderer, scene, camera, config) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.config = config;

    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    this.bloomPass = null;
    if (this.config.post.bloom.enabled) {
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        this.config.post.bloom.strength,
        this.config.post.bloom.radius,
        this.config.post.bloom.threshold
      );
      this.composer.addPass(this.bloomPass);
    }

    this.aaPass = null;
    if (this.config.post.aa.enabled && this.config.post.aa.mode === 'fxaa') {
      this.aaPass = new ShaderPass(FXAAShader);
      this.composer.addPass(this.aaPass);
    }

    this.setSize(window.innerWidth, window.innerHeight, this.renderer.getPixelRatio());
  }

  setSize(width, height, pixelRatio) {
    this.composer.setSize(width, height);
    this.composer.setPixelRatio(pixelRatio);

    if (this.aaPass) {
      const resolution = this.aaPass.material.uniforms.resolution.value;
      resolution.x = 1 / (width * pixelRatio);
      resolution.y = 1 / (height * pixelRatio);
    }
  }

  render() {
    this.composer.render();
  }
}
