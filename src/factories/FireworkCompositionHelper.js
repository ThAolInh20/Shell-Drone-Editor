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
  'double-helix'
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
  'double-helix'
];

export const AVAILABLE_MODIFIERS = [
  'pistil',
  'instantBurst'
];

export const AVAILABLE_EFFECT_TAGS = [
  'strobe',
  'white-strobe',
  'glitter-strobe',
  'crackle',
  'ghost',
  'ghost-flare',
  'flow',
  'no-trail'
];

export const PRESET_TEMPLATES = {
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
    effects: []
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
  crysanthemum: {
    shape: 'sphere',
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
    dynamics: 'standard',
    modifiers: { pistil: true, instantBurst: false },
    effects: []
  },
  crysanthemumNested: {
    shape: 'sphere',
    dynamics: 'standard',
    modifiers: { pistil: false, instantBurst: false },
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
  }
};

export function getTemplateForPreset(presetKey) {
  if (!presetKey) {
    return PRESET_TEMPLATES.random;
  }
  return PRESET_TEMPLATES[presetKey] || PRESET_TEMPLATES.random;
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
  }

  return {
    shape,
    dynamics,
    modifiers,
    effects
  };
}
