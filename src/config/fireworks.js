import * as THREE from 'three';

// Cấu hình tập trung cho toàn bộ hệ thống pháo hoa và hạt (particles)
export const FIREWORK_CONFIG = {
  // Trọng lực tác động lên quỹ đạo bay của quả pháo và hạt tia lửa
  GRAVITY: -30,

  // Các hằng số hệ thống liên quan đến hiển thị và hiệu năng
  SYSTEM: {
    // Giới hạn số lượng hạt nổ tối đa hiển thị đồng thời để tránh quá tải GPU
    maxBurstParticles: 200000,
    // Giới hạn số lượng hạt đuôi (trail) tối đa hiển thị đồng thời
    maxTrailParticles: 150000,
    // Vận tốc mở rộng của đám mây hiệu ứng nổ crackle
    crackleCloudSpeed: 24,
    // Kích thước hiển thị cơ bản của điểm hạt nổ pháo hoa
    baseBurstPointSize: 26,
    // Hệ số suy giảm độ sáng hạt nổ theo thời gian
    burstFadeExponent: 2.15,
    // Màu sắc mặc định cho hạt đuôi (vàng gold)
    defaultTrailColor: new THREE.Color(0xffd700),
    // Màu sắc hạt lửa nổ crackle
    crackleSparkColor: new THREE.Color(0xffd77a),
    // Danh sách màu sắc ngẫu nhiên mặc định của pháo hoa
    colors: [
      0xffd700, // Vàng (Gold)
      0xff4500, // Cam đỏ (Orange Red)
      0x00bfff, // Xanh da trời (Deep Sky Blue)
      0xff69b4, // Hồng (Hot Pink)
      0x7fffd4, // Xanh ngọc (Aquamarine)
      0x8a2be2  // Tím (Blue Violet)
    ]
  },

  // Thông số mặc định cho pha phát nổ tiêu chuẩn
  BURST: {
    // Vận tốc bung hạt cơ bản khi pháo nổ (mở rộng trang nhã, không quá nhanh)
    baseSpeed: 74,
    // Thời gian sống cơ bản của hạt nổ pháo hoa (giây)
    baseLife: 2.3,
    // Ngưỡng tỉ lệ vòng đời bắt đầu thực hiện hiệu ứng mờ dần (dissolve)
    dissolveStart: 0.62,
    // Hệ số lực cản không khí cơ bản giúp hạt hãm phanh êm dịu tự nhiên
    baseDrag: 0.46,
    // Độ phân tán lực cản ngẫu nhiên giữa các hạt
    dragJitter: 0.20,
    // Độ lệch vận tốc nổ ban đầu để phá vỡ khối cầu đồng nhất
    speedJitter: 0.10,
    // Độ phân tán thời gian sống của hạt
    lifeJitter: 0.15,
    // Số hạt nổ mặc định cho một quả pháo tiêu chuẩn
    baseParticles: 110,
    // Số hạt nổ tối thiểu cho phép
    minParticles: 60,
    // Số hạt nổ tối đa cho phép để bảo vệ FPS
    maxParticles: 220,
    // Hệ số kéo dài thời gian sống cho hiệu ứng long-burn
    longBurnMultiplier: 2.2,
    // Ngưỡng tan biến muộn cho hiệu ứng long-burn để giữ hạt sáng lâu
    longBurnDissolveStart: 0.72,
    // Trọng lực giảm nhẹ giúp hạt long-burn trôi lơ lửng trên không
    longBurnGravityScale: 0.85
  },

  // Các hồ sơ động lực học chuyên biệt (Dynamics Archetypes)
  // Giúp từng nhóm pháo hoa có vận tốc, lực cản và đường cong chuyển động riêng biệt
  DYNAMICS_PROFILES: {
    // Pháo nổ tiêu chuẩn (Chrysanthemum, Peony, Brocade, Sphere, Pistil)
    standard: {
      baseSpeed: 74,
      baseDrag: 0.46,
      dragJitter: 0.20,
      speedJitter: 0.10,
      lifeJitter: 0.15,
      hasApexBrake: false,
      delayedGravity: true,
      gravityRampStart: 0.32,
      gravityRampFull: 0.55,
      minGravity: 0.05,
      thermalCooling: true
    },
    // Hình dạng hình học đường viền (Ring, Heart, Star, Smiley, Cat, Fish)
    geometric: {
      baseSpeed: 54,
      baseDrag: 0.40,
      dragJitter: 0.05,
      speedJitter: 0.04,
      lifeJitter: 0.10,
      hasApexBrake: false,
      delayedGravity: true,
      gravityRampStart: 0.35,
      gravityRampFull: 0.60,
      minGravity: 0.08,
      thermalCooling: true
    },
    // Liễu rủ vàng kim và tàn rơi dài (Willow, Kamuro, Weeping Willow, Falling Comets)
    willow: {
      baseSpeed: 58,
      baseDrag: 0.20,
      dragJitter: 0.12,
      speedJitter: 0.10,
      lifeJitter: 0.25,
      hasApexBrake: false,
      delayedGravity: true,
      gravityRampStart: 0.20,
      gravityRampFull: 0.45,
      minGravity: 0.10,
      thermalCooling: false
    },
    // Hạt trôi nổi, bồng bềnh hữu cơ (Flow, Snow, Wave, Falling Leaves, Swimming Star)
    floating: {
      baseSpeed: 36,
      baseDrag: 0.70,
      dragJitter: 0.16,
      speedJitter: 0.12,
      lifeJitter: 0.20,
      hasApexBrake: false,
      delayedGravity: false,
      thermalCooling: false
    },
    // Pháo nổ tách chữ thập (Crossette)
    crossette: {
      baseSpeed: 62,
      baseDrag: 0.38,
      dragJitter: 0.10,
      speedJitter: 0.08,
      lifeJitter: 0.10,
      hasApexBrake: false,
      delayedGravity: true,
      gravityRampStart: 0.32,
      gravityRampFull: 0.55,
      minGravity: 0.06,
      thermalCooling: true
    },
    // Chùm tia sao băng (Bouquet Comet, Comet Ring, Half-Flash, Split-Flash)
    comet: {
      baseSpeed: 70,
      baseDrag: 0.30,
      dragJitter: 0.14,
      speedJitter: 0.10,
      lifeJitter: 0.15,
      hasApexBrake: false,
      delayedGravity: true,
      gravityRampStart: 0.28,
      gravityRampFull: 0.52,
      minGravity: 0.06,
      thermalCooling: true
    }
  },

  // Hệ số nhân số lượng hạt dựa trên hình dạng vụ nổ (Shape)
  SHAPE_MULTIPLIERS: {
    sphere: 1,
    ring: 1.08,
    heart: 1.4,
    flower: 1.22,
    cat: 1.2,
    fish: 1.14,
    smiley: 1.2,
    oval: 1.12,
    willow: 1.18,
    lightning: 1.16,
    star: 1.14,
    'double-helix': 0.95,
    'sparkling-branches': 1.0
  },

  // Hệ số nhân số lượng hạt dựa trên hiệu ứng hình ảnh (Effect)
  EFFECT_MULTIPLIERS: {
    standard: 1,
    crackle: 1.15,
    floral: 1.18,
    'falling-leaves': 0.78,
    heart: 1.22,
    strobe: 1.08,
    wave: 1.1,
    flow: 1.08,
    snow: 1.08,
    oval: 1.08,
    flower: 1.12,
    'crysanthemum-spiral': 1.25,
    'crysanthemum-spiral-v2': 1.35,
    'crysanthemum-cc': 1.25,
    'ghost-kamuro': 0.8,
    ghost: 1.15,
    'double-helix': 0.90,
    crossette: 0.6,
    'sparkle-trail': 1.0,
    'sparkling-branch-comet': 1.0,
    'sparkle-apex': 1.0
  },

  // Cấu hình cụ thể cho các loại pháo chùm/pháo phức hợp (Bouquet Shells)
  BOUQUET: {
    // Cấu hình bouquet và bouquetComet mặc định
    default: {
      // Số pháo con tối thiểu sinh ra
      clusterCountMin: 10,
      // Số pháo con tối đa sinh ra
      clusterCountMax: 20,
      // Thời gian bay của pháo con (mili-giây)
      starLife: 3500,
      // Xác suất tạo hạt trail trên mỗi frame bay của pháo con
      trailChance: 1.0
    },
    // Cấu hình pháo chùm dạng cầu (được tối ưu giảm tải tránh lag khi nổ 5 quả cùng lúc)
    cometSphere: {
      // Số pháo con tối thiểu (được tối ưu để vẫn thành hình cầu đẹp mắt)
      clusterCountMin: 35,
      // Số pháo con tối đa
      clusterCountMax: 45,
      // Thời gian bay của pháo con
      starLife: 3500,
      // Xác suất tạo hạt trail (giảm xuống để tránh quá tải draw calls trên GPU)
      trailChance: 0.9
    },
    // Cấu hình bouquet phiên bản 2
    v2: {
      // Số pháo con tối thiểu
      clusterCountMin: 12,
      // Số pháo con tối đa
      clusterCountMax: 22,
      // Hệ số nhân lượng hạt lấp lánh (glitter) của pháo con
      particleCountMultiplier: 0.65,
      // Xác suất tạo hạt trail
      trailChance: 1.0
    }
  },

  // Cấu hình pháo Comet dạng Nòng Nọc / Mũi Tên (Comet Tadpole Burst)
  COMET_TADPOLE: {
    // Độ phóng to của đầu hạt nổ chính
    headScale: 1.6,
    // Độ chói sáng của nhân trắng bên trong đầu nòng nọc
    headBrightness: 11.0,
    // Hệ số thời gian sống của đuôi (tăng lên để kéo dãn không bị vón cục)
    trailLifeMultiplier: 0.90,
    // Hệ số độ to bề ngang của vệt đuôi
    trailWidthMultiplier: 1.4,
    // Khoảng cách bình phương tối thiểu giữa các lần sinh hạt để dãn vệt
    trailMinDistSq: 1.44,
    // Biên độ lắc lư nhẹ nhàng cơ bản (mét, không xoáy tròn mạnh)
    swayAmpBase: 0.30,
    // Biên độ lắc lư cực đại
    swayAmpMax: 0.70,
    // Tần số lắc lư nhẹ nhàng êm ái (Hz)
    swayFreq: 1.85,
    // Ngưỡng bắt đầu xù hạt chúc xuống dưới hình mũi tên (hạ xuống tầm thấp 28% độ cao)
    arrowFlurryStartProgress: 0.28,
    // Chu kỳ bắn đợt hạt xù hình mũi tên (giây, ngắn hơn để xù đều và dày dặn hơn)
    arrowInterval: 0.065,
    // Số hạt xù bắn ra trong mỗi đợt
    arrowSparksMin: 4,
    arrowSparksMax: 7,
    // Vận tốc hạt xù bắn chúc ngược xuống dưới (m/s)
    arrowSpeedMin: 14.0,
    arrowSpeedMax: 24.0,
    // Thời gian sống của hạt tia xù hình mũi tên (giây)
    arrowStarLife: 0.75,
    // Số hạt bung chùm chúc xuống tại đỉnh (tăng mật độ để nổi bật rõ nét)
    flurryCount: 32,
    // Thời gian sống của hạt bung chùm tại đỉnh (giây)
    flurryStarLife: 0.85,
    // Hệ số tăng sáng và bloom cho các hạt tia xù
    sparkBrightnessMultiplier: 2.2,
    // Cấu hình pháo hoa mẹ khi nổ bung tỏa ra chùm nòng nọc xù (chrysanthemum_tadpole_burst)
    burstShell: {
      clusterCountMin: 18,
      clusterCountMax: 26,
      burstSpeedMin: 45.0,
      burstSpeedMax: 68.0,
      childStarLife: 2.2,
      gravityScale: 0.45
    },
    // Tỷ lệ hạt kích hoạt hiệu ứng tia xù nòng nọc trên pháo thông thường (30% - 40%)
    burstActivationRatio: 0.35
  },

  // Cấu hình hiệu ứng hạt nổ tăng tốc đổi hướng bất ngờ vẽ vệt sáng (Erratic Darting / Swimming Stars)
  ERRATIC_DART: {
    // Tỷ lệ hạt kích hoạt hiệu ứng (~40% số hạt)
    activationRatio: 0.40,
    // Ngưỡng phần trăm vòng đời bắt đầu kích hoạt pha vút
    triggerRatioMin: 0.70,
    triggerRatioMax: 0.76,
    // Tốc độ xung lực vút tốc mới cực đại (m/s)
    dartSpeedMin: 36.0,
    dartSpeedMax: 54.0,
    // Biên độ lắc uốn lượn tự nhiên của hạt khi vút (m/s^2)
    wobbleAmp: 26.0,
    // Tần số lắc lượn ngoằn ngoèo (rad/s)
    wobbleFreq: 22.0,
    // Hệ số ma sát không khí sau khi vút (thấp hơn để hạt lướt nhanh và xa)
    dragAfterDart: 0.12,
    // Thời gian sống kéo dài thêm cho pha vút vẽ vệt (giây)
    boostLifeDuration: 0.85,
    // Độ sáng bừng lên tức thì khi bắt đầu vút (multiplier)
    flashBrightnessMultiplier: 3.8,
    // Hệ số tăng cường độ sáng và độ nét của các hạt điểm sáng rời rạc (multiplier)
    streakBrightnessMultiplier: 4.0,
    // Chu kỳ nhả hạt vệt sáng dãn cách tạo độ rời rạc tự nhiên (giảm số lượng hạt sinh ra)
    trailInterval: 0.032,
    // Thời gian sống kéo dài của từng điểm sáng rời rạc để lưu giữ đường bay (giây)
    trailParticleLife: 0.95,
    // Tỷ lệ lệch góc
    deflectionJitter: 0.85
  },

  // Cấu hình quỹ đạo bay lên dạng xoắn ốc (spiral) tần suất cao và vệt sáng đậm
  ASCENT: {
    // Bật hiệu ứng xoắn ốc tự nhiên khi pháo bay lên
    wobbleEnabled: true,
    // Bán kính xoắn cơ sở cực đại (mốc max, mỗi quả shell random từ 35% đến 100% mốc này)
    maxWobbleAmp: 1.15,
    // Hệ số phình to cực đại ở giai đoạn giữa (mốc max dáng bầu dục, random từ 1.0 đến mốc này)
    midWobbleBoost: 1.5,
    // Tần số xoay xoắn ốc cực đại (mốc max rad/s, random từ 45% đến 100% mốc này)
    baseWobbleFreq: 15.0,
    // Độ ngẫu nhiên hóa tần số xoay giữa các quả pháo
    freqJitterRatio: 0.22,
    // Độ biến thiên vận tốc xoay trong quá trình bay (lúc nhanh lúc chậm)
    speedModulationAmp: 0.22,
    // Khoảng lệch tâm elip của vòng xoắn (không tròn hoàn hảo)
    eccentricityMin: 0.12,
    eccentricityMax: 0.32,
    // Tỉ lệ biên độ sóng hài bậc 2 tạo nấc lắc tự nhiên
    harmonicRatioMin: 0.18,
    harmonicRatioMax: 0.32,
    // Biên độ chao đảo trôi trục trung tâm (drift)
    axisDriftAmp: 0.22,
    // Hệ số lũy thừa theo độ cao
    heightExponent: 1.4,
    // Độ phân tán vi mô cơ bản của luồng hạt
    trailDispersion: 0.22,
    // Hệ số bung rộng phân tán ở giai đoạn giữa để vệt phình to hình bầu dục
    midDispersionBoost: 2.2,
    // Số bước hạt sinh cơ bản trên mỗi frame
    subSteps: 2,
    // Số bước hạt bổ sung ở giai đoạn giữa để vệt dày đặc hình bầu dục
    midSubStepsBonus: 2,
    // Xác suất sinh thêm hạt tỏa rộng hai bên ở giai đoạn giữa
    midExtraParticleChance: 0.75,
    // Hệ số thời gian sống của hạt đuôi khi bay lên để tạo dải sáng kéo dài
    trailLifeMultiplier: 0.65,
    // Độ đậm quang học của hạt đuôi
    trailOpacity: 1.0
  },

  // Cấu hình 3 giai đoạn vệt comet của shell: vừa bắn lên (nhạt) -> ở giữa (sáng nhất) -> gần burst (tắt hẳn hoặc giảm sáng)
  SHELL_COMET_PHASES: {
    // Ngưỡng kết thúc giai đoạn 1 (tỉ lệ độ cao từ 0 đến launchEndRatio là giai đoạn nhạt)
    launchEndRatio: 0.35,
    // Độ sáng ban đầu khi vừa rời bệ phóng
    launchStartIntensity: 0.25,
    // Ngưỡng bắt đầu giai đoạn 3 (gần burst của shell)
    fadeStartMin: 0.72,
    fadeStartMax: 0.82,
    // Tỉ lệ xác suất ưu tiên tắt hẳn về 0 (0.75 = 75% tắt hoàn toàn trước khi burst, 25% giảm độ sáng)
    turnOffChance: 0.75,
    // Mức độ sáng khi giảm cho các trường hợp không tắt hẳn
    dimTargetMin: 0.15,
    dimTargetMax: 0.25,
    // Bật hiện tượng cháy đứt quãng ngẫu nhiên (sputter / micro-gaps)
    sputterEnabled: true,
    // Tỉ lệ quả shell xuất hiện hiện tượng đứt quãng
    sputterShellChance: 0.4,
    // Khoảng cách thời gian giữa các đợt đứt quãng (giây)
    sputterIntervalMin: 0.22,
    sputterIntervalMax: 0.48,
    // Thời lượng mỗi nhịp đứt quãng (giây, tương đương 2-4 frame tạo khoảng hở 1.5 - 3 mét)
    sputterDurationMin: 0.035,
    sputterDurationMax: 0.075,
    // Bập bùng nhấp nháy trước khi tắt hẳn ở giai đoạn cuối
    endFlicker: true
  },

  // Cấu hình tập trung cho hệ thống khói (Smoke Simulation)
  SMOKE: {
    // Sức chứa hạt khói tối đa theo các mức chất lượng đồ họa
    qualityCapacities: {
      off: {
        launch: 0,
        aerial: 0
      },
      low: {
        launch: 150,
        aerial: 450
      },
      medium: {
        launch: 450,
        aerial: 1350
      },
      high: {
        launch: 5000,
        aerial: 10000
      },
      unlimited: {
        launch: 10000,
        aerial: 15000
      }
    },
    // Thời gian sống cơ bản của khói vệt phóng rocket (giây: 4.0 - 5.0s)
    trailLifeMin: 4.0,
    trailLifeMax: 10.0,
    // Thời gian sống của đám khói nổ quả cầu pháo hoa (giây: 10.0 - 12.0s)
    burstLifeMin: 15.0,
    burstLifeMax: 20.0,
    // Hệ số cản không khí khí động học (exponential drag)
    trailDrag: 1.6,
    burstDragMin: 2.8,
    burstDragMax: 3.6,
    // Lực đẩy nổi (buoyancy)
    trailBuoyancy: 0.35,
    burstBuoyancyMin: 0.55,
    burstBuoyancyMax: 0.9,
    // Kích thước cơ bản và hệ số phồng to (growth)
    trailBaseScale: 14.0,
    trailGrowth: 3.5,
    burstBaseScale: 32.0,
    burstGrowth: 3.2,
    // Độ mờ quang học cơ bản (base opacity)
    trailOpacity: 0.24,
    burstOpacity: 0.18,
    // Vô hiệu hóa khói vi mô li ti rải rác dọc đường bay của hạt pháo
    disableFlightSmoke: true,
    // Cấu hình vệt khói phóng rocket dạng tia phân đoạn liên tục (flight smoke streak trail)
    flightSmokeLifeMin: 3.5,
    flightSmokeLifeMax: 6.5,
    flightSmokeStepDist: 2.5,
    flightSmokeScale: 8.2,
    flightSmokeGrowth: 3.8,
    flightSmokeDrag: 1.8,
    flightSmokeBuoyancy: 0.38,
    flightSmokeOpacity: 0.21,
    // Cấu hình sương mù nền chuyển sinh liên tục (Ambient Haze Consolidation: 30% sinh, 70% sương nền)
    hazeConsolidation: true,
    hazeChance: 0.22,
    handoverRatio: 0.30,
    hazeLifeRatio: 0.70,
    hazeLifeMin: 10.0,
    hazeLifeMax: 18.0,
    hazeDrag: 0.65,
    hazeBuoyancy: 0.16,
    hazeGrowth: 1.45,
    // Cấu hình hòa trộn sáp nhập hạt khói (Progressive Particle Coalescence)
    coalescenceEnabled: true,
    coalescenceNucleusRatio: 0.25,
    coalescenceExpansionBoost: 3.5,
    // Số lượng nguồn sáng động chiếu rọi lên khói tối đa và theo phân cấp đồ họa
    maxLights: 4,
    qualityMaxLights: {
      low: 1,
      medium: 1,
      high: 1,
      unlimited: 1
    },
    // Hệ số sóng xung kích vụ nổ đẩy dạt khói hiện hữu
    blastImpulseScale: 22.0,
    blastImpulseRadiusMultiplier: 1.5,
    // Tỷ lệ sinh khói nhẹ tự nhiên sau mỗi vụ nổ pháo hoa thông thường (100% các vụ nổ)
    ambientBurstSmokeChance: 1.0,
    // Số lượng khối mây khói lớn sinh ra khi nổ tự nhiên theo phân cấp đồ họa
    ambientBurstPuffCount: {
      low: 1,
      medium: 2,
      high: 2,
      unlimited: 3
    },
    // Hệ số kích thước và độ mờ cho khối khói lớn tự nhiên
    ambientBurstScaleMultiplier: 0.95,
    ambientBurstOpacityMultiplier: 0.75
  },

  // Cấu hình pháo nổ phụ thứ cấp (Second Burst)
  SECOND_BURST: {
    minParticlesPerChild: 10,
    maxParticlesPerChild: 48,
    defaultScale: 0.35,
    minScale: 0.15,
    maxScale: 0.8,
    defaultLife: 0.9,
    lifeJitter: 0.2,
    baseSpeed: 38,
    maxConcurrentChildParticles: 35000,
    audioThrottleMs: 45,
    maxAudioTriggersPerWindow: 3
  }
};
