import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { LaunchBarge } from '../../src/environment/LaunchBarge.js';

describe('LaunchBarge', () => {
  let launchBarge;

  beforeEach(() => {
    launchBarge = new LaunchBarge();
  });

  afterEach(() => {
    if (launchBarge) {
      launchBarge.dispose();
    }
  });

  it('should initialize continuous full-coverage launch pier', () => {
    expect(launchBarge.group).toBeDefined();
    expect(launchBarge.instancedMeshes.length).toBeGreaterThan(0);
    // 8 instanced meshes: deck, trim, floats, tubes, fan tubes, cabins, solar, beacons
    expect(launchBarge.instancedMeshes.length).toBe(8);
    // Deck instanced mesh has 104 modules covering the full arc
    expect(launchBarge.instancedMeshes[0].count).toBe(104);
  });

  it('should stay dark in idle and light up when a launch occurs nearby', () => {
    // Check idle beacons
    expect(launchBarge.beacons.length).toBeGreaterThan(0);
    expect(launchBarge.beacons[0].flashIntensity).toBe(0.0);

    const testBeacon = launchBarge.beacons[0];
    const launchPos = {
      x: testBeacon.worldX,
      y: testBeacon.worldY,
      z: testBeacon.worldZ
    };

    // Trigger launch at beacon position
    launchBarge.triggerLaunchLight(launchPos, 0xff5500);

    // Nearby beacon must flare up with flash intensity
    expect(testBeacon.flashIntensity).toBeGreaterThan(1.0);

    // Advance time and check decay back towards idle
    const brightIntensity = testBeacon.flashIntensity;
    launchBarge.update(0.3);
    expect(testBeacon.flashIntensity).toBeLessThan(brightIntensity);
  });

  it('should apply hydrodynamic wave bobbing on update', () => {
    const initialY = launchBarge.group.position.y;
    launchBarge.update(0.5);
    expect(launchBarge.time).toBeCloseTo(0.5);
    expect(launchBarge.group.position.y).not.toBe(initialY);
  });

  it('should spawn lift ejection sparks and muzzle flash on launch', () => {
    const launchPos = {
      x: 0,
      y: 0,
      z: 360
    };

    expect(launchBarge.liftParticles.length).toBe(0);
    launchBarge.triggerLaunchLight(launchPos, 0xffaa00);

    // Should spawn lift sparks shooting out of the mortar tube
    expect(launchBarge.liftParticles.length).toBeGreaterThanOrEqual(20);
    expect(launchBarge.muzzlePool.some((m) => m.active)).toBe(true);

    // Update simulation
    launchBarge.update(0.1);
    expect(launchBarge.liftParticles[0].y).toBeGreaterThan(0);

    // Fast-forward past spark lifetime
    launchBarge.update(1.0);
    expect(launchBarge.liftParticles.length).toBe(0);
  });

  it('should orient lift ejection sparks along directional launch vector', () => {
    const launchPos = {
      x: 50,
      y: 0,
      z: 300
    };
    const angledDir = {
      x: 0.6,
      y: 0.8,
      z: 0.0
    };

    launchBarge.triggerLaunchLight(
      launchPos,
      0xff5500,
      angledDir
    );
    expect(launchBarge.liftParticles.length).toBeGreaterThan(0);

    // Jet particles should have positive X velocity matching launch direction
    const upwardJetParticles = launchBarge.liftParticles.filter(
      (p) => p.vx > 5.0 && p.vy > 10.0
    );
    expect(upwardJetParticles.length).toBeGreaterThan(0);
  });

  it('should enable reflection layer across all meshes', () => {
    launchBarge.setLayer(1);
    let checkedCount = 0;
    launchBarge.group.traverse((obj) => {
      if (obj.layers) {
        expect(obj.layers.isEnabled(1)).toBe(true);
        checkedCount++;
      }
    });
    expect(checkedCount).toBeGreaterThan(0);
  });
});
