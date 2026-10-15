import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WaveformGenerator } from '../../src/utils/WaveformGenerator.js';

describe('WaveformGenerator', () => {
  beforeEach(() => {
    WaveformGenerator.clearCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should extract normalized peaks from an audio blob', async () => {
    const mockChannelData = new Float32Array([
      0.0,
      0.5,
      1.0,
      -0.8,
      0.2,
      -0.4,
      0.0,
      0.1
    ]);

    const mockAudioBuffer = {
      numberOfChannels: 1,
      duration: 2.0,
      length: mockChannelData.length,
      sampleRate: 4,
      getChannelData: vi.fn().mockReturnValue(mockChannelData)
    };

    class MockAudioContext {
      constructor() {
        this.decodeAudioData = vi.fn().mockResolvedValue(mockAudioBuffer);
        this.close = vi.fn().mockResolvedValue(undefined);
      }
    }

    vi.stubGlobal(
      'AudioContext',
      MockAudioContext
    );

    const mockBlob = {
      name: 'test.mp3',
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8))
    };

    const peaks = await WaveformGenerator.getPeaks(
      mockBlob,
      {
        samplesPerSecond: 2
      }
    );

    expect(peaks).toBeInstanceOf(Float32Array);
    expect(peaks.length).toBeGreaterThan(0);
    // Peak values should be within [0, 1]
    for (let i = 0; i < peaks.length; i++) {
      expect(peaks[i]).toBeGreaterThanOrEqual(0);
      expect(peaks[i]).toBeLessThanOrEqual(1.0);
    }
  });

  it('should return cached peaks on subsequent requests with same key', async () => {
    const mockChannelData = new Float32Array([0.2, 0.4]);
    const mockAudioBuffer = {
      numberOfChannels: 1,
      duration: 1.0,
      length: 2,
      sampleRate: 2,
      getChannelData: vi.fn().mockReturnValue(mockChannelData)
    };

    const decodeSpy = vi.fn().mockResolvedValue(mockAudioBuffer);
    class MockAudioContext {
      constructor() {
        this.decodeAudioData = decodeSpy;
        this.close = vi.fn().mockResolvedValue(undefined);
      }
    }

    vi.stubGlobal(
      'AudioContext',
      MockAudioContext
    );

    const mockBlob = {
      name: 'cached_song.mp3',
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(4))
    };

    const peaks1 = await WaveformGenerator.getPeaks(mockBlob);
    const peaks2 = await WaveformGenerator.getPeaks(mockBlob);

    expect(peaks1).toBe(peaks2);
    expect(decodeSpy).toHaveBeenCalledTimes(1);
  });

  it('should render waveform bars onto canvas', () => {
    const mockContext = {
      save: vi.fn(),
      restore: vi.fn(),
      scale: vi.fn(),
      clearRect: vi.fn(),
      fillRect: vi.fn()
    };

    const mockCanvas = {
      clientWidth: 200,
      clientHeight: 50,
      getContext: vi.fn().mockReturnValue(mockContext)
    };

    const peaks = new Float32Array([
      0.1,
      0.5,
      0.9,
      0.3
    ]);

    WaveformGenerator.renderWaveform(
      mockCanvas,
      peaks,
      {
        width: 200,
        height: 50,
        barWidth: 2,
        barGap: 1
      }
    );

    expect(mockContext.save).toHaveBeenCalled();
    expect(mockContext.fillRect).toHaveBeenCalled();
    expect(mockContext.restore).toHaveBeenCalled();
  });

  it('should gracefully handle empty peaks or missing canvas', () => {
    expect(() => {
      WaveformGenerator.renderWaveform(
        null,
        new Float32Array(0)
      );
    }).not.toThrow();

    const mockCanvas = {
      getContext: vi.fn().mockReturnValue(null)
    };

    expect(() => {
      WaveformGenerator.renderWaveform(
        mockCanvas,
        new Float32Array([0.5])
      );
    }).not.toThrow();
  });
});
