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
    this.shapeRegistry = new Set(['sphere', 'ring', 'heart', 'willow', 'willow-up', 'star', 'lightning', 'oval', 'flower', 'cat', 'fish', 'smiley', 'half-flash', 'split-flash', 'galaxy']);
    this.effectRegistry = new Set(['standard', 'crackle', 'flow', 'snow', 'wave', 'flower', 'strobe', 'white-strobe', 'glitter-strobe', 'heart', 'oval', 'floral', 'falling-leaves', 'falling-comets', 'falling-comets-glitter', 'crysanthemum-trail', 'crysanthemum-cc', 'galaxy-spin', 'comet-ring']);
    this.presetMenuEntries = [
      { key: 'random', label: 'Random' },
      { key: 'comet_cluster', label: 'Comet Cluster' },
      { key: 'comet_cluster_notrail', label: 'Comet Cluster (No Trail)' },
      { key: 'crysanthemum', label: 'Chrysanthemum' },
      { key: 'crysanthemumV2', label: 'Chrysanthemum V2' },
      { key: 'crysanthemumCC', label: 'Chrysanthemum Color Change' },
      { key: 'crackle', label: 'Crackle' },
      { key: 'strobe', label: 'Strobe' },
      { key: 'whiteStrobe', label: 'White Strobe' },
      { key: 'glitterStrobe', label: 'Glitter Strobe' },
      { key: 'weepingWillowComets', label: 'Weeping Willow Comets' },
      { key: 'weepingWillowCometsV2', label: 'Weeping Willow Comets V2' },
      { key: 'weepingWillowCometsV3', label: 'Weeping Willow Comets V3 (Glitter)' },
      { key: 'fallingLeaves', label: 'Falling Leaves' },
      { key: 'floral', label: 'Floral' },
      { key: 'bouquet', label: 'Bouquet (Cluster)' },
      { key: 'bouquetV2', label: 'Bouquet V2 (Parent Color)' },
      { key: 'bouquetV2Multicolor', label: 'Bouquet V2 (Multi Color)' },
      { key: 'rumble', label: 'Rumble' },
      { key: 'flower', label: 'Flower' },
      { key: 'cat', label: 'Cat' },
      { key: 'ring', label: 'Ring' },
      { key: 'ringV2', label: 'RingV2' },
      { key: 'ringComet', label: 'Comet Ring' },
      { key: 'oval', label: 'Oval' },
      { key: 'snow', label: 'Snow' },
      { key: 'fish', label: 'Fish' },
      { key: 'fishV2', label: 'Fish V2 (Spherical)' },
      { key: 'smiley', label: 'Smiley' },
      { key: 'wave', label: 'Wave' },
      { key: 'heart', label: 'Heart' },
      { key: 'star', label: 'Star' },
      { key: 'ghost', label: 'Ghost' },
      { key: 'falling-comets', label: 'Falling Comets' },
      { key: 'halfFlash', label: 'Half Sphere Flash' },
      { key: 'splitFlash', label: 'Split Sphere Flash' },
      { key: 'sparkling_comet', label: 'Sparkling Comet (Apex Spark)' },
      { key: 'galaxy', label: 'Spiral Galaxy' }
    ];

    // Registry for dynamic preset strategies (OCP compliance)
    this.presetsRegistry = new Map();
    this.initializePresetsRegistry();
  }

  registerPreset(key, generatorFn, menuEntry = null) {
    this.presetsRegistry.set(key, generatorFn);
    if (menuEntry) {
      this.presetMenuEntries.push(menuEntry);
    }
  }

  initializePresetsRegistry() {
    this.presetsRegistry.set('crysanthemum', (size) => this.crysanthemumShell(size));
    this.presetsRegistry.set('crysanthemumV2', (size) => this.crysanthemumV2Shell(size));
    this.presetsRegistry.set('crysanthemumCC', (size) => this.crysanthemumCCShell(size));
    this.presetsRegistry.set('crackle', (size) => this.crackleShell(size));
    this.presetsRegistry.set('strobe', (size) => this.strobeShell(size));
    this.presetsRegistry.set('whiteStrobe', (size) => this.whiteStrobeShell(size));
    this.presetsRegistry.set('glitterStrobe', (size) => this.glitterStrobeShell(size));
    this.presetsRegistry.set('weepingWillowComets', (size) => this.weepingWillowCometsShell(size));
    this.presetsRegistry.set('weepingWillowCometsV2', (size) => this.weepingWillowCometsV2Shell(size));
    this.presetsRegistry.set('weepingWillowCometsV3', (size) => this.weepingWillowCometsV3Shell(size));
    this.presetsRegistry.set('fallingLeaves', (size) => this.fallingLeavesShell(size));
    this.presetsRegistry.set('floral', (size) => this.floralShell(size));
    this.presetsRegistry.set('bouquet', (size) => this.bouquetShell(size));
    this.presetsRegistry.set('bouquetV2', (size) => this.bouquetV2Shell(size));
    this.presetsRegistry.set('bouquetV2Multicolor', (size) => this.bouquetV2MulticolorShell(size));
    this.presetsRegistry.set('rumble', (size) => this.rumbleShell(size));
    this.presetsRegistry.set('flower', (size) => this.flowerShell(size));
    this.presetsRegistry.set('cat', (size) => this.catShell(size));
    this.presetsRegistry.set('ring', (size) => this.ringShell(size));
    this.presetsRegistry.set('ringV2', (size) => this.ringShellV2(size));
    this.presetsRegistry.set('ringComet', (size) => this.cometRingShell(size));
    this.presetsRegistry.set('oval', (size) => this.ovalShell(size));
    this.presetsRegistry.set('snow', (size) => this.snowShell(size));
    this.presetsRegistry.set('fish', (size) => this.fishShell(size));
    this.presetsRegistry.set('fishV2', (size) => this.fishV2Shell(size));
    this.presetsRegistry.set('smiley', (size) => this.smileyShell(size));
    this.presetsRegistry.set('wave', (size) => this.waveShell(size));
    this.presetsRegistry.set('heart', (size) => this.hearthShell(size));
    this.presetsRegistry.set('star', (size) => this.starShell(size));
    this.presetsRegistry.set('ghost', (size) => this.ghostShell(size));
    this.presetsRegistry.set('falling-comets', (size) => this.fallingCometsShell(size));
    this.presetsRegistry.set('halfFlash', (size) => this.halfFlashShell(size));
    this.presetsRegistry.set('splitFlash', (size) => this.splitFlashShell(size));
    this.presetsRegistry.set('comet_cluster', (size) => this.cometCluster(size));
    this.presetsRegistry.set('comet_cluster_notrail', (size) => this.cometClusterNoTrail(size));
    this.presetsRegistry.set('sparkling_comet', (size) => this.sparklingComet(size));
    this.presetsRegistry.set('galaxy', (size) => this.galaxyShell(size));
  }

  randomPreset() {
    const roll = Math.random();

    if (roll < 0.10) return this.crysanthemumShell();
    if (roll < 0.14) return this.crysanthemumV2Shell();
    if (roll < 0.22) return this.crackleShell();
    if (roll < 0.27) return this.strobeShell();
    if (roll < 0.32) return this.whiteStrobeShell();
    if (roll < 0.37) return this.glitterStrobeShell();
    if (roll < 0.42) return this.weepingWillowCometsShell();
    if (roll < 0.47) return this.fallingLeavesShell();
    if (roll < 0.52) return this.floralShell();
    if (roll < 0.57) return this.rumbleShell();
    if (roll < 0.61) return this.flowerShell();
    if (roll < 0.67) return this.catShell();
    if (roll < 0.74) return this.ringShell();
    if (roll < 0.82) return this.cometRingShell();
    if (roll < 0.86) return this.ringShellV2();
    if (roll < 0.90) return this.ovalShell();
    if (roll < 0.93) return this.snowShell();
    if (roll < 0.96) return this.fishShell();
    if (roll < 0.972) return this.smileyShell();
    if (roll < 0.982) return this.waveShell();
    if (roll < 0.988) return this.fallingCometsShell();
    if (roll < 0.992) return this.starShell();
    if (roll < 0.995) return this.halfFlashShell();
    if (roll < 0.998) return this.splitFlashShell();
    return this.hearthShell();
  }

  getPresetMenuEntries() {
    return this.presetMenuEntries.map(entry => ({ ...entry }));
  }

  createPresetByKey(key) {
    const generator = this.presetsRegistry.get(key);
    if (generator) {
      return this.validatePreset(generator());
    }
    return null;
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
      strobe: false,
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

  crysanthemumV2Shell(size = 1) {
    return {
      ...this.basePreset(size),
      shellType: 'crysanthemumV2',
      shapeType: 'sphere',
      effectType: 'crysanthemum-trail',
      flower: false,
      smiley: false,
      hearth: false,
      star: false,
      doubleRing: false
    };
  }

  crysanthemumCCShell(size = 1) {
    const base = this.basePreset(size);
    const color = base.color;

    // Choose a second color based on transition color map
    const colorMap = {
      'white': 0xff4500,     // White -> Orange Red
      0xffd700: 0x00bfff,    // Gold -> Sky Blue
      0xff4500: 0x7fffd4,    // Orange Red -> Aquamarine
      0x00bfff: 0xff69b4,    // Sky Blue -> Hot Pink
      0xff69b4: 0x7fffd4,    // Hot Pink -> Aquamarine
      0x7fffd4: 0x8a2be2,    // Aquamarine -> Blue Violet
      0x8a2be2: 0xffd700     // Blue Violet -> Gold
    };
    const secondColor = colorMap[color] || 0xffffff;

    return {
      ...base,
      color,
      secondColor,
      shellType: 'crysanthemumCC',
      shapeType: 'sphere',
      effectType: 'crysanthemum-cc',
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
      effectType: 'standard',
      crackle: true,
      half: true
    };
  }

  crackleShell(size = 1) {
    return {
      ...this.basePreset(size),
      shellType: 'crackle',
      shapeType: 'sphere',
      effectType: 'standard',
      flower: false,
      smiley: false,
      hearth: false,
      star: false,
      doubleRing: false,
      crackle: true
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
      effectType: 'standard',
      strobe: true,
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
      particleCount: Math.round(120 * size), // Đã giảm một nửa
      effectType: 'standard',
      shapeRenderMode: 'jupiter',
      particleCountMultiplier: 0.67, // Giảm một nửa so với 1.35 ban đầu
      outlineThickness: 0.035,
      ringCoreRatio: 0.42,
      ringCoreJitter: 0.08,
      doubleRing: false,
      streamers: Math.random() < 0.3
    };
  }

  cometRingShell(size = 1.8) {
    return {
      ...this.basePreset(size),
      shellType: 'ringComet',
      shapeType: 'ring',
      effectType: 'comet-ring',
      shapeRenderMode: 'outline',
      outlineThickness: 0.035,
      doubleRing: false,
      particleCountMultiplier: 0.85, // Mật độ vừa phải để giữ đường nét thanh mảnh và hiệu năng tối ưu
      color: this.whiteOrGold(),
      streamers: false,
      pistil: false,
      particleSize: 14 // Đầu hạt nhỏ hơn
    };
  }

  strobeShell(size = 1) {
    return {
      ...this.basePreset(size),
      shellType: 'strobe',
      shapeType: 'sphere',
      effectType: 'standard',
      strobe: true,
      starLife: 1000 + size * 150,
      particleCountMultiplier: 1.25,
      pistil: Math.random() < 0.4
    };
  }

  whiteStrobeShell(size = 1) {
    return {
      ...this.basePreset(size),
      shellType: 'whiteStrobe',
      shapeType: 'sphere',
      effectType: 'white-strobe',
      strobe: true,
      starLife: 1200 + size * 150,
      particleCountMultiplier: 1.3,
      pistil: Math.random() < 0.4
    };
  }

  glitterStrobeShell(size = 1) {
    return {
      ...this.basePreset(size),
      shellType: 'glitterStrobe',
      shapeType: 'sphere',
      effectType: 'glitter-strobe',
      strobe: true,
      starLife: 1500 + size * 200,
      particleCountMultiplier: 1.6, // Nhiều hạt để trông giống kim tuyến
      pistil: false
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

  bouquetShell(size = 1) {
    return {
      type: 'bouquet',
      shellType: 'bouquet',
      shapeType: 'sphere',
      effectType: 'standard',
      shellSize: size
    };
  }

  bouquetV2Shell(size = 1) {
    return {
      type: 'bouquetv2',
      shellType: 'bouquetv2',
      shapeType: 'sphere',
      effectType: 'standard',
      shellSize: size,
      colorMode: 'parent',
      launchTrail: true
    };
  }

  bouquetV2MulticolorShell(size = 1) {
    return {
      type: 'bouquetv2',
      shellType: 'bouquetv2',
      shapeType: 'sphere',
      effectType: 'standard',
      shellSize: size,
      colorMode: 'random',
      launchTrail: true
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

  fishV2Shell(size = 1) {
    return {
      ...this.basePreset(size),
      shellType: 'fishV2',
      shapeType: 'sphere',
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
      pistil: false,
      starLife: 850 + size * 150,
      shellType: 'heart',
      shapeType: 'heart',
      effectType: 'heart',
      shapeRenderMode: 'outline',
      particleCountMultiplier: 0.85,
      outlineThickness: 0.03,
      heartEdgeBias: 1,
      heartSegmentCount: 96,
      heartEdgeSharpness: 1.06,
      hearth: true
    };
  }

  starShell(size = 1) {
    return {
      ...this.basePreset(size),
      pistil: false,
      starLife: 850 + size * 150,
      shellType: 'star',
      shapeType: 'star',
      effectType: 'star',
      shapeRenderMode: 'outline',
      particleCountMultiplier: 0.9,
      star: true
    };
  }

  ghostShell(size = 1) {
    const base = this.basePreset(size);
    const color = base.color;

    // Choose a second color based on transition color map
    const colorMap = {
      'white': 0xff4500,     // White -> Orange Red
      0xffd700: 0x00bfff,    // Gold -> Sky Blue
      0xff4500: 0x7fffd4,    // Orange Red -> Aquamarine
      0x00bfff: 0xff69b4,    // Sky Blue -> Hot Pink
      0xff69b4: 0x7fffd4,    // Hot Pink -> Aquamarine
      0x7fffd4: 0x8a2be2,    // Aquamarine -> Blue Violet
      0x8a2be2: 0xffd700     // Blue Violet -> Gold
    };
    const secondColor = colorMap[color] || 0xffffff;

    return {
      ...base,
      color,
      secondColor,
      shellType: 'ghost',
      shapeType: 'sphere',
      effectType: 'ghost',
      particleCountMultiplier: 1.5, // Nhiều hạt để thấy rõ làn sóng đổi màu quét qua
      starLife: 1500 + size * 200,
      ghost: true
    };
  }

  cometCluster(size = 1) {
    return {
      type: 'comet_cluster',
      shellType: 'comet_cluster',
      shapeType: 'sphere',
      effectType: 'standard',
      clusterCount: 8 + Math.floor(Math.random() * 4),
      particleCountMultiplier: 1.5,
      crackle: false,
      launchTrail: true
    };
  }

  cometClusterNoTrail(size = 1) {
    return {
      type: 'comet_cluster',
      shellType: 'comet_cluster_notrail',
      shapeType: 'sphere',
      effectType: 'standard',
      clusterCount: 8 + Math.floor(Math.random() * 4),
      particleCountMultiplier: 1.5,
      crackle: false,
      launchTrail: false,
      launchSmoke: true
    };
  }

  sparklingComet(size = 1) {
    return {
      type: 'comet_cluster',
      shellType: 'comet_cluster',
      shapeType: 'sphere',
      effectType: 'standard',
      clusterCount: 6 + Math.floor(Math.random() * 3),
      particleCountMultiplier: 1.2,
      crackle: false,
      launchTrail: true,
      sparkleAtEnd: true,
      maxDecayTime: 1.8,
      strobe: true
    };
  }

  fallingCometsShell(size = 1) {
    return {
      ...this.basePreset(size),
      shellType: 'fallingComets',
      shapeType: 'sphere',
      effectType: 'falling-comets',
      particleCountMultiplier: 0.4, // Tăng nhẹ số hạt lên một chút để bù đắp
      starLife: 2000 + size * 500,  // Tăng thời gian tồn tại của các hạt chính
      color: this.whiteOrGold(),    // Sang trọng (Trắng/Vàng)
      crackle: false,
      launchTrail: true,
      pistil: false,
      streamers: false
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
      strobe: Boolean(preset?.strobe),
      crackle: Boolean(preset?.crackle),
      __contract: {
        shapeFallback,
        effectFallback,
        warnings
      }
    };
  }

  weepingWillowCometsShell(size = 1) {
    return {
      ...this.basePreset(size),
      shellType: 'weepingWillow',
      shapeType: 'willow',
      effectType: 'falling-comets',
      instantBurst: true, // Nổ trực tiếp trên không trung, không cần bay lên
      color: this.whiteOrGold(), // Vàng hoặc Trắng để tạo cảm giác rực rỡ, sang trọng
      particleCountMultiplier: 0.7, // Giảm số lượng hạt để màn hình không bị quá đặc
      starLife: 2000 + size * 500, // Tồn tại lâu để hạt rủ xuống thấp
      pistil: false
    };
  }

  weepingWillowCometsV2Shell(size = 1) {
    return {
      ...this.basePreset(size),
      shellType: 'weepingWillowV2',
      shapeType: 'willow-up',
      effectType: 'falling-comets',
      instantBurst: true, // Nổ trực tiếp
      color: this.whiteOrGold(),
      particleCountMultiplier: 0.8, // Giảm một nửa số lượng hạt
      starLife: 2500 + size * 500, // Rơi lâu hơn v1 vì phải phóng lên rồi mới rớt xuống
      pistil: false
    };
  }

  weepingWillowCometsV3Shell(size = 1) {
    return {
      ...this.basePreset(size),
      shellType: 'weepingWillowV3',
      shapeType: 'willow-up', // Dùng lại hình hất vọt lên cao
      effectType: 'falling-comets-glitter', // Kết hợp kim tuyến
      instantBurst: true,
      color: this.whiteOrGold(),
      particleCountMultiplier: 0.8,
      starLife: 2500 + size * 500,
      pistil: false
    };
  }

  splitFlashShell(size = 1) {
    return {
      ...this.basePreset(size),
      shellType: 'splitFlash',
      shapeType: 'split-flash',
      effectType: 'standard',
      particleCountMultiplier: 2.2,
      launchTrail: true
    };
  }

  halfFlashShell(size = 1) {
    return {
      ...this.basePreset(size),
      shellType: 'halfFlash',
      shapeType: 'half-flash',
      effectType: 'standard',
      particleCountMultiplier: 2.1,
      launchTrail: true
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

  galaxyShell(size = 1) {
    const color = Math.random() < 0.5 ? 0x00b4d8 : 0x00a896; // Tông xanh lam ngọc dịu nhẹ hơn tránh chói
    return {
      ...this.basePreset(size),
      shellType: 'galaxy',
      shapeType: 'galaxy',
      effectType: 'galaxy-spin',
      color,
      secondColor: 0xffd700,
      strobe: false,
      pistil: false, // Tắt nhụy giữa để tránh dồn hạt chói sáng
      glitter: 'light',
      glitterColor: 0xffd700,
      particleCountMultiplier: 0.65, // Giảm thêm số lượng hạt từ 0.85 xuống 0.65
      shellSize: size
    };
  }
}