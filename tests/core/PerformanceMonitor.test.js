import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PerformanceMonitor } from '../../src/core/PerformanceMonitor.js';
import { renderingConfig } from '../../src/config/rendering.js';

describe('PerformanceMonitor', () => {
  let mockElement;
  let mockBody;

  beforeEach(() => {
    mockElement = {
      style: {},
      innerHTML: ''
    };
    mockBody = {
      appendChild: vi.fn()
    };

    vi.stubGlobal('document', {
      createElement: vi.fn().mockReturnValue(mockElement),
      body: mockBody
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('should initialize correctly with overlay and default stats', () => {
    const monitor = new PerformanceMonitor();
    expect(document.createElement).toHaveBeenCalledWith('div');
    expect(mockBody.appendChild).toHaveBeenCalledWith(mockElement);
    expect(monitor.fps).toBe(0);
    expect(monitor.frameTime).toBe(0);
    expect(monitor.totalFrames).toBe(0);
    expect(monitor.fpsDropCount).toBe(0);
    expect(mockElement.innerHTML).toContain('FPS Drops: 0');
  });

  it('should increment totalFrames and update stats on update()', () => {
    const monitor = new PerformanceMonitor();
    monitor.update(0.016); // 16ms
    expect(monitor.totalFrames).toBe(1);
    expect(monitor.frameTime).toBe(16);
  });

  it('should calculate FPS and detect drops after minFrameCount', () => {
    const monitor = new PerformanceMonitor();
    
    // Set threshold configs
    renderingConfig.performance = {
      fpsThreshold: 70,
      minFrameCount: 5
    };

    // Simulate 4 updates (less than minFrameCount = 5)
    // and trigger delta accumulation > 1s
    for (let i = 0; i < 4; i++) {
      monitor.update(0.3); // 300ms each, total 1.2s
    }
    // Average FPS would be 4 / 1.2 = 3.33 FPS
    // This is below 70 FPS.
    // However, totalFrames (4) <= minFrameCount (5), so no drops should be recorded yet.
    expect(monitor.fpsDropCount).toBe(0);

    // Let's add more frames to exceed minFrameCount (5)
    // Run 5 more frames (total 9 frames) and accumulate another > 1s
    for (let i = 0; i < 5; i++) {
      monitor.update(0.25); // 250ms each, total 1.25s
    }
    // Average FPS would be 5 / 1.25 = 4 FPS
    // Since totalFrames (9) > minFrameCount (5) and 4 FPS < 70, drops should increment by 1.
    expect(monitor.fpsDropCount).toBe(1);
    expect(mockElement.innerHTML).toContain('FPS Drops: 1');
  });
});
