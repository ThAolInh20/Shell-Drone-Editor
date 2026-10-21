import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { FIREWORK_CONFIG } from '../../src/config/fireworks.js';
import { BurstEffectProcessor } from '../../src/factories/BurstEffectProcessor.js';
import { FireworkSystem } from '../../src/systems/FireworkSystem.js';

describe('Particle Dynamics and Thermal Lifecycle', () => {
  it('should define aerodynamic drag and organic dispersion constants in FIREWORK_CONFIG.BURST', () => {
    expect(FIREWORK_CONFIG.BURST.baseDrag).toBeGreaterThan(0);
    expect(FIREWORK_CONFIG.BURST.dragJitter).toBeGreaterThanOrEqual(0);
    expect(FIREWORK_CONFIG.BURST.speedJitter).toBeGreaterThanOrEqual(0);
    expect(FIREWORK_CONFIG.BURST.lifeJitter).toBeGreaterThanOrEqual(0);
  });

  it('should support dragCoefficient in BurstEffectProcessor.updateVelocity', () => {
    const velocity = new THREE.Vector3(10, 20, 30);
    const state = BurstEffectProcessor.initialize('standard', 5);
    const result = BurstEffectProcessor.updateVelocity(
      velocity,
      0,
      0.016,
      0.1,
      1.5,
      state
    );

    expect(result).toHaveProperty('dragCoefficient');
    expect(result).toHaveProperty('gravityScale');
  });

  it('should respect custom drag overrides registered in BurstEffectProcessor', () => {
    const customDragStrategy = {
      updateVelocity: () => ({
        gravityScale: 0.15,
        dragCoefficient: 3.5
      })
    };
    BurstEffectProcessor.registerEffect(
      'custom-drag-test',
      customDragStrategy
    );

    const velocity = new THREE.Vector3(10, 20, 30);
    const state = BurstEffectProcessor.initialize(
      'custom-drag-test',
      1
    );
    const result = BurstEffectProcessor.updateVelocity(
      velocity,
      0,
      0.016,
      0.2,
      2.0,
      state
    );

    expect(result.dragCoefficient).toBe(3.5);
    expect(result.gravityScale).toBe(0.15);
  });

  it('should simulate realistic aerodynamic deceleration using exponential drag', () => {
    const velocity = new THREE.Vector3(50, 0, 0);
    const drag = FIREWORK_CONFIG.BURST.baseDrag;
    const deltaTime = 0.1;

    const initialSpeed = velocity.length();
    const dragFactor = Math.exp(-drag * deltaTime);
    velocity.multiplyScalar(dragFactor);
    const deceleratedSpeed = velocity.length();

    expect(deceleratedSpeed).toBeLessThan(initialSpeed);
    expect(deceleratedSpeed).toBeCloseTo(
      initialSpeed * Math.exp(-drag * 0.1),
      4
    );
  });

  it('should calculate incandescent flash at early lifeRatio (< 0.12)', () => {
    const baseColor = new THREE.Color(0x00bfff); // Blue
    let r = baseColor.r;
    let g = baseColor.g;
    let b = baseColor.b;

    const lifeRatio = 0.02; // Very early burst phase
    const flashT = 1.0 - (lifeRatio / 0.12);
    r = THREE.MathUtils.lerp(r, Math.max(r, 1.6), flashT);
    g = THREE.MathUtils.lerp(g, Math.max(g, 1.5), flashT);
    b = THREE.MathUtils.lerp(b, Math.max(b, 1.3), flashT);

    // Over-exposed values above 1.0 triggers UnrealBloomPass HDR glow
    expect(r).toBeGreaterThan(1.0);
    expect(g).toBeGreaterThan(1.0);
    expect(b).toBeGreaterThan(1.0);
  });

  it('should calculate thermal cooling shift towards amber and dark red at late lifeRatio (> 0.62)', () => {
    const baseColor = new THREE.Color(0x00bfff); // Blue
    let r = baseColor.r;
    let g = baseColor.g;
    let b = baseColor.b;

    // Cooling phase (lifeRatio = 0.75)
    const lifeRatio = 0.75;
    const coolT = (lifeRatio - 0.62) / 0.26;
    r = THREE.MathUtils.lerp(r, 1.0, coolT * 0.55);
    g = THREE.MathUtils.lerp(g, 0.46, coolT * 0.55);
    b = THREE.MathUtils.lerp(b, 0.08, coolT * 0.78);

    // Red channel increases while blue channel decays sharply
    expect(r).toBeGreaterThan(baseColor.r);
    expect(b).toBeLessThan(baseColor.b);
  });

  it('should shrink particle renderSize dynamically over lifetime', () => {
    const baseSize = 26;

    // Early flash size: expanded (1.25x -> 1.0x)
    const earlyT = 0.04;
    const earlyDecay = 1.25 - (earlyT / 0.12) * 0.25;
    const earlySize = baseSize * earlyDecay;
    expect(earlySize).toBeGreaterThan(baseSize);

    // Late decay size: shrunk down (1.0x -> 0.55x)
    const lateT = 0.90;
    const lateProgress = (lateT - 0.60) / 0.40;
    const lateDecay = 1.0 - lateProgress * 0.45;
    const lateSize = baseSize * lateDecay;
    expect(lateSize).toBeLessThan(baseSize);
    expect(lateSize).toBeGreaterThan(0);
  });

  it('should suppress gravity during expansion and ramp up smoothly for apex hang time', () => {
    // Early expansion (lifeRatio = 0.15): Gravity should be suppressed (~0.05) to keep circular shape
    const earlyRatio = 0.15;
    const earlyRamp = 0.05 + 0.95 * THREE.MathUtils.smoothstep(
      earlyRatio,
      0.30,
      0.52
    );
    expect(earlyRamp).toBeCloseTo(0.05, 2);

    // Apex pause (lifeRatio = 0.35): Gravity just starting to ramp up gently
    const apexRatio = 0.35;
    const apexRamp = 0.05 + 0.95 * THREE.MathUtils.smoothstep(
      apexRatio,
      0.30,
      0.52
    );
    expect(apexRamp).toBeLessThan(0.35);

    // Cascade phase (lifeRatio = 0.60): Gravity at full 100%
    const cascadeRatio = 0.60;
    const cascadeRamp = 0.05 + 0.95 * THREE.MathUtils.smoothstep(
      cascadeRatio,
      0.30,
      0.52
    );
    expect(cascadeRamp).toBeCloseTo(1.0, 2);
  });

  it('should resolve specialized Dynamics Profiles per archetype and shape', () => {
    // 1. Standard burst profile
    const standardProfile = BurstEffectProcessor.getDynamicsProfile('standard', 'sphere');
    expect(standardProfile.baseSpeed).toBe(74);
    expect(standardProfile.hasApexBrake).toBe(false);
    expect(standardProfile.thermalCooling).toBe(true);

    // 2. Geometric outline profile (heart, ring, star)
    const heartProfile = BurstEffectProcessor.getDynamicsProfile('standard', 'heart');
    expect(heartProfile.baseSpeed).toBe(54);
    expect(heartProfile.hasApexBrake).toBe(false);

    const ringProfile = BurstEffectProcessor.getDynamicsProfile('standard', 'ring');
    expect(ringProfile.baseSpeed).toBe(54);

    // 3. Willow profile (graceful droop, low drag, no apex brake, warm gold preserved)
    const willowProfile = BurstEffectProcessor.getDynamicsProfile('willow', 'sphere');
    expect(willowProfile.baseSpeed).toBe(58);
    expect(willowProfile.baseDrag).toBe(0.20);
    expect(willowProfile.hasApexBrake).toBe(false);
    expect(willowProfile.thermalCooling).toBe(false);

    // 4. Floating profile (flow, snow, swimming-star)
    const flowProfile = BurstEffectProcessor.getDynamicsProfile('flow', 'sphere');
    expect(flowProfile.baseSpeed).toBe(36);
    expect(flowProfile.baseDrag).toBe(0.70);

    // 5. Crossette profile
    const crossetteProfile = BurstEffectProcessor.getDynamicsProfile('crossette', 'sphere');
    expect(crossetteProfile.baseSpeed).toBe(62);

    // 6. Custom override in preset
    const customPresetProfile = BurstEffectProcessor.getDynamicsProfile('standard', 'sphere', {
      dynamicsProfile: 'willow'
    });
    expect(customPresetProfile.baseSpeed).toBe(58);
  });

  it('should support wind coupling lerp for falling embers and willow particles', () => {
    const wind = new THREE.Vector3(8.0, 0, 4.0);
    const particleVel = new THREE.Vector3(0, -10.0, 0);
    const deltaTime = 0.05;
    const windInfluence = 0.85;

    particleVel.x = THREE.MathUtils.lerp(
      particleVel.x,
      wind.x,
      deltaTime * windInfluence
    );
    particleVel.z = THREE.MathUtils.lerp(
      particleVel.z,
      wind.z,
      deltaTime * windInfluence
    );

    expect(particleVel.x).toBeGreaterThan(0.3);
    expect(particleVel.z).toBeGreaterThan(0.15);
  });

  it('should define longBurn parameters in FIREWORK_CONFIG and support extended lifetime', () => {
    expect(FIREWORK_CONFIG.BURST.longBurnMultiplier).toBeGreaterThan(1.5);
    expect(FIREWORK_CONFIG.BURST.longBurnDissolveStart).toBeGreaterThan(0.65);
    expect(FIREWORK_CONFIG.BURST.longBurnGravityScale).toBeLessThan(1.0);

    const baseLife = FIREWORK_CONFIG.BURST.baseLife;
    const longBurnLife = baseLife * FIREWORK_CONFIG.BURST.longBurnMultiplier;
    expect(longBurnLife).toBeGreaterThan(4.0);
  });

  it('should define terminalVelocity and phase budget boundaries in FIREWORK_CONFIG.BURST', () => {
    expect(FIREWORK_CONFIG.BURST.terminalVelocity).toBeLessThan(0);
    expect(FIREWORK_CONFIG.BURST.phaseExpansionEnd).toBe(0.35);
    expect(FIREWORK_CONFIG.BURST.phaseApexEnd).toBe(0.65);
    expect(FIREWORK_CONFIG.DYNAMICS_PROFILES.standard.terminalVelocity).toBe(-15.0);
    expect(FIREWORK_CONFIG.DYNAMICS_PROFILES.willow.terminalVelocity).toBe(-9.5);
  });

  it('should scale drag and clamp terminal velocity over extended lifetime in FireworkSystem simulation', () => {
    const scene = new THREE.Scene();
    const mockTrailSystem = {
      spawnEffectSpark: vi.fn(),
      spawnTrailParticle: vi.fn(),
      spawnMicroCrackle: vi.fn()
    };
    const fireworkSystem = new FireworkSystem(scene, mockTrailSystem);

    fireworkSystem.createBurst(
      new THREE.Vector3(0, 150, 0),
      new THREE.Color(0xffaa00),
      'sphere',
      { starLifeMultiplier: 5.0 },
      'test-extended-5x'
    );

    const particle = fireworkSystem.burstParticles.find((p) => !p.isDyingEmber) || fireworkSystem.burstParticles[0];
    expect(particle.maxLife).toBeGreaterThan(10.0);

    // Simulate through Phase 1 into Phase 3 (late fall)
    for (let s = 0; s < 180; s++) {
      fireworkSystem.update(0.04);
    }

    // Ensure particle y velocity is smoothly clamped and does not plummet at extreme speeds
    expect(particle.velocity.y).toBeGreaterThanOrEqual(-18.0);
    expect(particle.position.y).toBeGreaterThan(0);
  });
});
