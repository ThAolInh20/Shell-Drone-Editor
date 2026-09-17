import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { SmokeSystem } from '../../src/systems/SmokeSystem.js';
import { globalEventBus } from '../../src/core/EventBus.js';
import { FIREWORK_CONFIG } from '../../src/config/fireworks.js';

describe('SmokeSystem', () => {
  let mockScene;
  let mockSceneManager;
  let smokeSystem;

  beforeEach(() => {
    mockScene = new THREE.Scene();
    mockSceneManager = {
      instance: mockScene
    };
    smokeSystem = new SmokeSystem(mockSceneManager);
  });

  afterEach(() => {
    if (smokeSystem) {
      smokeSystem.destroy();
    }
  });

  it('should initialize geometry with custom buffer attributes including aSeed', () => {
    expect(smokeSystem.smokeGeometry).toBeDefined();
    expect(smokeSystem.smokeGeometry.getAttribute('position')).toBeDefined();
    expect(smokeSystem.smokeGeometry.getAttribute('color')).toBeDefined();
    expect(smokeSystem.smokeGeometry.getAttribute('aSize')).toBeDefined();
    expect(smokeSystem.smokeGeometry.getAttribute('aOpacity')).toBeDefined();
    expect(smokeSystem.smokeGeometry.getAttribute('aSeed')).toBeDefined();
    expect(mockScene.children).toContain(smokeSystem.smokePoints);
  });

  it('should spawn sub-cluster volumetric smoke clouds onBurst', () => {
    smokeSystem.setQuality('medium');
    const initialCount = smokeSystem.puffs.length;

    smokeSystem.onBurst({
      position: { x: 0, y: 150, z: 0 },
      colorHex: 0xff4500,
      intensity: 0.8
    });

    expect(smokeSystem.puffs.length).toBeGreaterThan(initialCount);
    const firstPuff = smokeSystem.puffs[0];
    expect(firstPuff.drag).toBeGreaterThan(2.0);
    expect(firstPuff.seed).toBeDefined();
    expect(firstPuff.buoyancy).toBeGreaterThan(0);
    expect(firstPuff.life).toBeGreaterThanOrEqual(FIREWORK_CONFIG.SMOKE.burstLifeMin);
    expect(firstPuff.life).toBeLessThanOrEqual(FIREWORK_CONFIG.SMOKE.burstLifeMax);
  });

  it('should spawn trail smoke onLaunch', () => {
    smokeSystem.setQuality('medium');
    smokeSystem.clear();

    smokeSystem.onLaunch({
      position: { x: 10, y: 0, z: 20 }
    });

    expect(smokeSystem.puffs.length).toBeGreaterThan(0);
    const trailPuff = smokeSystem.puffs[0];
    expect(trailPuff.position.x).toBeGreaterThanOrEqual(8);
    expect(trailPuff.position.x).toBeLessThanOrEqual(12);
    expect(trailPuff.drag).toBeDefined();
    expect(trailPuff.life).toBeGreaterThanOrEqual(FIREWORK_CONFIG.SMOKE.trailLifeMin);
    expect(trailPuff.life).toBeLessThanOrEqual(FIREWORK_CONFIG.SMOKE.trailLifeMax);
  });

  it('should apply exponential drag and wind lerp on update', () => {
    smokeSystem.setQuality('high');
    smokeSystem.clear();

    smokeSystem.spawnPuff(
      new THREE.Vector3(0, 50, 0),
      new THREE.Vector3(20, 0, 0),
      {
        life: 3.0,
        drag: 3.0,
        buoyancy: 0.5,
        scale: 10
      }
    );

    const initialVelX = smokeSystem.puffs[0].velocity.x;
    smokeSystem.update(0.1);

    // Exponential drag should reduce velocity significantly
    expect(smokeSystem.puffs[0].velocity.x).toBeLessThan(initialVelX);
    expect(smokeSystem.activePuffCount).toBe(1);
    expect(smokeSystem.smokeGeometry.drawRange.count).toBe(1);
  });

  it('should handle quality switching and turning off', () => {
    smokeSystem.setQuality('high');
    smokeSystem.spawnPuff(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1, 1, 1),
      { life: 2.0 }
    );
    expect(smokeSystem.smokePoints.visible).toBe(true);

    smokeSystem.setQuality('off');
    expect(smokeSystem.smokePoints.visible).toBe(false);
    expect(smokeSystem.puffs.length).toBe(0);
    expect(smokeSystem.smokeGeometry.drawRange.count).toBe(0);
  });

  it('should clear all puffs cleanly', () => {
    smokeSystem.setQuality('medium');
    smokeSystem.onBurst({
      position: { x: 0, y: 100, z: 0 }
    });
    expect(smokeSystem.puffs.length).toBeGreaterThan(0);

    smokeSystem.clear();
    expect(smokeSystem.puffs.length).toBe(0);
    expect(smokeSystem.activePuffCount).toBe(0);
    expect(smokeSystem.smokeGeometry.drawRange.count).toBe(0);
  });
});
