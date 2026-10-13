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
    this.shapeRegistry = new Set([
      'sphere',
      'ring',
      'heart',
      'willow',
      'willow-up',
      'willow-arch',
      'star',
      'lightning',
      'oval',
      'flower',
      'cat',
      'fish',
      'smiley',
      'half-flash',
      'split-flash',
      'galaxy',
      'upward-spray',
      'double-helix',
      'sparkling-branches'
    ]);
    this.effectRegistry = new Set([
      'standard',
      'crackle',
      'flow',
      'snow',
      'wave',
      'flower',
      'floral',
      'falling-leaves',
      'falling-comets',
      'falling-comets-glitter',
      'crysanthemum-trail',
      'crysanthemum-smoke',
      'crysanthemum-spiral',
      'crysanthemum-spiral-v2',
      'crysanthemum-cc',
      'ghost',
      'ghost-kamuro',
      'galaxy-spin',
      'comet-ring',
      'bouquet-comet',
      'willow',
      'sparking',
      'sparking-v2',
      'swimming-star',
      'double-helix',
      'strobe',
      'white-strobe',
      'glitter-strobe',
      'heart',
      'oval',
      'no-trail',
      'notrail',
      'no-burst',
      'crossette',
      'sparkle-trail',
      'sparkle-apex',
      'sparkling-branch-comet'
    ]);
    this.presetMenuEntries = [
      { key: 'random', label: 'Random' },
      { key: 'multi_nested', label: '★ Multi Nested Shell' },
      { key: 'comet_cluster', label: 'Comet Cluster' },
      { key: 'comet_cluster_notrail', label: 'Comet Cluster No Trail' },
      { key: 'comet_cluster_cc', label: 'Comet Cluster Color Change' },
      { key: 'comet_cluster_thick', label: 'Comet Cluster Thick Trail' },
      { key: 'comet_cluster_detached', label: 'Comet Cluster Detached Beam' },
      { key: 'comet_cluster_cascade', label: 'Comet Cluster Cascade' },
      { key: 'comet_single', label: 'Single Comet Beam' },
      { key: 'sparkling_comet_branches', label: 'Sparkling Comet Multi Branch' },
      { key: 'crysanthemum', label: 'Chrysanthemum' },
      { key: 'crysanthemum_v2', label: 'Chrysanthemum V2' },
      { key: 'crysanthemum_smoke', label: 'Chrysanthemum Smoke' },
      { key: 'crysanthemum_spiral', label: 'Chrysanthemum Spiral' },
      { key: 'crysanthemum_spiral_v2', label: 'Chrysanthemum Spiral V2' },
      { key: 'crysanthemum_cc', label: 'Chrysanthemum Color Change' },
      { key: 'crysanthemum_nested', label: 'Chrysanthemum Nested' },
      { key: 'strobe_dying_embers', label: 'Strobe Embers' },
      { key: 'sparking', label: 'Sparking Ember Decay' },
      { key: 'sparking_v2', label: 'Sparking V2 Instant Ember' },
      { key: 'crackle', label: 'Crackle' },
      { key: 'strobe', label: 'Strobe' },
      { key: 'white_strobe', label: 'White Strobe' },
      { key: 'glitter_strobe', label: 'Glitter Strobe' },
      { key: 'weeping_willow_comets', label: 'Weeping Willow Comets' },
      { key: 'weeping_willow_comets_v2', label: 'Weeping Willow Comets V2' },
      { key: 'weeping_willow_comets_v3', label: 'Weeping Willow Comets V3' },
      { key: 'weeping_willow_arch', label: 'Weeping Willow Arch' },
      { key: 'falling_leaves', label: 'Falling Leaves' },
      { key: 'floral', label: 'Floral' },
      { key: 'bouquet', label: 'Bouquet Cluster' },
      { key: 'bouquet_comet', label: 'Bouquet Comets' },
      { key: 'bouquet_comet_sphere', label: 'Bouquet Sphere' },
      { key: 'bouquet_v2', label: 'Bouquet V2' },
      { key: 'bouquet_v2_multicolor', label: 'Bouquet V2 Multi Color' },
      { key: 'rumble', label: 'Rumble' },
      { key: 'flower', label: 'Flower' },
      { key: 'cat', label: 'Cat' },
      { key: 'ring', label: 'Ring' },
      { key: 'ring_v2', label: 'Ring V2' },
      { key: 'ring_comet', label: 'Comet Ring' },
      { key: 'oval', label: 'Oval' },
      { key: 'snow', label: 'Snow' },
      { key: 'fish', label: 'Fish' },
      { key: 'fish_v2', label: 'Fish V2 Spherical' },
      { key: 'fish_v3', label: 'Fish V3 Chrysanthemum Swimming' },
      { key: 'smiley', label: 'Smiley' },
      { key: 'wave', label: 'Wave' },
      { key: 'heart', label: 'Heart' },
      { key: 'star', label: 'Star' },
      { key: 'ghost', label: 'Ghost' },
      { key: 'falling_comets', label: 'Falling Comets' },
      { key: 'half_flash', label: 'Half Sphere Flash' },
      { key: 'split_flash', label: 'Split Sphere Flash' },
      { key: 'sparkling_comet', label: 'Sparkling Comet Apex Spark' },
      { key: 'galaxy', label: 'Spiral Galaxy' },
      { key: 'ghost_kamuro', label: 'Ghost Kamuro' },
      { key: 'double_helix', label: 'Double Helix' },
      { key: 'crossette', label: 'Crossette' }
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
    // Canonical snake_case keys & legacy camelCase aliases
    const registerWithAlias = (snakeKey, camelKey, fn) => {
      this.presetsRegistry.set(snakeKey, fn);
      if (camelKey && camelKey !== snakeKey) {
        this.presetsRegistry.set(camelKey, fn);
      }
    };

    registerWithAlias('crysanthemum', 'crysanthemum', (size) => this.crysanthemumShell(size));
    registerWithAlias('crysanthemum_v2', 'crysanthemumV2', (size) => this.crysanthemumV2Shell(size));
    registerWithAlias('crysanthemum_smoke', 'crysanthemumSmoke', (size) => this.crysanthemumSmokeShell(size));
    registerWithAlias('crysanthemum_spiral', 'crysanthemumSpiral', (size) => this.crysanthemumSpiralShell(size));
    registerWithAlias('crysanthemum_spiral_v2', 'crysanthemumSpiralV2', (size) => this.crysanthemumSpiralV2Shell(size));
    registerWithAlias('crysanthemum_cc', 'crysanthemumCC', (size) => this.crysanthemumCCShell(size));
    registerWithAlias('crysanthemum_nested', 'crysanthemumNested', (size) => this.crysanthemumNestedShell(size));
    registerWithAlias('multi_nested', 'multiNested', (size) => this.multiNestedShell(size));
    registerWithAlias('sparking', 'sparking', (size) => this.sparkingShell(size));
    registerWithAlias('sparking_v2', 'sparkingV2', (size) => this.sparkingV2Shell(size));
    registerWithAlias('crackle', 'crackle', (size) => this.crackleShell(size));
    registerWithAlias('strobe', 'strobe', (size) => this.strobeShell(size));
    registerWithAlias('strobe_dying_embers', 'strobeDyingEmbers', (size) => this.strobeDyingEmbersShell(size));
    registerWithAlias('white_strobe', 'whiteStrobe', (size) => this.whiteStrobeShell(size));
    registerWithAlias('glitter_strobe', 'glitterStrobe', (size) => this.glitterStrobeShell(size));
    registerWithAlias('weeping_willow_comets', 'weepingWillowComets', (size) => this.weepingWillowCometsShell(size));
    registerWithAlias('weeping_willow_comets_v2', 'weepingWillowCometsV2', (size) => this.weepingWillowCometsV2Shell(size));
    registerWithAlias('weeping_willow_comets_v3', 'weepingWillowCometsV3', (size) => this.weepingWillowCometsV3Shell(size));
    registerWithAlias('weeping_willow_arch', 'weepingWillowArch', (size) => this.weepingWillowArchShell(size));
    registerWithAlias('falling_leaves', 'fallingLeaves', (size) => this.fallingLeavesShell(size));
    registerWithAlias('floral', 'floral', (size) => this.floralShell(size));
    registerWithAlias('bouquet', 'bouquet', (size) => this.bouquetShell(size));
    registerWithAlias('bouquet_comet', 'bouquetComet', (size) => this.bouquetCometShell(size));
    registerWithAlias('bouquet_comet_sphere', 'bouquetCometSphere', (size) => this.bouquetCometSphereShell(size));
    registerWithAlias('bouquet_v2', 'bouquetV2', (size) => this.bouquetV2Shell(size));
    registerWithAlias('bouquet_v2_multicolor', 'bouquetV2Multicolor', (size) => this.bouquetV2MulticolorShell(size));
    registerWithAlias('rumble', 'rumble', (size) => this.rumbleShell(size));
    registerWithAlias('flower', 'flower', (size) => this.flowerShell(size));
    registerWithAlias('cat', 'cat', (size) => this.catShell(size));
    registerWithAlias('ring', 'ring', (size) => this.ringShell(size));
    registerWithAlias('ring_v2', 'ringV2', (size) => this.ringShellV2(size));
    registerWithAlias('ring_comet', 'ringComet', (size) => this.cometRingShell(size));
    registerWithAlias('oval', 'oval', (size) => this.ovalShell(size));
    registerWithAlias('snow', 'snow', (size) => this.snowShell(size));
    registerWithAlias('fish', 'fish', (size) => this.fishShell(size));
    registerWithAlias('fish_v2', 'fishV2', (size) => this.fishV2Shell(size));
    registerWithAlias('fish_v3', 'fishV3', (size) => this.fishV3Shell(size));
    registerWithAlias('smiley', 'smiley', (size) => this.smileyShell(size));
    registerWithAlias('wave', 'wave', (size) => this.waveShell(size));
    registerWithAlias('heart', 'heart', (size) => this.hearthShell(size));
    registerWithAlias('star', 'star', (size) => this.starShell(size));
    registerWithAlias('ghost', 'ghost', (size) => this.ghostShell(size));
    registerWithAlias('falling_comets', 'falling-comets', (size) => this.fallingCometsShell(size));
    registerWithAlias('half_flash', 'halfFlash', (size) => this.halfFlashShell(size));
    registerWithAlias('split_flash', 'splitFlash', (size) => this.splitFlashShell(size));
    registerWithAlias('comet_cluster', 'comet_cluster', (size) => this.cometCluster(size));
    registerWithAlias('comet_cluster_notrail', 'comet_cluster_notrail', (size) => this.cometClusterNoTrail(size));
    registerWithAlias('comet_cluster_cc', 'comet_cluster_cc', (size) => this.cometClusterCC(size));
    registerWithAlias('comet_cluster_thick', 'comet_cluster_thick', (size) => this.cometClusterThick(size));
    registerWithAlias('comet_cluster_detached', 'comet_cluster_detached', (size) => this.cometClusterDetached(size));
    registerWithAlias('comet_cluster_cascade', 'comet_cluster_cascade', (size) => this.cometClusterCascade(size));
    registerWithAlias('comet_single', 'comet_single', (size) => this.cometSingle(size));
    registerWithAlias('comet_single_beam', 'comet_single_beam', (size) => this.cometSingle(size));
    registerWithAlias('sparkling_comet', 'sparkling_comet', (size) => this.sparklingComet(size));
    registerWithAlias('sparkling_comet_branches', 'sparklingCometBranches', (size) => this.sparklingCometBranchesShell(size));
    registerWithAlias('galaxy', 'galaxy', (size) => this.galaxyShell(size));
    registerWithAlias('ghost_kamuro', 'ghostKamuro', (size) => this.ghostKamuroShell(size));
    registerWithAlias('double_helix', 'doubleHelix', (size) => this.doubleHelixShell(size));
    registerWithAlias('crossette', 'crossette', (size) => this.crossetteShell(size));
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

  crysanthemumNestedShell(size = 1) {
    return {
      ...this.basePreset(size),
      shellType: 'crysanthemumNested',
      shapeType: 'sphere',
      effectType: 'standard',
      nestedBurst: true,
      starLife: 1000 + size * 150,
      flower: false,
      smiley: false,
      hearth: false,
      star: false,
      doubleRing: false
    };
  }

  multiNestedShell(size = 1, customStages = null, nestingMode = 'concentric') {
    return {
      ...this.basePreset(size),
      shellType: 'multiNested',
      multiNested: true,
      nestingMode: nestingMode || 'concentric',
      shapeType: 'sphere',
      dynamicsType: 'standard',
      effectType: 'standard',
      stages: customStages || [
        {
          shapeType: 'sphere',
          dynamicsType: 'standard',
          color: '#ff4400',
          delay: 0.0,
          scale: 1.0,
          effects: ['strobe']
        },
        {
          shapeType: 'ring',
          dynamicsType: 'flow',
          color: '#00e5ff',
          delay: 0.45,
          scale: 0.82,
          effects: []
        },
        {
          shapeType: 'sphere',
          dynamicsType: 'crossette',
          color: '#ffd700',
          delay: 0.90,
          scale: 0.65,
          effects: ['crossette']
        },
        {
          shapeType: 'sphere',
          dynamicsType: 'willow',
          color: '#ffffff',
          delay: 1.35,
          scale: 0.50,
          effects: ['glitter-strobe']
        }
      ],
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

  crysanthemumSmokeShell(size = 1) {
    return {
      ...this.basePreset(size),
      shellType: 'crysanthemumSmoke',
      shapeType: 'sphere',
      effectType: 'crysanthemum-smoke',
      starLife: 1800 + size * 400, // Tăng thời gian sống của hạt pháo để bay xa hơn và sinh khói dài hơn
      flower: false,
      smiley: false,
      hearth: false,
      star: false,
      doubleRing: false
    };
  }

  crysanthemumSpiralShell(size = 1) {
    return {
      ...this.basePreset(size),
      shellType: 'crysanthemumSpiral',
      shapeType: 'sphere',
      effectType: 'crysanthemum-spiral',
      particleCountMultiplier: 1.25,
      starLife: 1600 + size * 350,
      launchTrail: true,
      flower: false,
      smiley: false,
      hearth: false,
      star: false,
      doubleRing: false
    };
  }

  crysanthemumSpiralV2Shell(size = 1) {
    return {
      ...this.basePreset(size),
      shellType: 'crysanthemumSpiralV2',
      shapeType: 'sphere',
      effectType: 'crysanthemum-spiral-v2',
      particleCountMultiplier: 1.35,
      starLife: 1700 + size * 350,
      launchTrail: true,
      flower: false,
      smiley: false,
      hearth: false,
      star: false,
      doubleRing: false
    };
  }

  sparkingShell(size = 1) {
    return {
      ...this.basePreset(size),
      shellType: 'sparking',
      shapeType: 'sphere',
      effectType: 'sparking',
      starLife: 1600 + size * 400, // Tăng thời gian sống để hạt bay xa và sinh tàn tro lâu hơn
      particleCountMultiplier: 1.6, // Tăng số lượng hạt lên 1.6 lần để tạo ra hàng ngàn hạt ánh sáng li ti
      flower: false,
      smiley: false,
      hearth: false,
      star: false,
      pistil: false,
      doubleRing: false
    };
  }

  sparkingV2Shell(size = 1) {
    return {
      ...this.basePreset(size),
      shellType: 'sparkingV2',
      shapeType: 'sphere',
      effectType: 'sparking-v2',
      starLife: 1600 + size * 400,
      particleCountMultiplier: 1.6,
      flower: false,
      smiley: false,
      hearth: false,
      star: false,
      pistil: false,
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
      effects: ['crysanthemum-cc'],
      particleCountMultiplier: 1.35,
      starLife: 2800 + size * 400,
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

  strobeDyingEmbersShell(size = 1) {
    return {
      ...this.basePreset(size),
      shellType: 'strobeDyingEmbers',
      shapeType: 'sphere',
      effectType: 'strobe',
      strobe: true,
      starLife: 2000 + size * 400,
      particleCountMultiplier: 0.85
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

  bouquetCometShell(size = 1) {
    return {
      type: 'bouquetComet',
      shellType: 'bouquetComet',
      shapeType: 'sphere',
      effectType: 'standard',
      shellSize: size
    };
  }

  bouquetCometSphereShell(size = 1) {
    return {
      type: 'bouquetCometSphere',
      shellType: 'bouquetCometSphere',
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

  fishV3Shell(size = 1) {
    return {
      ...this.basePreset(size),
      shellType: 'fishV3',
      shapeType: 'sphere',
      effectType: 'swimming-star',
      dynamicsType: 'swimming-star',
      effects: [],
      fish: true,
      flow: true,
      noTrail: true,
      pistil: false,
      pistilColor: null,
      glitter: '',
      streamers: false,
      nestedBurst: false,
      isNestedChild: false,
      flower: false,
      smiley: false,
      hearth: false,
      star: false,
      doubleRing: false
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

    return {
      ...base,
      color,
      shellType: 'ghost',
      shapeType: 'sphere',
      effectType: 'ghost',
      effects: ['ghost'],
      particleCountMultiplier: 1.35,
      starLife: 2800 + size * 400,
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

  cometClusterCC(size = 1) {
    return {
      type: 'comet_cluster',
      shellType: 'comet_cluster_cc',
      shapeType: 'sphere',
      effectType: 'standard',
      clusterCount: 8 + Math.floor(Math.random() * 4),
      particleCountMultiplier: 1.5,
      crackle: false,
      launchTrail: true,
      launchSmoke: true
    };
  }

  cometClusterThick(size = 1) {
    return {
      type: 'comet_cluster',
      shellType: 'comet_cluster_thick',
      shapeType: 'sphere',
      effectType: 'standard',
      clusterCount: 8 + Math.floor(Math.random() * 4),
      particleCountMultiplier: 1.5,
      crackle: false,
      launchTrail: true,
      thickTrail: true
    };
  }

  cometClusterDetached(size = 1) {
    return {
      type: 'comet_cluster',
      shellType: 'comet_cluster_detached',
      shapeType: 'sphere',
      effectType: 'standard',
      clusterCount: 8 + Math.floor(Math.random() * 4),
      particleCountMultiplier: 1.5,
      crackle: false,
      launchTrail: true,
      detachedTrail: true,
      cometTrail: 'detached'
    };
  }

  cometClusterCascade(size = 1) {
    return {
      type: 'comet_cluster',
      shellType: 'comet_cluster_cascade',
      shapeType: 'sphere',
      effectType: 'standard',
      clusterCount: 42 + Math.floor(Math.random() * 12),
      particleCountMultiplier: 1.5,
      crackle: false,
      launchTrail: true,
      thickTrail: true,
      isCascade: true,
      shellSize: size
    };
  }

  cometSingle(size = 1) {
    return {
      type: 'comet_cluster',
      shellType: 'comet_single',
      shapeType: 'sphere',
      effectType: 'standard',
      clusterCount: 1,
      isSingleComet: true,
      superBrightHead: true,
      particleCountMultiplier: 1.0,
      crackle: false,
      launchTrail: true,
      color: this.randomColor({ limitWhite: true }),
      shellSize: size
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

  sparklingCometBranchesShell(size = 1) {
    return {
      type: 'sparkling_comet_branches',
      shellType: 'sparkling_comet_branches',
      shapeType: 'sparkling-branches',
      dynamicsType: 'sparkling-branch-comet',
      effectType: 'sparkle-trail',
      effects: ['sparkle-apex'],
      branchCount: 5,
      cometsPerBranch: 5,
      sparkleAtEnd: true,
      thinTrail: true,
      launchTrail: true,
      instantBurst: false,
      color: this.randomColor({ limitWhite: true }),
      shellSize: size
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

  weepingWillowArchShell(size = 1) {
    return {
      ...this.basePreset(size),
      shellType: 'weepingWillowArch',
      shapeType: 'willow-arch',
      dynamicsType: 'bouquet-comet',
      effectType: 'falling-comets',
      instantBurst: true,
      color: this.whiteOrGold(),
      particleCountMultiplier: 1.0,
      starLife: 3800,
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

  ghostKamuroShell(size = 1) {
    return {
      ...this.basePreset(size),
      shellType: 'ghostKamuro',
      shapeType: 'sphere',
      effectType: 'ghost-kamuro',
      color: 0xffd700,
      secondColor: 0xffe066,
      starLife: 2400 + size * 450,
      particleCountMultiplier: 0.75,
      crackle: false,
      strobe: false,
      pistil: false,
      launchTrail: true,
      thickTrail: true
    };
  }

  doubleHelixShell(size = 1) {
    const primaryColor = this.randomColor({ limitWhite: true });
    const secondaryColor = this.randomColor({ notColor: primaryColor, limitWhite: true });
    return {
      ...this.basePreset(size),
      shellType: 'doubleHelix',
      shapeType: 'double-helix',
      effectType: 'double-helix',
      color: primaryColor,
      secondColor: secondaryColor,
      starLife: 1800 + size * 300,
      particleCountMultiplier: 1.25,
      crackle: false,
      strobe: false,
      pistil: false,
      launchTrail: true
    };
  }

  crossetteShell(size = 1) {
    return {
      ...this.basePreset(size),
      shellType: 'crossette',
      shapeType: 'sphere',
      dynamicsType: 'crossette',
      effectType: 'crossette',
      crossette: true,
      color: this.randomColor({ limitWhite: true }),
      particleCountMultiplier: 1.15,
      starLife: 2600 + size * 300,
      pistil: false,
      launchTrail: true
    };
  }
}