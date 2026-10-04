import * as THREE from 'three';
import { LAUNCH_ZONE_CONFIG } from '../config/launchZone.js';
import { ShellEntity } from '../entities/ShellEntity.js';
import { ShellPresetFactory } from '../factories/ShellPresetFactory.js';
import { BurstShapeGenerator } from '../factories/BurstShapeGenerator.js';
import { BurstEffectProcessor } from '../factories/BurstEffectProcessor.js';
import { globalEventBus } from '../core/EventBus.js';
import { InstancedShellRenderer } from '../render/InstancedShellRenderer.js';
import { FIREWORK_CONFIG } from '../config/fireworks.js';
import { LAYER_REFLECTION } from '../config/layers.js';

const GRAVITY = FIREWORK_CONFIG.GRAVITY;
const BASE_BURST_PARTICLES = FIREWORK_CONFIG.BURST.baseParticles;
const MIN_BURST_PARTICLES = FIREWORK_CONFIG.BURST.minParticles;
const MAX_BURST_PARTICLES = FIREWORK_CONFIG.BURST.maxParticles;
const BURST_SPEED = FIREWORK_CONFIG.BURST.baseSpeed;
const BURST_LIFE = FIREWORK_CONFIG.BURST.baseLife;
const BURST_DISSOLVE_START = FIREWORK_CONFIG.BURST.dissolveStart;

const FIREWORK_COLORS = FIREWORK_CONFIG.SYSTEM.colors;

const BURST_FADE_EXPONENT = FIREWORK_CONFIG.SYSTEM.burstFadeExponent;
const CRACKLE_CLOUD_SPEED = FIREWORK_CONFIG.SYSTEM.crackleCloudSpeed;
const BASE_BURST_POINT_SIZE = FIREWORK_CONFIG.SYSTEM.baseBurstPointSize;

const DEFAULT_TRAIL_COLOR = FIREWORK_CONFIG.SYSTEM.defaultTrailColor;
const CRACKLE_SPARK_COLOR = FIREWORK_CONFIG.SYSTEM.crackleSparkColor;

export class FireworkSystem {
  constructor(scene, trailSystem, smokeSystem = null, shellPresetFactory = null) {
    this.scene = scene;
    this.trailSystem = trailSystem;
    this.smokeSystem = smokeSystem;
    this.activeFireworks = [];
    this.shellPresetFactory = shellPresetFactory || new ShellPresetFactory();
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
    this.instancedShellRenderer = new InstancedShellRenderer(scene);

    // Global Burst Particle System (Option 2)
    this.allocatedMaxBurstParticles = 10000; // Pre-allocate for High quality limit
    this.maxBurstParticles = 6000;
    this.graphicsQualityMultiplier = 1.0;
    this.burstParticles = [];

    this.burstPositionsArray = new Float32Array(this.allocatedMaxBurstParticles * 3);
    this.burstColorsArray = new Float32Array(this.allocatedMaxBurstParticles * 3);
    this.burstSizesArray = new Float32Array(this.allocatedMaxBurstParticles);
    this.burstOpacitiesArray = new Float32Array(this.allocatedMaxBurstParticles);

    this.globalBurstGeometry = new THREE.BufferGeometry();
    this.globalBurstGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(
        this.burstPositionsArray,
        3
      )
    );
    this.globalBurstGeometry.setAttribute(
      'color',
      new THREE.BufferAttribute(
        this.burstColorsArray,
        3
      )
    );
    this.globalBurstGeometry.setAttribute(
      'aSize',
      new THREE.BufferAttribute(
        this.burstSizesArray,
        1
      )
    );
    this.globalBurstGeometry.setAttribute(
      'aOpacity',
      new THREE.BufferAttribute(
        this.burstOpacitiesArray,
        1
      )
    );

    this.globalBurstMaterial = new THREE.PointsMaterial({
      vertexColors: true,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.globalBurstMaterial.onBeforeCompile = (shader) => {
      // Add custom attribute floats for particle-specific sizes and opacities
      shader.vertexShader = `
        attribute float aSize;
        attribute float aOpacity;
        varying float vOpacity;
      ` + shader.vertexShader.replace(
        '#include <common>',
        `
        #include <common>
        `
      ).replace(
        'gl_PointSize = size;',
        `
        gl_PointSize = aSize;
        vOpacity = aOpacity;
        `
      );

      // Patch the fragment shader to apply the custom opacity and gradient
      shader.fragmentShader = `
        varying float vOpacity;
      ` + shader.fragmentShader.replace(
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
        
        diffuseColor = vec4(gradientColor.rgb, gradientColor.a * diffuseColor.a * vOpacity);
        `
      );
    };

    this.globalBurstPoints = new THREE.Points(
      this.globalBurstGeometry,
      this.globalBurstMaterial
    );
    this.globalBurstPoints.frustumCulled = false;
    this.globalBurstPoints.layers.enable(LAYER_REFLECTION);
    this.scene.add(this.globalBurstPoints);

    this.scheduledBursts = [];

    this.setGraphicsQuality(localStorage.getItem('graphics_quality') || 'medium');
    globalEventBus.on('graphics:quality', (quality) => {
      this.setGraphicsQuality(quality);
    });
  }

  setGraphicsQuality(quality) {
    this.graphicsQuality = quality;
    const baseMax = FIREWORK_CONFIG.SYSTEM.maxBurstParticles;
    if (quality === 'low') {
      this.graphicsQualityMultiplier = 0.5;
      this.maxBurstParticles = Math.round(baseMax * 0.5);
    } else if (quality === 'medium') {
      this.graphicsQualityMultiplier = 1.0;
      this.maxBurstParticles = baseMax;
    } else if (quality === 'high') {
      this.graphicsQualityMultiplier = 1.5;
      this.maxBurstParticles = Math.round(baseMax * 1.6667);
    }
  }

  emitFireworkEvent(type, detail) {
    globalEventBus.emit(type, detail);
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
    const {
      ratioX,
      ratioY,
      ratioZ,
      sectorId,
      color,
      angleOffset = 0,
      effectOverrides
    } = options;

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

    const velocity = this.resolveLaunchVelocity(
      targetHeight,
      angleOffset
    );

    const finalColorHex = color ? color : (shellPreset.color ? shellPreset.color : FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)]);
    const finalColor = new THREE.Color(finalColorHex);

    const hasNoBurst = (Array.isArray(shellPreset.effects) && shellPreset.effects.includes('no-burst'))
      || Boolean(shellPreset['no-burst']);
    const isInstant = Boolean(shellPreset.instantBurst) || hasNoBurst;

    const launchDir = velocity && velocity.lengthSq() > 0.001
      ? velocity.clone().normalize()
      : new THREE.Vector3(0, 1, 0);

    if (isInstant) {
      this.emitFireworkEvent(
        'firework:launch',
        {
          shellId,
          shellType: shellPreset.shellType ?? shellPreset.shapeType,
          shapeType: shellPreset.shapeType,
          effectType: shellPreset.effectType ?? 'standard',
          colorHex: finalColor.getHex(),
          position: {
            x: position.x,
            y: position.y,
            z: position.z
          },
          velocity: {
            x: velocity.x,
            y: velocity.y,
            z: velocity.z
          },
          direction: {
            x: launchDir.x,
            y: launchDir.y,
            z: launchDir.z
          },
          intensity: 0.2 + ((shellPreset.shellSize ?? 1) / 6) * 0.45
        }
      );

      const burstPos = new THREE.Vector3(
        position.x,
        targetHeight,
        position.z
      );
      const isBouquet = this.isBouquetShell(shellPreset);

      if (isBouquet) {
        const burstDir = velocity && velocity.lengthSq() > 0.001
          ? velocity.clone().normalize()
          : new THREE.Vector3(0, 1, 0);
        this.triggerBouquetBurst(
          burstPos,
          finalColor,
          shellPreset,
          shellId,
          burstDir,
          velocity
        );
      } else {
        this.createBurst(
          burstPos,
          finalColor,
          shellPreset.shapeType ?? 'willow',
          shellPreset,
          shellId
        );
      }
      this.diagnostics.bursted += 1;

      for (const warning of shellPreset.__contract?.warnings ?? []) {
        this.registerWarning(`[Shell ${shellId}] ${warning}`);
      }

      this.emitDiagnostics();

      const shellSizeVal = shellPreset.shellSize ?? 1;
      const normalizedEnergy = 0.35 + ((shellSizeVal - 1) / 5) * 0.65;

      this.emitFireworkEvent(
        'firework:burst',
        {
          shellId,
          shellType: shellPreset.shellType ?? shellPreset.shapeType,
          shapeType: shellPreset.shapeType,
          effectType: shellPreset.effectType,
          effects: shellPreset.effects,
          noBurstSound: hasNoBurst || Boolean(shellPreset.noBurstSound),
          colorHex: finalColor.getHex(),
          position: {
            x: burstPos.x,
            y: burstPos.y,
            z: burstPos.z
          },
          intensity: normalizedEnergy,
          duration: 1.25 + normalizedEnergy * 1.1
        }
      );
      return;
    }

    const shell = this.createShell(
      position,
      velocity,
      targetHeight,
      finalColor,
      shellPreset,
      shellId
    );
    this.activeFireworks.push(shell);
    this.diagnostics.launched += 1;

    for (const warning of shellPreset.__contract?.warnings ?? []) {
      this.registerWarning(`[Shell ${shellId}] ${warning}`);
    }

    this.emitDiagnostics();

    this.emitFireworkEvent(
      'firework:launch',
      {
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
        velocity: {
          x: velocity.x,
          y: velocity.y,
          z: velocity.z
        },
        direction: {
          x: launchDir.x,
          y: launchDir.y,
          z: launchDir.z
        },
        intensity: 0.2 + ((shellPreset.shellSize ?? 1) / 6) * 0.45
      }
    );
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

  resolveLaunchVelocity(burstHeight, angleOffset = 0) {
    const gravity = Math.abs(FIREWORK_CONFIG.GRAVITY); // Trọng lực được định nghĩa là 30 trong update()
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
    const baseAngle = this._lastLaunchAngle || (Math.PI / 2);
    const forwardSpeed = 20;

    // Vận tốc tạt nghiêng theo angleOffset (tính bằng tan(angleOffset))
    const tiltLateral = launchSpeedY * Math.tan(angleOffset);

    const vx = forwardSpeed * Math.cos(baseAngle) +
      tiltLateral * Math.sin(baseAngle) +
      (Math.random() - 0.5) * lateralSpread;
    const vy = launchSpeedY;
    const vz = -forwardSpeed * Math.sin(baseAngle) +
      tiltLateral * Math.cos(baseAngle) +
      (Math.random() - 0.5) * lateralSpread;

    return new THREE.Vector3(
      vx,
      vy,
      vz
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
    const shellShape = preset?.shapeType ?? preset?.shape ?? this.pickFireworkShape();
    return new ShellEntity({
      shellId,
      position,
      velocity,
      burstHeight,
      color,
      shape: shellShape,
      shellType: preset?.shellType ?? preset?.preset ?? shellShape,
      shapeType: preset?.shapeType ?? preset?.shape ?? shellShape,
      preset
    });
  }

  isBouquetShell(preset) {
    if (!preset) return false;

    const type = (preset.shellType || preset.type || preset.preset || '').toLowerCase();
    if (
      type === 'weepingwillowarch'
      || preset.shapeType === 'willow-arch'
    ) {
      return true;
    }

    // If shapeType or dynamicsType is explicitly set away from bouquet, respect composition authority
    if (
      preset.shapeType
      && preset.shapeType !== 'upward-spray'
      && preset.dynamicsType
      && preset.dynamicsType !== 'bouquet-comet'
    ) {
      return false;
    }

    return (
      preset.dynamicsType === 'bouquet-comet'
      || preset.dynamics === 'bouquet-comet'
      || preset.shapeType === 'upward-spray'
      || type === 'bouquet'
      || type === 'bouquetcomet'
      || type === 'bouquetcometsphere'
      || type === 'bouquetv2'
      || type === 'bouquetv2multicolor'
    );
  }

  triggerBouquetBurst(
    burstPosition,
    color,
    preset,
    shellId,
    burstDirection = null,
    parentVelocity = null
  ) {
    const shellType = (preset?.shellType || preset?.type || preset?.preset || '').toLowerCase();

    // Xác định hướng nổ từ hướng bay của pháo mẹ
    const defaultUp = new THREE.Vector3(0, 1, 0);
    const effectiveDir = new THREE.Vector3(0, 1, 0);
    let hasDirection = false;

    if (burstDirection && burstDirection.lengthSq() > 0.001) {
      effectiveDir.copy(burstDirection);
      const horizSq = effectiveDir.x * effectiveDir.x + effectiveDir.z * effectiveDir.z;
      // Nếu pháo bay gần như thẳng đứng và đã qua đỉnh rơi xuống, giữ hướng nổ hướng lên trời
      if (horizSq < 0.04 && effectiveDir.y <= 0) {
        effectiveDir.set(0, 1, 0);
      } else if (effectiveDir.y < -0.25) {
        // Tránh để chùm comet chĩa thẳng xuống đất
        effectiveDir.y = -0.25;
        effectiveDir.normalize();
      }
      hasDirection = true;
    }

    const orientQuat = new THREE.Quaternion();
    if (hasDirection) {
      orientQuat.setFromUnitVectors(defaultUp, effectiveDir);
    }

    if (
      shellType === 'weepingwillowarch'
      || preset?.shapeType === 'willow-arch'
    ) {
      const clusterCount = 6 + Math.floor(Math.random() * 4); // 6 to 9 distinct arching comet stars
      const horizLen = Math.hypot(effectiveDir.x, effectiveDir.z);
      const burstAzimuth = (hasDirection && horizLen > 0.15)
        ? Math.atan2(effectiveDir.x, effectiveDir.z)
        : Math.random() * Math.PI * 2;

      for (let i = 0; i < clusterCount; i++) {
        const subColor = color.clone();
        const t = i / Math.max(1, clusterCount - 1);

        // Forward reach & height: tight compact arch with small horizontal spread and slow graceful downward cascade
        const fwdSpeed = 4.0 + t * 7.5 + (Math.random() - 0.5) * 1.0;
        const upSpeed = 8.0 + t * 11.0 + (Math.random() - 0.5) * 1.0;
        const sideSpeed = (Math.random() - 0.5) * 1.2;

        const vx = Math.sin(burstAzimuth) * fwdSpeed + Math.cos(burstAzimuth) * sideSpeed;
        const vz = Math.cos(burstAzimuth) * fwdSpeed - Math.sin(burstAzimuth) * sideSpeed;
        const vy = upSpeed;

        const velocity = new THREE.Vector3(
          vx,
          vy,
          vz
        );

        if (parentVelocity) {
          velocity.addScaledVector(parentVelocity, 0.12);
        }

        const targetHeight = burstPosition.y + 1000;
        const subPreset = this.shellPresetFactory.basePreset(0.65);
        subPreset.isBouquetComet = true;
        subPreset.thickTrail = true;
        subPreset.noBurst = true;
        subPreset.gravityScale = 0.52; // Reduced gravity to fall slowly and float gently
        subPreset.starLife = 4000 + Math.random() * 800; // 4.0s - 4.8s extended lifespan for slow graceful cascade
        subPreset.trailLifeMultiplier = 1.05;
        subPreset.trailChance = 1.0;
        subPreset.color = color.getHex();

        const parentEffects = Array.isArray(preset?.effects) ? preset.effects : [];
        const isStrobe = Boolean(preset?.strobe)
          || parentEffects.includes('strobe')
          || parentEffects.includes('white-strobe')
          || parentEffects.includes('glitter-strobe')
          || preset?.effectType === 'glitter-strobe'
          || preset?.effectType === 'falling-comets-glitter';

        subPreset.strobe = isStrobe;
        if (isStrobe) {
          subPreset.effects = ['strobe'];
          subPreset.effectType = 'falling-comets-glitter';
        }

        const subShell = this.createShell(
          burstPosition.clone(),
          velocity,
          targetHeight,
          subColor,
          subPreset,
          shellId + '-arch-' + i
        );

        this.activeFireworks.push(subShell);
        this.diagnostics.launched += 1;
      }
      return;
    }

    if (
      shellType === 'bouquet'
      || shellType === 'bouquetcomet'
      || shellType === 'bouquetcometsphere'
    ) {
      let clusterCount;
      if (shellType === 'bouquetcometsphere') {
        const cfg = FIREWORK_CONFIG.BOUQUET.cometSphere;
        clusterCount = cfg.clusterCountMin + Math.floor(
          Math.random() * (
            cfg.clusterCountMax - cfg.clusterCountMin + 1
          )
        );
      } else {
        const cfg = FIREWORK_CONFIG.BOUQUET.default;
        clusterCount = cfg.clusterCountMin + Math.floor(
          Math.random() * (
            cfg.clusterCountMax - cfg.clusterCountMin + 1
          )
        );
      }

      for (let i = 0; i < clusterCount; i++) {
        const colorHex = (
          shellType === 'bouquetcomet'
          || shellType === 'bouquetcometsphere'
        )
          ? color.getHex()
          : FIREWORK_COLORS[
          Math.floor(
            Math.random() * FIREWORK_COLORS.length
          )
          ];
        const subColor = new THREE.Color(colorHex);

        let vx, vy, vz;

        if (shellType === 'bouquetcometsphere') {
          // Use Fibonacci sphere for a perfectly even and clear spherical shell
          const t = (i + 0.5) / clusterCount;
          const phi = Math.acos(1 - 2 * t);
          const theta = Math.PI * (1 + Math.sqrt(5)) * i;

          // Use a mostly uniform speed with very slight jitter to maintain the spherical shape
          const speed = 55 + Math.random() * 5;

          vx = Math.cos(theta) * Math.sin(phi) * speed;
          vy = Math.cos(phi) * speed;
          vz = Math.sin(theta) * Math.sin(phi) * speed;
        } else if (hasDirection) {
          // Chùm nón định hướng theo vector bay của pháo mẹ
          const speed = 35 + Math.random() * 45;
          const angleCone = 0.05 + Math.random() * 0.65;
          const angleAzimuth = Math.random() * Math.PI * 2;

          const localDir = new THREE.Vector3(
            Math.sin(angleCone) * Math.cos(angleAzimuth),
            Math.cos(angleCone),
            Math.sin(angleCone) * Math.sin(angleAzimuth)
          );
          localDir.applyQuaternion(orientQuat);

          vx = localDir.x * speed;
          vy = localDir.y * speed;
          vz = localDir.z * speed;
        } else {
          // Upward spray with higher height variance
          const speed = 25 + Math.random() * 50;
          const angleY = Math.random() * Math.PI / 2.2;
          const angleXZ = Math.random() * Math.PI * 2;

          vx = Math.sin(angleY) * Math.cos(angleXZ) * speed;
          vz = Math.sin(angleY) * Math.sin(angleXZ) * speed;
          vy = (Math.cos(angleY) * speed + 30) * (0.75 + Math.random() * 0.5);
        }

        const velocity = new THREE.Vector3(
          vx,
          vy,
          vz
        );

        // Kế thừa quán tính vận tốc từ pháo mẹ
        if (parentVelocity) {
          const momentumScale = shellType === 'bouquetcometsphere' ? 0.25 : 0.35;
          velocity.addScaledVector(parentVelocity, momentumScale);
        }

        const targetHeight = burstPosition.y + 1000; // rely on peak height (velocity.y <= 0) to burst

        let subPreset;
        if (
          shellType === 'bouquetcomet'
          || shellType === 'bouquetcometsphere'
        ) {
          subPreset = this.shellPresetFactory.basePreset(0.5);
          subPreset.noBurst = true;
          subPreset.shellType = 'floral-child';
          subPreset.isBouquetComet = true;
          subPreset.thickTrail = true;
          const baseStarLife = shellType === 'bouquetcometsphere'
            ? FIREWORK_CONFIG.BOUQUET.cometSphere.starLife
            : FIREWORK_CONFIG.BOUQUET.default.starLife;
          subPreset.starLife = baseStarLife * (0.8 + Math.random() * 0.4);
          subPreset.trailChance = 1.0;
        } else {
          subPreset = this.shellPresetFactory.glitterStrobeShell(0.45); // smaller sparkling spheres
          subPreset.color = colorHex;
          subPreset.shellType = 'floral-child';
          subPreset.particleCountMultiplier = 0.5; // save FPS
          if (subPreset.starLife) {
            subPreset.starLife = subPreset.starLife * (0.75 + Math.random() * 0.5);
          }
          subPreset.trailChance = FIREWORK_CONFIG.BOUQUET.default.trailChance;
        }

        const subShell = this.createShell(
          burstPosition.clone(),
          velocity,
          targetHeight,
          subColor,
          subPreset,
          shellId + '-c' + i
        );

        this.activeFireworks.push(subShell);
        this.diagnostics.launched += 1;
      }
    } else if (
      shellType === 'bouquetv2'
      || shellType === 'bouquetv2multicolor'
    ) {
      const cfg = FIREWORK_CONFIG.BOUQUET.v2;
      const clusterCount = cfg.clusterCountMin + Math.floor(
        Math.random() * (
          cfg.clusterCountMax - cfg.clusterCountMin + 1
        )
      );
      const colorMode = preset?.colorMode ?? 'parent';

      for (let i = 0; i < clusterCount; i++) {
        const colorHex = colorMode === 'random'
          ? FIREWORK_COLORS[
          Math.floor(
            Math.random() * FIREWORK_COLORS.length
          )
          ]
          : color.getHex();
        const subColor = new THREE.Color(colorHex);

        let vx, vy, vz;
        if (hasDirection) {
          const speed = 40 + Math.random() * 35;
          const angleCone = 0.05 + Math.random() * 0.72;
          const angleAzimuth = Math.random() * Math.PI * 2;

          const localDir = new THREE.Vector3(
            Math.sin(angleCone) * Math.cos(angleAzimuth),
            Math.cos(angleCone),
            Math.sin(angleCone) * Math.sin(angleAzimuth)
          );
          localDir.applyQuaternion(orientQuat);

          vx = localDir.x * speed;
          vy = localDir.y * speed;
          vz = localDir.z * speed;
        } else {
          const speed = 40 + Math.random() * 35; // Wider spread
          const angleY = Math.random() * Math.PI / 2.2;
          const angleXZ = Math.random() * Math.PI * 2;

          vx = Math.sin(angleY) * Math.cos(angleXZ) * speed;
          vz = Math.sin(angleY) * Math.sin(angleXZ) * speed;
          vy = Math.cos(angleY) * speed + 38; // Upward boost
        }

        const velocity = new THREE.Vector3(
          vx,
          vy,
          vz
        );

        if (parentVelocity) {
          velocity.addScaledVector(parentVelocity, 0.3);
        }

        const targetHeight = burstPosition.y + 1000;

        const subPreset = this.shellPresetFactory.glitterStrobeShell(0.5);
        subPreset.color = colorHex;
        subPreset.shellType = 'floral-child';
        subPreset.particleCountMultiplier = cfg.particleCountMultiplier; // More glitter particles
        subPreset.launchTrail = true; // Enable trails for children for maximum sparkles
        subPreset.trailChance = cfg.trailChance;

        const subShell = this.createShell(
          burstPosition.clone(),
          velocity,
          targetHeight,
          subColor,
          subPreset,
          shellId + '-c2-' + i
        );

        this.activeFireworks.push(subShell);
        this.diagnostics.launched += 1;
      }
    }
  }

  getDefaultNestedStages(baseColor = null) {
    const primaryHex = (baseColor && baseColor.getHexString)
      ? '#' + baseColor.getHexString()
      : '#ff4400';

    return [
      {
        shapeType: 'sphere',
        dynamicsType: 'standard',
        color: primaryHex,
        delay: 0.0,
        scale: 1.0,
        effects: ['strobe']
      },
      {
        shapeType: 'ring',
        dynamicsType: 'flow',
        color: '#00e5ff',
        delay: 0.45,
        scale: 0.82,
        effects: []
      },
      {
        shapeType: 'sphere',
        dynamicsType: 'crossette',
        color: '#ffd700',
        delay: 0.90,
        scale: 0.65,
        effects: ['crossette']
      },
      {
        shapeType: 'sphere',
        dynamicsType: 'willow',
        color: '#ffffff',
        delay: 1.35,
        scale: 0.50,
        effects: ['glitter-strobe']
      }
    ];
  }

  triggerMultiNestedBurst(position, baseColor, preset, shellId) {
    const rawStages = Array.isArray(preset?.stages) && preset.stages.length > 0
      ? preset.stages
      : this.getDefaultNestedStages(baseColor);

    const stages = rawStages.slice(0, 5); // Tối đa 5 tầng
    const isSatellite = preset?.nestingMode === 'satellite';
    const baseSize = Math.max(0.6, Math.min(6, preset?.shellSize ?? 1));

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      const delay = Math.max(0, stage.delay ?? (i * 0.45));
      const stageScale = Math.max(0.2, Math.min(2.0, stage.scale ?? (1.0 - i * 0.14)));
      const stageColor = stage.color
        ? (typeof stage.color === 'string' ? new THREE.Color(stage.color) : stage.color.clone())
        : baseColor.clone();

      let stagePos = position.clone();
      if (isSatellite && i > 0) {
        const angle = ((i - 1) / (stages.length - 1)) * Math.PI * 2 + (Math.random() * 0.2);
        const radius = (16 + Math.random() * 8) * baseSize;
        const elev = (Math.random() - 0.5) * 10 * baseSize;
        stagePos.x += Math.cos(angle) * radius;
        stagePos.y += elev;
        stagePos.z += Math.sin(angle) * radius;
      }

      const stageEffects = Array.isArray(stage.effects) ? stage.effects : [];
      const stagePreset = {
        ...preset,
        multiNested: false,
        stages: null,
        shapeType: stage.shapeType || 'sphere',
        dynamicsType: stage.dynamicsType || 'standard',
        effects: stageEffects,
        shellSize: baseSize * stageScale,
        strobe: stageEffects.includes('strobe') || Boolean(stage.strobe),
        crackle: stageEffects.includes('crackle') || Boolean(stage.crackle),
        noTrail: stageEffects.includes('no-trail') || Boolean(stage.noTrail),
        crossette: stageEffects.includes('crossette') || Boolean(stage.crossette)
      };

      if (delay <= 0.001) {
        this.createBurst(
          stagePos,
          stageColor,
          stagePreset.shapeType,
          stagePreset,
          shellId + '-stage-' + i
        );
      } else {
        this.scheduledBursts.push({
          timeRemaining: delay,
          position: stagePos,
          color: stageColor,
          shape: stagePreset.shapeType,
          preset: stagePreset,
          shellId: shellId + '-stage-' + i
        });
      }
    }
  }

  triggerAscentSubBurst(shellEntity, burstIndex) {
    const burstPos = shellEntity.mesh.position.clone();
    const angle = Math.random() * Math.PI * 2;
    const offsetDist = 1.0 + Math.random() * 1.2;
    burstPos.x += Math.cos(angle) * offsetDist;
    burstPos.z += Math.sin(angle) * offsetDist;

    const subType = shellEntity.preset?.ascentSubShellType || 'random';
    let subPreset = null;
    if (subType !== 'random' && this.shellPresetFactory.presetsRegistry.has(subType)) {
      const gen = this.shellPresetFactory.presetsRegistry.get(subType);
      subPreset = gen ? gen(0.18) : this.shellPresetFactory.createPresetByKey(subType);
    } else if (subType === 'crossette') {
      subPreset = this.shellPresetFactory.crossetteShell(0.18);
    } else if (subType === 'strobe') {
      subPreset = this.shellPresetFactory.strobeShell(0.18);
    } else if (subType === 'crackle') {
      subPreset = this.shellPresetFactory.crackleShell(0.18);
    } else if (subType === 'willow') {
      subPreset = this.shellPresetFactory.weepingWillowCometsShell(0.18);
    } else if (subType === 'ring') {
      subPreset = this.shellPresetFactory.ringShell(0.18);
    } else if (subType === 'star') {
      subPreset = this.shellPresetFactory.starShell(0.18);
    } else if (subType === 'flow') {
      subPreset = this.shellPresetFactory.fishShell(0.18);
    } else if (subType === 'sparking') {
      subPreset = this.shellPresetFactory.sparkingShell(0.18);
    } else {
      subPreset = this.shellPresetFactory.crysanthemumShell(0.18);
    }

    if (!subPreset) {
      subPreset = this.shellPresetFactory.crysanthemumShell(0.18);
    }

    const parentSize = Math.max(0.6, shellEntity.preset?.shellSize ?? 1);
    subPreset.shellSize = 0.175 * parentSize;
    subPreset.isAscentChild = true;
    subPreset.multiNested = false;
    subPreset.stages = null;
    subPreset.ascentBursts = false;
    subPreset.spreadSize = (subPreset.spreadSize || 300) * 0.45;
    subPreset.starLife = Math.min(650, (subPreset.starLife || 800) * 0.6);

    const subColorHex = this.shellPresetFactory.randomColor();
    const subColor = new THREE.Color(subColorHex);

    this.createBurst(
      burstPos,
      subColor,
      subPreset.shapeType || 'sphere',
      subPreset,
      shellEntity.shellId + '-ascent-' + burstIndex
    );

    this.emitFireworkEvent(
      'firework:burst',
      {
        shellId: shellEntity.shellId + '-ascent-' + burstIndex,
        shellType: subPreset.shellType || 'ascent-sub-shell',
        shapeType: subPreset.shapeType || 'sphere',
        effectType: subPreset.effectType || 'standard',
        colorHex: subColor.getHex(),
        position: {
          x: burstPos.x,
          y: burstPos.y,
          z: burstPos.z
        },
        intensity: 0.15,
        duration: 0.5
      }
    );
  }

  resolveBurstParticleCount(shape, effectType, preset) {
    if (preset?.isAscentChild) {
      return Math.round((14 + Math.floor(Math.random() * 6)) * this.graphicsQualityMultiplier);
    }

    if (preset?.shellType === 'ringComet') {
      return 10 + Math.floor(Math.random() * 6); // 10-15 particles for sparse comet ring
    }

    if (preset?.isNestedChild) {
      // Điểm nổ con của hoa cúc lồng: 10-12 hạt nhỏ lấp lánh (bỏ qua minParticles = 60 để chống tụt FPS)
      return Math.round((10 + Math.floor(Math.random() * 3)) * this.graphicsQualityMultiplier);
    }

    const shapeMultiplier = FIREWORK_CONFIG.SHAPE_MULTIPLIERS;

    const effectMultiplier = FIREWORK_CONFIG.EFFECT_MULTIPLIERS;

    const presetMultiplier = Math.max(0.7, Math.min(2.2, preset?.particleCountMultiplier ?? 1));
    const renderModeMultiplier = (
      preset?.shapeRenderMode === 'outline'
      || preset?.shapeRenderMode === 'jupiter'
    )
      ? 1.12
      : 1;
    const uniqueShells = new Set(
      this.burstParticles.map(
        (p) => p.shellId
      )
    );
    const activeBurstCount = uniqueShells.size;

    let performanceScale = 1;
    if (this.graphicsQuality !== 'high') {
      if (activeBurstCount > 12) {
        performanceScale = 0.72;
      } else if (activeBurstCount > 8) {
        performanceScale = 0.86;
      }
    }

    const effectsList = Array.isArray(preset?.effects) ? preset.effects : [];
    const isCrossetteActive = Boolean(preset?.crossette)
      || effectsList.includes('crossette')
      || effectType === 'crossette';
    const crossetteScale = (isCrossetteActive && effectType !== 'crossette') ? 0.6 : 1.0;

    const resolvedShapeMultiplier = shapeMultiplier[shape] ?? 1;
    const resolvedEffectMultiplier = effectMultiplier[effectType] ?? 1;
    const sizeMultiplier = Math.max(0.6, Math.min(6, preset?.shellSize ?? 1)); // Phụ thuộc vào size (scale theo độ cao)
    const baseMin = isCrossetteActive ? Math.round(MIN_BURST_PARTICLES * 0.6) : MIN_BURST_PARTICLES;
    const minParticles = Math.round(baseMin * this.graphicsQualityMultiplier);
    const maxParticles = Math.round(MAX_BURST_PARTICLES * this.graphicsQualityMultiplier);
    const rawCount = BASE_BURST_PARTICLES * resolvedShapeMultiplier * resolvedEffectMultiplier * crossetteScale * presetMultiplier * renderModeMultiplier * performanceScale * sizeMultiplier * this.graphicsQualityMultiplier;

    return Math.max(minParticles, Math.min(maxParticles, Math.round(rawCount)));
  }

  createBurst(position, color, shape = 'sphere', preset = null, shellId = null) {
    const requestedShape = preset?.shapeType
      || preset?.shape
      || shape
      || 'sphere';
    const resolvedShape = BurstShapeGenerator.resolveShape(requestedShape);
    if (resolvedShape !== requestedShape) {
      this.diagnostics.shapeFallbacks += 1;
      this.registerWarning(`[Burst] Shape fallback from "${requestedShape}" to "${resolvedShape}".`);
    }

    const effectsList = Array.isArray(preset?.effects) ? preset.effects : [];
    const crackleEnabled = Boolean(preset?.crackle) || effectsList.includes('crackle');
    const requestedEffect = preset?.dynamicsType
      || preset?.dynamics
      || (preset?.flow !== undefined
        ? (preset.flow ? 'flow' : 'standard')
        : preset?.effectType)
      || resolvedShape;
    const normalizedEffect = BurstEffectProcessor.normalizeEffectType(requestedEffect);
    if (normalizedEffect !== requestedEffect) {
      this.diagnostics.effectFallbacks += 1;
      this.registerWarning(`[Burst] Effect fallback from "${requestedEffect}" to "${normalizedEffect}".`);
    }

    const burstParticleCount = this.resolveBurstParticleCount(
      resolvedShape,
      normalizedEffect,
      preset
    );
    const burstRotation = this.createRandomBurstRotation();
    const burstYaw = Math.random() * Math.PI * 2;
    const burstYawQuat = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      burstYaw
    );
    const heightProfile = this.heightScalingConfig.enabled
      ? BurstEffectProcessor.createHeightProfile(
        position.y,
        this.heightScalingConfig
      )
      : {
        normalized: 0,
        sizeMultiplier: 1,
        brightnessMultiplier: 1
      };
    const brightnessBlend = Math.min(
      Math.max(
        (heightProfile.brightnessMultiplier - 1) / 1.2,
        0
      ),
      0.75
    );
    const brightnessIntensity = Math.min(
      Math.max(
        heightProfile.brightnessMultiplier,
        1
      ),
      1.3
    );
    const burstColor = color.clone().lerp(
      new THREE.Color(0xffffff),
      brightnessBlend
    );
    const whiteColor = new THREE.Color(0xffffff);

    // Initialize effect state early so we can access parameters like ghostAxis during particle generation
    const effectState = {
      ...BurstEffectProcessor.initialize(
        normalizedEffect,
        burstParticleCount,
        preset
      ),
      shapeType: resolvedShape
    };

    let color2Blend = null;
    if (normalizedEffect === 'ghost' || normalizedEffect === 'crysanthemum-cc') {
      let secondColor;
      if (preset && preset.secondColor && preset.secondColor !== preset.color) {
        secondColor = new THREE.Color(preset.secondColor);
      } else {
        const baseHex = color.getHex();
        // Hand-picked color transition map matching Preset Factory
        const transitionMap = {
          0xffd700: 0x00bfff,    // Gold -> Sky Blue
          0xff4500: 0x7fffd4,    // Orange Red -> Aquamarine
          0x00bfff: 0xff69b4,    // Sky Blue -> Hot Pink
          0xff69b4: 0x7fffd4,    // Hot Pink -> Aquamarine
          0x7fffd4: 0x8a2be2,    // Aquamarine -> Blue Violet
          0x8a2be2: 0xffd700,    // Blue Violet -> Gold
          0xffffff: 0xff4500     // White -> Orange Red
        };

        if (transitionMap[baseHex] !== undefined) {
          secondColor = new THREE.Color(transitionMap[baseHex]);
        } else {
          // Fallback for custom color picker colors: shift hue by 180 degrees (0.5)
          const hsl = { h: 0, s: 0, l: 0 };
          color.getHSL(hsl);
          if (hsl.s < 0.1 || hsl.l > 0.95) {
            secondColor = new THREE.Color(0xff4500); // Grayscale -> Orange Red
          } else {
            const newHue = (hsl.h + 0.5) % 1.0;
            secondColor = new THREE.Color().setHSL(
              newHue,
              hsl.s,
              hsl.l
            );
          }
        }
      }
      color2Blend = secondColor.clone().lerp(
        new THREE.Color(0xffffff),
        brightnessBlend
      );
    }

    const isJupiterComposite = resolvedShape === 'ring' && preset?.shapeRenderMode === 'jupiter';
    const hasPistil = Boolean(preset?.pistil);
    const isCompositeCore = isJupiterComposite || hasPistil;

    let coreRatio = 0;
    if (isJupiterComposite) {
      coreRatio = Math.min(
        0.85,
        Math.max(
          0.15,
          preset?.ringCoreRatio ?? 0.42
        )
      );
    } else if (hasPistil) {
      coreRatio = 0.7; // Dành 70% số hạt cho phần lõi (pistil)
    }

    const coreCount = isCompositeCore
      ? Math.max(
        8,
        Math.floor(burstParticleCount * coreRatio)
      )
      : 0;
    const ringCount = Math.max(
      1,
      burstParticleCount - coreCount
    );
    const ringPreset = isJupiterComposite
      ? {
        ...preset,
        shapeRenderMode: 'outline'
      }
      : preset;

    const color1Scaled = burstColor.clone().multiplyScalar(brightnessIntensity);
    const color2Scaled = color2Blend
      ? color2Blend.clone().multiplyScalar(brightnessIntensity)
      : null;

    const isNestedParent = Boolean(
      preset?.nestedBurst && !preset?.isNestedChild
    );
    const nestedTriggerIndices = new Set();
    const NESTED_CHILD_COUNT = 8;
    if (isNestedParent) {
      for (let k = 0; k < NESTED_CHILD_COUNT; k++) {
        const triggerIdx = Math.floor(
          (k + 0.5) * (burstParticleCount / NESTED_CHILD_COUNT)
        );
        nestedTriggerIndices.add(triggerIdx);
      }
    }
    const nestedBurstDelay = BURST_LIFE * 0.82;

    const isCrossetteShell = Boolean(preset?.crossette)
      || effectsList.includes('crossette')
      || normalizedEffect === 'crossette';

    const crossetteSplitMap = new Map();
    if (isCrossetteShell && burstParticleCount > 0) {
      const outerIndices = [];
      for (let k = 0; k < burstParticleCount; k++) {
        const isCore = isCompositeCore && k < coreCount;
        if (!isCore) {
          outerIndices.push(k);
        }
      }
      const pool = outerIndices.length >= 12
        ? outerIndices
        : Array.from({ length: burstParticleCount }, (_, idx) => idx);
      const targetCrossetteCount = Math.min(
        pool.length,
        12 + Math.floor(Math.random() * 4) // 12 -> 15 hạt
      );

      // Fisher-Yates partial shuffle to pick targetCrossetteCount distinct particles
      for (let k = 0; k < targetCrossetteCount; k++) {
        const randIdx = k + Math.floor(Math.random() * (pool.length - k));
        const temp = pool[k];
        pool[k] = pool[randIdx];
        pool[randIdx] = temp;
      }

      const chosenIndices = pool.slice(0, targetCrossetteCount);
      // Xáo trộn thứ tự để phân bổ so le ngẫu nhiên
      for (let k = 0; k < chosenIndices.length; k++) {
        const r = k + Math.floor(Math.random() * (chosenIndices.length - k));
        const temp = chosenIndices[k];
        chosenIndices[k] = chosenIndices[r];
        chosenIndices[r] = temp;
      }

      // Phân bổ thời gian tách sole từng hạt một từ 0.35 đến 0.65
      for (let k = 0; k < chosenIndices.length; k++) {
        const pIdx = chosenIndices[k];
        const tProgress = chosenIndices.length > 1
          ? (k / (chosenIndices.length - 1))
          : 0.5;
        const staggeredRatio = 0.35 + tProgress * 0.30 + (Math.random() - 0.5) * 0.04;
        crossetteSplitMap.set(
          pIdx,
          THREE.MathUtils.clamp(staggeredRatio, 0.32, 0.68)
        );
      }
    }

    const newParticles = [];

    for (let i = 0; i < burstParticleCount; i++) {
      const isCoreParticle = isCompositeCore && i < coreCount;
      const particleShape = isCoreParticle ? 'sphere' : resolvedShape;
      const particleIndex = isCoreParticle ? i : (i - coreCount);
      const particleCount = isCoreParticle ? coreCount : ringCount;
      const angle = (particleIndex / particleCount) * Math.PI * 2;

      const isSpiralV2 = normalizedEffect === 'crysanthemum-spiral-v2';
      const spiralArmCount = isSpiralV2 ? Math.floor(burstParticleCount * 0.38) : 0;
      const isSpiralArm = isSpiralV2 && (i < spiralArmCount);

      let direction;
      if (isSpiralArm) {
        const tArm = i / Math.max(1, spiralArmCount - 1);
        const turns = 3.5;
        const theta = tArm * turns * Math.PI * 2;
        const phi = Math.acos(Math.max(-1, Math.min(1, 1.0 - 2.0 * tArm)));
        direction = new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta),
          Math.cos(phi),
          Math.sin(phi) * Math.sin(theta)
        ).applyQuaternion(burstRotation);
      } else {
        const rawDir = BurstShapeGenerator.direction(
          particleShape,
          angle,
          particleIndex,
          particleCount,
          isCoreParticle ? preset : ringPreset
        );
        if (particleShape === 'willow-arch' || particleShape === 'willow-up') {
          direction = rawDir.applyQuaternion(burstYawQuat);
        } else {
          direction = rawDir.applyQuaternion(burstRotation);
        }
      }

      const useContourMagnitude = (!isCoreParticle && ringPreset?.shapeRenderMode === 'outline' && (particleShape === 'ring' || particleShape === 'heart' || particleShape === 'star')) || (particleShape === 'half-flash') || (particleShape === 'split-flash') || (particleShape === 'galaxy');
      if (!useContourMagnitude) {
        direction.normalize();
      }

      const sphereSpeedBand = 0.9 + Math.random() * 0.2;
      const defaultSpeedBand = 0.5 + Math.random() * 0.8;
      const coreSpeedBand = 0.34 + Math.random() * 0.18;

      let baseSpeed;
      if (isCoreParticle) {
        baseSpeed = BURST_SPEED * coreSpeedBand;
      } else if (particleShape === 'ring' || particleShape === 'heart' || particleShape === 'star') {
        let speedVariance = 0.12; // Mặc định méo tự nhiên cho heart, star và ring v2
        if (preset?.shellType === 'ring') {
          speedVariance = 0.01; // Ring v1 cần tròn xoe hoàn hảo không méo
        }
        const outlineSpeedBand = 1.0 + (Math.random() - 0.5) * speedVariance;
        baseSpeed = BURST_SPEED * outlineSpeedBand;
      } else if (particleShape === 'sphere' || particleShape === 'half-flash' || particleShape === 'split-flash') {
        const speedBand = (particleShape === 'half-flash' || particleShape === 'split-flash')
          ? (0.97 + Math.random() * 0.06)
          : sphereSpeedBand;
        baseSpeed = BURST_SPEED * speedBand;
      } else {
        baseSpeed = BURST_SPEED * defaultSpeedBand;
      }

      const shellSizeScale = Math.max(
        0.6,
        Math.min(
          6,
          preset?.shellSize ?? 1
        )
      );
      const isDyingEmber =
        (preset?.shellType === 'strobeDyingEmbers' && Math.random() < 0.5) ||
        Math.random() < 0.05;
      const speed = baseSpeed * (useContourMagnitude ? 1.15 : 1) * shellSizeScale * (isDyingEmber ? 0.85 : 1.0);

      const normDir = direction.clone().normalize();
      const velocityVal = direction.multiplyScalar(speed);

      let particleColor = burstColor;
      if (isCoreParticle) {
        const fallbackColor = new THREE.Color(FIREWORK_COLORS[(Math.random() * FIREWORK_COLORS.length) | 0]);
        const finalCoreBaseColor = preset?.pistilColor
          ? new THREE.Color(preset.pistilColor)
          : fallbackColor;
        particleColor = finalCoreBaseColor.lerp(
          whiteColor,
          0.08 + Math.random() * 0.12
        );
      } else if (normalizedEffect === 'ghost') {
        const dot = normDir.x * effectState.ghostAxis.x
          + normDir.y * effectState.ghostAxis.y
          + normDir.z * effectState.ghostAxis.z;
        if (dot < 0) {
          particleColor = burstColor;
        } else {
          particleColor = color2Blend;
        }
      } else if (normalizedEffect === 'crysanthemum-cc') {
        particleColor = burstColor;
      }

      const finalColorVal = particleColor.clone().multiplyScalar(brightnessIntensity);

      let ghostDotVal = 0;
      if (normalizedEffect === 'ghost') {
        const speedVal = velocityVal.length();
        const nx = speedVal > 0 ? velocityVal.x / speedVal : 0;
        const ny = speedVal > 0 ? velocityVal.y / speedVal : 0;
        const nz = speedVal > 0 ? velocityVal.z / speedVal : 0;
        ghostDotVal = nx * effectState.ghostAxis.x
          + ny * effectState.ghostAxis.y
          + nz * effectState.ghostAxis.z;
      }

      let spiralIndexVal = 0;
      if (normalizedEffect === 'crysanthemum-spiral') {
        const speedVal = velocityVal.length();
        const nx = speedVal > 0 ? velocityVal.x / speedVal : 0;
        const ny = speedVal > 0 ? velocityVal.y / speedVal : 0;
        const nz = speedVal > 0 ? velocityVal.z / speedVal : 0;
        const normH = (ny + 1.0) * 0.5; // 0 (bottom pole) to 1 (top pole)
        const azimuth = Math.atan2(nz, nx);
        const normAzimuth = (azimuth + Math.PI) / (Math.PI * 2.0);
        const turns = 3.5;
        const rawSpiral = (1.0 - normH) * turns + normAzimuth;
        spiralIndexVal = Math.max(0, Math.min(1, rawSpiral / (turns + 1.0)));
      } else if (normalizedEffect === 'crysanthemum-spiral-v2') {
        if (isSpiralArm) {
          spiralIndexVal = i / Math.max(1, spiralArmCount - 1);
        } else {
          spiralIndexVal = 1.0;
        }
      }

      const isNestedTrigger = isNestedParent && nestedTriggerIndices.has(i);
      let particleMaxLife;
      let particleVelocity = velocityVal;

      if (isNestedTrigger) {
        // Tất cả hạt pháo con có cùng chính xác thời gian sống để nổ đồng loạt
        particleMaxLife = nestedBurstDelay;
        const triggerSpeed = BURST_SPEED * 1.0 * shellSizeScale;
        particleVelocity = direction.clone().normalize().multiplyScalar(
          triggerSpeed
        );
      } else {
        const baseMaxLife = BURST_LIFE * (0.8 + Math.random() * 0.4);
        particleMaxLife = isDyingEmber
          ? baseMaxLife * 2.0
          : baseMaxLife;
      }

      newParticles.push({
        position: position.clone(),
        velocity: particleVelocity.clone(),
        color: finalColorVal.clone(),
        baseColor: finalColorVal.clone(),
        color2: color2Scaled
          ? color2Scaled.clone()
          : null,
        age: 0,
        maxLife: particleMaxLife,
        effectType: normalizedEffect,
        crackle: !preset?.isNestedChild
          && !isDyingEmber
          && (crackleEnabled || normalizedEffect === 'crackle'),
        crackleTriggered: false,
        phase: effectState.phase
          ? effectState.phase[i]
          : 0,
        preset,
        heightProfile,
        effectState,
        ghostDot: ghostDotVal,
        spiralIndex: spiralIndexVal,
        isSpiralArm: Boolean(isSpiralArm),
        particleIndex: i,
        totalParticleCount: burstParticleCount,
        shellId: shellId ?? Math.floor(Math.random() * 100000000),
        isDyingEmber: isDyingEmber,
        isNestedTrigger: isNestedTrigger,
        effects: effectsList,
        isCrossette: isCrossetteShell
          && !isDyingEmber
          && crossetteSplitMap.has(i),
        crossetteSplitTime: particleMaxLife * (crossetteSplitMap.get(i) ?? 0.5),
        crossetteSplitDone: false
      });
    }

    for (const p of newParticles) {
      if (this.burstParticles.length >= this.maxBurstParticles) {
        this.burstParticles.shift();
      }
      this.burstParticles.push(p);
    }
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

    // Xử lý nổ pháo con trên đường bay lên (Ascent Sub-Bursts Trail)
    if (
      item.preset?.cometTrail === 'ascent-bursts'
      || Boolean(item.preset?.ascentBursts)
    ) {
      if (!item._ascentBurstMilestones) {
        const count = Math.max(2, Math.min(6, item.preset?.ascentBurstCount || 4));
        item._ascentBurstMilestones = [];
        const step = (0.80 - 0.22) / Math.max(1, count - 1);
        for (let b = 0; b < count; b++) {
          item._ascentBurstMilestones.push(0.22 + b * step);
        }
        item._nextAscentBurstIndex = 0;
      }

      if (item._nextAscentBurstIndex < item._ascentBurstMilestones.length) {
        const currentProgress = item.getProgress ? item.getProgress() : 0;
        const targetProgress = item._ascentBurstMilestones[item._nextAscentBurstIndex];
        if (currentProgress >= targetProgress) {
          this.triggerAscentSubBurst(item, item._nextAscentBurstIndex);
          item._nextAscentBurstIndex++;
        }
      }
    }

    const launchTrail = item.preset?.launchTrail !== false;
    const activeTrailChance = item.preset?.trailChance !== undefined
      ? item.preset.trailChance
      : 1.0;

    const trailIntensity = item.getTrailIntensity ? item.getTrailIntensity() : 1.0;

    // Nếu gần burst tắt hẳn về 0 (trailIntensity <= 0.01) thì không sinh thêm vệt comet
    if (launchTrail && trailIntensity > 0.01 && Math.random() < activeTrailChance) {
      let customLife = null;
      if (item.preset?.noBurst && item.preset?.starLife) {
        const lifeTime = item.preset.starLife / 1000;
        const remainingLife = Math.max(0.1, lifeTime - item.age);
        const baseTrailLife = (2 + Math.random() * 3) * 0.5;
        customLife = Math.min(baseTrailLife, remainingLife);
      }
      const isFloralChild = item.shellType === 'floral-child';
      const isBouquetComet = item.preset?.isBouquetComet || (isFloralChild && item.preset?.thickTrail);
      const isThin = Boolean(item.preset?.thinTrail);
      const isThick = item.preset?.thickTrail || isBouquetComet;
      const ascentCfg = FIREWORK_CONFIG.ASCENT;

      let baseLifeMul;
      if (isBouquetComet) {
        baseLifeMul = 0.95;
      } else if (isThin) {
        baseLifeMul = 0.35;
      } else if (isThick) {
        baseLifeMul = 0.7;
      } else {
        baseLifeMul = ascentCfg?.trailLifeMultiplier ?? 0.55;
      }

      const lifeMultiplier = baseLifeMul * (0.6 + 0.4 * trailIntensity);
      const opacity = Math.min(
        1.0,
        (ascentCfg?.trailOpacity ?? 1.0) * trailIntensity * (isBouquetComet ? 1.4 : (isThin ? 1.25 : 1.0))
      );

      const progress = item.getProgress ? item.getProgress() : 0.5;
      const ovalFactor = Math.sin(Math.PI * progress);

      const baseDispersion = ascentCfg?.trailDispersion ?? 0.22;
      const midDispBoost = ascentCfg?.midDispersionBoost ?? 2.2;
      
      let dispersion;
      if (isBouquetComet) {
        dispersion = 0.35 + Math.random() * 0.2;
      } else if (isThin) {
        dispersion = 0.005;
      } else {
        dispersion = baseDispersion * (
          0.5 + midDispBoost * Math.pow(ovalFactor, 0.9)
        );
      }

      let subSteps;
      if (isBouquetComet) {
        subSteps = 2;
      } else if (isThin) {
        subSteps = 3;
      } else {
        const baseSubSteps = ascentCfg?.subSteps ?? 2;
        const midBonus = ascentCfg?.midSubStepsBonus ?? 2;
        subSteps = baseSubSteps + Math.round(
          midBonus * Math.pow(ovalFactor, 0.85)
        );
      }

      const prevPos = item.prevPosition || item.mesh.position;
      const currPos = item.mesh.position;
      const extraChance = isBouquetComet
        ? 0.85
        : (isThin ? 0.0 : (ascentCfg?.midExtraParticleChance ?? 0.75) * Math.pow(ovalFactor, 0.85));

      // Nâng độ sáng màu sắc cho vệt bouquet comet
      const particleColor = isBouquetComet
        ? item.color.clone().offsetHSL(0, 0, 0.15)
        : item.color;

      for (let s = 1; s <= subSteps; s++) {
        const t = s / subSteps;
        const spawnPos = new THREE.Vector3().lerpVectors(
          prevPos,
          currPos,
          t
        );
        if (dispersion > 0.02) {
          spawnPos.x += (Math.random() - 0.5) * dispersion;
          spawnPos.z += (Math.random() - 0.5) * dispersion;
        }

        this.trailSystem.spawnTrailParticle(
          spawnPos,
          particleColor,
          lifeMultiplier,
          false,
          customLife,
          opacity,
          false
        );

        // Ở giai đoạn giữa hoặc với bouquet comet, tạo thêm nhiều hạt phụ xòe ngang tạo độ dày khối bầu dục
        if (extraChance > 0.2 && Math.random() < extraChance) {
          const sidePos = spawnPos.clone();
          const angle = Math.random() * Math.PI * 2;
          const lateralR = (0.25 + 0.75 * Math.random()) * dispersion;
          sidePos.x += Math.cos(angle) * lateralR;
          sidePos.z += Math.sin(angle) * lateralR;

          this.trailSystem.spawnTrailParticle(
            sidePos,
            particleColor,
            lifeMultiplier * 0.9,
            false,
            customLife,
            opacity * 0.95,
            false
          );
        }

        // Sinh thêm hạt tia lửa sáng chói dọc theo đường bay của bouquet comet (hoặc giai đoạn giữa của shell mẹ)
        const shouldSpawnSpark = isBouquetComet
          ? Math.random() < 0.35
          : (trailIntensity >= 0.85 && Math.random() < (0.2 + 0.15 * ovalFactor));

        if (shouldSpawnSpark) {
          const sparkColor = isBouquetComet
            ? item.color.clone().offsetHSL(
              0,
              0,
              0.35
            )
            : item.color.clone().offsetHSL(
              0,
              0,
              0.2
            );
          this.trailSystem.spawnEffectSpark(
            spawnPos,
            sparkColor,
            false,
            null,
            0,
            0.6 + Math.random() * 0.5
          );
        }
      }

      if (this.smokeSystem && Math.random() < (0.35 * trailIntensity)) {
        const ascVel = item.velocity
          ? item.velocity.clone().multiplyScalar(-0.15)
          : new THREE.Vector3(
              0,
              -1.2,
              0
            );
        const smokeCfg = FIREWORK_CONFIG.SMOKE;
        const trailLife = (
          smokeCfg.trailLifeMin +
          Math.random() * (smokeCfg.trailLifeMax - smokeCfg.trailLifeMin)
        ) * trailIntensity;

        this.smokeSystem.addSmokePoint(
          item.mesh.position,
          ascVel,
          {
            life: trailLife,
            scale: (
              smokeCfg.trailBaseScale * 0.8 +
              Math.random() * 2.5
            ) * (0.6 + 0.4 * trailIntensity),
            growth: smokeCfg.trailGrowth,
            drag: smokeCfg.trailDrag,
            buoyancy: smokeCfg.trailBuoyancy,
            opacity: smokeCfg.trailOpacity * trailIntensity,
            color: item.color.clone()
          }
        );
      }
    }

    if (!shouldBurst) {
      return;
    }

    const burstPosition = item.mesh.position.clone();

    if (this.isBouquetShell(item) || this.isBouquetShell(item.preset)) {
      const parentVel = item.velocity ? item.velocity.clone() : null;
      const burstDir = parentVel && parentVel.lengthSq() > 0.001
        ? parentVel.clone().normalize()
        : new THREE.Vector3(0, 1, 0);

      this.triggerBouquetBurst(
        burstPosition,
        item.color,
        item.preset,
        item.shellId,
        burstDir,
        parentVel
      );

      item.markBursted?.();
      finished.push(item);

      const shellSize = Math.max(1, Math.min(6, item.preset?.shellSize ?? 1));
      const normalizedEnergy = 0.35 + ((shellSize - 1) / 5) * 0.65;

      const hasNoBurst = (Array.isArray(item.preset?.effects) && item.preset.effects.includes('no-burst'))
        || Boolean(item.preset?.['no-burst']);

      this.emitFireworkEvent(
        'firework:burst',
        {
          shellId: item.shellId,
          shellType: item.shellType ?? item.shape,
          shapeType: item.shapeType ?? item.shape,
          effectType: item.preset?.effectType ?? item.shape,
          effects: item.preset?.effects,
          noBurstSound: hasNoBurst || Boolean(item.preset?.noBurstSound),
          colorHex: item.color.getHex(),
          position: {
            x: burstPosition.x,
            y: burstPosition.y,
            z: burstPosition.z
          },
          intensity: normalizedEnergy,
          duration: 1.25 + normalizedEnergy * 1.1
        }
      );
      return;
    }

    if (item.preset?.noBurst) {
      item.markBursted?.();
      finished.push(item);
      return;
    }

    if (
      item.preset?.multiNested
      || (item.preset?.preset === 'multiNested' && Array.isArray(item.preset?.stages) && item.preset.stages.length > 0)
    ) {
      this.triggerMultiNestedBurst(
        burstPosition,
        item.color,
        item.preset,
        item.shellId
      );
    } else {
      this.createBurst(
        burstPosition,
        item.color,
        item.shapeType ?? item.shape,
        item.preset,
        item.shellId
      );
    }
    const shellSize = Math.max(1, Math.min(6, item.preset?.shellSize ?? 1));
    const normalizedEnergy = 0.35 + ((shellSize - 1) / 5) * 0.65;
    item.markBursted?.();
    finished.push(item);
    this.diagnostics.bursted += 1;
    this.emitDiagnostics();

    const hasNoBurst = (Array.isArray(item.preset?.effects) && item.preset.effects.includes('no-burst'))
      || Boolean(item.preset?.['no-burst']);

    this.emitFireworkEvent('firework:burst', {
      shellId: item.shellId,
      shellType: item.shellType ?? item.shape,
      shapeType: item.shapeType ?? item.shape,
      effectType: item.preset?.effectType ?? item.shape,
      effects: item.preset?.effects,
      noBurstSound: hasNoBurst || Boolean(item.preset?.noBurstSound),
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

  updateBurstParticles(deltaTime) {
    const activeParticles = [];
    const nestedBurstsToSpawn = [];

    // Strobe frequency adjustment based on active burst count
    const uniqueShells = new Set(
      this.burstParticles.map(
        (p) => p.shellId
      )
    );
    const activeBurstCount = uniqueShells.size;
    const strobeFreqMultiplier = activeBurstCount > 8 ? 1.25 : 1.0;

    for (let idx = 0; idx < this.burstParticles.length; idx++) {
      const p = this.burstParticles[idx];
      p.age += deltaTime;

      if (p.age >= p.maxLife) {
        if (p.isNestedTrigger) {
          nestedBurstsToSpawn.push({
            position: p.position.clone(),
            color: p.color.clone(),
            shellId: p.shellId,
            strobe: Boolean(p.preset?.strobe)
          });
        }
        continue;
      }

      // 1. Kinematics Update
      const {
        gravityScale,
        emitSpark,
        spawnTrail,
        trailLife,
        trailIntensity,
        spawnSmoke,
        smokeLife,
        smokeOpacity
      } = BurstEffectProcessor.updateVelocity(
        p.velocity,
        p.particleIndex,
        deltaTime,
        p.age,
        p.maxLife,
        p.effectState
      );

      // Micro crackle trigger
      if (
        p.crackle
        && !p.isDyingEmber
        && p.age >= p.maxLife * 0.65
        && !p.crackleTriggered
      ) {
        p.crackleTriggered = true;
        if (Math.random() < 0.65) {
          const originPos = p.position.clone();
          const origColor = p.baseColor.clone();
          this.trailSystem.spawnMicroCrackle(
            originPos,
            origColor
          );
          this.emitFireworkEvent(
            'firework:crackle',
            {
              position: {
                x: originPos.x,
                y: originPos.y,
                z: originPos.z
              }
            }
          );
        }
        // Hide the original particle by setting its baseColor to 0
        p.baseColor.setRGB(0, 0, 0);
      }

      // Crossette split cross trigger
      if (
        p.isCrossette
        && !p.crossetteSplitDone
        && p.age >= p.crossetteSplitTime
        && (p.baseColor.r + p.baseColor.g + p.baseColor.b > 0.01)
      ) {
        p.crossetteSplitDone = true;
        const v = p.velocity.clone();
        const speed = v.length();
        const dir = speed > 0.001 ? v.clone().normalize() : new THREE.Vector3(0, 1, 0);
        const upVec = Math.abs(dir.y) > 0.85 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
        const rightVec = new THREE.Vector3().crossVectors(dir, upVec).normalize();
        const crossUpVec = new THREE.Vector3().crossVectors(dir, rightVec).normalize();

        const branchDirs = [
          rightVec,
          rightVec.clone().negate(),
          crossUpVec,
          crossUpVec.clone().negate()
        ];

        const splitOrigin = p.position.clone();
        const branchColor = p.baseColor.clone();
        const remainingLife = Math.max(0.65, p.maxLife - p.age);

        const hasNoTrail = Boolean(p.preset?.noTrail)
          || (Array.isArray(p.effects) && p.effects.includes('no-trail'))
          || (Array.isArray(p.preset?.effects) && p.preset.effects.includes('no-trail'))
          || p.effectType === 'no-trail';

        const branchEffectType = hasNoTrail ? 'no-trail' : 'crysanthemum-trail';
        const branchEffects = hasNoTrail ? ['no-trail'] : ['crysanthemum-trail'];

        for (let b = 0; b < 4; b++) {
          const branchVel = dir.clone().multiplyScalar(speed * 0.28).addScaledVector(
            branchDirs[b],
            9.0 + Math.random() * 2.5
          );
          activeParticles.push({
            position: splitOrigin.clone(),
            velocity: branchVel,
            color: branchColor.clone(),
            baseColor: branchColor.clone(),
            color2: null,
            age: 0,
            maxLife: remainingLife,
            effectType: branchEffectType,
            crackle: false,
            crackleTriggered: false,
            phase: p.phase + b * 0.5,
            preset: {
              ...p.preset,
              crossette: false,
              noTrail: hasNoTrail
            },
            heightProfile: p.heightProfile,
            effectState: p.effectState,
            ghostDot: 0,
            spiralIndex: 0,
            isSpiralArm: false,
            particleIndex: p.particleIndex * 4 + b,
            totalParticleCount: p.totalParticleCount,
            shellId: p.shellId,
            isDyingEmber: false,
            isNestedTrigger: false,
            effects: branchEffects,
            isCrossette: false,
            crossetteSplitDone: true,
            isChromaticWave: false,
            radialDistanceRatio: 0,
            renderSize: p.renderSize,
            renderOpacity: 1.0
          });
        }

        p.baseColor.setRGB(0, 0, 0);
      }

      let finalGravityScale = gravityScale;
      if (p.isDyingEmber) {
        finalGravityScale = gravityScale * 1.3;
        p.velocity.multiplyScalar(0.994);
      }

      p.position.addScaledVector(
        p.velocity,
        deltaTime
      );
      p.velocity.y += GRAVITY * deltaTime * finalGravityScale;

      // Water collision check at Y <= 0 (Water surface)
      if (p.position.y <= 0) {
        const isHot = (p.baseColor.r + p.baseColor.g + p.baseColor.b) > 0.08 && p.age < p.maxLife * 0.95;
        if (isHot) {
          // 1. Steam puff when hot particle hits water
          if (Math.random() < 0.35) {
            const steamVel = new THREE.Vector3(
              (Math.random() - 0.5) * 0.8,
              0.6 + Math.random() * 0.8,
              (Math.random() - 0.5) * 0.8
            );
            const steamOptions = {
              life: 0.7 + Math.random() * 0.5,
              scale: 1.8 + Math.random() * 1.2,
              growth: 2.2,
              drag: 2.8,
              buoyancy: 0.9,
              opacity: 0.12,
              color: new THREE.Color(0xdde5ee)
            };
            if (this.smokeSystem) {
              this.smokeSystem.addSmokePoint(
                new THREE.Vector3(p.position.x, 0.05, p.position.z),
                steamVel,
                steamOptions
              );
            } else {
              globalEventBus.emit(
                'smoke:spawn',
                {
                  position: new THREE.Vector3(p.position.x, 0.05, p.position.z),
                  velocity: steamVel,
                  options: steamOptions
                }
              );
            }
          }

          // 2. Micro sizzle splash spark
          if (Math.random() < 0.25) {
            const splashVel = new THREE.Vector3(
              (Math.random() - 0.5) * 3.5,
              1.2 + Math.random() * 2.0,
              (Math.random() - 0.5) * 3.5
            );
            this.trailSystem.spawnEffectSpark(
              new THREE.Vector3(p.position.x, 0.05, p.position.z),
              p.baseColor.clone().lerp(new THREE.Color(0xffffff), 0.5),
              false,
              splashVel,
              0,
              0.15 + Math.random() * 0.1
            );
          }
        }

        // Extinguish particle immediately on water impact
        continue;
      }

      // 2. Spawn Side Effects (sparks, trails, smoke)
      if (emitSpark && p.baseColor.r + p.baseColor.g + p.baseColor.b > 0.01) {
        this.trailSystem.spawnEffectSpark(
          p.position,
          CRACKLE_SPARK_COLOR
        );
      }

      const lifeRatio = p.maxLife > 0 ? p.age / p.maxLife : 1;
      const parentFade = lifeRatio > BURST_DISSOLVE_START
        ? Math.pow(
          1.0 - (lifeRatio - BURST_DISSOLVE_START) / (1.0 - BURST_DISSOLVE_START),
          2.0
        )
        : 1.0;

      let isSpiralIgnited = true;
      let spiralFlashBonus = 1.0;
      if (p.effectType === 'crysanthemum-spiral') {
        // Quét xoắn ốc từ t = 0 đến t = 0.65. Sau 0.65 (giai đoạn cuối) thì toàn bộ 100% hạt hình cầu đã sáng bừng rực rỡ
        const sweepProgress = Math.min(1.0, lifeRatio / 0.65);
        const particleSpiral = p.spiralIndex ?? 0;
        isSpiralIgnited = particleSpiral <= sweepProgress;
        if (isSpiralIgnited) {
          const timeSinceIgnition = sweepProgress - particleSpiral;
          if (timeSinceIgnition < 0.08) {
            spiralFlashBonus = 1.0 + (1.0 - timeSinceIgnition / 0.08) * 0.75;
          }
        }
      } else if (p.effectType === 'crysanthemum-spiral-v2') {
        if (p.isSpiralArm) {
          // Nhánh xoắn ốc 3D sáng dần liên tục từ t = 0 đến t = 0.52
          const armSweep = Math.min(1.0, lifeRatio / 0.52);
          const particleSpiral = p.spiralIndex ?? 0;
          isSpiralIgnited = particleSpiral <= armSweep;
          if (isSpiralIgnited) {
            const timeSinceIgnition = armSweep - particleSpiral;
            if (timeSinceIgnition < 0.08) {
              spiralFlashBonus = 1.0 + (1.0 - timeSinceIgnition / 0.08) * 0.85;
            }
          }
        } else {
          // Khối cầu ẩn tối ở giai đoạn đầu, sau đó bừng sáng đồng loạt toàn bộ hình sphere ở t >= 0.52
          isSpiralIgnited = lifeRatio >= 0.52;
          if (isSpiralIgnited) {
            const timeSinceSphereBloom = lifeRatio - 0.52;
            if (timeSinceSphereBloom < 0.10) {
              spiralFlashBonus = 1.0 + (1.0 - timeSinceSphereBloom / 0.10) * 0.95;
            }
          }
        }
      }

      const isChrysanthemumSpiral = p.effectType === 'crysanthemum-spiral'
        || p.effectType === 'crysanthemum-spiral-v2';
      const hasGhostFlare = p.effects?.includes('ghost-flare')
        || p.preset?.effects?.includes('ghost-flare')
        || p.effectType === 'ghost-kamuro';
      const isGhostFlareNoTrail = hasGhostFlare && lifeRatio <= 0.60;
      const hasNoTrailActive = Boolean(p.preset?.noTrail)
        || (Array.isArray(p.effects) && p.effects.includes('no-trail'))
        || (Array.isArray(p.preset?.effects) && p.preset.effects.includes('no-trail'))
        || p.effectType === 'no-trail';
      const allowTrail = spawnTrail
        && (!isChrysanthemumSpiral || isSpiralIgnited)
        && !isGhostFlareNoTrail
        && !hasNoTrailActive;

      if (allowTrail && p.baseColor.r + p.baseColor.g + p.baseColor.b > 0.01) {
        const isHalfFlashTentacle = p.effectState?.shapeType === 'half-flash'
          && p.particleIndex >= (p.totalParticleCount - 4);
        const isSplitFlashBeam = p.effectState?.shapeType === 'split-flash'
          && p.particleIndex >= (p.totalParticleCount - 5);
        const isCometRing = p.effectState?.effectType === 'comet-ring';
        const spawnChance = (isHalfFlashTentacle || isSplitFlashBeam || isCometRing || isChrysanthemumSpiral) ? 0.95 : 0.3;

        if (Math.random() < spawnChance * parentFade) {
          const trailColor = p.baseColor.clone();
          const currentIntensity = (trailIntensity ?? 0.35) * parentFade;
          trailColor.multiplyScalar(currentIntensity);

          const currentLife = (trailLife || 0.8) * (0.2 + 0.8 * parentFade);
          const trailVel = isCometRing ? p.velocity.clone().multiplyScalar(0.7) : null;
          const trailGrav = isCometRing ? 0.0 : 1.0;
          const trailDrag = isCometRing ? 1.2 : 1.0;

          this.trailSystem.spawnTrailParticle(
            p.position,
            trailColor,
            isCometRing ? 1.0 : currentLife,
            false,
            isCometRing ? currentLife : null,
            1.0,
            false,
            trailVel,
            trailGrav,
            trailDrag
          );
        }
      }

      if (p.baseColor.r + p.baseColor.g + p.baseColor.b > 0.01) {
        const spawnChance = lifeRatio < 0.12
          ? 1.0
          : (lifeRatio < 0.52 ? 0.85 : 0.85 * (1.0 - (lifeRatio - 0.52) / 0.48));

        const moduloCheck = (this.smokeSystem && this.smokeSystem.quality === 'high') ? 2 : (spawnSmoke ? 3 : 5);
        if (p.particleIndex % moduloCheck === 0 && Math.random() < spawnChance) {
          const particleColor = p.baseColor.clone();
          const smokeVel = p.velocity.clone().multiplyScalar(0.12);
          const densityMult = spawnSmoke ? 1.4 : 1.0;
          const smokeCfg = FIREWORK_CONFIG.SMOKE;
          const starSmokeBaseLife = smokeLife || (
            (smokeCfg.trailLifeMin + smokeCfg.trailLifeMax) * 0.5
          );
          const smokeOptions = {
            life: starSmokeBaseLife * (0.8 + 0.4 * Math.random()),
            scale: (3.2 + Math.random() * 2.2) * densityMult,
            growth: 3.2,
            drag: 2.5,
            buoyancy: smokeCfg.trailBuoyancy,
            opacity: (
              smokeOpacity || 0.15
            ) * parentFade * (lifeRatio < 0.15 ? 1.3 : 1.0) * densityMult,
            color: particleColor
          };

          if (this.smokeSystem) {
            this.smokeSystem.addSmokePoint(
              p.position,
              smokeVel,
              smokeOptions
            );
          } else {
            globalEventBus.emit(
              'smoke:spawn',
              {
                position: p.position.clone(),
                velocity: smokeVel,
                options: smokeOptions
              }
            );
          }
        }
      }

      // Sparking sparks
      if (p.effectType === 'sparking' && lifeRatio > 0.4 && p.baseColor.r + p.baseColor.g + p.baseColor.b > 0.01) {
        const randomOffset = ((p.particleIndex * 7) % 11) * 0.01;
        const transitionStart = 0.46 + randomOffset;
        if (p.particleIndex % 2 === 0 && lifeRatio > transitionStart) {
          const tDecay = (lifeRatio - transitionStart) / (1.0 - transitionStart);
          const sparkleChance = 0.42 * Math.pow(1.0 - tDecay, 1.8);
          if (Math.random() < sparkleChance) {
            const roll = Math.random();
            let sparkColor;
            if (roll < 0.52) {
              sparkColor = new THREE.Color(0xff8800).lerp(
                new THREE.Color(0xffd700),
                Math.random()
              );
            } else if (roll < 0.82) {
              sparkColor = new THREE.Color(0xffffff).lerp(
                new THREE.Color(0xfffacd),
                Math.random()
              );
            } else {
              sparkColor = new THREE.Color(0x444444);
            }

            const sparkVel = new THREE.Vector3(
              (Math.random() - 0.5) * 4.5,
              -3.0 - Math.random() * 5.0,
              (Math.random() - 0.5) * 4.5
            );
            const groupIndex = Math.floor(p.particleIndex / 12);
            const sparkPhase = groupIndex * 180;
            const sparkLife = 0.3 + Math.random() * 0.25;

            this.trailSystem.spawnEffectSpark(
              p.position,
              sparkColor,
              Math.random() < 0.85,
              sparkVel,
              sparkPhase,
              sparkLife
            );
          }
        }
      }

      if (p.effectType === 'sparking-v2' && p.baseColor.r + p.baseColor.g + p.baseColor.b > 0.01) {
        const sparkleChance = 0.38 * Math.pow(1.0 - lifeRatio, 1.8);
        if (Math.random() < sparkleChance) {
          const roll = Math.random();
          let sparkColor;
          if (roll < 0.52) {
            sparkColor = new THREE.Color(0xff8800).lerp(
              new THREE.Color(0xffd700),
              Math.random()
            );
          } else if (roll < 0.82) {
            sparkColor = new THREE.Color(0xffffff).lerp(
              new THREE.Color(0xfffacd),
              Math.random()
            );
          } else {
            sparkColor = new THREE.Color(0x444444);
          }

          const sparkVel = new THREE.Vector3(
            (Math.random() - 0.5) * 4.5,
            -3.0 - Math.random() * 5.0,
            (Math.random() - 0.5) * 4.5
          );
          const groupIndex = Math.floor(p.particleIndex / 12);
          const sparkPhase = groupIndex * 180;
          const sparkLife = 0.3 + Math.random() * 0.25;

          this.trailSystem.spawnEffectSpark(
            p.position,
            sparkColor,
            Math.random() < 0.85,
            sparkVel,
            sparkPhase,
            sparkLife
          );
        }
      }

      // 3. Visual properties calculation (color, size, opacity)
      const heightProfile = p.heightProfile ?? { sizeMultiplier: 1, brightnessMultiplier: 1 };
      const brightnessOpacityScale = Math.min(
        Math.max(
          0.82 + (heightProfile.brightnessMultiplier - 1) * 0.24,
          0.72
        ),
        1.15
      );
      let baseOpacity = brightnessOpacityScale;

      if (lifeRatio > BURST_DISSOLVE_START) {
        const dissolveT = THREE.MathUtils.clamp(
          (lifeRatio - BURST_DISSOLVE_START) / (1 - BURST_DISSOLVE_START),
          0,
          1
        );
        baseOpacity = Math.max(
          Math.pow(1 - dissolveT, BURST_FADE_EXPONENT) * brightnessOpacityScale,
          (1 - dissolveT) * 0.08
        );
      }

      const opacity = BurstEffectProcessor.materialOpacity(
        p.effectType,
        p.age,
        p.maxLife,
        baseOpacity
      );

      // Color sweep
      let r = p.baseColor.r;
      let g = p.baseColor.g;
      let b = p.baseColor.b;

      if (p.effectType === 'sparking') {
        const randomOffset = ((p.particleIndex * 7) % 11) * 0.01;
        const transitionStart = 0.46 + randomOffset;
        const transitionEnd = transitionStart + 0.08;

        if (p.particleIndex % 2 !== 0) {
          if (lifeRatio > transitionEnd) {
            r = 0; g = 0; b = 0;
          } else if (lifeRatio > transitionStart) {
            const fade = (transitionEnd - lifeRatio) / (transitionEnd - transitionStart);
            r = p.baseColor.r * fade;
            g = p.baseColor.g * fade;
            b = p.baseColor.b * fade;
          }
        }
      } else if (p.effectType === 'white-strobe') {
        if (lifeRatio > 0.5) {
          const timeMs = (p.age + p.phase) * 1000;
          const strobeFreq = Math.max(150, 450 - (lifeRatio - 0.5) * 600) * strobeFreqMultiplier;
          const isBlinking = Math.floor(timeMs / strobeFreq) % 3 === 0;
          const blink = isBlinking ? 1.0 : 0.05;
          r = blink;
          g = blink;
          b = blink;
        }
      } else if (p.effectType === 'glitter-strobe' || p.effectType === 'falling-comets-glitter') {
        const timeMs = (p.age + p.phase) * 1000;
        const strobeFreq = 90 * strobeFreqMultiplier;
        const isBlinking = Math.floor(timeMs / strobeFreq) % 4 === 0;
        const blink = isBlinking ? 1.5 : 0.0;
        r = blink;
        g = blink;
        b = blink;
      } else if (
        p.isDyingEmber
        || (p.preset?.shellType === 'crysanthemumNestedChild' && p.preset?.strobe)
      ) {
        const timeMs = (p.age + p.phase) * 1000;
        const strobeFreq = 120 * strobeFreqMultiplier;
        const isBlinking = Math.floor(timeMs / strobeFreq) % 7 === 0;
        const blink = isBlinking ? 1.5 : 0.06;

        const lifeRatio = p.maxLife > 0 ? p.age / p.maxLife : 1;
        const coolFactor = Math.pow(1.0 - lifeRatio, 0.85);

        r = p.baseColor.r * blink * coolFactor;
        g = p.baseColor.g * blink * coolFactor;
        b = p.baseColor.b * blink * coolFactor;
      } else if (
        (p.effectType === 'strobe' || p.preset?.strobe)
        && p.preset?.shellType !== 'crysanthemumNested'
      ) {
        const timeMs = (p.age + p.phase) * 1000;
        const strobeFreq = 150 * strobeFreqMultiplier;
        const isBlinking = Math.floor(timeMs / strobeFreq) % 3 === 0;
        const blink = isBlinking ? 1.0 : 0.0;

        if (p.preset?.shellType === 'strobe') {
          r = blink;
          g = blink;
          b = blink;
        } else {
          r = p.baseColor.r * blink;
          g = p.baseColor.g * blink;
          b = p.baseColor.b * blink;
        }
      } else if (p.effectType === 'ghost') {
        const sweep = (lifeRatio / 0.8) * 3.0 - 1.5;
        let intensity = 0;
        if (p.ghostDot < sweep) {
          intensity = 1.0;
        } else if (p.ghostDot < sweep + 0.4) {
          intensity = 1.0 - ((p.ghostDot - sweep) / 0.4);
        }
        r = p.baseColor.r * intensity;
        g = p.baseColor.g * intensity;
        b = p.baseColor.b * intensity;
      } else if (p.effectType === 'crysanthemum-cc' && p.color2) {
        let activeColor = p.baseColor;
        let fade = 1.0;

        if (lifeRatio < 0.4) {
          activeColor = p.baseColor;
          fade = 1.0;
        } else if (lifeRatio < 0.5) {
          activeColor = p.baseColor;
          fade = (0.5 - lifeRatio) / 0.1;
        } else if (lifeRatio < 0.6) {
          activeColor = p.color2;
          fade = (lifeRatio - 0.5) / 0.1;
        } else {
          activeColor = p.color2;
          fade = 1.0;
        }

        r = activeColor.r * fade;
        g = activeColor.g * fade;
        b = activeColor.b * fade;
      } else if (p.effectType === 'crysanthemum-spiral' || p.effectType === 'crysanthemum-spiral-v2') {
        if (!isSpiralIgnited) {
          // Giai đoạn tiền kích hoạt: tia lửa ẩn tối rất mờ (0.02) lướt êm trong không trung
          r = p.baseColor.r * 0.02;
          g = p.baseColor.g * 0.02;
          b = p.baseColor.b * 0.02;
        } else {
          // Giai đoạn bắt lửa: bừng sáng chói lọi và rực rỡ đuôi hoa cúc
          r = Math.min(2.0, p.baseColor.r * spiralFlashBonus);
          g = Math.min(2.0, p.baseColor.g * spiralFlashBonus);
          b = Math.min(2.0, p.baseColor.b * spiralFlashBonus);
        }
      } else if (hasGhostFlare) {
        if (lifeRatio < 0.32) {
          r = p.baseColor.r;
          g = p.baseColor.g;
          b = p.baseColor.b;
        } else if (lifeRatio <= 0.60) {
          r = p.baseColor.r * 0.02;
          g = p.baseColor.g * 0.02;
          b = p.baseColor.b * 0.02;
        } else {
          const flashProgress = (lifeRatio - 0.60) / 0.40;
          const reigniteIntensity = 1.6 * (1.0 - flashProgress * 0.4);
          r = Math.min(2.0, p.baseColor.r * reigniteIntensity);
          g = Math.min(2.0, p.baseColor.g * reigniteIntensity);
          b = Math.min(2.0, p.baseColor.b * reigniteIntensity);
        }
      } else if (p.effectType === 'double-helix') {
        if (p.color2) {
          const strandFactor = (p.particleIndex % 2 === 0) ? 0.0 : 0.4;
          const blendT = Math.min(1.0, lifeRatio * 0.7 + strandFactor);
          const activeR = p.baseColor.r * (1.0 - blendT) + p.color2.r * blendT;
          const activeG = p.baseColor.g * (1.0 - blendT) + p.color2.g * blendT;
          const activeB = p.baseColor.b * (1.0 - blendT) + p.color2.b * blendT;
          r = activeR * 1.15;
          g = activeG * 1.15;
          b = activeB * 1.15;
        }
      }

      p.color.setRGB(r, g, b);

      // Calculate size
      const baseSize = (p.preset?.particleSize ?? BASE_BURST_POINT_SIZE) * heightProfile.sizeMultiplier;
      p.renderSize = baseSize;
      p.renderOpacity = opacity;

      activeParticles.push(p);
    }

    this.burstParticles = activeParticles;

    if (nestedBurstsToSpawn.length > 0) {
      // Chỉ phát 1 sự kiện crackle đại diện để bảo vệ EventBus và AudioEngine
      const firstBurst = nestedBurstsToSpawn[0];
      this.emitFireworkEvent(
        'firework:crackle',
        {
          position: {
            x: firstBurst.position.x,
            y: firstBurst.position.y,
            z: firstBurst.position.z
          }
        }
      );

      for (let i = 0; i < nestedBurstsToSpawn.length; i++) {
        const burst = nestedBurstsToSpawn[i];
        const childPreset = {
          shellType: 'crysanthemumNestedChild',
          shapeType: 'sphere',
          effectType: 'standard',
          dynamicsType: 'standard',
          effects: [],
          shellSize: 0.55,
          particleSize: 18.0,
          starLife: 350,
          particleCountMultiplier: 0.1,
          isNestedChild: true,
          crackle: false,
          strobe: burst.strobe
        };
        this.createBurst(
          burst.position,
          burst.color,
          'sphere',
          childPreset,
          burst.shellId + '-nested-child-' + i
        );
      }
    }

    const count = Math.min(
      this.burstParticles.length,
      this.maxBurstParticles
    );

    // 4. Fill Geometry Buffers
    for (let i = 0; i < count; i++) {
      const p = this.burstParticles[i];

      this.burstPositionsArray[i * 3] = p.position.x;
      this.burstPositionsArray[i * 3 + 1] = p.position.y;
      this.burstPositionsArray[i * 3 + 2] = p.position.z;

      this.burstColorsArray[i * 3] = p.color.r;
      this.burstColorsArray[i * 3 + 1] = p.color.g;
      this.burstColorsArray[i * 3 + 2] = p.color.b;

      this.burstSizesArray[i] = p.renderSize;
      this.burstOpacitiesArray[i] = p.renderOpacity;
    }

    // Hide remaining spots
    for (let i = count; i < this.allocatedMaxBurstParticles; i++) {
      this.burstPositionsArray[i * 3] = 0;
      this.burstPositionsArray[i * 3 + 1] = -99999;
      this.burstPositionsArray[i * 3 + 2] = 0;

      this.burstColorsArray[i * 3] = 0;
      this.burstColorsArray[i * 3 + 1] = 0;
      this.burstColorsArray[i * 3 + 2] = 0;

      this.burstSizesArray[i] = 0;
      this.burstOpacitiesArray[i] = 0;
    }

    // Mark geometry attributes for update
    this.globalBurstGeometry.getAttribute('position').needsUpdate = true;
    this.globalBurstGeometry.getAttribute('color').needsUpdate = true;
    this.globalBurstGeometry.getAttribute('aSize').needsUpdate = true;
    this.globalBurstGeometry.getAttribute('aOpacity').needsUpdate = true;
    this.globalBurstGeometry.setDrawRange(0, count);
  }

  clear() {
    this.activeFireworks = [];
    this.instancedShellRenderer.update([]);
    this.burstParticles = [];
    this.scheduledBursts = [];
    this.updateBurstParticles(0);
  }

  burstAll() {
    const toBurst = this.activeFireworks.filter(
      (item) => item.type === 'shell' && item.state === ShellEntity.STATE.LAUNCHING
    );
    for (const shell of toBurst) {
      shell.velocity.y = -1; // Force burst on next frame
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

    // Update scheduled staged bursts
    if (this.scheduledBursts && this.scheduledBursts.length > 0) {
      for (let i = this.scheduledBursts.length - 1; i >= 0; i--) {
        const scheduled = this.scheduledBursts[i];
        scheduled.timeRemaining -= deltaTime;
        if (scheduled.timeRemaining <= 0) {
          this.createBurst(
            scheduled.position,
            scheduled.color,
            scheduled.shape,
            scheduled.preset,
            scheduled.shellId
          );
          this.scheduledBursts.splice(i, 1);
        }
      }
    }

    const finished = [];

    for (const item of this.activeFireworks) {
      if (item.type === 'shell') {
        this.handleShellUpdate(
          item,
          deltaTime,
          finished
        );
      }
    }

    this.activeFireworks = this.activeFireworks.filter(
      (item) => !finished.includes(item)
    );

    const shells = this.activeFireworks.filter(
      (item) => item.type === 'shell'
    );
    this.instancedShellRenderer.update(shells);

    // Update global burst particles
    this.updateBurstParticles(deltaTime);
  }
}
