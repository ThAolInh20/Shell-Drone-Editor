import * as THREE from 'three';

export const DRONE_ZONE_CONFIG = {
  // Vị trí mặc định: cùng độ cao pháo (-50), ngay sau khu vực bắn (z = -200)
  position: new THREE.Vector3(0, -50, -200),
  rotation: new THREE.Euler(0, 0, 0),
  scale: new THREE.Vector3(1, 1, 1),
  
  // Kích thước của vùng chuyên biệt (giới hạn để vẽ helper)
  width: 400, // Chiều rộng (X)
  height: 400, // Chiều cao (Y) (Đã tăng x2)
  depth: 200,  // Chiều sâu (Z)
  
  // Hiển thị lưới và ranh giới trong lúc thiết kế
  showHelpers: true
};
