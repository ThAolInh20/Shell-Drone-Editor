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
    this.shapeRegistry = new Set(['sphere', 'ring', 'heart', 'willow', 'star', 'lightning', 'oval', 'flower', 'cat', 'fish', 'smiley', 'crossette']);
    this.effectRegistry = new Set(['standard', 'crackle', 'flow', 'snow', 'wave', 'flower', 'strobe', 'heart', 'oval', 'crossette', 'crossette-v2', 'floral', 'falling-leaves']);
    this.presetMenuEntries = [
      { key: 'random', label: 'Random' },
      { key: 'crysanthemum', label: 'Chrysanthemum' },
      { key: 'crackle', label: 'Crackle' },
      { key: 'crossette', label: 'Crossette' },
      { key: 'crossetteV2', label: 'CrossetteV2' },
      { key: 'fallingLeaves', label: 'Falling Leaves' },
      { key: 'floral', label: 'Floral' },
      { key: 'rumble', label: 'Rumble' },
      { key: 'flower', label: 'Flower' },
      { key: 'cat', label: 'Cat' },
      { key: 'ring', label: 'Ring' },
      { key: 'ringV2', label: 'RingV2' },
      { key: 'oval', label: 'Oval' },
      { key: 'snow', label: 'Snow' },
      { key: 'fish', label: 'Fish' },
      { key: 'smiley', label: 'Smiley' },
      { key: 'wave', label: 'Wave' },
      { key: 'heart', label: 'Heart' }
    ];
  }

  randomPreset() {
    const roll = Math.random();

    if (roll < 0.14) return this.crysanthemumShell();
    if (roll < 0.22) return this.crackleShell();
    if (roll < 0.29) return this.crossetteShell();
    if (roll < 0.35) return this.crossetteShellV2();
    if (roll < 0.41) return this.fallingLeavesShell();
    if (roll < 0.47) return this.floralShell();
    if (roll < 0.55) return this.rumbleShell();
    if (roll < 0.61) return this.flowerShell();
    if (roll < 0.67) return this.catShell();
    if (roll < 0.74) return this.ringShell();
    if (roll < 0.8) return this.ringShellV2();
    if (roll < 0.87) return this.ovalShell();
    if (roll < 0.92) return this.snowShell();
    if (roll < 0.96) return this.fishShell();
    if (roll < 0.985) return this.smileyShell();
    if (roll < 0.995) return this.waveShell();
    return this.hearthShell();
  }

  getPresetMenuEntries() {
    return this.presetMenuEntries.map(entry => ({ ...entry }));
  }

  createPresetByKey(key) {
    switch (key) {
      case 'crysanthemum':
        return this.validatePreset(this.crysanthemumShell());
      case 'crackle':
        return this.validatePreset(this.crackleShell());
      case 'crossette':
        return this.validatePreset(this.crossetteShell());
      case 'crossetteV2':
        return this.validatePreset(this.crossetteShellV2());
      case 'fallingLeaves':
        return this.validatePreset(this.fallingLeavesShell());
      case 'floral':
        return this.validatePreset(this.floralShell());
      case 'rumble':
        return this.validatePreset(this.rumbleShell());
      case 'flower':
        return this.validatePreset(this.flowerShell());
      case 'cat':
        return this.validatePreset(this.catShell());
      case 'ring':
        return this.validatePreset(this.ringShell());
      case 'ringV2':
        return this.validatePreset(this.ringShellV2());
      case 'oval':
        return this.validatePreset(this.ovalShell());
      case 'snow':
        return this.validatePreset(this.snowShell());
      case 'fish':
        return this.validatePreset(this.fishShell());
      case 'smiley':
        return this.validatePreset(this.smileyShell());
      case 'wave':
        return this.validatePreset(this.waveShell());
      case 'heart':
        return this.validatePreset(this.hearthShell());
      case 'random':
      default:
        return null;
    }
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
      shapeRenderMode: 'filled',
      particleCountMultiplier: 1,
      crackle: false,
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
      crackle: true,
      half: true
    };
  }

  crackleShell(size = 1) {
    return {
      ...this.basePreset(size),
      shellType: 'crackle',
      shapeType: 'sphere',
      effectType: 'crackle',
      particleCountMultiplier: 1.2,
      crackle: true,
      pistil: false,
      streamers: false
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
      shellType: 'ringV2',
      shapeType: 'ring',
      effectType: 'strobe',
      shapeRenderMode: 'outline',
      particleCountMultiplier: 1.2,
      outlineThickness: 0.04,
      ringColorMode: 'sequential',
      ringPalette: this.palette,
      ringColorSpeed: 1,
      ringLoop: false,
      doubleRing: true
    };
  }

  ringShell(size = 1) {
    return {
      ...this.basePreset(size),
      shellType: 'ring',
      shapeType: 'ring',
      effectType: 'standard',
      shapeRenderMode: 'outline',
      particleCountMultiplier: 1.25,
      outlineThickness: 0.04,
      doubleRing: false,
      streamers: Math.random() < 0.3
    };
  }

  crossetteShell(size = 1) {
    return {
      ...this.basePreset(size),
      shellType: 'crossette',
      shapeType: 'crossette',
      effectType: 'crossette',
      particleCountMultiplier: 1.45,
      crossette: true,
      starLife: 750 + size * 160,
      starDensity: 0.85,
      pistil: Math.random() < 0.5
    };
  }

  crossetteShellV2(size = 1) {
    return {
      ...this.basePreset(size),
      shellType: 'crossetteV2',
      shapeType: 'crossette',
      effectType: 'crossette-v2',
      particleCountMultiplier: 1.55,
      crossetteV2: true,
      starLife: 780 + size * 170,
      starDensity: 0.8,
      pistil: Math.random() < 0.5
    };
  }

  floralShell(size = 1) {
    return {
      ...this.basePreset(size),
      shellType: 'floral',
      shapeType: 'flower',
      effectType: 'floral',
      particleCountMultiplier: 1.25,
      floral: true,
      starDensity: 0.12,
      starLife: 500 + size * 50,
      starLifeVariation: 0.5,
      pistil: false,
      streamers: false
    };
  }

  fallingLeavesShell(size = 1) {
    return {
      ...this.basePreset(size),
      shellType: 'fallingLeaves',
      shapeType: 'sphere',
      effectType: 'falling-leaves',
      particleCountMultiplier: 1.05,
      fallingLeaves: true,
      starDensity: 0.12,
      starLife: 1200 + size * 120,
      starLifeVariation: 0.5,
      glitter: 'medium',
      glitterColor: COLOR.Gold,
      pistil: false,
      streamers: false
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
      shapeRenderMode: 'outline',
      particleCountMultiplier: 1.7,
      outlineThickness: 0.03,
      heartEdgeBias: 1,
      heartSegmentCount: 96,
      heartEdgeSharpness: 1.06,
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
      crackle: Boolean(preset?.crackle),
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