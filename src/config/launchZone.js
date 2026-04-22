import * as THREE from 'three';

export const LAUNCH_ZONE_CONFIG = {
  center: new THREE.Vector3(0, -50, 0), // Tâm của khu vực bắn pháo (x, y, z)
  launchRadiusX: 120, // Bán kính phát sinh pháo theo trục X (chiều ngang)
  launchRadiusZ: 22, // Bán kính phát sinh pháo theo trục Z (chiều dọc/sâu)
  noEntryHalfWidth: 100, // Nửa chiều ngang của vùng cấm xâm nhập (vùng an toàn)
  noEntryHalfDepth: 200, // Nửa chiều sâu của vùng cấm xâm nhập
  minBurstY: 50, // Độ cao nổ tối thiểu của pháo
  maxBurstY: 480, // Độ cao nổ tối đa của pháo
  minLaunchSpeedY: 136, // Tốc độ phóng lên tối thiểu theo trục Y
  maxLaunchSpeedY: 178, // Tốc độ phóng lên tối đa theo trục Y
  boundaryPadding: 12, // Khoảng đệm an toàn cho ranh giới khu vực

  // Các thuộc tính phái sinh dùng để vẽ hình học (viền hiển thị)
  get width() { return this.launchRadiusX * 2; },
  get depth() { return this.launchRadiusZ * 2; }
};
