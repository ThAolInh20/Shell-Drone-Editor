export const renderingConfig = {
  renderer: {
    antialias: true,
    exposure: 1.0,
    maxPixelRatio: 2
  },
  post: {
    enabled: true,
    bloom: {
      enabled: true,
      strength: 0.15,
      radius: 0.2,
      threshold: 0.85
    },
    aa: {
      enabled: false,
      mode: 'fxaa'
    }
  }
};
