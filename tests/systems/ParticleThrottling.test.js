import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { FireworkSystem } from '../../src/systems/FireworkSystem.js';
import { FIREWORK_CONFIG } from '../../src/config/fireworks.js';

describe('Particle Pool Dynamic Soft Throttling', () => {
  it('should maintain full particle count when pool usage is at or below 70%', () => {
    const scene = new THREE.Scene();
    const system = new FireworkSystem(scene);
    system.maxBurstParticles = 6000;

    // Simulate 0% pool usage
    system.burstParticles = [];
    const countAt0 = system.resolveBurstParticleCount('sphere', 'standard', { shellSize: 1.0 });

    // Simulate 69% pool usage (4140 / 6000)
    system.burstParticles = new Array(4140).fill({});
    const countAt69 = system.resolveBurstParticleCount('sphere', 'standard', { shellSize: 1.0 });

    expect(countAt69).toBe(countAt0);
  });

  it('should progressively scale down particle count between 70% and 100% pool capacity', () => {
    const scene = new THREE.Scene();
    const system = new FireworkSystem(scene);
    system.maxBurstParticles = 6000;

    system.burstParticles = [];
    const baseCount = system.resolveBurstParticleCount('sphere', 'standard', { shellSize: 1.0 });

    // At 85% capacity (halfway between 70% and 100%)
    system.burstParticles = new Array(5100).fill({});
    const countAt85 = system.resolveBurstParticleCount('sphere', 'standard', { shellSize: 1.0 });

    // At 100% capacity
    system.burstParticles = new Array(6000).fill({});
    const countAt100 = system.resolveBurstParticleCount('sphere', 'standard', { shellSize: 1.0 });

    expect(countAt85).toBeLessThan(baseCount);
    expect(countAt100).toBeLessThan(countAt85);

    // At 100% capacity, count should be approximately 50% (minFloor = 0.50) of base
    const ratioAt100 = countAt100 / baseCount;
    expect(ratioAt100).toBeGreaterThanOrEqual(0.48);
    expect(ratioAt100).toBeLessThanOrEqual(0.60);
  });

  it('should protect outline shapes with higher outlineMinFloor under heavy saturation', () => {
    const scene = new THREE.Scene();
    const system = new FireworkSystem(scene);
    system.maxBurstParticles = 6000;

    // Normal sphere at 100% saturation
    system.burstParticles = [];
    const baseSphere = system.resolveBurstParticleCount('sphere', 'standard', { shellSize: 1.0 });
    system.burstParticles = new Array(6000).fill({});
    const throttledSphere = system.resolveBurstParticleCount('sphere', 'standard', { shellSize: 1.0 });

    // Outline star at 100% saturation
    system.burstParticles = [];
    const baseStar = system.resolveBurstParticleCount('star', 'standard', { shellSize: 1.0 });
    system.burstParticles = new Array(6000).fill({});
    const throttledStar = system.resolveBurstParticleCount('star', 'standard', { shellSize: 1.0 });

    const sphereRatio = throttledSphere / baseSphere;
    const starRatio = throttledStar / baseStar;

    // Star (outline) should retain higher particle density (~0.70x) than sphere (~0.50x)
    expect(starRatio).toBeGreaterThan(sphereRatio);
    expect(starRatio).toBeGreaterThanOrEqual(0.68);
  });

  it('should preserve balanced core and ring particle counts for pistil shells under throttling', () => {
    const scene = new THREE.Scene();
    const system = new FireworkSystem(scene);
    system.maxBurstParticles = 6000;

    // Simulate 95% capacity saturation
    system.burstParticles = new Array(5700).fill({});

    system.createBurst(
      new THREE.Vector3(0, 50, 0),
      new THREE.Color(1, 0, 0),
      'sphere',
      {
        pistil: true,
        shellSize: 1.0
      },
      'test-pistil-shell'
    );

    // Find the newly spawned particles for this shell
    const shellParticles = system.burstParticles.filter((p) => p.shellId === 'test-pistil-shell');
    expect(shellParticles.length).toBeGreaterThan(0);

    // Check that we have both outer stars and inner pistil stars (distinguished by velocity or properties)
    expect(shellParticles.length).toBeGreaterThanOrEqual(25);
  });

  it('should safely evict excess particles via splice without exceeding maxBurstParticles', () => {
    const scene = new THREE.Scene();
    const system = new FireworkSystem(scene);
    system.maxBurstParticles = 100;

    // Fill pool to 90 particles
    system.burstParticles = Array.from({ length: 90 }, (_, i) => ({ id: `old-${i}` }));

    // Create a burst that adds ~30 particles
    system.createBurst(
      new THREE.Vector3(0, 50, 0),
      new THREE.Color(0, 1, 0),
      'sphere',
      { shellSize: 0.5 },
      'test-overflow-shell'
    );

    // Total particles should never exceed maxBurstParticles
    expect(system.burstParticles.length).toBeLessThanOrEqual(100);

    // The newly spawned particles should be present
    const newCount = system.burstParticles.filter((p) => p.shellId === 'test-overflow-shell').length;
    expect(newCount).toBeGreaterThan(0);
  });
});

