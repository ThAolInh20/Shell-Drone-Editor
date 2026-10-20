import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { ShellPresetFactory } from '../../src/factories/ShellPresetFactory.js';
import {
  getTemplateForPreset,
  resolveFireworkComposition,
  AVAILABLE_EFFECT_TAGS
} from '../../src/factories/FireworkCompositionHelper.js';
import { FireworkSystem } from '../../src/systems/FireworkSystem.js';
import { BurstEffectProcessor } from '../../src/factories/BurstEffectProcessor.js';
import { FIREWORK_CONFIG } from '../../src/config/fireworks.js';

describe('Erratic Dart Active Effect and Presets', () => {
  it('should register erratic-dart in AVAILABLE_EFFECT_TAGS and composition helper', () => {
    expect(AVAILABLE_EFFECT_TAGS).toContain('erratic-dart');

    const template = getTemplateForPreset('sphere_erratic_dart');
    expect(template).toBeDefined();
    expect(template.shape).toBe('sphere');
    expect(template.effects).toContain('erratic-dart');

    const comp = resolveFireworkComposition({
      preset: 'sphere_erratic_dart',
      effects: ['erratic-dart']
    });
    expect(comp.shape).toBe('sphere');
    expect(comp.effects).toContain('erratic-dart');
  });

  it('should create sphere_erratic_dart preset with correct schema in ShellPresetFactory', () => {
    const factory = new ShellPresetFactory();
    const preset = factory.createPresetByKey('sphere_erratic_dart');
    expect(preset).toBeDefined();
    expect(preset.shellType).toBe('sphere_erratic_dart');
    expect(preset.shapeType).toBe('sphere');
    expect(preset.effects).toContain('erratic-dart');
    expect(preset.erraticDart).toBe(true);

    const menuEntry = factory.presetMenuEntries.find(
      (entry) => entry.key === 'sphere_erratic_dart'
    );
    expect(menuEntry).toBeDefined();
    expect(menuEntry.label).toBe('Sphere Erratic Dart');
  });

  it('should assign erratic dart properties to burst particles upon shell explosion', () => {
    const scene = new THREE.Scene();
    const fireworkSystem = new FireworkSystem(scene);

    const burstPos = new THREE.Vector3(0, 100, 0);
    const burstColor = new THREE.Color(0x00ff88);

    fireworkSystem.createBurst(
      burstPos,
      burstColor,
      'sphere',
      {
        effects: ['erratic-dart'],
        erraticDart: true
      },
      'test-shell-dart'
    );

    expect(fireworkSystem.burstParticles.length).toBeGreaterThan(0);
    const dartParticles = fireworkSystem.burstParticles.filter(
      (p) => p.hasErraticDart
    );
    expect(dartParticles.length).toBeGreaterThan(0);

    const sample = dartParticles[0];
    expect(sample.hasErraticDart).toBe(true);
    expect(sample.erraticDartTriggered).toBe(false);
    expect(sample.erraticDartTriggerRatio).toBeGreaterThanOrEqual(0.70);
    expect(sample.erraticDartTriggerRatio).toBeLessThanOrEqual(0.76);

    fireworkSystem.clear();
  });

  it('should trigger sudden acceleration, deflection, and draw streak trails near burnout', () => {
    const scene = new THREE.Scene();
    const fireworkSystem = new FireworkSystem(scene);
    let spawnedStreakParticles = [];

    fireworkSystem.trailSystem = {
      spawnTrailParticle: (
        pos,
        col,
        lifeMul,
        zeroVel,
        customLife,
        opacity,
        strobe,
        vel,
        gravity,
        drag,
        shimmer,
        phase,
        exactColor
      ) => {
        spawnedStreakParticles.push({
          position: pos,
          color: col,
          velocity: vel,
          customLife,
          gravityScale: gravity,
          drag,
          exactColor,
          strobe
        });
      },
      spawnMicroCrackle: () => {}
    };

    const burstPos = new THREE.Vector3(0, 120, 0);
    const burstColor = new THREE.Color(0xff8800);

    fireworkSystem.createBurst(
      burstPos,
      burstColor,
      'sphere',
      {
        effects: ['erratic-dart', 'strobe'],
        strobe: true,
        erraticDart: true
      },
      'test-shell-streak'
    );

    const p = fireworkSystem.burstParticles.find((part) => part.hasErraticDart);
    expect(p).toBeDefined();

    // Fast forward particle age to right before trigger
    p.age = p.maxLife * 0.65;
    fireworkSystem.updateBurstParticles(0.016);
    expect(p.erraticDartTriggered).toBe(false);

    // Fast forward to trigger window
    p.age = p.maxLife * 0.75;
    const initialVel = p.velocity.clone();
    fireworkSystem.updateBurstParticles(0.016);

    // Verify particle triggered sudden acceleration & deflection
    expect(p.erraticDartTriggered).toBe(true);
    const newSpeed = p.velocity.length();
    expect(newSpeed).toBeGreaterThanOrEqual(30.0);
    expect(p.dragCoefficient).toBeCloseTo(0.12, 2);

    // Continue updating: verify streak particles are emitted
    spawnedStreakParticles = [];
    p.erraticDartTrailTimer = FIREWORK_CONFIG.ERRATIC_DART?.trailInterval ?? 0.075;
    fireworkSystem.updateBurstParticles(0.016);

    expect(spawnedStreakParticles.length).toBeGreaterThan(0);
    const streak = spawnedStreakParticles[0];
    expect(streak.exactColor).toBe(true);
    expect(streak.strobe).toBe(true);
    expect(streak.gravityScale).toBeCloseTo(0.03, 2);
    expect(streak.customLife).toBeGreaterThanOrEqual(0.75);
    expect(p.renderOpacity).toBeGreaterThanOrEqual(0.95);

    // Verify natural lateral wobble during dart flight
    const velBeforeWobble = p.velocity.clone();
    fireworkSystem.updateBurstParticles(0.02);
    expect(p.velocity.distanceTo(velBeforeWobble)).toBeGreaterThan(0.05);

    fireworkSystem.clear();
  });

  it('should activate erratic dart on approximately 40% of burst particles', () => {
    const scene = new THREE.Scene();
    const fireworkSystem = new FireworkSystem(scene);

    fireworkSystem.createBurst(
      new THREE.Vector3(0, 100, 0),
      new THREE.Color(0xffaa00),
      'sphere',
      {
        effects: ['erratic-dart']
      },
      'test-40-ratio'
    );

    const total = fireworkSystem.burstParticles.length;
    const dartCount = fireworkSystem.burstParticles.filter(
      (part) => part.hasErraticDart
    ).length;
    const ratio = dartCount / total;

    expect(dartCount).toBeGreaterThan(0);
    expect(ratio).toBeGreaterThanOrEqual(0.20);
    expect(ratio).toBeLessThanOrEqual(0.60);

    fireworkSystem.clear();
  });

  it('should universally apply erratic-dart to non-sphere shapes like ring or heart', () => {
    const scene = new THREE.Scene();
    const fireworkSystem = new FireworkSystem(scene);

    const burstPos = new THREE.Vector3(0, 140, 0);
    const burstColor = new THREE.Color(0x00ffff);

    fireworkSystem.createBurst(
      burstPos,
      burstColor,
      'ring',
      {
        shapeType: 'ring',
        effects: ['erratic-dart']
      },
      'test-ring-dart'
    );

    const ringDartParticles = fireworkSystem.burstParticles.filter(
      (p) => p.hasErraticDart
    );
    expect(ringDartParticles.length).toBeGreaterThan(0);

    fireworkSystem.clear();
  });

  it('should actively steer direction causing visible 3D curvature and sway rather than a straight line', () => {
    const particle = {
      hasErraticDart: true,
      erraticDartTriggered: true,
      erraticDartFlash: 2.0,
      velocity: new THREE.Vector3(45, 0, 0),
      erraticDartPhaseOffset: 0.5,
      erraticDartCurlBias: 1.2
    };

    const initialDir = particle.velocity.clone().normalize();

    // Simulate 0.3s of darting flight across 18 frames
    for (let f = 0; f < 18; f++) {
      BurstEffectProcessor.processErraticDart(particle, 0.016, 0.85, 0.2);
    }

    const currentDir = particle.velocity.clone().normalize();
    const deflectionAngle = initialDir.angleTo(currentDir);

    // Verifies substantial angular steering (> 15 degrees / ~0.26 rad)
    expect(deflectionAngle).toBeGreaterThan(0.26);
  });

  it('should execute at most 1 to 2 sharp angular kinks and maintain straight flight between kinks', () => {
    const particle = {
      hasErraticDart: true,
      erraticDartTriggered: false,
      erraticDartTriggerRatio: 0.70,
      velocity: new THREE.Vector3(0, 5, 0),
      age: 1.4,
      maxLife: 2.0
    };

    // Trigger dart
    BurstEffectProcessor.processErraticDart(particle, 0.016, 0.71, 0.2);
    expect(particle.erraticDartTriggered).toBe(true);
    expect(particle.erraticDartKinkTimes.length).toBeGreaterThanOrEqual(1);
    expect(particle.erraticDartKinkTimes.length).toBeLessThanOrEqual(2);

    // Track direction changes across the entire dart flight (1.0 second, 60 frames)
    let directionChanges = 0;
    let prevDir = particle.velocity.clone().normalize();

    for (let f = 0; f < 60; f++) {
      BurstEffectProcessor.processErraticDart(particle, 0.016, 0.85, 0.2);
      const currentDir = particle.velocity.clone().normalize();
      const angle = prevDir.angleTo(currentDir);

      if (angle > 0.1) {
        directionChanges++;
        // Each kink must be a sharp turn >= 40 degrees (~0.7 rad)
        expect(angle).toBeGreaterThanOrEqual(0.65);
      }

      prevDir = currentDir;
    }

    // Direction changes must strictly match kink count (at most 1 or 2, never continuous)
    expect(directionChanges).toBeGreaterThanOrEqual(1);
    expect(directionChanges).toBeLessThanOrEqual(2);
  });
});

