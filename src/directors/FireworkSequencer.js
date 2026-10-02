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
      let delay = progress * duration;
      let spiralConfig = null;
      const baseRatioY = config.ratioY !== undefined ? config.ratioY : 0.8;
      const heightScale = baseRatioY / 0.7;

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
        case 'crossfire': {
          const isEven = i % 2 === 0;
          ratioX = isEven ? (progress * 0.9 + 0.05) : (0.95 - progress * 0.9);
          angleOffset = isEven ? 0.32 : -0.32;
          break;
        }
        case 'crossfire-burst': {
          const isEven = i % 2 === 0;
          ratioX = progress;
          angleOffset = isEven ? 0.35 : -0.35;
          delay = 0;
          break;
        }
        case 'v-shape': {
          const isEven = i % 2 === 0;
          ratioX = isEven ? (0.5 - (progress / 2) * 0.9) : (0.5 + (progress / 2) * 0.9);
          ratioY = 0.35 + progress * Math.max(0, baseRatioY - 0.35);
          angleOffset = isEven ? (-0.22 * progress) : (0.22 * progress);
          break;
        }
        case 'spiral-helix': {
          const angleRad = progress * Math.PI * 4;
          const radius = 0.38;
          ratioX = 0.5 + Math.cos(angleRad) * radius;
          ratioZ = 0.5 + Math.sin(angleRad) * radius;
          ratioY = 0.3 + progress * Math.max(0.2, baseRatioY - 0.3);
          angleOffset = Math.sin(angleRad) * 0.18;
          break;
        }
        case 'ripple': {
          const angleRad = i * 2.399963;
          const radius = progress * 0.42;
          ratioX = 0.5 + Math.cos(angleRad) * radius;
          ratioZ = 0.5 + Math.sin(angleRad) * radius;
          ratioY = 0.4 + (Math.sin(progress * Math.PI) * 0.15) + (baseRatioY - 0.4) * 0.5;
          angleOffset = Math.cos(angleRad) * 0.22 * progress;
          break;
        }
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
        case 'cascade-slope':
        case 'cascade-slope-right':
        case 'cascade-slope-left': {
          const defaultX1 = (pattern === 'cascade-slope-left') ? 1.0 : 0.0;
          const defaultX2 = (pattern === 'cascade-slope-left') ? 0.0 : 1.0;
          const startX = x1 !== undefined ? x1 : defaultX1;
          const endX = x2 !== undefined ? x2 : defaultX2;
          const isMovingRight = endX >= startX;
          ratioX = startX + progress * (endX - startX);
          
          // Mô hình vật lý làn sóng đổ ập vào tường (3 giai đoạn: Trườn là mặt sàn -> Dồn chân tường -> Đập tường vọt trào)
          let heightNorm;
          let tiltRad;

          if (progress <= 0.60) {
            // Pha 1: Sóng trườn là là mặt sàn, nghiêng xéo cực mạnh lao về phía trước (48° -> 42°)
            const t = progress / 0.60;
            heightNorm = 0.22 - 0.08 * t;
            tiltRad = 0.84 - 0.11 * t;
          } else if (progress <= 0.78) {
            // Pha 2: Sóng dồn nén tại chân tường, cuộn gập dâng lên và dựng thẳng góc (42° -> 18°)
            const t = (progress - 0.60) / 0.18;
            heightNorm = 0.14 + 0.28 * Math.pow(t, 1.8);
            tiltRad = 0.73 - 0.42 * Math.pow(t, 1.2);
          } else {
            // Pha 3: Sóng đập vào bờ tường vọt tung lên đỉnh cao nhất, góc dựng đứng hơi uốn ngược (18° -> -5°)
            const t = (progress - 0.78) / 0.22;
            heightNorm = 0.42 + 0.53 * Math.pow(t, 1.4);
            tiltRad = 0.31 - 0.40 * Math.pow(t, 1.2);
          }

          ratioY = Math.max(0.10, (heightNorm / 0.95) * baseRatioY);

          if (resolvedAngle !== undefined) {
            angleOffset = resolvedAngle;
          } else {
            angleOffset = isMovingRight ? tiltRad : -tiltRad;
          }
          break;
        }
        case 'chasing-scissors': {
          const isEven = i % 2 === 0;
          ratioX = isEven ? (progress * 0.48) : (1.0 - progress * 0.48);
          ratioY = Math.max(0.10, ((0.85 - 0.48 * progress) / 0.85) * baseRatioY);
          const tilt = 0.55 * (1.0 - progress);
          angleOffset = isEven ? tilt : -tilt;
          break;
        }
        case 'waterfall-curtain': {
          ratioX = progress;
          ratioY = Math.max(0.10, ((0.85 - 0.45 * progress) / 0.85) * baseRatioY);
          angleOffset = (Math.random() - 0.5) * 0.12;
          break;
        }
        case 'sinusoidal-wave': {
          ratioX = progress;
          ratioY = Math.max(0.10, (0.60 + 0.40 * Math.sin(progress * Math.PI * 4)) * baseRatioY);
          angleOffset = 0.35 * Math.cos(progress * Math.PI * 4);
          break;
        }
        case 'petal-bloom': {
          const isEven = i % 2 === 0;
          ratioX = isEven ? (0.5 - progress * 0.48) : (0.5 + progress * 0.48);
          ratioY = Math.max(0.10, (0.40 + 0.60 * progress) * baseRatioY);
          const tilt = 0.15 + 0.55 * Math.pow(progress, 1.8);
          angleOffset = isEven ? -tilt : tilt;
          break;
        }
        case 'teeter-totter': {
          const isEven = i % 2 === 0;
          ratioX = progress;
          ratioY = Math.max(0.10, (isEven ? (0.30 + 0.70 * progress) : (1.0 - 0.70 * progress)) * baseRatioY);
          angleOffset = isEven ? 0.42 : -0.42;
          break;
        }
        case 'vortex-tunnel': {
          const angleRad = progress * Math.PI * 2;
          ratioX = 0.5 + Math.cos(angleRad) * 0.42;
          ratioY = Math.max(0.10, (0.60 + 0.40 * Math.sin(angleRad)) * baseRatioY);
          ratioZ = 0.15 + 0.70 * progress;
          angleOffset = -0.28 * Math.cos(angleRad);
          break;
        }
        case 'stepping-stones': {
          ratioX = progress;
          const stepIndex = Math.floor(progress * 4);
          ratioY = Math.max(0.10, (0.35 + (stepIndex / 3) * 0.65) * baseRatioY);
          angleOffset = (Math.random() - 0.5) * 0.18;
          break;
        }
        case 'intertwined-helix': {
          const numPairs = Math.max(1, Math.floor(count / 2));
          const pairIndex = Math.floor(i / 2);
          const isStrandB = i % 2 !== 0;
          const pairProgress = numPairs > 1 ? pairIndex / (numPairs - 1) : 0.5;

          const defaultX1 = 0.15;
          const defaultX2 = 0.85;
          const startX = x1 !== undefined ? x1 : defaultX1;
          const endX = x2 !== undefined ? x2 : defaultX2;

          ratioX = startX + pairProgress * (endX - startX);
          ratioY = baseRatioY;
          angleOffset = resolvedAngle !== undefined ? resolvedAngle : 0;
          delay = pairProgress * duration;

          spiralConfig = {
            radius: 11.5,
            frequency: 4.6,
            phase: isStrandB ? Math.PI : 0,
            direction: 1
          };
          break;
        }
        case 'random':
          ratioX = Math.random();
          ratioY = config.ratioY !== undefined ? config.ratioY : Math.random();
          ratioZ = Math.random();
          break;
      }

      // Remap ratioX to [x1, x2] range if provided for non-sweep patterns
      if (
        x1 !== undefined &&
        x2 !== undefined &&
        !pattern.startsWith('sweep') &&
        !pattern.startsWith('cascade-slope') &&
        pattern !== 'intertwined-helix'
      ) {
        ratioX = x1 + ratioX * (x2 - x1);
      }

      // Allow config overrides
      if (y1 !== undefined && y2 !== undefined) {
        if (pattern.startsWith('sweep') && !pattern.startsWith('sweep-arc')) {
          const minY = Math.min(y1, y2);
          const maxY = Math.max(y1, y2);
          ratioY = minY + Math.random() * (maxY - minY);
        } else {
          let t = progress;
          if (pattern === 'random') {
            t = ratioY;
          } else if (
            pattern.startsWith('sweep-arc') ||
            pattern === 'fan' ||
            pattern === 'ripple'
          ) {
            t = Math.sin(progress * Math.PI);
          } else if (pattern === 'sinusoidal-wave') {
            t = 0.5 + 0.5 * Math.sin(progress * Math.PI * 4);
          }
          ratioY = y1 + t * (y2 - y1);
        }
      } else if (config.ratioY !== undefined) {
        const isFlatPattern = pattern === 'sweep' ||
          pattern === 'sweep-left' ||
          pattern === 'sweep-right' ||
          pattern === 'sweep-random-tilt' ||
          pattern === 'sweep-random-tilt-left' ||
          pattern === 'sweep-random-tilt-right' ||
          pattern === 'intertwined-helix' ||
          pattern === 'converge' ||
          pattern === 'diverge' ||
          pattern === 'crossfire' ||
          pattern === 'crossfire-burst' ||
          pattern === 'zigzag';
        if (isFlatPattern) {
          ratioY = config.ratioY;
        }
      }

      if (config.ratioZ !== undefined) ratioZ = config.ratioZ;

      let overrides = effectOverrides;
      if (spiralConfig) {
        overrides = {
          ...(overrides || {}),
          spiral: spiralConfig
        };
      }
      if (instantBurst !== undefined 
        || shellSize !== undefined 
        || config.shapeType !== undefined
        || config.dynamicsType !== undefined
        || config.pistil !== undefined
        || config.effects !== undefined
        || config.strobe !== undefined 
        || config.crackle !== undefined
        || config.flow !== undefined
        || config.cometTrail !== undefined
        || config.stages !== undefined
        || config.nestingMode !== undefined
        || config.multiNested !== undefined) 
      {
        overrides = { ...(overrides || {}) };
        if (instantBurst !== undefined) overrides.instantBurst = instantBurst;
        if (shellSize !== undefined) overrides.shellSize = shellSize;
        if (config.shapeType !== undefined) overrides.shapeType = config.shapeType;
        if (config.dynamicsType !== undefined) overrides.dynamicsType = config.dynamicsType;
        if (config.pistil !== undefined) overrides.pistil = config.pistil;
        if (config.effects !== undefined) overrides.effects = config.effects;
        if (config.strobe !== undefined) overrides.strobe = config.strobe;
        if (config.crackle !== undefined) overrides.crackle = config.crackle;
        if (config.flow !== undefined) overrides.flow = config.flow;
        if (config.stages !== undefined) overrides.stages = config.stages;
        if (config.nestingMode !== undefined) overrides.nestingMode = config.nestingMode;
        if (config.multiNested !== undefined) overrides.multiNested = config.multiNested;
        if (config.cometTrail !== undefined) {
          if (config.cometTrail === 'none') {
            overrides.launchTrail = false;
            overrides.thickTrail = false;
            overrides.instantBurst = true;
          } else if (config.cometTrail === 'thick') {
            overrides.launchTrail = true;
            overrides.thickTrail = true;
            overrides.thinTrail = false;
          } else if (config.cometTrail === 'thin') {
            overrides.launchTrail = true;
            overrides.thickTrail = false;
            overrides.thinTrail = true;
          } else if (config.cometTrail === 'normal') {
            overrides.launchTrail = true;
            overrides.thickTrail = false;
            overrides.thinTrail = false;
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
          spiral: spiralConfig,
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
      let spiralConfig = null;
      let ratioX = config.ratioX !== undefined ? config.ratioX : 0.5;
      const baseRatioY = config.ratioY !== undefined ? config.ratioY : 0.7;
      const heightScale = baseRatioY / 0.7;
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
        case 'crossfire': {
          const isEven = i % 2 === 0;
          ratioX = isEven ? (progress * 0.9 + 0.05) : (0.95 - progress * 0.9);
          angleOffset = isEven ? maxAngleOffset * 0.75 : -maxAngleOffset * 0.75;
          break;
        }
        case 'crossfire-burst': {
          const isEven = i % 2 === 0;
          ratioX = progress;
          angleOffset = isEven ? maxAngleOffset * 0.8 : -maxAngleOffset * 0.8;
          delay = 0;
          break;
        }
        case 'v-shape': {
          const isEven = i % 2 === 0;
          ratioX = isEven ? (0.5 - (progress / 2) * 0.9) : (0.5 + (progress / 2) * 0.9);
          ratioY = 0.3 + progress * Math.max(0, baseRatioY - 0.3);
          angleOffset = isEven ? (-maxAngleOffset * 0.6 * progress) : (maxAngleOffset * 0.6 * progress);
          break;
        }
        case 'spiral-helix': {
          const angleRad = progress * Math.PI * 4;
          const radius = 0.38;
          ratioX = 0.5 + Math.cos(angleRad) * radius;
          ratioZ = 0.5 + Math.sin(angleRad) * radius;
          ratioY = 0.3 + progress * Math.max(0.2, baseRatioY - 0.3);
          angleOffset = Math.sin(angleRad) * maxAngleOffset * 0.5;
          break;
        }
        case 'ripple': {
          const angleRad = i * 2.399963;
          const radius = progress * 0.42;
          ratioX = 0.5 + Math.cos(angleRad) * radius;
          ratioZ = 0.5 + Math.sin(angleRad) * radius;
          ratioY = 0.35 + (Math.sin(progress * Math.PI) * 0.15) + (baseRatioY - 0.35) * 0.5;
          angleOffset = Math.cos(angleRad) * maxAngleOffset * 0.6 * progress;
          break;
        }
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
        case 'cascade-slope':
        case 'cascade-slope-right':
        case 'cascade-slope-left': {
          const defaultX1 = (pattern === 'cascade-slope-left') ? 1.0 : 0.0;
          const defaultX2 = (pattern === 'cascade-slope-left') ? 0.0 : 1.0;
          const startX = x1 !== undefined ? x1 : defaultX1;
          const endX = x2 !== undefined ? x2 : defaultX2;
          const isMovingRight = endX >= startX;
          ratioX = startX + progress * (endX - startX);

          // Mô hình vật lý làn sóng đổ ập vào tường (3 giai đoạn: Trườn là mặt sàn -> Dồn chân tường -> Đập tường vọt trào)
          let heightNorm;
          let tiltRad;

          if (progress <= 0.60) {
            // Pha 1: Sóng trườn là là mặt sàn, nghiêng xéo cực mạnh lao về phía trước (48° -> 42°)
            const t = progress / 0.60;
            heightNorm = 0.22 - 0.08 * t;
            tiltRad = 0.84 - 0.11 * t;
          } else if (progress <= 0.78) {
            // Pha 2: Sóng dồn nén tại chân tường, cuộn gập dâng lên và dựng thẳng góc (42° -> 18°)
            const t = (progress - 0.60) / 0.18;
            heightNorm = 0.14 + 0.28 * Math.pow(t, 1.8);
            tiltRad = 0.73 - 0.42 * Math.pow(t, 1.2);
          } else {
            // Pha 3: Sóng đập vào bờ tường vọt tung lên đỉnh cao nhất, góc dựng đứng hơi uốn ngược (18° -> -5°)
            const t = (progress - 0.78) / 0.22;
            heightNorm = 0.42 + 0.53 * Math.pow(t, 1.4);
            tiltRad = 0.31 - 0.40 * Math.pow(t, 1.2);
          }

          ratioY = Math.max(0.10, (heightNorm / 0.95) * baseRatioY);

          if (angle !== undefined) {
            angleOffset = angle;
          } else {
            angleOffset = isMovingRight ? tiltRad : -tiltRad;
          }
          break;
        }
        case 'chasing-scissors': {
          const isEven = i % 2 === 0;
          ratioX = isEven ? (progress * 0.48) : (1.0 - progress * 0.48);
          ratioY = Math.max(0.10, ((0.85 - 0.48 * progress) / 0.85) * baseRatioY);
          const tilt = 0.55 * (1.0 - progress);
          angleOffset = isEven ? tilt : -tilt;
          break;
        }
        case 'waterfall-curtain': {
          ratioX = progress;
          ratioY = Math.max(0.10, ((0.85 - 0.45 * progress) / 0.85) * baseRatioY);
          angleOffset = (Math.random() - 0.5) * 0.12;
          break;
        }
        case 'sinusoidal-wave': {
          ratioX = progress;
          ratioY = Math.max(0.10, (0.60 + 0.40 * Math.sin(progress * Math.PI * 4)) * baseRatioY);
          angleOffset = 0.35 * Math.cos(progress * Math.PI * 4);
          break;
        }
        case 'petal-bloom': {
          const isEven = i % 2 === 0;
          ratioX = isEven ? (0.5 - progress * 0.48) : (0.5 + progress * 0.48);
          ratioY = Math.max(0.10, (0.40 + 0.60 * progress) * baseRatioY);
          const tilt = 0.15 + 0.55 * Math.pow(progress, 1.8);
          angleOffset = isEven ? -tilt : tilt;
          break;
        }
        case 'teeter-totter': {
          const isEven = i % 2 === 0;
          ratioX = progress;
          ratioY = Math.max(0.10, (isEven ? (0.30 + 0.70 * progress) : (1.0 - 0.70 * progress)) * baseRatioY);
          angleOffset = isEven ? 0.42 : -0.42;
          break;
        }
        case 'vortex-tunnel': {
          const angleRad = progress * Math.PI * 2;
          ratioX = 0.5 + Math.cos(angleRad) * 0.42;
          ratioY = Math.max(0.10, (0.60 + 0.40 * Math.sin(angleRad)) * baseRatioY);
          ratioZ = 0.15 + 0.70 * progress;
          angleOffset = -0.28 * Math.cos(angleRad);
          break;
        }
        case 'stepping-stones': {
          ratioX = progress;
          const stepIndex = Math.floor(progress * 4);
          ratioY = Math.max(0.10, (0.35 + (stepIndex / 3) * 0.65) * baseRatioY);
          angleOffset = (Math.random() - 0.5) * 0.18;
          break;
        }
        case 'intertwined-helix': {
          const numPairs = Math.max(1, Math.floor(count / 2));
          const pairIndex = Math.floor(i / 2);
          const isStrandB = i % 2 !== 0;
          const pairProgress = numPairs > 1 ? pairIndex / (numPairs - 1) : 0.5;

          const defaultX1 = 0.15;
          const defaultX2 = 0.85;
          const startX = x1 !== undefined ? x1 : defaultX1;
          const endX = x2 !== undefined ? x2 : defaultX2;

          ratioX = startX + pairProgress * (endX - startX);
          ratioY = baseRatioY;
          angleOffset = angle !== undefined ? angle : 0;
          delay = pairProgress * duration;

          spiralConfig = {
            radius: 11.5,
            frequency: 4.6,
            phase: isStrandB ? Math.PI : 0,
            direction: 1
          };
          break;
        }
        case 'random':
          ratioX = Math.random();
          ratioY = config.ratioY !== undefined ? config.ratioY : Math.random();
          ratioZ = Math.random();
          angleOffset = (Math.random() - 0.5) * maxAngleOffset * 2;
          break;
      }

      // Remap ratioX to [x1, x2] range if provided for non-sweep patterns
      if (
        x1 !== undefined &&
        x2 !== undefined &&
        !pattern.startsWith('sweep') &&
        !pattern.startsWith('cascade-slope') &&
        pattern !== 'intertwined-helix'
      ) {
        ratioX = x1 + ratioX * (x2 - x1);
      }

      // Map ratioY to [y1, y2] range if provided
      if (y1 !== undefined && y2 !== undefined) {
        if (pattern.startsWith('sweep') && !pattern.startsWith('sweep-arc')) {
          const minY = Math.min(y1, y2);
          const maxY = Math.max(y1, y2);
          ratioY = minY + Math.random() * (maxY - minY);
        } else {
          let t = progress;
          if (pattern === 'random') {
            t = ratioY;
          } else if (
            pattern.startsWith('sweep-arc') ||
            pattern === 'fan' ||
            pattern === 'ripple'
          ) {
            t = Math.sin(progress * Math.PI);
          } else if (pattern === 'sinusoidal-wave') {
            t = 0.5 + 0.5 * Math.sin(progress * Math.PI * 4);
          }
          ratioY = y1 + t * (y2 - y1);
        }
      } else if (config.ratioY !== undefined) {
        const isFlatPattern = pattern === 'sweep' ||
          pattern === 'sweep-left' ||
          pattern === 'sweep-right' ||
          pattern === 'sweep-random-tilt' ||
          pattern === 'sweep-random-tilt-left' ||
          pattern === 'sweep-random-tilt-right' ||
          pattern === 'fan-sweep' ||
          pattern === 'fan-sweep-left' ||
          pattern === 'fan-sweep-right' ||
          pattern === 'fan-sweep-continuous' ||
          pattern === 'fan-burst' ||
          pattern === 'intertwined-helix' ||
          pattern === 'converge' ||
          pattern === 'diverge' ||
          pattern === 'crossfire' ||
          pattern === 'crossfire-burst' ||
          pattern === 'continuous';
        if (isFlatPattern) {
          ratioY = config.ratioY;
        }
      }

      let overrides = effectOverrides;
      if (spiralConfig) {
        overrides = {
          ...(overrides || {}),
          spiral: spiralConfig
        };
      }
      if (
        config.instantBurst !== undefined 
        || config.shellSize !== undefined 
        || config.shapeType !== undefined
        || config.dynamicsType !== undefined
        || config.pistil !== undefined
        || config.effects !== undefined
        || config.strobe !== undefined 
        || config.crackle !== undefined
        || config.flow !== undefined
        || config.cometTrail !== undefined 
        || config.thickTrail !== undefined 
        || config.thinTrail !== undefined 
        || config.launchTrail !== undefined
      ) {
        overrides = { ...(overrides || {}) };
        if (config.instantBurst !== undefined) overrides.instantBurst = config.instantBurst;
        if (config.shellSize !== undefined) overrides.shellSize = config.shellSize;
        if (config.shapeType !== undefined) overrides.shapeType = config.shapeType;
        if (config.dynamicsType !== undefined) overrides.dynamicsType = config.dynamicsType;
        if (config.pistil !== undefined) overrides.pistil = config.pistil;
        if (config.effects !== undefined) overrides.effects = config.effects;
        if (config.strobe !== undefined) overrides.strobe = config.strobe;
        if (config.crackle !== undefined) overrides.crackle = config.crackle;
        if (config.flow !== undefined) overrides.flow = config.flow;
        if (config.cometTrail !== undefined) {
          if (config.cometTrail === 'none') {
            overrides.launchTrail = false;
            overrides.thickTrail = false;
            overrides.thinTrail = false;
            overrides.instantBurst = true;
          } else if (config.cometTrail === 'thick') {
            overrides.launchTrail = true;
            overrides.thickTrail = true;
            overrides.thinTrail = false;
          } else if (config.cometTrail === 'thin') {
            overrides.launchTrail = true;
            overrides.thickTrail = false;
            overrides.thinTrail = true;
          } else if (config.cometTrail === 'normal') {
            overrides.launchTrail = true;
            overrides.thickTrail = false;
            overrides.thinTrail = false;
          }
        }
      }

      this.activeTasks.push({
        timeToLaunch: delay,
        preset,
        isComet: true,
        options: {
          ratioX,
          ratioY,
          ratioZ,
          angleOffset,
          sectorId,
          color,
          spiral: spiralConfig,
          effectOverrides: overrides
        }
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
