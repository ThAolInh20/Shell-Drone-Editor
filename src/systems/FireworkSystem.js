import * as THREE from 'three';
import { LAUNCH_ZONE_CONFIG } from '../config/launchZone.js';
import { ShellEntity } from '../entities/ShellEntity.js';
import { ShellPresetFactory } from '../factories/ShellPresetFactory.js';
import { BurstShapeGenerator } from '../factories/BurstShapeGenerator.js';
import { BurstEffectProcessor } from '../factories/BurstEffectProcessor.js';

const GRAVITY = -30;
const BASE_BURST_PARTICLES = 110;
const MIN_BURST_PARTICLES = 60;
const MAX_BURST_PARTICLES = 220;
const BURST_SPEED = 65;
const BURST_LIFE = 2.3;
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
  constructor(scene, trailSystem) {
    this.scene = scene;
    this.trailSystem = trailSystem;
    this.activeFireworks = [];
    this.shellPresetFactory = new ShellPresetFactory();
    this.launchZone = LAUNCH_ZONE_CONFIG;
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

  launchRandom(preset = null, options = {}) {
    const { ratioX, ratioY, ratioZ, sectorId, color, effectOverrides } = options;

    // Nếu preset được truyền vào là tên loại pháo (string), phân giải nó thành object preset
    let resolvedPreset = preset;
    if (typeof preset === 'string') {
      resolvedPreset = this.shellPresetFactory.createPresetByKey(preset);
    }

    // Áp dụng hiệu ứng ghi đè (overrides) trực tiếp từ file cấu hình sequence
    if (effectOverrides && typeof effectOverrides === 'object') {
      resolvedPreset = { ...resolvedPreset, ...effectOverrides };
    }

    const shellPreset = this.shellPresetFactory.validatePreset(resolvedPreset ?? this.shellPresetFactory.randomPreset());
    const shellId = ++this.shellSequence;
    const position = this.resolveLaunchPosition(ratioX, ratioZ, sectorId);
    const targetHeight = this.resolveBurstHeight(shellPreset, ratioY);

    // Tự động thu nhỏ kích thước pháo nếu nổ ở độ cao thấp (càng thấp càng bé)
    const normalizedHeight = THREE.MathUtils.clamp(
      (targetHeight - this.launchZone.minBurstY) / Math.max(this.launchZone.maxBurstY - this.launchZone.minBurstY, 1),
      0, 1
    );
    // Độ cao tối thiểu (0.0) -> size 60%, độ cao tối đa (1.0) -> size 100%
    const heightScale = THREE.MathUtils.lerp(0.6, 1.0, normalizedHeight);
    shellPreset.shellSize = (shellPreset.shellSize ?? 1) * heightScale;

    const velocity = this.resolveLaunchVelocity(targetHeight);

    const finalColorHex = color ? color : (shellPreset.color ? shellPreset.color : FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)]);
    const finalColor = new THREE.Color(finalColorHex);

    if (shellPreset.instantBurst) {
      const burstPos = new THREE.Vector3(position.x, targetHeight, position.z);
      const burst = this.createBurst(burstPos, finalColor, shellPreset.shapeType ?? 'willow', shellPreset);
      this.scene.add(burst.points);
      this.activeFireworks.push(burst);
      this.diagnostics.bursted += 1;

      for (const warning of shellPreset.__contract?.warnings ?? []) {
        this.registerWarning(`[Shell ${shellId}] ${warning}`);
      }

      this.emitDiagnostics();

      const normalizedEnergy = 0.35 + ((shellPreset.shellSize ?? 1 - 1) / 5) * 0.65;

      this.emitFireworkEvent('firework:burst', {
        shellId,
        shellType: shellPreset.shellType ?? shellPreset.shapeType,
        shapeType: shellPreset.shapeType,
        effectType: shellPreset.effectType,
        colorHex: finalColor.getHex(),
        position: { x: burstPos.x, y: burstPos.y, z: burstPos.z },
        intensity: normalizedEnergy,
        duration: 1.25 + normalizedEnergy * 1.1
      });
      return;
    }

    const shell = this.createShell(position, velocity, targetHeight, finalColor, shellPreset, shellId);
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
      colorHex: finalColor.getHex(),
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

  resolveLaunchPosition(ratioX, ratioZ, sectorId) {
    const rx = ratioX ?? Math.random();
    const rz = ratioZ ?? Math.random();

    let sector;
    if (sectorId && this.launchZone.sectors) {
      sector = this.launchZone.sectors.find(s => s.id === sectorId);
    }
    if (!sector && this.launchZone.sectors) {
      sector = this.launchZone.sectors[Math.floor(Math.random() * this.launchZone.sectors.length)];
    }

    const minAngle = sector ? sector.minAngle : Math.PI / 4;
    const maxAngle = sector ? sector.maxAngle : 3 * Math.PI / 4;

    // Left (maxAngle) to Right (minAngle) mapping: rx = 0 means left, rx = 1 means right
    const baseAngle = maxAngle - rx * (maxAngle - minAngle);
    this._lastLaunchAngle = baseAngle;

    // The starting position (launchZone.center) IS the center of the arc.
    const arcRadius = this.launchZone.arcRadius || 360;

    // Thickness of the arc (spread in depth)
    const thicknessOffset = (rz - 0.5) * this.launchZone.launchRadiusZ * 2;
    const finalRadius = arcRadius + thicknessOffset;

    // Position on the arc relative to the center
    const x = finalRadius * Math.cos(baseAngle);
    const z = -finalRadius * Math.sin(baseAngle); // negative Z because it curves into the screen

    return this.launchZone.center.clone().add(new THREE.Vector3(x, 0, z));
  }

  resolveBurstHeight(preset = null, ratioY) {
    if (ratioY !== undefined) {
      return THREE.MathUtils.lerp(this.launchZone.minBurstY, this.launchZone.maxBurstY, ratioY);
    }

    const presetSize = Math.max(1, Math.min(6, preset?.shellSize ?? 1));
    const sizeT = (presetSize - 1) / 5;
    const baseHeight = THREE.MathUtils.lerp(this.launchZone.minBurstY, this.launchZone.maxBurstY, 0.42 + sizeT * 0.32);
    const jitter = THREE.MathUtils.lerp(16, 28, sizeT);

    return THREE.MathUtils.clamp(baseHeight + (Math.random() - 0.5) * jitter, this.launchZone.minBurstY, this.launchZone.maxBurstY);
  }

  resolveLaunchVelocity(burstHeight) {
    const gravity = 30; // Trọng lực được định nghĩa là 30 trong update()
    const groundY = this.launchZone.center.y;
    const h = Math.max(burstHeight - groundY, 5);

    // Tính vận tốc v = sqrt(2gh). Nhân thêm 1.02 để pháo hoa khi đến điểm nổ vẫn còn một chút đà bay lên.
    const launchSpeedY = Math.sqrt(2 * gravity * h) * 1.02;

    const normalizedHeight = THREE.MathUtils.clamp(
      (burstHeight - this.launchZone.minBurstY) / Math.max(this.launchZone.maxBurstY - this.launchZone.minBurstY, 1),
      0,
      1
    );
    const lateralSpread = THREE.MathUtils.lerp(5, 9, 1 - normalizedHeight);

    // Fan out effect based on the arc position (shoot outwards from center)
    const angle = this._lastLaunchAngle || (Math.PI / 2);
    const fanSpeedX = Math.cos(angle) * 20;
    const fanSpeedZ = -Math.sin(angle) * 20;

    return new THREE.Vector3(
      fanSpeedX + (Math.random() - 0.5) * lateralSpread,
      launchSpeedY,
      fanSpeedZ + (Math.random() - 0.5) * lateralSpread
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


  resolveBurstParticleCount(shape, effectType, preset) {
    const shapeMultiplier = {
      sphere: 1,
      ring: 1.08,
      heart: 1.4,
      flower: 1.22,
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
    const sizeMultiplier = Math.max(0.6, Math.min(6, preset?.shellSize ?? 1)); // Phụ thuộc vào size (scale theo độ cao)
    const rawCount = BASE_BURST_PARTICLES * resolvedShapeMultiplier * resolvedEffectMultiplier * presetMultiplier * renderModeMultiplier * performanceScale * sizeMultiplier;

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
    const baseColors = new Float32Array(burstParticleCount * 3);
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
    const hasPistil = Boolean(preset?.pistil);
    const isCompositeCore = isJupiterComposite || hasPistil;

    let coreRatio = 0;
    if (isJupiterComposite) {
      coreRatio = Math.min(0.85, Math.max(0.15, preset?.ringCoreRatio ?? 0.42));
    } else if (hasPistil) {
      coreRatio = 0.7; // Dành 70% số hạt cho phần lõi (pistil)
    }

    const coreCount = isCompositeCore ? Math.max(8, Math.floor(burstParticleCount * coreRatio)) : 0;
    const ringCount = Math.max(1, burstParticleCount - coreCount);
    const ringPreset = isJupiterComposite ? { ...preset, shapeRenderMode: 'outline' } : preset;

    for (let i = 0; i < burstParticleCount; i++) {
      const isCoreParticle = isCompositeCore && i < coreCount;
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

      let baseSpeed;
      if (isCoreParticle) {
        baseSpeed = BURST_SPEED * coreSpeedBand;
      } else if (particleShape === 'ring' || particleShape === 'heart') {
        let speedVariance = 0.12; // Mặc định méo tự nhiên cho heart và ring v2
        if (preset?.shellType === 'ring') {
          speedVariance = 0.01; // Ring v1 cần tròn xoe hoàn hảo không méo
        }
        const outlineSpeedBand = 1.0 + (Math.random() - 0.5) * speedVariance;
        baseSpeed = BURST_SPEED * outlineSpeedBand;
      } else if (particleShape === 'sphere') {
        baseSpeed = BURST_SPEED * sphereSpeedBand;
      } else {
        baseSpeed = BURST_SPEED * defaultSpeedBand;
      }

      const shellSizeScale = Math.max(0.6, Math.min(6, preset?.shellSize ?? 1));
      const speed = baseSpeed * (useContourMagnitude ? 1.15 : 1) * shellSizeScale;
      velocities.push(direction.multiplyScalar(speed));

      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      const particleColor = isCoreParticle
        ? (preset?.pistilColor ? new THREE.Color(preset.pistilColor) : new THREE.Color(FIREWORK_COLORS[(Math.random() * FIREWORK_COLORS.length) | 0])).lerp(whiteColor, 0.08 + Math.random() * 0.12)
        : burstColor;
      colors[i * 3] = particleColor.r * brightnessIntensity;
      colors[i * 3 + 1] = particleColor.g * brightnessIntensity;
      colors[i * 3 + 2] = particleColor.b * brightnessIntensity;

      baseColors[i * 3] = colors[i * 3];
      baseColors[i * 3 + 1] = colors[i * 3 + 1];
      baseColors[i * 3 + 2] = colors[i * 3 + 2];

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
      baseColors,
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
      this.trailSystem.spawnTrailParticle(item.mesh.position.clone(), item.color);
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
    const colors = item.points.geometry.attributes.color.array;
    const baseColors = item.points.userData.baseColors;
    const lifeArray = item.points.userData.life;
    const effectType = item.points.userData.effectType;
    const heightProfile = item.points.userData.heightProfile ?? { brightnessMultiplier: 1 };

    if (item.points.userData.crackle && item.age >= item.maxLife * 0.65) {
      const particleCount = item.points.userData.particleCount ?? BASE_BURST_PARTICLES;

      if (!item.points.userData.crackleTriggeredList) {
        item.points.userData.crackleTriggeredList = new Uint8Array(particleCount);
        item.points.userData.nextCrackleTime = item.age; // Nổ cụm đầu tiên ngay
      }

      const isLastFrame = item.age >= item.maxLife - deltaTime * 2;

      if (item.age >= item.points.userData.nextCrackleTime || isLastFrame) {
        const remainingParticles = [];
        for (let i = 0; i < particleCount; i++) {
          if (item.points.userData.crackleTriggeredList[i] === 0) {
            remainingParticles.push(i);
          }
        }

        if (remainingParticles.length > 0) {
          // Nổ từng cụm khoảng 15-25% tổng số hạt mỗi lần, nếu là frame cuối thì nổ sạch phần còn lại
          const clusterSize = isLastFrame ? remainingParticles.length : Math.min(remainingParticles.length, Math.ceil(particleCount * (0.15 + Math.random() * 0.15)));
          let centerOrigin = null;

          for (let c = 0; c < clusterSize; c++) {
            const rIdx = Math.floor(Math.random() * remainingParticles.length);
            const i = remainingParticles.splice(rIdx, 1)[0];

            item.points.userData.crackleTriggeredList[i] = 1;

            if (Math.random() < 0.65) { // Burst 65% of particles to save FPS
              const origin = new THREE.Vector3(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
              const baseColor = baseColors ? new THREE.Color(baseColors[i * 3], baseColors[i * 3 + 1], baseColors[i * 3 + 2]) : null;
              this.trailSystem.spawnMicroCrackle(origin, baseColor);
              if (!centerOrigin) centerOrigin = origin;
            }

            // Ẩn hạt gốc đi sau khi nổ crackle
            colors[i * 3] = 0;
            colors[i * 3 + 1] = 0;
            colors[i * 3 + 2] = 0;
            if (baseColors) {
              baseColors[i * 3] = 0;
              baseColors[i * 3 + 1] = 0;
              baseColors[i * 3 + 2] = 0;
            }
          }

          if (centerOrigin) {
            this.emitFireworkEvent('firework:crackle', { position: { x: centerOrigin.x, y: centerOrigin.y, z: centerOrigin.z } });
          }

          // Cụm tiếp theo sẽ nổ sau 0.05s đến 0.15s
          item.points.userData.nextCrackleTime = item.age + 0.05 + Math.random() * 0.1;
        }
      }
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
    let needsColorUpdate = false;

    for (let i = 0; i < particleCount; i++) {
      const velocity = item.points.userData.velocities[i];
      const particlePosition = new THREE.Vector3(
        positions[i * 3],
        positions[i * 3 + 1],
        positions[i * 3 + 2]
      );

      const { gravityScale, emitSpark, spawnTrail, trailLife, trailIntensity } = BurstEffectProcessor.updateVelocity(
        velocity,
        i,
        deltaTime,
        item.age,
        item.maxLife,
        item.points.userData.effectState
      );

      if (emitSpark) {
        this.trailSystem.spawnEffectSpark(particlePosition, CRACKLE_SPARK_COLOR);
      }

      if (spawnTrail) { // Sinh hạt vệt sáng liên tục như đuôi comet
        if (Math.random() < 0.3) { // Giảm xuống 30% số frame để đuôi thanh mảnh và bớt chói hơn
          const trailColor = new THREE.Color(baseColors[i * 3], baseColors[i * 3 + 1], baseColors[i * 3 + 2]);
          trailColor.multiplyScalar(trailIntensity ?? 0.15); // Tùy chỉnh độ sáng màu để vệt giữ được màu thật của pháo
          this.trailSystem.spawnTrailParticle(particlePosition, trailColor, trailLife || 0.8); // Kéo dài thời gian tồn tại của đuôi hoặc dùng giá trị tùy chỉnh
        }
      }

      if (effectType === 'strobe' && baseColors) {
        const phase = item.points.userData.effectState.phase[i];
        const timeMs = (item.age + phase) * 1000;
        const strobeFreq = 150; // Chớp nhanh hơn để tạo cảm giác lung linh (150ms)
        const isBlinking = Math.floor(timeMs / strobeFreq) % 3 === 0; // on:off:off
        const blink = isBlinking ? 1.0 : 0.0; // Trắng tinh khi ON, tắt hoàn toàn (0) khi OFF

        // Chỉ ép màu trắng nếu đúng là pháo strobe nguyên bản, nếu là ringV2 thì giữ màu gốc
        if (item.points.userData.shellType === 'strobe') {
          colors[i * 3] = blink;
          colors[i * 3 + 1] = blink;
          colors[i * 3 + 2] = blink;
        } else {
          colors[i * 3] = baseColors[i * 3] * blink;
          colors[i * 3 + 1] = baseColors[i * 3 + 1] * blink;
          colors[i * 3 + 2] = baseColors[i * 3 + 2] * blink;
        }
        needsColorUpdate = true;
      } else if (effectType === 'white-strobe' && baseColors) {
        const phase = item.points.userData.effectState.phase[i];
        if (lifeRatio > 0.5) {
          const timeMs = (item.age + phase) * 1000;
          // Tần số giảm từ 450ms xuống 150ms (trước đó là 180ms xuống 50ms)
          const strobeFreq = Math.max(150, 450 - (lifeRatio - 0.5) * 600);
          const isBlinking = Math.floor(timeMs / strobeFreq) % 3 === 0;
          const blink = isBlinking ? 1.0 : 0.05;

          colors[i * 3] = blink;
          colors[i * 3 + 1] = blink;
          colors[i * 3 + 2] = blink;
        } else {
          colors[i * 3] = baseColors[i * 3];
          colors[i * 3 + 1] = baseColors[i * 3 + 1];
          colors[i * 3 + 2] = baseColors[i * 3 + 2];
        }
        needsColorUpdate = true;
      } else if ((effectType === 'glitter-strobe' || effectType === 'falling-comets-glitter') && baseColors) {
        const phase = item.points.userData.effectState.phase[i];
        const timeMs = (item.age + phase) * 1000;
        const strobeFreq = 90; // Nhịp rất nhanh để lấp lánh (90ms/tick)
        // Đen-Đen-Đen-Trắng -> 3 tick tắt, 1 tick bật -> modulo 4
        const isBlinking = Math.floor(timeMs / strobeFreq) % 4 === 0;
        const blink = isBlinking ? 1.5 : 0.0; // Trắng sáng chói rồi tắt hẳn về 0

        colors[i * 3] = blink;
        colors[i * 3 + 1] = blink;
        colors[i * 3 + 2] = blink;
        needsColorUpdate = true;
      }

      positions[i * 3] += velocity.x * deltaTime;
      positions[i * 3 + 1] += velocity.y * deltaTime;
      positions[i * 3 + 2] += velocity.z * deltaTime;

      velocity.y += GRAVITY * deltaTime * gravityScale;
      lifeArray[i] += deltaTime;
    }

    item.points.geometry.attributes.position.needsUpdate = true;
    if (needsColorUpdate) {
      item.points.geometry.attributes.color.needsUpdate = true;
    }

    if (item.age >= item.maxLife) {
      this.scene.remove(item.points);
      finished.push(item);
    }
  }

  clear() {
    for (const fw of this.activeFireworks) {
      if (fw.points) {
        this.scene.remove(fw.points);
        fw.points.geometry.dispose();
        fw.points.material.dispose();
      }
    }
    this.activeFireworks = [];
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

  }
}
