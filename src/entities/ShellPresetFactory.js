const COLOR = {
  Red: 'red',
  Gold: 'gold',
  White: 'white',
  Blue: 'blue'
};

const PRESET_COLORS = [
  0xffd700,
  0xff4500,
  0x00bfff,
  0xff69b4,
  0x7fffd4,
  0x8a2be2
];

export class ShellPresetFactory {
  constructor() {
    this.palette = [COLOR.Red, COLOR.Gold, COLOR.White, COLOR.Blue];
    this.shapeRegistry = new Set(['sphere', 'ring', 'heart', 'willow', 'star', 'lightning', 'oval', 'flower', 'cat', 'fish', 'smiley']);
    this.effectRegistry = new Set(['standard', 'crackle', 'flow', 'snow', 'wave', 'flower', 'strobe', 'heart', 'oval']);
  }

  randomPreset() {
    const roll = Math.random();

    if (roll < 0.18) return this.crysanthemumShell();
    if (roll < 0.30) return this.rumbleShell();
    if (roll < 0.42) return this.flowerShell();
    if (roll < 0.50) return this.catShell();
    if (roll < 0.64) return this.ringShellV2();
    if (roll < 0.76) return this.ovalShell();
    if (roll < 0.84) return this.snowShell();
    if (roll < 0.92) return this.fishShell();
    if (roll < 0.97) return this.smileyShell();
    if (roll < 0.985) return this.waveShell();
    return this.hearthShell();
  }

  basePreset(size = 1) {
    const glitter = Math.random() < 0.25;
    const singleColor = Math.random() < 0.72;
    const color = this.randomColor(singleColor ? { limitWhite: true } : undefined);
    const pistil = singleColor && Math.random() < 0.42;
    const pistilColor = pistil ? this.makePistilColor(color) : null;
    const secondColor = singleColor && (Math.random() < 0.2 || color === COLOR.White)
      ? (pistilColor || this.randomColor({ notColor: color, limitWhite: true }))
      : null;
    const streamers = !pistil && color !== COLOR.White && Math.random() < 0.42;

    let starDensity = glitter ? 1.1 : 1.25;
    starDensity *= 1;

    return {
      shellSize: size,
      spreadSize: 300 + size * 100,
      starLife: 900 + size * 200,
      starDensity,
      color,
      secondColor,
      glitter: glitter ? 'light' : '',
      glitterColor: this.whiteOrGold(),
      pistil,
      pistilColor,
      streamers,
      shellType: 'generic',
      shapeType: 'sphere',
      effectType: 'standard',
      launchTrail: true
    };
  }

  crysanthemumShell(size = 1) {
    return {
      ...this.basePreset(size),
      shellType: 'crysanthemum',
      shapeType: 'sphere',
      effectType: 'standard',
      flower: false,
      smiley: false,
      hearth: false,
      star: false,
      doubleRing: false
    };
  }

  rumbleShell(size = 1) {
    return {
      ...this.basePreset(size),
      pistil: true,
      shellType: 'rumble',
      shapeType: 'sphere',
      effectType: 'crackle',
      half: true
    };
  }

  flowerShell(size = 1) {
    return {
      ...this.basePreset(size),
      pistil: true,
      shellType: 'flower',
      shapeType: 'flower',
      effectType: 'flower',
      flower: true
    };
  }

  catShell(size = 1) {
    return {
      ...this.basePreset(size),
      pistil: false,
      shellType: 'cat',
      shapeType: 'cat',
      effectType: 'standard',
      cat: true
    };
  }

  ringShellV2(size = 1) {
    return {
      ...this.basePreset(size),
      shellType: 'ring',
      shapeType: 'ring',
      effectType: 'strobe',
      ringColorMode: 'sequential',
      ringPalette: this.palette,
      ringColorSpeed: 1,
      ringLoop: false,
      doubleRing: true
    };
  }

  ovalShell(size = 1) {
    return {
      ...this.basePreset(size),
      pistil: false,
      shellType: 'oval',
      shapeType: 'oval',
      effectType: 'oval',
      oval: true
    };
  }

  snowShell(size = 1) {
    return {
      ...this.basePreset(size),
      shellType: 'snow',
      shapeType: 'sphere',
      effectType: 'snow',
      snow: true
    };
  }

  fishShell(size = 1) {
    return {
      ...this.basePreset(size),
      shellType: 'fish',
      shapeType: 'fish',
      effectType: 'flow',
      fish: true
    };
  }

  smileyShell(size = 1) {
    return {
      ...this.basePreset(size),
      shellType: 'smiley',
      shapeType: 'smiley',
      effectType: 'strobe',
      smiley: true
    };
  }

  waveShell(size = 1) {
    return {
      ...this.basePreset(size),
      shellType: 'wave',
      shapeType: 'sphere',
      effectType: 'wave',
      strobe: true,
      wave: true
    };
  }

  hearthShell(size = 1) {
    return {
      ...this.basePreset(size),
      pistil: true,
      shellType: 'heart',
      shapeType: 'heart',
      effectType: 'heart',
      streamers: false,
      hearth: true
    };
  }

  validatePreset(preset) {
    const shapeType = preset?.shapeType ?? 'sphere';
    const effectType = preset?.effectType ?? 'standard';
    const shapeFallback = !this.shapeRegistry.has(shapeType);
    const effectFallback = !this.effectRegistry.has(effectType);
    const warnings = [];

    if (shapeFallback) {
      warnings.push(`[ShellPresetFactory] Unknown shapeType "${shapeType}". Falling back to sphere.`);
    }

    if (effectFallback) {
      warnings.push(`[ShellPresetFactory] Unknown effectType "${effectType}". Falling back to standard.`);
    }

    return {
      ...preset,
      shapeType: shapeFallback ? 'sphere' : shapeType,
      effectType: effectFallback ? 'standard' : effectType,
      __contract: {
        shapeFallback,
        effectFallback,
        warnings
      }
    };
  }

  randomColor(options = {}) {
    const colorValue = PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
    if (options.limitWhite && Math.random() < 0.2) {
      return COLOR.White;
    }
    if (options.notColor) {
      return colorValue;
    }
    return colorValue;
  }

  makePistilColor(color) {
    return color === COLOR.White ? COLOR.Gold : COLOR.White;
  }

  whiteOrGold() {
    return Math.random() < 0.5 ? COLOR.White : COLOR.Gold;
  }
}