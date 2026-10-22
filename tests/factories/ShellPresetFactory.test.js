import { describe, it, expect } from 'vitest';
import { ShellPresetFactory } from '../../src/factories/ShellPresetFactory.js';

describe('ShellPresetFactory', () => {
  it('should instantiate correctly and contain registries', () => {
    const factory = new ShellPresetFactory();
    expect(factory.palette).toContain('red');
    expect(factory.shapeRegistry.has('sphere')).toBe(true);
    expect(factory.effectRegistry.has('standard')).toBe(true);
  });

  it('should create valid preset by key', () => {
    const factory = new ShellPresetFactory();
    const preset = factory.createPresetByKey('crysanthemum');
    expect(preset).not.toBeNull();
    expect(preset.shellType).toBe('crysanthemum');
    expect(preset.shapeType).toBe('sphere');
    expect(preset.effectType).toBe('standard');
  });

  it('should create valid crysanthemumNested preset', () => {
    const factory = new ShellPresetFactory();
    const preset = factory.createPresetByKey('crysanthemumNested');
    expect(preset).not.toBeNull();
    expect(preset.shellType).toBe('crysanthemumNested');
    expect(preset.nestedBurst).toBe(true);
  });

  it('should create valid strobeDyingEmbers preset', () => {
    const factory = new ShellPresetFactory();
    const preset = factory.createPresetByKey('strobeDyingEmbers');
    expect(preset).not.toBeNull();
    expect(preset.shellType).toBe('strobeDyingEmbers');
    expect(preset.strobe).toBe(true);
  });

  it('should create valid ring preset', () => {
    const factory = new ShellPresetFactory();
    const preset = factory.createPresetByKey('ring');
    expect(preset).not.toBeNull();
    expect(preset.shellType).toBe('ring');
    expect(preset.shapeType).toBe('ring');
  });

  it('should return null for unknown keys', () => {
    const factory = new ShellPresetFactory();
    const preset = factory.createPresetByKey('unknown_key_123');
    expect(preset).toBeNull();
  });

  it('should generate a random preset', () => {
    const factory = new ShellPresetFactory();
    const preset = factory.randomPreset();
    expect(preset).toBeDefined();
    expect(preset).not.toBeNull();
    expect(preset.shellType).toBeDefined();
  });

  it('should validate preset and apply fallbacks', () => {
    const factory = new ShellPresetFactory();
    const invalidPreset = {
      shapeType: 'invalid_shape',
      effectType: 'invalid_effect',
      strobe: true,
      crackle: false
    };
    const validated = factory.validatePreset(invalidPreset);
    expect(validated.shapeType).toBe('sphere'); // Fallback
    expect(validated.effectType).toBe('standard'); // Fallback
    expect(validated.strobe).toBe(true);
    expect(validated.crackle).toBe(false);
    expect(validated.__contract.shapeFallback).toBe(true);
    expect(validated.__contract.effectFallback).toBe(true);
    expect(validated.__contract.warnings.length).toBe(2);
  });

  it('should create valid ghostKamuro preset', () => {
    const factory = new ShellPresetFactory();
    const preset = factory.createPresetByKey('ghostKamuro');
    expect(preset).not.toBeNull();
    expect(preset.shellType).toBe('ghostKamuro');
    expect(preset.effectType).toBe('ghost-kamuro');
    expect(preset.launchTrail).toBe(true);
  });

  it('should create valid doubleHelix preset', () => {
    const factory = new ShellPresetFactory();
    const preset = factory.createPresetByKey('doubleHelix');
    expect(preset).not.toBeNull();
    expect(preset.shellType).toBe('doubleHelix');
    expect(preset.shapeType).toBe('double-helix');
    expect(preset.effectType).toBe('double-helix');
  });

  it('should create valid weepingWillowArch preset', () => {
    const factory = new ShellPresetFactory();
    const preset = factory.createPresetByKey('weepingWillowArch');
    expect(preset).not.toBeNull();
    expect(preset.shellType).toBe('weepingWillowArch');
    expect(preset.shapeType).toBe('willow-arch');
    expect(preset.effectType).toBe('falling-comets');
    expect(preset.instantBurst).toBe(true);
  });

  it('should create valid crossette preset', () => {
    const factory = new ShellPresetFactory();
    const preset = factory.createPresetByKey('crossette');
    expect(preset).not.toBeNull();
    expect(preset.shellType).toBe('crossette');
    expect(preset.crossette).toBe(true);
  });

  it('should create valid multiNested preset with stages', () => {
    const factory = new ShellPresetFactory();
    const preset = factory.createPresetByKey('multiNested');
    expect(preset).not.toBeNull();
    expect(preset.shellType).toBe('multiNested');
    expect(preset.multiNested).toBe(true);
    expect(preset.nestingMode).toBe('concentric');
    expect(Array.isArray(preset.stages)).toBe(true);
    expect(preset.stages.length).toBe(4);
    expect(preset.stages[0].shapeType).toBe('sphere');
    expect(preset.stages[0].dynamicsType).toBe('standard');
    expect(preset.stages[0].delay).toBe(0.0);
    expect(preset.stages[3].delay).toBe(1.35);
  });

  it('should create valid sparkling_comet_branches preset', () => {
    const factory = new ShellPresetFactory();
    const preset = factory.createPresetByKey('sparkling_comet_branches');
    expect(preset).not.toBeNull();
    expect(preset.shellType).toBe('sparkling_comet_branches');
    expect(preset.shapeType).toBe('sparkling-branches');
    expect(preset.dynamicsType).toBe('sparkling-branch-comet');
    expect(preset.sparkleAtEnd).toBe(true);
    expect(preset.branchCount).toBe(5);
    expect(preset.cometsPerBranch).toBe(5);
  });

  it('should create valid crysanthemum_uniform_sphere preset', () => {
    const factory = new ShellPresetFactory();
    const preset = factory.createPresetByKey('crysanthemum_uniform_sphere');
    expect(preset).not.toBeNull();
    expect(preset.shellType).toBe('crysanthemum_uniform_sphere');
    expect(preset.shapeType).toBe('sphere_uniform');
    expect(preset.dynamicsType).toBe('crysanthemum_discrete_trail');
    expect(preset.launchTrail).toBe(true);
    expect(preset.drag).toBe(0.68);
    expect(preset.starLifeMultiplier).toBe(1.25);
  });

  it('should create valid egg_crysanthemum preset with hollow egg crust', () => {
    const factory = new ShellPresetFactory();
    const preset = factory.createPresetByKey('egg_crysanthemum');
    expect(preset).not.toBeNull();
    expect(preset.shellType).toBe('egg_crysanthemum');
    expect(preset.shapeType).toBe('egg');
    expect(preset.dynamicsType).toBe('crysanthemum-trail');
    expect(preset.launchTrail).toBe(true);
    expect(preset.hasBurstSmoke).toBe(false);
    expect(preset.noSmoke).toBe(true);
  });
});
