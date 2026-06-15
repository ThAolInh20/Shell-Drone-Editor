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
    'ghost',
    'galaxy-spin'
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

  static initialize(effectType, count, preset = null) {
    const normalizedEffect = this.normalizeEffectType(effectType);
    const strobeEnabled = Boolean(preset?.strobe);
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
    if (normalizedEffect === 'ghost') {
      const vec = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
      ghostAxis = { x: vec.x, y: vec.y, z: vec.z };
    }

    return {
      effectType: normalizedEffect,
      strobe: strobeEnabled,
      crackle: Boolean(preset?.crackle),
      spin,
      phase,
      turbulence,
      ghostAxis
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
    let spawnTrail = false;
    let trailLife = 0.8;
    let trailIntensity = 0.35;

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
      spawnTrail = true;
      trailLife = 0.25; // vệt ngắn cho cá bơi
      trailIntensity = 0.3; // Tăng độ sáng cho vệt sáng cá bơi
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
    } else if (effectType === 'strobe' || effectType === 'white-strobe' || effectType === 'glitter-strobe') {
      gravityScale = 0.2;
      velocity.multiplyScalar(0.996);
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
    } else if (effectType === 'falling-comets' || effectType === 'falling-comets-glitter') {
      gravityScale = 0.25; // Trọng lực bình thường để nó bung ra thành hình cầu
      spawnTrail = true; // Cờ báo cho FireworkSystem biết cần sinh hạt vệt sáng như comet
      trailLife = 0.55; // Rút ngắn đuôi comet rủ xuống
      trailIntensity = 0.35; // Tăng sáng cho đuôi comet
    } else if (effectType === 'crysanthemum-trail') {
      gravityScale = 0.3;
      spawnTrail = true; // Cờ báo cho FireworkSystem biết cần sinh hạt vệt sáng như comet, tuy nhiên nó sẽ mang màu của pháo đó
      trailLife = 0.45; // Rút ngắn đuôi hoa cúc
      trailIntensity = 0.9; // Cường độ sáng cao hơn nữa để giữ màu sắc thật
    } else if (effectType === 'ghost') {
      gravityScale = 0.15; // Pháo ma thường rủ nhẹ, chậm
      velocity.multiplyScalar(0.996);
    } else if (effectType === 'galaxy-spin') {
      gravityScale = 0.05; // Cực kỳ nhẹ để giữ dáng xoắn ốc
      const spinSpeed = 2.5 * (1.0 - lifeRatio); // Chậm dần theo thời gian
      const angleChange = spinSpeed * deltaTime;
      const cos = Math.cos(angleChange);
      const sin = Math.sin(angleChange);
      const oldX = velocity.x;
      const oldY = velocity.y;
      velocity.x = oldX * cos - oldY * sin;
      velocity.y = oldX * sin + oldY * cos;
      velocity.multiplyScalar(0.992); // Ma sát không khí
      spawnTrail = true;
      trailLife = 0.35;
      trailIntensity = 0.4;
    }

    // Apply modular overrides for strobe and crackle on top of other effects
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
      emitSpark = Math.random() < 0.015 + lifeRatio * 0.03;
    }

    // Custom shape logic for half-flash comets (jellyfish tentacles)
    if (effectState?.shapeType === 'half-flash') {
      const numBeams = 4;
      const halfCount = effectState.phase.length - numBeams;
      if (index >= halfCount) {
        spawnTrail = true;
        trailLife = 0.42; // Đuôi râu sứa ngắn hơn một chút cho gọn gàng, mượt mà
        trailIntensity = 0.85; // Tăng cường độ sáng rực rỡ
      }
    }

    // Custom shape logic for split-flash comets (equatorial beams)
    if (effectState?.shapeType === 'split-flash') {
      const numBeams = 5;
      const halfCount = effectState.phase.length - numBeams;
      if (index >= halfCount) {
        spawnTrail = true;
        trailLife = 0.38; // Đuôi comet cắt ngang sắc nét và ngắn hơn
        trailIntensity = 0.9; // Tăng độ sáng cao rực rỡ
      }
    }

    return { gravityScale, emitSpark, spawnTrail, trailLife, trailIntensity };
  }
}