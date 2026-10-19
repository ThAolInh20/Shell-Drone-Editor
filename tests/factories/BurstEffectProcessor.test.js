import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { BurstEffectProcessor } from '../../src/factories/BurstEffectProcessor.js';

describe('BurstEffectProcessor', () => {
  it('should normalize effect types correctly', () => {
    expect(BurstEffectProcessor.normalizeEffectType('wave')).toBe('wave');
    expect(BurstEffectProcessor.normalizeEffectType('invalid-effect-name')).toBe('standard');
  });

  it('should create height profiles correctly', () => {
    const profile = BurstEffectProcessor.createHeightProfile(100);
    expect(profile.normalized).toBeGreaterThanOrEqual(0);
    expect(profile.normalized).toBeLessThanOrEqual(1);
    expect(profile.sizeMultiplier).toBeDefined();
    expect(profile.brightnessMultiplier).toBeDefined();
  });

  it('should initialize effect states correctly', () => {
    const count = 10;
    const state = BurstEffectProcessor.initialize('snow', count);
    expect(state.effectType).toBe('snow');
    expect(state.spin.length).toBe(count);
    expect(state.phase.length).toBe(count);
    expect(state.turbulence.length).toBe(count);
  });

  it('should calculate material opacity correctly for different effects', () => {
    const baseOpacity = 0.9;
    // wave: opacities are dynamic based on age
    const waveOpacity = BurstEffectProcessor.materialOpacity('wave', 0.1, 1.0, baseOpacity);
    expect(waveOpacity).toBeLessThanOrEqual(1.0);

    // standard: should be baseOpacity unchanged
    const standardOpacity = BurstEffectProcessor.materialOpacity('standard', 0.1, 1.0, baseOpacity);
    expect(standardOpacity).toBe(baseOpacity);
  });

  it('should compute update velocities and return parameters', () => {
    const velocity = new THREE.Vector3(10, 20, 30);
    const state = BurstEffectProcessor.initialize('flow', 5);
    const result = BurstEffectProcessor.updateVelocity(velocity, 0, 0.016, 0.1, 1.5, state);

    expect(result.gravityScale).toBeDefined();
    expect(result.emitSpark).toBeDefined();
    expect(result.spawnTrail).toBe(true); // flow has spawnTrail = true
  });

  it('should support dynamic registration of new custom effects (OCP)', () => {
    const customStrategy = {
      materialOpacity: (age, maxLife, baseOpacity) => baseOpacity * 0.5,
      updateVelocity: (velocity, index, deltaTime) => {
        velocity.set(1, 2, 3);
        return { gravityScale: 0.123, emitSpark: true };
      }
    };
    BurstEffectProcessor.registerEffect('custom-laser-burst', customStrategy);

    // Verify normalization and registry lookup
    expect(BurstEffectProcessor.normalizeEffectType('custom-laser-burst')).toBe('custom-laser-burst');

    // Verify custom opacity calculation
    expect(BurstEffectProcessor.materialOpacity('custom-laser-burst', 0.5, 1.0, 0.8)).toBeCloseTo(0.4);

    // Verify custom velocity and updates return
    const velocity = new THREE.Vector3(0, 0, 0);
    const state = BurstEffectProcessor.initialize('custom-laser-burst', 2);
    const result = BurstEffectProcessor.updateVelocity(velocity, 0, 0.016, 0.2, 1.0, state);

    expect(velocity.x).toBe(1);
    expect(velocity.y).toBe(2);
    expect(velocity.z).toBe(3);
    expect(result.gravityScale).toBe(0.123);
    expect(result.emitSpark).toBe(true);
  });

  it('should handle crossette strategy correctly', () => {
    expect(BurstEffectProcessor.normalizeEffectType('crossette')).toBe('crossette');
    const velocity = new THREE.Vector3(10, 20, 30);
    const state = BurstEffectProcessor.initialize('crossette', 5);
    const result = BurstEffectProcessor.updateVelocity(velocity, 0, 0.016, 0.2, 2.0, state);
    expect(result.spawnTrail).toBe(true);
    expect(result.trailLife).toBeDefined();
  });

  it('should process erratic dart physics correctly', () => {
    const particle = {
      velocity: new THREE.Vector3(10, 0, 0),
      erraticDartCount: 0,
      erraticDartTime: 0
    };

    // Early lifecycle (< 0.22) should not trigger erratic dart and maintain base gravity scale
    const scaleEarly = BurstEffectProcessor.processErraticDart(particle, 0.016, 0.1, 0.8);
    expect(scaleEarly).toBe(0.8);
    expect(particle.erraticDartCount).toBe(0);

    // Active lifecycle with high dart limit
    const scaleActive = BurstEffectProcessor.processErraticDart(particle, 0.1, 0.35, 0.8);
    expect(scaleActive).toBeDefined();
  });

  it('should resolve particle colors for various optical effects', () => {
    const baseColor = new THREE.Color(1, 0, 0);

    // 1. Ghost effect
    const ghostParticle = {
      baseColor,
      effectType: 'ghost'
    };
    // Early phase (< 0.40): invisible (0, 0, 0)
    const ghostEarly = BurstEffectProcessor.resolveParticleColor(ghostParticle, 0.2);
    expect(ghostEarly.r).toBe(0);
    expect(ghostEarly.g).toBe(0);
    expect(ghostEarly.b).toBe(0);

    // Mid phase (0.60): bright reveal
    const ghostMid = BurstEffectProcessor.resolveParticleColor(ghostParticle, 0.6);
    expect(ghostMid.r).toBeCloseTo(1.0);

    // 2. Color Change effect
    const ccParticle = {
      baseColor: new THREE.Color(1, 0, 0),
      color2: new THREE.Color(0, 0, 1),
      effectType: 'crysanthemum-cc'
    };
    // Early (< 0.40): baseColor
    const ccEarly = BurstEffectProcessor.resolveParticleColor(ccParticle, 0.2);
    expect(ccEarly.r).toBe(1);
    expect(ccEarly.b).toBe(0);

    // Late phase (0.70): color2
    const ccLate = BurstEffectProcessor.resolveParticleColor(ccParticle, 0.7);
    expect(ccLate.r).toBe(0);
    expect(ccLate.b).toBe(1);

    // 3. Thermal cooling standard shell: flash towards white
    const standardParticle = {
      baseColor: new THREE.Color(0.8, 0.2, 0.2),
      effectType: 'standard'
    };
    const flashColor = BurstEffectProcessor.resolveParticleColor(
      standardParticle,
      0.05,
      { profile: { thermalCooling: true } }
    );
    // Standard particle r, g, b are bleached towards white (> 1.0)
    expect(flashColor.r).toBeGreaterThan(1.0);
    expect(flashColor.b).toBeGreaterThan(0.5);

    // 4. Second burst child particle: suppresses white flash to preserve saturated color
    const childParticle = {
      baseColor: new THREE.Color(0.8, 0.2, 0.2),
      effectType: 'standard',
      isSecondBurstChild: true
    };
    const childFlashColor = BurstEffectProcessor.resolveParticleColor(
      childParticle,
      0.05,
      { profile: { thermalCooling: true } }
    );
    // Blue channel should remain dark (no white bleaching)
    expect(childFlashColor.b).toBeCloseTo(0.2 * (1.0 + (1.0 - 0.05 / 0.12) * 0.15));
    expect(childFlashColor.r).toBeLessThan(1.0);
  });
});

