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
});
