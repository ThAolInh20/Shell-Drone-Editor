import * as THREE from 'three';
import { FIREWORK_CONFIG } from '../config/fireworks.js';

const SHELL_CORE_SIZE = 0.6;
const SHELL_HALO_COUNT = 10;
const SHELL_HALO_RADIUS = 3.8;
const SHELL_HALO_SIZE = 0.95;

export class ShellEntity {
  static STATE = {
    INIT: 'init',
    LAUNCHING: 'launching',
    BURSTED: 'bursted',
    DEAD: 'dead'
  };

  constructor({
    position,
    velocity,
    burstHeight,
    color,
    shape,
    shellType = null,
    shapeType = null,
    preset = null
  }) {
    this.type = 'shell';
    this.velocity = velocity;
    this.burstHeight = burstHeight;
    this.color = color;
    this.shape = shape;
    this.shellType = shellType ?? shape;
    this.shapeType = shapeType ?? shape;
    this.preset = preset;
    this.age = 0;
    this.state = ShellEntity.STATE.INIT;

    // Vị trí gốc và các tham số chuyển động xoắn ốc (spiral) khi bay lên
    this.basePosition = position.clone();
    this.prevPosition = position.clone();
    this.initialY = position.y;
    const ascentCfg = FIREWORK_CONFIG.ASCENT;
    this.wobbleEnabled = ascentCfg?.wobbleEnabled !== false;
    this.wobblePhase = Math.random() * Math.PI * 2;
    this.wobbleFreq = (ascentCfg?.baseWobbleFreq ?? 34.0) * (0.92 + Math.random() * 0.16);
    let maxAmp = ascentCfg?.maxWobbleAmp ?? 1.35;
    if (this.shellType === 'floral-child') {
      maxAmp *= 0.3;
    }
    this.wobbleMaxAmp = maxAmp * (0.85 + Math.random() * 0.3);
    this.heightExponent = ascentCfg?.heightExponent ?? 1.4;

    this.mesh = new THREE.Group();

    const coreGeometry = new THREE.SphereGeometry(SHELL_CORE_SIZE, 8, 8);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false
    });
    this.coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    this.mesh.add(this.coreMesh);

    const haloPositions = new Float32Array(SHELL_HALO_COUNT * 3);
    const haloColors = new Float32Array(SHELL_HALO_COUNT * 3);

    for (let i = 0; i < SHELL_HALO_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const elevation = (Math.random() - 0.5) * Math.PI;
      const radius = SHELL_HALO_RADIUS * (0.35 + Math.random() * 0.65);
      const offset = new THREE.Vector3(
        Math.cos(angle) * Math.cos(elevation) * radius,
        Math.sin(elevation) * radius * 0.75,
        Math.sin(angle) * Math.cos(elevation) * radius
      );

      haloPositions[i * 3] = offset.x;
      haloPositions[i * 3 + 1] = offset.y;
      haloPositions[i * 3 + 2] = offset.z;

      const haloColor = color.clone().offsetHSL(
        (Math.random() - 0.5) * 0.04,
        (Math.random() - 0.5) * 0.08,
        (Math.random() - 0.5) * 0.14
      );

      haloColors[i * 3] = haloColor.r;
      haloColors[i * 3 + 1] = haloColor.g;
      haloColors[i * 3 + 2] = haloColor.b;
    }

    const haloGeometry = new THREE.BufferGeometry();
    haloGeometry.setAttribute('position', new THREE.BufferAttribute(haloPositions, 3));
    haloGeometry.setAttribute('color', new THREE.BufferAttribute(haloColors, 3));

    const haloMaterial = new THREE.PointsMaterial({
      size: SHELL_HALO_SIZE,
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false
    });
    this.haloPoints = new THREE.Points(haloGeometry, haloMaterial);
    this.mesh.add(this.haloPoints);

    this.mesh.position.copy(position);
    this.state = ShellEntity.STATE.LAUNCHING;
  }

  getProgress() {
    const totalAscent = Math.max(15, this.burstHeight - this.initialY);
    const currentAscent = Math.max(0, this.basePosition.y - this.initialY);
    return Math.min(1.0, Math.max(0, currentAscent / totalAscent));
  }

  update(deltaTime) {
    if (this.state !== ShellEntity.STATE.LAUNCHING) {
      return false;
    }

    this.velocity.y += -30 * deltaTime;
    this.basePosition.addScaledVector(this.velocity, deltaTime);
    this.age += deltaTime;

    this.prevPosition.copy(this.mesh.position);

    if (this.wobbleEnabled) {
      const progress = this.getProgress();
      const radius = this.wobbleMaxAmp * (0.2 + 0.8 * Math.pow(progress, this.heightExponent));
      const spinAngle = this.age * this.wobbleFreq + this.wobblePhase;

      const wobbleX = Math.cos(spinAngle) * radius;
      const wobbleZ = Math.sin(spinAngle) * radius;

      this.mesh.position.set(
        this.basePosition.x + wobbleX,
        this.basePosition.y,
        this.basePosition.z + wobbleZ
      );
    } else {
      this.mesh.position.copy(this.basePosition);
    }

    this.mesh.scale.setScalar(1 + Math.sin(this.age * 12) * 0.05);

    if (this.coreMesh.material) {
      this.coreMesh.material.opacity = 0.9 + Math.sin(this.age * 18) * 0.08;
    }

    if (this.haloPoints.material) {
      this.haloPoints.material.opacity = 0.55 + Math.sin(this.age * 9) * 0.12;
    }

    return this.canBurst();
  }

  canBurst() {
    if (this.preset?.noBurst) {
      const lifeTime = (this.preset.starLife / 1000) || 2.5; // starLife is usually in ms
      return this.age >= lifeTime;
    }
    return this.basePosition.y >= this.burstHeight || this.velocity.y <= 0;
  }

  markBursted() {
    this.state = ShellEntity.STATE.BURSTED;
  }

  markDead() {
    this.state = ShellEntity.STATE.DEAD;
  }
}