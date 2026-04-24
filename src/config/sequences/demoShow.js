export const demoShow = [
  { time: 0.0, type: 'single', preset: { type: 'comet_cluster', particleCountMultiplier: 1.5 }, ratioX: 0.2 },
  { time: 0.8, type: 'single', preset: { type: 'comet_cluster', particleCountMultiplier: 1.5 }, ratioX: 0.5 },
  { time: 1.6, type: 'single', preset: { type: 'comet_cluster', particleCountMultiplier: 1.5 }, ratioX: 0.8 },
  { time: 3.0, type: 'sequence', pattern: 'sweep-left', count: 10, duration: 2.0 },
  { time: 5.0, type: 'sequence', pattern: 'sweep-right', count: 10, duration: 2.0 },
  { time: 8.0, type: 'sequence', pattern: 'converge', count: 14, duration: 3.0 },
  { time: 12.0, type: 'sequence', pattern: 'fan', count: 15, duration: 4.0 },
  { time: 17.0, type: 'finale', totalShells: 40, duration: 5.0 }
];
