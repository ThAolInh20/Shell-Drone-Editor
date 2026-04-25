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
        if (task.preset && (task.preset.type === 'comet_cluster' || task.preset.type === 'comet')) {
          this.cometSystem.launchRandom(task.preset, task.options);
        } else {
          this.fireworkSystem.launchRandom(task.preset, task.options);
        }
        this.activeTasks.splice(i, 1);
      }
    }
  }

  playPattern(pattern, config) {
    const { count = 10, duration = 2.0, preset = null, sectorId, color, x1, x2, y1, y2, effectOverrides, instantBurst, shellSize } = config;

    for (let i = 0; i < count; i++) {
      const progress = count > 1 ? i / (count - 1) : 0;
      let ratioX = 0.5;
      let ratioY = 0.5;
      let ratioZ = 0.5;

      const delay = progress * duration;

      switch (pattern) {
        case 'sweep-left': // Right to left
          ratioX = 1.0 - progress;
          break;
        case 'sweep-right': // Left to right
          ratioX = progress;
          break;
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
          ratioY = Math.sin(progress * Math.PI) * 0.6 + 0.4;
          break;
        case 'random':
          ratioX = Math.random();
          ratioY = Math.random();
          ratioZ = Math.random();
          break;
      }

      // Remap ratioX to [x1, x2] range if provided
      if (x1 !== undefined && x2 !== undefined) {
        ratioX = x1 + ratioX * (x2 - x1);
      }

      // Allow config overrides
      if (y1 !== undefined && y2 !== undefined) {
        const t = pattern === 'random' ? ratioY : progress;
        ratioY = y1 + t * (y2 - y1);
      } else if (config.ratioY !== undefined) {
        ratioY = config.ratioY;
      }

      if (config.ratioZ !== undefined) ratioZ = config.ratioZ;

      let overrides = effectOverrides;
      if (instantBurst !== undefined || shellSize !== undefined) {
        overrides = { ...(overrides || {}) };
        if (instantBurst !== undefined) overrides.instantBurst = instantBurst;
        if (shellSize !== undefined) overrides.shellSize = shellSize;
      }

      this.activeTasks.push({
        timeToLaunch: delay,
        preset,
        options: { ratioX, ratioY, ratioZ, sectorId, color, effectOverrides: overrides }
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
      let ratioY = config.ratioY !== undefined ? config.ratioY : 0.5;
      let ratioZ = config.ratioZ !== undefined ? config.ratioZ : 0.5;

      switch (pattern) {
        case 'continuous':
          // Thêm độ lệch ngẫu nhiên nhỏ để trông tự nhiên hơn (khoảng +/- 5 độ)
          angleOffset = (Math.random() - 0.5) * 0.47;
          break;
        case 'fan-sweep-right':
          // Sweeps left to right
          angleOffset = maxAngleOffset - (2 * maxAngleOffset) * progress;
          break;
        case 'fan-sweep-left':
          // Sweeps right to left
          angleOffset = -maxAngleOffset + (2 * maxAngleOffset) * progress;
          break;
        case 'fan-sweep-continuous':
          // Sweeps back and forth `sweepCount` times
          angleOffset = Math.cos(progress * Math.PI * sweepCount) * maxAngleOffset;
          break;
        case 'fan-burst':
          // All at once, spread like a fan
          angleOffset = maxAngleOffset - (2 * maxAngleOffset) * progress;
          delay = 0; // All fired at same time
          break;
        case 'sweep-right':
          // Bắn dọc theo x1 -> x2 (trái qua phải), nghiêng cố định
          ratioX = progress;
          angleOffset = angle !== undefined ? angle : Math.PI / 12; // Mặc định nghiêng sang phải 15 độ
          break;
        case 'sweep-left':
          // Bắn dọc theo x2 -> x1 (phải qua trái), nghiêng cố định
          ratioX = 1.0 - progress;
          angleOffset = angle !== undefined ? angle : -Math.PI / 12; // Mặc định nghiêng sang trái 15 độ
          break;
        case 'random':
          ratioX = Math.random();
          ratioY = Math.random();
          ratioZ = Math.random();
          angleOffset = (Math.random() - 0.5) * maxAngleOffset * 2;
          break;
      }

      // Remap ratioX to [x1, x2] range if provided
      if (x1 !== undefined && x2 !== undefined) {
        ratioX = x1 + ratioX * (x2 - x1);
      }

      // Map ratioY to [y1, y2] range if provided
      if (y1 !== undefined && y2 !== undefined) {
        const t = pattern === 'random' ? ratioY : progress;
        ratioY = y1 + t * (y2 - y1);
      }

      this.activeTasks.push({
        timeToLaunch: delay,
        preset,
        options: { ratioX, ratioY, ratioZ, angleOffset, sectorId, color, effectOverrides }
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
