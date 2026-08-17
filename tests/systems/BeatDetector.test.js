import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BeatDetector } from '../../src/utils/BeatDetector.js';

describe('BeatDetector', () => {
  beforeEach(() => {
    global.window = global.window || {};
    
    global.window.AudioContext = vi.fn().mockImplementation(function() {
      return {
        decodeAudioData: vi.fn().mockResolvedValue({
          numberOfChannels: 1,
          length: 132300,
          sampleRate: 44100,
          getChannelData: vi.fn().mockReturnValue(new Float32Array(132300))
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
        length: 132300,
        sampleRate: 44100,
        getChannelData: vi.fn().mockImplementation(() => {
          const data = new Float32Array(132300);
          const sampleRate = 44100;
          const peakTimes = [
            0.5,
            1.0,
            1.5,
            2.0,
            2.5
          ];
          for (const time of peakTimes) {
            const peakSample = Math.round(time * sampleRate);
            for (let i = -10; i <= 10; i++) {
              if (
                peakSample + i >= 0 &&
                peakSample + i < data.length
              ) {
                data[peakSample + i] = 1.0;
              }
            }
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

  it('should decode audio and return detected beat grid', async () => {
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
    expect(beats).toContain(1.0);
    expect(beats).toContain(1.5);
    expect(beats).toContain(2.0);
    expect(beats).toContain(2.5);
  });
});
