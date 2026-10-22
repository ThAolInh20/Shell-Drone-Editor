import { describe, it, expect } from 'vitest';
import { BurstShapeGenerator } from '../../src/factories/BurstShapeGenerator.js';

describe('BurstShapeGenerator', () => {
  it('should resolve sphere_uniform and sphere-uniform correctly', () => {
    expect(BurstShapeGenerator.resolveShape('sphere_uniform')).toBe('sphere_uniform');
    expect(BurstShapeGenerator.resolveShape('sphere-uniform')).toBe('sphere_uniform');
  });

  it('should generate unit vectors for sphere_uniform using Fibonacci distribution', () => {
    const totalCount = 100;
    const vectors = [];

    for (let i = 0; i < totalCount; i++) {
      const angle = (i / totalCount) * Math.PI * 2;
      const dir = BurstShapeGenerator.direction(
        'sphere_uniform',
        angle,
        i,
        totalCount
      );

      // Verify it is a valid 3D vector with unit length ~ 1.0
      expect(dir).toBeDefined();
      expect(dir.length()).toBeCloseTo(1.0, 3);
      vectors.push(dir);
    }

    // Verify first vector starts near top pole (y ~ 1) and last vector ends near bottom pole (y ~ -1)
    expect(vectors[0].y).toBeGreaterThan(0.9);
    expect(vectors[totalCount - 1].y).toBeLessThan(-0.9);

    // Verify equitable distribution across northern and southern hemispheres
    const northernCount = vectors.filter((v) => v.y > 0).length;
    const southernCount = vectors.filter((v) => v.y < 0).length;
    expect(Math.abs(northernCount - southernCount)).toBeLessThanOrEqual(2);
  });

  it('should resolve egg shape correctly', () => {
    expect(BurstShapeGenerator.resolveShape('egg')).toBe('egg');
  });

  it('should generate asymmetric ovoid vectors with surface thickness jitter for egg shape', () => {
    const totalCount = 120;
    const vectors = [];

    for (let i = 0; i < totalCount; i++) {
      const angle = (i / totalCount) * Math.PI * 2;
      const dir = BurstShapeGenerator.direction(
        'egg',
        angle,
        i,
        totalCount
      );

      expect(dir).toBeDefined();
      expect(Number.isFinite(dir.x)).toBe(true);
      expect(Number.isFinite(dir.y)).toBe(true);
      expect(Number.isFinite(dir.z)).toBe(true);
      vectors.push(dir);
    }

    // Top apex (i = 0) has elongation (y > 1.0)
    expect(vectors[0].y).toBeGreaterThan(1.0);
    // Bottom pole (i = totalCount - 1) is negative
    expect(vectors[totalCount - 1].y).toBeLessThan(-1.0);

    // Tapering check: top half (y > 0.5) has smaller lateral radius than bottom half (y < -0.5)
    const topPoints = vectors.filter((v) => v.y > 0.5);
    const bottomPoints = vectors.filter((v) => v.y < -0.5);

    const avgTopLateralRadius = topPoints.reduce((acc, v) => {
      return acc + Math.sqrt(v.x * v.x + v.z * v.z);
    }, 0) / topPoints.length;

    const avgBottomLateralRadius = bottomPoints.reduce((acc, v) => {
      return acc + Math.sqrt(v.x * v.x + v.z * v.z);
    }, 0) / bottomPoints.length;

    // Egg is tapered at top (narrower) and wider at bottom
    expect(avgTopLateralRadius).toBeLessThan(avgBottomLateralRadius);
  });

  it('should resolve sphere_rings and sphere-rings correctly', () => {
    expect(BurstShapeGenerator.resolveShape('sphere_rings')).toBe('sphere_rings');
    expect(BurstShapeGenerator.resolveShape('sphere-rings')).toBe('sphere_rings');
  });

  it('should generate spherical latitude rings with equidistant circular bands', () => {
    const totalCount = 150;
    const vectors = [];

    for (let i = 0; i < totalCount; i++) {
      const angle = (i / totalCount) * Math.PI * 2;
      const dir = BurstShapeGenerator.direction(
        'sphere_rings',
        angle,
        i,
        totalCount
      );

      expect(dir).toBeDefined();
      expect(Number.isFinite(dir.x)).toBe(true);
      expect(Number.isFinite(dir.y)).toBe(true);
      expect(Number.isFinite(dir.z)).toBe(true);
      expect(dir.ringIndex).toBeDefined();
      expect(dir.ringIndex).toBeGreaterThanOrEqual(0);
      expect(dir.ringIndex).toBeLessThan(5);

      // Points stay on the unit sphere shell (+/- thickness jitter)
      const len = dir.length();
      expect(len).toBeGreaterThan(0.96);
      expect(len).toBeLessThan(1.04);

      vectors.push(dir);
    }

    // Verify 5 distinct rings are populated
    const ringCounts = [0, 1, 2, 3, 4].map((k) => {
      return vectors.filter((v) => v.ringIndex === k).length;
    });

    ringCounts.forEach((cnt) => {
      expect(cnt).toBeGreaterThan(0);
    });

    // Equator (ring 2) should have more particles than extreme poles (rings 0 and 4)
    expect(ringCounts[2]).toBeGreaterThan(ringCounts[0]);
    expect(ringCounts[2]).toBeGreaterThan(ringCounts[4]);
  });
});
