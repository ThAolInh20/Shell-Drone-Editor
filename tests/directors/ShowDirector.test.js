import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ShowDirector } from '../../src/directors/ShowDirector.js';

describe('ShowDirector', () => {
  let mockSequencer;
  let mockFireworkSystem;
  let director;

  beforeEach(() => {
    // Mock audio global class
    global.Audio = class {
      constructor(url) {
        this.src = url;
        this.volume = 1.0;
        this.currentTime = 0;
        this.paused = true;
      }
      play() {
        this.paused = false;
        return Promise.resolve();
      }
      pause() {
        this.paused = true;
      }
    };

    mockSequencer = {
      clear: vi.fn(),
      playPattern: vi.fn(),
      playCometSequence: vi.fn(),
      playFinale: vi.fn(),
      cometSystem: {
        clear: vi.fn(),
        launchRandom: vi.fn()
      }
    };

    mockFireworkSystem = {
      clear: vi.fn(),
      launchRandom: vi.fn()
    };

    director = new ShowDirector(mockSequencer, mockFireworkSystem);
  });

  it('should load script and sort events by time', () => {
    const script = [
      { time: 5.0, type: 'single', preset: 'crysanthemum' },
      { time: 1.0, type: 'audio', url: 'sound.mp3' },
      { time: 3.0, type: 'sequence', pattern: 'sweep-left' }
    ];

    director.loadScript(script);

    expect(director.scriptConfig[0].time).toBe(1.0);
    expect(director.scriptConfig[1].time).toBe(3.0);
    expect(director.scriptConfig[2].time).toBe(5.0);
    expect(director.events.length).toBe(3);
    expect(mockSequencer.clear).toHaveBeenCalled();
  });

  it('should toggle playing state with play, pause and stop', () => {
    expect(director.isPlaying).toBe(false);
    
    director.play();
    expect(director.isPlaying).toBe(true);

    director.pause();
    expect(director.isPlaying).toBe(false);

    director.play();
    director.stop();
    expect(director.isPlaying).toBe(false);
    expect(director.elapsedTime).toBe(0);
  });

  it('should filter events and sync audio on seek', () => {
    const script = [
      { time: 1.0, type: 'audio', url: 'sound.mp3', duration: 10 },
      { time: 3.0, type: 'single', preset: 'crysanthemum' },
      { time: 5.0, type: 'single', preset: 'ring' }
    ];

    director.loadScript(script);
    director.seek(4.0);

    expect(director.elapsedTime).toBe(4.0);
    expect(director.events.length).toBe(1); // Only the 5.0s event left
    expect(director.events[0].preset).toBe('ring');
    expect(mockFireworkSystem.clear).toHaveBeenCalled();
  });

  it('should execute events during update loop', () => {
    const script = [
      { time: 1.0, type: 'single', preset: 'crysanthemum', ratioX: 0.1, ratioY: 0.2 },
      { time: 2.0, type: 'sequence', pattern: 'sweep-left', count: 5 }
    ];

    director.loadScript(script);
    director.play();

    // Update by 1.5 seconds, triggering first event
    director.update(1.5);
    expect(director.elapsedTime).toBe(1.5);
    expect(mockFireworkSystem.launchRandom).toHaveBeenCalledWith('crysanthemum', {
      ratioX: 0.1,
      ratioY: 0.2,
      ratioZ: undefined,
      sectorId: undefined,
      color: undefined,
      effectOverrides: undefined
    });
    expect(director.events.length).toBe(1); // 2.0s event left

    // Update by 1.0 seconds, triggering second event
    director.update(1.0);
    expect(director.elapsedTime).toBe(2.5);
    expect(mockSequencer.playPattern).toHaveBeenCalledWith('sweep-left', expect.any(Object));
    expect(director.events.length).toBe(0);
  });

  it('should support dynamic registration of new event handlers (OCP)', () => {
    const customHandler = vi.fn();
    director.dispatcher.register('laser', customHandler);

    const script = [
      { time: 1.0, type: 'laser', intensity: 0.8 }
    ];

    director.loadScript(script);
    director.play();
    director.update(1.5);

    expect(customHandler).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'laser', intensity: 0.8 }),
      expect.objectContaining({ sequencer: mockSequencer, fireworkSystem: mockFireworkSystem })
    );
  });
});
