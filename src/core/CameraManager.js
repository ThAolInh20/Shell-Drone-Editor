import * as THREE from 'three';
import { globalEventBus } from './EventBus.js';

export class CameraManager {
  constructor(eventBus = null) {
    const aspect = typeof window !== 'undefined'
      ? window.innerWidth / window.innerHeight
      : 16 / 9;

    // 65 degree FOV for cinematic landscape depth
    this.instance = new THREE.PerspectiveCamera(
      65,
      aspect,
      0.1,
      10000
    );

    // Position camera close to water surface (50% sky, 50% lake composition)
    this.instance.position.set(0, 6, 420);
    this.instance.lookAt(0, 75, 0);

    this.eventBus = eventBus || globalEventBus;
    this.trauma = 0.0;
    this.shakeTime = 0.0;
    this.shakeOffset = new THREE.Vector3();
    this.shakeRotation = new THREE.Euler(0, 0, 0, 'YXZ');
    this.tempVector = new THREE.Vector3();
    this.isShakingApplied = false;
    this.enabled = true;

    this.eventSubscriptions = [];
    if (this.eventBus && typeof this.eventBus.on === 'function') {
      this.eventSubscriptions.push(
        this.eventBus.on('firework:burst', (detail) => {
          this.onBurst(detail);
        })
      );
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.onResize.bind(this));
    }
  }

  onResize() {
    if (typeof window !== 'undefined') {
      this.instance.aspect = window.innerWidth / window.innerHeight;
      this.instance.updateProjectionMatrix();
    }
  }

  onBurst(detail = {}) {
    if (!this.enabled || !detail) {
      return;
    }

    const rawIntensity = detail.intensity ?? 0.5;
    const burstPos = detail.position;

    let distanceFactor = 1.0;
    if (burstPos && burstPos.x !== undefined) {
      this.tempVector.set(
        burstPos.x,
        burstPos.y,
        burstPos.z
      );
      const dist = Math.max(
        25.0,
        this.instance.position.distanceTo(this.tempVector)
      );
      // Inverse distance falloff: close bursts impart heavy impulse, far bursts impart subtle tremor
      distanceFactor = Math.min(1.4, 220.0 / dist);
    }

    // Heavy bursts (shell size >= 3" or finale) impart noticeable acoustic thump
    const addedTrauma = Math.pow(rawIntensity, 1.3) * 0.38 * distanceFactor;
    this.trauma = Math.min(0.70, this.trauma + addedTrauma);
  }

  addImpulse(intensity = 0.4) {
    if (!this.enabled) {
      return;
    }
    this.trauma = Math.min(0.70, this.trauma + intensity);
  }

  update(deltaTime) {
    if (this.trauma <= 0.001) {
      this.trauma = 0.0;
      this.shakeOffset.set(0, 0, 0);
      this.shakeRotation.set(0, 0, 0);
      return;
    }

    this.shakeTime += deltaTime * 48.0;
    // Quadratic trauma produces natural visceral kick and gentle decay
    const shake = this.trauma * this.trauma;

    // Harmonic multi-frequency translational offsets
    const ox = (
      Math.sin(this.shakeTime * 1.15) +
      Math.sin(this.shakeTime * 2.37) * 0.45
    ) * 0.28 * shake;

    const oy = (
      Math.cos(this.shakeTime * 1.35) +
      Math.sin(this.shakeTime * 2.81) * 0.40
    ) * 0.36 * shake;

    const oz = Math.sin(this.shakeTime * 0.95) * 0.15 * shake;

    this.shakeOffset.set(ox, oy, oz);

    // Subtle pitch and roll micro-rotation impulses
    const rx = Math.sin(this.shakeTime * 1.25) * 0.0035 * shake;
    const rz = Math.cos(this.shakeTime * 1.55) * 0.0025 * shake;
    this.shakeRotation.set(rx, 0, rz);

    // Rapid trauma dissipation
    this.trauma = Math.max(0.0, this.trauma - deltaTime * 2.9);
  }

  applyShake() {
    if (this.isShakingApplied) {
      return;
    }
    if (this.shakeOffset.lengthSq() > 0.000001 || this.shakeRotation.x !== 0 || this.shakeRotation.z !== 0) {
      this.instance.position.add(this.shakeOffset);
      this.instance.rotation.x += this.shakeRotation.x;
      this.instance.rotation.z += this.shakeRotation.z;
      this.isShakingApplied = true;
    }
  }

  restoreShake() {
    if (!this.isShakingApplied) {
      return;
    }
    this.instance.position.sub(this.shakeOffset);
    this.instance.rotation.x -= this.shakeRotation.x;
    this.instance.rotation.z -= this.shakeRotation.z;
    this.isShakingApplied = false;
  }

  destroy() {
    for (const unsubscribe of this.eventSubscriptions) {
      unsubscribe();
    }
    this.eventSubscriptions = [];
  }
}

