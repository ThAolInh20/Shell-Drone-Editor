import * as THREE from 'three';
import { ShellEntity } from '../entities/ShellEntity.js';
import { ShellPresetFactory } from '../entities/ShellPresetFactory.js';
import { BurstShapeGenerator } from '../entities/BurstShapeGenerator.js';
import { BurstEffectProcessor } from '../entities/BurstEffectProcessor.js';

const GRAVITY = -30;
const BURST_PARTICLES = 80;
const BURST_SPEED = 50;
const BURST_LIFE = 1.6;

const FIREWORK_COLORS = [
  0xffd700, // vàng (gold)
  0xff4500, // cam đỏ (orange red)
  0x00bfff, // xanh da trời (deep sky blue)
  0xff69b4, // hồng (hot pink)
  0x7fffd4, // xanh ngọc (aquamarine)
  0x8a2be2  // tím (blue violet)
];

const BURST_FADE_EXPONENT = 2.5;
const CRACKLE_CLOUD_SPEED = 24;
const BASE_BURST_POINT_SIZE = 4;

const DEFAULT_TRAIL_COLOR = new THREE.Color( 0xffd700);
const CRACKLE_SPARK_COLOR = new THREE.Color(0xffd77a);

export class FireworkSystem {
  constructor(scene) {
    this.scene = scene;
    this.activeFireworks = [];
    this.trailParticles = [];
    this.shellPresetFactory = new ShellPresetFactory();
    this.launchPosition = new THREE.Vector3(0, -50, 0);
    this.autoLaunchEnabled = false;
    this.autoLaunchTimer = 0;
    this.autoLaunchInterval = 3; // seconds between auto launches
    this.shellSequence = 0;
    this.diagnostics = {
      launched: 0,
      bursted: 0,
      shapeFallbacks: 0,
      effectFallbacks: 0,
      warnings: 0,
      lastWarning: 'none'
    };
    this.heightScalingConfig = {
      enabled: true,
      minBurstY: 40,
      maxBurstY: 300,
      sizeMin: 0.85,
      sizeMax: 1.55,
      brightnessMin: 0.9,
      brightnessMax: 1.9,
      sizeCurve: 0.9,
      brightnessCurve: 1.15
    };

    // Trail particles geometry
    this.trailGeometry = new THREE.BufferGeometry();
    this.trailMaterial = new THREE.PointsMaterial({
      size: 2,
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      depthWrite: false
    });
    this.trailPoints = new THREE.Points(this.trailGeometry, this.trailMaterial);
    this.scene.add(this.trailPoints);
  }

  emitFireworkEvent(type, detail) {
    window.dispatchEvent(new CustomEvent(type, { detail }));
  }

  emitDiagnostics() {
    this.emitFireworkEvent('firework:diagnostics', {
      ...this.diagnostics
    });
  }

  registerWarning(message) {
    this.diagnostics.warnings += 1;
    this.diagnostics.lastWarning = message;
    console.warn(message);
    this.emitDiagnostics();
  }

  launchRandom(preset = null) {
    const shellPreset = this.shellPresetFactory.validatePreset(preset ?? this.shellPresetFactory.randomPreset());
    const shellId = ++this.shellSequence;
    const offsetX = (Math.random() - 0.5) * 40;
    const offsetZ = (Math.random() - 0.5) * 40;
    const position = this.launchPosition.clone().add(new THREE.Vector3(offsetX, 0, offsetZ));
    const targetHeight = 180 + Math.random() * 100;
    const velocity = new THREE.Vector3((Math.random() - 0.5) * 10, 90 + Math.random() * 30, (Math.random() - 0.5) * 10);
    const color = new THREE.Color(FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)]);
    const shell = this.createShell(position, velocity, targetHeight, color, shellPreset, shellId);
    this.scene.add(shell.mesh);
    this.activeFireworks.push(shell);
    this.diagnostics.launched += 1;

    for (const warning of shellPreset.__contract?.warnings ?? []) {
      this.registerWarning(`[Shell ${shellId}] ${warning}`);
    }

    this.emitDiagnostics();

    this.emitFireworkEvent('firework:launch', {
      shellId,
      shellType: shell.shellType,
      shapeType: shell.shapeType,
      effectType: shellPreset.effectType ?? 'standard'
    });
  }

  pickFireworkShape() {
    const roll = Math.random();

    if (roll < 0.48) return 'sphere';
    if (roll < 0.68) return 'ring';
    if (roll < 0.86) return 'heart';
    if (roll < 0.94) return 'willow';
    if (roll < 0.985) return 'star';
    return 'lightning';
  }

  createShell(position, velocity, burstHeight, color, preset = null, shellId = null) {
    const shellShape = preset?.shapeType ?? this.pickFireworkShape();
    return new ShellEntity({
      shellId,
      position,
      velocity,
      burstHeight,
      color,
      shape: shellShape,
      shellType: preset?.shellType ?? shellShape,
      shapeType: preset?.shapeType ?? shellShape,
      preset
    });
  }

  spawnTrailParticle(position, color) {
    const useFireworkColor = Math.random() < 0.75;
    const trailColor = useFireworkColor
      ? color.clone().offsetHSL(
        (Math.random() - 0.5) * 0.04,
        (Math.random() - 0.5) * 0.08,
        (Math.random() - 0.5) * 0.12
      )
      : DEFAULT_TRAIL_COLOR.clone();

    const particle = {
      position: position.clone(),
      velocity: new THREE.Vector3((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5),
      color: trailColor,
      life: 2 + Math.random() * 3,
      age: 0
    };
    this.trailParticles.push(particle);
  }

  spawnEffectSpark(position, color) {
    const spark = {
      position: position.clone(),
      velocity: new THREE.Vector3((Math.random() - 0.5) * 8, Math.random() * 8, (Math.random() - 0.5) * 8),
      color: color.clone().offsetHSL(0, 0.05, 0.18),
      life: 0.18 + Math.random() * 0.2,
      age: 0
    };
    this.trailParticles.push(spark);
  }

  spawnCrackleCloud(position) {
    const crackleCount = BURST_PARTICLES >= 80 ? 32 : 16;

    for (let i = 0; i < crackleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spread = 0.45 + Math.random() * 0.55;
      const direction = new THREE.Vector3(
        Math.cos(angle) * spread,
        (Math.random() - 0.5) * 0.5,
        Math.sin(angle) * spread
      ).normalize();

      const speed = Math.pow(Math.random(), 0.45) * CRACKLE_CLOUD_SPEED;
      this.trailParticles.push({
        position: position.clone(),
        velocity: direction.multiplyScalar(speed),
        color: CRACKLE_SPARK_COLOR.clone(),
        life: 0.3 + Math.random() * 0.2,
        age: 0
      });
    }
  }

  createBurst(position, color, shape = 'sphere', preset = null) {
    const requestedShape = shape ?? 'sphere';
    const resolvedShape = BurstShapeGenerator.resolveShape(requestedShape);
    if (resolvedShape !== requestedShape) {
      this.diagnostics.shapeFallbacks += 1;
      this.registerWarning(`[Burst] Shape fallback from "${requestedShape}" to "${resolvedShape}".`);
    }

    const crackleEnabled = Boolean(preset?.crackle);
    const requestedEffect = crackleEnabled ? 'crackle' : (preset?.effectType ?? resolvedShape);
    const normalizedEffect = BurstEffectProcessor.normalizeEffectType(requestedEffect);
    if (normalizedEffect !== requestedEffect) {
      this.diagnostics.effectFallbacks += 1;
      this.registerWarning(`[Burst] Effect fallback from "${requestedEffect}" to "${normalizedEffect}".`);
    }

    const positions = new Float32Array(BURST_PARTICLES * 3);
    const colors = new Float32Array(BURST_PARTICLES * 3);
    const velocities = [];
    const life = new Float32Array(BURST_PARTICLES);
    const burstRotation = this.createRandomBurstRotation();
    const heightProfile = this.heightScalingConfig.enabled
      ? BurstEffectProcessor.createHeightProfile(position.y, this.heightScalingConfig)
      : { normalized: 0, sizeMultiplier: 1, brightnessMultiplier: 1 };
    const brightnessBlend = Math.min(Math.max((heightProfile.brightnessMultiplier - 1) / 1.2, 0), 0.75);
    const brightnessIntensity = Math.min(heightProfile.brightnessMultiplier, 1.35);
    const burstColor = color.clone().lerp(new THREE.Color(0xffffff), brightnessBlend);

    for (let i = 0; i < BURST_PARTICLES; i++) {
      const angle = (i / BURST_PARTICLES) * Math.PI * 2;
      const direction = BurstShapeGenerator.direction(resolvedShape, angle, i, BURST_PARTICLES, preset)
        .applyQuaternion(burstRotation)
        .normalize();
      const sphereSpeedBand = 0.9 + Math.random() * 0.2;
      const defaultSpeedBand = 0.5 + Math.random() * 0.8;
      const speed = BURST_SPEED * (resolvedShape === 'sphere' ? sphereSpeedBand : defaultSpeedBand);
      velocities.push(direction.multiplyScalar(speed));

      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      colors[i * 3] = burstColor.r * brightnessIntensity;
      colors[i * 3 + 1] = burstColor.g * brightnessIntensity;
      colors[i * 3 + 2] = burstColor.b * brightnessIntensity;
      life[i] = 0;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({
      size: BASE_BURST_POINT_SIZE * heightProfile.sizeMultiplier,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      depthWrite: false
    });
    const points = new THREE.Points(geometry, material);
    points.userData = {
      velocities,
      life,
      effectType: normalizedEffect,
      crackle: crackleEnabled || normalizedEffect === 'crackle',
      crackleCloudTriggered: false,
      heightProfile,
      preset,
      effectState: BurstEffectProcessor.initialize(normalizedEffect, BURST_PARTICLES)
    };

    return {
      type: 'burst',
      points,
      age: 0,
      maxLife: BURST_LIFE
    };
  }

  createRandomBurstRotation() {
    const axis = new THREE.Vector3(
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1
    ).normalize();
    const angle = Math.random() * Math.PI * 2;
    return new THREE.Quaternion().setFromAxisAngle(axis, angle);
  }

  handleShellUpdate(item, deltaTime, finished) {
    const shouldBurst = item.update(deltaTime);

    if (Math.random() < 0.4) {
      this.spawnTrailParticle(item.mesh.position.clone(), item.color);
    }

    if (!shouldBurst) {
      return;
    }

    const burst = this.createBurst(item.mesh.position.clone(), item.color, item.shapeType ?? item.shape, item.preset);
    this.scene.add(burst.points);
    this.scene.remove(item.mesh);
    item.markBursted?.();
    finished.push(item);
    this.activeFireworks.push(burst);
    this.diagnostics.bursted += 1;
    this.emitDiagnostics();

    this.emitFireworkEvent('firework:burst', {
      shellId: item.shellId,
      shellType: item.shellType ?? item.shape,
      shapeType: item.shapeType ?? item.shape,
      effectType: item.preset?.effectType ?? item.shape
    });
  }

  handleBurstUpdate(item, deltaTime, finished) {
    item.age += deltaTime;
    const positions = item.points.geometry.attributes.position.array;
    const lifeArray = item.points.userData.life;
    const effectType = item.points.userData.effectType;
    const heightProfile = item.points.userData.heightProfile ?? { brightnessMultiplier: 1 };

    if (item.points.userData.crackle && !item.points.userData.crackleCloudTriggered && item.age >= item.maxLife * 0.3) {
      const cloudOrigin = new THREE.Vector3(positions[0], positions[1], positions[2]);
      this.spawnCrackleCloud(cloudOrigin);
      item.points.userData.crackleCloudTriggered = true;
    }

    const brightnessOpacityScale = Math.min(Math.max(0.82 + (heightProfile.brightnessMultiplier - 1) * 0.24, 0.72), 1.15);
    const baseOpacity = Math.pow(Math.max(1 - item.age / item.maxLife, 0), BURST_FADE_EXPONENT) * brightnessOpacityScale;
    item.points.material.opacity = BurstEffectProcessor.materialOpacity(effectType, item.age, item.maxLife, baseOpacity);

    for (let i = 0; i < BURST_PARTICLES; i++) {
      const velocity = item.points.userData.velocities[i];
      const particlePosition = new THREE.Vector3(
        positions[i * 3],
        positions[i * 3 + 1],
        positions[i * 3 + 2]
      );

      const { gravityScale, emitSpark } = BurstEffectProcessor.updateVelocity(
        velocity,
        i,
        deltaTime,
        item.age,
        item.maxLife,
        item.points.userData.effectState
      );

      if (emitSpark) {
        this.spawnEffectSpark(particlePosition, CRACKLE_SPARK_COLOR);
      }

      positions[i * 3] += velocity.x * deltaTime;
      positions[i * 3 + 1] += velocity.y * deltaTime;
      positions[i * 3 + 2] += velocity.z * deltaTime;

      velocity.y += GRAVITY * deltaTime * gravityScale;
      lifeArray[i] += deltaTime;
    }

    item.points.geometry.attributes.position.needsUpdate = true;

    if (item.age >= item.maxLife) {
      this.scene.remove(item.points);
      finished.push(item);
    }
  }

  update(deltaTime) {
    // Auto launch
    if (this.autoLaunchEnabled) {
      this.autoLaunchTimer += deltaTime;
      if (this.autoLaunchTimer >= this.autoLaunchInterval) {
        this.launchRandom();
        this.autoLaunchTimer = 0;
      }
    }

    const finished = [];

    for (const item of this.activeFireworks) {
      if (item.type === 'shell') {
        this.handleShellUpdate(item, deltaTime, finished);
      } else if (item.type === 'burst') {
        this.handleBurstUpdate(item, deltaTime, finished);
      }
    }

    this.activeFireworks = this.activeFireworks.filter(item => !finished.includes(item));

    // Update trail particles
    this.updateTrailParticles(deltaTime);
  }

  updateTrailParticles(deltaTime) {
    const finishedTrails = [];
    const positions = [];
    const colors = [];

    for (const particle of this.trailParticles) {
      particle.velocity.y += GRAVITY * deltaTime * 0.5; // Slower gravity for trails
      particle.position.addScaledVector(particle.velocity, deltaTime);
      particle.age += deltaTime;

      if (particle.age >= particle.life) {
        finishedTrails.push(particle);
      } else {
        positions.push(particle.position.x, particle.position.y, particle.position.z);
        colors.push(particle.color.r, particle.color.g, particle.color.b);
      }
    }
    this.trailParticles = this.trailParticles.filter(p => !finishedTrails.includes(p));

    // Update geometry
    this.trailGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this.trailGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    this.trailGeometry.attributes.position.needsUpdate = true;
    this.trailGeometry.attributes.color.needsUpdate = true;
  }
}
