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
        if (task.preset && task.preset.type === 'comet_cluster') {
          this.cometSystem.launchRandom(task.preset, task.options);
        } else {
          this.fireworkSystem.launchRandom(task.preset, task.options);
        }
        this.activeTasks.splice(i, 1);
      }
    }
  }

  playPattern(pattern, config) {
    const { count = 10, duration = 2.0, preset = null } = config;
    
    for (let i = 0; i < count; i++) {
      const progress = count > 1 ? i / (count - 1) : 0;
      let ratioX = 0.5;
      let ratioY = 0.5;
      let ratioZ = 0.5;
      
      const delay = progress * duration;

      switch(pattern) {
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
      }

      // Allow config overrides
      if (config.ratioY !== undefined) ratioY = config.ratioY;
      if (config.ratioZ !== undefined) ratioZ = config.ratioZ;

      this.activeTasks.push({
        timeToLaunch: delay,
        preset,
        options: { ratioX, ratioY, ratioZ }
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
