export const renderingConfig = {
  renderer: {
    antialias: true,
    exposure: 1.08,
    maxPixelRatio: 2
  },
  post: {
    enabled: true,
    bloom: {
      enabled: true,
      strength: 0.18,
      radius: 0.2,
      threshold: 0.78
    },
    aa: {
      enabled: false,
      mode: 'fxaa'
    }
  },
  smoke: {
    quality: 'medium',
    density: 1.0,
    windSpeed: 1.0
  },
  performance: {
    fpsThreshold: 70,
    minFrameCount: 40
  }
};
