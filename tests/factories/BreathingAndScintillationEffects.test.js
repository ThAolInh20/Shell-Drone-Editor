import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { BurstEffectProcessor } from '../../src/factories/BurstEffectProcessor.js';
import { BurstParticleFactory } from '../../src/factories/BurstParticleFactory.js';
import { ShellPresetFactory } from '../../src/factories/ShellPresetFactory.js';
import { TIMED_EFFECT_TAGS, PRESET_TEMPLATES } from '../../src/factories/FireworkCompositionHelper.js';
import { EFFECT_PREVIEW_METADATA, getEffectPreview, PREVIEW_CATEGORIES } from '../../src/config/effectPreviews.js';

describe('Breathing Pulse & Diamond Scintillation Active Effects', () => {
  it('should register both tags in TIMED_EFFECT_TAGS and PRESET_TEMPLATES', () => {
    expect(TIMED_EFFECT_TAGS).toContain('breathing-pulse');
    expect(TIMED_EFFECT_TAGS).toContain('diamond-scintillation');

    expect(PRESET_TEMPLATES.strobe_breathing_pulse).toBeDefined();
    expect(PRESET_TEMPLATES.strobe_breathing_pulse.effects).toContain('breathing-pulse');

    expect(PRESET_TEMPLATES.glitter_diamond_scintillation).toBeDefined();
    expect(PRESET_TEMPLATES.glitter_diamond_scintillation.effects).toContain('diamond-scintillation');
  });

  it('should resolve active effect flags in BurstParticleFactory', () => {
    const flagsBreathing = BurstParticleFactory.resolveActiveEffectFlags({
      effects: ['breathing-pulse']
    });
    expect(flagsBreathing.hasBreathingPulse).toBe(true);
    expect(flagsBreathing.hasDiamondScintillation).toBe(false);

    const flagsScintillation = BurstParticleFactory.resolveActiveEffectFlags({
      effects: ['diamond-scintillation']
    });
    expect(flagsScintillation.hasDiamondScintillation).toBe(true);
    expect(flagsScintillation.hasBreathingPulse).toBe(false);
  });

  it('should instantiate clean presets in ShellPresetFactory with no smoke', () => {
    const factory = new ShellPresetFactory();

    const pBreath = factory.createPresetByKey('strobe_breathing_pulse');
    expect(pBreath).toBeDefined();
    expect(pBreath.shellType).toBe('strobe_breathing_pulse');
    expect(pBreath.effects).toContain('breathing-pulse');
    expect(pBreath.burstSmoke).toBe(false);
    expect(pBreath.noSmoke).toBe(true);

    const pDiamond = factory.createPresetByKey('glitter_diamond_scintillation');
    expect(pDiamond).toBeDefined();
    expect(pDiamond.shellType).toBe('glitter_diamond_scintillation');
    expect(pDiamond.effects).toContain('diamond-scintillation');
    expect(pDiamond.burstSmoke).toBe(false);
    expect(pDiamond.noSmoke).toBe(true);
  });

  it('should modulate brightness smoothly with sinusoidal breathing cycle', () => {
    const baseColor = new THREE.Color(1.0, 0.4, 0.7); // Pink
    const particle = {
      baseColor,
      effects: ['breathing-pulse'],
      phase: 0,
      particleIndex: 0,
      age: 0,
      maxLife: 2.0
    };

    // Sample across a breathing wave cycle (freq = 1.35 Hz -> cycle ≈ 0.74s)
    // Peak of sin at 1/4 cycle: t ≈ 0.185s
    // Valley of sin at 3/4 cycle: t ≈ 0.555s
    particle.age = 0.185;
    const colorPeak = BurstEffectProcessor.resolveParticleColor(particle, 0.185 / 2.0);

    particle.age = 0.555;
    const colorValley = BurstEffectProcessor.resolveParticleColor(particle, 0.555 / 2.0);

    // Peak brightness should be significantly greater than valley
    const lumPeak = colorPeak.r + colorPeak.g + colorPeak.b;
    const lumValley = colorValley.r + colorValley.g + colorValley.b;

    expect(lumPeak).toBeGreaterThan(2.0); // Incandescent boost at peak
    expect(lumValley).toBeLessThan(1.2);  // Soft ember at valley
    expect(lumPeak).toBeGreaterThan(lumValley * 2.0);
  });

  it('should produce multi-chromatic jewel dispersion with diamond-scintillation', () => {
    const particleA = {
      baseColor: new THREE.Color(1, 1, 1),
      effects: ['diamond-scintillation'],
      phase: 0,
      particleIndex: 0,
      age: 0.1,
      maxLife: 2.0
    };
    const particleB = {
      baseColor: new THREE.Color(1, 1, 1),
      effects: ['diamond-scintillation'],
      phase: 0,
      particleIndex: 5,
      age: 0.1,
      maxLife: 2.0
    };

    const colorA = BurstEffectProcessor.resolveParticleColor(particleA, 0.05);
    const colorB = BurstEffectProcessor.resolveParticleColor(particleB, 0.05);

    // Different particle indices at the same timestamp should hit different jewel colors
    expect(colorA).toBeDefined();
    expect(colorB).toBeDefined();
    const isDistinctColor = (
      Math.abs(colorA.r - colorB.r) > 0.05 ||
      Math.abs(colorA.g - colorB.g) > 0.05 ||
      Math.abs(colorA.b - colorB.b) > 0.05
    );
    expect(isDistinctColor).toBe(true);
  });

  it('should declare effect preview metadata and aliases', () => {
    expect(EFFECT_PREVIEW_METADATA['breathing-pulse']).toBeDefined();
    expect(EFFECT_PREVIEW_METADATA['diamond-scintillation']).toBeDefined();

    const previewBreath = getEffectPreview('breathing-pulse', PREVIEW_CATEGORIES.OPTICAL_EFFECT);
    expect(previewBreath).toBeDefined();
    expect(previewBreath.videoUrl).toBe('previews/effects/breathing-pulse.mp4');

    const previewDiamond = getEffectPreview('diamond-scintillation', PREVIEW_CATEGORIES.OPTICAL_EFFECT);
    expect(previewDiamond).toBeDefined();
    expect(previewDiamond.videoUrl).toBe('previews/effects/diamond-scintillation.mp4');
  });
});

