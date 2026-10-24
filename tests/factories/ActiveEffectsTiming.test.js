import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { BurstParticleFactory } from '../../src/factories/BurstParticleFactory.js';
import { BurstEffectProcessor } from '../../src/factories/BurstEffectProcessor.js';
import { FireworkSystem } from '../../src/systems/FireworkSystem.js';

describe('Active Effects Timeline Custom Timing Windows', () => {
  it('should parse and attach start and end timings from effect objects in BurstParticleFactory', () => {
    const effects = [
      { type: 'crackle', start: 0.8, end: 1.8 },
      { type: 'tadpole-flurry', start: 0.5, end: 1.2 },
      { type: 'crossette', start: 1.4 },
      { type: 'erratic-dart', start: 0.9, end: 2.0 },
      { type: 'burst-smoke', start: 0.1, end: 0.6 },
      { type: 'strobe', start: 0.3, end: 1.5 },
      { type: 'ghost', start: 0.7, end: 2.2 },
      { type: 'no-trail', start: 0.6, end: 2.1 }
    ];

    const particle = BurstParticleFactory.createParticle({
      effects,
      maxLife: 3.0,
      hasTadpoleFlurry: true,
      hasErraticDart: true,
      isCrossette: true,
      hasBurstSmoke: true
    });

    expect(particle.crackle).toBe(true);
    expect(particle.crackleStart).toBe(0.8);
    expect(particle.crackleEnd).toBe(1.8);

    expect(particle.tadpoleStart).toBe(0.5);
    expect(particle.tadpoleEnd).toBe(1.2);

    expect(particle.crossetteSplitTime).toBe(1.4);

    expect(particle.erraticDartTriggerTime).toBe(0.9);
    expect(particle.erraticDartEnd).toBe(2.0);

    expect(particle.burstSmokeStart).toBe(0.1);
    expect(particle.burstSmokeEnd).toBe(0.6);

    expect(particle.strobeStart).toBe(0.3);
    expect(particle.strobeEnd).toBe(1.5);

    expect(particle.ghostStart).toBe(0.7);
    expect(particle.ghostEnd).toBe(2.2);

    expect(particle.hasNoTrail).toBe(true);
    expect(particle.noTrailStart).toBe(0.6);
    expect(particle.noTrailEnd).toBe(2.1);
  });

  it('should calculate start and end times dynamically from startRatio and endRatio percentages based on particle maxLife', () => {
    const effects = [
      { type: 'crackle', startRatio: 0.10, endRatio: 0.50 }
    ];

    // Case 1: Firework with maxLife = 3.0s (10% -> 0.3s, 50% -> 1.5s)
    const particle3s = BurstParticleFactory.createParticle({
      effects,
      maxLife: 3.0
    });

    expect(particle3s.crackleStart).toBeCloseTo(0.30, 2);
    expect(particle3s.crackleEnd).toBeCloseTo(1.50, 2);

    // Case 2: Firework with maxLife = 4.0s (10% -> 0.4s, 50% -> 2.0s)
    const particle4s = BurstParticleFactory.createParticle({
      effects,
      maxLife: 4.0
    });

    expect(particle4s.crackleStart).toBeCloseTo(0.40, 2);
    expect(particle4s.crackleEnd).toBeCloseTo(2.00, 2);
  });

  it('should evaluate isEffectActive correctly based on age within [start, end]', () => {
    const particle = BurstParticleFactory.createParticle({
      effects: [
        { type: 'strobe', start: 1.0, end: 2.0 },
        { type: 'crackle', start: 1.5, end: 2.5 }
      ],
      maxLife: 3.0
    });

    // Before start
    particle.age = 0.5;
    expect(BurstEffectProcessor.isEffectActive(particle, 'strobe')).toBe(false);
    expect(BurstEffectProcessor.isEffectActive(particle, 'crackle')).toBe(false);

    // In strobe window, before crackle window
    particle.age = 1.2;
    expect(BurstEffectProcessor.isEffectActive(particle, 'strobe')).toBe(true);
    expect(BurstEffectProcessor.isEffectActive(particle, 'crackle')).toBe(false);

    // In both windows
    particle.age = 1.8;
    expect(BurstEffectProcessor.isEffectActive(particle, 'strobe')).toBe(true);
    expect(BurstEffectProcessor.isEffectActive(particle, 'crackle')).toBe(true);

    // After strobe window, inside crackle window
    particle.age = 2.2;
    expect(BurstEffectProcessor.isEffectActive(particle, 'strobe')).toBe(false);
    expect(BurstEffectProcessor.isEffectActive(particle, 'crackle')).toBe(true);

    // After both windows
    particle.age = 2.8;
    expect(BurstEffectProcessor.isEffectActive(particle, 'strobe')).toBe(false);
    expect(BurstEffectProcessor.isEffectActive(particle, 'crackle')).toBe(false);
  });

  it('should trigger erratic dart at configured start time instead of default 70% life ratio', () => {
    const particle = BurstParticleFactory.createParticle({
      effects: [
        { type: 'erratic-dart', start: 0.4, end: 1.5 }
      ],
      maxLife: 3.0,
      hasErraticDart: true
    });

    expect(particle.erraticDartTriggered).toBe(false);
    expect(particle.erraticDartTriggerTime).toBe(0.4);

    // Age 0.2s: lifeRatio = 0.067, should NOT trigger
    particle.age = 0.2;
    BurstEffectProcessor.processErraticDart(particle, 0.016, particle.age / particle.maxLife, 1.0);
    expect(particle.erraticDartTriggered).toBe(false);

    // Age 0.45s: reaches triggerTime 0.4s, should trigger
    particle.age = 0.45;
    BurstEffectProcessor.processErraticDart(particle, 0.016, particle.age / particle.maxLife, 1.0);
    expect(particle.erraticDartTriggered).toBe(true);
  });

  it('should trigger crossette split at custom start time in FireworkSystem simulation', () => {
    const scene = new THREE.Scene();
    const system = new FireworkSystem(scene);

    system.createBurst(
      new THREE.Vector3(0, 100, 0),
      new THREE.Color(0xff0000),
      'sphere',
      {
        crossette: true,
        effects: [
          { type: 'crossette', start: 0.35, end: 1.0 }
        ]
      }
    );

    const crossetteParticles = system.burstParticles.filter((p) => p.isCrossette);
    expect(crossetteParticles.length).toBeGreaterThan(0);

    const p = crossetteParticles[0];
    expect(p.crossetteSplitTime).toBe(0.35);
    expect(p.crossetteSplitDone).toBe(false);

    // Step system before 0.35s
    system.update(0.20);
    expect(p.crossetteSplitDone).toBe(false);

    // Step system past 0.35s
    system.update(0.20);
    expect(p.crossetteSplitDone).toBe(true);

    system.clear();
  });

  it('should evaluate isEffectActive for no-trail and suppress trail emission in FireworkSystem during timing window', () => {
    const particle = BurstParticleFactory.createParticle({
      effects: [
        { type: 'no-trail', start: 0.5, end: 1.5 }
      ],
      maxLife: 2.0
    });

    expect(particle.hasNoTrail).toBe(true);
    expect(particle.noTrailStart).toBe(0.5);
    expect(particle.noTrailEnd).toBe(1.5);

    // Before start: not active
    particle.age = 0.2;
    expect(BurstEffectProcessor.isEffectActive(particle, 'no-trail')).toBe(false);

    // In window: active
    particle.age = 0.8;
    expect(BurstEffectProcessor.isEffectActive(particle, 'no-trail')).toBe(true);

    // After window: not active
    particle.age = 1.8;
    expect(BurstEffectProcessor.isEffectActive(particle, 'no-trail')).toBe(false);

    // Test in FireworkSystem with Chrysanthemum preset and active effect no-trail
    const scene = new THREE.Scene();
    const system = new FireworkSystem(scene);

    let trailSpawnCount = 0;
    system.trailSystem = {
      spawnTrail: () => {
        trailSpawnCount++;
      },
      spawnMicroCrackle: () => {}
    };

    system.createBurst(
      new THREE.Vector3(0, 100, 0),
      new THREE.Color(0xffaa00),
      'sphere',
      {
        dynamicsType: 'crysanthemum-trail',
        effects: [
          { type: 'no-trail', start: 0.3, end: 0.9 }
        ]
      }
    );

    expect(system.burstParticles.length).toBeGreaterThan(0);
    const burstP = system.burstParticles[0];
    expect(burstP.hasNoTrail).toBe(true);
    expect(burstP.noTrailStart).toBe(0.3);
    expect(burstP.noTrailEnd).toBe(0.9);

    // Step to age 0.1s (before 0.3s): trails can spawn
    system.update(0.1);
    const countBeforeWindow = trailSpawnCount;

    // Step inside active window [0.3s - 0.9s]: no trails can spawn
    system.update(0.4); // now age ~0.5s
    const countInWindow = trailSpawnCount;
    expect(countInWindow).toBe(countBeforeWindow); // No new trails spawned!

    system.clear();
  });

  it('should only apply strobe within the configured timing window and not before or after', () => {
    const particle = BurstParticleFactory.createParticle({
      effects: [
        { type: 'strobe', start: 0.5, end: 1.2 }
      ],
      maxLife: 2.0,
      color: new THREE.Color(1, 0, 0),
      preset: { strobe: true } // Even with legacy preset flag, timing window must take precedence
    });

    // Before window (age = 0.2s): should not be strobe active
    particle.age = 0.2;
    expect(BurstEffectProcessor.isEffectActive(particle, 'strobe')).toBe(false);

    const colorBefore = BurstEffectProcessor.resolveParticleColor(particle, 0.15, {
      strobeFreqMultiplier: 1.0,
      profile: { thermalCooling: false }
    });
    // When not strobing, it retains normal base color
    expect(colorBefore.r).toBeCloseTo(1.0);

    // Inside window (age = 0.8s): should be strobe active
    particle.age = 0.8;
    expect(BurstEffectProcessor.isEffectActive(particle, 'strobe')).toBe(true);

    // After window (age = 1.6s): should not be strobe active
    particle.age = 1.6;
    expect(BurstEffectProcessor.isEffectActive(particle, 'strobe')).toBe(false);
  });
});
