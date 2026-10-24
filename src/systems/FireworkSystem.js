import * as THREE from 'three';
import { LAUNCH_ZONE_CONFIG } from '../config/launchZone.js';
import { ShellEntity } from '../entities/ShellEntity.js';
import { ShellPresetFactory } from '../factories/ShellPresetFactory.js';
import { BurstShapeGenerator } from '../factories/BurstShapeGenerator.js';
import { BurstEffectProcessor } from '../factories/BurstEffectProcessor.js';
import { BurstParticleFactory } from '../factories/BurstParticleFactory.js';
import { resolveSecondBurstConfig } from '../factories/FireworkCompositionHelper.js';
import { globalEventBus } from '../core/EventBus.js';
import { InstancedShellRenderer } from '../render/InstancedShellRenderer.js';
import { FIREWORK_CONFIG } from '../config/fireworks.js';
import { LAYER_REFLECTION } from '../config/layers.js';
import { atmosphereManager } from '../environment/AtmosphereManager.js';
import { renderingConfig } from '../config/rendering.js';

const GRAVITY = FIREWORK_CONFIG.GRAVITY;
const BASE_BURST_PARTICLES = FIREWORK_CONFIG.BURST.baseParticles;
const MIN_BURST_PARTICLES = FIREWORK_CONFIG.BURST.minParticles;
const MAX_BURST_PARTICLES = FIREWORK_CONFIG.BURST.maxParticles;
const BURST_SPEED = FIREWORK_CONFIG.BURST.baseSpeed;
const BURST_LIFE = FIREWORK_CONFIG.BURST.baseLife;
const BURST_DISSOLVE_START = FIREWORK_CONFIG.BURST.dissolveStart;
const BURST_BASE_DRAG = FIREWORK_CONFIG.BURST.baseDrag ?? 2.2;
const BURST_DRAG_JITTER = FIREWORK_CONFIG.BURST.dragJitter ?? 0.5;
const BURST_SPEED_JITTER = FIREWORK_CONFIG.BURST.speedJitter ?? 0.15;
const BURST_LIFE_JITTER = FIREWORK_CONFIG.BURST.lifeJitter ?? 0.20;

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
    this.lastSecondBurstAudioTime = 0;
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
    this.allocatedMaxBurstParticles = 50000; // Pre-allocate for high particle limits
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

    this.burstUniforms = {
      uEdgeSoftness: {
        value: renderingConfig.post?.particleEdgeSoftness ?? 0.75
      }
    };

    this.globalBurstMaterial = new THREE.PointsMaterial({
      vertexColors: true,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.globalBurstMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.uEdgeSoftness = this.burstUniforms.uEdgeSoftness;
      this.burstShader = shader;

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
        uniform float uEdgeSoftness;
        varying float vOpacity;
      ` + shader.fragmentShader.replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>
        
        vec2 coord = gl_PointCoord - vec2(0.5);
        float dist = length(coord) * 2.0;
        if (dist > uEdgeSoftness) discard;
        
        vec4 stop0 = vec4(1.0, 1.0, 1.0, 1.0);
        vec4 stop1 = vec4(diffuseColor.rgb, 0.34);
        vec4 stop2 = vec4(diffuseColor.rgb, 0.16);
        vec4 stop3 = vec4(diffuseColor.rgb, 0.0);
        
        float outerStart = min(0.32, uEdgeSoftness * 0.45);
        vec4 gradientColor;
        if (dist < 0.024) {
            gradientColor = stop0;
        } else if (dist < min(0.125, outerStart)) {
            float t = (dist - 0.024) / max(0.001, min(0.125, outerStart) - 0.024);
            gradientColor = mix(stop0, stop1, t);
        } else if (dist < outerStart) {
            float t = (dist - min(0.125, outerStart)) / max(0.001, outerStart - min(0.125, outerStart));
            gradientColor = mix(stop1, stop2, t);
        } else {
            float t = (dist - outerStart) / max(0.001, uEdgeSoftness - outerStart);
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

    // Global Burst Velocity Lines (Option 1: Directional velocity streak rendering)
    this.burstLinePositionsArray = new Float32Array(
      this.allocatedMaxBurstParticles * 2 * 3
    );
    this.burstLineColorsArray = new Float32Array(
      this.allocatedMaxBurstParticles * 2 * 3
    );

    this.burstLinesGeometry = new THREE.BufferGeometry();
    this.burstLinesPositionsAttr = new THREE.BufferAttribute(
      this.burstLinePositionsArray,
      3
    );
    this.burstLinesColorsAttr = new THREE.BufferAttribute(
      this.burstLineColorsArray,
      3
    );
    this.burstLinesGeometry.setAttribute(
      'position',
      this.burstLinesPositionsAttr
    );
    this.burstLinesGeometry.setAttribute(
      'color',
      this.burstLinesColorsAttr
    );
    this.burstLinesGeometry.setDrawRange(0, 0);

    this.burstLinesMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.burstLines = new THREE.LineSegments(
      this.burstLinesGeometry,
      this.burstLinesMaterial
    );
    this.burstLines.frustumCulled = false;
    this.burstLines.layers.enable(LAYER_REFLECTION);
    this.scene.add(this.burstLines);

    this.scheduledBursts = [];

    this.burstPositionsAttr = this.globalBurstGeometry.getAttribute('position');
    this.burstColorsAttr = this.globalBurstGeometry.getAttribute('color');
    this.burstSizesAttr = this.globalBurstGeometry.getAttribute('aSize');
    this.burstOpacitiesAttr = this.globalBurstGeometry.getAttribute('aOpacity');
    this.activeShellIdsSet = new Set();

    this.eventSubscriptions = [];
    this.setGraphicsQuality(
      (typeof localStorage !== 'undefined' && localStorage?.getItem)
        ? localStorage.getItem('graphics_quality') || 'medium'
        : 'medium'
    );
    this.eventSubscriptions.push(
      globalEventBus.on(
        'graphics:quality',
        (quality) => {
          this.setGraphicsQuality(quality);
        }
      ),
      globalEventBus.on(
        'firework:clear',
        () => {
          this.clear();
        }
      )
    );
  }

  setParticleEdgeSoftness(value) {
    if (
      this.burstUniforms &&
      this.burstUniforms.uEdgeSoftness
    ) {
      this.burstUniforms.uEdgeSoftness.value = value;
    }
    if (
      this.trailSystem &&
      typeof this.trailSystem.setParticleEdgeSoftness === 'function'
    ) {
      this.trailSystem.setParticleEdgeSoftness(value);
    }
  }

  getParticleEdgeSoftness() {
    return this.burstUniforms?.uEdgeSoftness?.value ??
      renderingConfig.post?.particleEdgeSoftness ??
      0.75;
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

    const isCustomColor = Boolean(color)
      || Boolean(effectOverrides?.color)
      || Boolean(shellPreset.hasCustomColor)
      || Boolean(shellPreset.customColor);
    shellPreset.hasCustomColor = isCustomColor;

    const finalColorHex = color
      ? color
      : (shellPreset.color ? shellPreset.color : FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)]);
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
          hasCustomColor: isCustomColor,
          sound: shellPreset.sound || null,
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
      const isStrobeManual = (Array.isArray(shellPreset.effects) && shellPreset.effects.includes('strobe'))
        || shellPreset.effectType === 'strobe'
        || Boolean(shellPreset.strobe);
      const isDyingEmberManual = Boolean(shellPreset.isDyingEmber);
      const instantLifeMul = (shellPreset?.starLifeMultiplier !== undefined && !isNaN(Number(shellPreset.starLifeMultiplier)))
        ? Math.max(0.2, Number(shellPreset.starLifeMultiplier))
        : 1.0;
      const hasBurstSmoke = !hasNoBurst && (
        (Array.isArray(shellPreset.effects) && shellPreset.effects.some(
          (e) => (typeof e === 'object' && e !== null ? (e.type || e.key) : e) === 'burst-smoke'
        ))
        || Boolean(shellPreset['burst-smoke'])
        || Boolean(shellPreset.burstSmoke)
      );

      this.emitFireworkEvent(
        'firework:burst',
        {
          shellId,
          shellType: shellPreset.shellType ?? shellPreset.shapeType,
          shapeType: shellPreset.shapeType,
          effectType: shellPreset.effectType,
          effects: shellPreset.effects,
          hasBurstSmoke,
          burstSmoke: hasBurstSmoke,
          sound: shellPreset.sound || null,
          noBurstSound: hasNoBurst || Boolean(shellPreset.noBurstSound),
          colorHex: finalColor.getHex(),
          position: {
            x: burstPos.x,
            y: burstPos.y,
            z: burstPos.z
          },
          intensity: normalizedEnergy,
          duration: 1.25 + normalizedEnergy * 1.1,
          particleLife: BURST_LIFE * (isDyingEmberManual ? 2.0 : 1.0) * instantLifeMul,
          isStrobe: isStrobeManual
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
        hasCustomColor: isCustomColor,
        sound: shellPreset.sound || null,
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

    // Vận tốc tạt nghiêng theo angleOffset (tính bằng tan(angleOffset) với ngưỡng an toàn tối đa 85 độ)
    const maxTiltRad = 85 * (Math.PI / 180);
    const safeAngle = THREE.MathUtils.clamp(
      angleOffset,
      -maxTiltRad,
      maxTiltRad
    );
    const tiltLateral = launchSpeedY * Math.tan(safeAngle);

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
      || type === 'sparklingcometbranches'
      || type === 'sparkling_comet_branches'
      || preset.shapeType === 'sparkling-branches'
      || preset.dynamicsType === 'sparkling-branch-comet'
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
      shellType === 'sparklingcometbranches'
      || shellType === 'sparkling_comet_branches'
      || preset?.shapeType === 'sparkling-branches'
    ) {
      const numBranches = preset?.branchCount ?? (5 + Math.floor(Math.random() * 2));
      const cometsPerBranch = preset?.cometsPerBranch ?? (4 + Math.floor(Math.random() * 2));
      const baseRotationAngle = Math.random() * Math.PI * 2;

      for (let b = 0; b < numBranches; b++) {
        const branchAzimuth = baseRotationAngle + (b / numBranches) * Math.PI * 2 + (Math.random() - 0.5) * 0.22;
        // Phân bổ đa tầng góc bắn 3D: từ ngang (-0.1 rad), xiên trung (0.28 rad) đến vút cao (0.65 rad)
        const tier = b % 3;
        const basePitch = tier === 0 ? 0.62 : (tier === 1 ? 0.28 : -0.08);
        const branchPitch = basePitch + (Math.random() - 0.5) * 0.12;

        const branchDir = new THREE.Vector3(
          Math.cos(branchAzimuth) * Math.cos(branchPitch),
          Math.sin(branchPitch),
          Math.sin(branchAzimuth) * Math.cos(branchPitch)
        ).normalize();

        const u = Math.abs(branchDir.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
        const right = new THREE.Vector3().crossVectors(branchDir, u).normalize();
        const up = new THREE.Vector3().crossVectors(right, branchDir).normalize();

        for (let c = 0; c < cometsPerBranch; c++) {
          const subColor = color.clone().offsetHSL(
            (Math.random() - 0.5) * 0.04,
            (Math.random() - 0.5) * 0.08,
            (Math.random() - 0.5) * 0.12
          );

          // Xòe nón rộng hơn cho các tia trong từng hướng
          const coneAngle = 0.04 + Math.random() * 0.12;
          const coneAzimuth = Math.random() * Math.PI * 2;
          // Tốc độ bung tỏa nhanh, dứt khoát và uy lực
          const speed = 78 + Math.random() * 34;

          const cometDir = branchDir.clone()
            .addScaledVector(right, Math.cos(coneAzimuth) * Math.sin(coneAngle))
            .addScaledVector(up, Math.sin(coneAzimuth) * Math.sin(coneAngle))
            .normalize();

          const velocity = cometDir.multiplyScalar(speed);
          if (parentVelocity) {
            velocity.addScaledVector(parentVelocity, 0.18);
          }

          const targetHeight = burstPosition.y + 950;
          const subPreset = this.shellPresetFactory.basePreset(0.55);
          subPreset.shellType = 'sparklingCometBranchChild';
          subPreset.isBouquetComet = true;
          subPreset.sparkleAtEnd = true;
          subPreset.thinTrail = true;
          subPreset.launchTrail = true;
          subPreset.noBurst = true;
          subPreset.strobe = false;
          subPreset.gravityScale = 0.52;
          subPreset.starLife = 1800 + Math.random() * 500;
          subPreset.trailLifeMultiplier = 0.85;
          subPreset.trailChance = 1.0;
          subPreset.color = subColor.getHex();

          const subShell = this.createShell(
            burstPosition.clone(),
            velocity,
            targetHeight,
            subColor,
            subPreset,
            shellId + '-branch-' + b + '-comet-' + c
          );

          this.activeFireworks.push(subShell);
          this.diagnostics.launched += 1;
        }
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

  triggerTadpoleBurstShell(
    burstPosition,
    color,
    preset,
    shellId,
    burstDirection = null,
    parentVelocity = null
  ) {
    const burstCfg = FIREWORK_CONFIG.COMET_TADPOLE?.burstShell || {};
    const countMin = burstCfg.clusterCountMin || 18;
    const countMax = burstCfg.clusterCountMax || 26;
    const clusterCount = preset?.clusterCount
      ?? (countMin + Math.floor(Math.random() * (countMax - countMin + 1)));
    const speedMin = burstCfg.burstSpeedMin || 45.0;
    const speedMax = burstCfg.burstSpeedMax || 68.0;
    const childStarLife = burstCfg.childStarLife || 2.2;
    const gravityScale = burstCfg.gravityScale || 0.45;

    for (let i = 0; i < clusterCount; i++) {
      // Fibonacci sphere distribution for uniform 3D spherical dispersion
      const t = (i + 0.5) / clusterCount;
      const phi = Math.acos(1 - 2 * t);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;

      let outwardDir = new THREE.Vector3(
        Math.cos(theta) * Math.sin(phi),
        Math.cos(phi),
        Math.sin(theta) * Math.sin(phi)
      ).normalize();

      // Tránh để tia phóng thẳng xuống đất
      if (outwardDir.y < -0.32) {
        outwardDir.y = -0.32;
        outwardDir.normalize();
      }

      const speed = speedMin + Math.random() * (speedMax - speedMin);
      const childVel = outwardDir.multiplyScalar(speed);
      if (parentVelocity) {
        childVel.addScaledVector(parentVelocity, 0.15);
      }

      const childColor = color.clone().offsetHSL(
        (Math.random() - 0.5) * 0.06,
        0.05,
        0.08
      );

      const childPreset = {
        shellType: 'comet_tadpole_burst',
        dynamicsType: 'tadpole-spiral',
        isTadpole: true,
        maxDecayTime: childStarLife * (0.85 + Math.random() * 0.3),
        gravityScale,
        thickTrail: false,
        thinTrail: true,
        launchTrail: true,
        burstSmoke: false,
        noSmoke: true,
        launchSmoke: false
      };

      globalEventBus.emit(
        'comet:spawn',
        {
          position: burstPosition.clone(),
          velocity: childVel,
          color: childColor,
          preset: childPreset
        }
      );
    }

    if (this.trailSystem && typeof this.trailSystem.spawnEffectSpark === 'function') {
      for (let s = 0; s < 36; s++) {
        const sparkPos = burstPosition.clone().add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 4.5,
            (Math.random() - 0.5) * 4.5,
            (Math.random() - 0.5) * 4.5
          )
        );
        this.trailSystem.spawnEffectSpark(
          sparkPos,
          color,
          true,
          null,
          Math.random() * 1000,
          0.60 + Math.random() * 0.35,
          false
        );
      }
    }
  }

  spawnBurstParticleArrowSparks(p, parentFade = 1.0) {
    if (!this.trailSystem || typeof this.trailSystem.spawnTrailParticle !== 'function') return;

    const v = p.velocity;
    const speed = v.length();
    if (speed < 0.8) return;

    const dir = v.clone().normalize();
    const upVec = Math.abs(dir.y) > 0.88 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const rightVec = new THREE.Vector3().crossVectors(dir, upVec).normalize();
    const forwardVec = new THREE.Vector3().crossVectors(rightVec, dir).normalize();

    const tadpoleCfg = FIREWORK_CONFIG.COMET_TADPOLE || {};
    const sizeScale = p?.tadpoleSizeScale ?? 1.0;
    const densityScale = p?.tadpoleDensityScale ?? 1.0;
    const deflectionScale = p?.tadpoleDeflectionScale ?? 1.0;

    const standoffDist = tadpoleCfg.standoffDistance ?? 0.25;
    const spawnPos = p.position.clone().addScaledVector(
      dir,
      -standoffDist
    );
    const brightness = (tadpoleCfg.sparkBrightnessMultiplier ?? 4.2) * parentFade * (0.85 + 0.3 * Math.random());
    const baseCount = 1 + (Math.random() < 0.45 ? 1 : 0);
    const count = Math.max(1, Math.round(baseCount * densityScale));
    const isStrobe = Boolean(p.isStrobe || (Array.isArray(p.effects) && p.effects.includes('strobe')));
    const speedMin = (tadpoleCfg.arrowSpeedMin ?? 28.0) * sizeScale;
    const speedMax = (tadpoleCfg.arrowSpeedMax ?? 48.0) * sizeScale;
    const needleDrag = tadpoleCfg.needleDragScale ?? 0.38;

    // Hot incandescent flash right at the core/origin of the spiky flurry
    const centerBrightness = (tadpoleCfg.centerCoreBrightness ?? 7.5) * parentFade * Math.min(1.4, Math.max(0.7, sizeScale));
    const centerColor = new THREE.Color(0xffffff)
      .lerp(p.baseColor, 0.25)
      .multiplyScalar(centerBrightness);
    const centerVel = dir.clone().multiplyScalar(2.2);
    this.trailSystem.spawnTrailParticle(
      spawnPos,
      centerColor,
      1.0,
      false,
      0.15 + Math.random() * 0.10,
      1.0,
      isStrobe,
      centerVel,
      0.20,
      1.0,
      false,
      null,
      true
    );

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const coneAngle = (1.05 + Math.random() * 0.40) * Math.min(1.15, Math.max(0.85, sizeScale));
      const radialX = Math.cos(angle) * Math.sin(coneAngle);
      const radialZ = Math.sin(angle) * Math.sin(coneAngle);
      const backScale = -Math.cos(coneAngle) * 0.45;

      const ejectDir = new THREE.Vector3()
        .addScaledVector(rightVec, radialX)
        .addScaledVector(forwardVec, radialZ)
        .addScaledVector(dir, backScale)
        .normalize();

      const ejectSpeed = (speedMin + Math.random() * (speedMax - speedMin)) * 0.65;
      const sparkVel = ejectDir.multiplyScalar(ejectSpeed);
      sparkVel.addScaledVector(v, 0.25);

      const sparkColor = p.baseColor.clone().offsetHSL(
        (Math.random() - 0.5) * 0.04,
        0.08,
        0.30 + Math.random() * 0.16
      ).multiplyScalar(brightness);

      const sparkLife = (tadpoleCfg.arrowStarLife ?? 0.48)
        * Math.sqrt(sizeScale)
        * (0.8 + Math.random() * 0.35);

      this.trailSystem.spawnTrailParticle(
        spawnPos,
        sparkColor,
        1.0,
        false,
        sparkLife,
        1.0,
        isStrobe,
        sparkVel,
        0.20,
        needleDrag,
        false,
        null,
        true
      );
    }

    if (p.crackle && Math.random() < 0.10 && typeof this.trailSystem.spawnMicroCrackle === 'function') {
      this.trailSystem.spawnMicroCrackle(spawnPos, p.baseColor);
    }

    // Reactive kick to deflect particle trajectory erratically
    if (v && deflectionScale > 0.05) {
      const kickBase = tadpoleCfg.variance?.kickImpulseBase ?? 2.8;
      const kickAngle = Math.random() * Math.PI * 2;
      const kickMag = kickBase * deflectionScale * (0.7 + Math.random() * 0.6);
      const kickVec = new THREE.Vector3()
        .addScaledVector(rightVec, Math.cos(kickAngle) * kickMag)
        .addScaledVector(forwardVec, Math.sin(kickAngle) * kickMag);
      v.add(kickVec);
    }
  }

  spawnBurstParticleFlurry(p, parentFade = 1.0) {
    if (!this.trailSystem || typeof this.trailSystem.spawnTrailParticle !== 'function') return;

    const v = p.velocity;
    const dir = v && v.lengthSq() > 0.01 ? v.clone().normalize() : new THREE.Vector3(0, 1, 0);
    const upVec = Math.abs(dir.y) > 0.88 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const rightVec = new THREE.Vector3().crossVectors(dir, upVec).normalize();
    const forwardVec = new THREE.Vector3().crossVectors(rightVec, dir).normalize();

    const tadpoleCfg = FIREWORK_CONFIG.COMET_TADPOLE || {};
    const sizeScale = p?.tadpoleSizeScale ?? 1.0;
    const densityScale = p?.tadpoleDensityScale ?? 1.0;
    const deflectionScale = p?.tadpoleDeflectionScale ?? 1.0;

    const standoffDist = tadpoleCfg.standoffDistance ?? 0.25;
    const spawnPos = p.position.clone().addScaledVector(
      dir,
      -standoffDist
    );
    const brightness = (tadpoleCfg.sparkBrightnessMultiplier ?? 4.2) * parentFade;
    const baseCount = 5 + Math.floor(Math.random() * 4);
    const flurryCount = Math.max(3, Math.round(baseCount * densityScale));
    const isStrobe = Boolean(p.isStrobe || (Array.isArray(p.effects) && p.effects.includes('strobe')));
    const speedMin = (tadpoleCfg.arrowSpeedMin ?? 28.0) * sizeScale;
    const speedMax = (tadpoleCfg.arrowSpeedMax ?? 48.0) * sizeScale;
    const needleDrag = tadpoleCfg.needleDragScale ?? 0.38;

    // Hot incandescent flash right at the core/origin of the spiky flurry
    const centerBrightness = (tadpoleCfg.centerCoreBrightness ?? 7.5) * 1.15 * parentFade * sizeScale;
    const centerColor = new THREE.Color(0xffffff)
      .lerp(p.baseColor, 0.20)
      .multiplyScalar(centerBrightness);
    this.trailSystem.spawnTrailParticle(
      spawnPos,
      centerColor,
      1.0,
      true,
      0.18 + Math.random() * 0.10,
      1.0,
      false,
      null,
      0.0,
      1.0,
      false,
      null,
      true
    );

    for (let i = 0; i < flurryCount; i++) {
      const angle = (i / flurryCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
      const coneAngle = (0.95 + Math.random() * 0.50) * Math.min(1.15, Math.max(0.85, sizeScale));
      const radialX = Math.cos(angle) * Math.sin(coneAngle);
      const radialZ = Math.sin(angle) * Math.sin(coneAngle);
      const backScale = -Math.cos(coneAngle) * 0.40;

      const ejectDir = new THREE.Vector3()
        .addScaledVector(rightVec, radialX)
        .addScaledVector(forwardVec, radialZ)
        .addScaledVector(dir, backScale)
        .normalize();

      const ejectSpeed = (speedMin + Math.random() * (speedMax - speedMin)) * 0.70;
      const subVel = ejectDir.multiplyScalar(ejectSpeed);
      if (v) {
        subVel.addScaledVector(v, 0.20);
      }

      const subColor = p.baseColor.clone().offsetHSL(
        (Math.random() - 0.5) * 0.05,
        0.08,
        0.32 + Math.random() * 0.16
      ).multiplyScalar(brightness);

      const sparkLife = (tadpoleCfg.flurryStarLife ?? 0.58)
        * Math.sqrt(sizeScale)
        * (0.8 + Math.random() * 0.35);

      this.trailSystem.spawnTrailParticle(
        spawnPos,
        subColor,
        1.0,
        false,
        sparkLife,
        1.0,
        isStrobe,
        subVel,
        0.20,
        needleDrag,
        false,
        null,
        true
      );
    }

    if (p.crackle && Math.random() < 0.20 && typeof this.trailSystem.spawnMicroCrackle === 'function') {
      this.trailSystem.spawnMicroCrackle(spawnPos, p.baseColor);
    }

    // Reactive kick to deflect particle trajectory erratically at apex flurry
    if (v && deflectionScale > 0.05) {
      const kickBase = (tadpoleCfg.variance?.kickImpulseBase ?? 2.8) * 1.35;
      const kickAngle = Math.random() * Math.PI * 2;
      const kickMag = kickBase * deflectionScale * (0.6 + Math.random() * 0.8);
      const kickVec = new THREE.Vector3()
        .addScaledVector(rightVec, Math.cos(kickAngle) * kickMag)
        .addScaledVector(forwardVec, Math.sin(kickAngle) * kickMag);
      v.add(kickVec);
    }
  }

  spawnErraticDartStreak(p, parentFade = 1.0) {
    if (!this.trailSystem || typeof this.trailSystem.spawnTrailParticle !== 'function') return;

    const dartCfg = FIREWORK_CONFIG.ERRATIC_DART || {};
    const baseBrightness = parentFade;
    const streakMultiplier = dartCfg.streakBrightnessMultiplier ?? 1.35;
    const streakOpacity = dartCfg.trailOpacity ?? 0.48;
    const isStrobe = Boolean(p.isStrobe || (Array.isArray(p.effects) && p.effects.includes('strobe')));

    const streakVel = p.velocity
      ? p.velocity.clone().multiplyScalar(0.015)
      : new THREE.Vector3(0, 0, 0);

    const whiteCore = new THREE.Color(0xffffff);
    const streakColor = p.baseColor.clone()
      .lerp(whiteCore, 0.18)
      .multiplyScalar(baseBrightness * streakMultiplier);

    const streakLife = (dartCfg.trailParticleLife ?? 0.90) * (0.85 + Math.random() * 0.30);

    this.trailSystem.spawnTrailParticle(
      p.position,
      streakColor,
      1.0,
      false,
      streakLife,
      streakOpacity,
      isStrobe,
      streakVel,
      0.03,
      0.98,
      false,
      null,
      true
    );

    if (p.crackle && Math.random() < 0.15 && typeof this.trailSystem.spawnMicroCrackle === 'function') {
      this.trailSystem.spawnMicroCrackle(p.position, p.baseColor);
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
      const stageEffectKeys = stageEffects.map((e) => (typeof e === 'object' && e !== null ? (e.type || e.key) : e));
      const stagePreset = {
        ...preset,
        multiNested: false,
        stages: null,
        shapeType: stage.shapeType || 'sphere',
        dynamicsType: stage.dynamicsType || 'standard',
        effects: stageEffects,
        shellSize: baseSize * stageScale,
        strobe: stageEffectKeys.includes('strobe') || Boolean(stage.strobe),
        crackle: stageEffectKeys.includes('crackle') || Boolean(stage.crackle),
        noTrail: stageEffectKeys.includes('no-trail') || Boolean(stage.noTrail),
        crossette: stageEffectKeys.includes('crossette') || Boolean(stage.crossette)
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
    const isSecondBurstActive = Boolean(preset?.secondBurst?.enabled || preset?.secondBurstEnabled);
    const secondBurstScale = isSecondBurstActive ? 0.78 : 1.0;

    const resolvedShapeMultiplier = shapeMultiplier[shape] ?? 1;
    const resolvedEffectMultiplier = effectMultiplier[effectType] ?? 1;
    const sizeMultiplier = Math.max(0.6, Math.min(6, preset?.shellSize ?? 1)); // Phụ thuộc vào size (scale theo độ cao)
    const baseMin = (isCrossetteActive || isSecondBurstActive) ? Math.round(MIN_BURST_PARTICLES * 0.6) : MIN_BURST_PARTICLES;
    const minParticles = Math.round(baseMin * this.graphicsQualityMultiplier);
    const maxParticles = Math.round(MAX_BURST_PARTICLES * this.graphicsQualityMultiplier);
    const rawCount = BASE_BURST_PARTICLES * resolvedShapeMultiplier * resolvedEffectMultiplier * crossetteScale * secondBurstScale * presetMultiplier * renderModeMultiplier * performanceScale * sizeMultiplier * this.graphicsQualityMultiplier;

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
    const effectKeys = effectsList.map((e) => (typeof e === 'object' && e !== null ? (e.type || e.key) : e));
    const crackleEnabled = Boolean(preset?.crackle) || effectKeys.includes('crackle');
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

    const isGhostEffect = normalizedEffect === 'ghost'
      || (Array.isArray(preset?.effects) && preset.effects.includes('ghost'))
      || Boolean(preset?.ghost)
      || preset?.shellType === 'ghost';
    const isCCEffect = normalizedEffect === 'crysanthemum-cc'
      || (Array.isArray(preset?.effects) && preset.effects.includes('crysanthemum-cc'))
      || preset?.shellType === 'crysanthemumCC';

    let color2Blend = null;
    if (isGhostEffect || isCCEffect) {
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
    const hasPistil = Boolean(preset?.pistil) && !isGhostEffect && !isCCEffect;
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

    const {
      isCrossetteShell,
      isTadpoleFlurryShell,
      isErraticDartShell,
      hasBurstSmoke: isBurstSmokeActive,
      isLongBurn,
      isApexHang,
      isSlowBurst,
      hasNoTrail
    } = BurstParticleFactory.resolveActiveEffectFlags({
      preset,
      effects: effectsList,
      dynamicsType: normalizedEffect
    });

    const baseLifeMul = (preset?.starLifeMultiplier !== undefined && !isNaN(Number(preset.starLifeMultiplier)))
      ? Math.max(0.2, Number(preset.starLifeMultiplier))
      : (isLongBurn ? (FIREWORK_CONFIG.BURST?.longBurnMultiplier ?? 2.2) : 1.0);
    const isEffectiveLongBurn = isLongBurn || baseLifeMul >= 1.5;

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

    const isSecondBurstShell = Boolean(
      (preset?.secondBurst?.enabled || preset?.secondBurstEnabled)
      && burstParticleCount > 0
    );

    const secondBurstMap = new Map();
    if (isSecondBurstShell) {
      const sbConfig = resolveSecondBurstConfig(preset);
      const childShells = sbConfig.childShells;

      const outerIndices = [];
      for (let k = 0; k < burstParticleCount; k++) {
        const isCore = isCompositeCore && k < coreCount;
        if (!isCore) {
          outerIndices.push(k);
        }
      }
      const availablePool = outerIndices.length >= 8
        ? [...outerIndices]
        : Array.from({ length: burstParticleCount }, (_, idx) => idx);

      // Fisher-Yates shuffle the pool for fair random sampling
      for (let k = 0; k < availablePool.length; k++) {
        const randIdx = k + Math.floor(Math.random() * (availablePool.length - k));
        const temp = availablePool[k];
        availablePool[k] = availablePool[randIdx];
        availablePool[randIdx] = temp;
      }

      let poolCursor = 0;

      childShells.forEach((child) => {
        const childRatio = typeof child.ratio === 'number' ? child.ratio : 0.20;
        const targetCount = Math.min(
          availablePool.length - poolCursor,
          Math.max(1, Math.round(burstParticleCount * childRatio))
        );

        if (targetCount <= 0) return;

        const assignedIndices = availablePool.slice(poolCursor, poolCursor + targetCount);
        poolCursor += targetCount;

        const baseTiming = typeof child.triggerTiming === 'number' ? child.triggerTiming : 0.50;
        const distMode = child.distributionMode || 'random';

        for (let k = 0; k < assignedIndices.length; k++) {
          const pIdx = assignedIndices[k];
          let timingRatio = baseTiming;

          if (distMode === 'sequential') {
            const tProgress = assignedIndices.length > 1
              ? (k / (assignedIndices.length - 1))
              : 0.5;
            timingRatio = THREE.MathUtils.clamp(
              baseTiming - 0.15 + tProgress * 0.30 + (Math.random() - 0.5) * 0.02,
              0.15,
              0.85
            );
          } else if (distMode === 'random') {
            timingRatio = THREE.MathUtils.clamp(
              baseTiming + (Math.random() - 0.5) * 0.30,
              0.15,
              0.85
            );
          } else {
            // simultaneous with micro-jitter (1-2 frames)
            timingRatio = THREE.MathUtils.clamp(
              baseTiming + (Math.random() - 0.5) * 0.04,
              0.15,
              0.85
            );
          }

          secondBurstMap.set(pIdx, {
            childShell: child,
            timingRatio
          });
        }
      });
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
      let rawDir = null;
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
        rawDir = BurstShapeGenerator.direction(
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

      const useContourMagnitude = (!isCoreParticle && ringPreset?.shapeRenderMode === 'outline' && (particleShape === 'ring' || particleShape === 'heart' || particleShape === 'star')) || (particleShape === 'half-flash') || (particleShape === 'split-flash') || (particleShape === 'galaxy') || (particleShape === 'egg') || (particleShape === 'sphere_rings');
      if (!useContourMagnitude) {
        direction.normalize();
      }

      const sphereSpeedBand = 0.9 + Math.random() * 0.2;
      const defaultSpeedBand = 0.5 + Math.random() * 0.8;
      const coreSpeedBand = 0.34 + Math.random() * 0.18;

      const dynamicsProfile = BurstEffectProcessor.getDynamicsProfile(
        normalizedEffect,
        particleShape,
        isCoreParticle ? preset : ringPreset
      );
      const profileBaseSpeed = dynamicsProfile?.baseSpeed ?? BURST_SPEED;

      let baseSpeed;
      if (isCoreParticle) {
        baseSpeed = profileBaseSpeed * coreSpeedBand;
      } else if (particleShape === 'ring' || particleShape === 'heart' || particleShape === 'star') {
        let speedVariance = 0.12; // Mặc định méo tự nhiên cho heart và star
        if (
          preset?.shellType === 'ring' ||
          preset?.shellType === 'ringV2' ||
          preset?.shellType === 'ring_v2'
        ) {
          speedVariance = 0.015; // Cả ring v1 và ring v2 đều giữ dạng tròn hoàn hảo, không bị biến dạng
        }
        const outlineSpeedBand = 1.0 + (Math.random() - 0.5) * speedVariance;
        baseSpeed = profileBaseSpeed * outlineSpeedBand;
      } else if (particleShape === 'galaxy') {
        baseSpeed = profileBaseSpeed * (1.15 + Math.random() * 0.2);
      } else if (particleShape === 'egg') {
        const eggSpeedBand = 0.96 + Math.random() * 0.08;
        baseSpeed = profileBaseSpeed * eggSpeedBand;
      } else if (particleShape === 'sphere_rings') {
        const ringsSpeedBand = 0.98 + (Math.random() - 0.5) * 0.04;
        baseSpeed = profileBaseSpeed * ringsSpeedBand;
      } else if (particleShape === 'sphere' || particleShape === 'half-flash' || particleShape === 'split-flash') {
        const speedBand = (particleShape === 'half-flash' || particleShape === 'split-flash')
          ? (0.97 + Math.random() * 0.06)
          : sphereSpeedBand;
        baseSpeed = profileBaseSpeed * speedBand;
      } else {
        baseSpeed = profileBaseSpeed * defaultSpeedBand;
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
      const speedJitter = dynamicsProfile?.speedJitter ?? BURST_SPEED_JITTER;
      const speedJitterScale = 1.0 + (Math.random() - 0.5) * (speedJitter * 2);
      const apexSpeedMul = isApexHang
        ? (FIREWORK_CONFIG.BURST?.apexSpeedMultiplier ?? 3.0)
        : 1.0;
      const slowBurstSpeedMul = isSlowBurst
        ? ((FIREWORK_CONFIG.DYNAMICS_PROFILES?.floating?.baseSpeed ?? 36) / (FIREWORK_CONFIG.BURST?.baseSpeed ?? 74))
        : 1.0;
      const speed = baseSpeed *
        (useContourMagnitude ? 1.15 : 1) *
        shellSizeScale *
        speedJitterScale *
        (isDyingEmber ? 0.85 : 1.0) *
        apexSpeedMul *
        slowBurstSpeedMul;

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
      } else if (particleShape === 'sphere_rings' && rawDir?.ringIndex !== undefined) {
        if (preset?.ringColors && Array.isArray(preset.ringColors) && preset.ringColors.length > 0) {
          const ringColorHex = preset.ringColors[rawDir.ringIndex % preset.ringColors.length];
          particleColor = new THREE.Color(ringColorHex);
        } else if (preset?.colorPerRing && color2Blend) {
          particleColor = (rawDir.ringIndex % 2 === 0) ? burstColor : color2Blend;
        } else {
          particleColor = burstColor;
        }
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
        const triggerSpeed = profileBaseSpeed * 1.0 * shellSizeScale;
        particleVelocity = direction.clone().normalize().multiplyScalar(
          triggerSpeed
        );
      } else {
        const lifeJitter = dynamicsProfile?.lifeJitter ?? BURST_LIFE_JITTER;
        const lifeJitterScale = 1.0 + (Math.random() - 0.5) * (lifeJitter * 2);
        const baseMaxLife = BURST_LIFE * lifeJitterScale;
        const apexLifeMul = isApexHang ? 1.35 : 1.0;
        const lifeMultiplier = isEffectiveLongBurn
          ? baseLifeMul
          : (isDyingEmber ? 2.0 * baseLifeMul : apexLifeMul * baseLifeMul);
        particleMaxLife = baseMaxLife * lifeMultiplier;
      }

      const baseParticleDrag = (preset?.drag !== undefined)
        ? preset.drag
        : (dynamicsProfile?.baseDrag ?? BURST_BASE_DRAG);
      const dragJitter = dynamicsProfile?.dragJitter ?? BURST_DRAG_JITTER;
      const dragJitterScale = 1.0 + (Math.random() - 0.5) * (dragJitter * 2);
      const particleDrag = Math.max(
        0.1,
        baseParticleDrag * dragJitterScale
      );

      const hasParticleTadpole = isTadpoleFlurryShell
        && !isDyingEmber
        && (Math.random() < (FIREWORK_CONFIG.COMET_TADPOLE?.burstActivationRatio ?? 0.35));

      const tadpoleVarCfg = FIREWORK_CONFIG.COMET_TADPOLE?.variance || {};
      const isWildTadpole = Math.random() < (tadpoleVarCfg.wildDeflectionChance ?? 0.30);
      const tadpoleDeflectionScale = isWildTadpole
        ? (1.8 + Math.random() * ((tadpoleVarCfg.deflectionMax ?? 3.2) - 1.8))
        : ((tadpoleVarCfg.deflectionMin ?? 0.25) + Math.random() * 0.75);
      const tadpoleSizeScale = (tadpoleVarCfg.sizeMin ?? 0.55)
        + Math.random() * ((tadpoleVarCfg.sizeMax ?? 1.65) - (tadpoleVarCfg.sizeMin ?? 0.55));
      const tadpoleDensityScale = (tadpoleVarCfg.densityMin ?? 0.50)
        + Math.random() * ((tadpoleVarCfg.densityMax ?? 1.80) - (tadpoleVarCfg.densityMin ?? 0.50));

      const hasParticleErraticDart = isErraticDartShell
        && !isDyingEmber
        && (Math.random() < (FIREWORK_CONFIG.ERRATIC_DART?.activationRatio ?? 0.40));

      const particle = BurstParticleFactory.createParticle({
        position,
        velocity: particleVelocity,
        color: finalColorVal,
        baseColor: finalColorVal,
        color2: color2Scaled,
        age: 0,
        maxLife: particleMaxLife,
        isLongBurn: isEffectiveLongBurn,
        isApexHang,
        isSlowBurst,
        effectType: isGhostEffect
          ? 'ghost'
          : (isCCEffect ? 'crysanthemum-cc' : normalizedEffect),
        crackle: !preset?.isNestedChild
          && !isDyingEmber
          && (crackleEnabled || normalizedEffect === 'crackle'),
        crackleTriggered: false,
        phase: (particleShape === 'sphere_rings' && rawDir?.ringIndex !== undefined && rawDir?.ringIndex !== null)
          ? rawDir.ringIndex * 0.75
          : (effectState.phase ? effectState.phase[i] : 0),
        preset,
        heightProfile,
        effectState,
        ghostDot: ghostDotVal,
        spiralIndex: spiralIndexVal,
        isSpiralArm: Boolean(isSpiralArm),
        ringIndex: rawDir?.ringIndex ?? null,
        particleIndex: i,
        totalParticleCount: burstParticleCount,
        shellId: shellId ?? Math.floor(Math.random() * 100000000),
        isDyingEmber,
        isNestedTrigger,
        effects: effectsList,
        hasNoTrail,
        dragCoefficient: particleDrag,
        dynamicsProfile,
        hasBurstSmoke: isBurstSmokeActive,
        burstSmokeLimit: 0.28 + Math.random() * 0.10,
        isCrossette: isCrossetteShell
          && !isDyingEmber
          && crossetteSplitMap.has(i),
        crossetteSplitTime: particleMaxLife * (crossetteSplitMap.get(i) ?? 0.5),
        crossetteSplitDone: false,
        isSecondBurst: isSecondBurstShell
          && !isDyingEmber
          && secondBurstMap.has(i),
        secondBurstConfig: secondBurstMap.get(i)?.childShell || null,
        secondBurstTime: particleMaxLife * (secondBurstMap.get(i)?.timingRatio ?? 0.5),
        secondBurstDone: false,
        hasTadpoleFlurry: hasParticleTadpole,
        tadpoleArrowTimer: Math.random() * 0.065,
        tadpoleDeflectionScale,
        tadpoleSizeScale,
        tadpoleDensityScale,
        hasFlurried: false,
        hasErraticDart: hasParticleErraticDart,
        erraticDartTriggerRatio: (FIREWORK_CONFIG.ERRATIC_DART?.triggerRatioMin ?? 0.70)
          + Math.random() * (
            (FIREWORK_CONFIG.ERRATIC_DART?.triggerRatioMax ?? 0.76)
            - (FIREWORK_CONFIG.ERRATIC_DART?.triggerRatioMin ?? 0.70)
          ),
        erraticDartTriggered: false,
        erraticDartTrailTimer: Math.random() * (FIREWORK_CONFIG.ERRATIC_DART?.trailInterval ?? 0.032),
        erraticDartFlash: 1.0,
        erraticDartWigglePhase: Math.random() * Math.PI * 2,
        erraticDartWiggleFreq: (FIREWORK_CONFIG.ERRATIC_DART?.wobbleFreq ?? 22.0)
          * (0.85 + Math.random() * 0.30),
        erraticDartWiggleAmp: (FIREWORK_CONFIG.ERRATIC_DART?.wobbleAmp ?? 26.0)
          * (0.85 + Math.random() * 0.30)
      });

      newParticles.push(particle);
    }

    if (isTadpoleFlurryShell && newParticles.length > 0 && !newParticles.some((p) => p.hasTadpoleFlurry)) {
      const candidate = newParticles.find((p) => !p.isDyingEmber) || newParticles[0];
      if (candidate) {
        candidate.hasTadpoleFlurry = true;
      }
    }

    if (isErraticDartShell && newParticles.length > 0 && !newParticles.some((p) => p.hasErraticDart)) {
      const candidate = newParticles.find((p) => !p.isDyingEmber) || newParticles[0];
      if (candidate) {
        candidate.hasErraticDart = true;
      }
    }

    for (const p of newParticles) {
      if (this.burstParticles.length >= this.maxBurstParticles) {
        this.burstParticles.shift();
      }
      this.burstParticles.push(p);
    }
  }

  createRandomBurstRotation() {
    return BurstParticleFactory.createRandomBurstRotation();
  }

  spawnSecondBurst(p, activeParticles) {
    if (!p || !p.secondBurstConfig) return;
    const cfg = p.secondBurstConfig;
    const childShape = BurstShapeGenerator.resolveShape(cfg.shapeType || 'sphere');
    const childDynamics = cfg.dynamicsType || 'standard';
    const childScale = typeof cfg.scale === 'number' ? cfg.scale : 0.35;
    const childColor = new THREE.Color(cfg.color || '#ffd700');
    const childEffects = Array.isArray(cfg.effects) ? cfg.effects : [];
    const isInstantBurst = Boolean(cfg.instantBurst);
    const hasPistil = Boolean(cfg.pistil);

    const sbSettings = FIREWORK_CONFIG.SECOND_BURST || {};
    const minP = sbSettings.minParticlesPerChild ?? 8;
    const maxP = sbSettings.maxParticlesPerChild ?? 16;
    const childParticleCount = Math.round(
      THREE.MathUtils.lerp(minP, maxP, (childScale - 0.15) / 0.65) * this.graphicsQualityMultiplier
    );

    const pistilCount = hasPistil
      ? Math.max(4, Math.min(18, Math.round(childParticleCount * 0.4)))
      : 0;

    const totalToSpawn = childParticleCount + pistilCount;
    const maxGlobalBurst = FIREWORK_CONFIG.SYSTEM?.maxBurstParticles ?? 20000;
    if (activeParticles.length + totalToSpawn > maxGlobalBurst) {
      return;
    }

    const instantSpeedMultiplier = isInstantBurst ? 1.25 : 1.0;
    const baseSpeed = (sbSettings.baseSpeed ?? 38)
      * (0.8 + childScale * 0.5)
      * instantSpeedMultiplier;

    const childLife = (sbSettings.defaultLife ?? 0.9)
      * (0.85 + Math.random() * (sbSettings.lifeJitter ?? 0.3));

    const parentVelInheritance = p.velocity.clone().multiplyScalar(0.2);
    const originPos = p.position.clone();
    const burstRotation = this.createRandomBurstRotation();

    const {
      isCrossetteShell,
      isTadpoleFlurryShell,
      isErraticDartShell,
      hasBurstSmoke: isBurstSmokeActive,
      isGhostEffect,
      isCCEffect,
      isLongBurn: isContourLongBurn,
      isApexHang: isContourApexHang,
      isSlowBurst: isContourSlowBurst,
      hasNoTrail: isStageNoTrail
    } = BurstParticleFactory.resolveActiveEffectFlags({
      preset: cfg,
      effects: childEffects,
      dynamicsType: childDynamics
    });

    const childLifeMul = (cfg?.starLifeMultiplier !== undefined && !isNaN(Number(cfg.starLifeMultiplier)))
      ? Math.max(0.2, Number(cfg.starLifeMultiplier))
      : (isContourLongBurn ? (FIREWORK_CONFIG.BURST?.longBurnMultiplier ?? 2.2) : 1.0);

    let childColor2 = null;
    if (cfg.secondColor && cfg.secondColor !== cfg.color) {
      childColor2 = new THREE.Color(cfg.secondColor);
    } else if (isGhostEffect || isCCEffect) {
      childColor2 = childColor.clone();
    }

    const crossetteSplitMap = new Map();
    if (isCrossetteShell && childParticleCount >= 4) {
      const targetCrossetteCount = Math.max(2, Math.min(6, Math.floor(childParticleCount * 0.4)));
      const pool = Array.from({ length: childParticleCount }, (_, idx) => idx);
      for (let k = 0; k < targetCrossetteCount; k++) {
        const randIdx = k + Math.floor(Math.random() * (pool.length - k));
        const temp = pool[k];
        pool[k] = pool[randIdx];
        pool[randIdx] = temp;
      }
      for (let k = 0; k < targetCrossetteCount; k++) {
        const pIdx = pool[k];
        const staggeredRatio = 0.35 + (k / Math.max(1, targetCrossetteCount - 1)) * 0.25;
        crossetteSplitMap.set(pIdx, THREE.MathUtils.clamp(staggeredRatio, 0.30, 0.65));
      }
    }

    const childEffectState = {
      ...BurstEffectProcessor.initialize(
        childDynamics,
        childParticleCount,
        {
          ...cfg,
          effects: childEffects,
          strobe: childEffects.includes('strobe')
            || childEffects.includes('white-strobe')
            || childEffects.includes('glitter-strobe')
            || Boolean(cfg.strobe),
          crackle: childEffects.includes('crackle') || Boolean(cfg.crackle),
          flow: childEffects.includes('flow') || childDynamics === 'flow',
          ghost: isGhostEffect,
          crossette: isCrossetteShell
        }
      ),
      shapeType: childShape
    };

    const dynamicsProfile = BurstEffectProcessor.getDynamicsProfile(
      childDynamics,
      childShape,
      cfg
    );

    // 1. Spawn Outer Shell Particles
    const outerParticles = [];
    for (let k = 0; k < childParticleCount; k++) {
      const angle = (k / childParticleCount) * Math.PI * 2;
      const rawDir = BurstShapeGenerator.direction(
        childShape,
        angle,
        k,
        childParticleCount,
        cfg
      );
      const dir = rawDir.applyQuaternion(burstRotation).normalize();
      const speedVariance = (isInstantBurst ? 0.95 : 0.85) + Math.random() * 0.3;
      const contourApexSpeedMul = isContourApexHang
        ? (FIREWORK_CONFIG.BURST?.apexSpeedMultiplier ?? 3.0)
        : 1.0;
      const contourSlowBurstSpeedMul = isContourSlowBurst
        ? ((FIREWORK_CONFIG.DYNAMICS_PROFILES?.floating?.baseSpeed ?? 36) / (FIREWORK_CONFIG.BURST?.baseSpeed ?? 74))
        : 1.0;
      const vel = dir.multiplyScalar(
        baseSpeed * speedVariance * contourApexSpeedMul * contourSlowBurstSpeedMul
      ).add(parentVelInheritance);

      const hasParticleErraticDart = isErraticDartShell
        && (Math.random() < (FIREWORK_CONFIG.ERRATIC_DART?.activationRatio ?? 0.40));
      const hasParticleTadpole = isTadpoleFlurryShell
        && (Math.random() < (FIREWORK_CONFIG.COMET_TADPOLE?.burstActivationRatio ?? 0.35));

      const tadpoleVarCfg = FIREWORK_CONFIG.COMET_TADPOLE?.variance || {};
      const isWildTadpole = Math.random() < (tadpoleVarCfg.wildDeflectionChance ?? 0.30);
      const tadpoleDeflectionScale = isWildTadpole
        ? (1.8 + Math.random() * ((tadpoleVarCfg.deflectionMax ?? 3.2) - 1.8))
        : ((tadpoleVarCfg.deflectionMin ?? 0.25) + Math.random() * 0.75);
      const tadpoleSizeScale = (tadpoleVarCfg.sizeMin ?? 0.55)
        + Math.random() * ((tadpoleVarCfg.sizeMax ?? 1.65) - (tadpoleVarCfg.sizeMin ?? 0.55));
      const tadpoleDensityScale = (tadpoleVarCfg.densityMin ?? 0.50)
        + Math.random() * ((tadpoleVarCfg.densityMax ?? 1.80) - (tadpoleVarCfg.densityMin ?? 0.50));

      const particle = BurstParticleFactory.createParticle({
        position: originPos,
        velocity: vel,
        color: childColor,
        baseColor: childColor,
        color2: childColor2,
        age: 0,
        maxLife: isContourLongBurn
          ? childLife * (FIREWORK_CONFIG.BURST?.longBurnMultiplier ?? 2.2)
          : childLife * childLifeMul * (isContourApexHang ? 1.35 : 1.0),
        isLongBurn: isContourLongBurn || childLifeMul >= 1.5,
        isApexHang: isContourApexHang,
        isSlowBurst: isContourSlowBurst,
        effectType: isGhostEffect ? 'ghost' : (isCCEffect ? 'crysanthemum-cc' : childDynamics),
        crackle: childEffects.includes('crackle') || Boolean(cfg.crackle),
        phase: (childEffectState.phase && childEffectState.phase[k] !== undefined)
          ? childEffectState.phase[k]
          : Math.random() * Math.PI * 2,
        preset: {
          shapeType: childShape,
          dynamicsType: childDynamics,
          effects: childEffects,
          secondBurst: null
        },
        heightProfile: p.heightProfile,
        effectState: childEffectState,
        particleIndex: k,
        totalParticleCount: childParticleCount,
        shellId: p.shellId,
        effects: childEffects,
        hasNoTrail: isStageNoTrail,
        hasBurstSmoke: isBurstSmokeActive,
        burstSmokeLimit: 0.28 + Math.random() * 0.10,
        isCrossette: isCrossetteShell && crossetteSplitMap.has(k),
        crossetteSplitTime: childLife * (crossetteSplitMap.get(k) ?? 0.5),
        crossetteSplitDone: false,
        renderSize: Math.max(16, (p.renderSize || BASE_BURST_POINT_SIZE) * childScale * 1.35),
        renderOpacity: 0.85,
        isSecondBurstChild: true,
        dynamicsProfile,
        dragCoefficient: dynamicsProfile?.baseDrag ?? BURST_BASE_DRAG,
        hasTadpoleFlurry: hasParticleTadpole,
        tadpoleArrowTimer: Math.random() * 0.065,
        tadpoleDeflectionScale,
        tadpoleSizeScale,
        tadpoleDensityScale,
        hasErraticDart: hasParticleErraticDart,
        erraticDartTriggerRatio: (FIREWORK_CONFIG.ERRATIC_DART?.triggerRatioMin ?? 0.70)
          + Math.random() * (
            (FIREWORK_CONFIG.ERRATIC_DART?.triggerRatioMax ?? 0.76)
            - (FIREWORK_CONFIG.ERRATIC_DART?.triggerRatioMin ?? 0.70)
          ),
        erraticDartTrailTimer: Math.random() * (FIREWORK_CONFIG.ERRATIC_DART?.trailInterval ?? 0.032),
        erraticDartFlash: 1.0,
        erraticDartWigglePhase: Math.random() * Math.PI * 2,
        erraticDartWiggleFreq: (FIREWORK_CONFIG.ERRATIC_DART?.wobbleFreq ?? 22.0)
          * (0.85 + Math.random() * 0.30),
        erraticDartWiggleAmp: (FIREWORK_CONFIG.ERRATIC_DART?.wobbleAmp ?? 26.0)
          * (0.85 + Math.random() * 0.30)
      });

      outerParticles.push(particle);
      activeParticles.push(particle);
    }

    if (isErraticDartShell && outerParticles.length > 0 && !outerParticles.some((item) => item.hasErraticDart)) {
      outerParticles[0].hasErraticDart = true;
    }
    if (isTadpoleFlurryShell && outerParticles.length > 0 && !outerParticles.some((item) => item.hasTadpoleFlurry)) {
      outerParticles[0].hasTadpoleFlurry = true;
    }

    // 2. Spawn Miniature Pistil Core Particles if Pistil Modifier is Active
    if (hasPistil && pistilCount > 0) {
      const pistilColor = new THREE.Color(cfg.pistilColor || '#ffffff');
      const pistilSpeed = baseSpeed * 0.42;
      const pistilEffectState = {
        ...BurstEffectProcessor.initialize('standard', pistilCount, { effects: [] }),
        shapeType: 'sphere'
      };

      for (let pi = 0; pi < pistilCount; pi++) {
        const pAngle = (pi / pistilCount) * Math.PI * 2;
        const rawPistilDir = BurstShapeGenerator.direction(
          'sphere',
          pAngle,
          pi,
          pistilCount,
          cfg
        );
        const pDir = rawPistilDir.applyQuaternion(burstRotation).normalize();
        const pSpeedVar = 0.90 + Math.random() * 0.20;
        const pistilApexSpeedMul = isContourApexHang
          ? (FIREWORK_CONFIG.BURST?.apexSpeedMultiplier ?? 3.0)
          : 1.0;
        const pVel = pDir.multiplyScalar(
          pistilSpeed * pSpeedVar * pistilApexSpeedMul
        ).add(parentVelInheritance);

        const pistilParticle = BurstParticleFactory.createParticle({
          position: originPos,
          velocity: pVel,
          color: pistilColor,
          baseColor: pistilColor,
          color2: null,
          age: 0,
          maxLife: childLife * 0.85,
          isApexHang: isContourApexHang,
          effectType: 'standard',
          crackle: false,
          crackleTriggered: false,
          phase: (pistilEffectState.phase && pistilEffectState.phase[pi] !== undefined)
            ? pistilEffectState.phase[pi]
            : Math.random() * Math.PI * 2,
          preset: {
            shapeType: 'sphere',
            dynamicsType: 'standard',
            effects: [],
            secondBurst: null
          },
          heightProfile: p.heightProfile,
          effectState: pistilEffectState,
          particleIndex: pi,
          totalParticleCount: pistilCount,
          shellId: p.shellId,
          renderSize: Math.max(14, (p.renderSize || BASE_BURST_POINT_SIZE) * childScale * 1.15),
          renderOpacity: 0.85,
          isSecondBurstChild: true,
          dragCoefficient: BURST_BASE_DRAG
        });

        activeParticles.push(pistilParticle);
      }
    }

    const now = performance.now();
    const throttleMs = sbSettings.audioThrottleMs ?? 45;
    if (now - this.lastSecondBurstAudioTime > throttleMs) {
      this.lastSecondBurstAudioTime = now;
      const childBurstSound = cfg.burstSound || 'standard';
      const pitchVariance = 0.98 + Math.random() * 0.12;
      this.emitFireworkEvent(
        'firework:burst',
        {
          position: {
            x: originPos.x,
            y: originPos.y,
            z: originPos.z
          },
          intensity: 0.65,
          isSubBurst: true,
          isSecondBurst: true,
          sound: {
            burst: childBurstSound,
            volumeMultiplier: 0.85,
            pitchMultiplier: pitchVariance
          }
        }
      );
    }
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

    const isSmokeLaunch = item.preset?.cometTrail === 'smoke'
      || (Boolean(item.preset?.flightSmoke) && item.preset?.launchTrail === false);
    const launchTrail = item.preset?.launchTrail !== false && !isSmokeLaunch;
    const activeTrailChance = item.preset?.trailChance !== undefined
      ? item.preset.trailChance
      : 1.0;

    const trailIntensity = item.getTrailIntensity ? item.getTrailIntensity() : 1.0;

    // Neu gan burst tat han ve 0 (trailIntensity <= 0.01) thi khong sinh them vet comet
    if (launchTrail && trailIntensity > 0.01 && Math.random() < activeTrailChance) {
      let customLife = null;
      if (item.preset?.noBurst && item.preset?.starLife) {
        const lifeTime = item.preset.starLife / 1000;
        const remainingLife = Math.max(0.1, lifeTime - item.age);
        const baseTrailLife = (2 + Math.random() * 3) * 0.5;
        customLife = Math.min(baseTrailLife, remainingLife);
      }
      const isFloralChild = item.shellType === 'floral-child';
      const isDetached = Boolean(item.preset?.detachedTrail)
        || item.preset?.cometTrail === 'detached'
        || item.preset?.cometTrail === 'detached-trail'
        || item.shellType === 'comet_cluster_detached';
      const isThin = (Boolean(item.preset?.thinTrail) || isDetached) && !isFloralChild;
      const isBouquetComet = (item.preset?.isBouquetComet || (isFloralChild && item.preset?.thickTrail)) && !isThin;
      const isThick = (item.preset?.thickTrail || isBouquetComet) && !isThin;
      const ascentCfg = FIREWORK_CONFIG.ASCENT;

      let baseLifeMul;
      if (isDetached) {
        baseLifeMul = 0.20;
      } else if (isThin) {
        baseLifeMul = 0.22;
      } else if (isBouquetComet) {
        baseLifeMul = 0.95;
      } else if (isThick) {
        baseLifeMul = 0.7;
      } else {
        baseLifeMul = ascentCfg?.trailLifeMultiplier ?? 0.55;
      }

      const lifeMultiplier = isDetached
        ? 0.20
        : (isThin ? 0.22 : baseLifeMul * (0.6 + 0.4 * trailIntensity));
      const opacity = isDetached
        ? 0.38 * trailIntensity
        : (isThin
          ? 0.65 * trailIntensity
          : Math.min(
            1.0,
            (ascentCfg?.trailOpacity ?? 1.0) * trailIntensity * (isBouquetComet ? 1.4 : 1.0)
          ));

      const progress = item.getProgress ? item.getProgress() : 0.5;
      const ovalFactor = Math.sin(Math.PI * progress);

      const baseDispersion = ascentCfg?.trailDispersion ?? 0.22;
      const midDispBoost = ascentCfg?.midDispersionBoost ?? 2.2;
      
      let dispersion;
      if (isThin || isDetached) {
        dispersion = 0.0;
      } else if (isBouquetComet) {
        dispersion = 0.35 + Math.random() * 0.2;
      } else {
        dispersion = baseDispersion * (
          0.5 + midDispBoost * Math.pow(ovalFactor, 0.9)
        );
      }

      let subSteps;
      if (isThin || isDetached) {
        subSteps = 2;
      } else if (isBouquetComet) {
        subSteps = 2;
      } else {
        const baseSubSteps = ascentCfg?.subSteps ?? 2;
        const midBonus = ascentCfg?.midSubStepsBonus ?? 2;
        subSteps = baseSubSteps + Math.round(
          midBonus * Math.pow(ovalFactor, 0.85)
        );
      }

      const prevPos = item.prevPosition || item.mesh.position;
      const currPos = item.mesh.position;
      const extraChance = (isThin || isDetached)
        ? 0.0
        : (isBouquetComet ? 0.85 : (ascentCfg?.midExtraParticleChance ?? 0.75) * Math.pow(ovalFactor, 0.85));

      const particleColor = isBouquetComet
        ? item.color.clone().offsetHSL(0, 0, 0.15)
        : (isDetached
          ? item.color.clone().offsetHSL(0, -0.15, -0.12)
          : (isThin ? item.color.clone().offsetHSL(0, 0.05, 0.05) : item.color));

      for (let s = 1; s <= subSteps; s++) {
        const t = s / subSteps;
        const spawnPos = new THREE.Vector3().lerpVectors(
          prevPos,
          currPos,
          t
        );

        if (item.trailOffset) {
          const prevOffset = item.prevTrailOffset || item.trailOffset;
          const currOffset = item.trailOffset;
          const stepOffset = new THREE.Vector3().lerpVectors(
            prevOffset,
            currOffset,
            t
          );
          spawnPos.add(stepOffset);
        }

        if (isDetached) {
          const vel = item.velocity;
          const velSpeed = vel ? vel.length() : 0;
          const velDir = velSpeed > 0.1
            ? vel.clone().normalize()
            : new THREE.Vector3(0, 1, 0);
          // Khoang cach phan tach ro ret theo van toc bay thuc te (16 - 28 met)
          const gapDistance = Math.max(16.0, Math.min(28.0, velSpeed * 0.22));
          spawnPos.addScaledVector(velDir, -gapDistance);
        }

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

        // O giai doan giua hoac voi bouquet comet, tao them nhieu hat phu xoe ngang tao do day khoi bau duc
        if (extraChance > 0.2 && !isDetached && Math.random() < extraChance) {
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

        // Sinh them hat tia lua sang choi doc theo duong bay cua bouquet comet (hoac giai doan giua cua shell me)
        const shouldSpawnSpark = isBouquetComet
          ? Math.random() < 0.35
          : (trailIntensity >= 0.85 && Math.random() < (0.2 + 0.15 * ovalFactor));

        if (shouldSpawnSpark && !item.preset?.sparkleAtEnd && !isDetached) {
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

        if (item.preset?.sparkleAtEnd && progress > 0.65) {
          const apexT = (progress - 0.65) / 0.35;
          const sparkleChance = 0.38 + Math.pow(apexT, 1.4) * 0.62;
          if (Math.random() < sparkleChance) {
            const sparkColor = new THREE.Color(0xffffff);

            const sparkVel = new THREE.Vector3(
              (Math.random() - 0.5) * 4.5,
              -1.5 - Math.random() * 4.0,
              (Math.random() - 0.5) * 4.5
            );

            this.trailSystem.spawnEffectSpark(
              currPos,
              sparkColor,
              true,
              sparkVel,
              Math.random() * 1000,
              0.3 + Math.random() * 0.25
            );
          }
        }
      }
    }

    // Vet khoi phong rocket dang tia phan doan lien tuc (Collinear streak smoke trail)
    if (isSmokeLaunch && trailIntensity > 0.01) {
      const prevPos = item.prevPosition || item.mesh.position;
      const currPos = item.mesh.position;
      const moveVec = new THREE.Vector3().subVectors(currPos, prevPos);
      const moveDist = moveVec.length();

      const moveDir = moveDist > 0.001
        ? moveVec.clone().normalize()
        : (item.velocity && item.velocity.lengthSq() > 0.01
            ? item.velocity.clone().normalize()
            : new THREE.Vector3(0, 1, 0));

      const smokeCfg = FIREWORK_CONFIG.SMOKE;
      const stepDist = smokeCfg?.flightSmokeStepDist || 1.2;
      const subPoints = Math.max(
        1,
        Math.min(8, Math.ceil(moveDist / stepDist))
      );

      const defaultSmokeColor = new THREE.Color(0xf2f5f8);
      const smokeColor = item.color
        ? defaultSmokeColor.clone().lerp(item.color, 0.22)
        : defaultSmokeColor;

      for (let p = 1; p <= subPoints; p++) {
        const frac = p / subPoints;
        const samplePos = new THREE.Vector3().lerpVectors(
          prevPos,
          currPos,
          frac
        );

        // Hieu ung loe non (conical taper): Diem sat dau phao (frac cao) co do phan tan hep hon
        const taperJitter = (0.2 + 0.35 * (1.0 - frac)) * ((smokeCfg?.flightSmokeScale || 4.8) * 0.12);
        samplePos.x += (Math.random() - 0.5) * taperJitter;
        samplePos.y += (Math.random() - 0.5) * taperJitter;
        samplePos.z += (Math.random() - 0.5) * taperJitter;

        // Van toc luong phut nguoc chieu bay (retro-thrust exhaust velocity)
        const exhaustVel = moveDir.clone().multiplyScalar(
          (-1.6 - Math.random() * 1.2) * (0.8 + 0.4 * (1.0 - frac))
        ).add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 0.8,
            0.3 + Math.random() * 0.8,
            (Math.random() - 0.5) * 0.8
          )
        );

        const smokeLife = (
          (smokeCfg?.flightSmokeLifeMin || 3.5) +
          Math.random() * ((smokeCfg?.flightSmokeLifeMax || 6.5) - (smokeCfg?.flightSmokeLifeMin || 3.5))
        ) * trailIntensity;

        const smokeScale = (smokeCfg?.flightSmokeScale || 4.8) *
          (0.72 + 0.38 * (1.0 - frac)) *
          (0.7 + 0.3 * trailIntensity) +
          Math.random() * 1.2;

        const smokeOptions = {
          life: smokeLife,
          scale: smokeScale,
          growth: smokeCfg?.flightSmokeGrowth || 3.2,
          drag: smokeCfg?.flightSmokeDrag || 1.8,
          buoyancy: smokeCfg?.flightSmokeBuoyancy || 0.38,
          opacity: (smokeCfg?.flightSmokeOpacity || 0.28) *
            (1.15 - 0.25 * (1.0 - frac)) *
            trailIntensity,
          color: smokeColor
        };

        if (!smokeCfg?.onlyBurstSmoke) {
          if (this.smokeSystem) {
            this.smokeSystem.addSmokePoint(
              samplePos,
              exhaustVel,
              smokeOptions
            );
          } else {
            globalEventBus.emit(
              'smoke:spawn',
              {
                position: samplePos,
                velocity: exhaustVel,
                options: smokeOptions
              }
            );
          }
        }
      }
    } else if (
      item.preset?.flightSmoke &&
      trailIntensity > 0.01 &&
      Math.random() < (0.35 * trailIntensity) &&
      !FIREWORK_CONFIG.SMOKE?.onlyBurstSmoke
    ) {
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

      const smokeOptions = {
        life: trailLife,
        scale: (
          smokeCfg.trailBaseScale * 0.8 +
          Math.random() * 2.5
        ) * (0.6 + 0.4 * trailIntensity),
        growth: smokeCfg.trailGrowth,
        drag: smokeCfg.trailDrag,
        buoyancy: smokeCfg.trailBuoyancy,
        opacity: smokeCfg.trailOpacity * trailIntensity,
        color: item.color ? item.color.clone() : new THREE.Color(0xf2f5f8)
      };

      if (this.smokeSystem) {
        this.smokeSystem.addSmokePoint(
          item.mesh.position,
          ascVel,
          smokeOptions
        );
      } else {
        globalEventBus.emit(
          'smoke:spawn',
          {
            position: item.mesh.position.clone(),
            velocity: ascVel,
            options: smokeOptions
          }
        );
      }
    }

    if (!shouldBurst) {
      return;
    }

    const burstPosition = item.mesh.position.clone();

    const isTadpolePrimary = Boolean(
      item.preset?.isTadpoleShell
      || item.preset?.shellType === 'chrysanthemum_tadpole_burst'
      || item.shellType === 'chrysanthemum_tadpole_burst'
    );
    const hasTadpoleFlurryEffect = Boolean(
      (Array.isArray(item.preset?.effects) && (item.preset.effects.includes('tadpole-flurry') || item.preset.effects.includes('tadpole_flurry')))
      || (Array.isArray(item.effects) && (item.effects.includes('tadpole-flurry') || item.effects.includes('tadpole_flurry')))
    );

    if (isTadpolePrimary) {
      const parentVel = item.velocity ? item.velocity.clone() : null;
      const burstDir = parentVel && parentVel.lengthSq() > 0.001
        ? parentVel.clone().normalize()
        : new THREE.Vector3(0, 1, 0);

      this.triggerTadpoleBurstShell(
        burstPosition,
        item.color,
        item.preset,
        item.shellId,
        burstDir,
        parentVel
      );

      item.markBursted?.();
      finished.push(item);
      this.diagnostics.bursted += 1;
      this.emitDiagnostics();

      const hasNoBurst = (Array.isArray(item.preset?.effects) && item.preset.effects.includes('no-burst'))
        || Boolean(item.preset?.['no-burst']);
      const shellSize = Math.max(1, Math.min(6, item.preset?.shellSize ?? 1));
      const normalizedEnergy = 0.35 + ((shellSize - 1) / 5) * 0.65;

      this.emitFireworkEvent(
        'firework:burst',
        {
          shellId: item.shellId,
          shellType: 'chrysanthemum_tadpole_burst',
          shapeType: item.shapeType ?? 'sphere',
          effectType: 'tadpole-flurry',
          effects: ['tadpole-flurry'],
          sound: item.preset?.sound || null,
          hasBurstSmoke: false,
          burstSmoke: false,
          hasCustomColor: Boolean(item.preset?.hasCustomColor),
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
      const hasBurstSmoke = !hasNoBurst && (
        (Array.isArray(item.preset?.effects) && item.preset.effects.some(
          (e) => (typeof e === 'object' && e !== null ? (e.type || e.key) : e) === 'burst-smoke'
        ))
        || Boolean(item.preset?.['burst-smoke'])
        || Boolean(item.preset?.burstSmoke)
      );

      this.emitFireworkEvent(
        'firework:burst',
        {
          shellId: item.shellId,
          shellType: item.shellType ?? item.shape,
          shapeType: item.shapeType ?? item.shape,
          effectType: item.preset?.effectType ?? item.shape,
          effects: item.preset?.effects,
          hasBurstSmoke,
          burstSmoke: hasBurstSmoke,
          hasCustomColor: Boolean(item.preset?.hasCustomColor),
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
      if (item.preset?.sparkleAtEnd) {
        const sparkCount = 8 + Math.floor(Math.random() * 5);
        for (let s = 0; s < sparkCount; s++) {
          const sparkColor = new THREE.Color(0xffffff);
          const sparkVel = new THREE.Vector3(
            (Math.random() - 0.5) * 6.5,
            -1.0 - Math.random() * 4.5,
            (Math.random() - 0.5) * 6.5
          );
          this.trailSystem.spawnEffectSpark(
            burstPosition,
            sparkColor,
            true,
            sparkVel,
            Math.random() * 1000,
            0.45 + Math.random() * 0.35
          );
        }
      }
      item.markBursted?.();
      finished.push(item);
      return;
    }

    if (
      item.preset?.multiNested
      || item.preset?.preset === 'multi_nested'
      || item.preset?.preset === 'multiNested'
      || (Array.isArray(item.preset?.stages) && item.preset.stages.length > 0)
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
    const isGhostShell = (Array.isArray(item.preset?.effects) && item.preset.effects.includes('ghost'))
      || item.preset?.effectType === 'ghost'
      || Boolean(item.preset?.ghost);
    const hasBurstSmoke = !hasNoBurst && (
      (Array.isArray(item.preset?.effects) && item.preset.effects.some(
        (e) => (typeof e === 'object' && e !== null ? (e.type || e.key) : e) === 'burst-smoke'
      ))
      || Boolean(item.preset?.['burst-smoke'])
      || Boolean(item.preset?.burstSmoke)
    );

    const isStrobe = (Array.isArray(item.preset?.effects) && item.preset.effects.includes('strobe'))
      || item.preset?.effectType === 'strobe'
      || Boolean(item.preset?.strobe);
    const isDyingEmber = Boolean(item.preset?.isDyingEmber);
    const flightLifeMul = (item.preset?.starLifeMultiplier !== undefined && !isNaN(Number(item.preset.starLifeMultiplier)))
      ? Math.max(0.2, Number(item.preset.starLifeMultiplier))
      : 1.0;

    this.emitFireworkEvent('firework:burst', {
      shellId: item.shellId,
      shellType: item.shellType ?? item.shape,
      shapeType: item.shapeType ?? item.shape,
      effectType: item.preset?.effectType ?? item.shape,
      effects: item.preset?.effects,
      sound: item.preset?.sound || null,
      hasBurstSmoke,
      burstSmoke: hasBurstSmoke,
      hasCustomColor: Boolean(item.preset?.hasCustomColor),
      noBurstSound: hasNoBurst || Boolean(item.preset?.noBurstSound),
      colorHex: item.color.getHex(),
      color2Hex: item.color2 ? item.color2.getHex() : null,
      position: {
        x: burstPosition.x,
        y: burstPosition.y,
        z: burstPosition.z
      },
      burstRadius: 45.0 * (0.75 + 0.25 * shellSize),
      intensity: isGhostShell ? 0.0 : normalizedEnergy,
      duration: 1.25 + normalizedEnergy * 1.1,
      particleLife: BURST_LIFE * (isDyingEmber ? 2.0 : 1.0) * flightLifeMul,
      isStrobe
    });
  }

  updateBurstParticles(deltaTime) {
    const activeParticles = [];
    const nestedBurstsToSpawn = [];

    // Strobe frequency adjustment based on active burst count
    this.activeShellIdsSet.clear();
    for (let idx = 0; idx < this.burstParticles.length; idx++) {
      this.activeShellIdsSet.add(this.burstParticles[idx].shellId);
      if (this.activeShellIdsSet.size > 8) {
        break;
      }
    }
    const strobeFreqMultiplier = this.activeShellIdsSet.size > 8 ? 1.25 : 1.0;

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
        dragCoefficient: effectDragOverride,
        emitSpark,
        spawnTrail,
        trailLife,
        trailIntensity,
        trailSpawnChance,
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
      const crackleStart = p.crackleStart !== undefined ? p.crackleStart : p.maxLife * 0.65;
      const crackleEnd = p.crackleEnd !== undefined ? p.crackleEnd : crackleStart;

      if (p.crackle && !p.isDyingEmber) {
        if (p.age >= crackleStart && p.age < crackleEnd) {
          if (Math.random() < 0.20 && typeof this.trailSystem?.spawnMicroCrackle === 'function') {
            this.trailSystem.spawnMicroCrackle(p.position, p.baseColor);
          }
        } else if (p.age >= crackleEnd && !p.crackleTriggered) {
          p.crackleTriggered = true;
          if (Math.random() < 0.65 && typeof this.trailSystem?.spawnMicroCrackle === 'function') {
            const originPos = p.position.clone();
            const origColor = p.baseColor.clone();
            this.trailSystem.spawnMicroCrackle(
              originPos,
              origColor
            );
            this.emitFireworkEvent(
              'firework:crackle',
              {
                sound: p.preset?.sound || null,
                isSubBurst: Boolean(p.isSecondBurst || p.secondBurstDone),
                source: 'burst-particle',
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
          || Boolean(p.hasNoTrail && (p.noTrailStart === undefined))
          || BurstEffectProcessor.isEffectActive(p, 'no-trail')
          || p.effectType === 'no-trail'
          || p.effectType === 'notrail';

        const branchEffectType = hasNoTrail ? 'no-trail' : 'crysanthemum-trail';
        const branchEffects = hasNoTrail ? ['no-trail'] : ['crysanthemum-trail'];

        const branches = BurstParticleFactory.createCrossetteBranches({
          parentParticle: p,
          branchDirs,
          speed,
          dir,
          splitOrigin,
          branchColor,
          remainingLife,
          hasNoTrail
        });
        for (let b = 0; b < branches.length; b++) {
          activeParticles.push(branches[b]);
        }

        p.baseColor.setRGB(0, 0, 0);
      }

      // Second burst trigger
      if (
        p.isSecondBurst
        && !p.secondBurstDone
        && p.age >= p.secondBurstTime
        && (p.baseColor.r + p.baseColor.g + p.baseColor.b > 0.01)
      ) {
        p.secondBurstDone = true;
        this.spawnSecondBurst(p, activeParticles);
        p.baseColor.setRGB(0, 0, 0);
        p.renderOpacity = 0;
      }

      const lifeRatio = p.maxLife > 0 ? p.age / p.maxLife : 1;

      // Đo xung biến thiên vận tốc từ frame trước (external impulses / redirection)
      if (p.lastVelocity) {
        const extDvx = p.velocity.x - p.lastVelocity.x;
        const extDvy = p.velocity.y - p.lastVelocity.y;
        const extDvz = p.velocity.z - p.lastVelocity.z;
        const extImpulse = Math.sqrt(extDvx * extDvx + extDvy * extDvy + extDvz * extDvz);
        if (extImpulse > 1.8) {
          const heatGain = Math.min(1.0, (extImpulse - 1.8) * 0.16);
          p.frictionHeat = Math.min(1.5, (p.frictionHeat || 0) + heatGain);
        }
      }

      // Lưu vận tốc trước khi chịu các lực động lực học nội tại trong frame
      const preVelX = p.velocity.x;
      const preVelY = p.velocity.y;
      const preVelZ = p.velocity.z;

      let finalGravityScale = BurstEffectProcessor.processErraticDart(
        p,
        deltaTime,
        lifeRatio,
        gravityScale
      );
      const profile = p.dynamicsProfile ?? FIREWORK_CONFIG.DYNAMICS_PROFILES?.standard;
      const currentDrag = (effectDragOverride !== undefined)
        ? effectDragOverride
        : (p.dragCoefficient ?? profile?.baseDrag ?? BURST_BASE_DRAG);

      // Đường cong trọng lực trễ (Delayed Gravity Ramp):
      // Giữ trọng lực ở mức tối thiểu khi bung mở để quả pháo nở tròn đều,
      // sau đó tăng mượt mà sang giai đoạn rơi tự do, tạo nhịp dừng lơ lửng tự nhiên
      if (profile?.delayedGravity && !p.preset?.fixedGravity && effectDragOverride === undefined) {
        const rampStart = profile.gravityRampStart ?? 0.32;
        const rampFull = profile.gravityRampFull ?? 0.55;
        const minGrav = profile.minGravity ?? 0.05;
        const gravityRamp = minGrav + (1.0 - minGrav) * THREE.MathUtils.smoothstep(
          lifeRatio,
          rampStart,
          rampFull
        );
        finalGravityScale *= gravityRamp;
      }

      // Giảm tốc khí động học êm dịu theo hàm mũ tự nhiên (đồng nhất mọi hướng)
      const dragFactor = Math.exp(-currentDrag * deltaTime);
      p.velocity.x *= dragFactor;
      p.velocity.y *= dragFactor;
      p.velocity.z *= dragFactor;

      if (p.isLongBurn || p.isDyingEmber) {
        const gravScale = p.isLongBurn
          ? (FIREWORK_CONFIG.BURST?.longBurnGravityScale ?? 0.85)
          : 1.3;
        finalGravityScale *= gravScale;
        p.velocity.multiplyScalar(p.isLongBurn ? 0.995 : 0.994);
      }

      if (p.isApexHang) {
        // Mô hình vật lý tự nhiên:
        // Hạt bay theo phương bắn với vận tốc ban đầu và giảm dần do lực cản không khí.
        // Khi vận tốc bung nở giảm dần về 0 (đạt đỉnh nở), lực hút Trái Đất bắt đầu kéo hạt rơi tự do xuống dưới.
        const apexDrag = FIREWORK_CONFIG.BURST?.apexExpansionDrag ?? 3.8;
        const brakeFactor = Math.exp(-apexDrag * deltaTime);
        p.velocity.x *= brakeFactor;
        p.velocity.y *= brakeFactor;
        p.velocity.z *= brakeFactor;

        const ejectionDir = p.ejectionDir;
        const initialSpeed = p.initialSpeed ?? 0;

        if (ejectionDir && initialSpeed > 0.001) {
          const expSpeed = Math.max(
            0,
            p.velocity.dot(ejectionDir)
          );
          const expRatio = expSpeed / initialSpeed;
          const threshold = FIREWORK_CONFIG.BURST?.apexGravityThreshold ?? 0.18;

          if (expRatio > threshold) {
            finalGravityScale = 0.0;
          } else {
            const gravityBlend = 1.0 - (expRatio / threshold);
            finalGravityScale = THREE.MathUtils.smoothstep(
              gravityBlend,
              0.0,
              1.0
            );
          }
        } else {
          const hangEnd = FIREWORK_CONFIG.BURST?.apexHangEnd ?? 0.48;
          if (lifeRatio < hangEnd) {
            finalGravityScale = 0.0;
          } else {
            const releaseProgress = Math.min(
              1.0,
              (lifeRatio - hangEnd) / 0.18
            );
            finalGravityScale = THREE.MathUtils.smoothstep(
              releaseProgress,
              0.0,
              1.0
            );
          }
        }
      }

      // Environmental Wind Coupling: Hat tan phao va willow troi theo huong gio he thong
      const wind = (this.smokeSystem && this.smokeSystem.currentWind)
        || atmosphereManager.currentWind;

      if (wind) {
        const isFloatingEffect = p.isLongBurn
          || p.isDyingEmber
          || p.isSlowBurst
          || p.effectType === 'willow'
          || p.effectType === 'willow-arch'
          || p.effectType === 'falling-leaves'
          || p.effectType === 'kamuro';

        if (isFloatingEffect) {
          const windCfg = FIREWORK_CONFIG.BURST;
          const windCouplingScale = windCfg?.windCouplingScale ?? 0.25;
          const baseWindInfluence = p.isLongBurn
            ? (windCfg?.windInfluenceLongBurn ?? (0.65 * windCouplingScale))
            : (p.isDyingEmber
              ? (windCfg?.windInfluenceDyingEmber ?? (0.85 * windCouplingScale))
              : (windCfg?.windInfluenceFloating ?? (0.45 * windCouplingScale)));

          p.velocity.x = THREE.MathUtils.lerp(
            p.velocity.x,
            wind.x,
            deltaTime * baseWindInfluence
          );
          p.velocity.z = THREE.MathUtils.lerp(
            p.velocity.z,
            wind.z,
            deltaTime * baseWindInfluence
          );
        }
      }

      p.velocity.y += GRAVITY * deltaTime * finalGravityScale;

      // Giới hạn vận tốc rơi cực đại (Terminal Fall Velocity) trong pha rũ tàn (Phase 3):
      // Chỉ kích hoạt khi đã qua pha bung nở và đỉnh nở (lifeRatio >= phaseApexEnd)
      // để tuyệt đối không cản trở vận tốc bung nở ban đầu của các hạt hướng xuống dưới.
      const phaseApexEnd = FIREWORK_CONFIG.BURST?.phaseApexEnd ?? 0.65;
      if (lifeRatio >= phaseApexEnd) {
        const terminalVel = profile?.terminalVelocity
          ?? (p.isLongBurn ? -10.0 : (FIREWORK_CONFIG.BURST?.terminalVelocity ?? -15.0));
        if (p.velocity.y < terminalVel) {
          const brakeRate = 4.5;
          p.velocity.y = THREE.MathUtils.lerp(p.velocity.y, terminalVel, deltaTime * brakeRate);
        }
      }

      // Khí động học ma sát nhiệt (Aerodynamic Ram Heating / Friction Impulse):
      // Khi vận tốc biến thiên đột ngột (do lực cản gắt, bẻ góc, phanh đỉnh hoặc xung lực tách nhánh),
      // lõi hạt hấp thụ nhiệt ma sát và bừng sáng rực rỡ tức thời.
      const dvx = p.velocity.x - preVelX;
      const dvy = p.velocity.y - preVelY;
      const dvz = p.velocity.z - preVelZ;
      const impulse = Math.sqrt(dvx * dvx + dvy * dvy + dvz * dvz);

      if (impulse > 1.8) {
        const heatGain = Math.min(1.0, (impulse - 1.8) * 0.16);
        p.frictionHeat = Math.min(1.5, (p.frictionHeat || 0) + heatGain);
      }
      if (p.frictionHeat > 0.001) {
        p.frictionHeat *= Math.exp(-deltaTime * 12.0);
      } else {
        p.frictionHeat = 0;
      }

      if (!p.lastVelocity) {
        p.lastVelocity = new THREE.Vector3();
      }
      p.lastVelocity.set(p.velocity.x, p.velocity.y, p.velocity.z);

      if (!p.prevPosition) {
        p.prevPosition = p.position.clone();
      } else {
        p.prevPosition.copy(p.position);
      }

      p.position.addScaledVector(
        p.velocity,
        deltaTime
      );

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
            this.trailSystem?.spawnEffectSpark?.(
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
        this.trailSystem?.spawnEffectSpark?.(
          p.position,
          CRACKLE_SPARK_COLOR
        );
      }

      const particleDissolveStart = p.isLongBurn
        ? (profile?.longBurnDissolveStart ?? FIREWORK_CONFIG.BURST?.longBurnDissolveStart ?? 0.72)
        : (profile?.dissolveStart ?? BURST_DISSOLVE_START);

      const parentFade = lifeRatio > particleDissolveStart
        ? Math.pow(
          1.0 - (lifeRatio - particleDissolveStart) / (1.0 - particleDissolveStart),
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

      let isRingWaveIgnited = true;
      let ringFlashBonus = 1.0;
      const isSphereRingsWave = p.effectType === 'sphere_rings_wave'
        || p.effectType === 'sphere-rings-wave'
        || p.preset?.dynamicsType === 'sphere_rings_wave'
        || p.preset?.dynamicsType === 'sphere-rings-wave';

      if (isSphereRingsWave) {
        const ringK = p.ringIndex !== null && p.ringIndex !== undefined ? p.ringIndex : 2;
        const mode = p.preset?.ringWaveMode || 'equator-outward';
        let ringStartRatio = 0.08;

        if (mode === 'pole-to-pole') {
          ringStartRatio = 0.06 + ringK * 0.08;
        } else {
          // Equator outward: ring 2 is equator, rings 1 & 3 are mid, rings 0 & 4 are poles
          const ringDist = Math.abs(ringK - 2);
          ringStartRatio = 0.08 + ringDist * 0.14;
        }

        isRingWaveIgnited = lifeRatio >= ringStartRatio;
        if (isRingWaveIgnited) {
          const timeSinceIgnition = lifeRatio - ringStartRatio;
          if (timeSinceIgnition < 0.08) {
            ringFlashBonus = 1.0 + (1.0 - timeSinceIgnition / 0.08) * 1.5;
          }
        }
      }

      const isChrysanthemumSpiral = p.effectType === 'crysanthemum-spiral'
        || p.effectType === 'crysanthemum-spiral-v2';
      const hasGhost = p.effectType === 'ghost'
        || (Array.isArray(p.effects) && p.effects.includes('ghost'))
        || (Array.isArray(p.preset?.effects) && p.preset.effects.includes('ghost'))
        || Boolean(p.preset?.ghost)
        || p.preset?.shellType === 'ghost';
      const hasCC = p.effectType === 'crysanthemum-cc'
        || (Array.isArray(p.effects) && p.effects.includes('crysanthemum-cc'))
        || (Array.isArray(p.preset?.effects) && p.preset.effects.includes('crysanthemum-cc'))
        || p.preset?.shellType === 'crysanthemumCC';
      const isGhostInvisible = hasGhost && lifeRatio < 0.40;
      const hasGhostFlare = p.effects?.includes('ghost-flare')
        || p.preset?.effects?.includes('ghost-flare')
        || p.effectType === 'ghost-kamuro';
      const isGhostFlareNoTrail = hasGhostFlare && lifeRatio <= 0.60;
      const hasNoTrailActive = Boolean(p.preset?.noTrail)
        || BurstEffectProcessor.isEffectActive(p, 'no-trail')
        || p.effectType === 'no-trail'
        || p.effectType === 'notrail';
      const allowTrail = spawnTrail
        && (!isChrysanthemumSpiral || isSpiralIgnited)
        && (!isSphereRingsWave || isRingWaveIgnited)
        && !isGhostFlareNoTrail
        && !isGhostInvisible
        && !hasNoTrailActive;

      if (allowTrail && p.baseColor.r + p.baseColor.g + p.baseColor.b > 0.01) {
        const isHalfFlashTentacle = p.effectState?.shapeType === 'half-flash'
          && p.particleIndex >= (p.totalParticleCount - 4);
        const isSplitFlashBeam = p.effectState?.shapeType === 'split-flash'
          && p.particleIndex >= (p.totalParticleCount - 5);
        const isCometRing = p.effectState?.effectType === 'comet-ring';
        const burstTrailCfg = FIREWORK_CONFIG.BURST;
        const baseSpawnChance = burstTrailCfg?.defaultTrailSpawnChance ?? 0.95;
        const defaultSpawnChance = (isHalfFlashTentacle || isSplitFlashBeam || isCometRing || isChrysanthemumSpiral)
          ? 0.95
          : (lifeRatio < 0.65 ? baseSpawnChance : 0.80);
        const spawnChance = trailSpawnChance !== undefined
          ? trailSpawnChance
          : defaultSpawnChance;

        if (Math.random() < spawnChance * parentFade) {
          const trailColor = p.baseColor.clone();
          const currentIntensity = (trailIntensity ?? 0.25) * parentFade;
          trailColor.multiplyScalar(currentIntensity);

          const currentLife = (trailLife || 0.8) * (0.2 + 0.8 * parentFade);
          const trailVel = isCometRing
            ? p.velocity.clone().multiplyScalar(0.7)
            : p.velocity.clone().multiplyScalar(0.25);
          const trailGrav = isCometRing ? 0.0 : 0.8;
          const trailDrag = isCometRing ? 1.2 : 1.6;

          // Trajectory segment interpolation
          const startPos = p.prevPosition || p.position;
          const moveDist = startPos.distanceTo(p.position);
          const isDiscretePulse = trailSpawnChance !== undefined && trailSpawnChance < 0.5;
          const targetStride = burstTrailCfg?.trailStride ?? 0.45;
          const maxSubSteps = burstTrailCfg?.maxTrailSubSteps ?? 3;
          const steps = isDiscretePulse
            ? 1
            : Math.min(
              maxSubSteps,
              Math.max(1, Math.ceil(moveDist / targetStride))
            );

          for (let s = 1; s <= steps; s++) {
            const alpha = s / steps;
            const spawnPos = new THREE.Vector3().lerpVectors(
              startPos,
              p.position,
              alpha
            );

            this.trailSystem?.spawnTrailParticle?.(
              spawnPos,
              trailColor,
              isCometRing ? 1.0 : currentLife,
              false,
              isCometRing ? currentLife : null,
              0.65,
              false,
              trailVel,
              trailGrav,
              trailDrag
            );
          }
        }
      }

      // Tadpole arrow sparks and flurry when tadpole-flurry active effect is on burst particle
      if (
        p.hasTadpoleFlurry
        && !isGhostInvisible
        && (p.baseColor.r + p.baseColor.g + p.baseColor.b > 0.01)
      ) {
        const tadpoleStart = p.tadpoleStart !== undefined ? p.tadpoleStart : p.maxLife * 0.18;
        const tadpoleEnd = p.tadpoleEnd !== undefined ? p.tadpoleEnd : p.maxLife * 0.85;

        if (p.age >= tadpoleStart && p.age <= tadpoleEnd) {
          p.tadpoleArrowTimer = (p.tadpoleArrowTimer || 0) + deltaTime;
          const arrowInterval = FIREWORK_CONFIG.COMET_TADPOLE?.arrowInterval ?? 0.065;
          if (p.tadpoleArrowTimer >= arrowInterval) {
            p.tadpoleArrowTimer = 0;
            this.spawnBurstParticleArrowSparks(p, parentFade);
          }
        }

        if (p.age >= tadpoleEnd && !p.hasFlurried) {
          p.hasFlurried = true;
          this.spawnBurstParticleFlurry(p, parentFade);
        }
      }

      // Erratic dart bright streak trail
      if (
        p.hasErraticDart &&
        p.erraticDartTriggered &&
        p.baseColor.r + p.baseColor.g + p.baseColor.b > 0.01
      ) {
        p.erraticDartTrailTimer = (p.erraticDartTrailTimer || 0) + deltaTime;
        const dartCfg = FIREWORK_CONFIG.ERRATIC_DART || {};
        const trailInt = dartCfg.trailInterval ?? 0.032;
        if (p.erraticDartTrailTimer >= trailInt) {
          p.erraticDartTrailTimer = 0;
          this.spawnErraticDartStreak(p, parentFade);
        }
      }

      const isStarBurstSmoke = p.hasBurstSmoke && (
        p.burstSmokeEnd !== undefined
          ? (p.age >= (p.burstSmokeStart ?? 0) && p.age <= p.burstSmokeEnd)
          : (lifeRatio <= (p.burstSmokeLimit ?? 0.33))
      );
      const shouldEmitSmoke = (spawnSmoke || isStarBurstSmoke)
        && p.baseColor.r + p.baseColor.g + p.baseColor.b > 0.01;

      if (shouldEmitSmoke && !FIREWORK_CONFIG.SMOKE?.onlyBurstSmoke) {
        let spawnChance = 0.5;
        if (isStarBurstSmoke) {
          spawnChance = lifeRatio < 0.15 ? 0.95 : 0.65;
        } else if (lifeRatio < 0.12) {
          spawnChance = 1.0;
        } else if (lifeRatio < 0.52) {
          spawnChance = 0.85;
        } else {
          spawnChance = 0.85 * (1.0 - (lifeRatio - 0.52) / 0.48);
        }

        const moduloCheck = (this.smokeSystem && this.smokeSystem.quality === 'high') ? 3 : 5;
        if (p.particleIndex % moduloCheck === 0 && Math.random() < spawnChance) {
          const defaultWhiteSmoke = new THREE.Color(0xf2f5f9);
          const particleColor = p.preset?.hasCustomColor
            ? p.baseColor.clone()
            : defaultWhiteSmoke;
          const smokeVel = p.velocity.clone().multiplyScalar(0.14);
          const densityMult = isStarBurstSmoke ? 1.1 : (spawnSmoke ? 1.4 : 1.0);
          const smokeCfg = FIREWORK_CONFIG.SMOKE;
          const starSmokeBaseLife = smokeLife || (
            (smokeCfg.trailLifeMin + smokeCfg.trailLifeMax) * 0.5
          );
          const smokeOptions = {
            category: isStarBurstSmoke ? 'burst' : 'aerial',
            force: isStarBurstSmoke,
            life: starSmokeBaseLife * (0.8 + 0.4 * Math.random()),
            scale: (2.8 + Math.random() * 1.8) * densityMult,
            growth: 2.8,
            drag: 2.5,
            buoyancy: smokeCfg.trailBuoyancy,
            opacity: (
              smokeOpacity || 0.15
            ) * parentFade * (lifeRatio < 0.15 ? 1.25 : 1.0) * densityMult,
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
      if ((p.effectType === 'sparking' || p.effectType === 'sparkling-branch-comet' || p.effectType === 'sparkle-trail' || p.effectType === 'sparkle-apex') && lifeRatio > 0.4 && p.baseColor.r + p.baseColor.g + p.baseColor.b > 0.01) {
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
      if (p.isSecondBurstChild) {
        baseOpacity *= 0.85;
      }

      const dissolveThreshold = p.isLongBurn
        ? (profile?.longBurnDissolveStart ?? FIREWORK_CONFIG.BURST?.longBurnDissolveStart ?? 0.72)
        : (profile?.dissolveStart ?? BURST_DISSOLVE_START);

      const attenuationStart = profile?.attenuationStart
        ?? FIREWORK_CONFIG.BURST?.attenuationStart
        ?? 0.35;

      if (lifeRatio > attenuationStart && lifeRatio <= dissolveThreshold) {
        // Giai đoạn bắt đầu đạt đỉnh và rơi xuống: ánh sáng dịu bớt êm ái
        const attenT = (lifeRatio - attenuationStart) / (dissolveThreshold - attenuationStart);
        baseOpacity *= (1.0 - attenT * 0.15);
      } else if (lifeRatio > dissolveThreshold) {
        const dissolveT = THREE.MathUtils.clamp(
          (lifeRatio - dissolveThreshold) / (1 - dissolveThreshold),
          0,
          1
        );
        const fadeExp = profile?.dissolveExponent ?? BURST_FADE_EXPONENT;
        baseOpacity = Math.max(
          Math.pow(1 - dissolveT, fadeExp) * (brightnessOpacityScale * 0.85),
          (1 - dissolveT) * 0.08
        );
      }

      if (p.hasErraticDart && p.erraticDartTriggered) {
        // Dau hat duy tri do sang va do mo duc ban dau trong suot pha vut
        const dartDuration = FIREWORK_CONFIG.ERRATIC_DART?.boostLifeDuration ?? 0.95;
        const dartRemainRatio = (p.maxLife - p.age) / dartDuration;
        if (dartRemainRatio > 0.12) {
          baseOpacity = Math.max(baseOpacity, 0.98);
        } else {
          baseOpacity = Math.max(0.0, dartRemainRatio / 0.12);
        }
      }

      let effTypeForOpacity = p.effectType;
      if (Array.isArray(p.effects)) {
        for (const eff of p.effects) {
          if (BurstEffectProcessor.effectsRegistry.has(eff)) {
            const strat = BurstEffectProcessor.effectsRegistry.get(eff);
            if (typeof strat?.materialOpacity === 'function') {
              effTypeForOpacity = eff;
              break;
            }
          }
        }
      }

      const opacity = BurstEffectProcessor.materialOpacity(
        effTypeForOpacity,
        p.age,
        p.maxLife,
        baseOpacity
      );

      // Color sweep
      const { r, g, b } = BurstEffectProcessor.resolveParticleColor(
        p,
        lifeRatio,
        {
          strobeFreqMultiplier,
          isSpiralIgnited,
          spiralFlashBonus,
          isRingIgnited: isRingWaveIgnited,
          ringFlashBonus,
          hasGhostFlare,
          profile
        }
      );

      const bVar = p.brightnessVariance ?? 1.0;
      p.color.setRGB(
        r * bVar,
        g * bVar,
        b * bVar
      );

      // Calculate size
      const baseSize = (p.preset?.particleSize ?? BASE_BURST_POINT_SIZE) * heightProfile.sizeMultiplier;
      let renderSize = baseSize;
      if (hasGhost) {
        if (lifeRatio < 0.40) {
          renderSize = 0;
        } else if (lifeRatio < 0.48) {
          const t = (lifeRatio - 0.40) / 0.08;
          renderSize = baseSize * THREE.MathUtils.lerp(0.0, 1.0, t);
        }
      } else if (isSphereRingsWave && !isRingWaveIgnited) {
        renderSize = 0;
      } else {
        // Co giảm kích thước động theo chu kỳ nhiệt độ
        let sizeDecay = 1.0;
        if (p.hasErraticDart && p.erraticDartTriggered) {
          sizeDecay = 1.0;
        } else if (lifeRatio < 0.12) {
          const ignitionEnd = 0.035;
          if (lifeRatio < ignitionEnd) {
            const t = lifeRatio / ignitionEnd;
            sizeDecay = THREE.MathUtils.lerp(0.82, 1.25, THREE.MathUtils.smoothstep(t, 0.0, 1.0));
          } else {
            const t = (lifeRatio - ignitionEnd) / (0.12 - ignitionEnd);
            sizeDecay = 1.25 - t * 0.25;
          }
        } else if (lifeRatio > attenuationStart) {
          const t = (lifeRatio - attenuationStart) / (1.0 - attenuationStart);
          sizeDecay = 1.0 - t * 0.45;
        }
        const frictionScale = 1.0 + Math.min(0.25, (p.frictionHeat || 0) * 0.2);
        renderSize = baseSize * sizeDecay * frictionScale;
      }
      const sVar = p.sizeVariance ?? 1.0;
      p.renderSize = renderSize * sVar;
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
          sound: firstBurst.preset?.sound || null,
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
      this.maxBurstParticles,
      this.allocatedMaxBurstParticles
    );

    // 4. Fill Geometry Buffers (Points + Directional Velocity Streaks)
    const streakDt = 0.038;
    for (let i = 0; i < count; i++) {
      const p = this.burstParticles[i];

      // Points buffer
      this.burstPositionsArray[i * 3] = p.position.x;
      this.burstPositionsArray[i * 3 + 1] = p.position.y;
      this.burstPositionsArray[i * 3 + 2] = p.position.z;

      this.burstColorsArray[i * 3] = p.color.r;
      this.burstColorsArray[i * 3 + 1] = p.color.g;
      this.burstColorsArray[i * 3 + 2] = p.color.b;

      this.burstSizesArray[i] = p.renderSize;
      this.burstOpacitiesArray[i] = p.renderOpacity;

      // Lines buffer: Head vertex (i * 2) and Tail vertex (i * 2 + 1)
      const v0 = i * 6;
      const v1 = v0 + 3;

      this.burstLinePositionsArray[v0] = p.position.x;
      this.burstLinePositionsArray[v0 + 1] = p.position.y;
      this.burstLinePositionsArray[v0 + 2] = p.position.z;

      const vx = p.velocity?.x || 0;
      const vy = p.velocity?.y || 0;
      const vz = p.velocity?.z || 0;
      let sx = vx * streakDt;
      let sy = vy * streakDt;
      let sz = vz * streakDt;
      const sLenSq = sx * sx + sy * sy + sz * sz;
      if (sLenSq > 6.25) {
        const factor = 2.5 / Math.sqrt(sLenSq);
        sx *= factor;
        sy *= factor;
        sz *= factor;
      }

      this.burstLinePositionsArray[v1] = p.position.x - sx;
      this.burstLinePositionsArray[v1 + 1] = p.position.y - sy;
      this.burstLinePositionsArray[v1 + 2] = p.position.z - sz;

      const op = p.renderOpacity ?? 1.0;
      if (
        op > 0.001 &&
        (p.renderSize || 0) > 0.001 &&
        (p.color.r + p.color.g + p.color.b) > 0.001
      ) {
        // Head: whitened core
        this.burstLineColorsArray[v0] = THREE.MathUtils.lerp(
          p.color.r,
          1.0,
          0.65
        ) * op;
        this.burstLineColorsArray[v0 + 1] = THREE.MathUtils.lerp(
          p.color.g,
          1.0,
          0.65
        ) * op;
        this.burstLineColorsArray[v0 + 2] = THREE.MathUtils.lerp(
          p.color.b,
          1.0,
          0.65
        ) * op;

        // Tail: colored hue fading out
        this.burstLineColorsArray[v1] = p.color.r * op * 0.15;
        this.burstLineColorsArray[v1 + 1] = p.color.g * op * 0.15;
        this.burstLineColorsArray[v1 + 2] = p.color.b * op * 0.15;
      } else {
        this.burstLineColorsArray[v0] = 0;
        this.burstLineColorsArray[v0 + 1] = 0;
        this.burstLineColorsArray[v0 + 2] = 0;
        this.burstLineColorsArray[v1] = 0;
        this.burstLineColorsArray[v1 + 1] = 0;
        this.burstLineColorsArray[v1 + 2] = 0;
      }
    }

    if (count > 0) {
      this.burstPositionsAttr.needsUpdate = true;
      this.burstColorsAttr.needsUpdate = true;
      this.burstSizesAttr.needsUpdate = true;
      this.burstOpacitiesAttr.needsUpdate = true;

      if (this.burstPositionsAttr.updateRange) {
        this.burstPositionsAttr.updateRange.offset = 0;
        this.burstPositionsAttr.updateRange.count = count * 3;
      }
      if (this.burstColorsAttr.updateRange) {
        this.burstColorsAttr.updateRange.offset = 0;
        this.burstColorsAttr.updateRange.count = count * 3;
      }
      if (this.burstSizesAttr.updateRange) {
        this.burstSizesAttr.updateRange.offset = 0;
        this.burstSizesAttr.updateRange.count = count;
      }
      if (this.burstOpacitiesAttr.updateRange) {
        this.burstOpacitiesAttr.updateRange.offset = 0;
        this.burstOpacitiesAttr.updateRange.count = count;
      }

      this.globalBurstGeometry.setDrawRange(
        0,
        count
      );

      // Line segments updates
      this.burstLinesPositionsAttr.needsUpdate = true;
      this.burstLinesColorsAttr.needsUpdate = true;
      if (this.burstLinesPositionsAttr.updateRange) {
        this.burstLinesPositionsAttr.updateRange.offset = 0;
        this.burstLinesPositionsAttr.updateRange.count = count * 6;
      }
      if (this.burstLinesColorsAttr.updateRange) {
        this.burstLinesColorsAttr.updateRange.offset = 0;
        this.burstLinesColorsAttr.updateRange.count = count * 6;
      }

      this.burstLinesGeometry.setDrawRange(
        0,
        count * 2
      );
    } else {
      this.globalBurstGeometry.setDrawRange(
        0,
        0
      );
      this.burstLinesGeometry.setDrawRange(
        0,
        0
      );
    }
  }

  clear() {
    this.activeFireworks = [];
    this.instancedShellRenderer.update([]);
    this.burstParticles = [];
    this.scheduledBursts = [];
    this.updateBurstParticles(0);
  }

  destroy() {
    this.clear();
    for (const unsubscribe of this.eventSubscriptions) {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    }
    this.eventSubscriptions.length = 0;
    if (this.burstLines) {
      if (this.scene) {
        this.scene.remove(this.burstLines);
      }
      this.burstLinesGeometry?.dispose();
      this.burstLinesMaterial?.dispose();
    }
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
