import * as THREE from 'three';

export class BurstShapeGenerator {
  static heartPoint(t) {
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y =
      13 * Math.cos(t) -
      5 * Math.cos(2 * t) -
      2 * Math.cos(3 * t) -
      Math.cos(4 * t);

    return { x, y };
  }

  static rotate3D(x, y, z, rotX, rotY, rotZ) {
    let rx = x;
    let ry = y;
    let rz = z;

    const cosX = Math.cos(rotX);
    const sinX = Math.sin(rotX);
    const y1 = ry * cosX - rz * sinX;
    const z1 = ry * sinX + rz * cosX;
    ry = y1;
    rz = z1;

    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);
    const x2 = rx * cosY + rz * sinY;
    const z2 = -rx * sinY + rz * cosY;
    rx = x2;
    rz = z2;

    const cosZ = Math.cos(rotZ);
    const sinZ = Math.sin(rotZ);
    const x3 = rx * cosZ - ry * sinZ;
    const y3 = rx * sinZ + ry * cosZ;

    return { x: x3, y: y3, z: rz };
  }

  static resolveShape(shellType) {
    switch (shellType) {
      case 'ring':
      case 'heart':
      case 'star':
      case 'willow':
      case 'willow-up':
      case 'lightning':
      case 'oval':
      case 'flower':
      case 'cat':
      case 'fish':
      case 'smiley':
        return shellType;
      case 'hearth':
        return 'heart';
      default:
        return 'sphere';
    }
  }

  static direction(shape, angle, index, count, preset = null) {
    if (shape === 'sphere') {
      const safeCount = Math.max(count, 1);
      const t = (index + 0.5) / safeCount;
      const y = 1 - t * 2;
      const ringRadius = Math.sqrt(Math.max(0, 1 - y * y));
      const goldenAngle = Math.PI * (3 - Math.sqrt(5));
      const theta = goldenAngle * index;
      const jitter = 0.045;

      return new THREE.Vector3(
        Math.cos(theta) * ringRadius + (Math.random() - 0.5) * jitter,
        y + (Math.random() - 0.5) * jitter * 0.7,
        Math.sin(theta) * ringRadius + (Math.random() - 0.5) * jitter
      ).normalize();
    }

    if (shape === 'heart') {
      let heartRotation = preset?.heartRotation;

      if (!heartRotation) {
        heartRotation = {
          x: (Math.random() - 0.5) * 0.3,
          y: (Math.random() - 0.5) * 0.3,
          z: Math.random() * Math.PI * 2
        };
        if (preset) preset.heartRotation = heartRotation;
      }

      const isOutline = preset?.shapeRenderMode === 'outline';

      let t;
      if (isOutline) {
        const segmentCount = 120;
        const segmentIndex = index % segmentCount;
        t = (segmentIndex / segmentCount) * Math.PI * 2;
      } else {
        t = Math.random() * Math.PI * 2;
      }

      // ❤️ HEART
      let x = 16 * Math.pow(Math.sin(t), 3);
      let y =
        13 * Math.cos(t)
        - 5 * Math.cos(2 * t)
        - 2 * Math.cos(3 * t)
        - Math.cos(4 * t);

      // Thêm méo mó hình học (geometric distortion) bằng sóng sine tần số thấp để viền trái tim lượn sóng tự nhiên
      const distortion = 1.0 + (Math.sin(t * 3) * 0.04 + Math.cos(t * 5) * 0.03);
      x *= distortion;
      y *= distortion;

      let z = 0;

      const rotated = this.rotate3D(
        x,
        y,
        z,
        heartRotation.x,
        heartRotation.y,
        heartRotation.z
      );

      // 🔥 QUAN TRỌNG: tách direction + magnitude
      const dir = new THREE.Vector3(
        rotated.x,
        rotated.y,
        rotated.z
      );

      const length = dir.length();

      if (length === 0) return new THREE.Vector3(0, 1, 0);

      return dir.normalize().multiplyScalar(length / 20);
    }

    if (shape === 'ring') {
      const isDoubleRing = Boolean(preset?.doubleRing);
      const isOutline = preset?.shapeRenderMode === 'outline';
      const isJupiter = preset?.shapeRenderMode === 'jupiter';
      const ringBand = 0.78; // Cùng bán kính
      const contourThickness = Math.max(0.01, preset?.outlineThickness ?? (isOutline ? 0.03 : 0.06));

      if (isJupiter) {
        const coreRatio = Math.min(0.9, Math.max(0.1, preset?.ringCoreRatio ?? 0.42));
        const coreJitter = Math.max(0.01, preset?.ringCoreJitter ?? 0.08);
        const useCore = index % Math.max(2, Math.round(1 / coreRatio)) === 0;

        if (useCore) {
          const coreRadius = 0.2 + Math.random() * 0.22;
          const coreAngle = angle + (Math.random() - 0.5) * 0.08;
          return new THREE.Vector3(
            Math.cos(coreAngle) * coreRadius + (Math.random() - 0.5) * coreJitter,
            (Math.random() - 0.5) * coreJitter * 0.7,
            Math.sin(coreAngle) * coreRadius + (Math.random() - 0.5) * coreJitter
          ).normalize();
        }
      }

      // Tính toán góc chia đều hoàn hảo để vẽ thành vòng tròn liền mạch thay vì rải ngẫu nhiên
      const perfectAngle = (index / Math.max(1, count)) * Math.PI * 2 * (isDoubleRing ? 2 : 1);
      
      let distortion = 0;
      let noiseRadius = 0;
      
      // Ring v1 cần hình tròn hoàn hảo, không có méo mó hình học
      if (preset?.shellType !== 'ring') {
        distortion = Math.sin(perfectAngle * 3) * 0.05 + Math.cos(perfectAngle * 5) * 0.03;
        noiseRadius = (Math.random() - 0.5) * 0.02; 
      }
      
      const radius = ringBand + distortion + noiseRadius;
      
      let yOffset = (Math.random() - 0.5) * 0.03;
      if (isDoubleRing) {
        yOffset += index % 2 === 0 ? 0.2 : -0.2; // 2 mặt phẳng song song (cách nhau 0.4)
      }

      return new THREE.Vector3(
        Math.cos(perfectAngle) * radius,
        yOffset,
        Math.sin(perfectAngle) * radius
      );
    }

    if (shape === 'star') {
      const radius = Math.sin(angle * 5) * 0.45 + 0.75;
      return new THREE.Vector3(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        Math.random() * 0.45 - 0.225
      ).normalize();
    }

    if (shape === 'willow') {
      return new THREE.Vector3(
        (Math.random() - 0.5) * 0.85,
        0.25 + Math.random() * 0.55,
        (Math.random() - 0.5) * 0.85
      ).normalize();
    }

    if (shape === 'willow-up') {
      // V2: Bắn văng toàn bộ lên nửa trên của bầu trời (upper hemisphere)
      return new THREE.Vector3(
        (Math.random() - 0.5) * 2.0, // Văng rộng sang các hướng ngang
        Math.random() * 1.0 + 0.2,   // Toàn bộ hạt đều có gia tốc hướng lên trên (Y dương)
        (Math.random() - 0.5) * 2.0
      ).normalize();
    }

    if (shape === 'lightning') {
      const fork = Math.sin(angle * 6) * 0.55;
      return new THREE.Vector3(
        fork + (Math.random() - 0.5) * 0.25,
        0.55 + Math.random() * 0.45,
        (Math.random() - 0.5) * 0.3
      ).normalize();
    }

    if (shape === 'oval') {
      return new THREE.Vector3(
        Math.cos(angle) * 1.0,
        Math.sin(angle) * 0.55,
        (Math.random() - 0.5) * 0.22
      ).normalize();
    }

    if (shape === 'flower') {
      const petalRadius = 0.32 + Math.abs(Math.sin(angle * 6)) * 0.95;
      return new THREE.Vector3(
        Math.cos(angle) * petalRadius,
        Math.sin(angle) * petalRadius,
        (Math.random() - 0.5) * 0.2
      ).normalize();
    }

    if (shape === 'cat') {
      const progress = index / Math.max(count - 1, 1);
      if (progress < 0.2) {
        return new THREE.Vector3(-0.45 + Math.random() * 0.2, 0.9 + Math.random() * 0.15, (Math.random() - 0.5) * 0.1).normalize();
      }
      if (progress < 0.4) {
        return new THREE.Vector3(0.25 + Math.random() * 0.2, 0.9 + Math.random() * 0.15, (Math.random() - 0.5) * 0.1).normalize();
      }
      return new THREE.Vector3(
        Math.cos(angle) * 0.78,
        Math.sin(angle) * 0.62,
        (Math.random() - 0.5) * 0.16
      ).normalize();
    }

    if (shape === 'fish') {
      const body = 0.55 + Math.random() * 0.4;
      return new THREE.Vector3(
        Math.cos(angle) * 1.1 * body,
        Math.sin(angle) * 0.4 * body,
        (Math.random() - 0.5) * 0.16
      ).normalize();
    }

    if (shape === 'smiley') {
      const progress = index / Math.max(count - 1, 1);
      if (progress < 0.12) {
        return new THREE.Vector3(-0.35 + Math.random() * 0.08, 0.35 + Math.random() * 0.08, (Math.random() - 0.5) * 0.08).normalize();
      }
      if (progress < 0.24) {
        return new THREE.Vector3(0.28 + Math.random() * 0.08, 0.35 + Math.random() * 0.08, (Math.random() - 0.5) * 0.08).normalize();
      }
      if (progress < 0.68) {
        const smileT = (progress - 0.24) / 0.44;
        const smileAngle = Math.PI + smileT * Math.PI;
        return new THREE.Vector3(
          Math.cos(smileAngle) * 0.48,
          Math.sin(smileAngle) * 0.42 + 0.05,
          (Math.random() - 0.5) * 0.08
        ).normalize();
      }
      return new THREE.Vector3(
        Math.cos(angle) * 0.92,
        Math.sin(angle) * 0.92,
        (Math.random() - 0.5) * 0.12
      ).normalize();
    }

    return new THREE.Vector3(
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1
    ).normalize();
  }
}