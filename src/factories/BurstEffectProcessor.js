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
    'heart',
    'oval',
    'falling-comets'
  ]);

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

  static initialize(effectType, count) {
    const normalizedEffect = this.normalizeEffectType(effectType);
    const spin = new Float32Array(count);
    const phase = new Float32Array(count);
    const turbulence = new Float32Array(count);

    let currentStrobePhase = 0;
    for (let i = 0; i < count; i++) {
      spin[i] = (Math.random() - 0.5) * 3.2;


      if (normalizedEffect === 'strobe') {
        if (i % 12 === 0) currentStrobePhase = Math.random() * Math.PI * 2;
        phase[i] = currentStrobePhase;
      } else {
        phase[i] = Math.random() * Math.PI * 2;
      }

      turbulence[i] = 0.25 + Math.random() * 0.95;
    }

    return {
      effectType: normalizedEffect,
      spin,
      phase,
      turbulence
    };
  }

  static materialOpacity(effectType, age, maxLife, baseOpacity) {
    const normalizedEffect = this.normalizeEffectType(effectType);

    if (normalizedEffect === 'wave') {
      const blinkSpeed = 38;
      const blink = Math.sin(age * blinkSpeed) > 0 ? 1 : 0.2;
      return Math.max(0, Math.min(1, baseOpacity * blink));
    }

    if (normalizedEffect === 'heart') {
      const pulse = 0.78 + Math.sin(age * 12) * 0.18;
      return Math.max(0, Math.min(1, baseOpacity * pulse));
    }

    if (normalizedEffect === 'oval') {
      const softness = 0.88 + Math.sin(age * 4.5) * 0.08;
      return Math.max(0, Math.min(1, baseOpacity * softness));
    }

    return baseOpacity;
  }

  static updateVelocity(velocity, index, deltaTime, age, maxLife, effectState) {
    const effectType = this.normalizeEffectType(effectState?.effectType ?? 'standard');
    const lifeRatio = maxLife > 0 ? age / maxLife : 0;

    let gravityScale = 0.3;
    let emitSpark = false;

    if (effectType === 'flow') {
      gravityScale = 0.08;
      const spinAmount = (effectState.spin[index] || 0) * deltaTime;
      const cos = Math.cos(spinAmount);
      const sin = Math.sin(spinAmount);
      const oldX = velocity.x;
      const oldZ = velocity.z;
      velocity.x = oldX * cos - oldZ * sin;
      velocity.z = oldX * sin + oldZ * cos;
      velocity.y += Math.sin(age * 3 + (effectState.phase[index] || 0)) * 0.02;
      velocity.multiplyScalar(0.998);
    } else if (effectType === 'snow') {
      gravityScale = 0.05;
      const drift = Math.sin(age * 2 + (effectState.phase[index] || 0)) * 0.04;
      velocity.x += drift * deltaTime;
      velocity.z += drift * deltaTime * 0.7;
      velocity.multiplyScalar(0.996);
    } else if (effectType === 'crackle') {
      gravityScale = 0.18;
      const jitter = (effectState.turbulence[index] || 1) * 0.03;
      velocity.x += (Math.random() - 0.5) * jitter;
      velocity.y += (Math.random() - 0.5) * jitter * 0.5;
      velocity.z += (Math.random() - 0.5) * jitter;
      emitSpark = Math.random() < 0.015 + lifeRatio * 0.03;
    } else if (effectType === 'wave') {
      gravityScale = 0.22;
      velocity.y += Math.sin(age * 8 + (effectState.phase[index] || 0)) * 0.03;
    } else if (effectType === 'strobe') {
      gravityScale = 0.2;
      velocity.multiplyScalar(0.996);
      emitSpark = Math.random() < 0.012;
    } else if (effectType === 'heart') {
      gravityScale = 0.24;
      velocity.y += Math.sin(age * 6 + (effectState.phase[index] || 0)) * 0.018;
      velocity.x *= 0.998;
      velocity.z *= 0.998;
    } else if (effectType === 'oval') {
      gravityScale = 0.16;
      const spinAmount = (effectState.spin[index] || 0) * deltaTime * 0.4;
      const cos = Math.cos(spinAmount);
      const sin = Math.sin(spinAmount);
      const oldX = velocity.x;
      const oldZ = velocity.z;
      velocity.x = oldX * cos - oldZ * sin;
      velocity.z = oldX * sin + oldZ * cos;
      velocity.multiplyScalar(0.997);
    } else if (effectType === 'flower' || effectType === 'floral') {
      gravityScale = 0.2;
      velocity.multiplyScalar(0.997);
    } else if (effectType === 'falling-leaves') {
      gravityScale = 0.06;
      const drift = Math.sin(age * 3 + (effectState.phase[index] || 0)) * 0.06;
      velocity.x += drift * deltaTime;
      velocity.z += drift * deltaTime * 0.8;
      velocity.multiplyScalar(0.995);
    } else if (effectType === 'falling-comets') {
      gravityScale = 0.25; // Trọng lực bình thường để nó bung ra thành hình cầu
      const spawnTrail = true; // Cờ báo cho FireworkSystem biết cần sinh hạt vệt sáng như comet
      return { gravityScale, emitSpark, spawnTrail };
    }

    return { gravityScale, emitSpark };
  }
}