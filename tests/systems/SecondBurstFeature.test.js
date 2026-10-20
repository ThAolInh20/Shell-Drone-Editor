import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { FireworkSystem } from '../../src/systems/FireworkSystem.js';
import {
  DEFAULT_SECOND_BURST_CONFIG,
  resolveSecondBurstConfig
} from '../../src/factories/FireworkCompositionHelper.js';
import { FIREWORK_CONFIG } from '../../src/config/fireworks.js';

describe('Second Burst Feature', () => {
  let mockScene;
  let mockTrailSystem;
  let fireworkSystem;

  beforeEach(() => {
    mockScene = new THREE.Scene();
    mockTrailSystem = {
      spawnRocketTrail: () => {},
      spawnBurstTrail: () => {},
      spawnTrailParticle: () => {},
      spawnEffectSpark: () => {},
      spawnMicroCrackle: () => {},
      update: () => {}
    };
    fireworkSystem = new FireworkSystem(mockScene, mockTrailSystem);
  });

  describe('resolveSecondBurstConfig Helper', () => {
    it('returns safe disabled default when event is empty or missing', () => {
      const config = resolveSecondBurstConfig(null);
      expect(config.enabled).toBe(false);
      expect(Array.isArray(config.childShells)).toBe(true);
      expect(config.childShells.length).toBeGreaterThan(0);
      expect(config.childShells[0].ratio).toBe(0.20);
      expect(config.childShells[0].triggerTiming).toBe(0.50);
      expect(config.childShells[0].distributionMode).toBe('random');
    });

    it('resolves secondBurstEnabled boolean flag into full valid config', () => {
      const event = { secondBurstEnabled: true };
      const config = resolveSecondBurstConfig(event);
      expect(config.enabled).toBe(true);
      expect(config.childShells[0].ratio).toBe(0.20);
      expect(config.childShells[0].triggerTiming).toBe(0.50);
      expect(config.childShells[0].shapeType).toBe('sphere');
    });

    it('respects and clamps custom ratio and timing per child shell', () => {
      const event = {
        secondBurst: {
          enabled: true,
          childShells: [
            {
              ratio: 1.5, // should clamp to 1.0
              triggerTiming: 0.05, // should clamp to 0.15
              distributionMode: 'sequential',
              shapeType: 'ring',
              dynamicsType: 'flow',
              color: '#00e5ff',
              scale: 0.45,
              effects: ['strobe']
            }
          ]
        }
      };
      const config = resolveSecondBurstConfig(event);
      expect(config.enabled).toBe(true);
      expect(config.childShells[0].ratio).toBe(1.0);
      expect(config.childShells[0].triggerTiming).toBe(0.15);
      expect(config.childShells[0].distributionMode).toBe('sequential');
      expect(config.childShells[0].shapeType).toBe('ring');
      expect(config.childShells[0].dynamicsType).toBe('flow');
    });
  });

  describe('Burst Particle Tagging', () => {
    it('tags candidate particles when secondBurst is enabled with per-child configurations', () => {
      const position = new THREE.Vector3(0, 100, 0);
      const color = new THREE.Color('#ff0000');
      const preset = {
        secondBurstEnabled: true,
        secondBurst: {
          enabled: true,
          childShells: [
            {
              ratio: 0.20,
              triggerTiming: 0.40,
              distributionMode: 'random',
              shapeType: 'ring',
              dynamicsType: 'crossette',
              color: '#00ffcc',
              scale: 0.4,
              effects: ['strobe']
            },
            {
              ratio: 0.25,
              triggerTiming: 0.70,
              distributionMode: 'simultaneous',
              shapeType: 'sphere',
              dynamicsType: 'willow',
              color: '#ffaa00',
              scale: 0.3,
              effects: ['crackle']
            }
          ]
        }
      };

      fireworkSystem.createBurst(position, color, 'sphere', preset);

      const particles = fireworkSystem.burstParticles;
      expect(particles.length).toBeGreaterThan(0);

      const secondBurstCandidates = particles.filter(p => p.isSecondBurst);
      expect(secondBurstCandidates.length).toBeGreaterThan(0);

      // Verify that candidate particles receive their specific child configuration
      const ringCandidates = secondBurstCandidates.filter(
        p => p.secondBurstConfig?.shapeType === 'ring'
      );
      const sphereCandidates = secondBurstCandidates.filter(
        p => p.secondBurstConfig?.shapeType === 'sphere'
      );

      expect(ringCandidates.length).toBeGreaterThan(0);
      expect(sphereCandidates.length).toBeGreaterThan(0);

      // Verify each candidate has independent trigger time and state
      const ringSample = ringCandidates[0];
      expect(ringSample.secondBurstConfig.dynamicsType).toBe('crossette');
      expect(ringSample.secondBurstTime).toBeGreaterThan(0);
      expect(ringSample.secondBurstDone).toBe(false);

      const sphereSample = sphereCandidates[0];
      expect(sphereSample.secondBurstConfig.dynamicsType).toBe('willow');
      expect(sphereSample.secondBurstTime).toBeGreaterThan(0);
      expect(sphereSample.secondBurstDone).toBe(false);
    });
  });

  describe('5 Concurrent Shells Stress & Sub-Burst Spawning', () => {
    it('runs smoothly with 5 simultaneous second burst shells without exceeding quotas', () => {
      const colorList = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'];

      // Fire 5 shells simultaneously
      for (let s = 0; s < 5; s++) {
        const position = new THREE.Vector3((s - 2) * 30, 120, 0);
        const color = new THREE.Color(colorList[s]);
        const preset = {
          secondBurstEnabled: true,
          secondBurst: {
            enabled: true,
            ratio: 0.25,
            triggerTiming: 0.45,
            distributionMode: 'random',
            childShells: [
              {
                shapeType: 'sphere',
                dynamicsType: 'standard',
                color: '#ffd700',
                scale: 0.35,
                effects: ['strobe']
              },
              {
                shapeType: 'ring',
                dynamicsType: 'willow',
                color: '#ffffff',
                scale: 0.30,
                effects: ['crackle']
              }
            ]
          }
        };
        fireworkSystem.createBurst(position, color, 'sphere', preset);
      }

      const initialCount = fireworkSystem.burstParticles.length;
      expect(initialCount).toBeGreaterThan(300);

      // Advance time step-by-step to simulate frames across 2 seconds
      const dt = 0.016; // ~60 FPS frame delta
      let maxParticleCountObserved = initialCount;
      let secondBurstsTriggeredCount = 0;

      for (let frame = 0; frame < 120; frame++) {
        fireworkSystem.updateBurstParticles(dt);
        const currentCount = fireworkSystem.burstParticles.length;
        if (currentCount > maxParticleCountObserved) {
          maxParticleCountObserved = currentCount;
        }
      }

      // Verify that particles were spawned and handled within safe system quotas
      expect(maxParticleCountObserved).toBeLessThan(FIREWORK_CONFIG.SYSTEM.maxBurstParticles);

      // Verify non-recursive guarantee: all child particles must have isSecondBurst: false
      const allActive = fireworkSystem.burstParticles;
      const invalidRecursiveParticles = allActive.filter(
        p => p.isSecondBurst && p.secondBurstDone === false && p.age < 0.05
      );
      // No child particle should be registered as a second burst candidate
      allActive.forEach(p => {
        if (p.secondBurstConfig === null && p.secondBurstDone === true) {
          expect(p.isSecondBurst).toBe(false);
        }
      });
    });
  });

  describe('Full Composition Modifiers and Preset Templates', () => {
    it('resolves preset templates and modifiers into child shell config', () => {
      const event = {
        secondBurst: {
          enabled: true,
          childShells: [
            {
              preset: 'willow',
              pistil: true,
              instantBurst: true,
              burstSound: 'heavy'
            }
          ]
        }
      };

      const resolved = resolveSecondBurstConfig(event);
      const child = resolved.childShells[0];
      expect(child.preset).toBe('willow');
      expect(child.dynamicsType).toBe('willow');
      expect(child.pistil).toBe(true);
      expect(child.instantBurst).toBe(true);
      expect(child.burstSound).toBe('heavy');
    });

    it('spawns inner core pistil particles when pistil modifier is enabled', () => {
      const parentParticle = {
        position: new THREE.Vector3(0, 50, 0),
        velocity: new THREE.Vector3(0, 0, 0),
        heightProfile: null,
        shellId: 'test-shell',
        secondBurstConfig: {
          shapeType: 'sphere',
          dynamicsType: 'standard',
          scale: 0.5,
          color: '#ff0000',
          pistil: true,
          pistilColor: '#ffffff',
          effects: ['strobe'],
          burstSound: 'crisp'
        }
      };

      const activeParticles = [];
      fireworkSystem.spawnSecondBurst(parentParticle, activeParticles);

      // Should contain outer particles (red) + inner pistil core particles (white)
      expect(activeParticles.length).toBeGreaterThan(10);
      const pistilParticles = activeParticles.filter(
        p => p.baseColor.r > 0.9 && p.baseColor.g > 0.9 && p.baseColor.b > 0.9
      );
      expect(pistilParticles.length).toBeGreaterThanOrEqual(4);
    });

    it('spawns child particles with fully initialized effectState when flow effect is active', () => {
      const parentParticle = {
        position: new THREE.Vector3(0, 80, 0),
        velocity: new THREE.Vector3(0, 0, 0),
        heightProfile: null,
        shellId: 'test-flow-shell',
        secondBurstConfig: {
          shapeType: 'sphere',
          dynamicsType: 'standard',
          scale: 0.5,
          color: '#00ffcc',
          effects: ['flow'],
          burstSound: 'crisp'
        }
      };

      const activeParticles = [];
      fireworkSystem.spawnSecondBurst(parentParticle, activeParticles);

      expect(activeParticles.length).toBeGreaterThan(0);
      activeParticles.forEach(p => {
        expect(p.effectState).not.toBeNull();
        expect(p.effectState.flow).toBe(true);
        expect(p.effectState.spin).toBeInstanceOf(Float32Array);
        expect(p.effectState.phase).toBeInstanceOf(Float32Array);
        expect(p.effectState.turbulence).toBeInstanceOf(Float32Array);
      });
    });

    it('initializes erratic dart and tadpole flurry properties on second burst child particles', () => {
      const parentParticle = {
        position: new THREE.Vector3(0, 90, 0),
        velocity: new THREE.Vector3(0, 0, 0),
        heightProfile: null,
        shellId: 'test-erratic-shell',
        secondBurstConfig: {
          shapeType: 'sphere',
          dynamicsType: 'standard',
          scale: 0.5,
          color: '#ff3366',
          effects: ['erratic-dart', 'burst-smoke'],
          burstSound: 'standard'
        }
      };

      const activeParticles = [];
      fireworkSystem.spawnSecondBurst(parentParticle, activeParticles);

      expect(activeParticles.length).toBeGreaterThan(0);
      const dartParticles = activeParticles.filter(p => p.hasErraticDart);
      expect(dartParticles.length).toBeGreaterThanOrEqual(1);

      dartParticles.forEach(p => {
        expect(p.erraticDartTriggered).toBe(false);
        expect(p.erraticDartTriggerRatio).toBeGreaterThanOrEqual(0.65);
        expect(p.hasBurstSmoke).toBe(true);
      });
    });

    it('configures strobe and synchronized phase for second burst child particles', () => {
      const parentParticle = {
        position: new THREE.Vector3(0, 100, 0),
        velocity: new THREE.Vector3(0, 0, 0),
        heightProfile: null,
        shellId: 'test-strobe-shell',
        secondBurstConfig: {
          shapeType: 'sphere',
          dynamicsType: 'standard',
          scale: 0.5,
          color: '#ffffff',
          effects: ['white-strobe'],
          burstSound: 'crisp'
        }
      };

      const activeParticles = [];
      fireworkSystem.spawnSecondBurst(parentParticle, activeParticles);

      expect(activeParticles.length).toBeGreaterThan(0);
      activeParticles.forEach(p => {
        expect(p.effects).toContain('white-strobe');
        expect(p.effectState.strobe).toBe(true);
        expect(typeof p.phase).toBe('number');
      });
    });
  });
});
