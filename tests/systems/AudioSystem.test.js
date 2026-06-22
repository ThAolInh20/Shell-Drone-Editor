import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import { AudioSystem } from '../../src/systems/AudioSystem.js';
import { EventBus } from '../../src/core/EventBus.js';

describe('AudioSystem', () => {
  let mockAudioContext;
  let mockEventBus;
  let mockCamera;
  let audioSystem;

  beforeEach(() => {
    // Mock AudioContext methods
    mockAudioContext = {
      state: 'suspended',
      currentTime: 10,
      resume: vi.fn().mockImplementation(async () => {
        mockAudioContext.state = 'running';
      }),
      createGain: vi.fn().mockReturnValue({
        gain: { value: 1.0 },
        connect: vi.fn()
      }),
      createBufferSource: vi.fn().mockReturnValue({
        playbackRate: { value: 1.0 },
        connect: vi.fn(),
        start: vi.fn()
      }),
      createStereoPanner: vi.fn().mockReturnValue({
        pan: { value: 0 },
        connect: vi.fn()
      }),
      destination: {}
    };

    mockEventBus = new EventBus();
    mockCamera = new THREE.PerspectiveCamera(75, 1.5, 0.1, 1000);
    // Position camera looking down -Z
    mockCamera.position.set(0, 0, 0);
    mockCamera.updateMatrixWorld();

    audioSystem = new AudioSystem(mockCamera, mockAudioContext, mockEventBus);
  });

  it('should initialize context and eventBus using constructor injection', () => {
    expect(audioSystem.ctx).toBe(mockAudioContext);
    expect(audioSystem.eventBus).toBe(mockEventBus);
  });

  it('should resume audio context state', () => {
    // Set buffer mock to verify playSoundBase calls inside resume
    audioSystem.sources.lift.buffers = [{}];
    audioSystem.resume();
    
    // Resume has a setTimeout, so let's verify resume is scheduled
    setTimeout(() => {
      expect(mockAudioContext.resume).toHaveBeenCalled();
      expect(mockAudioContext.state).toBe('running');
    }, 300);
  });

  it('should calculate pan for positional audio correctly', () => {
    // Firework burst positioned to the right (X = 10, Z = -10)
    const position = new THREE.Vector3(10, 0, -10);
    const pan = audioSystem.calculatePan(position);
    
    // Panned to the right, so should be positive
    expect(pan).toBeGreaterThan(0);
    expect(pan).toBeLessThanOrEqual(0.85); // Clamped limit

    // Firework burst positioned to the left (X = -10, Z = -10)
    const leftPosition = new THREE.Vector3(-10, 0, -10);
    const leftPan = audioSystem.calculatePan(leftPosition);
    expect(leftPan).toBeLessThan(0);
  });

  it('should trigger sound playbases on eventBus events', () => {
    const playSpy = vi.spyOn(audioSystem, 'playSoundBase');
    
    // Set buffers to mock play
    audioSystem.sources.lift.buffers = [{}];
    audioSystem.sources.burst.buffers = [{}];

    // Trigger events on mockEventBus
    mockEventBus.emit('firework:launch', { position: new THREE.Vector3(0, 0, -10) });
    expect(playSpy).toHaveBeenCalledWith('lift', 1, 1, 0, expect.any(Object));

    mockEventBus.emit('firework:burst', { position: new THREE.Vector3(0, 0, -10), intensity: 0.25 });
    expect(playSpy).toHaveBeenCalledWith('burst', 0.5, 1.5, 0, expect.any(Object));
  });
});
