import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import { FireworkSystem } from '../../src/systems/FireworkSystem.js';
import { TrailSystem } from '../../src/systems/TrailSystem.js';
import { FIREWORK_CONFIG } from '../../src/config/fireworks.js';
import { BurstEffectProcessor } from '../../src/factories/BurstEffectProcessor.js';
import { BurstParticleFactory } from '../../src/factories/BurstParticleFactory.js';

describe('Trail Performance Zero-Allocation Optimization', () => {
  let scene;
  let trailSystem;
  let fireworkSystem;

  beforeEach(() => {
    scene = new THREE.Scene();
    trailSystem = new TrailSystem(scene);
    fireworkSystem = new FireworkSystem(scene, trailSystem);
  });

  afterEach(() => {
    if (trailSystem) trailSystem.destroy();
    if (fireworkSystem) fireworkSystem.destroy();
    vi.restoreAllMocks();
  });

  it('should maintain original preset configuration for crysanthemum dynamics', () => {
    const crysTrail = BurstEffectProcessor.updateVelocity(
      new THREE.Vector3(10, 10, 10),
      0,
      0.016,
      0.1,
      1.5,
      { effectType: 'crysanthemum-trail' }
    );
    expect(crysTrail.spawnTrail).toBe(true);
    expect(crysTrail.trailLife).toBeCloseTo(0.45, 2);
    expect(crysTrail.trailIntensity).toBeCloseTo(0.9, 2);
    expect(crysTrail.gravityScale).toBeCloseTo(0.3, 2);

    const crysSpiral = BurstEffectProcessor.updateVelocity(
      new THREE.Vector3(10, 10, 10),
      0,
      0.016,
      0.1,
      1.5,
      { effectType: 'crysanthemum-spiral' }
    );
    expect(crysSpiral.spawnTrail).toBe(true);
    expect(crysSpiral.trailLife).toBeCloseTo(0.45, 2);
    expect(crysSpiral.trailIntensity).toBeCloseTo(0.95, 2);
  });

  it('should recycle dead trail particles into particlePool for zero-allocation reuse', () => {
    expect(trailSystem.particlePool.length).toBe(0);

    // Spawn 1 particle with short customLife of 0.05s
    trailSystem.spawnTrailParticle(
      new THREE.Vector3(0, 100, 0),
      new THREE.Color(0xff8800),
      1.0,
      false,
      0.05
    );

    expect(trailSystem.trailParticles.length).toBe(1);
    const spawnedRef = trailSystem.trailParticles[0];

    // Update with 0.1s dt so particle expires
    trailSystem.update(0.1);

    expect(trailSystem.trailParticles.length).toBe(0);
    expect(trailSystem.particlePool.length).toBe(1);
    expect(trailSystem.particlePool[0]).toBe(spawnedRef);

    // Spawning next particle should reuse the object from pool
    trailSystem.spawnTrailParticle(
      new THREE.Vector3(50, 120, 50),
      new THREE.Color(0x00ffff),
      1.0,
      false,
      0.5
    );

    expect(trailSystem.trailParticles.length).toBe(1);
    expect(trailSystem.trailParticles[0]).toBe(spawnedRef);
    expect(trailSystem.trailParticles[0].position.x).toBe(50);
    expect(trailSystem.trailParticles[0].position.y).toBe(120);
    expect(trailSystem.particlePool.length).toBe(0);
  });

  it('should recycle particles into pool when clear() is called', () => {
    trailSystem.spawnTrailParticle(
      new THREE.Vector3(10, 10, 10),
      new THREE.Color(0xff0000),
      1.0,
      false,
      1.0
    );
    trailSystem.spawnTrailParticle(
      new THREE.Vector3(20, 20, 20),
      new THREE.Color(0x00ff00),
      1.0,
      false,
      1.0
    );

    expect(trailSystem.trailParticles.length).toBe(2);
    trailSystem.clear();

    expect(trailSystem.trailParticles.length).toBe(0);
    expect(trailSystem.particlePool.length).toBe(2);
  });

  it('should compute full lingering lifetime for chrysanthemum trail particles', () => {
    const particle = BurstParticleFactory.createParticle({
      position: new THREE.Vector3(0, 200, 0),
      velocity: new THREE.Vector3(10, 0, 0),
      color: new THREE.Color(0xffaa00),
      baseColor: new THREE.Color(0xffaa00),
      maxLife: 2.0,
      effectType: 'crysanthemum-trail',
      effectState: {
        effectType: 'crysanthemum-trail'
      }
    });

    fireworkSystem.burstParticles = [particle];
    vi.spyOn(Math, 'random').mockReturnValue(0.1);

    fireworkSystem.updateBurstParticles(0.016);

    expect(trailSystem.trailParticles.length).toBeGreaterThan(0);
    const trailP = trailSystem.trailParticles[0];
    // Chrysanthemum sparks retain rich lingering duration (> 0.8s) for full visual trails
    expect(trailP.life).toBeGreaterThan(0.8);
  });

  it('should execute direct scalar kinematics without throwing exceptions', () => {
    trailSystem.spawnTrailParticle(
      new THREE.Vector3(10, 100, 10),
      new THREE.Color(0xffffff),
      1.0,
      false,
      1.0,
      0.65,
      false,
      new THREE.Vector3(5, 10, 5)
    );

    const initialY = trailSystem.trailParticles[0].position.y;
    trailSystem.update(0.016);

    expect(trailSystem.trailParticles.length).toBe(1);
    expect(trailSystem.trailParticles[0].position.y).not.toBe(initialY);
    expect(trailSystem.trailParticles[0].age).toBeCloseTo(0.016, 3);
  });
});
