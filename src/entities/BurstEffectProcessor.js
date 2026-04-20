export class BurstEffectProcessor {
  static SUPPORTED_EFFECTS = new Set([
    'standard',
    'crackle',
    'flow',
    'snow',
    'wave',
    'flower',
    'strobe',
    'heart',
    'oval'
  ]);

  static normalizeEffectType(effectType) {
    return this.SUPPORTED_EFFECTS.has(effectType) ? effectType : 'standard';
  }

  static initialize(effectType, count) {
    const normalizedEffect = this.normalizeEffectType(effectType);
    const spin = new Float32Array(count);
    const phase = new Float32Array(count);
    const turbulence = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      spin[i] = (Math.random() - 0.5) * 3.2;
      phase[i] = Math.random() * Math.PI * 2;
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

    if (normalizedEffect === 'wave' || normalizedEffect === 'strobe') {
      const blink = Math.sin(age * 38) > 0 ? 1 : 0.2;
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
    } else if (effectType === 'flower') {
      gravityScale = 0.2;
      velocity.multiplyScalar(0.997);
    }

    return { gravityScale, emitSpark };
  }
}