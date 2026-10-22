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
    const rawList = Array.isArray(effects) && effects.length > 0
      ? effects
      : (Array.isArray(preset?.effects) ? preset.effects : []);
    const effectsList = rawList.map((e) => (typeof e === 'object' && e !== null ? (e.type || e.key) : e));

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

    const hasNoTrail = Boolean(
      preset?.noTrail
      || effectsList.includes('no-trail')
      || effectsList.includes('notrail')
      || (Array.isArray(preset?.effects) && (
        preset.effects.includes('no-trail')
        || preset.effects.includes('notrail')
        || preset.effects.some((e) => (typeof e === 'object' && ((e.type || e.key) === 'no-trail' || (e.type || e.key) === 'notrail')))
      ))
      || normDynamics === 'no-trail'
      || normDynamics === 'notrail'
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
      hasNoTrail,
      effectsList
    };
  }

  static getEffectTiming(effects, effectName, maxLife = 1.0) {
    if (!Array.isArray(effects)) return null;
    for (let i = 0; i < effects.length; i++) {
      const eff = effects[i];
      if (typeof eff === 'object' && eff !== null) {
        if ((eff.type || eff.key) === effectName) {
          const startRatio = eff.startRatio !== undefined ? Number(eff.startRatio) : undefined;
          const endRatio = eff.endRatio !== undefined ? Number(eff.endRatio) : undefined;

          let start = eff.start !== undefined ? Number(eff.start) : 0;
          let end = eff.end !== undefined ? Number(eff.end) : null;

          if (startRatio !== undefined && !isNaN(startRatio)) {
            start = startRatio * maxLife;
          }
          if (endRatio !== undefined && !isNaN(endRatio)) {
            end = endRatio * maxLife;
          }

          return {
            start,
            end,
            startRatio: startRatio !== undefined ? startRatio : (maxLife > 0 ? start / maxLife : 0),
            endRatio: endRatio !== undefined ? endRatio : (end !== null && maxLife > 0 ? end / maxLife : 1.0)
          };
        }
      } else if (eff === effectName) {
        return { start: 0, end: null, startRatio: 0, endRatio: 1.0 };
      }
    }
    return null;
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
      isApexHang = false,
      hasNoTrail = false,
      frictionHeat = 0.0,
      sizeVariance = null,
      brightnessVariance = null
    } = options;

    const sizeSpread = FIREWORK_CONFIG.BURST?.starSizeVariance ?? 0.06;
    const brightSpread = FIREWORK_CONFIG.BURST?.starBrightnessVariance ?? 0.10;

    const resolvedSizeVariance = sizeVariance !== null
      ? sizeVariance
      : (1.0 + (Math.random() + Math.random() - 1.0) * sizeSpread);
    const resolvedBrightnessVariance = brightnessVariance !== null
      ? brightnessVariance
      : (1.0 + (Math.random() + Math.random() - 1.0) * brightSpread);

    const resolvedBaseColor = baseColor
      ? baseColor.clone()
      : color.clone();

    const initialSpeed = velocity.length();
    const ejectionDir = initialSpeed > 0.0001
      ? velocity.clone().normalize()
      : new THREE.Vector3(0, 1, 0);

    const effectsArray = Array.isArray(effects) && effects.length > 0
      ? effects
      : (Array.isArray(preset?.effects) ? preset.effects : []);

    const crackleTiming = BurstParticleFactory.getEffectTiming(effectsArray, 'crackle', maxLife);
    const hasCrackle = options.crackle !== undefined ? Boolean(options.crackle) : (crackleTiming !== null);
    const crackleStart = crackleTiming
      ? crackleTiming.start
      : (hasCrackle ? maxLife * 0.65 : undefined);
    const crackleEnd = crackleTiming && crackleTiming.end !== null
      ? crackleTiming.end
      : (hasCrackle ? maxLife : undefined);

    const tadpoleTiming = BurstParticleFactory.getEffectTiming(effectsArray, 'tadpole-flurry', maxLife)
      || BurstParticleFactory.getEffectTiming(effectsArray, 'tadpole_flurry', maxLife);
    const effectiveHasTadpoleFlurry = options.hasTadpoleFlurry !== undefined
      ? Boolean(options.hasTadpoleFlurry)
      : (tadpoleTiming !== null);
    const tadpoleStart = tadpoleTiming
      ? tadpoleTiming.start
      : (effectiveHasTadpoleFlurry ? maxLife * 0.18 : undefined);
    const tadpoleEnd = tadpoleTiming && tadpoleTiming.end !== null
      ? tadpoleTiming.end
      : (effectiveHasTadpoleFlurry ? maxLife * 0.85 : undefined);

    const dartTiming = BurstParticleFactory.getEffectTiming(effectsArray, 'erratic-dart', maxLife)
      || BurstParticleFactory.getEffectTiming(effectsArray, 'erratic_dart', maxLife);
    const effectiveHasErraticDart = options.hasErraticDart !== undefined
      ? Boolean(options.hasErraticDart)
      : (dartTiming !== null);
    const erraticDartTriggerTime = (dartTiming && dartTiming.start > 0)
      ? dartTiming.start
      : (effectiveHasErraticDart ? maxLife * erraticDartTriggerRatio : undefined);
    const erraticDartEnd = dartTiming && dartTiming.end !== null
      ? dartTiming.end
      : (effectiveHasErraticDart ? maxLife : undefined);

    const crossetteTiming = BurstParticleFactory.getEffectTiming(effectsArray, 'crossette', maxLife);
    const effectiveIsCrossette = options.isCrossette !== undefined
      ? Boolean(options.isCrossette)
      : (crossetteTiming !== null);
    const resolvedCrossetteSplitTime = (crossetteTiming && crossetteTiming.start > 0)
      ? crossetteTiming.start
      : (crossetteSplitTime > 0 ? crossetteSplitTime : maxLife * 0.5);

    const smokeTiming = BurstParticleFactory.getEffectTiming(effectsArray, 'burst-smoke', maxLife);
    const effectiveHasBurstSmoke = options.hasBurstSmoke !== undefined
      ? Boolean(options.hasBurstSmoke)
      : (smokeTiming !== null);
    const burstSmokeStart = smokeTiming
      ? smokeTiming.start
      : (effectiveHasBurstSmoke ? 0 : undefined);
    const burstSmokeEnd = smokeTiming && smokeTiming.end !== null
      ? smokeTiming.end
      : (effectiveHasBurstSmoke ? maxLife * (burstSmokeLimit ?? 0.33) : undefined);

    const strobeTiming = BurstParticleFactory.getEffectTiming(effectsArray, 'strobe', maxLife)
      || BurstParticleFactory.getEffectTiming(effectsArray, 'white-strobe', maxLife)
      || BurstParticleFactory.getEffectTiming(effectsArray, 'glitter-strobe', maxLife);
    const strobeStart = strobeTiming ? strobeTiming.start : undefined;
    const strobeEnd = strobeTiming && strobeTiming.end !== null
      ? strobeTiming.end
      : (strobeTiming ? maxLife : undefined);

    const ghostTiming = BurstParticleFactory.getEffectTiming(effectsArray, 'ghost', maxLife);
    const ghostStart = ghostTiming ? ghostTiming.start : undefined;
    const ghostEnd = ghostTiming && ghostTiming.end !== null
      ? ghostTiming.end
      : (ghostTiming ? maxLife : undefined);

    const noTrailTiming = BurstParticleFactory.getEffectTiming(effectsArray, 'no-trail', maxLife)
      || BurstParticleFactory.getEffectTiming(effectsArray, 'notrail', maxLife)
      || BurstParticleFactory.getEffectTiming(effectsArray, 'noTrail', maxLife);
    const effectiveHasNoTrail = options.hasNoTrail !== undefined
      ? Boolean(options.hasNoTrail)
      : (preset?.noTrail || noTrailTiming !== null);
    const noTrailStart = noTrailTiming
      ? noTrailTiming.start
      : (effectiveHasNoTrail ? 0 : undefined);
    const noTrailEnd = noTrailTiming && noTrailTiming.end !== null
      ? noTrailTiming.end
      : (effectiveHasNoTrail ? maxLife : undefined);

    return {
      position: position.clone(),
      velocity: velocity.clone(),
      initialSpeed,
      ejectionDir,
      color: color.clone(),
      baseColor: resolvedBaseColor,
      color2: color2 ? color2.clone() : null,
      sizeVariance: resolvedSizeVariance,
      brightnessVariance: resolvedBrightnessVariance,
      age,
      maxLife,
      effectType,
      crackle: Boolean(hasCrackle),
      crackleStart,
      crackleEnd,
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
      hasBurstSmoke: Boolean(effectiveHasBurstSmoke),
      burstSmokeStart,
      burstSmokeEnd,
      burstSmokeLimit,
      isCrossette: Boolean(effectiveIsCrossette),
      crossetteSplitTime: resolvedCrossetteSplitTime,
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
      hasTadpoleFlurry: Boolean(effectiveHasTadpoleFlurry),
      tadpoleStart,
      tadpoleEnd,
      tadpoleArrowTimer,
      tadpoleDeflectionScale: Number(tadpoleDeflectionScale) || 1.0,
      tadpoleSizeScale: Number(tadpoleSizeScale) || 1.0,
      tadpoleDensityScale: Number(tadpoleDensityScale) || 1.0,
      hasFlurried: Boolean(hasFlurried),
      hasErraticDart: Boolean(effectiveHasErraticDart),
      erraticDartTriggerTime,
      erraticDartEnd,
      erraticDartTriggerRatio,
      erraticDartTriggered: Boolean(erraticDartTriggered),
      erraticDartTrailTimer,
      erraticDartFlash,
      erraticDartWigglePhase,
      erraticDartWiggleFreq,
      erraticDartWiggleAmp,
      isSecondBurstChild: Boolean(isSecondBurstChild),
      strobeStart,
      strobeEnd,
      ghostStart,
      ghostEnd,
      hasNoTrail: Boolean(effectiveHasNoTrail),
      noTrailStart,
      noTrailEnd,
      frictionHeat: Number(frictionHeat) || 0.0,
      lastVelocity: velocity ? velocity.clone() : new THREE.Vector3()
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
        dragCoefficient: parentParticle.dragCoefficient ?? BURST_BASE_DRAG,
        frictionHeat: 0.95
      });

      branches.push(branchParticle);
    }

    return branches;
  }
}
