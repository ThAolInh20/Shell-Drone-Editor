import * as THREE from 'three';
import { FIREWORK_CONFIG } from '../config/fireworks.js';
import { BurstEffectProcessor } from './BurstEffectProcessor.js';

const BURST_BASE_DRAG = FIREWORK_CONFIG.BURST.baseDrag ?? 2.2;
const BASE_BURST_POINT_SIZE = FIREWORK_CONFIG.SYSTEM.baseBurstPointSize ?? 18;

export class BurstParticleFactory {
  static createRandomBurstRotation() {
    const axis = new THREE.Vector3(
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1
    ).normalize();
    const angle = Math.random() * Math.PI * 2;
    return new THREE.Quaternion().setFromAxisAngle(
      axis,
      angle
    );
  }

  static resolveActiveEffectFlags({
    preset = {},
    effects = [],
    dynamicsType = ''
  } = {}) {
    const effectsList = Array.isArray(effects)
      ? effects
      : (Array.isArray(preset?.effects) ? preset.effects : []);

    const normDynamics = (
      dynamicsType
      || preset?.dynamicsType
      || preset?.dynamics
      || preset?.effectType
      || ''
    ).toLowerCase();

    const isCrossetteShell = Boolean(
      preset?.crossette
      || effectsList.includes('crossette')
      || normDynamics === 'crossette'
    );

    const isTadpoleFlurryShell = Boolean(
      preset?.isTadpoleShell
      || preset?.tadpoleFlurry
      || effectsList.includes('tadpole-flurry')
      || effectsList.includes('tadpole_flurry')
      || (Array.isArray(preset?.effects) && (
        preset.effects.includes('tadpole-flurry') ||
        preset.effects.includes('tadpole_flurry')
      ))
      || normDynamics === 'tadpole-flurry'
    );

    const isErraticDartShell = Boolean(
      preset?.erraticDart
      || preset?.hasErraticDart
      || effectsList.includes('erratic-dart')
      || effectsList.includes('erratic_dart')
      || (Array.isArray(preset?.effects) && (
        preset.effects.includes('erratic-dart') ||
        preset.effects.includes('erratic_dart')
      ))
      || normDynamics === 'erratic-dart'
    );

    const hasBurstSmoke = Boolean(
      !preset?.noBurst && (
        effectsList.includes('burst-smoke')
        || (Array.isArray(preset?.effects) && preset.effects.includes('burst-smoke'))
        || preset?.['burst-smoke']
        || preset?.burstSmoke
      )
    );

    const isGhostEffect = Boolean(
      normDynamics === 'ghost'
      || effectsList.includes('ghost')
      || (Array.isArray(preset?.effects) && preset.effects.includes('ghost'))
      || preset?.ghost
      || preset?.shellType === 'ghost'
    );

    const isCCEffect = Boolean(
      normDynamics === 'crysanthemum-cc'
      || effectsList.includes('crysanthemum-cc')
      || (Array.isArray(preset?.effects) && preset.effects.includes('crysanthemum-cc'))
      || preset?.shellType === 'crysanthemumCC'
    );

    const isLongBurn = Boolean(
      preset?.longBurn
      || effectsList.includes('long-burn')
      || (Array.isArray(preset?.effects) && preset.effects.includes('long-burn'))
      || normDynamics === 'long-burn'
      || preset?.effectType === 'long-burn'
    );

    const isApexHang = Boolean(
      preset?.apexHang
      || effectsList.includes('apex-hang')
      || (Array.isArray(preset?.effects) && preset.effects.includes('apex-hang'))
      || normDynamics === 'apex-hang'
      || preset?.effectType === 'apex-hang'
    );

    return {
      isCrossetteShell,
      isTadpoleFlurryShell,
      isErraticDartShell,
      hasBurstSmoke,
      isGhostEffect,
      isCCEffect,
      isLongBurn,
      isApexHang,
      effectsList
    };
  }

  static createParticle(options = {}) {
    const {
      position = new THREE.Vector3(),
      velocity = new THREE.Vector3(),
      color = new THREE.Color(0xffffff),
      baseColor = null,
      color2 = null,
      age = 0,
      maxLife = 1.0,
      effectType = 'standard',
      effects = [],
      crackle = false,
      crackleTriggered = false,
      phase = 0,
      preset = {},
      heightProfile = null,
      effectState = null,
      ghostDot = 0,
      spiralIndex = 0,
      isSpiralArm = false,
      particleIndex = 0,
      totalParticleCount = 1,
      shellId = null,
      isDyingEmber = false,
      isNestedTrigger = false,
      hasBurstSmoke = false,
      burstSmokeLimit = 0.33,
      isCrossette = false,
      crossetteSplitTime = 0,
      crossetteSplitDone = true,
      isSecondBurst = false,
      secondBurstDone = true,
      secondBurstConfig = null,
      secondBurstTime = 0,
      isChromaticWave = false,
      radialDistanceRatio = 0,
      renderSize = BASE_BURST_POINT_SIZE,
      renderOpacity = 1.0,
      dynamicsProfile = null,
      dragCoefficient = BURST_BASE_DRAG,
      hasTadpoleFlurry = false,
      tadpoleArrowTimer = 0,
      tadpoleDeflectionScale = 1.0,
      tadpoleSizeScale = 1.0,
      tadpoleDensityScale = 1.0,
      hasFlurried = false,
      hasErraticDart = false,
      erraticDartTriggerRatio = 0.72,
      erraticDartTriggered = false,
      erraticDartTrailTimer = 0,
      erraticDartFlash = 1.0,
      erraticDartWigglePhase = 0,
      erraticDartWiggleFreq = 22.0,
      erraticDartWiggleAmp = 26.0,
      isSecondBurstChild = false,
      isLongBurn = false,
      isApexHang = false
    } = options;

    const resolvedBaseColor = baseColor
      ? baseColor.clone()
      : color.clone();

    const initialSpeed = velocity.length();
    const ejectionDir = initialSpeed > 0.0001
      ? velocity.clone().normalize()
      : new THREE.Vector3(0, 1, 0);

    return {
      position: position.clone(),
      velocity: velocity.clone(),
      initialSpeed,
      ejectionDir,
      color: color.clone(),
      baseColor: resolvedBaseColor,
      color2: color2 ? color2.clone() : null,
      age,
      maxLife,
      effectType,
      crackle: Boolean(crackle),
      crackleTriggered: Boolean(crackleTriggered),
      phase,
      preset,
      heightProfile,
      effectState,
      ghostDot,
      spiralIndex,
      isSpiralArm: Boolean(isSpiralArm),
      particleIndex,
      totalParticleCount,
      shellId: shellId ?? Math.floor(Math.random() * 100000000),
      isDyingEmber: Boolean(isDyingEmber),
      isLongBurn: Boolean(isLongBurn),
      isApexHang: Boolean(isApexHang),
      isNestedTrigger: Boolean(isNestedTrigger),
      effects: Array.isArray(effects) ? [...effects] : [],
      hasBurstSmoke: Boolean(hasBurstSmoke),
      burstSmokeLimit,
      isCrossette: Boolean(isCrossette),
      crossetteSplitTime,
      crossetteSplitDone: Boolean(crossetteSplitDone),
      isSecondBurst: Boolean(isSecondBurst),
      secondBurstDone: Boolean(secondBurstDone),
      secondBurstConfig,
      secondBurstTime,
      isChromaticWave: Boolean(isChromaticWave),
      radialDistanceRatio,
      renderSize,
      renderOpacity,
      dynamicsProfile,
      dragCoefficient,
      hasTadpoleFlurry: Boolean(hasTadpoleFlurry),
      tadpoleArrowTimer,
      tadpoleDeflectionScale: Number(tadpoleDeflectionScale) || 1.0,
      tadpoleSizeScale: Number(tadpoleSizeScale) || 1.0,
      tadpoleDensityScale: Number(tadpoleDensityScale) || 1.0,
      hasFlurried: Boolean(hasFlurried),
      hasErraticDart: Boolean(hasErraticDart),
      erraticDartTriggerRatio,
      erraticDartTriggered: Boolean(erraticDartTriggered),
      erraticDartTrailTimer,
      erraticDartFlash,
      erraticDartWigglePhase,
      erraticDartWiggleFreq,
      erraticDartWiggleAmp,
      isSecondBurstChild: Boolean(isSecondBurstChild)
    };
  }

  static createCrossetteBranches({
    parentParticle,
    branchDirs,
    speed,
    dir,
    splitOrigin,
    branchColor,
    remainingLife,
    hasNoTrail
  }) {
    const branches = [];
    const branchEffectType = hasNoTrail ? 'no-trail' : 'crysanthemum-trail';
    const branchEffects = hasNoTrail ? ['no-trail'] : ['crysanthemum-trail'];

    for (let b = 0; b < 4; b++) {
      const branchVel = dir.clone().multiplyScalar(
        speed * 0.28
      ).addScaledVector(
        branchDirs[b],
        9.0 + Math.random() * 2.5
      );

      const branchParticle = this.createParticle({
        position: splitOrigin,
        velocity: branchVel,
        color: branchColor,
        baseColor: branchColor,
        color2: null,
        age: 0,
        maxLife: remainingLife,
        effectType: branchEffectType,
        crackle: false,
        crackleTriggered: false,
        phase: parentParticle.phase + b * 0.5,
        preset: {
          ...parentParticle.preset,
          crossette: false,
          noTrail: hasNoTrail
        },
        heightProfile: parentParticle.heightProfile,
        effectState: parentParticle.effectState,
        ghostDot: 0,
        spiralIndex: 0,
        isSpiralArm: false,
        particleIndex: parentParticle.particleIndex * 4 + b,
        totalParticleCount: parentParticle.totalParticleCount,
        shellId: parentParticle.shellId,
        isDyingEmber: false,
        isNestedTrigger: false,
        effects: branchEffects,
        hasBurstSmoke: Boolean(parentParticle.hasBurstSmoke),
        burstSmokeLimit: parentParticle.burstSmokeLimit ?? 0.33,
        isCrossette: false,
        crossetteSplitDone: true,
        isSecondBurst: false,
        secondBurstDone: true,
        secondBurstConfig: null,
        isChromaticWave: false,
        radialDistanceRatio: 0,
        renderSize: parentParticle.renderSize,
        renderOpacity: 1.0,
        dynamicsProfile: parentParticle.dynamicsProfile,
        dragCoefficient: parentParticle.dragCoefficient ?? BURST_BASE_DRAG
      });

      branches.push(branchParticle);
    }

    return branches;
  }
}
