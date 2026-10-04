import { renderingConfig } from './rendering.js';
import { AUDIO_CONFIG } from './audio.js';

export const SETTINGS_DEFINITION = [
  {
    key: 'auto_save_enabled',
    label: 'Auto-Save Direct',
    type: 'checkbox',
    category: 'general',
    subgroup: 'editor_storage',
    default: true,
    apply(
      value,
      context
    ) {
      if (
        context &&
        context.timelineEditor &&
        typeof context.timelineEditor.setAutoSave === 'function'
      ) {
        context.timelineEditor.setAutoSave(value);
      }
    }
  },
  {
    key: 'exposure',
    label: 'Exposure',
    type: 'slider',
    category: 'graphics',
    subgroup: 'camera_post',
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
    key: 'camera_mode',
    label: 'Camera Perspective Mode',
    type: 'select',
    category: 'graphics',
    subgroup: 'camera_post',
    options: [
      'free',
      'boat',
      'birds_eye'
    ],
    default: 'free',
    apply(
      value,
      context
    ) {
      renderingConfig.camera.mode = value;
      if (
        context &&
        context.cameraManager
      ) {
        context.cameraManager.setMode(value);
      }
    }
  },
  {
    key: 'camera_speed',
    label: 'Camera Movement Speed',
    type: 'slider',
    category: 'graphics',
    subgroup: 'camera_post',
    min: 0.2,
    max: 3.0,
    step: 0.1,
    default: 1.0,
    apply(
      value,
      context
    ) {
      renderingConfig.camera.speed = value;
      if (
        context &&
        context.cameraManager
      ) {
        context.cameraManager.setSpeedMultiplier(value);
      }
      if (
        context &&
        context.movementSystem
      ) {
        context.movementSystem.setSpeedMultiplier(value);
      }
    }
  },
  {
    key: 'bloom_enabled',
    label: 'Bloom Enabled',
    type: 'checkbox',
    category: 'graphics',
    subgroup: 'camera_post',
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
    subgroup: 'camera_post',
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
    subgroup: 'camera_post',
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
    subgroup: 'camera_post',
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
    label: 'Lake Mirror Reflection',
    type: 'checkbox',
    category: 'graphics',
    subgroup: 'water',
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
    subgroup: 'water',
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
    key: 'river_lanterns_enabled',
    label: 'Floating Lanterns',
    type: 'checkbox',
    category: 'graphics',
    subgroup: 'river_props',
    default: true,
    apply(
      value,
      context
    ) {
      if (
        context &&
        context.sceneManager &&
        context.sceneManager.riverProps
      ) {
        context.sceneManager.riverProps.setLanternsEnabled(value);
      }
    }
  },
  {
    key: 'river_lanterns_count',
    label: 'Lanterns Count',
    type: 'slider',
    category: 'graphics',
    subgroup: 'river_props',
    min: 10,
    max: 200,
    step: 5,
    default: 60,
    apply(
      value,
      context
    ) {
      if (
        context &&
        context.sceneManager &&
        context.sceneManager.riverProps
      ) {
        context.sceneManager.riverProps.setLanternsCount(value);
      }
    }
  },
  {
    key: 'river_boats_enabled',
    label: 'River Boats',
    type: 'checkbox',
    category: 'graphics',
    subgroup: 'river_props',
    default: true,
    apply(
      value,
      context
    ) {
      if (
        context &&
        context.sceneManager &&
        context.sceneManager.riverProps
      ) {
        context.sceneManager.riverProps.setBoatsEnabled(value);
      }
    }
  },
  {
    key: 'river_drift_speed',
    label: 'River Drift Speed',
    type: 'slider',
    category: 'graphics',
    subgroup: 'river_props',
    min: 0.1,
    max: 3.0,
    step: 0.1,
    default: 1.0,
    apply(
      value,
      context
    ) {
      if (
        context &&
        context.sceneManager &&
        context.sceneManager.riverProps
      ) {
        context.sceneManager.riverProps.setDriftSpeed(value);
      }
    }
  },
  {
    key: 'sky_moon_day',
    label: 'Lunar Cycle Day',
    type: 'slider',
    category: 'graphics',
    subgroup: 'sky',
    min: 1,
    max: 30,
    step: 1,
    default: 15,
    apply(
      value,
      context
    ) {
      renderingConfig.sky.moonDay = value;
      if (
        context &&
        context.sceneManager &&
        typeof context.sceneManager.setMoonDay === 'function'
      ) {
        context.sceneManager.setMoonDay(value);
      }
    }
  },
  {
    key: 'sky_moon_position',
    label: 'Moon Position',
    type: 'slider',
    category: 'graphics',
    subgroup: 'sky',
    min: -1.0,
    max: 1.0,
    step: 0.05,
    default: 0.8,
    apply(
      value,
      context
    ) {
      renderingConfig.sky.moonPosition = value;
      if (
        context &&
        context.sceneManager &&
        typeof context.sceneManager.setMoonPosition === 'function'
      ) {
        context.sceneManager.setMoonPosition(value);
      }
    }
  },
  {
    key: 'sky_moon_altitude',
    label: 'Moon Altitude',
    type: 'slider',
    category: 'graphics',
    subgroup: 'sky',
    min: 150,
    max: 850,
    step: 10,
    default: 500,
    apply(
      value,
      context
    ) {
      renderingConfig.sky.moonAltitude = value;
      if (
        context &&
        context.sceneManager &&
        typeof context.sceneManager.setMoonAltitude === 'function'
      ) {
        context.sceneManager.setMoonAltitude(value);
      }
    }
  },
  {
    key: 'sky_cloud_coverage',
    label: 'Night Cloud Coverage',
    type: 'slider',
    category: 'graphics',
    subgroup: 'sky',
    min: 0.0,
    max: 1.0,
    step: 0.05,
    default: 0.55,
    apply(
      value,
      context
    ) {
      renderingConfig.sky.cloudCoverage = value;
      if (
        context &&
        context.sceneManager &&
        context.sceneManager.skyDome
      ) {
        context.sceneManager.skyDome.setCloudCoverage(value);
      }
    }
  },
  {
    key: 'sky_cloud_speed',
    label: 'Cloud Movement Speed',
    type: 'slider',
    category: 'graphics',
    subgroup: 'sky',
    min: 0.0,
    max: 3.0,
    step: 0.1,
    default: 1.0,
    apply(
      value,
      context
    ) {
      renderingConfig.sky.cloudSpeed = value;
      if (
        context &&
        context.sceneManager &&
        context.sceneManager.skyDome
      ) {
        context.sceneManager.skyDome.setCloudSpeed(value);
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
    subgroup: 'smoke',
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
    subgroup: 'smoke',
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
    subgroup: 'smoke',
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
    key: 'smoke_unlimited',
    label: 'Cinematic Smoke Unlimited',
    type: 'checkbox',
    category: 'graphics',
    subgroup: 'smoke',
    default: false,
    apply(
      value,
      context
    ) {
      renderingConfig.smoke.unlimited = value;
      if (
        context &&
        context.smokeSystem
      ) {
        context.smokeSystem.setUnlimited(value);
      }
    }
  },
  {
    key: 'smoke_lifespan',
    label: 'Smoke Lifespan',
    type: 'slider',
    category: 'graphics',
    subgroup: 'smoke',
    min: 1.0,
    max: 5.0,
    step: 0.25,
    default: 1.0,
    apply(
      value,
      context
    ) {
      renderingConfig.smoke.lifespanMultiplier = value;
      if (
        context &&
        context.smokeSystem
      ) {
        context.smokeSystem.setLifespanMultiplier(value);
      }
    }
  },
  {
    key: 'volume_master',
    label: 'Master Volume',
    type: 'slider',
    category: 'audio',
    subgroup: 'audio_master',
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
    subgroup: 'audio_burst',
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
    label: 'Burst Volume Large',
    type: 'slider',
    category: 'audio',
    subgroup: 'audio_burst',
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
    label: 'Burst Volume Small',
    type: 'slider',
    category: 'audio',
    subgroup: 'audio_burst',
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
    subgroup: 'audio_effects',
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
    label: 'Crackle Volume Small',
    type: 'slider',
    category: 'audio',
    subgroup: 'audio_effects',
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
