export const demoShow = [
  { time: 0.0, type: 'single', preset: null, ratioX: 0.5 },
  { time: 2.0, type: 'sequence', pattern: 'sweep-left', count: 10, duration: 2.0 },
  { time: 5.0, type: 'sequence', pattern: 'sweep-right', count: 10, duration: 2.0 },
  { time: 8.0, type: 'sequence', pattern: 'converge', count: 14, duration: 3.0 },
  { time: 12.0, type: 'sequence', pattern: 'fan', count: 15, duration: 4.0 },
  { time: 17.0, type: 'finale', totalShells: 40, duration: 5.0 }
];
