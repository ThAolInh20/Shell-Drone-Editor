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
});
