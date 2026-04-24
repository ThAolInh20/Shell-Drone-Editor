export const demoShow = [
  /**
   * ==============================================
   * HƯỚNG DẪN CẤU HÌNH SEQUENCES (SHOW DIRECTOR)
   * ==============================================
   * 
   * 1. CÁC LOẠI (type):
   *    - 'sequence': Bắn pháo hoa nổ thông thường (sphere, crackle, ring, willow...)
   *    - 'cometsequence': Bắn tia sao băng (comet) không nổ
   *    - 'finale': Bắn dồn dập loạn xạ ngẫu nhiên (chỉ cần totalShells và duration)
   * 
   * 2. CÁC MẪU BẮN (pattern):
   *    * Dành cho cả 'sequence' và 'cometsequence':
   *      - 'sweep-left': Bắn quét từ phải sang trái (x2 -> x1)
   *      - 'sweep-right': Bắn quét từ trái sang phải (x1 -> x2)
   *    
   *    * Chỉ dành cho 'sequence':
   *      - 'converge': Bắn từ 2 bên dồn vào giữa
   *      - 'diverge': Bắn từ giữa tản ra 2 bên
   *      - 'zigzag': Bắn chữ Z (thay đổi cả độ cao và chiều sâu)
   *      - 'fan': Bắn hình vòm cung (vẽ 1 đường vòng cung trên trời)
   * 
   *    * Chỉ dành cho 'cometsequence':
   *      - 'continuous': Bắn liên tục tại 1 điểm (hơi lệch góc xíu cho tự nhiên)
   *      - 'fan-burst': Bắn chùm tia hình quạt tỏa ra cùng 1 lúc (thường để duration: 0)
   *      - 'fan-sweep-left' / 'fan-sweep-right': Bắn tia nghiêng quét góc như quạt giấy
   *      - 'fan-sweep-continuous': Quét góc qua lại nhiều lần (chỉnh số lần bằng sweepCount)
   * 
   * 3. CÁC THAM SỐ (parameters):
   *    - time: Giây bắt đầu bắn (tính từ lúc show bắt đầu)
   *    - count: Số lượng pháo trong sequence
   *    - duration: Khoảng thời gian rải đều các quả pháo (để 0 sẽ bắn burst cùng lúc)
   *    - preset: Tên loại pháo (VD: 'falling-comets', 'strobe', 'crackle', 'ring'...)
   *    - color: Màu ép buộc (VD: 0xff0000)
   *    - sectorId: Khu vực bắn ('left', 'center', 'right')
   *    - x1, x2: Giới hạn chiều ngang (0.0 đến 1.0), dùng để quét theo chiều ngang
   *    - y1, y2: Giới hạn chiều cao (0.0 đến 1.0), dùng để quét chéo lên/xuống
   *    - ratioX, ratioY, ratioZ: Cố định vị trí bắn (0.0 đến 1.0)
   *    - angle: Góc nghiêng (radian) khi bắn comet kiểu sweep
   * ==============================================
   */

  // --- VÍ DỤ COMET SEQUENCES ---
  // { time: 0.0, type: 'cometsequence', pattern: 'fan-sweep-continuous', count: 15, duration: 2.0, sweepCount: 2, ratioX: 0.5, sectorId: 'left', color: 0xff0000 },
  // { time: 0.5, type: 'cometsequence', pattern: 'sweep-left', count: 9, duration: 0.5, ratioX: 0.5, sectorId: 'center', y1: 0, y2: 0.8 },
  // { time: 1.5, type: 'cometsequence', pattern: 'sweep-right', count: 9, duration: 0.5, ratioX: 0.5, sectorId: 'center', y1: 0, y2: 0.8 },
  // Bắn sweep comet có giới hạn vị trí (x1 tới x2) và góc nghiêng (angle):
  // { time: 2.5, type: 'cometsequence', pattern: 'sweep-right', count: 10, duration: 1.0, x1: 0.2, x2: 0.8, angle: Math.PI/8 },

  // --- VÍ DỤ NORMAL SEQUENCES ---
  { time: 0.0, type: 'sequence', pattern: 'converge', count: 3, duration: 0.2, sectorId: 'center', preset: 'falling-comets', x1: 0.1, x2: 0.9, y1: 0.1, y2: 0.1, },
  // { time: 1.5, type: 'sequence', pattern: 'sweep-right', count: 10, duration: 2.0, sectorId: 'center', preset: 'strobe', y1: 0, y2: 1 },
  // { time: 9.5, type: 'sequence', pattern: 'converge', count: 14, duration: 3.0, preset: 'crackle' },
  // { time: 13.0, type: 'sequence', pattern: 'fan', count: 15, duration: 4.0, preset: 'ring' },
  // { time: 18.0, type: 'finale', totalShells: 40, duration: 5.0 }
];
