import * as THREE from 'three';

export class BurstShapeGenerator {
  static resolveShape(shellType) {
    switch (shellType) {
      case 'ring':
      case 'heart':
      case 'star':
      case 'willow':
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
    if (shape === 'heart') {
      const t = angle;
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      return new THREE.Vector3(x * 0.055, y * 0.065, (Math.random() - 0.5) * 0.18).normalize();
    }

    if (shape === 'ring') {
      const isDoubleRing = Boolean(preset?.doubleRing);
      const ringBand = isDoubleRing && index % 2 === 0 ? 0.52 : 0.78;
      const radius = ringBand + (Math.random() - 0.5) * 0.06;
      return new THREE.Vector3(
        Math.cos(angle) * radius,
        (Math.random() - 0.5) * 0.12,
        Math.sin(angle) * radius
      ).normalize();
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