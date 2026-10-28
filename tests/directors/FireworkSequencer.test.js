import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FireworkSequencer } from '../../src/directors/FireworkSequencer.js';

describe('FireworkSequencer', () => {
  let mockFireworkSystem;
  let mockCometSystem;
  let sequencer;

  beforeEach(() => {
    mockFireworkSystem = {
      launchRandom: vi.fn(),
      clear: vi.fn()
    };

    mockCometSystem = {
      launchRandom: vi.fn(),
      clear: vi.fn()
    };

    sequencer = new FireworkSequencer(
      mockFireworkSystem,
      mockCometSystem
    );
  });

  it('should generate tasks for crossfire pattern in playPattern', () => {
    sequencer.playPattern('crossfire', {
      count: 4,
      duration: 2.0
    });

    expect(sequencer.activeTasks.length).toBe(4);

    const task0 = sequencer.activeTasks[0];
    const task1 = sequencer.activeTasks[1];

    expect(task0.options.angleOffset).toBeGreaterThan(0);
    expect(task1.options.angleOffset).toBeLessThan(0);
    expect(task0.timeToLaunch).toBe(0);
    expect(task1.timeToLaunch).toBeGreaterThan(0);
  });

  it('should set zero delay for all tasks in crossfire-burst pattern', () => {
    sequencer.playPattern('crossfire-burst', {
      count: 6,
      duration: 3.0
    });

    expect(sequencer.activeTasks.length).toBe(6);
    for (const task of sequencer.activeTasks) {
      expect(task.timeToLaunch).toBe(0);
    }
  });

  it('should generate symmetric wing coordinates for v-shape pattern', () => {
    sequencer.playPattern('v-shape', {
      count: 5,
      duration: 2.0
    });

    expect(sequencer.activeTasks.length).toBe(5);

    const task0 = sequencer.activeTasks[0];
    const task1 = sequencer.activeTasks[1];

    expect(task0.options.ratioX).toBeLessThanOrEqual(0.5);
    expect(task1.options.ratioX).toBeGreaterThanOrEqual(0.5);
  });

  it('should generate 3D helical coordinates for spiral-helix pattern', () => {
    sequencer.playPattern('spiral-helix', {
      count: 8,
      duration: 2.0
    });

    expect(sequencer.activeTasks.length).toBe(8);

    for (const task of sequencer.activeTasks) {
      expect(task.options.ratioX).toBeDefined();
      expect(task.options.ratioZ).toBeDefined();
      expect(task.options.ratioY).toBeDefined();
    }
  });

  it('should generate concentric coordinates for ripple pattern', () => {
    sequencer.playPattern('ripple', {
      count: 6,
      duration: 2.0
    });

    expect(sequencer.activeTasks.length).toBe(6);

    for (const task of sequencer.activeTasks) {
      expect(task.options.ratioX).toBeDefined();
      expect(task.options.ratioZ).toBeDefined();
    }
  });

  it('should handle comet sequence with crossfire and spiral-helix patterns', () => {
    sequencer.playCometSequence('crossfire', {
      count: 4,
      duration: 2.0
    });

    expect(sequencer.activeTasks.length).toBe(4);

    sequencer.update(2.5);
    expect(mockCometSystem.launchRandom).toHaveBeenCalledTimes(4);
  });

  it('should attach composition overrides to comet sequence tasks', () => {
    sequencer.playCometSequence('sweep', {
      count: 2,
      duration: 1.0,
      cometTrail: 'thick',
      shapeType: 'sphere',
      dynamicsType: 'willow',
      pistil: true,
      effects: ['ghost-flare']
    });

    expect(sequencer.activeTasks.length).toBe(2);
    const overrides = sequencer.activeTasks[0].options.effectOverrides;
    expect(overrides.launchTrail).toBe(true);
    expect(overrides.thickTrail).toBe(true);
    expect(overrides.shapeType).toBe('sphere');
    expect(overrides.dynamicsType).toBe('willow');
    expect(overrides.pistil).toBe(true);
    expect(overrides.effects).toEqual(['ghost-flare']);
  });

  it('should attach smoke launch overrides when cometTrail is smoke', () => {
    sequencer.playCometSequence('sweep', {
      count: 2,
      duration: 1.0,
      cometTrail: 'smoke'
    });

    expect(sequencer.activeTasks.length).toBe(2);
    const overrides = sequencer.activeTasks[0].options.effectOverrides;
    expect(overrides.launchTrail).toBe(false);
    expect(overrides.flightSmoke).toBe(true);
    expect(overrides.instantBurst).toBe(false);
    expect(overrides.cometTrail).toBe('smoke');
  });

  it('should generate cascade slope trajectory and forward tilt angle', () => {
    sequencer.playPattern('cascade-slope', {
      count: 6,
      duration: 2.0,
      ratioY: 0.8
    });

    expect(sequencer.activeTasks.length).toBe(6);
    const firstTask = sequencer.activeTasks[0];
    const midTask = sequencer.activeTasks[2];
    const lastTask = sequencer.activeTasks[5];

    // Left side begins with forward tilt angle
    expect(firstTask.options.angleOffset).toBeGreaterThan(0.2);
    // Middle tasks stay lower in height (cascade dip)
    expect(midTask.options.ratioY).toBeLessThan(firstTask.options.ratioY);
    // Last task swoops up higher with steeper lift angle
    expect(lastTask.options.ratioY).toBeGreaterThan(firstTask.options.ratioY);
    expect(lastTask.options.angleOffset).toBeLessThan(firstTask.options.angleOffset);
  });

  it('should generate scissor crossing trajectories in chasing-scissors pattern', () => {
    sequencer.playPattern('chasing-scissors', {
      count: 4,
      duration: 2.0
    });

    expect(sequencer.activeTasks.length).toBe(4);
    const evenTask = sequencer.activeTasks[0];
    const oddTask = sequencer.activeTasks[1];

    expect(evenTask.options.ratioX).toBeLessThan(0.5);
    expect(oddTask.options.ratioX).toBeGreaterThan(0.5);
    expect(evenTask.options.angleOffset).toBeGreaterThan(0);
    expect(oddTask.options.angleOffset).toBeLessThan(0);
  });

  it('should generate sinusoidal oscillating wave in sinusoidal-wave pattern', () => {
    sequencer.playPattern('sinusoidal-wave', {
      count: 8,
      duration: 2.0
    });

    expect(sequencer.activeTasks.length).toBe(8);
    for (const task of sequencer.activeTasks) {
      expect(task.options.ratioY).toBeDefined();
      expect(task.options.angleOffset).toBeDefined();
    }
  });

  it('should generate blooming wings in petal-bloom pattern', () => {
    sequencer.playPattern('petal-bloom', {
      count: 6,
      duration: 2.0
    });

    expect(sequencer.activeTasks.length).toBe(6);
    const evenTask = sequencer.activeTasks[0];
    const oddTask = sequencer.activeTasks[1];

    expect(evenTask.options.ratioX).toBeLessThanOrEqual(0.5);
    expect(oddTask.options.ratioX).toBeGreaterThanOrEqual(0.5);
    expect(evenTask.options.angleOffset).toBeLessThanOrEqual(0);
    expect(oddTask.options.angleOffset).toBeGreaterThanOrEqual(0);
  });

  it('should generate 3D funnel coordinates in vortex-tunnel pattern', () => {
    sequencer.playPattern('vortex-tunnel', {
      count: 6,
      duration: 2.0
    });

    expect(sequencer.activeTasks.length).toBe(6);
    const firstTask = sequencer.activeTasks[0];
    const lastTask = sequencer.activeTasks[5];

    expect(firstTask.options.ratioZ).toBeLessThan(lastTask.options.ratioZ);
  });

  it('should generate stepped altitudes in stepping-stones pattern', () => {
    sequencer.playPattern('stepping-stones', {
      count: 8,
      duration: 2.0
    });

    expect(sequencer.activeTasks.length).toBe(8);
    const firstTask = sequencer.activeTasks[0];
    const lastTask = sequencer.activeTasks[7];

    expect(firstTask.options.ratioY).toBeLessThan(lastTask.options.ratioY);
  });

  it('should scale pattern altitudes proportionally when ratioY is specified', () => {
    sequencer.playPattern('sinusoidal-wave', {
      count: 4,
      duration: 1.0,
      ratioY: 0.35
    });

    const lowTasks = [...sequencer.activeTasks];
    sequencer.activeTasks = [];

    sequencer.playPattern('sinusoidal-wave', {
      count: 4,
      duration: 1.0,
      ratioY: 0.90
    });

    const highTasks = [...sequencer.activeTasks];

    for (let i = 0; i < 4; i++) {
      expect(highTasks[i].options.ratioY).toBeGreaterThan(lowTasks[i].options.ratioY);
    }
  });

  it('should generate paired synchronous launches with 180-degree phase offset in intertwined-helix pattern', () => {
    sequencer.playPattern('intertwined-helix', {
      count: 4,
      duration: 2.0,
      ratioY: 0.8
    });

    expect(sequencer.activeTasks.length).toBe(4);

    const task0 = sequencer.activeTasks[0];
    const task1 = sequencer.activeTasks[1];
    const task2 = sequencer.activeTasks[2];
    const task3 = sequencer.activeTasks[3];

    // Pair 0 launches together at time 0
    expect(task0.timeToLaunch).toBe(0);
    expect(task1.timeToLaunch).toBe(0);
    expect(task0.options.spiral).toBeDefined();
    expect(task1.options.spiral).toBeDefined();
    expect(task0.options.spiral.phase).toBe(0);
    expect(task1.options.spiral.phase).toBeCloseTo(Math.PI, 4);

    // Pair 1 launches together at duration 2.0
    expect(task2.timeToLaunch).toBe(2.0);
    expect(task3.timeToLaunch).toBe(2.0);
    expect(task2.options.spiral.phase).toBe(0);
    expect(task3.options.spiral.phase).toBeCloseTo(Math.PI, 4);
  });

  it('should interpolate heights and angles along custom wave curve points in playPattern', () => {
    const wavePoints = [
      { x: 0.0, y: 0.3, angle: 0.25 },
      { x: 0.5, y: 0.9, angle: 0.0 },
      { x: 1.0, y: 0.3, angle: -0.25 }
    ];

    sequencer.playPattern('sweep-custom-curve', {
      count: 3,
      duration: 2.0,
      wavePoints
    });

    expect(sequencer.activeTasks.length).toBe(3);

    const task0 = sequencer.activeTasks[0];
    const task1 = sequencer.activeTasks[1];
    const task2 = sequencer.activeTasks[2];

    expect(task0.options.ratioY).toBeCloseTo(0.3, 2);
    expect(task0.options.angleOffset).toBeCloseTo(0.25, 2);

    expect(task1.options.ratioY).toBeCloseTo(0.9, 2);
    expect(task1.options.angleOffset).toBeCloseTo(0.0, 2);

    expect(task2.options.ratioY).toBeCloseTo(0.3, 2);
    expect(task2.options.angleOffset).toBeCloseTo(-0.25, 2);
  });

  it('should apply custom wave curve points to comet sequences', () => {
    const wavePoints = [
      { x: 0.0, y: 0.4, angle: 0.1 },
      { x: 1.0, y: 0.8, angle: -0.1 }
    ];

    sequencer.playCometSequence('sweep-custom-curve', {
      count: 2,
      duration: 1.0,
      wavePoints
    });

    expect(sequencer.activeTasks.length).toBe(2);

    const task0 = sequencer.activeTasks[0];
    const task1 = sequencer.activeTasks[1];

    expect(task0.options.ratioY).toBeCloseTo(0.4, 2);
    expect(task0.options.angleOffset).toBeCloseTo(0.1, 2);

    expect(task1.options.ratioY).toBeCloseTo(0.8, 2);
    expect(task1.options.angleOffset).toBeCloseTo(-0.1, 2);
  });

  it('should forward starLifeMultiplier to task effectOverrides in playPattern', () => {
    sequencer.playPattern('sweep-left', {
      count: 3,
      duration: 1.0,
      starLifeMultiplier: 5.0
    });

    expect(sequencer.activeTasks.length).toBe(3);
    for (const task of sequencer.activeTasks) {
      expect(task.options.effectOverrides).toBeDefined();
      expect(task.options.effectOverrides.starLifeMultiplier).toBe(5.0);
    }
  });

  it('should forward starLifeMultiplier to task effectOverrides in playCometSequence', () => {
    sequencer.playCometSequence('sweep-left', {
      count: 2,
      duration: 1.0,
      starLifeMultiplier: 4.5
    });

    expect(sequencer.activeTasks.length).toBe(2);
    for (const task of sequencer.activeTasks) {
      expect(task.options.effectOverrides).toBeDefined();
      expect(task.options.effectOverrides.starLifeMultiplier).toBe(4.5);
    }
  });

  it('should forward burst-smoke and optical active effect flags to effectOverrides in playPattern', () => {
    sequencer.playPattern('sweep-left', {
      count: 2,
      duration: 1.0,
      'burst-smoke': true,
      ghost: true,
      crossette: true
    });

    expect(sequencer.activeTasks.length).toBe(2);
    for (const task of sequencer.activeTasks) {
      expect(task.options.effectOverrides).toBeDefined();
      expect(task.options.effectOverrides['burst-smoke']).toBe(true);
      expect(task.options.effectOverrides.ghost).toBe(true);
      expect(task.options.effectOverrides.crossette).toBe(true);
    }
  });
});

