import * as THREE from 'three';
import { FIREWORK_CONFIG } from '../config/fireworks.js';

export class BurstEffectProcessor {
  static getDynamicsProfile(dynamicsType, shapeType, preset = null) {
    const profiles = FIREWORK_CONFIG.DYNAMICS_PROFILES;
    if (!profiles) return null;

    // 1. Kiem tra cau hinh ghi de truc tiep trong preset
    if (preset?.dynamicsProfile && profiles[preset.dynamicsProfile]) {
      return profiles[preset.dynamicsProfile];
    }

    const normDynamics = (
      dynamicsType ||
      preset?.dynamicsType ||
      preset?.dynamics ||
      preset?.effectType ||
      ''
    ).toLowerCase();

    // 2. Tra cuu theo loai Dynamics
    if (
      normDynamics === 'willow' ||
      normDynamics === 'willow-up' ||
      normDynamics === 'willow-arch' ||
      normDynamics === 'kamuro' ||
      normDynamics === 'ghost-kamuro' ||
      normDynamics === 'falling-comets' ||
      normDynamics === 'falling-comets-glitter'
    ) {
      return profiles.willow;
    }

    if (normDynamics === 'crossette') {
      return profiles.crossette;
    }

    if (
      normDynamics === 'flow' ||
      normDynamics === 'snow' ||
      normDynamics === 'slow-burst' ||
      normDynamics === 'slow_burst' ||
      normDynamics === 'wave' ||
      normDynamics === 'falling-leaves' ||
      normDynamics === 'swimming-star' ||
      normDynamics === 'galaxy-spin'
    ) {
      return profiles.floating;
    }

    if (
      normDynamics === 'bouquet-comet' ||
      normDynamics === 'comet-ring' ||
      normDynamics === 'sparkling-branches' ||
      normDynamics === 'sparkling-branch-comet' ||
      normDynamics === 'tadpole-spiral' ||
      normDynamics === 'half-flash' ||
      normDynamics === 'split-flash'
    ) {
      return profiles.comet;
    }

    // 3. Tra cuu theo loai Shape hinh hoc duong vien
    const normShape = (
      shapeType ||
      preset?.shapeType ||
      preset?.shape ||
      ''
    ).toLowerCase();

    if (
      normShape === 'ring' ||
      normShape === 'heart' ||
      normShape === 'star' ||
      normShape === 'smiley' ||
      normShape === 'cat' ||
      normShape === 'fish' ||
      normShape === 'flower'
    ) {
      return profiles.geometric;
    }

    // 4. Mac dinh la profile standard
    return profiles.standard;
  }

  static isEffectActive(particle, effectName) {
    if (!particle) return false;

    const age = particle.age ?? 0;

    const normKey = (effectName === 'noTrail' || effectName === 'notrail')
      ? 'no-trail'
      : (effectName === 'tadpole_flurry')
        ? 'tadpole-flurry'
        : (effectName === 'erratic_dart')
          ? 'erratic-dart'
          : effectName;

    // Check multi-interval effectWindows first if attached to particle
    if (particle.effectWindows && particle.effectWindows[normKey]) {
      const windows = particle.effectWindows[normKey];
      for (let i = 0; i < windows.length; i++) {
        const w = windows[i];
        if (age >= w.start && age <= w.end) {
          return true;
        }
      }
      return false;
    }

    if (effectName === 'strobe' || effectName === 'white-strobe' || effectName === 'glitter-strobe') {
      if (particle.strobeStart !== undefined) {
        return age >= particle.strobeStart && age <= particle.strobeEnd;
      }
    } else if (effectName === 'ghost') {
      if (particle.ghostStart !== undefined) {
        return age >= particle.ghostStart && age <= particle.ghostEnd;
      }
    } else if (effectName === 'crackle') {
      if (particle.crackleStart !== undefined) {
        return age >= particle.crackleStart && age <= particle.crackleEnd;
      }
    } else if (effectName === 'tadpole-flurry' || effectName === 'tadpole_flurry') {
      if (particle.tadpoleStart !== undefined) {
        return age >= particle.tadpoleStart && age <= particle.tadpoleEnd;
      }
    } else if (effectName === 'burst-smoke') {
      if (particle.burstSmokeStart !== undefined) {
        return age >= particle.burstSmokeStart && age <= particle.burstSmokeEnd;
      }
    } else if (effectName === 'no-trail' || effectName === 'noTrail' || effectName === 'notrail') {
      if (particle.noTrailStart !== undefined) {
        return age >= particle.noTrailStart && age <= (particle.noTrailEnd ?? (particle.maxLife ?? 9999));
      }
      if (particle.hasNoTrail) {
        return true;
      }
    }

    if (particle.effectType === effectName) {
      return true;
    }
    if ((effectName === 'no-trail' || effectName === 'noTrail' || effectName === 'notrail')
      && (particle.effectType === 'no-trail' || particle.effectType === 'notrail' || particle.effectType === 'noTrail')) {
      return true;
    }

    const effects = Array.isArray(particle.effects) && particle.effects.length > 0
      ? particle.effects
      : (Array.isArray(particle.preset?.effects) ? particle.preset.effects : null);

    if (!effects) return false;

    const normTarget = (effectName === 'noTrail' || effectName === 'notrail')
      ? 'no-trail'
      : effectName;

    for (let i = 0; i < effects.length; i++) {
      const eff = effects[i];
      if (typeof eff === 'string') {
        const normEff = (eff === 'noTrail' || eff === 'notrail')
          ? 'no-trail'
          : eff;
        if (normEff === normTarget) return true;
      } else if (eff && typeof eff === 'object') {
        let type = eff.type || eff.key;
        if (type === 'noTrail' || type === 'notrail') {
          type = 'no-trail';
        }
        if (type === normTarget) {
          let start = eff.start !== undefined ? Number(eff.start) : 0;
          let end = eff.end !== undefined ? Number(eff.end) : (particle.maxLife ?? 9999);
          if (eff.startRatio !== undefined && !isNaN(eff.startRatio)) {
            start = Number(eff.startRatio) * (particle.maxLife ?? 1.0);
          }
          if (eff.endRatio !== undefined && !isNaN(eff.endRatio)) {
            end = Number(eff.endRatio) * (particle.maxLife ?? 1.0);
          }
          if (age >= start && age <= end) {
            return true;
          }
        }
      }
    }

    return false;
  }
  static SUPPORTED_EFFECTS = new Set([
    'standard',
    'crackle',
    'flow',
    'snow',
    'wave',
    'flower',
    'floral',
    'falling-leaves',
    'strobe',
    'white-strobe',
    'glitter-strobe',
    'heart',
    'oval',
    'falling-comets',
    'falling-comets-glitter',
    'crysanthemum-trail',
    'crysanthemum-smoke',
    'crysanthemum-spiral',
    'crysanthemum-spiral-v2',
    'crysanthemum-cc',
    'ghost',
    'galaxy-spin',
    'comet-ring',
    'bouquet-comet',
    'willow',
    'swimming-star',
    'ghost-kamuro',
    'double-helix',
    'no-trail',
    'notrail',
    'no-burst',
    'crossette',
    'sparkle-trail',
    'sparkle-apex',
    'sparkling-branch-comet',
    'tadpole-spiral',
    'long-burn',
    'apex-hang',
    'crysanthemum_discrete_trail',
    'crysanthemum-discrete-trail',
    'sphere_rings_wave',
    'sphere-rings-wave',
    'slow-burst',
    'slow_burst'
  ]);

  static effectsRegistry = new Map();

  static registerEffect(effectName, strategy) {
    this.effectsRegistry.set(effectName, strategy);
    this.SUPPORTED_EFFECTS.add(effectName);
  }

  static normalizeEffectType(effectType) {
    return this.SUPPORTED_EFFECTS.has(effectType) ? effectType : 'standard';
  }

  static clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  static lerp(start, end, t) {
    return start + (end - start) * t;
  }

  static createHeightProfile(height, config = {}) {
    const minHeight = config.minBurstY ?? 40;
    const maxHeight = config.maxBurstY ?? 300;
    const sizeMin = config.sizeMin ?? 0.85;
    const sizeMax = config.sizeMax ?? 1.55;
    const brightnessMin = config.brightnessMin ?? 0.9;
    const brightnessMax = config.brightnessMax ?? 1.9;
    const sizeCurve = config.sizeCurve ?? 0.9;
    const brightnessCurve = config.brightnessCurve ?? 1.15;

    const normalized = this.clamp((height - minHeight) / Math.max(maxHeight - minHeight, 1), 0, 1);
    const sizeT = Math.pow(normalized, sizeCurve);
    const brightnessT = Math.pow(normalized, brightnessCurve);

    return {
      normalized,
      sizeMultiplier: this.lerp(sizeMin, sizeMax, sizeT),
      brightnessMultiplier: this.lerp(brightnessMin, brightnessMax, brightnessT)
    };
  }

  static initialize(effectType, count, preset = null) {
    const normalizedEffect = this.normalizeEffectType(effectType);
    const rawEffects = Array.isArray(preset?.effects) ? preset.effects : [];
    const effectsList = rawEffects.map((e) => (typeof e === 'object' && e !== null ? (e.type || e.key) : e));
    const strobeEnabled = Boolean(preset?.strobe)
      || effectsList.includes('strobe')
      || effectsList.includes('white-strobe')
      || effectsList.includes('glitter-strobe');
    const crackleEnabled = Boolean(preset?.crackle) || effectsList.includes('crackle');
    const ghostEnabled = Boolean(preset?.ghost) || effectsList.includes('ghost') || normalizedEffect === 'ghost';
    const flowEnabled = Boolean(preset?.flow) || effectsList.includes('flow') || normalizedEffect === 'flow';
    const crossetteEnabled = Boolean(preset?.crossette) || effectsList.includes('crossette') || normalizedEffect === 'crossette';
    const slowBurstEnabled = Boolean(preset?.slowBurst)
      || Boolean(preset?.['slow-burst'])
      || Boolean(preset?.slow_burst)
      || effectsList.includes('slow-burst')
      || effectsList.includes('slow_burst')
      || normalizedEffect === 'slow-burst'
      || normalizedEffect === 'slow_burst';

    const noTrailObj = rawEffects.find(
      (e) => typeof e === 'object'
        && e !== null
        && ((e.type || e.key) === 'no-trail' || (e.type || e.key) === 'notrail' || (e.type || e.key) === 'noTrail')
    );
    const hasStaticNoTrail = Boolean(preset?.noTrail)
      || effectsList.includes('no-trail')
      || effectsList.includes('notrail')
      || normalizedEffect === 'notrail'
      || normalizedEffect === 'no-trail';
    const noTrailTiming = noTrailObj ? {
      start: noTrailObj.start !== undefined ? Number(noTrailObj.start) : undefined,
      end: noTrailObj.end !== undefined ? Number(noTrailObj.end) : undefined,
      startRatio: noTrailObj.startRatio !== undefined ? Number(noTrailObj.startRatio) : undefined,
      endRatio: noTrailObj.endRatio !== undefined ? Number(noTrailObj.endRatio) : undefined
    } : null;

    const spin = new Float32Array(count);
    const phase = new Float32Array(count);
    const turbulence = new Float32Array(count);

    let currentStrobePhase = 0;
    for (let i = 0; i < count; i++) {
      spin[i] = (Math.random() - 0.5) * 3.2;

      if (strobeEnabled || normalizedEffect === 'strobe' || normalizedEffect === 'white-strobe' || normalizedEffect === 'glitter-strobe' || normalizedEffect === 'falling-comets-glitter') {
        if (i % 12 === 0) currentStrobePhase = Math.random() * Math.PI * 2;
        phase[i] = currentStrobePhase;
      } else {
        phase[i] = Math.random() * Math.PI * 2;
      }

      turbulence[i] = 0.25 + Math.random() * 0.95;
    }

    let ghostAxis = { x: 1, y: 0, z: 0 };
    if (ghostEnabled) {
      const vec = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
      ghostAxis = { x: vec.x, y: vec.y, z: vec.z };
    }

    return {
      effectType: normalizedEffect,
      strobe: strobeEnabled,
      crackle: crackleEnabled,
      ghost: ghostEnabled,
      flow: flowEnabled,
      crossette: crossetteEnabled,
      slowBurst: slowBurstEnabled,
      noTrail: hasStaticNoTrail && !noTrailTiming,
      noTrailTiming,
      spin,
      phase,
      turbulence,
      ghostAxis
    };
  }

  static materialOpacity(effectType, age, maxLife, baseOpacity) {
    const normalizedEffect = this.normalizeEffectType(effectType);
    const strategy = this.effectsRegistry.get(normalizedEffect);
    if (strategy && typeof strategy.materialOpacity === 'function') {
      return strategy.materialOpacity(age, maxLife, baseOpacity);
    }
    return baseOpacity;
  }

  static updateVelocity(velocity, index, deltaTime, age, maxLife, effectState) {
    const effectType = this.normalizeEffectType(effectState?.effectType ?? 'standard');

    let gravityScale = 0.3;
    let dragCoefficient = undefined;
    let emitSpark = false;
    let spawnTrail = false;
    let trailLife = 0.8;
    let trailIntensity = 0.35;
    let trailSpawnChance = undefined;
    let spawnSmoke = false;
    let smokeLife = 2.5;
    let smokeOpacity = 0.15;

    // Delegate to strategy from registry
    const strategy = this.effectsRegistry.get(effectType);
    if (strategy && typeof strategy.updateVelocity === 'function') {
      const overrides = strategy.updateVelocity(velocity, index, deltaTime, age, maxLife, effectState);
      if (overrides) {
        if (overrides.gravityScale !== undefined) gravityScale = overrides.gravityScale;
        if (overrides.dragCoefficient !== undefined) dragCoefficient = overrides.dragCoefficient;
        if (overrides.drag !== undefined) dragCoefficient = overrides.drag;
        if (overrides.emitSpark !== undefined) emitSpark = overrides.emitSpark;
        if (overrides.spawnTrail !== undefined) spawnTrail = overrides.spawnTrail;
        if (overrides.trailLife !== undefined) trailLife = overrides.trailLife;
        if (overrides.trailIntensity !== undefined) trailIntensity = overrides.trailIntensity;
        if (overrides.trailSpawnChance !== undefined) trailSpawnChance = overrides.trailSpawnChance;
        if (overrides.spawnSmoke !== undefined) spawnSmoke = overrides.spawnSmoke;
        if (overrides.smokeLife !== undefined) smokeLife = overrides.smokeLife;
        if (overrides.smokeOpacity !== undefined) smokeOpacity = overrides.smokeOpacity;
      }
    }

    // Apply modular overrides for strobe, crackle, and flow on top of other effects
    if (effectState?.strobe && effectType !== 'strobe' && effectType !== 'white-strobe' && effectType !== 'glitter-strobe') {
      gravityScale = 0.2;
      velocity.multiplyScalar(0.996);
    }

    if (effectState?.crackle && effectType !== 'crackle') {
      gravityScale = 0.18;
      const jitter = (effectState.turbulence[index] || 1) * 0.03;
      velocity.x += (Math.random() - 0.5) * jitter;
      velocity.y += (Math.random() - 0.5) * jitter * 0.5;
      velocity.z += (Math.random() - 0.5) * jitter;
      emitSpark = false;
    }

    if (effectState?.flow && effectType !== 'flow') {
      const spinAmount = (effectState.spin[index] || 0) * deltaTime;
      const cos = Math.cos(spinAmount);
      const sin = Math.sin(spinAmount);
      const oldX = velocity.x;
      const oldZ = velocity.z;
      velocity.x = oldX * cos - oldZ * sin;
      velocity.z = oldX * sin + oldZ * cos;
      velocity.y += Math.sin(age * 3 + (effectState.phase[index] || 0)) * 0.02;
      velocity.multiplyScalar(0.998);
      gravityScale = Math.min(gravityScale, 0.12);
      spawnTrail = true;
      trailLife = Math.max(trailLife, 0.25);
      trailIntensity = Math.max(trailIntensity, 0.3);
    }

    if (effectState?.slowBurst && effectType !== 'snow' && effectType !== 'slow-burst' && effectType !== 'slow_burst') {
      const drift = Math.sin(age * 2 + (effectState.phase[index] || 0)) * 0.04;
      velocity.x += drift * deltaTime;
      velocity.z += drift * deltaTime * 0.7;
      velocity.multiplyScalar(0.996);
      gravityScale = Math.min(gravityScale, 0.05);
    }

    // Custom shape logic for half-flash comets (jellyfish tentacles)
    if (effectState?.shapeType === 'half-flash') {
      const numBeams = 4;
      const halfCount = effectState.phase.length - numBeams;
      if (index >= halfCount) {
        spawnTrail = true;
        trailLife = 0.42;
        trailIntensity = 0.85;
      }
    }

    // Custom shape logic for split-flash comets (equatorial beams)
    if (effectState?.shapeType === 'split-flash') {
      const numBeams = 5;
      const halfCount = effectState.phase.length - numBeams;
      if (index >= halfCount) {
        spawnTrail = true;
        trailLife = 0.38;
        trailIntensity = 0.9;
      }
    }

    if (effectState?.noTrail) {
      spawnTrail = false;
    } else if (effectState?.noTrailTiming) {
      const timing = effectState.noTrailTiming;
      const start = timing.startRatio !== undefined
        ? timing.startRatio * maxLife
        : (timing.start ?? 0);
      const end = timing.endRatio !== undefined
        ? timing.endRatio * maxLife
        : (timing.end ?? maxLife);
      if (age >= start && age <= end) {
        spawnTrail = false;
      }
    }

    return {
      gravityScale,
      dragCoefficient,
      emitSpark,
      spawnTrail,
      trailLife,
      trailIntensity,
      trailSpawnChance,
      spawnSmoke,
      smokeLife,
      smokeOpacity
    };
  }

  static processErraticDart(particle, deltaTime, lifeRatio, baseGravityScale) {
    if (!particle.hasErraticDart) {
      return baseGravityScale;
    }

    const dartCfg = FIREWORK_CONFIG.ERRATIC_DART || {};

    const triggerCondition = particle.erraticDartTriggerTime !== undefined
      ? particle.age >= particle.erraticDartTriggerTime
      : lifeRatio >= (particle.erraticDartTriggerRatio ?? 0.72);

    if (!particle.erraticDartTriggered && triggerCondition) {
      particle.erraticDartTriggered = true;
      const minSpeed = dartCfg.dartSpeedMin ?? 36.0;
      const maxSpeed = dartCfg.dartSpeedMax ?? 54.0;
      const newSpeed = minSpeed + Math.random() * (maxSpeed - minSpeed);

      const randTheta = Math.random() * Math.PI * 2;
      const randPhi = Math.acos(Math.random() * 2 - 1);
      const randDir = new THREE.Vector3(
        Math.sin(randPhi) * Math.cos(randTheta),
        Math.sin(randPhi) * Math.sin(randTheta),
        Math.cos(randPhi)
      );

      const curSpeed = particle.velocity.length();
      if (curSpeed > 0.1) {
        const forward = particle.velocity.clone().normalize();
        randDir.addScaledVector(forward, 0.20).normalize();
      }

      particle.velocity.copy(randDir.multiplyScalar(newSpeed));
      particle.dragCoefficient = dartCfg.dragAfterDart ?? 0.12;
      const boostDuration = dartCfg.boostLifeDuration ?? 0.95;
      particle.maxLife = particle.age + boostDuration;
      particle.erraticDartFlash = dartCfg.flashBrightnessMultiplier ?? 3.8;

      // Thiet lap toi da 1-2 nhip be goc gap khuc thay vi luon song lien tuc
      const maxKinks = dartCfg.maxKinks ?? 2;
      const totalKinks = (Math.random() < 0.60 && maxKinks >= 2) ? 2 : 1;
      const t1 = 0.10 + Math.random() * 0.08;
      particle.erraticDartKinkTimes = totalKinks === 2
        ? [
            t1,
            t1 + 0.22 + Math.random() * 0.16
          ]
        : [
            0.14 + Math.random() * 0.14
          ];
      particle.erraticDartKinkIndex = 0;
      particle.erraticDartTimer = 0;
    }

    let finalGravityScale = baseGravityScale;
    if (particle.erraticDartTriggered) {
      finalGravityScale = 0.05;
      if (particle.erraticDartFlash && particle.erraticDartFlash > 1.0) {
        particle.erraticDartFlash = Math.max(
          1.0,
          particle.erraticDartFlash - deltaTime * 1.8
        );
      }

      // Khoi tao luoi cac moc gap khuc neu hat da kich hoat tu truoc
      if (!particle.erraticDartKinkTimes) {
        const maxKinks = dartCfg.maxKinks ?? 2;
        const totalKinks = (Math.random() < 0.60 && maxKinks >= 2) ? 2 : 1;
        const t1 = 0.10 + Math.random() * 0.08;
        particle.erraticDartKinkTimes = totalKinks === 2
          ? [
              t1,
              t1 + 0.22 + Math.random() * 0.16
            ]
          : [
              0.14 + Math.random() * 0.14
            ];
        particle.erraticDartKinkIndex = 0;
        particle.erraticDartTimer = 0;
      }

      particle.erraticDartTimer = (particle.erraticDartTimer || 0) + deltaTime;

      const curSpeed = particle.velocity.length();
      if (curSpeed > 1.0 && particle.erraticDartKinkTimes) {
        const kinkIdx = particle.erraticDartKinkIndex ?? 0;
        if (
          kinkIdx < particle.erraticDartKinkTimes.length &&
          particle.erraticDartTimer >= particle.erraticDartKinkTimes[kinkIdx]
        ) {
          // Thuc hien cu be goc gap khuc dut khoat (sharp angular kink)
          particle.erraticDartKinkIndex = kinkIdx + 1;

          const dir = particle.velocity.clone().normalize();
          const upVec = Math.abs(dir.y) > 0.88
            ? new THREE.Vector3(1, 0, 0)
            : new THREE.Vector3(0, 1, 0);
          const rightVec = new THREE.Vector3()
            .crossVectors(dir, upVec)
            .normalize();
          const normalVec = new THREE.Vector3()
            .crossVectors(rightVec, dir)
            .normalize();

          // Vector vuong goc ngau nhien 360 do quanh truc bay 3D
          const roll = Math.random() * Math.PI * 2;
          const perpVec = new THREE.Vector3()
            .addScaledVector(rightVec, Math.cos(roll))
            .addScaledVector(normalVec, Math.sin(roll))
            .normalize();

          // Goc be gap khuc nhon (tao duong gap khuc dut khoat thay vi luon)
          const angleMin = dartCfg.kinkAngleMin ?? 42.0;
          const angleMax = dartCfg.kinkAngleMax ?? 68.0;
          const kinkAngleDeg = angleMin + Math.random() * (angleMax - angleMin);
          const kinkAngleRad = (kinkAngleDeg * Math.PI) / 180.0;

          // Huong moi sau khi gap khuc, bao toan do lon van toc
          const newDir = new THREE.Vector3()
            .addScaledVector(dir, Math.cos(kinkAngleRad))
            .addScaledVector(perpVec, Math.sin(kinkAngleRad))
            .normalize();

          particle.velocity.copy(newDir.multiplyScalar(curSpeed));

          // Chop sang nhe tai dinh goc gap khuc
          const kinkFlash = dartCfg.kinkFlashMultiplier ?? 2.6;
          particle.erraticDartFlash = Math.max(
            particle.erraticDartFlash || 1.0,
            kinkFlash
          );
        }
      }
    }

    return finalGravityScale;
  }

  static resolveParticleColor(particle, lifeRatio, options = {}) {
    const {
      strobeFreqMultiplier = 1.0,
      isSpiralIgnited = true,
      spiralFlashBonus = 1.0,
      isRingIgnited = true,
      ringFlashBonus = 1.0,
      hasGhostFlare = false,
      profile = null
    } = options;

    let r = particle.baseColor.r;
    let g = particle.baseColor.g;
    let b = particle.baseColor.b;

    if (particle.hasErraticDart && particle.erraticDartTriggered) {
      // Dau hat giu nguyen do sang va mau sac ban dau trong suot pha vut
      const hasWhiteStrobe = particle.effectType === 'white-strobe'
        || (Array.isArray(particle.effects) && particle.effects.includes('white-strobe'))
        || (Array.isArray(particle.preset?.effects) && particle.preset.effects.includes('white-strobe'));
      if (hasWhiteStrobe) {
        const strobeT = (Math.sin(particle.age * 38.0 * strobeFreqMultiplier) + 1.0) * 0.5;
        r = THREE.MathUtils.lerp(r, 2.2, strobeT);
        g = THREE.MathUtils.lerp(g, 2.2, strobeT);
        b = THREE.MathUtils.lerp(b, 2.2, strobeT);
      }
      return { r, g, b };
    }

    const hasStrobeTiming = (particle.effectWindows && (particle.effectWindows.strobe || particle.effectWindows['white-strobe'] || particle.effectWindows['glitter-strobe']))
      || (Array.isArray(particle.effects) && particle.effects.some((e) => typeof e === 'object' && e !== null && ['strobe', 'white-strobe', 'glitter-strobe'].includes(e.type || e.key)));

    const hasWhiteStrobe = BurstEffectProcessor.isEffectActive(particle, 'white-strobe');

    const hasGlitterStrobe = BurstEffectProcessor.isEffectActive(particle, 'glitter-strobe')
      || particle.effectType === 'falling-comets-glitter';

    const hasStandardStrobe = (
      BurstEffectProcessor.isEffectActive(particle, 'strobe')
      || (!hasStrobeTiming && (particle.preset?.strobe || particle.effectState?.strobe))
    ) && particle.preset?.shellType !== 'crysanthemumNested';

    const hasGhostTiming = (particle.effectWindows && particle.effectWindows.ghost)
      || (Array.isArray(particle.effects) && particle.effects.some((e) => typeof e === 'object' && e !== null && (e.type || e.key) === 'ghost'));

    const isGhostActive = BurstEffectProcessor.isEffectActive(particle, 'ghost');
    const hasGhost = isGhostActive
      || (!hasGhostTiming && (Boolean(particle.preset?.ghost) || particle.preset?.shellType === 'ghost'));

    const hasCC = particle.effectType === 'crysanthemum-cc'
      || (Array.isArray(particle.effects) && particle.effects.includes('crysanthemum-cc'))
      || (Array.isArray(particle.preset?.effects) && particle.preset.effects.includes('crysanthemum-cc'))
      || particle.preset?.shellType === 'crysanthemumCC';

    if (particle.effectType === 'sparking') {
      const randomOffset = ((particle.particleIndex * 7) % 11) * 0.01;
      const transitionStart = 0.46 + randomOffset;
      const transitionEnd = transitionStart + 0.08;

      if (particle.particleIndex % 2 !== 0) {
        if (lifeRatio > transitionEnd) {
          r = 0; g = 0; b = 0;
        } else if (lifeRatio > transitionStart) {
          const fade = (transitionEnd - lifeRatio) / (transitionEnd - transitionStart);
          r = particle.baseColor.r * fade;
          g = particle.baseColor.g * fade;
          b = particle.baseColor.b * fade;
        }
      }
    } else if (hasWhiteStrobe) {
      const timeMs = (particle.age + particle.phase) * 1000;
      const strobeFreq = Math.max(150, 450 - (lifeRatio - 0.5) * 600) * strobeFreqMultiplier;
      const isBlinking = Math.floor(timeMs / strobeFreq) % 3 === 0;
      const blink = isBlinking ? 1.0 : 0.05;
      r = blink;
      g = blink;
      b = blink;
    } else if (hasGlitterStrobe) {
      const timeMs = (particle.age + particle.phase) * 1000;
      const strobeFreq = 90 * strobeFreqMultiplier;
      const isBlinking = Math.floor(timeMs / strobeFreq) % 4 === 0;
      const blink = isBlinking ? 1.5 : 0.0;
      r = blink;
      g = blink;
      b = blink;
    } else if (
      particle.isDyingEmber
      || (particle.preset?.shellType === 'crysanthemumNestedChild' && particle.preset?.strobe)
    ) {
      const timeMs = (particle.age + particle.phase) * 1000;
      const strobeFreq = 120 * strobeFreqMultiplier;
      const isBlinking = Math.floor(timeMs / strobeFreq) % 7 === 0;
      const blink = isBlinking ? 1.5 : 0.06;

      const coolFactor = Math.pow(1.0 - lifeRatio, 0.85);

      r = particle.baseColor.r * blink * coolFactor;
      g = particle.baseColor.g * blink * coolFactor;
      b = particle.baseColor.b * blink * coolFactor;
    } else if (hasStandardStrobe) {
      if ((particle.effectType === 'sphere_rings_wave' || particle.effectType === 'sphere-rings-wave') && !isRingIgnited) {
        r = 0;
        g = 0;
        b = 0;
      } else {
        const timeMs = (particle.age + particle.phase) * 1000;
        const strobeFreq = 150 * strobeFreqMultiplier;
        const isBlinking = Math.floor(timeMs / strobeFreq) % 3 === 0;
        const blink = isBlinking ? 1.0 : 0.0;

        if (particle.preset?.shellType === 'strobe') {
          r = blink;
          g = blink;
          b = blink;
        } else {
          r = particle.baseColor.r * blink;
          g = particle.baseColor.g * blink;
          b = particle.baseColor.b * blink;
        }
      }
    } else if (hasGhost) {
      let intensity = 0.0;
      if (lifeRatio < 0.40) {
        intensity = 0.0;
      } else if (lifeRatio < 0.48) {
        const t = (lifeRatio - 0.40) / 0.08;
        intensity = THREE.MathUtils.lerp(0.0, 1.35, Math.sin(t * Math.PI * 0.5));
      } else if (lifeRatio < 0.85) {
        intensity = 1.0;
      } else {
        const t = (lifeRatio - 0.85) / 0.15;
        intensity = Math.max(0.0, 1.0 - t);
      }
      r = particle.baseColor.r * intensity;
      g = particle.baseColor.g * intensity;
      b = particle.baseColor.b * intensity;
    } else if (hasCC && particle.color2) {
      if (lifeRatio < 0.40) {
        r = particle.baseColor.r;
        g = particle.baseColor.g;
        b = particle.baseColor.b;
      } else if (lifeRatio < 0.48) {
        const t = (lifeRatio - 0.40) / 0.08;
        const flashMultiplier = 1.0 + Math.sin(t * Math.PI) * 0.35;
        r = THREE.MathUtils.lerp(particle.baseColor.r, particle.color2.r, t) * flashMultiplier;
        g = THREE.MathUtils.lerp(particle.baseColor.g, particle.color2.g, t) * flashMultiplier;
        b = THREE.MathUtils.lerp(particle.baseColor.b, particle.color2.b, t) * flashMultiplier;
      } else if (lifeRatio < 0.85) {
        r = particle.color2.r;
        g = particle.color2.g;
        b = particle.color2.b;
      } else {
        const t = (lifeRatio - 0.85) / 0.15;
        const fade = Math.max(0.0, 1.0 - t);
        r = particle.color2.r * fade;
        g = particle.color2.g * fade;
        b = particle.color2.b * fade;
      }
    } else if (particle.effectType === 'crysanthemum-spiral' || particle.effectType === 'crysanthemum-spiral-v2') {
      if (!isSpiralIgnited) {
        r = particle.baseColor.r * 0.02;
        g = particle.baseColor.g * 0.02;
        b = particle.baseColor.b * 0.02;
      } else {
        r = Math.min(2.0, particle.baseColor.r * spiralFlashBonus);
        g = Math.min(2.0, particle.baseColor.g * spiralFlashBonus);
        b = Math.min(2.0, particle.baseColor.b * spiralFlashBonus);
      }
    } else if (particle.effectType === 'sphere_rings_wave' || particle.effectType === 'sphere-rings-wave') {
      if (!isRingIgnited) {
        r = particle.baseColor.r * 0.01;
        g = particle.baseColor.g * 0.01;
        b = particle.baseColor.b * 0.01;
      } else {
        r = Math.min(2.5, particle.baseColor.r * ringFlashBonus);
        g = Math.min(2.5, particle.baseColor.g * ringFlashBonus);
        b = Math.min(2.5, particle.baseColor.b * ringFlashBonus);
      }
    } else if (hasGhostFlare) {
      if (lifeRatio < 0.32) {
        r = particle.baseColor.r;
        g = particle.baseColor.g;
        b = particle.baseColor.b;
      } else if (lifeRatio <= 0.60) {
        r = particle.baseColor.r * 0.02;
        g = particle.baseColor.g * 0.02;
        b = particle.baseColor.b * 0.02;
      } else {
        const flashProgress = (lifeRatio - 0.60) / 0.40;
        const reigniteIntensity = 1.6 * (1.0 - flashProgress * 0.4);
        r = Math.min(2.0, particle.baseColor.r * reigniteIntensity);
        g = Math.min(2.0, particle.baseColor.g * reigniteIntensity);
        b = Math.min(2.0, particle.baseColor.b * reigniteIntensity);
      }
    } else if (particle.effectType === 'double-helix') {
      if (particle.color2) {
        const strandFactor = (particle.particleIndex % 2 === 0) ? 0.0 : 0.4;
        const blendT = Math.min(1.0, lifeRatio * 0.7 + strandFactor);
        r = particle.baseColor.r * (1.0 - blendT) + particle.color2.r * blendT;
        g = particle.baseColor.g * (1.0 - blendT) + particle.color2.g * blendT;
        b = particle.baseColor.b * (1.0 - blendT) + particle.color2.b * blendT;
      }
    } else if (profile?.thermalCooling !== false) {
      if (particle.isSecondBurstChild) {
        // Second burst child particles: suppress white incandescent flash resonance
        // Preserve rich chromatic saturation instead of bleaching to white
        const attenuationStart = profile?.attenuationStart ?? 0.35;
        if (lifeRatio < 0.12) {
          const flashT = 1.0 - (lifeRatio / 0.12);
          r = r * (1.0 + flashT * 0.15);
          g = g * (1.0 + flashT * 0.15);
          b = b * (1.0 + flashT * 0.15);
        } else if (lifeRatio >= attenuationStart && lifeRatio <= 0.65) {
          const attenProgress = (lifeRatio - attenuationStart) / (0.65 - attenuationStart);
          const attenFactor = 1.0 - attenProgress * 0.15;
          r *= attenFactor;
          g *= attenFactor;
          b *= attenFactor;
        } else if (lifeRatio > 0.65) {
          if (lifeRatio < 0.90) {
            const coolT = (lifeRatio - 0.65) / 0.25;
            r = THREE.MathUtils.lerp(r, r * 0.75, coolT);
            g = THREE.MathUtils.lerp(g, g * 0.75, coolT);
            b = THREE.MathUtils.lerp(b, b * 0.75, coolT);
          } else {
            const emberT = (lifeRatio - 0.90) / 0.10;
            r = THREE.MathUtils.lerp(r * 0.75, r * 0.45, emberT);
            g = THREE.MathUtils.lerp(g * 0.75, g * 0.45, emberT);
            b = THREE.MathUtils.lerp(b * 0.75, b * 0.45, emberT);
          }
        }
      } else {
        const ignitionEnd = 0.035;
        const flashEnd = profile?.flashEnd ?? 0.12;
        const attenuationStart = profile?.attenuationStart ?? 0.35;
        const coolingStart = profile?.coolingStart ?? 0.55;
        const emberStart = profile?.emberStart ?? 0.85;

        if (lifeRatio < flashEnd) {
          let flashT;
          if (lifeRatio < ignitionEnd) {
            // Pha 1: Bắt lửa bừng cháy vọt lên đỉnh nhiệt (Ignition flare-up ramp)
            const igniteProgress = lifeRatio / ignitionEnd;
            flashT = THREE.MathUtils.smoothstep(
              igniteProgress,
              0.0,
              1.0
            );
          } else {
            // Pha 2: Chuyển giao mượt mà từ đỉnh chói sang màu sắc hóa học ổn định
            const decayProgress = (lifeRatio - ignitionEnd) / (flashEnd - ignitionEnd);
            flashT = 1.0 - decayProgress;
          }
          r = THREE.MathUtils.lerp(
            r,
            Math.max(r, 1.65),
            flashT
          );
          g = THREE.MathUtils.lerp(
            g,
            Math.max(g, 1.55),
            flashT
          );
          b = THREE.MathUtils.lerp(
            b,
            Math.max(b, 1.35),
            flashT
          );
        } else if (lifeRatio >= attenuationStart && lifeRatio < coolingStart) {
          // Giai đoạn bắt đầu đạt đỉnh nở và rơi xuống (Apex to Fall Transition):
          // Ánh sáng phát ra từ từ dịu bớt khi động năng bung giảm và trọng lực bắt đầu kéo hạt rơi
          const attenProgress = (lifeRatio - attenuationStart) / (coolingStart - attenuationStart);
          const attenFactor = 1.0 - attenProgress * 0.20;
          r *= attenFactor;
          g *= attenFactor;
          b *= attenFactor;
        } else if (lifeRatio >= coolingStart) {
          if (lifeRatio < emberStart) {
            const coolT = (lifeRatio - coolingStart) / (emberStart - coolingStart);
            const baseFactor = 0.80 * (1.0 - coolT * 0.20);
            r = THREE.MathUtils.lerp(
              r * baseFactor,
              1.0 * baseFactor,
              coolT * 0.55
            );
            g = THREE.MathUtils.lerp(
              g * baseFactor,
              0.46 * baseFactor,
              coolT * 0.55
            );
            b = THREE.MathUtils.lerp(
              b * baseFactor,
              0.08 * baseFactor,
              coolT * 0.78
            );
          } else {
            const emberT = (lifeRatio - emberStart) / (1.0 - emberStart);
            r = THREE.MathUtils.lerp(
              r * 0.64,
              0.45,
              emberT
            );
            g = THREE.MathUtils.lerp(
              g * 0.36,
              0.06,
              emberT
            );
            b = THREE.MathUtils.lerp(
              b * 0.14,
              0.01,
              emberT
            );
          }
        }
      }
    }

    // Kích nhiệt ma sát khí động học (Friction Ram Heating):
    // Khi hạt chịu biến thiên vận tốc đột ngột, lõi hạt nóng sáng rực rỡ (incandescent core boost)
    if (particle.frictionHeat && particle.frictionHeat > 0.02) {
      const heat = Math.min(1.0, particle.frictionHeat);
      r = THREE.MathUtils.lerp(r, Math.max(r, 2.2), heat * 0.75);
      g = THREE.MathUtils.lerp(g, Math.max(g, 2.1), heat * 0.75);
      b = THREE.MathUtils.lerp(b, Math.max(b, 1.8), heat * 0.75);
    }

    return { r, g, b };
  }
}

// Register default strategies (OCP compliance)
BurstEffectProcessor.registerEffect('standard', {
  updateVelocity() {
    return { gravityScale: 0.3 };
  }
});

BurstEffectProcessor.registerEffect('flow', {
  updateVelocity(velocity, index, deltaTime, age, maxLife, effectState) {
    const spinAmount = (effectState.spin[index] || 0) * deltaTime;
    const cos = Math.cos(spinAmount);
    const sin = Math.sin(spinAmount);
    const oldX = velocity.x;
    const oldZ = velocity.z;
    velocity.x = oldX * cos - oldZ * sin;
    velocity.z = oldX * sin + oldZ * cos;
    velocity.y += Math.sin(age * 3 + (effectState.phase[index] || 0)) * 0.02;
    velocity.multiplyScalar(0.998);
    return { gravityScale: 0.08, spawnTrail: true, trailLife: 0.25, trailIntensity: 0.3 };
  }
});

BurstEffectProcessor.registerEffect('snow', {
  updateVelocity(velocity, index, deltaTime, age, maxLife, effectState) {
    const drift = Math.sin(age * 2 + (effectState.phase[index] || 0)) * 0.04;
    velocity.x += drift * deltaTime;
    velocity.z += drift * deltaTime * 0.7;
    velocity.multiplyScalar(0.996);
    return { gravityScale: 0.05 };
  }
});

const snowStrategy = BurstEffectProcessor.effectsRegistry.get('snow');
BurstEffectProcessor.registerEffect('slow-burst', snowStrategy);
BurstEffectProcessor.registerEffect('slow_burst', snowStrategy);

BurstEffectProcessor.registerEffect('crackle', {
  updateVelocity(velocity, index, deltaTime, age, maxLife, effectState) {
    const jitter = (effectState.turbulence[index] || 1) * 0.03;
    velocity.x += (Math.random() - 0.5) * jitter;
    velocity.y += (Math.random() - 0.5) * jitter * 0.5;
    velocity.z += (Math.random() - 0.5) * jitter;
    return { gravityScale: 0.18, emitSpark: false };
  }
});

BurstEffectProcessor.registerEffect('wave', {
  materialOpacity(age, maxLife, baseOpacity) {
    const blinkSpeed = 38;
    const blink = Math.sin(age * blinkSpeed) > 0 ? 1 : 0.2;
    return Math.max(0, Math.min(1, baseOpacity * blink));
  },
  updateVelocity(velocity, index, deltaTime, age, maxLife, effectState) {
    velocity.y += Math.sin(age * 8 + (effectState.phase[index] || 0)) * 0.03;
    return { gravityScale: 0.22 };
  }
});

BurstEffectProcessor.registerEffect('strobe', {
  updateVelocity(velocity) {
    velocity.multiplyScalar(0.996);
    return { gravityScale: 0.2 };
  }
});

BurstEffectProcessor.registerEffect('white-strobe', {
  updateVelocity(velocity) {
    velocity.multiplyScalar(0.996);
    return { gravityScale: 0.2 };
  }
});

BurstEffectProcessor.registerEffect('glitter-strobe', {
  updateVelocity(velocity) {
    velocity.multiplyScalar(0.996);
    return { gravityScale: 0.2 };
  }
});

BurstEffectProcessor.registerEffect('heart', {
  materialOpacity(age, maxLife, baseOpacity) {
    const pulse = 0.78 + Math.sin(age * 12) * 0.18;
    return Math.max(0, Math.min(1, baseOpacity * pulse));
  },
  updateVelocity(velocity, index, deltaTime, age, maxLife, effectState) {
    velocity.y += Math.sin(age * 6 + (effectState.phase[index] || 0)) * 0.018;
    velocity.x *= 0.998;
    velocity.z *= 0.998;
    return { gravityScale: 0.24 };
  }
});

BurstEffectProcessor.registerEffect('oval', {
  materialOpacity(age, maxLife, baseOpacity) {
    const softness = 0.88 + Math.sin(age * 4.5) * 0.08;
    return Math.max(0, Math.min(1, baseOpacity * softness));
  },
  updateVelocity(velocity, index, deltaTime, age, maxLife, effectState) {
    const spinAmount = (effectState.spin[index] || 0) * deltaTime * 0.4;
    const cos = Math.cos(spinAmount);
    const sin = Math.sin(spinAmount);
    const oldX = velocity.x;
    const oldZ = velocity.z;
    velocity.x = oldX * cos - oldZ * sin;
    velocity.z = oldX * sin + oldZ * cos;
    velocity.multiplyScalar(0.997);
    return { gravityScale: 0.16 };
  }
});

BurstEffectProcessor.registerEffect('flower', {
  updateVelocity(velocity) {
    velocity.multiplyScalar(0.997);
    return { gravityScale: 0.2 };
  }
});

BurstEffectProcessor.registerEffect('floral', {
  updateVelocity(velocity) {
    velocity.multiplyScalar(0.997);
    return { gravityScale: 0.2 };
  }
});

BurstEffectProcessor.registerEffect('falling-leaves', {
  updateVelocity(velocity, index, deltaTime, age, maxLife, effectState) {
    const drift = Math.sin(age * 3 + (effectState.phase[index] || 0)) * 0.06;
    velocity.x += drift * deltaTime;
    velocity.z += drift * deltaTime * 0.8;
    velocity.multiplyScalar(0.995);
    return { gravityScale: 0.06 };
  }
});

BurstEffectProcessor.registerEffect('falling-comets', {
  updateVelocity() {
    return { gravityScale: 0.25, spawnTrail: true, trailLife: 0.55, trailIntensity: 0.35 };
  }
});

BurstEffectProcessor.registerEffect('falling-comets-glitter', {
  updateVelocity() {
    return { gravityScale: 0.25, spawnTrail: true, trailLife: 0.55, trailIntensity: 0.35 };
  }
});

BurstEffectProcessor.registerEffect('crysanthemum-trail', {
  updateVelocity() {
    return { gravityScale: 0.3, spawnTrail: true, trailLife: 0.45, trailIntensity: 0.9 };
  }
});

BurstEffectProcessor.registerEffect('crysanthemum-smoke', {
  updateVelocity() {
    return { gravityScale: 0.3, spawnSmoke: true, smokeLife: 3.8, smokeOpacity: 0.20 };
  }
});

BurstEffectProcessor.registerEffect('crysanthemum-spiral', {
  updateVelocity(velocity) {
    velocity.multiplyScalar(0.996);
    return {
      gravityScale: 0.28,
      spawnTrail: true,
      trailLife: 0.45,
      trailIntensity: 0.95
    };
  }
});

BurstEffectProcessor.registerEffect('crysanthemum-spiral-v2', {
  updateVelocity(velocity) {
    velocity.multiplyScalar(0.996);
    return {
      gravityScale: 0.28,
      spawnTrail: true,
      trailLife: 0.50,
      trailIntensity: 1.0
    };
  }
});

BurstEffectProcessor.registerEffect('crysanthemum_discrete_trail', {
  updateVelocity(velocity, index, deltaTime, age) {
    // Vận tốc riêng bung nở giảm dần êm dịu theo thời gian
    velocity.multiplyScalar(0.992);

    // Vừa bung ra vừa chịu trọng lực liên tục ngay từ đầu (~1G tự nhiên)
    // kết hợp với vận tốc riêng giảm dần để vẽ nên quỹ đạo đường cong rủ xuống mềm mại
    const gravityScale = 0.32;

    // Vệt đuôi dài (trailLife: 1.45s) nhưng cực kỳ rời rạc (tỷ lệ sinh dao động ngắt quãng)
    const wave = Math.sin(age * 20.0 + (index * 7.13) % 6.28);
    const isDropletPulse = wave > 0.55;
    const trailSpawnChance = isDropletPulse ? 0.42 : 0.04;

    return {
      gravityScale,
      dragCoefficient: 0.68,
      spawnTrail: true,
      trailLife: 1.45,
      trailIntensity: 0.90,
      trailSpawnChance
    };
  }
});

BurstEffectProcessor.registerEffect('crysanthemum-discrete-trail', {
  updateVelocity(velocity, index, deltaTime, age, maxLife, effectState) {
    const strategy = BurstEffectProcessor.effectsRegistry.get('crysanthemum_discrete_trail');
    return strategy.updateVelocity(velocity, index, deltaTime, age, maxLife, effectState);
  }
});

BurstEffectProcessor.registerEffect('crysanthemum-cc', {
  materialOpacity(age, maxLife, baseOpacity) {
    const lifeRatio = maxLife > 0 ? age / maxLife : 0;
    if (lifeRatio < 0.85) {
      return baseOpacity;
    } else {
      const t = (lifeRatio - 0.85) / 0.15;
      return Math.max(0, baseOpacity * (1.0 - t));
    }
  },
  updateVelocity(velocity, index, deltaTime, age, maxLife) {
    const lifeRatio = maxLife > 0 ? age / maxLife : 0;
    if (lifeRatio < 0.38) {
      // Giai đoạn 1: Bung tỏa nhanh với Màu thứ 1
      velocity.multiplyScalar(0.994);
      return {
        gravityScale: 0.02,
        spawnTrail: false
      };
    } else if (lifeRatio < 0.48) {
      // Điểm chuyển giao: Phanh hãm đột ngột và chuyển biến sang Màu thứ 2
      velocity.multiplyScalar(Math.pow(0.02, deltaTime * 14));
      return {
        gravityScale: 0.01,
        spawnTrail: false
      };
    } else {
      // Giai đoạn 2: Lơ lửng tồn tại rực rỡ với Màu thứ 2
      velocity.multiplyScalar(0.92);
      return {
        gravityScale: 0.03,
        spawnTrail: false
      };
    }
  }
});

BurstEffectProcessor.registerEffect('ghost', {
  materialOpacity(age, maxLife, baseOpacity) {
    const lifeRatio = maxLife > 0 ? age / maxLife : 0;
    if (lifeRatio < 0.40) {
      return 0.0;
    } else if (lifeRatio < 0.48) {
      const t = (lifeRatio - 0.40) / 0.08;
      return baseOpacity * THREE.MathUtils.lerp(0.0, 1.0, t);
    } else if (lifeRatio < 0.85) {
      return baseOpacity;
    } else {
      const t = (lifeRatio - 0.85) / 0.15;
      return Math.max(0, baseOpacity * (1.0 - t));
    }
  },
  updateVelocity(velocity, index, deltaTime, age, maxLife) {
    const lifeRatio = maxLife > 0 ? age / maxLife : 0;
    if (lifeRatio < 0.38) {
      // Rapid ballistic expansion to target radius
      velocity.multiplyScalar(0.994);
      return {
        gravityScale: 0.02,
        spawnTrail: false
      };
    } else if (lifeRatio < 0.48) {
      // Hãm phanh triệt để: Vận tốc giảm đột ngột về gần 0 ngay khi các hạt tới đích
      velocity.multiplyScalar(Math.pow(0.02, deltaTime * 14));
      return {
        gravityScale: 0.01,
        spawnTrail: false
      };
    } else {
      // Lơ lửng gần như đứng yên tại vị trí đích, trôi cực chậm và êm dịu
      velocity.multiplyScalar(0.92);
      return {
        gravityScale: 0.03,
        spawnTrail: false
      };
    }
  }
});

BurstEffectProcessor.registerEffect('galaxy-spin', {
  materialOpacity(age, maxLife, baseOpacity) {
    return Math.max(0, Math.min(1, baseOpacity * 0.72));
  },
  updateVelocity(velocity, index, deltaTime, age, maxLife, effectState) {
    const lifeRatio = maxLife > 0 ? age / maxLife : 0;
    const spinSpeed = 2.5 * (1.0 - lifeRatio);
    const angleChange = spinSpeed * deltaTime;
    const cos = Math.cos(angleChange);
    const sin = Math.sin(angleChange);
    const oldX = velocity.x;
    const oldY = velocity.y;
    velocity.x = oldX * cos - oldY * sin;
    velocity.y = oldX * sin + oldY * cos;
    velocity.multiplyScalar(0.992);
    return { gravityScale: 0.05, spawnTrail: true, trailLife: 0.24, trailIntensity: 0.22 };
  }
});

BurstEffectProcessor.registerEffect('comet-ring', {
  updateVelocity(velocity) {
    velocity.multiplyScalar(0.985);
    return { gravityScale: 0.06, spawnTrail: true, trailLife: 1.4, trailIntensity: 0.85 };
  }
});

BurstEffectProcessor.registerEffect('sparking', {
  updateVelocity(velocity, index, deltaTime, age, maxLife) {
    // Bay bung tỏa tự do, bình thường như pháo hoa Chrysanthemum thường
    return { gravityScale: 0.35 };
  }
});

BurstEffectProcessor.registerEffect('sparking-v2', {
  updateVelocity(velocity, index, deltaTime, age, maxLife) {
    // Bay bung tỏa tự do, bình thường như pháo hoa Chrysanthemum thường, trọng lực chuẩn
    return { gravityScale: 0.35 };
  }
});

BurstEffectProcessor.registerEffect('bouquet-comet', {
  updateVelocity(velocity, index, deltaTime, age, maxLife) {
    velocity.multiplyScalar(0.993); // Lực cản không khí
    // Trọng lực tăng dần theo thời gian: ban đầu nhẹ để vút lên cao, sau đó tăng dần để rủ cong theo vòng cung xuống
    const arcGravity = 0.10 + Math.min(0.25, Math.max(0, age - 0.25) * 0.18);
    return {
      gravityScale: arcGravity,
      spawnTrail: true,
      trailLife: 0.95,
      trailIntensity: 0.9
    };
  }
});

BurstEffectProcessor.registerEffect('willow', {
  updateVelocity(velocity) {
    velocity.multiplyScalar(0.988);
    return {
      gravityScale: 0.22,
      spawnTrail: true,
      trailLife: 0.85,
      trailIntensity: 0.95
    };
  }
});

BurstEffectProcessor.registerEffect('swimming-star', {
  updateVelocity(velocity, index, deltaTime, age, maxLife, effectState) {
    const spinAmount = (effectState?.spin?.[index] || 0) * deltaTime * 0.85;
    const cos = Math.cos(spinAmount);
    const sin = Math.sin(spinAmount);
    const oldX = velocity.x;
    const oldZ = velocity.z;
    velocity.x = oldX * cos - oldZ * sin;
    velocity.z = oldX * sin + oldZ * cos;
    velocity.y += Math.sin(age * 2.8 + (effectState?.phase?.[index] || 0)) * 0.018;
    velocity.multiplyScalar(0.994);
    return {
      gravityScale: 0.08,
      spawnTrail: false
    };
  }
});

BurstEffectProcessor.registerEffect('no-trail', {
  updateVelocity() {
    return {
      gravityScale: 0.3,
      spawnTrail: false
    };
  }
});

BurstEffectProcessor.registerEffect('notrail', {
  updateVelocity() {
    return {
      gravityScale: 0.3,
      spawnTrail: false
    };
  }
});

BurstEffectProcessor.registerEffect('no-burst', {
  updateVelocity() {
    return {
      gravityScale: 0.25,
      spawnTrail: true
    };
  }
});

BurstEffectProcessor.registerEffect('ghost-kamuro', {
  updateVelocity(velocity, index, deltaTime, age, maxLife) {
    velocity.x *= 0.994;
    velocity.z *= 0.994;
    velocity.y = velocity.y * 0.994 - 0.05 * (age / Math.max(0.1, maxLife)) * 9.8 * deltaTime;

    const lifeRatio = maxLife > 0 ? age / maxLife : 0;
    const isReignited = lifeRatio > 0.60;

    return {
      gravityScale: isReignited ? 0.38 : 0.18,
      spawnTrail: isReignited,
      trailLife: 0.95,
      trailIntensity: 1.4
    };
  }
});

BurstEffectProcessor.registerEffect('double-helix', {
  updateVelocity(velocity, index, deltaTime, age, maxLife) {
    const lifeRatio = maxLife > 0 ? age / maxLife : 0;
    const spinSpeed = 1.2 * (1.0 - lifeRatio * 0.5);
    const angleChange = spinSpeed * deltaTime;
    const cos = Math.cos(angleChange);
    const sin = Math.sin(angleChange);
    const oldX = velocity.x;
    const oldZ = velocity.z;
    velocity.x = oldX * cos - oldZ * sin;
    velocity.z = oldX * sin + oldZ * cos;
    velocity.multiplyScalar(0.994);

    return {
      gravityScale: 0.16,
      spawnTrail: true,
      trailLife: 0.50,
      trailIntensity: 0.55
    };
  }
});

BurstEffectProcessor.registerEffect('crossette', {
  updateVelocity() {
    return {
      gravityScale: 0.26,
      spawnTrail: true,
      trailLife: 0.65,
      trailIntensity: 0.95
    };
  }
});

BurstEffectProcessor.registerEffect('sparkle-trail', {
  updateVelocity(velocity) {
    velocity.multiplyScalar(0.996);
    return {
      gravityScale: 0.28,
      spawnTrail: true,
      trailLife: 0.22,
      trailIntensity: 0.18,
      spawnSmoke: false
    };
  }
});

BurstEffectProcessor.registerEffect('sparkle-apex', {
  updateVelocity(velocity) {
    velocity.multiplyScalar(0.996);
    return {
      gravityScale: 0.28,
      spawnTrail: true,
      trailLife: 0.22,
      trailIntensity: 0.18,
      spawnSmoke: false
    };
  }
});

BurstEffectProcessor.registerEffect('sparkling-branch-comet', {
  updateVelocity(velocity) {
    velocity.multiplyScalar(0.996);
    return {
      gravityScale: 0.28,
      spawnTrail: true,
      trailLife: 0.22,
      trailIntensity: 0.18,
      spawnSmoke: false
    };
  }
});

BurstEffectProcessor.registerEffect('apex-hang', {
  updateVelocity(velocity, index, deltaTime, age, maxLife, effectState) {
    const apexDrag = FIREWORK_CONFIG.BURST?.apexExpansionDrag ?? 3.8;
    const brakeFactor = Math.exp(-apexDrag * deltaTime);
    velocity.multiplyScalar(brakeFactor);

    const initialSpeed = effectState?.initialSpeeds?.[index] ?? 0;
    const threshold = FIREWORK_CONFIG.BURST?.apexGravityThreshold ?? 0.18;

    if (initialSpeed > 0.001) {
      const currentSpeed = velocity.length();
      const expRatio = currentSpeed / initialSpeed;
      if (expRatio > threshold) {
        return {
          gravityScale: 0.0,
          spawnTrail: false
        };
      }
      const gravityBlend = 1.0 - (expRatio / threshold);
      return {
        gravityScale: THREE.MathUtils.smoothstep(
          gravityBlend,
          0.0,
          1.0
        ),
        spawnTrail: false
      };
    }

    const lifeRatio = maxLife > 0 ? age / maxLife : 1;
    const hangEnd = FIREWORK_CONFIG.BURST?.apexHangEnd ?? 0.48;
    if (lifeRatio <= hangEnd) {
      return {
        gravityScale: 0.0,
        spawnTrail: false
      };
    }
    const releaseProgress = Math.min(
      1.0,
      (lifeRatio - hangEnd) / 0.18
    );
    return {
      gravityScale: THREE.MathUtils.smoothstep(
        releaseProgress,
        0.0,
        1.0
      ),
      spawnTrail: false
    };
  }
});