import * as THREE from 'three';

export class BurstEffectProcessor {
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
    'sparkling-branch-comet'
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
    const effectsList = Array.isArray(preset?.effects) ? preset.effects : [];
    const strobeEnabled = Boolean(preset?.strobe)
      || effectsList.includes('strobe')
      || effectsList.includes('white-strobe')
      || effectsList.includes('glitter-strobe');
    const crackleEnabled = Boolean(preset?.crackle) || effectsList.includes('crackle');
    const ghostEnabled = Boolean(preset?.ghost) || effectsList.includes('ghost') || normalizedEffect === 'ghost';
    const flowEnabled = Boolean(preset?.flow) || effectsList.includes('flow') || normalizedEffect === 'flow';
    const crossetteEnabled = Boolean(preset?.crossette) || effectsList.includes('crossette') || normalizedEffect === 'crossette';
    const noTrail = Boolean(preset?.noTrail)
      || effectsList.includes('no-trail')
      || effectsList.includes('notrail')
      || normalizedEffect === 'notrail'
      || normalizedEffect === 'no-trail';
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
      noTrail,
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
    let emitSpark = false;
    let spawnTrail = false;
    let trailLife = 0.8;
    let trailIntensity = 0.35;
    let spawnSmoke = false;
    let smokeLife = 2.5;
    let smokeOpacity = 0.15;

    // Delegate to strategy from registry
    const strategy = this.effectsRegistry.get(effectType);
    if (strategy && typeof strategy.updateVelocity === 'function') {
      const overrides = strategy.updateVelocity(velocity, index, deltaTime, age, maxLife, effectState);
      if (overrides) {
        if (overrides.gravityScale !== undefined) gravityScale = overrides.gravityScale;
        if (overrides.emitSpark !== undefined) emitSpark = overrides.emitSpark;
        if (overrides.spawnTrail !== undefined) spawnTrail = overrides.spawnTrail;
        if (overrides.trailLife !== undefined) trailLife = overrides.trailLife;
        if (overrides.trailIntensity !== undefined) trailIntensity = overrides.trailIntensity;
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
    }

    return {
      gravityScale,
      emitSpark,
      spawnTrail,
      trailLife,
      trailIntensity,
      spawnSmoke,
      smokeLife,
      smokeOpacity
    };
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

BurstEffectProcessor.registerEffect('crysanthemum-cc', {
  updateVelocity() {
    return { gravityScale: 0.3 };
  }
});

BurstEffectProcessor.registerEffect('ghost', {
  updateVelocity(velocity) {
    velocity.multiplyScalar(0.996);
    return { gravityScale: 0.15 };
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
    velocity.x *= 0.988;
    velocity.z *= 0.988;
    velocity.y = velocity.y * 0.990 - 0.05 * (age / Math.max(0.1, maxLife)) * 9.8 * deltaTime;

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
      trailLife: 0.60,
      trailIntensity: 0.85
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