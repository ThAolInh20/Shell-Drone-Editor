import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import { TrailSystem } from '../../src/systems/TrailSystem.js';

describe('GPU-Driven Vertex Shader Kinematics Trail System', () => {
  let scene;
  let trailSystem;

  beforeEach(() => {
    scene = new THREE.Scene();
    trailSystem = new TrailSystem(scene, { useGpuSimulation: true });
  });

  afterEach(() => {
    if (trailSystem) trailSystem.destroy();
    vi.restoreAllMocks();
  });

  it('should initialize in GPU simulation mode when option is specified', () => {
    expect(trailSystem.isGpuSimulationEnabled()).toBe(true);
    expect(trailSystem.trailUniforms.uGpuSim.value).toBe(1.0);
    expect(trailSystem.gpuParticleCount).toBe(0);
    expect(trailSystem.gpuCursor).toBe(0);
  });

  it('should write particle kinematics directly to GPU buffer attributes on spawn', () => {
    const spawnPos = new THREE.Vector3(15, 120, -25);
    const spawnColor = new THREE.Color(0xff4400);
    const customVel = new THREE.Vector3(2.5, 4.0, -1.5);

    trailSystem.spawnTrailParticle(
      spawnPos,
      spawnColor,
      1.0,
      false,
      1.2,
      0.8,
      false,
      customVel,
      0.6,
      1.5,
      false,
      100,
      true
    );

    expect(trailSystem.gpuParticleCount).toBe(1);
    expect(trailSystem.gpuCursor).toBe(1);
    expect(trailSystem.trailParticles.length).toBe(0); // Zero CPU allocations

    // Verify GPU position buffer
    expect(trailSystem.positionsArray[0]).toBe(15);
    expect(trailSystem.positionsArray[1]).toBe(120);
    expect(trailSystem.positionsArray[2]).toBe(-25);

    // Verify GPU velocity buffer
    expect(trailSystem.velocitiesArray[0]).toBeCloseTo(2.5, 5);
    expect(trailSystem.velocitiesArray[1]).toBeCloseTo(4.0, 5);
    expect(trailSystem.velocitiesArray[2]).toBeCloseTo(-1.5, 5);

    // Verify GPU params buffer (birthTime, life, gravityScale, dragScale)
    expect(trailSystem.paramsArray[0]).toBe(0); // initial currentTime
    expect(trailSystem.paramsArray[1]).toBeCloseTo(1.2, 5); // life
    expect(trailSystem.paramsArray[2]).toBeCloseTo(0.6, 5); // gravityScale
    expect(trailSystem.paramsArray[3]).toBeCloseTo(1.5, 5); // dragScale
  });

  it('should advance simulation time and update draw range on update without CPU loops', () => {
    trailSystem.spawnTrailParticle(
      new THREE.Vector3(0, 50, 0),
      new THREE.Color(0x00ff00)
    );

    expect(trailSystem.gpuDirtyMin).toBe(0);
    expect(trailSystem.gpuDirtyMax).toBe(0);

    trailSystem.update(0.016);

    expect(trailSystem.currentTime).toBeCloseTo(0.016, 4);
    expect(trailSystem.trailUniforms.uTime.value).toBeCloseTo(0.016, 4);
    expect(trailSystem.gpuDirtyMin).toBe(-1);
    expect(trailSystem.gpuDirtyMax).toBe(-1);
    expect(trailSystem.trailGeometry.drawRange.count).toBe(1);
  });

  it('should reset GPU ring buffer and invalidate birth times on clear', () => {
    trailSystem.spawnTrailParticle(
      new THREE.Vector3(10, 20, 30),
      new THREE.Color(0xffff00)
    );
    expect(trailSystem.gpuParticleCount).toBe(1);

    trailSystem.clear();

    expect(trailSystem.gpuParticleCount).toBe(0);
    expect(trailSystem.gpuCursor).toBe(0);
    expect(trailSystem.paramsArray[0]).toBe(-999999.0);
    expect(trailSystem.trailGeometry.drawRange.count).toBe(0);
  });

  it('should toggle cleanly between GPU and CPU simulation modes', () => {
    trailSystem.setGpuSimulation(false);
    expect(trailSystem.isGpuSimulationEnabled()).toBe(false);
    expect(trailSystem.trailUniforms.uGpuSim.value).toBe(0.0);

    // In CPU mode, particles are pushed to trailParticles
    trailSystem.spawnTrailParticle(
      new THREE.Vector3(1, 2, 3),
      new THREE.Color(0xffffff)
    );
    expect(trailSystem.trailParticles.length).toBe(1);

    trailSystem.setGpuSimulation(true);
    expect(trailSystem.isGpuSimulationEnabled()).toBe(true);
    expect(trailSystem.trailUniforms.uGpuSim.value).toBe(1.0);
    expect(trailSystem.trailParticles.length).toBe(0);
  });

  it('should inject GPU kinematics and clipping logic in onBeforeCompile', () => {
    const mockShader = {
      uniforms: {},
      vertexShader: `
        #include <common>
        #include <begin_vertex>
        gl_PointSize = size;
      `,
      fragmentShader: `
        #include <color_fragment>
      `
    };

    trailSystem.trailMaterial.onBeforeCompile(mockShader);

    expect(mockShader.uniforms.uGpuSim).toBeDefined();
    expect(mockShader.uniforms.uTime).toBeDefined();
    expect(mockShader.uniforms.uGravity).toBeDefined();

    expect(mockShader.vertexShader).toContain('attribute vec3 aVelocity;');
    expect(mockShader.vertexShader).toContain('vec3 calculatedPos = position + aVelocity * dragFactor;');
    expect(mockShader.vertexShader).toContain('gl_Position = vec4(2.0, 2.0, 2.0, 1.0);');

    expect(mockShader.fragmentShader).toContain('vec3 baseRgb = (uGpuSim > 0.5) ? vGpuTrailColor.rgb : diffuseColor.rgb;');
  });
});
