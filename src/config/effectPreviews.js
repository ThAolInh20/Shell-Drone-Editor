export const PREVIEW_CATEGORIES = {
  SHAPE: 'shape',
  DYNAMICS: 'dynamics',
  OPTICAL_EFFECT: 'effect',
  PRESET: 'preset',
  PATTERN: 'pattern'
};

export const EFFECT_PREVIEW_METADATA = {
  // Dynamics & Movement Behaviors
  'standard': {
    name: 'Peony',
    category: PREVIEW_CATEGORIES.DYNAMICS,
    videoUrl: 'previews/dynamics/standard.mp4',
    tags: ['Spherical Spread', 'Clean Dissolve'],
    summary: 'Standard spherical burst with smooth radial expansion and clean fade out.'
  },
  'crysanthemum-trail': {
    name: 'Chrysanthemum Trail',
    category: PREVIEW_CATEGORIES.DYNAMICS,
    videoUrl: 'previews/dynamics/crysanthemum-trail.mp4',
    tags: ['Gold Trails', 'Sparkling Tail'],
    summary: 'Expanding stars leave dense glowing particle trails behind them.'
  },
  'crysanthemum-smoke': {
    name: 'Chrysanthemum Smoke',
    category: PREVIEW_CATEGORIES.DYNAMICS,
    videoUrl: 'previews/dynamics/crysanthemum-smoke.mp4',
    tags: ['Smoke Trails', 'Volumetric Glow'],
    summary: 'Burst stars leave dense smoky trail ribbons across the sky.'
  },
  'crysanthemum-spiral': {
    name: 'Chrysanthemum Spiral',
    category: PREVIEW_CATEGORIES.DYNAMICS,
    videoUrl: 'previews/dynamics/crysanthemum-spiral.mp4',
    tags: ['Vortex Rotation', 'Spiral Burst'],
    summary: 'Stars spiral outwards in a high-speed rotational swirl.'
  },
  'crysanthemum-spiral-v2': {
    name: 'Chrysanthemum Spiral V2',
    category: PREVIEW_CATEGORIES.DYNAMICS,
    videoUrl: 'previews/dynamics/crysanthemum-spiral-v2.mp4',
    tags: ['Dual Vortex', 'Dense Trails'],
    summary: 'Enhanced helical vortex with high density spinning particle streamers.'
  },
  'willow': {
    name: 'Willow',
    category: PREVIEW_CATEGORIES.DYNAMICS,
    videoUrl: 'previews/dynamics/willow.mp4',
    tags: ['Heavy Gravity', 'Long Gold Droop'],
    summary: 'Long-lasting glowing trails that droop gracefully toward the ground.'
  },
  'crossette': {
    name: 'Crossette',
    category: PREVIEW_CATEGORIES.DYNAMICS,
    videoUrl: 'previews/dynamics/crossette.mp4',
    tags: ['Star Split', 'Cross Pattern'],
    summary: 'Each burst comet breaks into four perpendicular splitting stars.'
  },
  'ghost-kamuro': {
    name: 'Ghost Kamuro',
    category: PREVIEW_CATEGORIES.DYNAMICS,
    videoUrl: 'previews/dynamics/ghost-kamuro.mp4',
    tags: ['Color Morph', 'Long Canopy'],
    summary: 'Dense gold canopy that transforms smoothly into bright contrasting colors.'
  },
  'falling-leaves': {
    name: 'Falling Leaves',
    category: PREVIEW_CATEGORIES.DYNAMICS,
    videoUrl: 'previews/dynamics/falling-leaves.mp4',
    tags: ['Gentle Sway', 'Slow Drift'],
    summary: 'Glowing embers sway gently side-to-side while floating downward.'
  },
  'falling-comets': {
    name: 'Falling Comets',
    category: PREVIEW_CATEGORIES.DYNAMICS,
    videoUrl: 'previews/dynamics/falling-comets.mp4',
    tags: ['Meteor Stream', 'Directional Drop'],
    summary: 'Bright meteoric stars drop straight down leaving thick trail lines.'
  },
  'falling-comets-glitter': {
    name: 'Falling Comets Glitter',
    category: PREVIEW_CATEGORIES.DYNAMICS,
    videoUrl: 'previews/dynamics/falling-comets-glitter.mp4',
    tags: ['Meteor Stream', 'Gold Glitter'],
    summary: 'Falling comet trails accompanied by sparkling gold glitter micro-sparks.'
  },
  'snow': {
    name: 'Snow Flurry',
    category: PREVIEW_CATEGORIES.DYNAMICS,
    videoUrl: 'previews/dynamics/snow.mp4',
    tags: ['Soft Drift', 'Turbulent Scatter'],
    summary: 'Delicate light particles drifting randomly like fluttering snow.'
  },
  'wave': {
    name: 'Wave',
    category: PREVIEW_CATEGORIES.DYNAMICS,
    videoUrl: 'previews/dynamics/wave.mp4',
    tags: ['Sinusoidal Motion', 'Rippling Spread'],
    summary: 'Particles oscillate in wave patterns during outward expansion.'
  },
  'galaxy-spin': {
    name: 'Galaxy Spin',
    category: PREVIEW_CATEGORIES.DYNAMICS,
    videoUrl: 'previews/dynamics/galaxy-spin.mp4',
    tags: ['Orbital Velocity', 'Spiral Arms'],
    summary: 'Pinwheel burst with high rotational inertia forming spinning arms.'
  },
  'bouquet-comet': {
    name: 'Bouquet Comet',
    category: PREVIEW_CATEGORIES.DYNAMICS,
    videoUrl: 'previews/dynamics/bouquet-comet.mp4',
    tags: ['Multi Comet', 'Upward Thrusters'],
    summary: 'Cluster of thick comet tails rising together in a fountain spray.'
  },
  'comet-ring': {
    name: 'Comet Ring',
    category: PREVIEW_CATEGORIES.DYNAMICS,
    videoUrl: 'previews/dynamics/comet-ring.mp4',
    tags: ['Planar Ring', 'Comet Streamers'],
    summary: 'Expanding flat circular ring composed of thick trailing comets.'
  },
  'sparking': {
    name: 'Sparking',
    category: PREVIEW_CATEGORIES.DYNAMICS,
    videoUrl: 'previews/dynamics/sparking.mp4',
    tags: ['Electric Flashes', 'Glitter Sparks'],
    summary: 'Stars emit intermittent rapid electrical sparks along their path.'
  },
  'sparking-v2': {
    name: 'Sparking V2',
    category: PREVIEW_CATEGORIES.DYNAMICS,
    videoUrl: 'previews/dynamics/sparking-v2.mp4',
    tags: ['Dense Sparks', 'Golden Crackle'],
    summary: 'High-frequency shimmering spark cloud surrounding the burst perimeter.'
  },
  'swimming-star': {
    name: 'Swimming Star',
    category: PREVIEW_CATEGORIES.DYNAMICS,
    videoUrl: 'previews/dynamics/swimming-star.mp4',
    tags: ['Snake Motion', 'Erratic Path'],
    summary: 'Stars dart unpredictably in squiggly serpent paths across the sky.'
  },
  'double-helix': {
    name: 'Double Helix',
    category: PREVIEW_CATEGORIES.DYNAMICS,
    videoUrl: 'previews/dynamics/double-helix.mp4',
    tags: ['Twin Spirals', 'Intertwined Strands'],
    summary: 'Two opposing spiral arms intertwine into a rotating 3D DNA helix.'
  },
  'flow': {
    name: 'Flow',
    category: PREVIEW_CATEGORIES.DYNAMICS,
    videoUrl: 'previews/dynamics/flow.mp4',
    tags: ['Smooth Stream', 'Continuous Motion'],
    summary: 'Continuous fluid stream of stars flowing along directional vectors.'
  },
  'sparkle-trail': {
    name: 'Sparkle Trail',
    category: PREVIEW_CATEGORIES.DYNAMICS,
    videoUrl: 'previews/dynamics/sparkle-trail.mp4',
    tags: ['Thin Trail', 'Crisp Streak'],
    summary: 'Sub-comet stars travel with slender crisp trails and clean contrast.'
  },
  'sparkling-branch-comet': {
    name: 'Sparkling Branch Comet',
    category: PREVIEW_CATEGORIES.DYNAMICS,
    videoUrl: 'previews/dynamics/sparkle-trail.mp4',
    tags: ['Branch Comet', 'Apex Sparkle'],
    summary: 'Branching sub-comets streaming outwards with synchronized apex sparkling.'
  },

  // 3D Spatial Burst Shapes
  'sphere': {
    name: 'Sphere',
    category: PREVIEW_CATEGORIES.SHAPE,
    videoUrl: 'previews/shapes/sphere.mp4',
    tags: ['Isotropic 3D', 'Classic Shell'],
    summary: 'Uniform 360-degree spherical explosion expanding in all directions.'
  },
  'sparkling-branches': {
    name: 'Sparkling Branches',
    category: PREVIEW_CATEGORIES.SHAPE,
    videoUrl: 'previews/shapes/sparkling-branches.mp4',
    tags: ['Multi Branch', 'Directional Beams'],
    summary: 'Burst partitions into four to five directional sub-comet star clusters.'
  },
  'ring': {
    name: 'Ring',
    category: PREVIEW_CATEGORIES.SHAPE,
    videoUrl: 'previews/shapes/ring.mp4',
    tags: ['Planar Circle', 'Saturn Ring'],
    summary: 'Planar circular ring of stars bursting along a 2D plane in 3D space.'
  },
  'heart': {
    name: 'Heart',
    category: PREVIEW_CATEGORIES.SHAPE,
    videoUrl: 'previews/shapes/heart.mp4',
    tags: ['Cardioid Shape', 'Romantic Form'],
    summary: 'Crisp heart contour shape expanding cleanly with symmetry.'
  },
  'star': {
    name: 'Star',
    category: PREVIEW_CATEGORIES.SHAPE,
    videoUrl: 'previews/shapes/star.mp4',
    tags: ['Five Point Star', 'Geometric Silhouette'],
    summary: 'Five-pointed geometric star bursting with sharp angular vertices.'
  },
  'flower': {
    name: 'Flower',
    category: PREVIEW_CATEGORIES.SHAPE,
    videoUrl: 'previews/shapes/flower.mp4',
    tags: ['Petal Cluster', 'Flora Contour'],
    summary: 'Multi-lobed floral pattern with distinct petal clusters.'
  },
  'galaxy': {
    name: 'Galaxy',
    category: PREVIEW_CATEGORIES.SHAPE,
    videoUrl: 'previews/shapes/galaxy.mp4',
    tags: ['Spiral Arms', 'Core Disk'],
    summary: 'Cosmic spiral disk with prominent galactic arms and dense core.'
  },
  'smiley': {
    name: 'Smiley Face',
    category: PREVIEW_CATEGORIES.SHAPE,
    videoUrl: 'previews/shapes/smiley.mp4',
    tags: ['Iconic Face', 'Pattern Burst'],
    summary: 'Curved smile and eye dots formed by spatial particle distribution.'
  },
  'fish': {
    name: 'Fish',
    category: PREVIEW_CATEGORIES.SHAPE,
    videoUrl: 'previews/shapes/fish.mp4',
    tags: ['Marine Outline', 'Tail Fin'],
    summary: 'Aquatic silhouette featuring a curved body and distinct tail fin.'
  },
  'cat': {
    name: 'Cat',
    category: PREVIEW_CATEGORIES.SHAPE,
    videoUrl: 'previews/shapes/cat.mp4',
    tags: ['Cat Silhouette', 'Ear Outlines'],
    summary: 'Charming feline outline with distinct pointed ear tips.'
  },
  'lightning': {
    name: 'Lightning',
    category: PREVIEW_CATEGORIES.SHAPE,
    videoUrl: 'previews/shapes/lightning.mp4',
    tags: ['Zigzag Bolt', 'Angular Flash'],
    summary: 'Sharp zigzag lightning bolt discharge through the atmosphere.'
  },
  'oval': {
    name: 'Oval',
    category: PREVIEW_CATEGORIES.SHAPE,
    videoUrl: 'previews/shapes/oval.mp4',
    tags: ['Elliptical Spread', 'Egg Contour'],
    summary: 'Stretched elliptical spatial distribution expanding outward.'
  },
  'upward-spray': {
    name: 'Upward Spray',
    category: PREVIEW_CATEGORIES.SHAPE,
    videoUrl: 'previews/shapes/upward-spray.mp4',
    tags: ['Fan Spray', 'Mineshot Burst'],
    summary: 'Upward angled fan dispersion resembling a ground mine cannon.'
  },
  'half-flash': {
    name: 'Half Flash',
    category: PREVIEW_CATEGORIES.SHAPE,
    videoUrl: 'previews/shapes/half-flash.mp4',
    tags: ['Hemisphere Split', 'Dual Tone'],
    summary: 'Two hemisphere zones with contrasting particle characteristics.'
  },
  'split-flash': {
    name: 'Split Flash',
    category: PREVIEW_CATEGORIES.SHAPE,
    videoUrl: 'previews/shapes/split-flash.mp4',
    tags: ['Quadrant Split', 'Alternating Sectors'],
    summary: 'Geometric quadrants bursting in alternating directional flashes.'
  },

  // Optical & Modifier Effects
  'strobe': {
    name: 'Strobe',
    category: PREVIEW_CATEGORIES.OPTICAL_EFFECT,
    videoUrl: 'previews/effects/strobe.mp4',
    tags: ['High Frequency Pulse', 'Flicker'],
    summary: 'Rapid rhythmic flashing of stars creating a pulsing strobing halo.'
  },
  'white-strobe': {
    name: 'White Strobe',
    category: PREVIEW_CATEGORIES.OPTICAL_EFFECT,
    videoUrl: 'previews/effects/white-strobe.mp4',
    tags: ['Brilliant White', 'Intense Pulse'],
    summary: 'High-intensity pure white flashes strobing against dark sky.'
  },
  'glitter-strobe': {
    name: 'Glitter Strobe',
    category: PREVIEW_CATEGORIES.OPTICAL_EFFECT,
    videoUrl: 'previews/effects/glitter-strobe.mp4',
    tags: ['Twinkle Stars', 'Micro Shimmer'],
    summary: 'Subtle twinkling shimmer of gold and diamond glitter stars.'
  },
  'crackle': {
    name: 'Crackle (Dragon Eggs)',
    category: PREVIEW_CATEGORIES.OPTICAL_EFFECT,
    videoUrl: 'previews/effects/crackle.mp4',
    tags: ['Popping Sparks', 'Delayed Crackle'],
    summary: 'Delayed secondary micro-explosions producing loud pops and bright flashes.'
  },
  'ghost': {
    name: 'Ghost Shell',
    category: PREVIEW_CATEGORIES.OPTICAL_EFFECT,
    videoUrl: 'previews/effects/ghost.mp4',
    tags: ['Color Transition', 'Delayed Reveal'],
    summary: 'Stars travel invisible before suddenly igniting into vibrant colors.'
  },
  'ghost-flare': {
    name: 'Ghost Flare',
    category: PREVIEW_CATEGORIES.OPTICAL_EFFECT,
    videoUrl: 'previews/effects/ghost-flare.mp4',
    tags: ['Sudden Ignition', 'Bright Surge'],
    summary: 'Terminal flare surge where stars intensify in brightness before fading.'
  },
  'pistil': {
    name: 'Pistil Inner Core',
    category: PREVIEW_CATEGORIES.OPTICAL_EFFECT,
    videoUrl: 'previews/effects/pistil.mp4',
    tags: ['Dual Shell', 'Inner Core Burst'],
    summary: 'Compact inner core burst inside a larger outer shell canopy.'
  },
  'sparkle-apex': {
    name: 'Sparkle Apex Flash',
    category: PREVIEW_CATEGORIES.OPTICAL_EFFECT,
    videoUrl: 'previews/effects/sparkle-apex.mp4',
    tags: ['Apex Flash', 'Sparkle Flash'],
    summary: 'Bright synchronized sparkling flash at the apex and decay point of stars.'
  },

  // Preset Shell Templates
  'sparkling-comet-branches': {
    name: 'Sparkling Comet Multi Branch',
    category: PREVIEW_CATEGORIES.PRESET,
    videoUrl: 'previews/presets/sparkling-comet-branches.mp4',
    tags: ['Multi Branch', 'Apex Sparkle'],
    summary: 'Shell explodes into four to five sub-comet branches with sparkling flashes at the apex.'
  },

  // Sequence Firing Patterns
  'random': {
    name: 'Random Scattering',
    category: PREVIEW_CATEGORIES.PATTERN,
    videoUrl: 'previews/patterns/random.mp4',
    tags: ['Scattered Firing', 'Random Positions'],
    summary: 'Randomized firework shells launching across diverse launch positions and sector arcs.'
  },
  'sweep': {
    name: 'Linear Sweep',
    category: PREVIEW_CATEGORIES.PATTERN,
    videoUrl: 'previews/patterns/sweep.mp4',
    tags: ['Left to Right', 'Directional Wave'],
    summary: 'Sequential linear sweep firing smoothly from one side of the barge to the opposite side.'
  },
  'sweep-arc': {
    name: 'Curved Arc Sweep',
    category: PREVIEW_CATEGORIES.PATTERN,
    videoUrl: 'previews/patterns/sweep-arc.mp4',
    tags: ['Curved Arc', 'Barge Geometry'],
    summary: 'Sweeping sequential firing following the curved circular arc geometry of the launch zone.'
  },
  'sweep-arc-out': {
    name: 'Outward Arc Sweep',
    category: PREVIEW_CATEGORIES.PATTERN,
    videoUrl: 'previews/patterns/sweep-arc-out.mp4',
    tags: ['Outward Burst', 'Expanding Arc'],
    summary: 'Outward expanding curved arc firing from inner center positions to perimeter extremes.'
  },
  'cascade-slope': {
    name: 'Cascade Slope',
    category: PREVIEW_CATEGORIES.PATTERN,
    videoUrl: 'previews/patterns/cascade-slope.mp4',
    tags: ['Stepped Altitude', 'Diagonal Slope'],
    summary: 'Stepped altitude sequence creating a continuous ascending or descending diagonal slope of bursts.'
  },
  'chasing-scissors': {
    name: 'Chasing Scissors',
    category: PREVIEW_CATEGORIES.PATTERN,
    videoUrl: 'previews/patterns/chasing-scissors.mp4',
    tags: ['Dual Sweep', 'Intersecting Beams'],
    summary: 'Dual opposing sweeps crossing each other at high velocity resembling opening and closing scissors.'
  },
  'waterfall-curtain': {
    name: 'Waterfall Curtain',
    category: PREVIEW_CATEGORIES.PATTERN,
    videoUrl: 'previews/patterns/waterfall-curtain.mp4',
    tags: ['Curtain Wall', 'Dense Barrage'],
    summary: 'Dense high-density wall of simultaneous and rapid-fire shells creating a glowing curtain.'
  },
  'sinusoidal-wave': {
    name: 'Sinusoidal Wave',
    category: PREVIEW_CATEGORIES.PATTERN,
    videoUrl: 'previews/patterns/sinusoidal-wave.mp4',
    tags: ['Harmonic Wave', 'Undulating Height'],
    summary: 'Harmonic wave firing pattern undulating smoothly between varying burst altitudes.'
  },
  'petal-bloom': {
    name: 'Petal Bloom',
    category: PREVIEW_CATEGORIES.PATTERN,
    videoUrl: 'previews/patterns/petal-bloom.mp4',
    tags: ['Radial Expansion', 'Flower Bloom'],
    summary: 'Rhythmic radial sequence opening outward from center like blooming flower petals.'
  },
  'teeter-totter': {
    name: 'Teeter Totter',
    category: PREVIEW_CATEGORIES.PATTERN,
    videoUrl: 'previews/patterns/teeter-totter.mp4',
    tags: ['Alternating Flanks', 'Pendulum Rhythm'],
    summary: 'Alternating left-right pendulum firing rocking back and forth between opposing flanks.'
  },
  'vortex-tunnel': {
    name: 'Vortex Tunnel',
    category: PREVIEW_CATEGORIES.PATTERN,
    videoUrl: 'previews/patterns/vortex-tunnel.mp4',
    tags: ['Rotating Vortex', 'Cylindrical Depth'],
    summary: 'Rotating vortex trajectory firing creating a three-dimensional spiral tunnel effect.'
  },
  'stepping-stones': {
    name: 'Stepping Stones',
    category: PREVIEW_CATEGORIES.PATTERN,
    videoUrl: 'previews/patterns/stepping-stones.mp4',
    tags: ['Rhythmic Beats', 'Sector March'],
    summary: 'Discrete rhythmic step bursts marching cleanly across launch sectors in synchronized intervals.'
  },
  'intertwined-helix': {
    name: 'Intertwined Helix',
    category: PREVIEW_CATEGORIES.PATTERN,
    videoUrl: 'previews/patterns/intertwined-helix.mp4',
    tags: ['DNA Helix', 'Dual Spiral'],
    summary: 'Dual interlocking spiral comet streams ascending in a synchronized helical twist.'
  },
  'fan': {
    name: 'Symmetrical Fan',
    category: PREVIEW_CATEGORIES.PATTERN,
    videoUrl: 'previews/patterns/fan.mp4',
    tags: ['Angled Volley', 'Wide Horizon'],
    summary: 'Wide-angle symmetrical fan volley spanning the entire sky from angled launch tubes.'
  },
  'fan-sweep': {
    name: 'Fan Sweep',
    category: PREVIEW_CATEGORIES.PATTERN,
    videoUrl: 'previews/patterns/fan-sweep.mp4',
    tags: ['Angled Sweep', 'Panoramic Spray'],
    summary: 'Directional panoramic fan sweep spraying angled beams progressively across the horizon.'
  },
  'fan-sweep-continuous': {
    name: 'Continuous Fan Sweep',
    category: PREVIEW_CATEGORIES.PATTERN,
    videoUrl: 'previews/patterns/fan-sweep-continuous.mp4',
    tags: ['Rapid Fan', 'Continuous Beam'],
    summary: 'High-speed continuous barrage of angled fan beams sweeping repeatedly without pause.'
  },
  'fan-burst': {
    name: 'Fan Burst',
    category: PREVIEW_CATEGORIES.PATTERN,
    videoUrl: 'previews/patterns/fan-burst.mp4',
    tags: ['Simultaneous Volley', 'Instant Fan'],
    summary: 'Simultaneous instant fan volley detonating synchronized bursts across wide sector angles.'
  },
  'crossfire': {
    name: 'Crossfire',
    category: PREVIEW_CATEGORIES.PATTERN,
    videoUrl: 'previews/patterns/crossfire.mp4',
    tags: ['Interlocking Angles', 'X-Cross Pattern'],
    summary: 'Angled opposing comets fired from opposite sides crossing paths mid-air in an X formation.'
  },
  'crossfire-burst': {
    name: 'Crossfire Burst',
    category: PREVIEW_CATEGORIES.PATTERN,
    videoUrl: 'previews/patterns/crossfire-burst.mp4',
    tags: ['Crossing Volleys', 'Apex Detonation'],
    summary: 'Opposing crossfire beams that simultaneously detonate aerial shell bursts at their intersection apex.'
  },
  'v-shape': {
    name: 'V-Shape Formation',
    category: PREVIEW_CATEGORIES.PATTERN,
    videoUrl: 'previews/patterns/v-shape.mp4',
    tags: ['Symmetrical V', 'Outward Angles'],
    summary: 'Symmetrical V-formation firing outward from center with mirrored launch angles.'
  },
  'spiral-helix': {
    name: 'Spiral Helix',
    category: PREVIEW_CATEGORIES.PATTERN,
    videoUrl: 'previews/patterns/spiral-helix.mp4',
    tags: ['Single Column', 'Spiral Stream'],
    summary: 'Spinning spiral column sequence ascending into the sky with continuous rotational trajectory.'
  },
  'ripple': {
    name: 'Concentric Ripple',
    category: PREVIEW_CATEGORIES.PATTERN,
    videoUrl: 'previews/patterns/ripple.mp4',
    tags: ['Expanding Rings', 'Water Ripple'],
    summary: 'Concentric circular sequence expanding outwards from the center barge like water ripples.'
  },
  'converge': {
    name: 'Converge',
    category: PREVIEW_CATEGORIES.PATTERN,
    videoUrl: 'previews/patterns/converge.mp4',
    tags: ['Inward Focus', 'Center Focal Point'],
    summary: 'Beams fired inward from perimeter boundaries meeting at a single central focal point.'
  },
  'diverge': {
    name: 'Diverge',
    category: PREVIEW_CATEGORIES.PATTERN,
    videoUrl: 'previews/patterns/diverge.mp4',
    tags: ['Outward Spread', 'Radial Fanout'],
    summary: 'Beams fired outward from the center bursting toward outer perimeter boundaries.'
  },
  'zigzag': {
    name: 'Zigzag',
    category: PREVIEW_CATEGORIES.PATTERN,
    videoUrl: 'previews/patterns/zigzag.mp4',
    tags: ['Alternating Angles', 'Dynamic Zigzag'],
    summary: 'Dynamic zigzag sequence alternating launch angles and firing directions in rapid succession.'
  },
  'continuous': {
    name: 'Continuous Barrage',
    category: PREVIEW_CATEGORIES.PATTERN,
    videoUrl: 'previews/patterns/continuous.mp4',
    tags: ['Rapid Fire', 'Non-Stop Barrage'],
    summary: 'Continuous sustained barrage of shells firing in relentless rapid succession.'
  }
};

export function normalizePreviewKey(key) {
  if (!key) return '';
  return String(key)
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase();
}

const PREVIEW_ALIASES = {
  'spiral': 'crysanthemum-spiral',
  'smoke': 'crysanthemum-smoke',
  'trail': 'crysanthemum-trail',
  'chrysanthemum': 'crysanthemum-trail',
  'chrysanthemum-spiral': 'crysanthemum-spiral',
  'chrysanthemum-spiral-v2': 'crysanthemum-spiral-v2',
  'chrysanthemum-smoke': 'crysanthemum-smoke',
  'chrysanthemum-trail': 'crysanthemum-trail',
  'chrysanthemum-v2': 'crysanthemum-spiral-v2',
  'crysanthemum': 'crysanthemum-trail',
  'crysanthemum-v2': 'crysanthemum-spiral-v2',
  'crysanthemum-cc': 'crysanthemum-trail',
  'crysanthemum-nested': 'crysanthemum-trail',
  'crysanthemum-spiral': 'crysanthemum-spiral',
  'crysanthemum-smoke': 'crysanthemum-smoke',
  'crysanthemum-trail': 'crysanthemum-trail',
  'crysanthemumspiral': 'crysanthemum-spiral',
  'crysanthemumsmoke': 'crysanthemum-smoke',
  'crysanthemumtrail': 'crysanthemum-trail',
  'crysanthemumspiralv2': 'crysanthemum-spiral-v2',
  'willow-gold': 'willow',
  'bouquet-cluster': 'bouquet-comet',
  'peony': 'standard'
};

export function getEffectPreview(key, fallbackCategory = PREVIEW_CATEGORIES.DYNAMICS) {
  if (!key) return null;
  const rawClean = String(key).trim();
  const normalizedKey = normalizePreviewKey(key);
  const resolvedKey = PREVIEW_ALIASES[normalizedKey] ||
    PREVIEW_ALIASES[rawClean.toLowerCase()] ||
    normalizedKey;

  const found = EFFECT_PREVIEW_METADATA[resolvedKey] ||
    EFFECT_PREVIEW_METADATA[normalizedKey] ||
    EFFECT_PREVIEW_METADATA[rawClean.toLowerCase()];

  if (found) {
    // Generate fallback candidate video URLs
    const candidates = [
      found.videoUrl,
      `previews/${found.category || fallbackCategory}s/${resolvedKey}.mp4`,
      `previews/${found.category || fallbackCategory}s/${normalizedKey}.mp4`
    ];

    if (resolvedKey.includes('crysanthemum-')) {
      candidates.push(`previews/dynamics/${resolvedKey.replace('crysanthemum-', '')}.mp4`);
      candidates.push(`previews/dynamics/${resolvedKey.replace('crysanthemum-', 'chrysanthemum-')}.mp4`);
    }

    return {
      ...found,
      candidateUrls: [...new Set(candidates)]
    };
  }

  const fallbackUrl = `previews/${fallbackCategory}s/${normalizedKey}.mp4`;
  return {
    name: key.charAt(0).toUpperCase() + key.slice(1),
    category: fallbackCategory,
    videoUrl: fallbackUrl,
    candidateUrls: [fallbackUrl],
    tags: ['Firework Effect'],
    summary: `Effect preview for ${key}.`
  };
}
