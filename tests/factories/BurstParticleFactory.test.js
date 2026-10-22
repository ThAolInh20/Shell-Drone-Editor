import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { BurstParticleFactory } from '../../src/factories/BurstParticleFactory.js';

describe('BurstParticleFactory', () => {
  describe('createParticle', () => {
    it('creates a particle with all standardized properties and safe defaults', () => {
      const p = BurstParticleFactory.createParticle({
        position: new THREE.Vector3(10, 20, 30),
        velocity: new THREE.Vector3(1, 2, 3),
        color: new THREE.Color('#ff0000'),
        maxLife: 1.5
      });

      expect(p.position.x).toBe(10);
      expect(p.position.y).toBe(20);
      expect(p.position.z).toBe(30);
      expect(p.velocity.x).toBe(1);
      expect(p.maxLife).toBe(1.5);
      expect(p.age).toBe(0);
      expect(p.color.getHexString()).toBe('ff0000');
      expect(p.baseColor.getHexString()).toBe('ff0000');
      expect(p.color2).toBeNull();
      expect(p.effectType).toBe('standard');
      expect(Array.isArray(p.effects)).toBe(true);
      expect(p.crackle).toBe(false);
      expect(p.crackleTriggered).toBe(false);
      expect(p.hasBurstSmoke).toBe(false);
      expect(p.isCrossette).toBe(false);
      expect(p.crossetteSplitDone).toBe(true);
      expect(p.isSecondBurst).toBe(false);
      expect(p.secondBurstDone).toBe(true);
      expect(p.hasErraticDart).toBe(false);
      expect(p.erraticDartTriggered).toBe(false);
      expect(p.hasTadpoleFlurry).toBe(false);
      expect(p.renderOpacity).toBe(1.0);
      expect(p.isSecondBurstChild).toBe(false);
    });

    it('clones position, velocity and colors to prevent shared mutation', () => {
      const origPos = new THREE.Vector3(5, 5, 5);
      const origVel = new THREE.Vector3(2, 2, 2);
      const origCol = new THREE.Color('#00ff00');

      const p = BurstParticleFactory.createParticle({
        position: origPos,
        velocity: origVel,
        color: origCol,
        maxLife: 2.0
      });

      origPos.x = 999;
      origVel.y = 888;
      origCol.setRGB(0, 0, 0);

      expect(p.position.x).toBe(5);
      expect(p.velocity.y).toBe(2);
      expect(p.color.g).toBe(1);
    });
  });

  describe('resolveActiveEffectFlags', () => {
    it('resolves active effect flags from preset and effects array', () => {
      const flags = BurstParticleFactory.resolveActiveEffectFlags({
        preset: {
          dynamicsType: 'willow'
        },
        effects: ['flow', 'erratic-dart', 'burst-smoke', 'crossette']
      });

      expect(flags.isErraticDartShell).toBe(true);
      expect(flags.isCrossetteShell).toBe(true);
      expect(flags.hasBurstSmoke).toBe(true);
      expect(flags.isGhostEffect).toBe(false);
      expect(flags.isCCEffect).toBe(false);
      expect(flags.effectsList).toContain('flow');
    });

    it('identifies ghost and color change effects', () => {
      const ghostFlags = BurstParticleFactory.resolveActiveEffectFlags({
        preset: { shellType: 'ghost' },
        effects: []
      });
      expect(ghostFlags.isGhostEffect).toBe(true);

      const ccFlags = BurstParticleFactory.resolveActiveEffectFlags({
        preset: { shellType: 'crysanthemumCC' },
        effects: ['crysanthemum-cc']
      });
      expect(ccFlags.isCCEffect).toBe(true);

      const longBurnFlags = BurstParticleFactory.resolveActiveEffectFlags({
        preset: {},
        effects: ['long-burn']
      });
      expect(longBurnFlags.isLongBurn).toBe(true);

      const presetLongBurnFlags = BurstParticleFactory.resolveActiveEffectFlags({
        preset: { longBurn: true },
        effects: []
      });
      expect(presetLongBurnFlags.isLongBurn).toBe(true);

      const slowBurstFlags = BurstParticleFactory.resolveActiveEffectFlags({
        preset: {},
        effects: ['slow-burst']
      });
      expect(slowBurstFlags.isSlowBurst).toBe(true);

      const presetSlowBurstFlags = BurstParticleFactory.resolveActiveEffectFlags({
        preset: { slowBurst: true },
        effects: []
      });
      expect(presetSlowBurstFlags.isSlowBurst).toBe(true);
    });
  });

  describe('createCrossetteBranches', () => {
    it('creates 4 orthogonal branch particles inheriting parent properties', () => {
      const parentParticle = BurstParticleFactory.createParticle({
        position: new THREE.Vector3(0, 100, 0),
        velocity: new THREE.Vector3(0, 20, 0),
        color: new THREE.Color('#ffd700'),
        shellId: 'shell-42',
        phase: 1.5,
        maxLife: 2.0,
        age: 1.0,
        hasBurstSmoke: true
      });

      const dir = new THREE.Vector3(0, 1, 0);
      const rightVec = new THREE.Vector3(1, 0, 0);
      const crossUpVec = new THREE.Vector3(0, 0, 1);
      const branchDirs = [
        rightVec,
        rightVec.clone().negate(),
        crossUpVec,
        crossUpVec.clone().negate()
      ];

      const branches = BurstParticleFactory.createCrossetteBranches({
        parentParticle,
        branchDirs,
        speed: 20,
        dir,
        splitOrigin: parentParticle.position,
        branchColor: parentParticle.baseColor,
        remainingLife: 1.0,
        hasNoTrail: false
      });

      expect(branches.length).toBe(4);
      branches.forEach(b => {
        expect(b.shellId).toBe('shell-42');
        expect(b.isCrossette).toBe(false);
        expect(b.crossetteSplitDone).toBe(true);
        expect(b.hasBurstSmoke).toBe(true);
        expect(b.maxLife).toBe(1.0);
        expect(b.effectType).toBe('crysanthemum-trail');
      });
    });
  });

  describe('createRandomBurstRotation', () => {
    it('returns a valid unit quaternion', () => {
      const quat = BurstParticleFactory.createRandomBurstRotation();
      expect(quat).toBeInstanceOf(THREE.Quaternion);
      expect(Math.abs(quat.length() - 1.0)).toBeLessThan(0.001);
    });
  });
});
