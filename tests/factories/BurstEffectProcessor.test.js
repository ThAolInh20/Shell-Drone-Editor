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
});
