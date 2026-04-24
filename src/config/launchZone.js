import * as THREE from 'three';

export const LAUNCH_ZONE_CONFIG = {
  center: new THREE.Vector3(0, -50, 340), // Tâm của khu vực bắn pháo (x, y, z)
  launchRadiusX: 120, // Bán kính phát sinh pháo theo trục X (chiều ngang)
  launchRadiusZ: 22, // Bán kính phát sinh pháo theo trục Z (chiều dọc/sâu)
  noEntryHalfWidth: 100, // Nửa chiều ngang của vùng cấm xâm nhập (vùng an toàn)
  noEntryHalfDepth: 200, // Nửa chiều sâu của vùng cấm xâm nhập
  minBurstY: -40, // Độ cao nổ tối thiểu (mặt sàn là -50, nổ ở -40 là sát sàn)
  maxBurstY: 600, // Độ cao nổ tối đa (đã điều chỉnh lại cho hợp lý)
  minLaunchSpeedY: 120, // Tốc độ phóng tối thiểu (giảm mạnh để pháo có thể bay tà tà)
  maxLaunchSpeedY: 178, // Tốc độ phóng lên tối đa theo trục Y
  boundaryPadding: 12, // Khoảng đệm an toàn cho ranh giới khu vực
  arcRadius: 360, // Bán kính vòng cung tạo bởi các điểm bắn

  // Các phân khu bắn (sectors)
  sectors: [
    { id: 'right', minAngle: -40 * Math.PI / 180, maxAngle: 40 * Math.PI / 180 },
    { id: 'center', minAngle: 50 * Math.PI / 180, maxAngle: 130 * Math.PI / 180 },
    { id: 'left', minAngle: 140 * Math.PI / 180, maxAngle: 220 * Math.PI / 180 }
  ],

  // Các thuộc tính phái sinh dùng để vẽ hình học (viền hiển thị)
  get width() { return this.launchRadiusX * 2; },
  get depth() { return this.launchRadiusZ * 2; }
};
