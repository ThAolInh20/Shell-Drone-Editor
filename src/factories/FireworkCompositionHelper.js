export const AVAILABLE_SHAPES = [
  'sphere',
  'ring',
  'heart',
  'star',
  'fish',
  'cat',
  'flower',
  'smiley',
  'galaxy',
  'lightning',
  'oval',
  'upward-spray',
  'willow',
  'willow-up',
  'willow-arch',
  'half-flash',
  'split-flash',
  'double-helix',
  'sparkling-branches',
  'sphere_uniform',
  'egg',
  'sphere_rings',
  'horsetail'
];

export const AVAILABLE_DYNAMICS = [
  'standard',
  'flow',
  'willow',
  'falling-leaves',
  'falling-comets',
  'falling-comets-glitter',
  'snow',
  'wave',
  'galaxy-spin',
  'bouquet-comet',
  'comet-ring',
  'crysanthemum-trail',
  'crysanthemum-smoke',
  'crysanthemum-spiral',
  'crysanthemum-spiral-v2',
  'sparking',
  'sparking-v2',
  'swimming-star',
  'ghost-kamuro',
  'double-helix',
  'crossette',
  'sparkle-trail',
  'sparkling-branch-comet',
  'tadpole-spiral',
  'crysanthemum_discrete_trail',
  'sphere_rings_wave',
  'horsetail'
];

export const AVAILABLE_MODIFIERS = [
  'pistil',
  'instantBurst'
];

export const TIMED_EFFECT_TAGS = [
  'no-trail',
  'flow',
  'strobe',
  'white-strobe',
  'glitter-strobe',
  'crackle',
  'ghost',
  'ghost-flare',
  'crossette',
  'sparkle-apex',
  'tadpole-flurry',
  'erratic-dart'
];

export const TOGGLE_MODIFIER_TAGS = [
  'burst-smoke',
  'pistil',
  'apex-hang',
  'long-burn',
  'slow-burst'
];

export const AVAILABLE_EFFECT_TAGS = [
  ...TIMED_EFFECT_TAGS,
  ...TOGGLE_MODIFIER_TAGS
];

export const PRESET_TEMPLATES = {
  horsetail_waterfall: {
    shape: 'horsetail',
    dynamics: 'horsetail',
    modifiers: { pistil: false, instantBurst: false },
    effects: []
  },
  egg_crysanthemum: {
    shape: 'egg',
    dynamics: 'crysanthemum-trail',
    modifiers: { pistil: false, instantBurst: false },
    effects: []
  },
  random: {
    shape: 'sphere',
    dynamics: 'standard',
    modifiers: { pistil: false, instantBurst: false },
    effects: []
  },
  comet_cluster: {
    shape: 'sphere',
    dynamics: 'bouquet-comet',
    modifiers: { pistil: false, instantBurst: false },
    effects: []
  },
  comet_cluster_notrail: {
    shape: 'sphere',
    dynamics: 'standard',
    modifiers: { pistil: false, instantBurst: false },
    effects: ['no-trail']
  },
  comet_cluster_cc: {
    shape: 'sphere',
    dynamics: 'bouquet-comet',
    modifiers: { pistil: false, instantBurst: false },
    effects: []
  },
  comet_cluster_thick: {
    shape: 'sphere',
    dynamics: 'bouquet-comet',
    modifiers: { pistil: false, instantBurst: false },
    effects: []
  },
  comet_cluster_detached: {
    shape: 'sphere',
    dynamics: 'bouquet-comet',
    modifiers: { pistil: false, instantBurst: false },
    effects: ['no-trail']
  },
  comet_cluster_cascade: {
    shape: 'sphere',
    dynamics: 'bouquet-comet',
    modifiers: { pistil: false, instantBurst: false },
    effects: []
  },
  comet_single: {
    shape: 'sphere',
    dynamics: 'bouquet-comet',
    modifiers: { pistil: false, instantBurst: false },
    effects: []
  },
  comet_single_beam: {
    shape: 'sphere',
    dynamics: 'bouquet-comet',
    modifiers: { pistil: false, instantBurst: false },
    effects: []
  },
  comet_tadpole_burst: {
    shape: 'sphere',
    dynamics: 'tadpole-spiral',
    modifiers: { pistil: false, instantBurst: false },
    effects: []
  },
  cometTadpoleBurst: {
    shape: 'sphere',
    dynamics: 'tadpole-spiral',
    modifiers: { pistil: false, instantBurst: false },
    effects: []
  },
  chrysanthemum_tadpole_burst: {
    shape: 'sphere',
    dynamics: 'tadpole-spiral',
    modifiers: { pistil: false, instantBurst: false },
    effects: ['tadpole-flurry']
  },
  chrysanthemumTadpoleBurst: {
    shape: 'sphere',
    dynamics: 'tadpole-spiral',
    modifiers: { pistil: false, instantBurst: false },
    effects: ['tadpole-flurry']
  },
  crysanthemum: {
    shape: 'sphere',
    dynamics: 'crysanthemum-trail',
    modifiers: { pistil: false, instantBurst: false },
    effects: []
  },
  crysanthemum_uniform_sphere: {
    shape: 'sphere_uniform',
    dynamics: 'crysanthemum_discrete_trail',
    modifiers: { pistil: false, instantBurst: false },
    effects: []
  },
  crysanthemum_sphere_rings: {
    shape: 'sphere_rings',
    dynamics: 'crysanthemum-trail',
    modifiers: { pistil: false, instantBurst: false },
    effects: []
  },
  crysanthemumSphereRings: {
    shape: 'sphere_rings',
    dynamics: 'crysanthemum-trail',
    modifiers: { pistil: false, instantBurst: false },
    effects: []
  },
  sphere_rings_cascade: {
    shape: 'sphere_rings',
    dynamics: 'sphere_rings_wave',
    modifiers: { pistil: false, instantBurst: false },
    effects: []
  },
  sphereRingsCascade: {
    shape: 'sphere_rings',
    dynamics: 'sphere_rings_wave',
    modifiers: { pistil: false, instantBurst: false },
    effects: []
  },
  sphere_rings_strobe: {
    shape: 'sphere_rings',
    dynamics: 'sphere_rings_wave',
    modifiers: { pistil: false, instantBurst: false },
    effects: ['strobe']
  },
  sphereRingsStrobe: {
    shape: 'sphere_rings',
    dynamics: 'sphere_rings_wave',
    modifiers: { pistil: false, instantBurst: false },
    effects: ['strobe']
  },
  egg_crysanthemum: {
    shape: 'egg',
    dynamics: 'crysanthemum-trail',
    modifiers: { pistil: false, instantBurst: false },
    effects: []
  },
  crysanthemumV2: {
    shape: 'sphere',
    dynamics: 'crysanthemum-trail',
    modifiers: { pistil: false, instantBurst: false },
    effects: []
  },
  crysanthemumSmoke: {
    shape: 'sphere',
    dynamics: 'crysanthemum-smoke',
    modifiers: { pistil: false, instantBurst: false },
    effects: []
  },
  crysanthemumSpiral: {
    shape: 'sphere',
    dynamics: 'crysanthemum-spiral',
    modifiers: { pistil: false, instantBurst: false },
    effects: []
  },
  crysanthemumSpiralV2: {
    shape: 'sphere',
    dynamics: 'crysanthemum-spiral-v2',
    modifiers: { pistil: false, instantBurst: false },
    effects: []
  },
  crysanthemumCC: {
    shape: 'sphere',
    dynamics: 'crysanthemum-cc',
    modifiers: { pistil: false, instantBurst: false },
    effects: ['crysanthemum-cc']
  },
  crysanthemum_nested: {
    shape: 'sphere',
    dynamics: 'standard',
    modifiers: {
      pistil: false,
      instantBurst: false
    },
    effects: []
  },
  crysanthemumNested: {
    shape: 'sphere',
    dynamics: 'standard',
    modifiers: {
      pistil: false,
      instantBurst: false
    },
    effects: []
  },
  multi_nested: {
    shape: 'sphere',
    dynamics: 'standard',
    modifiers: {
      pistil: false,
      instantBurst: false
    },
    effects: []
  },
  multiNested: {
    shape: 'sphere',
    dynamics: 'standard',
    modifiers: {
      pistil: false,
      instantBurst: false
    },
    effects: []
  },
  strobeDyingEmbers: {
    shape: 'sphere',
    dynamics: 'standard',
    modifiers: { pistil: false, instantBurst: false },
    effects: ['strobe']
  },
  sparking: {
    shape: 'sphere',
    dynamics: 'sparking',
    modifiers: { pistil: false, instantBurst: false },
    effects: []
  },
  sparkingV2: {
    shape: 'sphere',
    dynamics: 'sparking-v2',
    modifiers: { pistil: false, instantBurst: true },
    effects: []
  },
  crackle: {
    shape: 'sphere',
    dynamics: 'standard',
    modifiers: { pistil: false, instantBurst: false },
    effects: ['crackle']
  },
  strobe: {
    shape: 'sphere',
    dynamics: 'standard',
    modifiers: { pistil: false, instantBurst: false },
    effects: ['strobe']
  },
  whiteStrobe: {
    shape: 'sphere',
    dynamics: 'standard',
    modifiers: { pistil: false, instantBurst: false },
    effects: ['white-strobe']
  },
  glitterStrobe: {
    shape: 'sphere',
    dynamics: 'standard',
    modifiers: { pistil: false, instantBurst: false },
    effects: ['glitter-strobe']
  },
  weepingWillowComets: {
    shape: 'willow',
    dynamics: 'falling-comets',
    modifiers: { pistil: false, instantBurst: true },
    effects: []
  },
  weepingWillowCometsV2: {
    shape: 'willow-up',
    dynamics: 'falling-comets',
    modifiers: { pistil: false, instantBurst: true },
    effects: []
  },
  weepingWillowCometsV3: {
    shape: 'willow-up',
    dynamics: 'falling-comets-glitter',
    modifiers: { pistil: false, instantBurst: true },
    effects: ['glitter-strobe']
  },
  weepingWillowArch: {
    shape: 'willow-arch',
    dynamics: 'bouquet-comet',
    modifiers: { pistil: false, instantBurst: true },
    effects: []
  },
  fallingLeaves: {
    shape: 'sphere',
    dynamics: 'falling-leaves',
    modifiers: { pistil: false, instantBurst: false },
    effects: ['glitter-strobe']
  },
  floral: {
    shape: 'flower',
    dynamics: 'standard',
    modifiers: { pistil: false, instantBurst: false },
    effects: []
  },
  bouquet: {
    shape: 'upward-spray',
    dynamics: 'bouquet-comet',
    modifiers: { pistil: false, instantBurst: false },
    effects: []
  },
  bouquetComet: {
    shape: 'upward-spray',
    dynamics: 'bouquet-comet',
    modifiers: { pistil: false, instantBurst: false },
    effects: []
  },
  bouquetCometSphere: {
    shape: 'sphere',
    dynamics: 'bouquet-comet',
    modifiers: { pistil: false, instantBurst: false },
    effects: []
  },
  bouquetV2: {
    shape: 'upward-spray',
    dynamics: 'bouquet-comet',
    modifiers: { pistil: false, instantBurst: false },
    effects: ['glitter-strobe']
  },
  bouquetV2Multicolor: {
    shape: 'upward-spray',
    dynamics: 'bouquet-comet',
    modifiers: { pistil: false, instantBurst: false },
    effects: ['glitter-strobe']
  },
  rumble: {
    shape: 'sphere',
    dynamics: 'standard',
    modifiers: { pistil: false, instantBurst: false },
    effects: ['crackle']
  },
  flower: {
    shape: 'flower',
    dynamics: 'standard',
    modifiers: { pistil: false, instantBurst: false },
    effects: []
  },
  cat: {
    shape: 'cat',
    dynamics: 'standard',
    modifiers: { pistil: false, instantBurst: false },
    effects: []
  },
  ring: {
    shape: 'ring',
    dynamics: 'standard',
    modifiers: { pistil: false, instantBurst: false },
    effects: []
  },
  ringV2: {
    shape: 'ring',
    dynamics: 'standard',
    modifiers: { pistil: false, instantBurst: false },
    effects: []
  },
  ringComet: {
    shape: 'ring',
    dynamics: 'comet-ring',
    modifiers: { pistil: false, instantBurst: false },
    effects: []
  },
  oval: {
    shape: 'oval',
    dynamics: 'standard',
    modifiers: { pistil: false, instantBurst: false },
    effects: []
  },
  snow: {
    shape: 'sphere',
    dynamics: 'snow',
    modifiers: { pistil: false, instantBurst: false },
    effects: []
  },
  fish: {
    shape: 'fish',
    dynamics: 'standard',
    modifiers: { pistil: false, instantBurst: false },
    effects: []
  },
  fishV2: {
    shape: 'sphere',
    dynamics: 'standard',
    modifiers: { pistil: false, instantBurst: false },
    effects: ['flow']
  },
  fishV3: {
    shape: 'sphere',
    dynamics: 'swimming-star',
    modifiers: { pistil: false, instantBurst: false },
    effects: []
  },
  smiley: {
    shape: 'smiley',
    dynamics: 'standard',
    modifiers: { pistil: false, instantBurst: false },
    effects: []
  },
  wave: {
    shape: 'sphere',
    dynamics: 'wave',
    modifiers: { pistil: false, instantBurst: false },
    effects: []
  },
  heart: {
    shape: 'heart',
    dynamics: 'standard',
    modifiers: { pistil: false, instantBurst: false },
    effects: []
  },
  star: {
    shape: 'star',
    dynamics: 'standard',
    modifiers: { pistil: false, instantBurst: false },
    effects: []
  },
  ghost: {
    shape: 'sphere',
    dynamics: 'standard',
    modifiers: { pistil: false, instantBurst: false },
    effects: ['ghost']
  },
  'falling-comets': {
    shape: 'sphere',
    dynamics: 'falling-leaves',
    modifiers: { pistil: false, instantBurst: false },
    effects: []
  },
  halfFlash: {
    shape: 'half-flash',
    dynamics: 'standard',
    modifiers: { pistil: false, instantBurst: false },
    effects: []
  },
  splitFlash: {
    shape: 'split-flash',
    dynamics: 'standard',
    modifiers: { pistil: false, instantBurst: false },
    effects: []
  },
  sparkling_comet: {
    shape: 'sphere',
    dynamics: 'standard',
    modifiers: { pistil: false, instantBurst: false },
    effects: ['crackle']
  },
  galaxy: {
    shape: 'galaxy',
    dynamics: 'galaxy-spin',
    modifiers: { pistil: false, instantBurst: false },
    effects: []
  },
  ghostKamuro: {
    shape: 'sphere',
    dynamics: 'ghost-kamuro',
    modifiers: { pistil: false, instantBurst: false },
    effects: []
  },
  ghost_kamuro: {
    shape: 'sphere',
    dynamics: 'ghost-kamuro',
    modifiers: { pistil: false, instantBurst: false },
    effects: []
  },
  doubleHelix: {
    shape: 'double-helix',
    dynamics: 'double-helix',
    modifiers: { pistil: false, instantBurst: false },
    effects: []
  },
  double_helix: {
    shape: 'double-helix',
    dynamics: 'double-helix',
    modifiers: { pistil: false, instantBurst: false },
    effects: []
  },
  crossette: {
    shape: 'sphere',
    dynamics: 'crossette',
    modifiers: { pistil: false, instantBurst: false },
    effects: ['crossette']
  },
  sparkling_comet_branches: {
    shape: 'sparkling-branches',
    dynamics: 'sparkling-branch-comet',
    modifiers: { pistil: false, instantBurst: false },
    effects: ['sparkle-apex']
  },
  sparklingCometBranches: {
    shape: 'sparkling-branches',
    dynamics: 'sparkling-branch-comet',
    modifiers: { pistil: false, instantBurst: false },
    effects: ['sparkle-apex']
  },
  sphere_erratic_dart: {
    shape: 'sphere',
    dynamics: 'standard',
    modifiers: { pistil: false, instantBurst: false },
    effects: ['erratic-dart']
  },
  sphereErraticDart: {
    shape: 'sphere',
    dynamics: 'standard',
    modifiers: { pistil: false, instantBurst: false },
    effects: ['erratic-dart']
  },
  peony: {
    shape: 'sphere',
    dynamics: 'standard',
    modifiers: { pistil: false, instantBurst: false },
    effects: []
  },
  willow: {
    shape: 'sphere',
    dynamics: 'willow',
    modifiers: { pistil: false, instantBurst: false },
    effects: []
  },
  dahlia: {
    shape: 'sphere',
    dynamics: 'standard',
    modifiers: { pistil: false, instantBurst: true },
    effects: []
  },
  brocade_crown: {
    shape: 'sphere',
    dynamics: 'willow',
    modifiers: { pistil: false, instantBurst: false },
    effects: ['glitter-strobe']
  },
  brocadeCrown: {
    shape: 'sphere',
    dynamics: 'willow',
    modifiers: { pistil: false, instantBurst: false },
    effects: ['glitter-strobe']
  }
};

export function getTemplateForPreset(presetKey) {
  if (!presetKey) {
    return PRESET_TEMPLATES.random;
  }
  if (PRESET_TEMPLATES[presetKey]) {
    return PRESET_TEMPLATES[presetKey];
  }
  const camelKey = String(presetKey).replace(/_([a-z0-9])/g, (_, g) => g.toUpperCase());
  if (PRESET_TEMPLATES[camelKey]) {
    return PRESET_TEMPLATES[camelKey];
  }
  const snakeKey = String(presetKey).replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
  if (PRESET_TEMPLATES[snakeKey]) {
    return PRESET_TEMPLATES[snakeKey];
  }
  return PRESET_TEMPLATES.random;
}

export function resolveFireworkComposition(eventOrPreset) {
  if (!eventOrPreset) {
    return {
      shape: 'sphere',
      dynamics: 'standard',
      modifiers: { pistil: false, instantBurst: false },
      effects: []
    };
  }

  const presetKey = typeof eventOrPreset.preset === 'string'
    ? eventOrPreset.preset
    : (eventOrPreset.preset?.type || eventOrPreset.type || 'random');

  const template = getTemplateForPreset(presetKey);

  const shape = eventOrPreset.shapeType
    || eventOrPreset.shape
    || template.shape;

  const dynamics = eventOrPreset.dynamicsType
    || eventOrPreset.dynamics
    || (eventOrPreset.flow ? 'flow' : null)
    || template.dynamics;

  const modifiers = {
    pistil: eventOrPreset.pistil !== undefined
      ? Boolean(eventOrPreset.pistil)
      : template.modifiers.pistil,
    instantBurst: eventOrPreset.instantBurst !== undefined
      ? Boolean(eventOrPreset.instantBurst)
      : template.modifiers.instantBurst
  };

  let effects = [];
  if (Array.isArray(eventOrPreset.effects)) {
    effects = [...eventOrPreset.effects];
  } else {
    effects = [...template.effects];
    if (eventOrPreset.strobe && !effects.includes('strobe')) effects.push('strobe');
    if (eventOrPreset.crackle && !effects.includes('crackle')) effects.push('crackle');
    if (eventOrPreset.ghost && !effects.includes('ghost')) effects.push('ghost');
    if (eventOrPreset.ghostFlare && !effects.includes('ghost-flare')) effects.push('ghost-flare');
    if (eventOrPreset.flow && !effects.includes('flow')) effects.push('flow');
    if (eventOrPreset.noTrail && !effects.includes('no-trail')) effects.push('no-trail');
    if ((eventOrPreset.tadpoleFlurry || eventOrPreset.isTadpole) && !effects.includes('tadpole-flurry')) {
      effects.push('tadpole-flurry');
    }
    if ((eventOrPreset.erraticDart || eventOrPreset.hasErraticDart) && !effects.includes('erratic-dart')) {
      effects.push('erratic-dart');
    }
    if ((eventOrPreset.slowBurst || eventOrPreset['slow-burst'] || eventOrPreset.slow_burst) && !effects.includes('slow-burst')) {
      effects.push('slow-burst');
    }
  }

  return {
    shape,
    dynamics,
    modifiers,
    effects
  };
}

export const AVAILABLE_CHILD_PRESETS = [
  'custom',
  'peony',
  'crysanthemum',
  'willow',
  'crossette',
  'strobe',
  'strobe_white',
  'strobe_glitter',
  'dahlia',
  'brocade_crown',
  'crackle',
  'ghost_flare',
  'ring',
  'flow'
];

export const DEFAULT_SECOND_BURST_CHILD_CONFIG = {
  ratio: 0.20,
  triggerTiming: 0.50,
  distributionMode: 'random',
  preset: 'custom',
  shapeType: 'sphere',
  dynamicsType: 'standard',
  pistil: false,
  pistilColor: '#ffffff',
  instantBurst: false,
  color: '#ffd700',
  scale: 0.35,
  effects: ['strobe'],
  burstSound: 'standard'
};

export const DEFAULT_SECOND_BURST_CONFIG = {
  enabled: false,
  childShells: [
    { ...DEFAULT_SECOND_BURST_CHILD_CONFIG }
  ]
};

export function resolveSecondBurstConfig(eventOrPreset) {
  if (!eventOrPreset) {
    return {
      ...DEFAULT_SECOND_BURST_CONFIG,
      enabled: false
    };
  }

  const rawConfig = eventOrPreset.secondBurst
    || (eventOrPreset.secondBurstEnabled ? DEFAULT_SECOND_BURST_CONFIG : null);

  if (!rawConfig) {
    return {
      ...DEFAULT_SECOND_BURST_CONFIG,
      enabled: false
    };
  }

  const enabled = eventOrPreset.secondBurstEnabled !== undefined
    ? Boolean(eventOrPreset.secondBurstEnabled)
    : Boolean(rawConfig.enabled);

  const fallbackRatio = typeof rawConfig.ratio === 'number'
    ? Math.max(0.01, Math.min(1.0, rawConfig.ratio))
    : 0.20;

  const fallbackTiming = typeof rawConfig.triggerTiming === 'number'
    ? Math.max(0.15, Math.min(0.90, rawConfig.triggerTiming))
    : 0.50;

  const validModes = ['random', 'sequential', 'simultaneous'];
  const fallbackMode = validModes.includes(rawConfig.distributionMode)
    ? rawConfig.distributionMode
    : 'random';

  let childShells = [];
  if (Array.isArray(rawConfig.childShells) && rawConfig.childShells.length > 0) {
    childShells = rawConfig.childShells.map((child) => {
      const childRatio = typeof child.ratio === 'number'
        ? Math.max(0.01, Math.min(1.0, child.ratio))
        : fallbackRatio;

      const childTiming = typeof child.triggerTiming === 'number'
        ? Math.max(0.15, Math.min(0.90, child.triggerTiming))
        : fallbackTiming;

      const childMode = validModes.includes(child.distributionMode)
        ? child.distributionMode
        : fallbackMode;

      const template = child.preset && child.preset !== 'custom'
        ? getTemplateForPreset(child.preset)
        : null;

      const shapeType = child.shapeType
        || template?.shape
        || 'sphere';

      const dynamicsType = child.dynamicsType
        || template?.dynamics
        || 'standard';

      const pistil = child.pistil !== undefined
        ? Boolean(child.pistil)
        : (template?.modifiers?.pistil ?? false);

      const instantBurst = child.instantBurst !== undefined
        ? Boolean(child.instantBurst)
        : (template?.modifiers?.instantBurst ?? false);

      const effects = Array.isArray(child.effects)
        ? [...child.effects]
        : (template?.effects ? [...template.effects] : ['strobe']);

      return {
        ratio: childRatio,
        triggerTiming: childTiming,
        distributionMode: childMode,
        preset: child.preset || 'custom',
        shapeType,
        dynamicsType,
        pistil,
        pistilColor: child.pistilColor || '#ffffff',
        instantBurst,
        color: child.color || '#ffd700',
        scale: typeof child.scale === 'number'
          ? Math.max(0.15, Math.min(0.8, child.scale))
          : 0.35,
        effects,
        burstSound: child.burstSound || 'standard'
      };
    });
  } else {
    childShells = [
      {
        ratio: fallbackRatio,
        triggerTiming: fallbackTiming,
        distributionMode: fallbackMode,
        preset: 'custom',
        shapeType: 'sphere',
        dynamicsType: 'standard',
        pistil: false,
        pistilColor: '#ffffff',
        instantBurst: false,
        color: '#ffd700',
        scale: 0.35,
        effects: ['strobe'],
        burstSound: 'standard'
      }
    ];
  }

  return {
    enabled,
    childShells
  };
}

