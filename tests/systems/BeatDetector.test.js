import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BeatDetector } from '../../src/utils/BeatDetector.js';

describe.skip('BeatDetector', () => {
  beforeEach(() => {
    global.window = global.window || {};
    
    global.window.AudioContext = vi.fn().mockImplementation(function() {
      return {
        decodeAudioData: vi.fn().mockResolvedValue({
          numberOfChannels: 1,
          length: 44100,
          sampleRate: 44100,
          getChannelData: vi.fn().mockReturnValue(new Float32Array(44100))
        })
      };
    });

    const mockOfflineContext = {
      createBufferSource: vi.fn().mockReturnValue({
        buffer: null,
        connect: vi.fn(),
        start: vi.fn()
      }),
      createBiquadFilter: vi.fn().mockReturnValue({
        type: 'lowpass',
        frequency: {
          setValueAtTime: vi.fn()
        },
        connect: vi.fn()
      }),
      destination: {},
      startRendering: vi.fn().mockResolvedValue({
        numberOfChannels: 1,
        length: 44100,
        sampleRate: 44100,
        getChannelData: vi.fn().mockImplementation(() => {
          const data = new Float32Array(44100);
          const peakSample1 = Math.round(0.5 * 44100);
          for (let i = -10; i <= 10; i++) {
            data[peakSample1 + i] = 1.0;
          }
          return data;
        })
      })
    };
    
    global.window.OfflineAudioContext = vi.fn().mockImplementation(function() {
      return mockOfflineContext;
    });
    
    global.AudioContext = global.window.AudioContext;
    global.OfflineAudioContext = global.window.OfflineAudioContext;
  });

  it('should decode audio and return detected beats', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100))
    });

    const beats = await BeatDetector.detectBeats(
      'http://example.com/audio.mp3',
      1.1
    );
    
    expect(beats).toBeInstanceOf(Array);
    expect(beats.length).toBeGreaterThan(0);
    expect(beats).toContain(0.5);
  });
});
