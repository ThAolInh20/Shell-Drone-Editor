export const renderingConfig = {
  renderer: {
    antialias: true,
    exposure: 1.08,
    maxPixelRatio: 2
  },
  post: {
    enabled: true,
    particleEdgeSoftness: 0.75,
    bloom: {
      enabled: true,
      strength: 0.24,
      radius: 0.35,
      threshold: 0.70
    },
    aa: {
      enabled: false,
      mode: 'fxaa'
    }
  },
  smoke: {
    quality: 'medium',
    density: 1.0,
    windSpeed: 1.0,
    windDirection: 25,
    unlimited: false,
    lifespanMultiplier: 1.0,
    hazeConsolidation: true,
    maxLights: 4
  },
  sky: {
    cloudCoverage: 0.55,
    cloudSpeed: 1.0,
    cloudDensity: 1.0,
    cloudScale: 1.0,
    moonDay: 15,
    moonPhase: 'full',
    moonPosition: 0.8,
    moonAltitude: 500,
    moonSize: 85
  },
  performance: {
    fpsThreshold: 70,
    minFrameCount: 40
  },
  camera: {
    mode: 'free',
    speed: 1.0
  },
  water: {
    mirrorEnabled: true,
    reflectionResolution: 'medium',
    resolutionScale: 0.5
  }
};
