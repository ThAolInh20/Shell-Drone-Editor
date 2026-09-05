import * as THREE from 'three';

// Cấu hình tập trung cho toàn bộ hệ thống pháo hoa và hạt (particles)
export const FIREWORK_CONFIG = {
  // Trọng lực tác động lên quỹ đạo bay của quả pháo và hạt tia lửa
  GRAVITY: -30,

  // Các hằng số hệ thống liên quan đến hiển thị và hiệu năng
  SYSTEM: {
    // Giới hạn số lượng hạt nổ tối đa hiển thị đồng thời để tránh quá tải GPU
    maxBurstParticles: 20000,
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
    // Vận tốc bung hạt cơ bản khi pháo nổ
    baseSpeed: 65,
    // Thời gian sống cơ bản của hạt nổ pháo hoa (giây)
    baseLife: 2.3,
    // Ngưỡng tỉ lệ vòng đời bắt đầu thực hiện hiệu ứng mờ dần (dissolve)
    dissolveStart: 0.62,
    // Số hạt nổ mặc định cho một quả pháo tiêu chuẩn
    baseParticles: 110,
    // Số hạt nổ tối thiểu cho phép
    minParticles: 60,
    // Số hạt nổ tối đa cho phép để bảo vệ FPS
    maxParticles: 220
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
    star: 1.14
  },

  // Hệ số nhân số lượng hạt dựa trên hiệu ứng hình ảnh (Effect)
  EFFECT_MULTIPLIERS: {
    standard: 1,
    crackle: 1.15,
    floral: 1.18,
    'falling-leaves': 1.04,
    heart: 1.22,
    strobe: 1.08,
    wave: 1.1,
    flow: 1.08,
    snow: 1.08,
    oval: 1.08,
    flower: 1.12
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
    axisDriftAmp: 0.38,
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
    sputterShellChance: 0.7,
    // Khoảng cách thời gian giữa các đợt đứt quãng (giây)
    sputterIntervalMin: 0.22,
    sputterIntervalMax: 0.48,
    // Thời lượng mỗi nhịp đứt quãng (giây, tương đương 2-4 frame tạo khoảng hở 1.5 - 3 mét)
    sputterDurationMin: 0.035,
    sputterDurationMax: 0.075,
    // Bập bùng nhấp nháy trước khi tắt hẳn ở giai đoạn cuối
    endFlicker: true
  }
};
