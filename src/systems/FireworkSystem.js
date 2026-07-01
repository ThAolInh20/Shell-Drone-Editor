import * as THREE from 'three';
import { LAUNCH_ZONE_CONFIG } from '../config/launchZone.js';
import { ShellEntity } from '../entities/ShellEntity.js';
import { ShellPresetFactory } from '../factories/ShellPresetFactory.js';
import { BurstShapeGenerator } from '../factories/BurstShapeGenerator.js';
import { BurstEffectProcessor } from '../factories/BurstEffectProcessor.js';
import { globalEventBus } from '../core/EventBus.js';
import { InstancedShellRenderer } from '../render/InstancedShellRenderer.js';

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
  constructor(scene, trailSystem, shellPresetFactory = null) {
    this.scene = scene;
    this.trailSystem = trailSystem;
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
    this.maxBurstParticles = 6000;
    this.burstParticles = [];

    this.burstPositionsArray = new Float32Array(this.maxBurstParticles * 3);
    this.burstColorsArray = new Float32Array(this.maxBurstParticles * 3);
    this.burstSizesArray = new Float32Array(this.maxBurstParticles);
    this.burstOpacitiesArray = new Float32Array(this.maxBurstParticles);

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
      depthTest: false,
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
    this.scene.add(this.globalBurstPoints);
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
      this.createBurst(
        burstPos,
        finalColor,
        shellPreset.shapeType ?? 'willow',
        shellPreset,
        shellId
      );
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
    if (preset?.shellType === 'ringComet') {
      return 10 + Math.floor(Math.random() * 6); // 10-15 particles for sparse comet ring
    }

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

  createBurst(position, color, shape = 'sphere', preset = null, shellId = null) {
    const requestedShape = shape ?? 'sphere';
    const resolvedShape = BurstShapeGenerator.resolveShape(requestedShape);
    if (resolvedShape !== requestedShape) {
      this.diagnostics.shapeFallbacks += 1;
      this.registerWarning(`[Burst] Shape fallback from "${requestedShape}" to "${resolvedShape}".`);
    }

    const crackleEnabled = Boolean(preset?.crackle);
    const requestedEffect = preset?.effectType ?? resolvedShape;
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

    const newParticles = [];

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
      const speed = baseSpeed * (useContourMagnitude ? 1.15 : 1) * shellSizeScale;

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

      newParticles.push({
        position: position.clone(),
        velocity: velocityVal.clone(),
        color: finalColorVal.clone(),
        baseColor: finalColorVal.clone(),
        color2: color2Scaled ? color2Scaled.clone() : null,
        age: 0,
        maxLife: BURST_LIFE * (0.8 + Math.random() * 0.4),
        effectType: normalizedEffect,
        crackle: crackleEnabled || normalizedEffect === 'crackle',
        crackleTriggered: false,
        phase: effectState.phase ? effectState.phase[i] : 0,
        preset,
        heightProfile,
        effectState,
        ghostDot: ghostDotVal,
        particleIndex: i,
        totalParticleCount: burstParticleCount,
        shellId: shellId ?? Math.floor(Math.random() * 100000000)
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

    if (Math.random() < 0.4) {
      let customLife = null;
      if (item.preset?.noBurst && item.preset?.starLife) {
        const lifeTime = item.preset.starLife / 1000;
        const remainingLife = Math.max(0.1, lifeTime - item.age);
        const baseTrailLife = (2 + Math.random() * 3) * 0.5;
        customLife = Math.min(baseTrailLife, remainingLife);
      }
      this.trailSystem.spawnTrailParticle(item.mesh.position.clone(), item.color, 0.5, false, customLife);
    }

    if (!shouldBurst) {
      return;
    }

    const burstPosition = item.mesh.position.clone();

    if (
      item.shellType === 'bouquet'
      || item.shellType === 'bouquetComet'
      || item.shellType === 'bouquetCometSphere'
    ) {
      let clusterCount;
      if (item.shellType === 'bouquetCometSphere') {
        // Needs a lot more particles to form a recognizable sphere
        clusterCount = 70 + Math.floor(Math.random() * 20); // 45 to 65
      } else {
        clusterCount = 10 + Math.floor(Math.random() * 11); // 10 to 20
      }

      for (let i = 0; i < clusterCount; i++) {
        const colorHex = (item.shellType === 'bouquetComet' || item.shellType === 'bouquetCometSphere')
          ? item.color.getHex()
          : FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];
        const subColor = new THREE.Color(colorHex);

        let vx, vy, vz;

        if (item.shellType === 'bouquetCometSphere') {
          // Use Fibonacci sphere for a perfectly even and clear spherical shell
          const t = (i + 0.5) / clusterCount;
          const phi = Math.acos(1 - 2 * t);
          const theta = Math.PI * (1 + Math.sqrt(5)) * i;
          
          // Use a mostly uniform speed with very slight jitter to maintain the spherical shape
          const speed = 55 + Math.random() * 5; 

          vx = Math.cos(theta) * Math.sin(phi) * speed;
          vy = Math.cos(phi) * speed;
          vz = Math.sin(theta) * Math.sin(phi) * speed;
        } else {
          // Upward spray
          const speed = 35 + Math.random() * 30; // Increased speed for wider spread
          const angleY = Math.random() * Math.PI / 2.2;
          const angleXZ = Math.random() * Math.PI * 2;

          vx = Math.sin(angleY) * Math.cos(angleXZ) * speed;
          vz = Math.sin(angleY) * Math.sin(angleXZ) * speed;
          vy = Math.cos(angleY) * speed + 35; // Larger upward boost for longer flight time
        }

        const velocity = new THREE.Vector3(vx, vy, vz);
        const targetHeight = burstPosition.y + 1000; // rely on peak height (velocity.y <= 0) to burst

        let subPreset;
        if (item.shellType === 'bouquetComet' || item.shellType === 'bouquetCometSphere') {
          subPreset = this.shellPresetFactory.basePreset(0.5);
          subPreset.noBurst = true;
          subPreset.shellType = 'floral-child';
          subPreset.starLife = 3500; // Increased life time for much longer flight
        } else {
          subPreset = this.shellPresetFactory.glitterStrobeShell(0.45); // smaller sparkling spheres
          subPreset.color = colorHex;
          subPreset.shellType = 'floral-child';
          subPreset.particleCountMultiplier = 0.5; // save FPS
        }

        const subShell = this.createShell(
          burstPosition.clone(),
          velocity,
          targetHeight,
          subColor,
          subPreset,
          item.shellId + '-c' + i
        );

        this.activeFireworks.push(subShell);
        this.diagnostics.launched += 1;
      }

      item.markBursted?.();
      finished.push(item);

      const shellSize = Math.max(1, Math.min(6, item.preset?.shellSize ?? 1));
      const normalizedEnergy = 0.35 + ((shellSize - 1) / 5) * 0.65;

      this.emitFireworkEvent('firework:burst', {
        shellId: item.shellId,
        shellType: item.shellType ?? item.shape,
        shapeType: item.shapeType ?? item.shape,
        effectType: item.preset?.effectType ?? item.shape,
        colorHex: item.color.getHex(),
        position: { x: burstPosition.x, y: burstPosition.y, z: burstPosition.z },
        intensity: normalizedEnergy,
        duration: 1.25 + normalizedEnergy * 1.1
      });
      return;
    }

    if (item.shellType === 'bouquetv2') {
      const clusterCount = 12 + Math.floor(Math.random() * 11); // 12 to 22 child shells
      const colorMode = item.preset?.colorMode ?? 'parent';

      for (let i = 0; i < clusterCount; i++) {
        const colorHex = colorMode === 'random'
          ? FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)]
          : item.color.getHex();
        const subColor = new THREE.Color(colorHex);

        const speed = 40 + Math.random() * 35; // Wider spread
        const angleY = Math.random() * Math.PI / 2.2;
        const angleXZ = Math.random() * Math.PI * 2;

        const vx = Math.sin(angleY) * Math.cos(angleXZ) * speed;
        const vz = Math.sin(angleY) * Math.sin(angleXZ) * speed;
        const vy = Math.cos(angleY) * speed + 38; // Upward boost

        const velocity = new THREE.Vector3(vx, vy, vz);
        const targetHeight = burstPosition.y + 1000;

        const subPreset = this.shellPresetFactory.glitterStrobeShell(0.5);
        subPreset.color = colorHex;
        subPreset.shellType = 'floral-child';
        subPreset.particleCountMultiplier = 0.65; // More glitter particles
        subPreset.launchTrail = true; // Enable trails for children for maximum sparkles

        const subShell = this.createShell(
          burstPosition.clone(),
          velocity,
          targetHeight,
          subColor,
          subPreset,
          item.shellId + '-c2-' + i
        );

        this.activeFireworks.push(subShell);
        this.diagnostics.launched += 1;
      }

      item.markBursted?.();
      finished.push(item);

      const shellSize = Math.max(1, Math.min(6, item.preset?.shellSize ?? 1));
      const normalizedEnergy = 0.35 + ((shellSize - 1) / 5) * 0.65;

      this.emitFireworkEvent('firework:burst', {
        shellId: item.shellId,
        shellType: item.shellType ?? item.shape,
        shapeType: item.shapeType ?? item.shape,
        effectType: item.preset?.effectType ?? item.shape,
        colorHex: item.color.getHex(),
        position: { x: burstPosition.x, y: burstPosition.y, z: burstPosition.z },
        intensity: normalizedEnergy,
        duration: 1.25 + normalizedEnergy * 1.1
      });
      return;
    }

    if (item.preset?.noBurst) {
      item.markBursted?.();
      finished.push(item);
      return;
    }

    this.createBurst(
      burstPosition,
      item.color,
      item.shapeType ?? item.shape,
      item.preset,
      item.shellId
    );
    const shellSize = Math.max(1, Math.min(6, item.preset?.shellSize ?? 1));
    const normalizedEnergy = 0.35 + ((shellSize - 1) / 5) * 0.65;
    item.markBursted?.();
    finished.push(item);
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

  updateBurstParticles(deltaTime) {
    const activeParticles = [];

    // Strobe frequency adjustment based on active burst count
    const uniqueShells = new Set(
      this.burstParticles.map(
        (p) => p.shellId
      )
    );
    const activeBurstCount = uniqueShells.size;
    const strobeFreqMultiplier = activeBurstCount > 8 ? 1.6 : 1.0;

    for (let idx = 0; idx < this.burstParticles.length; idx++) {
      const p = this.burstParticles[idx];
      p.age += deltaTime;

      if (p.age >= p.maxLife) {
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
      if (p.crackle && p.age >= p.maxLife * 0.65 && !p.crackleTriggered) {
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

      p.position.addScaledVector(
        p.velocity,
        deltaTime
      );
      p.velocity.y += GRAVITY * deltaTime * gravityScale;

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

      if (spawnTrail && p.baseColor.r + p.baseColor.g + p.baseColor.b > 0.01) {
        const isHalfFlashTentacle = p.effectState?.shapeType === 'half-flash'
          && p.particleIndex >= (p.totalParticleCount - 4);
        const isSplitFlashBeam = p.effectState?.shapeType === 'split-flash'
          && p.particleIndex >= (p.totalParticleCount - 5);
        const isCometRing = p.effectState?.effectType === 'comet-ring';
        const spawnChance = (isHalfFlashTentacle || isSplitFlashBeam || isCometRing) ? 1.0 : 0.3;

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

      if (spawnSmoke && p.baseColor.r + p.baseColor.g + p.baseColor.b > 0.01) {
        const spawnChance = lifeRatio < 0.12
          ? 1.0
          : (lifeRatio < 0.52 ? 0.85 : 0.85 * (1.0 - (lifeRatio - 0.52) / 0.48));

        if (p.particleIndex % 12 === 0 && Math.random() < spawnChance) {
          const particleColor = p.baseColor.clone();
          const smokeVel = p.velocity.clone().multiplyScalar(0.12);

          globalEventBus.emit(
            'smoke:spawn',
            {
              position: p.position.clone(),
              velocity: smokeVel,
              options: {
                life: (smokeLife || 2.5) * (0.6 + 0.4 * Math.random()),
                scale: 3.2 + Math.random() * 2.2,
                growth: 2.8,
                opacity: (smokeOpacity || 0.15) * parentFade * (lifeRatio < 0.15 ? 1.3 : 1.0),
                color: particleColor
              }
            }
          );
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
      } else if (p.effectType === 'strobe' || p.preset?.strobe) {
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
      }

      p.color.setRGB(r, g, b);

      // Calculate size
      const baseSize = (p.preset?.particleSize ?? BASE_BURST_POINT_SIZE) * heightProfile.sizeMultiplier;
      p.renderSize = baseSize;
      p.renderOpacity = opacity;

      activeParticles.push(p);
    }

    this.burstParticles = activeParticles;
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
    for (let i = count; i < this.maxBurstParticles; i++) {
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
