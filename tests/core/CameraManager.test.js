import { describe, it, expect, beforeEach } from 'vitest';
import { CameraManager } from '../../src/core/CameraManager.js';
import { EventBus } from '../../src/core/EventBus.js';

describe('CameraManager', () => {
  let eventBus;
  let cameraManager;

  beforeEach(() => {
    eventBus = new EventBus();
    cameraManager = new CameraManager(eventBus);
  });

  it('should initialize with perspective camera at default position', () => {
    expect(cameraManager.instance).toBeDefined();
    expect(cameraManager.instance.position.z).toBe(420);
    expect(cameraManager.trauma).toBe(0);
  });

  it('should increase trauma when firework:burst event is emitted', () => {
    eventBus.emit('firework:burst', {
      intensity: 0.8,
      position: {
        x: 0,
        y: 120,
        z: 0
      }
    });

    expect(cameraManager.trauma).toBeGreaterThan(0);
  });

  it('should compute shake offsets during update and decay trauma', () => {
    cameraManager.addImpulse(0.5);
    expect(cameraManager.trauma).toBe(0.5);

    cameraManager.update(0.016);
    expect(cameraManager.shakeOffset.lengthSq()).toBeGreaterThan(0);
    expect(cameraManager.trauma).toBeLessThan(0.5);
  });

  it('should cleanly apply and restore shake offset without position drift', () => {
    cameraManager.addImpulse(0.5);
    cameraManager.update(0.016);

    const initialY = cameraManager.instance.position.y;
    cameraManager.applyShake();
    expect(cameraManager.isShakingApplied).toBe(true);

    cameraManager.restoreShake();
    expect(cameraManager.isShakingApplied).toBe(false);
    expect(cameraManager.instance.position.y).toBeCloseTo(initialY, 5);
  });

  it('should handle burst with distance attenuation correctly', () => {
    cameraManager.onBurst({
      intensity: 1.0,
      position: {
        x: 0,
        y: 6,
        z: 300
      }
    });
    const closeTrauma = cameraManager.trauma;

    cameraManager.trauma = 0;
    cameraManager.onBurst({
      intensity: 1.0,
      position: {
        x: 0,
        y: 6,
        z: -1000
      }
    });
    const farTrauma = cameraManager.trauma;

    expect(closeTrauma).toBeGreaterThan(farTrauma);
  });
});
