import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { ShellEntity } from '../../src/entities/ShellEntity.js';
import { FireworkSystem } from '../../src/systems/FireworkSystem.js';
import { TrailSystem } from '../../src/systems/TrailSystem.js';

describe('Launch Trail Wake Physics and Straight Star Head Flight', () => {
  it('ShellEntity projectile star head should fly straight along basePosition without wobbling', () => {
    const shell = new ShellEntity({
      position: new THREE.Vector3(0, 0, 0),
      velocity: new THREE.Vector3(0, 60, 0),
      burstHeight: 120,
      color: new THREE.Color(0xffaa22),
      shape: 'chrysanthemum'
    });

    // Advance simulation through multiple ascent steps
    for (let step = 0; step < 20; step++) {
      shell.update(0.05);

      // Star head mesh position must strictly match basePosition (no lateral wobble on head)
      expect(shell.mesh.position.x).toBeCloseTo(shell.basePosition.x, 5);
      expect(shell.mesh.position.y).toBeCloseTo(shell.basePosition.y, 5);
      expect(shell.mesh.position.z).toBeCloseTo(shell.basePosition.z, 5);
    }
  });

  it('ShellEntity trailOffset should capture uneven combustion wake distortion', () => {
    const shell = new ShellEntity({
      position: new THREE.Vector3(0, 0, 0),
      velocity: new THREE.Vector3(0, 50, 0),
      burstHeight: 100,
      color: new THREE.Color(0x00ff88),
      shape: 'peony'
    });

    let detectedWakeOffset = false;

    // Simulate ascent to mid-envelope where wake distortion is active
    for (let step = 0; step < 25; step++) {
      shell.update(0.04);
      const lateralDist = Math.hypot(shell.trailOffset.x, shell.trailOffset.z);
      if (lateralDist > 0.05) {
        detectedWakeOffset = true;
      }
    }

    expect(detectedWakeOffset).toBe(true);
  });

  it('Sputter should temporarily pause trail emission and cause wake trajectory deviation after recovery', () => {
    const shell = new ShellEntity({
      position: new THREE.Vector3(0, 0, 0),
      velocity: new THREE.Vector3(0, 60, 0),
      burstHeight: 150,
      color: new THREE.Color(0xff4444),
      shape: 'brocade'
    });

    // Force sputter state active
    shell.hasSputter = true;
    shell.launchEndRatio = 0;
    shell.isSputtering = true;
    shell.currentSputterRemaining = 0.05;

    shell.update(0.01);
    expect(shell.getTrailIntensity()).toBe(0.0);

    // Complete the sputter duration to trigger reignition and directional kick
    shell.update(0.06);
    expect(shell.isSputtering).toBe(false);
    expect(shell.sputterKick.lengthSq()).toBeGreaterThan(0.01);
  });

  it('FireworkSystem should spawn trail particles with wake offset while leaving star head straight', () => {
    const scene = new THREE.Scene();
    const trailSystem = new TrailSystem(scene);
    const fireworkSystem = new FireworkSystem(scene, trailSystem);

    const shell = new ShellEntity({
      position: new THREE.Vector3(10, 5, 20),
      velocity: new THREE.Vector3(0, 70, 0),
      burstHeight: 140,
      color: new THREE.Color(0xffdd33),
      shape: 'willow'
    });

    // Provide a distinct trail offset
    shell.trailOffset.set(1.5, 0, -2.0);
    shell.prevTrailOffset.set(1.4, 0, -1.9);

    fireworkSystem.activeFireworks.push(shell);

    // Update firework system
    fireworkSystem.update(0.03);

    // Head remains on ballistic track
    expect(shell.mesh.position.x).toBeCloseTo(shell.basePosition.x, 5);
    expect(shell.mesh.position.z).toBeCloseTo(shell.basePosition.z, 5);

    // Trail particles must have been spawned
    expect(trailSystem.trailParticles.length).toBeGreaterThan(0);

    // Check that at least one trail particle is displaced by the wake offset
    const displacedParticles = trailSystem.trailParticles.filter((p) => {
      const dx = Math.abs(p.position.x - shell.basePosition.x);
      const dz = Math.abs(p.position.z - shell.basePosition.z);
      return dx > 0.5 || dz > 0.5;
    });

    expect(displacedParticles.length).toBeGreaterThan(0);
  });
});
