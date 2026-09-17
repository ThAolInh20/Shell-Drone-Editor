import { renderingConfig } from './rendering.js';
import { AUDIO_CONFIG } from './audio.js';

export const SETTINGS_DEFINITION = [
  {
    key: 'exposure',
    label: 'Exposure',
    type: 'slider',
    category: 'graphics',
    min: 0.2,
    max: 2.5,
    step: 0.02,
    default: 1.08,
    apply(
      value,
      context
    ) {
      renderingConfig.renderer.exposure = value;
      if (
        context &&
        context.renderer &&
        context.renderer.instance
      ) {
        context.renderer.instance.toneMappingExposure = value;
      }
    }
  },
  {
    key: 'bloom_enabled',
    label: 'Bloom Enabled',
    type: 'checkbox',
    category: 'graphics',
    default: true,
    apply(
      value,
      context
    ) {
      renderingConfig.post.bloom.enabled = value;
      if (
        context &&
        context.postProcessing &&
        context.postProcessing.bloomPass
      ) {
        context.postProcessing.bloomPass.enabled = value;
      }
    }
  },
  {
    key: 'bloom_strength',
    label: 'Bloom Strength',
    type: 'slider',
    category: 'graphics',
    min: 0.0,
    max: 1.2,
    step: 0.02,
    default: 0.18,
    apply(
      value,
      context
    ) {
      renderingConfig.post.bloom.strength = value;
      if (
        context &&
        context.postProcessing &&
        context.postProcessing.bloomPass
      ) {
        context.postProcessing.bloomPass.strength = value;
      }
    }
  },
  {
    key: 'bloom_radius',
    label: 'Bloom Radius',
    type: 'slider',
    category: 'graphics',
    min: 0.0,
    max: 2.0,
    step: 0.05,
    default: 0.2,
    apply(
      value,
      context
    ) {
      renderingConfig.post.bloom.radius = value;
      if (
        context &&
        context.postProcessing &&
        context.postProcessing.bloomPass
      ) {
        context.postProcessing.bloomPass.radius = value;
      }
    }
  },
  {
    key: 'bloom_threshold',
    label: 'Bloom Threshold',
    type: 'slider',
    category: 'graphics',
    min: 0.0,
    max: 1.0,
    step: 0.02,
    default: 0.78,
    apply(
      value,
      context
    ) {
      renderingConfig.post.bloom.threshold = value;
      if (
        context &&
        context.postProcessing &&
        context.postProcessing.bloomPass
      ) {
        context.postProcessing.bloomPass.threshold = value;
      }
    }
  },
  {
    key: 'lake_mirror_reflection',
    label: 'Lake Mirror Reflection (Trail)',
    type: 'checkbox',
    category: 'graphics',
    default: true,
    apply(
      value,
      context
    ) {
      if (
        context &&
        context.sceneManager &&
        context.sceneManager.waterSurface
      ) {
        context.sceneManager.waterSurface.setMirrorReflection(value);
      }
    }
  },
  {
    key: 'lake_wave_distortion',
    label: 'Lake Wave Distortion',
    type: 'slider',
    category: 'graphics',
    min: 0.0,
    max: 0.08,
    step: 0.005,
    default: 0.028,
    apply(
      value,
      context
    ) {
      if (
        context &&
        context.sceneManager &&
        context.sceneManager.waterSurface
      ) {
        context.sceneManager.waterSurface.setWaveDistortion(value);
      }
    }
  },
  {
    key: 'smoke_quality',
    label: 'Smoke Quality',
    type: 'select',
    options: [
      'off',
      'low',
      'medium',
      'high'
    ],
    category: 'graphics',
    default: 'medium',
    apply(
      value,
      context
    ) {
      renderingConfig.smoke.quality = value;
      if (
        context &&
        context.smokeSystem
      ) {
        context.smokeSystem.setQuality(value);
      }
    }
  },
  {
    key: 'smoke_density',
    label: 'Smoke Density',
    type: 'slider',
    category: 'graphics',
    min: 0.1,
    max: 2.0,
    step: 0.05,
    default: 1.0,
    apply(
      value,
      context
    ) {
      renderingConfig.smoke.density = value;
      if (
        context &&
        context.smokeSystem
      ) {
        context.smokeSystem.setDensity(value);
      }
    }
  },
  {
    key: 'smoke_wind_speed',
    label: 'Smoke Wind Speed',
    type: 'slider',
    category: 'graphics',
    min: 0.0,
    max: 2.0,
    step: 0.05,
    default: 1.0,
    apply(
      value,
      context
    ) {
      renderingConfig.smoke.windSpeed = value;
      if (
        context &&
        context.smokeSystem
      ) {
        context.smokeSystem.setWindSpeed(value);
      }
    }
  },
  {
    key: 'volume_master',
    label: 'Master Volume',
    type: 'slider',
    category: 'audio',
    min: 0.0,
    max: 1.5,
    step: 0.05,
    default: 1.0,
    apply(
      value,
      context
    ) {
      AUDIO_CONFIG.volumes.master = value;
    }
  },
  {
    key: 'volume_lift',
    label: 'Lift Volume',
    type: 'slider',
    category: 'audio',
    min: 0.0,
    max: 1.5,
    step: 0.05,
    default: 0.8,
    apply(
      value,
      context
    ) {
      AUDIO_CONFIG.volumes.lift = value;
      if (
        context &&
        context.audioSystem &&
        context.audioSystem.sources &&
        context.audioSystem.sources.lift
      ) {
        context.audioSystem.sources.lift.volume = value;
      }
    }
  },
  {
    key: 'volume_burst',
    label: 'Burst Volume (Large)',
    type: 'slider',
    category: 'audio',
    min: 0.0,
    max: 1.5,
    step: 0.05,
    default: 0.9,
    apply(
      value,
      context
    ) {
      AUDIO_CONFIG.volumes.burst = value;
      if (
        context &&
        context.audioSystem &&
        context.audioSystem.sources &&
        context.audioSystem.sources.burst
      ) {
        context.audioSystem.sources.burst.volume = value;
      }
    }
  },
  {
    key: 'volume_burst_small',
    label: 'Burst Volume (Small)',
    type: 'slider',
    category: 'audio',
    min: 0.0,
    max: 1.5,
    step: 0.05,
    default: 0.4,
    apply(
      value,
      context
    ) {
      AUDIO_CONFIG.volumes.burstSmall = value;
      if (
        context &&
        context.audioSystem &&
        context.audioSystem.sources &&
        context.audioSystem.sources.burstSmall
      ) {
        context.audioSystem.sources.burstSmall.volume = value;
      }
    }
  },
  {
    key: 'volume_crackle',
    label: 'Crackle Volume',
    type: 'slider',
    category: 'audio',
    min: 0.0,
    max: 1.5,
    step: 0.05,
    default: 0.3,
    apply(
      value,
      context
    ) {
      AUDIO_CONFIG.volumes.crackle = value;
      if (
        context &&
        context.audioSystem &&
        context.audioSystem.sources &&
        context.audioSystem.sources.crackle
      ) {
        context.audioSystem.sources.crackle.volume = value;
      }
    }
  },
  {
    key: 'volume_crackle_small',
    label: 'Crackle Volume (Small)',
    type: 'slider',
    category: 'audio',
    min: 0.0,
    max: 1.5,
    step: 0.05,
    default: 0.4,
    apply(
      value,
      context
    ) {
      AUDIO_CONFIG.volumes.crackleSmall = value;
      if (
        context &&
        context.audioSystem &&
        context.audioSystem.sources &&
        context.audioSystem.sources.crackleSmall
      ) {
        context.audioSystem.sources.crackleSmall.volume = value;
      }
    }
  }
];

export function loadAndApplySettings(
  context
) {
  for (
    const setting of SETTINGS_DEFINITION
  ) {
    const savedStr = localStorage.getItem(
      `settings_${setting.key}`
    );
    let val = setting.default;
    if (
      savedStr !== null
    ) {
      if (
        setting.type === 'checkbox'
      ) {
        val = savedStr === 'true';
      } else if (
        setting.type === 'select'
      ) {
        val = savedStr;
      } else {
        val = parseFloat(
          savedStr
        );
      }
    }
    setting.apply(
      val,
      context
    );
  }
}

export function applySetting(
  key,
  value,
  context
) {
  const setting = SETTINGS_DEFINITION.find(
    (s) => s.key === key
  );
  if (
    setting
  ) {
    localStorage.setItem(
      `settings_${key}`,
      value.toString()
    );
    setting.apply(
      value,
      context
    );
  }
}

export function resetSettings(
  context
) {
  for (
    const setting of SETTINGS_DEFINITION
  ) {
    localStorage.removeItem(
      `settings_${setting.key}`
    );
    setting.apply(
      setting.default,
      context
    );
  }
}
