import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WAVE_POINTS,
  evaluateWaveCurve,
  sanitizeWavePoints
} from '../../src/utils/SplineMath.js';

describe('SplineMath', () => {
  it('falls back to default points when given empty or null array', () => {
    const points = sanitizeWavePoints(null);
    expect(points.length).toBe(3);
    expect(points[0].x).toBe(0.0);
    expect(points[points.length - 1].x).toBe(1.0);
  });

  it('clamps points and guarantees sorted X order from 0 to 1', () => {
    const input = [
      { x: 0.8, y: 1.5, angle: 0.1 },
      { x: 0.2, y: -0.5, angle: -0.2 }
    ];
    const sanitized = sanitizeWavePoints(input);
    expect(sanitized[0].x).toBe(0.0);
    expect(sanitized.at(-1).x).toBe(1.0);
    for (let i = 1; i < sanitized.length; i++) {
      expect(sanitized[i].x).toBeGreaterThanOrEqual(sanitized[i - 1].x);
      expect(sanitized[i].y).toBeGreaterThanOrEqual(0.05);
      expect(sanitized[i].y).toBeLessThanOrEqual(1.0);
    }
  });

  it('smoothly interpolates height Y and angle across parameter t in [0, 1]', () => {
    const points = [
      { x: 0.0, y: 0.2, angle: 0.3 },
      { x: 0.5, y: 0.9, angle: 0.0 },
      { x: 1.0, y: 0.2, angle: -0.3 }
    ];

    const atStart = evaluateWaveCurve(points, 0.0);
    expect(atStart.x).toBe(0.0);
    expect(atStart.y).toBeCloseTo(0.2, 2);
    expect(atStart.angle).toBeCloseTo(0.3, 2);

    const atPeak = evaluateWaveCurve(points, 0.5);
    expect(atPeak.x).toBe(0.5);
    expect(atPeak.y).toBeCloseTo(0.9, 2);
    expect(atPeak.angle).toBeCloseTo(0.0, 2);

    const atEnd = evaluateWaveCurve(points, 1.0);
    expect(atEnd.x).toBe(1.0);
    expect(atEnd.y).toBeCloseTo(0.2, 2);
    expect(atEnd.angle).toBeCloseTo(-0.3, 2);

    // Continuous and bounded intermediate points
    for (let t = 0.05; t < 1.0; t += 0.05) {
      const res = evaluateWaveCurve(points, t);
      expect(res.y).toBeGreaterThanOrEqual(0.05);
      expect(res.y).toBeLessThanOrEqual(1.0);
    }
  });
});
