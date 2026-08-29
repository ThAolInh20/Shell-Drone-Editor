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
  }
};
