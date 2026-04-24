export const demoShow = [
  // New comet sequences showcasing fan and sweep effects from a single location
  { time: 0.0, type: 'cometsequence', pattern: 'fan-sweep-continuous', count: 15, duration: 2.0, sweepCount: 2, ratioX: 0.5, sectorId: 'left', color: 0xff0000 },
  { time: 2.5, type: 'cometsequence', pattern: 'fan-burst', count: 9, duration: 0, ratioX: 0.5, sectorId: 'center' },

  // Normal firework sequences using specific presets, x1, x2, and fixed height (ratioY)
  { time: 4.0, type: 'sequence', pattern: 'sweep-left', count: 10, duration: 2.0, sectorId: 'right', preset: 'crysanthemum', color: 0x00ff00, x1: 0.2, x2: 0.8, ratioY: 0.7 },
  { time: 6.5, type: 'sequence', pattern: 'sweep-right', count: 10, duration: 2.0, sectorId: 'left', preset: 'strobe', color: 0x0000ff },
  { time: 9.5, type: 'sequence', pattern: 'converge', count: 14, duration: 3.0, preset: 'crackle' },
  { time: 13.0, type: 'sequence', pattern: 'fan', count: 15, duration: 4.0, preset: 'ring' },
  { time: 18.0, type: 'finale', totalShells: 40, duration: 5.0 }
];
