export class FireworkSequencer {
  constructor(fireworkSystem, cometSystem) {
    this.fireworkSystem = fireworkSystem;
    this.cometSystem = cometSystem;
    this.activeTasks = [];
  }

  update(deltaTime) {
    for (let i = this.activeTasks.length - 1; i >= 0; i--) {
      const task = this.activeTasks[i];
      task.timeToLaunch -= deltaTime;

      if (task.timeToLaunch <= 0) {
        const isComet = task.isComet || (task.preset && (task.preset.type === 'comet_cluster' || task.preset.type === 'comet')) 
                      || (typeof task.preset === 'string' && (task.preset.startsWith('comet_cluster') || task.preset.includes('comet')));

        if (isComet) {
          this.cometSystem.launchRandom(task.preset, task.options);
        } else {
          this.fireworkSystem.launchRandom(task.preset, task.options);
        }
        this.activeTasks.splice(i, 1);
      }
    }
  }

  playPattern(pattern, config) {
    const {
      count = 10,
      duration = 2.0,
      preset = null,
      sectorId,
      color,
      x1,
      x2,
      y1,
      y2,
      angle,
      useAngle,
      effectOverrides,
      instantBurst,
      shellSize
    } = config;

    for (let i = 0; i < count; i++) {
      const progress = count > 1 ? i / (count - 1) : 0;
      let ratioX = 0.5;
      let ratioY = 0.5;
      let ratioZ = 0.5;
      const delay = progress * duration;
      const baseRatioY = config.ratioY !== undefined ? config.ratioY : 0.8;

      // CHỈ khi useAngle === true thì mới bắn theo góc chỉ định, nếu không check thì luôn bắn ngẫu nhiên
      const hasCustomAngle = useAngle === true && angle !== undefined;
      const resolvedAngle = hasCustomAngle
        ? (Math.abs(angle) > Math.PI ? (angle * Math.PI / 180) : angle)
        : undefined;

      // Góc xiên ngẫu nhiên tự do hoàn toàn cho từng quả pháo hoa nếu không tick chọn góc
      let angleOffset = (Math.random() - 0.5) * 2 * 0.28;

      switch (pattern) {
        case 'sweep':
        case 'sweep-right':
        case 'sweep-left': {
          const defaultX1 = (pattern === 'sweep-left') ? 1.0 : 0.0;
          const defaultX2 = (pattern === 'sweep-left') ? 0.0 : 1.0;
          const startX = x1 !== undefined ? x1 : defaultX1;
          const endX = x2 !== undefined ? x2 : defaultX2;
          ratioX = startX + progress * (endX - startX);
          if (resolvedAngle !== undefined) {
            angleOffset = resolvedAngle;
          } else {
            angleOffset = (Math.random() - 0.5) * 2 * 0.28;
          }
          break;
        }
        case 'sweep-random-tilt':
        case 'sweep-random-tilt-right':
        case 'sweep-random-tilt-left': {
          const defaultX1 = (pattern === 'sweep-random-tilt-left') ? 1.0 : 0.0;
          const defaultX2 = (pattern === 'sweep-random-tilt-left') ? 0.0 : 1.0;
          const startX = x1 !== undefined ? x1 : defaultX1;
          const endX = x2 !== undefined ? x2 : defaultX2;
          ratioX = startX + progress * (endX - startX);
          angleOffset = (Math.random() - 0.5) * 2 * 0.28;
          break;
        }
        case 'converge': // Outside to inside
          ratioX = i % 2 === 0 ? progress / 2 : 1.0 - (progress / 2);
          break;
        case 'diverge': // Inside to outside
          ratioX = i % 2 === 0 ? 0.5 - (progress / 2) : 0.5 + (progress / 2);
          break;
        case 'zigzag':
          ratioX = progress;
          ratioZ = (Math.sin(progress * Math.PI * 4) + 1) / 2; // Sine wave depth
          ratioY = 0.4 + Math.random() * 0.4;
          break;
        case 'fan': // Arching from left to right, middle is highest
          ratioX = progress;
          ratioY = 0.4 + Math.sin(progress * Math.PI) * Math.max(0, baseRatioY - 0.4);
          angleOffset = (0.28 - 0.56 * progress) + (Math.random() - 0.5) * 0.12;
          break;
        case 'sweep-arc':
        case 'sweep-arc-right':
        case 'sweep-arc-left': {
          const defaultX1 = (pattern === 'sweep-arc-left') ? 1.0 : 0.0;
          const defaultX2 = (pattern === 'sweep-arc-left') ? 0.0 : 1.0;
          const startX = x1 !== undefined ? x1 : defaultX1;
          const endX = x2 !== undefined ? x2 : defaultX2;
          ratioX = startX + progress * (endX - startX);
          ratioY = 0.35 + Math.sin(progress * Math.PI) * Math.max(0, baseRatioY - 0.35);
          if (resolvedAngle !== undefined) {
            angleOffset = resolvedAngle;
          } else {
            angleOffset = (Math.random() - 0.5) * 2 * 0.28;
          }
          break;
        }
        case 'sweep-arc-out':
        case 'sweep-arc-out-right':
        case 'sweep-arc-out-left': {
          const defaultX1 = (pattern === 'sweep-arc-out-left') ? 1.0 : 0.0;
          const defaultX2 = (pattern === 'sweep-arc-out-left') ? 0.0 : 1.0;
          const startX = x1 !== undefined ? x1 : defaultX1;
          const endX = x2 !== undefined ? x2 : defaultX2;
          ratioX = startX + progress * (endX - startX);
          ratioY = 0.35 + Math.sin(progress * Math.PI) * Math.max(0, baseRatioY - 0.35);
          if (resolvedAngle !== undefined) {
            angleOffset = resolvedAngle;
          } else {
            angleOffset = (Math.random() - 0.5) * 2 * 0.28;
          }
          break;
        }
        case 'random':
          ratioX = Math.random();
          ratioY = Math.random();
          ratioZ = Math.random();
          break;
      }

      // Remap ratioX to [x1, x2] range if provided for non-sweep patterns
      if (x1 !== undefined && x2 !== undefined && !pattern.startsWith('sweep')) {
        ratioX = x1 + ratioX * (x2 - x1);
      }

      // Allow config overrides
      if (y1 !== undefined && y2 !== undefined) {
        if (pattern.startsWith('sweep')) {
          const minY = Math.min(y1, y2);
          const maxY = Math.max(y1, y2);
          ratioY = minY + Math.random() * (maxY - minY);
        } else {
          let t = progress;
          if (pattern === 'random') {
            t = ratioY;
          } else if (
            pattern.startsWith('sweep-arc') ||
            pattern === 'fan'
          ) {
            t = Math.sin(progress * Math.PI);
          }
          ratioY = y1 + t * (y2 - y1);
        }
      } else if (config.ratioY !== undefined) {
        const hasSinRatioY = pattern.startsWith('sweep-arc') || pattern === 'fan';
        if (!hasSinRatioY) {
          ratioY = config.ratioY;
        }
      }

      if (config.ratioZ !== undefined) ratioZ = config.ratioZ;

      let overrides = effectOverrides;
      if (instantBurst !== undefined 
        || shellSize !== undefined 
        || config.strobe !== undefined 
        || config.crackle !== undefined
        || config.cometTrail !== undefined) 
      {
        overrides = { ...(overrides || {}) };
        if (instantBurst !== undefined) overrides.instantBurst = instantBurst;
        if (shellSize !== undefined) overrides.shellSize = shellSize;
        if (config.strobe !== undefined) overrides.strobe = config.strobe;
        if (config.crackle !== undefined) overrides.crackle = config.crackle;
        if (config.cometTrail !== undefined) {
          if (config.cometTrail === 'none') {
            overrides.launchTrail = false;
            overrides.thickTrail = false;
            overrides.instantBurst = true;
          } else if (config.cometTrail === 'thick') {
            overrides.launchTrail = true;
            overrides.thickTrail = true;
          } else if (config.cometTrail === 'normal') {
            overrides.launchTrail = true;
            overrides.thickTrail = false;
          }
        }
      }

      this.activeTasks.push({
        timeToLaunch: delay,
        preset,
        options: {
          ratioX,
          ratioY,
          ratioZ,
          angleOffset,
          sectorId,
          color,
          effectOverrides: overrides
        }
      });
    }
  }

  playCometSequence(pattern, config) {
    const { count = 10, duration = 2.0, preset = { type: 'comet' }, sweepCount = 2, sectorId, color, x1, x2, y1, y2, angle, effectOverrides } = config;

    // Spread of the fan/sweep (from -45 deg to +45 deg)
    const maxAngleOffset = Math.PI / 4;

    for (let i = 0; i < count; i++) {
      let progress = count > 1 ? i / (count - 1) : 0;
      let delay = progress * duration;
      let angleOffset = 0;
      let ratioX = config.ratioX !== undefined ? config.ratioX : 0.5;
      const baseRatioY = config.ratioY !== undefined ? config.ratioY : 0.7;
      let ratioY = config.ratioY !== undefined ? config.ratioY : 0.5;
      let ratioZ = config.ratioZ !== undefined ? config.ratioZ : 0.5;

      switch (pattern) {
        case 'continuous':
          // Thêm độ lệch ngẫu nhiên nhỏ để trông tự nhiên hơn (khoảng +/- 5 độ)
          angleOffset = (Math.random() - 0.5) * 0.47;
          break;
        case 'fan-sweep':
        case 'fan-sweep-right':
        case 'fan-sweep-left': {
          const defaultX1 = (pattern === 'fan-sweep-left') ? 1.0 : 0.0;
          const defaultX2 = (pattern === 'fan-sweep-left') ? 0.0 : 1.0;
          const startX = x1 !== undefined ? x1 : defaultX1;
          const endX = x2 !== undefined ? x2 : defaultX2;
          const isMovingRight = endX >= startX;
          angleOffset = isMovingRight
            ? maxAngleOffset - (2 * maxAngleOffset) * progress
            : -maxAngleOffset + (2 * maxAngleOffset) * progress;
          break;
        }
        case 'fan-sweep-continuous':
          // Sweeps back and forth `sweepCount` times
          angleOffset = Math.cos(progress * Math.PI * sweepCount) * maxAngleOffset;
          break;
        case 'fan-burst':
          // All at once, spread like a fan
          angleOffset = maxAngleOffset - (2 * maxAngleOffset) * progress;
          delay = 0; // All fired at same time
          break;
        case 'sweep':
        case 'sweep-right':
        case 'sweep-left': {
          const defaultX1 = (pattern === 'sweep-left') ? 1.0 : 0.0;
          const defaultX2 = (pattern === 'sweep-left') ? 0.0 : 1.0;
          const startX = x1 !== undefined ? x1 : defaultX1;
          const endX = x2 !== undefined ? x2 : defaultX2;
          const isMovingRight = endX >= startX;
          ratioX = startX + progress * (endX - startX);
          angleOffset = angle !== undefined ? angle : (isMovingRight ? Math.PI / 12 : -Math.PI / 12);
          break;
        }
        case 'sweep-random-tilt':
        case 'sweep-random-tilt-right':
        case 'sweep-random-tilt-left': {
          const defaultX1 = (pattern === 'sweep-random-tilt-left') ? 1.0 : 0.0;
          const defaultX2 = (pattern === 'sweep-random-tilt-left') ? 0.0 : 1.0;
          const startX = x1 !== undefined ? x1 : defaultX1;
          const endX = x2 !== undefined ? x2 : defaultX2;
          ratioX = startX + progress * (endX - startX);
          angleOffset = (Math.random() - 0.5) * 2 * maxAngleOffset;
          break;
        }
        case 'sweep-arc':
        case 'sweep-arc-right':
        case 'sweep-arc-left': {
          const defaultX1 = (pattern === 'sweep-arc-left') ? 1.0 : 0.0;
          const defaultX2 = (pattern === 'sweep-arc-left') ? 0.0 : 1.0;
          const startX = x1 !== undefined ? x1 : defaultX1;
          const endX = x2 !== undefined ? x2 : defaultX2;
          const isMovingRight = endX >= startX;
          ratioX = startX + progress * (endX - startX);
          ratioY = 0.3 + Math.sin(progress * Math.PI) * Math.max(0, baseRatioY - 0.3);
          angleOffset = isMovingRight
            ? maxAngleOffset - (2 * maxAngleOffset) * progress
            : -maxAngleOffset + (2 * maxAngleOffset) * progress;
          break;
        }
        case 'sweep-arc-out':
        case 'sweep-arc-out-right':
        case 'sweep-arc-out-left': {
          const defaultX1 = (pattern === 'sweep-arc-out-left') ? 1.0 : 0.0;
          const defaultX2 = (pattern === 'sweep-arc-out-left') ? 0.0 : 1.0;
          const startX = x1 !== undefined ? x1 : defaultX1;
          const endX = x2 !== undefined ? x2 : defaultX2;
          const isMovingRight = endX >= startX;
          ratioX = startX + progress * (endX - startX);
          ratioY = 0.3 + Math.sin(progress * Math.PI) * Math.max(0, baseRatioY - 0.3);
          angleOffset = isMovingRight
            ? -maxAngleOffset + (2 * maxAngleOffset) * progress
            : maxAngleOffset - (2 * maxAngleOffset) * progress;
          break;
        }
        case 'random':
          ratioX = Math.random();
          ratioY = Math.random();
          ratioZ = Math.random();
          angleOffset = (Math.random() - 0.5) * maxAngleOffset * 2;
          break;
      }

      // Remap ratioX to [x1, x2] range if provided for non-sweep patterns
      if (x1 !== undefined && x2 !== undefined && !pattern.startsWith('sweep')) {
        ratioX = x1 + ratioX * (x2 - x1);
      }

      // Map ratioY to [y1, y2] range if provided
      if (y1 !== undefined && y2 !== undefined) {
        if (pattern.startsWith('sweep')) {
          const minY = Math.min(y1, y2);
          const maxY = Math.max(y1, y2);
          ratioY = minY + Math.random() * (maxY - minY);
        } else {
          let t = progress;
          if (pattern === 'random') {
            t = ratioY;
          } else if (pattern.startsWith('sweep-arc')) {
            t = Math.sin(progress * Math.PI);
          }
          ratioY = y1 + t * (y2 - y1);
        }
      }

      let overrides = effectOverrides;
      if (config.instantBurst !== undefined 
        || config.shellSize !== undefined 
        || config.strobe !== undefined 
        || config.crackle !== undefined
        || config.cometTrail !== undefined) 
      {
        overrides = { ...(overrides || {}) };
        if (config.instantBurst !== undefined) overrides.instantBurst = config.instantBurst;
        if (config.shellSize !== undefined) overrides.shellSize = config.shellSize;
        if (config.strobe !== undefined) overrides.strobe = config.strobe;
        if (config.crackle !== undefined) overrides.crackle = config.crackle;
        if (config.cometTrail !== undefined) {
          if (config.cometTrail === 'none') {
            overrides.launchTrail = false;
            overrides.thickTrail = false;
            overrides.instantBurst = true;
          } else if (config.cometTrail === 'thick') {
            overrides.launchTrail = true;
            overrides.thickTrail = true;
          } else if (config.cometTrail === 'normal') {
            overrides.launchTrail = true;
            overrides.thickTrail = false;
          }
        }
      }

      this.activeTasks.push({
        timeToLaunch: delay,
        preset,
        isComet: true,
        options: { ratioX, ratioY, ratioZ, angleOffset, sectorId, color, effectOverrides: overrides }
      });
    }
  }

  playFinale(totalShells = 50, duration = 5.0) {
    for (let i = 0; i < totalShells; i++) {
      // Easing: start slow, get very fast at the end
      const progress = i / (totalShells - 1);
      const easeInQuad = progress * progress;
      const delay = easeInQuad * duration;

      this.activeTasks.push({
        timeToLaunch: delay,
        preset: null, // Random preset
        options: {
          ratioX: Math.random(),
          ratioY: 0.2 + Math.random() * 0.8,
          ratioZ: Math.random()
        }
      });
    }
  }

  clear() {
    this.activeTasks = [];
  }
}
