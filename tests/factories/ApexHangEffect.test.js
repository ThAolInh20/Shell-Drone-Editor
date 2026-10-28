import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { BurstParticleFactory } from '../../src/factories/BurstParticleFactory.js';
import { BurstEffectProcessor } from '../../src/factories/BurstEffectProcessor.js';
import { AVAILABLE_EFFECT_TAGS } from '../../src/factories/FireworkCompositionHelper.js';
import { FIREWORK_CONFIG } from '../../src/config/fireworks.js';

describe('Apex Hang Active Effect', () => {
  it('is registered in centralized taxonomy and supported effects', () => {
    expect(AVAILABLE_EFFECT_TAGS).toContain('apex-hang');
    expect(BurstEffectProcessor.SUPPORTED_EFFECTS.has('apex-hang')).toBe(true);
  });

  it('correctly resolves isApexHang flag from effect tag array or preset property', () => {
    const flagsFromTag = BurstParticleFactory.resolveActiveEffectFlags({
      effects: ['apex-hang', 'strobe']
    });
    expect(flagsFromTag.isApexHang).toBe(true);

    const flagsFromPreset = BurstParticleFactory.resolveActiveEffectFlags({
      preset: { apexHang: true }
    });
    expect(flagsFromPreset.isApexHang).toBe(true);

    const flagsDefault = BurstParticleFactory.resolveActiveEffectFlags({
      effects: ['strobe']
    });
    expect(flagsDefault.isApexHang).toBe(false);
  });

  it('creates particle with isApexHang property initialized with ejection direction', () => {
    const p = BurstParticleFactory.createParticle({
      position: new THREE.Vector3(0, 50, 0),
      velocity: new THREE.Vector3(10, 20, 10),
      color: new THREE.Color('#ffaa00'),
      isApexHang: true
    });
    expect(p.isApexHang).toBe(true);
    expect(p.initialSpeed).toBeCloseTo(new THREE.Vector3(10, 20, 10).length(), 4);
    expect(p.ejectionDir).toBeDefined();
    expect(p.ejectionDir.length()).toBeCloseTo(1.0, 4);
  });

  it('governs gravity strictly based on velocity ratio when initial speed is tracked', () => {
    const initialVel = new THREE.Vector3(60, 0, 0);
    const initialSpeed = initialVel.length();
    const strategy = BurstEffectProcessor.effectsRegistry.get('apex-hang');
    const effectState = { initialSpeeds: [initialSpeed] };

    // High velocity (v = 50m/s > threshold of 0.18 * 60 = 10.8): zero gravity
    const highVel = initialVel.clone().multiplyScalar(50 / 60);
    const highRes = strategy.updateVelocity(
      highVel,
      0,
      0.016,
      0.2,
      2.5,
      effectState
    );
    expect(highRes.gravityScale).toBe(0.0);

    // Near-zero velocity (v = 2m/s < threshold): gravity activates towards 1.0
    const stoppedVel = initialVel.clone().multiplyScalar(2 / 60);
    const stoppedRes = strategy.updateVelocity(
      stoppedVel,
      0,
      0.016,
      0.8,
      2.5,
      effectState
    );
    expect(stoppedRes.gravityScale).toBeGreaterThan(0.7);
  });

  it('decelerates smoothly and locks gravity during the apex window', () => {
    const velocity = new THREE.Vector3(50, 20, 30);
    const maxLife = 2.5;
    const hangStart = FIREWORK_CONFIG.BURST?.apexHangStart ?? 0.28;
    const hangEnd = FIREWORK_CONFIG.BURST?.apexHangEnd ?? 0.48;

    // 1. Initial burst phase (t < hangStart): zero gravity, full velocity
    const earlyAge = maxLife * (hangStart * 0.5);
    const earlyStrategy = BurstEffectProcessor.effectsRegistry.get('apex-hang');
    const earlyRes = earlyStrategy.updateVelocity(
      velocity.clone(),
      0,
      0.016,
      earlyAge,
      maxLife
    );
    expect(earlyRes.gravityScale).toBe(0.0);

    // 2. Apex hang window (hangStart <= t <= hangEnd): speed damped strongly, zero gravity
    const midAge = maxLife * ((hangStart + hangEnd) * 0.5);
    const testVel = velocity.clone();
    const initialSpeed = testVel.length();
    const hangRes = earlyStrategy.updateVelocity(
      testVel,
      0,
      0.033,
      midAge,
      maxLife
    );
    expect(hangRes.gravityScale).toBe(0.0);
    expect(testVel.length()).toBeLessThan(initialSpeed);

    // 3. Fall phase (t > hangEnd): gravity smoothly ramps back up
    const lateAge = maxLife * 0.85;
    const lateRes = earlyStrategy.updateVelocity(
      velocity.clone(),
      0,
      0.016,
      lateAge,
      maxLife
    );
    expect(lateRes.gravityScale).toBeGreaterThan(0.5);
  });

  it('provides an apexSpeedMultiplier in FIREWORK_CONFIG.BURST for rhythmic expansion', () => {
    expect(FIREWORK_CONFIG.BURST.apexSpeedMultiplier).toBe(1.35);
  });
});
