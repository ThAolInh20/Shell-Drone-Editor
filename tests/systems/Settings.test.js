import { describe, it, expect, beforeEach } from 'vitest';
import { SETTINGS_DEFINITION, applySetting } from '../../src/config/settings.js';
import { LAUNCH_ZONE_CONFIG } from '../../src/config/launchZone.js';
import { renderingConfig } from '../../src/config/rendering.js';
import en from '../../src/config/lang/en.js';
import vi from '../../src/config/lang/vi.js';
import zh from '../../src/config/lang/zh.js';
import ja from '../../src/config/lang/ja.js';

describe('Settings Definition - firework_max_burst_y', () => {
  beforeEach(() => {
    LAUNCH_ZONE_CONFIG.maxBurstY = 300;
  });

  it('should define firework_max_burst_y with proper configuration', () => {
    const setting = SETTINGS_DEFINITION.find(
      (s) => s.key === 'firework_max_burst_y'
    );

    expect(setting).toBeDefined();
    expect(setting.type).toBe('slider');
    expect(setting.category).toBe('entities');
    expect(setting.subgroup).toBe('fireworks');
    expect(setting.min).toBe(100);
    expect(setting.max).toBe(500);
    expect(setting.step).toBe(5);
    expect(setting.default).toBe(300);
  });

  it('should update LAUNCH_ZONE_CONFIG and context fireworkSystem when applied', () => {
    const mockFireworkSystem = {
      launchZone: {
        maxBurstY: 300
      }
    };
    const context = {
      fireworkSystem: mockFireworkSystem
    };

    applySetting('firework_max_burst_y', 420, context);

    expect(LAUNCH_ZONE_CONFIG.maxBurstY).toBe(420);
    expect(mockFireworkSystem.launchZone.maxBurstY).toBe(420);
  });

  it('should provide localized labels and subgroups in all supported languages', () => {
    const langs = [
      { name: 'en', dict: en },
      { name: 'vi', dict: vi },
      { name: 'zh', dict: zh },
      { name: 'ja', dict: ja }
    ];

    for (const { name, dict } of langs) {
      expect(dict.editor.subgroup_fireworks, `Missing subgroup_fireworks in ${name}`).toBeDefined();
      expect(dict.editor.firework_max_burst_y, `Missing firework_max_burst_y in ${name}`).toBeDefined();
    }
  });
});

describe('Settings Definition - particle_edge_softness', () => {
  beforeEach(() => {
    renderingConfig.post.particleEdgeSoftness = 0.75;
  });

  it('should define particle_edge_softness with proper configuration in camera_post', () => {
    const setting = SETTINGS_DEFINITION.find(
      (s) => s.key === 'particle_edge_softness'
    );

    expect(setting).toBeDefined();
    expect(setting.type).toBe('slider');
    expect(setting.category).toBe('system');
    expect(setting.subgroup).toBe('camera_post');
    expect(setting.min).toBe(0.2);
    expect(setting.max).toBe(1.0);
    expect(setting.step).toBe(0.02);
    expect(setting.default).toBe(0.75);
  });

  it('should update renderingConfig and context fireworkSystem when applied', () => {
    let updatedVal = null;
    const mockFireworkSystem = {
      setParticleEdgeSoftness(val) {
        updatedVal = val;
      }
    };
    const context = {
      fireworkSystem: mockFireworkSystem
    };

    applySetting('particle_edge_softness', 0.88, context);

    expect(renderingConfig.post.particleEdgeSoftness).toBe(0.88);
    expect(updatedVal).toBe(0.88);
  });

  it('should update context trailSystem when applied directly if fireworkSystem is absent', () => {
    let updatedTrailVal = null;
    const mockTrailSystem = {
      setParticleEdgeSoftness(val) {
        updatedTrailVal = val;
      }
    };
    const context = {
      trailSystem: mockTrailSystem
    };

    applySetting('particle_edge_softness', 0.45, context);

    expect(renderingConfig.post.particleEdgeSoftness).toBe(0.45);
    expect(updatedTrailVal).toBe(0.45);
  });

  it('should provide localized labels in all 4 supported languages without parentheses', () => {
    const langs = [
      { name: 'en', dict: en },
      { name: 'vi', dict: vi },
      { name: 'zh', dict: zh },
      { name: 'ja', dict: ja }
    ];

    for (const { name, dict } of langs) {
      expect(
        dict.editor.particle_edge_softness,
        `Missing particle_edge_softness in ${name}`
      ).toBeDefined();

      expect(dict.editor.particle_edge_softness).not.toContain('(');
      expect(dict.editor.particle_edge_softness).not.toContain(')');
    }
  });
});

