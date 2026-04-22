export const renderingConfig = {
  renderer: {
    antialias: false,
    exposure: 1.0,
    maxPixelRatio: 2
  },
  post: {
    enabled: true,
    bloom: {
      enabled: true,
      strength: 0.35,
      radius: 0.2,
      threshold: 0.78
    },
    aa: {
      enabled: true,
      mode: 'fxaa'
    }
  }
};
