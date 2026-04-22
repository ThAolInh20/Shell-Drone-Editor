import * as THREE from 'three';
import { ShellEntity } from '../entities/ShellEntity.js';
import { ShellPresetFactory } from '../entities/ShellPresetFactory.js';
import { BurstShapeGenerator } from '../entities/BurstShapeGenerator.js';
import { BurstEffectProcessor } from '../entities/BurstEffectProcessor.js';

const GRAVITY = -30;
const BASE_BURST_PARTICLES = 110;
const MIN_BURST_PARTICLES = 60;
const MAX_BURST_PARTICLES = 220;
const BURST_SPEED = 50;
const BURST_LIFE = 3.5;
const BURST_DISSOLVE_START = 0.62;

const FIREWORK_COLORS = [
  0xffd700, // vàng (gold)
  0xff4500, // cam đỏ (orange red)
  0x00bfff, // xanh da trời (deep sky blue)
  0xff69b4, // hồng (hot pink)
  0x7fffd4, // xanh ngọc (aquamarine)
  0x8a2be2  // tím (blue violet)
];

const BURST_FADE_EXPONENT = 2.15;
const CRACKLE_CLOUD_SPEED = 24;
const BASE_BURST_POINT_SIZE = 26;

const DEFAULT_TRAIL_COLOR = new THREE.Color(0xffd700);
const CRACKLE_SPARK_COLOR = new THREE.Color(0xffd77a);

export class FireworkSystem {
  constructor(scene) {
    this.scene = scene;
    this.activeFireworks = [];
    this.trailParticles = [];
    this.shellPresetFactory = new ShellPresetFactory();
    this.launchZone = {
      center: new THREE.Vector3(0, -50, 0),
      launchRadiusX: 22,
      launchRadiusZ: 120,
      noEntryHalfWidth: 72,
      noEntryHalfDepth: 140,
      minBurstY: 200,
      maxBurstY: 480,
      minLaunchSpeedY: 136,
      maxLaunchSpeedY: 178,
      boundaryPadding: 12
    };
    this.launchPosition = this.launchZone.center.clone();
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
      minBurstY: this.launchZone.minBurstY,
      maxBurstY: this.launchZone.maxBurstY,

      sizeMin: 1.05,
      sizeMax: 1.95,

      brightnessMin: 0.9,
      brightnessMax: 1.45,
      sizeCurve: 0.9,
      brightnessCurve: 1.15
    };

    // Trail particles geometry
    this.trailGeometry = new THREE.BufferGeometry();
    this.trailMaterial = new THREE.PointsMaterial({
      size: 12,
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      opacity: 0.84,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.trailMaterial.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>
        
        vec2 coord = gl_PointCoord - vec2(0.5);
        float dist = length(coord) * 2.0;
        if (dist > 1.0) discard;
        
        vec4 stop0 = vec4(1.0, 1.0, 1.0, 1.0);
        vec4 stop1 = vec4(diffuseColor.rgb, 0.3);
        vec4 stop2 = vec4(diffuseColor.rgb, 0.13);
        vec4 stop3 = vec4(diffuseColor.rgb, 0.0);
        
        vec4 gradientColor;
        if (dist < 0.024) {
            gradientColor = stop0;
        } else if (dist < 0.125) {
            float t = (dist - 0.024) / (0.125 - 0.024);
            gradientColor = mix(stop0, stop1, t);
        } else if (dist < 0.32) {
            float t = (dist - 0.125) / (0.32 - 0.125);
            gradientColor = mix(stop1, stop2, t);
        } else {
            float t = (dist - 0.32) / (1.0 - 0.32);
            gradientColor = mix(stop2, stop3, t);
        }
        
        diffuseColor = vec4(gradientColor.rgb, gradientColor.a * diffuseColor.a);
        `
      );
    };
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
    const position = this.resolveLaunchPosition();
    const targetHeight = this.resolveBurstHeight(shellPreset);
    const velocity = this.resolveLaunchVelocity(targetHeight);
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
      effectType: shellPreset.effectType ?? 'standard',
      colorHex: color.getHex(),
      position: {
        x: position.x,
        y: position.y,
        z: position.z
      },
      intensity: 0.2 + ((shellPreset.shellSize ?? 1) / 6) * 0.45
    });
  }

  getLaunchZone() {
    return {
      center: this.launchZone.center.clone(),
      launchRadiusX: this.launchZone.launchRadiusX,
      launchRadiusZ: this.launchZone.launchRadiusZ,
      noEntryHalfWidth: this.launchZone.noEntryHalfWidth,
      noEntryHalfDepth: this.launchZone.noEntryHalfDepth,
      boundaryPadding: this.launchZone.boundaryPadding,
      minBurstY: this.launchZone.minBurstY,
      maxBurstY: this.launchZone.maxBurstY
    };
  }

  resolveLaunchPosition() {
    const offsetX = (Math.random() - 0.5) * this.launchZone.launchRadiusX * 2;
    const offsetZ = (Math.random() - 0.5) * this.launchZone.launchRadiusZ * 2;

    return this.launchZone.center.clone().add(new THREE.Vector3(offsetX, 0, offsetZ));
  }

  resolveBurstHeight(preset = null) {
    const presetSize = Math.max(1, Math.min(6, preset?.shellSize ?? 1));
    const sizeT = (presetSize - 1) / 5;
    const baseHeight = THREE.MathUtils.lerp(this.launchZone.minBurstY, this.launchZone.maxBurstY, 0.42 + sizeT * 0.32);
    const jitter = THREE.MathUtils.lerp(16, 28, sizeT);

    return THREE.MathUtils.clamp(baseHeight + (Math.random() - 0.5) * jitter, this.launchZone.minBurstY, this.launchZone.maxBurstY);
  }

  resolveLaunchVelocity(burstHeight) {
    const normalizedHeight = THREE.MathUtils.clamp(
      (burstHeight - this.launchZone.minBurstY) / Math.max(this.launchZone.maxBurstY - this.launchZone.minBurstY, 1),
      0,
      1
    );
    const launchSpeedY = THREE.MathUtils.lerp(this.launchZone.minLaunchSpeedY, this.launchZone.maxLaunchSpeedY, normalizedHeight);
    const lateralSpread = THREE.MathUtils.lerp(5, 9, 1 - normalizedHeight);

    return new THREE.Vector3(
      (Math.random() - 0.5) * lateralSpread,
      launchSpeedY,
      (Math.random() - 0.5) * lateralSpread
    );
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

  spawnCrackleCloud(position, particleCount = BASE_BURST_PARTICLES) {
    const crackleCount = particleCount >= 120 ? 36 : (particleCount >= 80 ? 24 : 16);

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

  resolveBurstParticleCount(shape, effectType, preset) {
    const shapeMultiplier = {
      sphere: 1,
      ring: 1.08,
      heart: 1.4,
      flower: 1.22,
      crossette: 1.45,
      cat: 1.2,
      fish: 1.14,
      smiley: 1.2,
      oval: 1.12,
      willow: 1.18,
      lightning: 1.16,
      star: 1.14
    };

    const effectMultiplier = {
      standard: 1,
      crackle: 1.15,
      crossette: 1.1,
      'crossette-v2': 1.2,
      floral: 1.18,
      'falling-leaves': 1.04,
      heart: 1.22,
      strobe: 1.08,
      wave: 1.1,
      flow: 1.08,
      snow: 1.08,
      oval: 1.08,
      flower: 1.12
    };

    const presetMultiplier = Math.max(0.7, Math.min(2.2, preset?.particleCountMultiplier ?? 1));
    const renderModeMultiplier = (preset?.shapeRenderMode === 'outline' || preset?.shapeRenderMode === 'jupiter') ? 1.12 : 1;
    const activeBurstCount = this.activeFireworks.reduce((count, item) => count + (item.type === 'burst' ? 1 : 0), 0);

    let performanceScale = 1;
    if (activeBurstCount > 12) {
      performanceScale = 0.72;
    } else if (activeBurstCount > 8) {
      performanceScale = 0.86;
    }

    const resolvedShapeMultiplier = shapeMultiplier[shape] ?? 1;
    const resolvedEffectMultiplier = effectMultiplier[effectType] ?? 1;
    const rawCount = BASE_BURST_PARTICLES * resolvedShapeMultiplier * resolvedEffectMultiplier * presetMultiplier * renderModeMultiplier * performanceScale;

    return Math.max(MIN_BURST_PARTICLES, Math.min(MAX_BURST_PARTICLES, Math.round(rawCount)));
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

    const burstParticleCount = this.resolveBurstParticleCount(resolvedShape, normalizedEffect, preset);
    const positions = new Float32Array(burstParticleCount * 3);
    const colors = new Float32Array(burstParticleCount * 3);
    const velocities = [];
    const life = new Float32Array(burstParticleCount);
    const burstRotation = this.createRandomBurstRotation();
    const heightProfile = this.heightScalingConfig.enabled
      ? BurstEffectProcessor.createHeightProfile(position.y, this.heightScalingConfig)
      : { normalized: 0, sizeMultiplier: 1, brightnessMultiplier: 1 };
    const brightnessBlend = Math.min(Math.max((heightProfile.brightnessMultiplier - 1) / 1.2, 0), 0.75);
    const brightnessIntensity = Math.min(Math.max(heightProfile.brightnessMultiplier, 1), 1.3);
    const burstColor = color.clone().lerp(new THREE.Color(0xffffff), brightnessBlend);
    const whiteColor = new THREE.Color(0xffffff);

    const isJupiterComposite = resolvedShape === 'ring' && preset?.shapeRenderMode === 'jupiter';
    const coreRatio = Math.min(0.85, Math.max(0.15, preset?.ringCoreRatio ?? 0.42));
    const coreCount = isJupiterComposite ? Math.max(8, Math.floor(burstParticleCount * coreRatio)) : 0;
    const ringCount = Math.max(1, burstParticleCount - coreCount);
    const ringPreset = isJupiterComposite ? { ...preset, shapeRenderMode: 'outline' } : preset;

    for (let i = 0; i < burstParticleCount; i++) {
      const isCoreParticle = isJupiterComposite && i < coreCount;
      const particleShape = isCoreParticle ? 'sphere' : resolvedShape;
      const particleIndex = isCoreParticle ? i : (i - coreCount);
      const particleCount = isCoreParticle ? coreCount : ringCount;
      const angle = (particleIndex / particleCount) * Math.PI * 2;
      const direction = BurstShapeGenerator.direction(
        particleShape,
        angle,
        particleIndex,
        particleCount,
        isCoreParticle ? preset : ringPreset
      ).applyQuaternion(burstRotation);

      const useContourMagnitude = !isCoreParticle && ringPreset?.shapeRenderMode === 'outline' && (particleShape === 'ring' || particleShape === 'heart');
      if (!useContourMagnitude) {
        direction.normalize();
      }

      const sphereSpeedBand = 0.9 + Math.random() * 0.2;
      const defaultSpeedBand = 0.5 + Math.random() * 0.8;
      const coreSpeedBand = 0.34 + Math.random() * 0.18;
      const baseSpeed = isCoreParticle
        ? BURST_SPEED * coreSpeedBand
        : BURST_SPEED * (particleShape === 'sphere' ? sphereSpeedBand : defaultSpeedBand);
      const speed = baseSpeed * (useContourMagnitude ? 1.15 : 1);
      velocities.push(direction.multiplyScalar(speed));

      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      const particleColor = isCoreParticle
        ? new THREE.Color(FIREWORK_COLORS[(Math.random() * FIREWORK_COLORS.length) | 0]).lerp(whiteColor, 0.08 + Math.random() * 0.12)
        : burstColor;
      colors[i * 3] = particleColor.r * brightnessIntensity;
      colors[i * 3 + 1] = particleColor.g * brightnessIntensity;
      colors[i * 3 + 2] = particleColor.b * brightnessIntensity;
      life[i] = 0;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({
      size: BASE_BURST_POINT_SIZE * heightProfile.sizeMultiplier,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>
        
        vec2 coord = gl_PointCoord - vec2(0.5);
        float dist = length(coord) * 2.0;
        if (dist > 1.0) discard;
        
        vec4 stop0 = vec4(1.0, 1.0, 1.0, 1.0);
        vec4 stop1 = vec4(diffuseColor.rgb, 0.34);
        vec4 stop2 = vec4(diffuseColor.rgb, 0.16);
        vec4 stop3 = vec4(diffuseColor.rgb, 0.0);
        
        vec4 gradientColor;
        if (dist < 0.024) {
            gradientColor = stop0;
        } else if (dist < 0.125) {
            float t = (dist - 0.024) / (0.125 - 0.024);
            gradientColor = mix(stop0, stop1, t);
        } else if (dist < 0.32) {
            float t = (dist - 0.125) / (0.32 - 0.125);
            gradientColor = mix(stop1, stop2, t);
        } else {
            float t = (dist - 0.32) / (1.0 - 0.32);
            gradientColor = mix(stop2, stop3, t);
        }
        
        diffuseColor = vec4(gradientColor.rgb, gradientColor.a * diffuseColor.a);
        `
      );
    };
    const points = new THREE.Points(geometry, material);
    points.userData = {
      velocities,
      life,
      effectType: normalizedEffect,
      crackle: crackleEnabled || normalizedEffect === 'crackle',
      crackleCloudTriggered: false,
      particleCount: burstParticleCount,
      heightProfile,
      preset,
      effectState: BurstEffectProcessor.initialize(normalizedEffect, burstParticleCount)
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
    const burstPosition = item.mesh.position.clone();
    const shellSize = Math.max(1, Math.min(6, item.preset?.shellSize ?? 1));
    const normalizedEnergy = 0.35 + ((shellSize - 1) / 5) * 0.65;
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
      effectType: item.preset?.effectType ?? item.shape,
      colorHex: item.color.getHex(),
      position: {
        x: burstPosition.x,
        y: burstPosition.y,
        z: burstPosition.z
      },
      intensity: normalizedEnergy,

      duration: 1.25 + normalizedEnergy * 1.1

    });
  }

  handleBurstUpdate(item, deltaTime, finished) {
    item.age += deltaTime;
    const positions = item.points.geometry.attributes.position.array;
    const lifeArray = item.points.userData.life;
    const effectType = item.points.userData.effectType;
    const heightProfile = item.points.userData.heightProfile ?? { brightnessMultiplier: 1 };

    if (item.points.userData.crackle && !item.points.userData.crackleCloudTriggered && item.age >= item.maxLife * 0.42) {
      const cloudOrigin = new THREE.Vector3(positions[0], positions[1], positions[2]);
      this.spawnCrackleCloud(cloudOrigin, item.points.userData.particleCount);
      item.points.userData.crackleCloudTriggered = true;
      this.emitFireworkEvent('firework:crackle', { position: { x: cloudOrigin.x, y: cloudOrigin.y, z: cloudOrigin.z } });
    }

    const brightnessOpacityScale = Math.min(Math.max(0.82 + (heightProfile.brightnessMultiplier - 1) * 0.24, 0.72), 1.15);
    const lifeRatio = item.maxLife > 0 ? item.age / item.maxLife : 1;
    let baseOpacity = brightnessOpacityScale;

    if (lifeRatio > BURST_DISSOLVE_START) {
      const dissolveT = THREE.MathUtils.clamp((lifeRatio - BURST_DISSOLVE_START) / (1 - BURST_DISSOLVE_START), 0, 1);
      baseOpacity = Math.max(
        Math.pow(1 - dissolveT, BURST_FADE_EXPONENT) * brightnessOpacityScale,
        (1 - dissolveT) * 0.08
      );
    }

    item.points.material.opacity = BurstEffectProcessor.materialOpacity(effectType, item.age, item.maxLife, baseOpacity);

    const particleCount = item.points.userData.particleCount ?? BASE_BURST_PARTICLES;

    for (let i = 0; i < particleCount; i++) {
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
