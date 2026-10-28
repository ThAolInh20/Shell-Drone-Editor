import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { FireworkSystem } from '../../src/systems/FireworkSystem.js';
import { TrailSystem } from '../../src/systems/TrailSystem.js';
import { renderingConfig } from '../../src/config/rendering.js';

describe('Particle Edge Softness Shader Uniform and System Integration', () => {
  let scene;
  let trailSystem;
  let fireworkSystem;

  beforeEach(() => {
    renderingConfig.post.particleEdgeSoftness = 0.75;
    scene = new THREE.Scene();
    trailSystem = new TrailSystem(scene);
    fireworkSystem = new FireworkSystem(scene, trailSystem);
  });

  it('should initialize FireworkSystem with default particleEdgeSoftness', () => {
    expect(fireworkSystem.getParticleEdgeSoftness()).toBe(0.75);
    expect(fireworkSystem.burstUniforms.uEdgeSoftness.value).toBe(0.75);
  });

  it('should initialize TrailSystem with default particleEdgeSoftness', () => {
    expect(trailSystem.getParticleEdgeSoftness()).toBe(0.75);
    expect(trailSystem.trailUniforms.uEdgeSoftness.value).toBe(0.75);
  });

  it('should update softness on both FireworkSystem and TrailSystem when setParticleEdgeSoftness is called', () => {
    fireworkSystem.setParticleEdgeSoftness(0.42);

    expect(fireworkSystem.getParticleEdgeSoftness()).toBe(0.42);
    expect(fireworkSystem.burstUniforms.uEdgeSoftness.value).toBe(0.42);
    expect(trailSystem.getParticleEdgeSoftness()).toBe(0.42);
    expect(trailSystem.trailUniforms.uEdgeSoftness.value).toBe(0.42);
  });

  it('should inject uEdgeSoftness uniform and shader logic during onBeforeCompile in FireworkSystem', () => {
    const mockShader = {
      uniforms: {},
      vertexShader: `
        #include <common>
        gl_PointSize = size;
      `,
      fragmentShader: `
        #include <color_fragment>
      `
    };

    fireworkSystem.globalBurstMaterial.onBeforeCompile(mockShader);

    expect(mockShader.uniforms.uEdgeSoftness).toBeDefined();
    expect(mockShader.uniforms.uEdgeSoftness.value).toBe(0.75);
    expect(mockShader.fragmentShader).toContain('uniform float uEdgeSoftness;');
    expect(mockShader.fragmentShader).toContain('if (dist > uEdgeSoftness) discard;');
  });

  it('should inject uEdgeSoftness uniform and shader logic during onBeforeCompile in TrailSystem', () => {
    const mockShader = {
      uniforms: {},
      fragmentShader: `
        #include <color_fragment>
      `
    };

    trailSystem.trailMaterial.onBeforeCompile(mockShader);

    expect(mockShader.uniforms.uEdgeSoftness).toBeDefined();
    expect(mockShader.uniforms.uEdgeSoftness.value).toBe(0.75);
    expect(mockShader.fragmentShader).toContain('uniform float uEdgeSoftness;');
    expect(mockShader.fragmentShader).toContain('if (dist > uEdgeSoftness) discard;');
  });
});
