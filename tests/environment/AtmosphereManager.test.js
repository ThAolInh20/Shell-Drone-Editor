import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { AtmosphereManager } from '../../src/environment/AtmosphereManager.js';
import { globalEventBus } from '../../src/core/EventBus.js';

describe('AtmosphereManager', () => {
  let atmosphere;

  beforeEach(() => {
    atmosphere = new AtmosphereManager({
      windSpeed: 1.0,
      windDirection: 0,
      turbulenceStrength: 0.2
    });
  });

  afterEach(() => {
    if (atmosphere) {
      atmosphere.destroy();
    }
  });

  it('should initialize with correct default wind vectors', () => {
    // 0 degrees should blow along +X axis
    expect(atmosphere.windDirection).toBe(0);
    expect(atmosphere.baseWind.x).toBeCloseTo(6.04, 1);
    expect(atmosphere.baseWind.z).toBeCloseTo(0.0, 1);
    expect(atmosphere.currentWind.x).toBeCloseTo(6.04, 1);
  });

  it('should update wind vector when direction or speed changes', () => {
    // Change direction to 90 degrees (+Z axis)
    atmosphere.setWindDirection(90);
    expect(atmosphere.currentWind.x).toBeCloseTo(0.0, 1);
    expect(atmosphere.currentWind.z).toBeCloseTo(6.04, 1);

    // Double wind speed
    atmosphere.setWindSpeed(2.0);
    expect(atmosphere.currentWind.z).toBeCloseTo(12.08, 1);
  });

  it('should respond to global event bus wind events', () => {
    globalEventBus.emit('wind:direction', 180);
    expect(atmosphere.windDirection).toBe(180);
    expect(atmosphere.currentWind.x).toBeCloseTo(-6.04, 1);

    globalEventBus.emit('wind:speed', 0.5);
    expect(atmosphere.windSpeed).toBe(0.5);
    expect(atmosphere.currentWind.x).toBeCloseTo(-3.02, 1);
  });

  it('should provide localized wind vector with spatial turbulence in getWindVectorAt', () => {
    const posA = new THREE.Vector3(0, 100, 0);
    const posB = new THREE.Vector3(500, 150, 500);

    const windA = atmosphere.getWindVectorAt(posA, 1.0);
    const windB = atmosphere.getWindVectorAt(posB, 1.0);

    expect(windA).toBeDefined();
    expect(windB).toBeDefined();
    // Turbulence will create slight variations across spatial coordinates
    expect(windA.x).not.toBeNaN();
    expect(windB.x).not.toBeNaN();
  });
});
