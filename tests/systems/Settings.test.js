import { describe, it, expect, beforeEach } from 'vitest';
import { SETTINGS_DEFINITION, applySetting } from '../../src/config/settings.js';
import { LAUNCH_ZONE_CONFIG } from '../../src/config/launchZone.js';
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
