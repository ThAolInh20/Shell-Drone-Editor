import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import { FireworkSystem } from '../../src/systems/FireworkSystem.js';
import { FIREWORK_CONFIG } from '../../src/config/fireworks.js';
import { BurstParticleFactory } from '../../src/factories/BurstParticleFactory.js';

describe('Burst Trail Trajectory Segment Interpolation', () => {
  let scene;
  let mockTrailSystem;
  let fireworkSystem;
  let spawnedParticles = [];

  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    scene = new THREE.Scene();
    spawnedParticles = [];

    mockTrailSystem = {
      spawnTrailParticle(
        pos,
        color,
        life,
        zeroVel,
        customLife,
        opacity,
        strobe,
        vel,
        grav,
        drag
      ) {
        spawnedParticles.push({
          pos: pos.clone(),
          color: color.clone(),
          life,
          vel: vel ? vel.clone() : null,
          grav,
          drag
        });
      }
    };

    fireworkSystem = new FireworkSystem(scene, mockTrailSystem);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should define centralized burst trail parameters in FIREWORK_CONFIG.BURST', () => {
    expect(FIREWORK_CONFIG.BURST.trailStride).toBeDefined();
    expect(FIREWORK_CONFIG.BURST.trailStride).toBeCloseTo(0.45, 2);
    expect(FIREWORK_CONFIG.BURST.maxTrailSubSteps).toBe(3);
    expect(FIREWORK_CONFIG.BURST.defaultTrailSpawnChance).toBe(0.95);
  });

  it('should initialize prevPosition on burst particles from factory', () => {
    const p = BurstParticleFactory.createParticle({
      position: new THREE.Vector3(10, 250, 10),
      velocity: new THREE.Vector3(0, 0, 0),
      color: new THREE.Color(0xffffff),
      maxLife: 2.0
    });

    expect(p.prevPosition).toBeDefined();
    expect(p.prevPosition.x).toBe(10);
    expect(p.prevPosition.y).toBe(250);
  });

  it('should interpolate multiple sub-step trail points when burst particle travels high distance', () => {
    // Speed 70 m/s in X axis -> moveDist in 0.016s is ~1.12m
    const initialPos = new THREE.Vector3(0, 200, 0);
    const particle = BurstParticleFactory.createParticle({
      position: initialPos.clone(),
      velocity: new THREE.Vector3(70, 0, 0),
      color: new THREE.Color(0x00ffff),
      baseColor: new THREE.Color(0x00ffff),
      maxLife: 2.0,
      effectType: 'crysanthemum-trail',
      effectState: {
        effectType: 'crysanthemum-trail'
      }
    });

    fireworkSystem.burstParticles = [particle];

    // Simulate 1 frame (0.016s)
    fireworkSystem.updateBurstParticles(0.016);

    // With moveDist ~1.12m and targetStride 0.45m, ceil(1.12 / 0.45) = 3 sub-steps
    expect(spawnedParticles.length).toBe(3);

    // Verify sub-steps are strictly ordered along the trajectory segment
    expect(spawnedParticles[0].pos.x).toBeGreaterThan(initialPos.x);
    expect(spawnedParticles[1].pos.x).toBeGreaterThan(spawnedParticles[0].pos.x);
    expect(spawnedParticles[2].pos.x).toBeGreaterThan(spawnedParticles[1].pos.x);

    // The final sub-step should land exactly on particle's current position
    expect(spawnedParticles[2].pos.x).toBeCloseTo(particle.position.x, 3);
  });

  it('should only spawn a single particle when particle moves below stride threshold', () => {
    // Low speed (5 m/s) -> moveDist in 0.016s is 0.08m (< 0.45m)
    const initialPos = new THREE.Vector3(0, 200, 0);
    const particle = BurstParticleFactory.createParticle({
      position: initialPos.clone(),
      velocity: new THREE.Vector3(5, 0, 0),
      color: new THREE.Color(0xffd700),
      baseColor: new THREE.Color(0xffd700),
      maxLife: 2.0,
      effectType: 'crysanthemum-trail',
      effectState: {
        effectType: 'crysanthemum-trail'
      }
    });

    fireworkSystem.burstParticles = [particle];
    fireworkSystem.updateBurstParticles(0.016);

    // Steps should be clamped to 1
    expect(spawnedParticles.length).toBe(1);
    expect(spawnedParticles[0].pos.x).toBeCloseTo(particle.position.x, 3);
  });
});
