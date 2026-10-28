import * as THREE from 'three';
import { LAUNCH_ZONE_CONFIG } from '../config/launchZone.js';
import { CometEntity } from '../entities/CometEntity.js';
import { globalEventBus } from '../core/EventBus.js';
import { ShellPresetFactory } from '../factories/ShellPresetFactory.js';
import { LAYER_REFLECTION } from '../config/layers.js';
import { FIREWORK_CONFIG } from '../config/fireworks.js';

const FIREWORK_COLORS = [
  0xffd700, // vàng (gold)
  0xff4500, // cam đỏ (orange red)
  0x00bfff, // xanh da trời (deep sky blue)
  0xff69b4, // hồng (hot pink)
  0x7fffd4, // xanh ngọc (aquamarine)
  0x8a2be2, // tím (blue violet)
  0xffffff  // trắng bạc (silver/white)
];

const CASCADE_PALETTES = [
  // Rainbow spectrum: Red -> Orange -> Gold -> Emerald -> Cyan -> Purple -> Bright White
  [0xff1e40, 0xff7700, 0xffd200, 0x10b981, 0x06b6d4, 0x8b5cf6, 0xffffff],
  // Sunset Flame: Deep Crimson -> Fire Orange -> Amber Gold -> Solar White
  [0xd90429, 0xf97316, 0xfbbf24, 0xffffff],
  // Aurora Ocean: Navy -> Sapphire -> Cyan -> Mint Aqua -> Pure White
  [0x1e3a8a, 0x0284c7, 0x06b6d4, 0x34d399, 0xffffff],
  // Cyberpunk Twilight: Hot Pink -> Violet Purple -> Electric Cyan -> Plasma White
  [0xf43f5e, 0x8b5cf6, 0x06b6d4, 0xffffff]
];

const _tempPaletteColorA = new THREE.Color();
const _tempPaletteColorB = new THREE.Color();
const GLITTER_STROBE_COLOR = new THREE.Color(0xffe082);
const WHITE_COLOR = new THREE.Color(0xffffff);
const LAUNCH_SMOKE_COLOR = new THREE.Color(0x778090);
const WATER_STEAM_COLOR = new THREE.Color(0xdde5ee);

function interpolatePaletteColor(palette, t) {
  const clampedT = Math.max(0, Math.min(1, t));
  const segmentCount = palette.length - 1;
  const scaled = clampedT * segmentCount;
  const idx = Math.min(Math.floor(scaled), segmentCount - 1);
  const frac = scaled - idx;
  _tempPaletteColorA.setHex(palette[idx]);
  _tempPaletteColorB.setHex(palette[idx + 1]);
  return _tempPaletteColorA.clone().lerp(_tempPaletteColorB, frac);
}

const _tempSmokeVel = new THREE.Vector3();
const _tempMoveVec = new THREE.Vector3();
const _tempMoveDir = new THREE.Vector3();
const _tempSamplePos = new THREE.Vector3();
const _tempExhaustVel = new THREE.Vector3();
const _tempJitter = new THREE.Vector3();
const _tempSpawnPos = new THREE.Vector3();
const _tempVelDir = new THREE.Vector3();
const _tempCracklePos = new THREE.Vector3();
const _tempDrift = new THREE.Vector3();
const _tempSmokeColor = new THREE.Color();
const _tempDefaultSmokeColor = new THREE.Color(0xf2f5f8);
const _tempParticleColor = new THREE.Color();
const _tempSparkleColorA = new THREE.Color(0x666666);
const _tempSparkleColorB = new THREE.Color(0x997700);

export class CometSystem {
  constructor(
    scene,
    trailSystem,
    smokeSystem = null
  ) {
    this.scene = scene;
    this.trailSystem = trailSystem;
    this.smokeSystem = smokeSystem;
    this.activeComets = [];
    this.pendingDetachedLaunches = [];
    this.simulationTime = 0;
    this.launchZone = LAUNCH_ZONE_CONFIG;
    this.shellPresetFactory = new ShellPresetFactory();
    this.eventSubscriptions = [];

    this.graphicsQualityMultiplier = 1.0;
    this.setGraphicsQuality(
      (typeof localStorage !== 'undefined' && localStorage?.getItem)
        ? localStorage.getItem('graphics_quality') || 'medium'
        : 'medium'
    );
    this.eventSubscriptions.push(
      globalEventBus.on(
        'graphics:quality',
        (quality) => this.setGraphicsQuality(quality)
      ),
      globalEventBus.on(
        'firework:clear',
        () => this.clear()
      ),
      globalEventBus.on(
        'comet:spawn',
        (detail) => this.spawnComet(detail)
      )
    );
  }

  setGraphicsQuality(quality) {
    this.graphicsQuality = quality;
    if (quality === 'low') {
      this.graphicsQualityMultiplier = 0.6;
    } else if (quality === 'medium') {
      this.graphicsQualityMultiplier = 1.0;
    } else if (quality === 'high') {
      this.graphicsQualityMultiplier = 1.25;
    }
  }

  destroy() {
    this.clear();
    for (const unsubscribe of this.eventSubscriptions) {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    }
    this.eventSubscriptions.length = 0;
  }

  emitFireworkEvent(type, detail) {
    globalEventBus.emit(type, detail);
  }

  spawnComet({ position, velocity, color, preset = null, spiral = null, lifetime = null }) {
    if (!position || !velocity) return null;
    const cometColor = (color instanceof THREE.Color)
      ? color.clone()
      : new THREE.Color(color ?? 0xffffff);

    const comet = new CometEntity({
      position: position.clone(),
      velocity: velocity.clone(),
      color: cometColor,
      preset,
      spiral,
      lifetime
    });

    comet.mesh.traverse((child) => {
      child.layers.enable(LAYER_REFLECTION);
    });

    this.scene.add(comet.mesh);
    this.activeComets.push(comet);
    return comet;
  }

  launchRandom(preset = null, options = {}) {
    const {
      ratioX,
      ratioY,
      ratioZ,
      sectorId,
      angleOffset,
      color,
      effectOverrides,
      spiral
    } = options;

    // Nếu preset là tên key (string), phân giải thành object preset
    let resolvedPreset = preset;
    if (typeof preset === 'string') {
      resolvedPreset = this.shellPresetFactory.createPresetByKey(preset);
    } else if (preset === null) {
      resolvedPreset = this.shellPresetFactory.createPresetByKey('comet_cluster');
    }

    // Áp dụng ghi đè cấu hình hiệu ứng từ sequence / inspector
    let finalPreset = resolvedPreset;
    if (effectOverrides && typeof effectOverrides === 'object') {
      finalPreset = { ...(resolvedPreset || {}), ...effectOverrides };
    }

    const resolvedSpiral = spiral ||
      effectOverrides?.spiral ||
      finalPreset?.spiral ||
      null;

    const rawClusterCount = finalPreset?.clusterCount ?? 1;
    const clusterCount = rawClusterCount > 1
      ? Math.max(
        2,
        Math.round(rawClusterCount * this.graphicsQualityMultiplier)
      )
      : 1;
    const basePosition = this.resolveLaunchPosition(ratioX, ratioZ, sectorId);

    // Use a unified color for the cluster, or mixed. We'll use a unified color for elegance.
    const clusterColor = color ? new THREE.Color(color) : new THREE.Color(FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)]);

    if (finalPreset?.shellType === 'comet_cluster_cc' && this.preset?.secondColor) {
      const hex = clusterColor.getHex();
      const colorMap = {
        0xffffff: 0xff4500,     // White -> Orange Red
        0xffd700: 0x00bfff,    // Gold -> Sky Blue
        0xff4500: 0x7fffd4,    // Orange Red -> Aquamarine
        0x00bfff: 0xff69b4,    // Sky Blue -> Hot Pink
        0xff69b4: 0x7fffd4,    // Hot Pink -> Aquamarine
        0x7fffd4: 0x8a2be2,    // Aquamarine -> Blue Violet
        0x8a2be2: 0xffd700     // Blue Violet -> Gold
      };
      finalPreset.secondColor = colorMap[hex] || 0xffffff;
    }

    const hasStrobeTag = Boolean(
      finalPreset?.strobe ||
      (Array.isArray(finalPreset?.effects) && (
        finalPreset.effects.includes('strobe') ||
        finalPreset.effects.includes('white-strobe') ||
        finalPreset.effects.includes('glitter-strobe')
      ))
    );
    const strobeCount = hasStrobeTag 
      ? Math.max(1, Math.min(3, Math.round(clusterCount * 0.3))) 
      : 0;

    const isCascade = Boolean(finalPreset?.isCascade)
      || finalPreset?.shellType === 'comet_cluster_cascade';

    const selectedCascadePalette = (isCascade && !color)
      ? CASCADE_PALETTES[Math.floor(Math.random() * CASCADE_PALETTES.length)]
      : null;

    const isDetachedCluster = !isCascade && clusterCount > 1 && Boolean(
      finalPreset?.shellType === 'comet_cluster_detached' ||
      finalPreset?.detachedTrail ||
      ['detached', 'detached-trail'].includes(finalPreset?.cometTrail)
    );
    const detachedTargetHeight = isDetachedCluster ? this.resolveBurstHeight(finalPreset, ratioY) : null;
    const detachedBaseVelocity = isDetachedCluster
      ? this.resolveLaunchVelocity(detachedTargetHeight, angleOffset || 0)
      : null;
    const detachedDirections = [];
    let detachedRanks = null;
    if (isDetachedCluster) {
      const direction = detachedBaseVelocity.clone().normalize();
      const reference = Math.abs(direction.y) > 0.9
        ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
      const right = new THREE.Vector3().crossVectors(direction, reference).normalize();
      const up = new THREE.Vector3().crossVectors(direction, right).normalize();
      // Independent strata fill the column length and its disk, without a
      // launch-order speed ramp or a visible ring of equal-radius stars.
      const shuffle = values => {
        for (let i = values.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [values[i], values[j]] = [values[j], values[i]];
        }
        return values;
      };
      const nominalSpeed = detachedBaseVelocity.length();
      const speeds = shuffle(Array.from({ length: clusterCount }, (_, i) => {
        const u = (i + Math.random()) / clusterCount;
        // Non-linear curve spanning from low base (~0.22) to high apex (~1.16)
        const shaped = 0.22 + 0.94 * (0.35 * u + 0.65 * Math.pow(u, 0.9));
        const jitter = (Math.random() - 0.5) * 0.04;
        return Math.max(0.20, shaped + jitter);
      }));
      const radii = shuffle(Array.from({ length: clusterCount }, (_, i) =>
        5 * Math.sqrt((i + Math.random()) / clusterCount)));
      const azimuths = shuffle(Array.from({ length: clusterCount }, (_, i) =>
        Math.PI * 2 * (i + Math.random()) / clusterCount));
      for (let i = 0; i < clusterCount; i++) {
        const angle = azimuths[i];
        // Scale maximum allowable radial offset to preserve tight column beam coherence
        const axialSpeed = speeds[i];
        const maxOffset = Math.min(5, Math.max(1.5, axialSpeed * nominalSpeed * Math.tan(0.14)));
        const radiusJitter = 0.85 + Math.random() * 0.30;
        const clampedRadius = Math.min(radii[i] * radiusJitter, maxOffset);
        const offset = right.clone().multiplyScalar(Math.cos(angle))
          .addScaledVector(up, Math.sin(angle)).multiplyScalar(clampedRadius);
        detachedDirections.push(detachedBaseVelocity.clone()
          .multiplyScalar(speeds[i]).add(offset));
      }
      const heightOrder = detachedDirections
        .map((velocity, index) => ({ vy: velocity.y, index }))
        .sort((a, b) => a.vy - b.vy);
      detachedRanks = new Array(clusterCount);
      for (let r = 0; r < heightOrder.length; r++) {
        detachedRanks[heightOrder[r].index] = clusterCount > 1 ? r / (clusterCount - 1) : 0;
      }
    }

    for (let i = 0; i < clusterCount; i++) {
      let targetHeight;
      let velocity;
      let cometColor;

      if (isCascade) {
        // Phân bổ các hạt lấp đầy thể tích hình nón/cột dọc từ thấp lên cao
        const linearProgress = clusterCount > 1 ? (i / (clusterCount - 1)) : 0.5;
        // Jitter nhẹ theo chiều cao để các hạt phân bố tự nhiên khắp cột
        const progress = Math.min(1.0, Math.max(0.0, linearProgress + (Math.random() - 0.5) * (0.8 / clusterCount)));

        // Dải độ cao trải dài từ 30% đến 130% độ cao danh định
        const heightMultiplier = 0.30 + progress * 1.00;
        targetHeight = this.resolveBurstHeight(preset, ratioY) * heightMultiplier;
        velocity = this.resolveLaunchVelocity(targetHeight, angleOffset || 0);

        // Độ mở rộng hình nón (Cone plume dispersion): đáy hẹp (1.2m), đỉnh mở rộng dần (8.0m)
        const coneRadius = 1.2 + progress * 6.8;
        const radialDist = coneRadius * Math.sqrt(Math.random());
        const theta = Math.random() * Math.PI * 2;

        velocity.x += Math.cos(theta) * radialDist;
        velocity.z += Math.sin(theta) * radialDist;

        // Đổi màu Gradient từ dưới lên trên (Bottom-to-Top Chromatic Gradient)
        if (finalPreset?.secondColor && color) {
          // Trường hợp 1: Có 2 màu chỉ định -> lerp từ color (đáy) tới secondColor (đỉnh)
          _tempPaletteColorA.set(color);
          _tempPaletteColorB.set(finalPreset.secondColor);
          cometColor = _tempPaletteColorA.clone().lerp(
            _tempPaletteColorB,
            progress
          );
        } else if (color) {
          // Trường hợp 2: Có 1 màu chỉ định -> shift Hue quang phổ và tăng độ sáng từ đáy lên đỉnh
          cometColor = clusterColor.clone().offsetHSL(
            (progress - 0.5) * 0.16,
            0.05,
            (progress - 0.4) * 0.40
          );
        } else {
          // Trường hợp 3: Mặc định / ngẫu nhiên -> Dùng dải màu đa tầng kinh điển (Rainbow, Sunset, Aurora)
          cometColor = interpolatePaletteColor(selectedCascadePalette, progress);
        }

        // Độ biến thiên vi mô tự nhiên cho từng hạt
        cometColor.offsetHSL(
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.03,
          (Math.random() - 0.5) * 0.05
        );
      } else {
        // Độ cao tính toán trực tiếp từ resolveBurstHeight theo ratioY, dao động nhẹ (+/- 3%)
        if (isDetachedCluster) {
          velocity = detachedDirections[i];
        } else {
          targetHeight = this.resolveBurstHeight(preset, ratioY) *
            (0.97 + Math.random() * 0.06);
          velocity = this.resolveLaunchVelocity(targetHeight, angleOffset || 0);
        }

        // Spread the cluster laterally only when shooting multiple comets
        if (clusterCount > 1 && !isDetachedCluster) {
          velocity.x += (Math.random() - 0.5) * 5;
          velocity.z += (Math.random() - 0.5) * 5;
          velocity.y *= (0.95 + Math.random() * 0.1);
        }

        // Slightly vary color only for multi-clusters
        cometColor = clusterCount > 1
          ? clusterColor.clone().offsetHSL(
            (Math.random() - 0.5) * 0.05,
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.2
          )
          : clusterColor.clone();
      }

      const baseHeadScale = Number.isFinite(finalPreset?.detachedHeadScale) && finalPreset.detachedHeadScale > 0
        ? finalPreset.detachedHeadScale
        : 0.42;
      const starHeadScale = isDetachedCluster
        ? baseHeadScale * (0.80 + Math.random() * 0.40)
        : baseHeadScale;

      const cometPreset = {
        ...(hasStrobeTag ? { ...finalPreset, isStrobeStar: (i < strobeCount) } : finalPreset),
        ...(isDetachedCluster ? { detachedHeadScale: starHeadScale } : {})
      };

      const immediateCount = Math.ceil(clusterCount * 0.25);
      const launchDelay = isDetachedCluster && i >= immediateCount
        ? 0.12 * (i - immediateCount + Math.random()) / (clusterCount - immediateCount)
        : 0;
      const clusterLifetime = Number.isFinite(finalPreset?.detachedLifetime) && finalPreset.detachedLifetime > 0
        ? finalPreset.detachedLifetime : 2.5;
      const sweepDuration = Number.isFinite(finalPreset?.detachedSweepDuration) && finalPreset.detachedSweepDuration > 0
        ? finalPreset.detachedSweepDuration
        : 0.12;
      const baseLifetime = clusterLifetime - 0.04;
      const rankOffset = (isDetachedCluster && detachedRanks)
        ? detachedRanks[i] * sweepDuration
        : 0;
      const launch = {
        position: basePosition.clone(),
        velocity,
        color: cometColor,
        preset: cometPreset,
        spiral: resolvedSpiral,
        // Extinguish sequentially from bottom to top at rapid speed
        lifetime: isDetachedCluster
          ? Math.max(0.1, baseLifetime + rankOffset - launchDelay)
          : null
      };
      if (isDetachedCluster && i >= immediateCount) {
        // Capture launch data now: later launches must not depend on caller mutations.
        const snapshot = (value) => {
          if (value === null || typeof value !== 'object') return value;
          if (typeof value.clone === 'function') return value.clone();
          if (Array.isArray(value)) return value.map(snapshot);
          return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, snapshot(item)]));
        };
        this.pendingDetachedLaunches.push({
          time: this.simulationTime + launchDelay,
          launch: snapshot(launch)
        });
      } else {
        this.spawnComet(launch);
      }
    }
    this.pendingDetachedLaunches.sort((a, b) => a.time - b.time);

    const baseTargetHeight = detachedTargetHeight ?? this.resolveBurstHeight(preset, ratioY);
    const baseVelocity = detachedBaseVelocity || this.resolveLaunchVelocity(baseTargetHeight, angleOffset || 0);
    const launchDir = baseVelocity.lengthSq() > 0.001
      ? baseVelocity.clone().normalize()
      : new THREE.Vector3(0, 1, 0);

    // Emit a launch event so AudioSystem and LaunchBarge can react
    this.emitFireworkEvent(
      'firework:launch',
      {
        shellId: Date.now(),
        shellType: 'comet_cluster',
        shapeType: 'comet',
        effectType: 'comet',
        colorHex: clusterColor.getHex(),
        sound: (isDetachedCluster ? finalPreset?.sound : preset?.sound) || null,
        position: {
          x: basePosition.x,
          y: basePosition.y,
          z: basePosition.z
        },
        velocity: {
          x: baseVelocity.x,
          y: baseVelocity.y,
          z: baseVelocity.z
        },
        direction: {
          x: launchDir.x,
          y: launchDir.y,
          z: launchDir.z
        },
        intensity: 0.8
      }
    );
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

    const baseAngle = maxAngle - rx * (maxAngle - minAngle);
    this._lastLaunchAngle = baseAngle;

    const arcRadius = this.launchZone.arcRadius || 360;
    const thicknessOffset = (rz - 0.5) * this.launchZone.launchRadiusZ * 2;
    const finalRadius = arcRadius + thicknessOffset;

    const x = finalRadius * Math.cos(baseAngle);
    const z = -finalRadius * Math.sin(baseAngle);

    return this.launchZone.center.clone().add(new THREE.Vector3(x, 0, z));
  }

  resolveBurstHeight(preset = null, ratioY) {
    const minCometY = 30;
    const maxCometY = THREE.MathUtils.lerp(
      this.launchZone.minBurstY,
      this.launchZone.maxBurstY,
      0.65
    );
    if (ratioY !== undefined) {
      return THREE.MathUtils.lerp(
        minCometY,
        maxCometY,
        ratioY
      );
    }
    // Default low to mid height range for comets
    return THREE.MathUtils.lerp(
      minCometY,
      maxCometY,
      0.35 + Math.random() * 0.2
    );
  }

  resolveLaunchVelocity(burstHeight, angleOffset = 0) {
    // Tính toán vận tốc trục Y cần thiết để đạt đến targetHeight bằng công thức vật lý:
    // v_y = sqrt(2 * g * h) với g = 30, h = burstHeight - groundY
    const gravity = 30;
    const groundY = this.launchZone.center.y; // -50
    const h = Math.max(burstHeight - groundY, 5); // Đảm bảo bay lên tối thiểu 5 unit

    const requiredVy = Math.sqrt(2 * gravity * h);

    const baseAngle = this._lastLaunchAngle || (Math.PI / 2);

    const forwardSpeed = 15;

    // vy luôn đảm bảo đạt đủ độ cao
    const vy = requiredVy;
    // Vận tốc tạt ngang (tilt) để bay xéo, tính bằng tan(angle) với ngưỡng an toàn tối đa 85 độ
    const maxTiltRad = 85 * (Math.PI / 180);
    const safeAngle = THREE.MathUtils.clamp(
      angleOffset,
      -maxTiltRad,
      maxTiltRad
    );
    const tiltRight = requiredVy * Math.tan(safeAngle);

    const vx = forwardSpeed * Math.cos(baseAngle) + tiltRight * Math.sin(baseAngle);
    const vz = -forwardSpeed * Math.sin(baseAngle) + tiltRight * Math.cos(baseAngle);

    return new THREE.Vector3(vx, vy, vz);
  }

  clear() {
    this.pendingDetachedLaunches.length = 0;
    for (let i = 0; i < this.activeComets.length; i++) {
      const comet = this.activeComets[i];
      if (comet) {
        if (comet.mesh) {
          this.scene.remove(comet.mesh);
        }
        comet.dispose?.();
      }
    }
    this.activeComets.length = 0;
  }

  spawnCrossetteCross(position, color, velocity) {
    const dir = velocity.lengthSq() > 0.001
      ? velocity.clone().normalize()
      : new THREE.Vector3(0, 1, 0);
    const upVec = Math.abs(dir.y) > 0.85
      ? new THREE.Vector3(1, 0, 0)
      : new THREE.Vector3(0, 1, 0);
    const rightVec = new THREE.Vector3().crossVectors(dir, upVec).normalize();
    const crossUpVec = new THREE.Vector3().crossVectors(dir, rightVec).normalize();

    const branchDirs = [
      rightVec,
      rightVec.clone().negate(),
      crossUpVec,
      crossUpVec.clone().negate()
    ];

    for (let b = 0; b < 4; b++) {
      const branchVel = branchDirs[b].clone().multiplyScalar(15.0 + Math.random() * 3.5);
      branchVel.y += 1.5;

      const subComet = new CometEntity({
        position: position.clone(),
        velocity: branchVel,
        color: color.clone().offsetHSL(0, 0.05, 0.15),
        preset: {
          thickTrail: false,
          thinTrail: true,
          maxDecayTime: 0.55,
          noBurst: true,
          launchTrail: true
        }
      });
      subComet.mesh.traverse((child) => {
        child.layers.enable(LAYER_REFLECTION);
      });
      this.scene.add(subComet.mesh);
      this.activeComets.push(subComet);
    }

    this.trailSystem.spawnMicroCrackle(position.clone(), color);
  }

  spawnTadpoleArrowSparks(
    position,
    color,
    velocity,
    isStrobe = false,
    hasCrackle = false,
    options = {}
  ) {
    const dir = velocity && velocity.lengthSq() > 0.01
      ? velocity.clone().normalize()
      : new THREE.Vector3(0, 1, 0);

    const upVec = Math.abs(dir.y) > 0.88
      ? new THREE.Vector3(1, 0, 0)
      : new THREE.Vector3(0, 1, 0);
    const rightVec = new THREE.Vector3().crossVectors(dir, upVec).normalize();
    const forwardVec = new THREE.Vector3().crossVectors(rightVec, dir).normalize();

    const tadpoleCfg = FIREWORK_CONFIG.COMET_TADPOLE || {};
    const sizeScale = options?.tadpoleSizeScale ?? options?.sizeScale ?? 1.0;
    const densityScale = options?.tadpoleDensityScale ?? options?.densityScale ?? 1.0;
    const deflectionScale = options?.tadpoleDeflectionScale ?? options?.deflectionScale ?? 1.0;

    const standoffDist = tadpoleCfg.standoffDistance ?? 0.25;
    const spawnPos = position.clone().addScaledVector(
      dir,
      -standoffDist
    );
    const minSparks = tadpoleCfg.arrowSparksMin ?? 5;
    const maxSparks = tadpoleCfg.arrowSparksMax ?? 8;
    const baseCount = minSparks + Math.floor(Math.random() * (maxSparks - minSparks + 1));
    const count = Math.max(2, Math.round(baseCount * densityScale));

    const brightness = (tadpoleCfg.sparkBrightnessMultiplier ?? 4.2) * (0.85 + 0.3 * Math.random());
    const speedMin = (tadpoleCfg.arrowSpeedMin ?? 28.0) * sizeScale;
    const speedMax = (tadpoleCfg.arrowSpeedMax ?? 48.0) * sizeScale;
    const needleDrag = tadpoleCfg.needleDragScale ?? 0.38;

    // Hot incandescent flash right at the core/origin of the spiky flurry
    if (this.trailSystem && typeof this.trailSystem.spawnTrailParticle === 'function') {
      const centerBrightness = (tadpoleCfg.centerCoreBrightness ?? 7.5) * Math.min(1.4, Math.max(0.7, sizeScale));
      const centerColor = new THREE.Color(0xffffff)
        .lerp(color, 0.25)
        .multiplyScalar(centerBrightness);
      const centerVel = dir.clone().multiplyScalar(2.2);
      this.trailSystem.spawnTrailParticle(
        spawnPos,
        centerColor,
        1.0,
        false,
        0.16 + Math.random() * 0.10,
        1.0,
        isStrobe,
        centerVel,
        0.20,
        1.0,
        false,
        null,
        true
      );
    }

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      // Góc xòe gai nhọn mở rộng theo sizeScale (cái xù to thì gai xòe rộng và vươn dài, cái xù nhỏ thì gọn hơn)
      const coneAngle = (1.05 + Math.random() * 0.40) * Math.min(1.15, Math.max(0.85, sizeScale));
      const radialX = Math.cos(angle) * Math.sin(coneAngle);
      const radialZ = Math.sin(angle) * Math.sin(coneAngle);
      const backScale = -Math.cos(coneAngle) * 0.45;

      const ejectDir = new THREE.Vector3()
        .addScaledVector(rightVec, radialX)
        .addScaledVector(forwardVec, radialZ)
        .addScaledVector(dir, backScale)
        .normalize();

      const speed = speedMin + Math.random() * (speedMax - speedMin);
      const sparkVel = ejectDir.multiplyScalar(speed);
      if (velocity) {
        sparkVel.addScaledVector(velocity, 0.35);
      }

      // Tăng sáng rực rỡ và phát quang (bloom) cho hạt tia gai
      const sparkColor = color.clone().offsetHSL(
        (Math.random() - 0.5) * 0.04,
        0.10,
        0.30 + Math.random() * 0.16
      ).multiplyScalar(brightness);

      const sparkLife = (tadpoleCfg.arrowStarLife ?? 0.48)
        * Math.sqrt(sizeScale)
        * (0.85 + Math.random() * 0.35);

      if (this.trailSystem && typeof this.trailSystem.spawnTrailParticle === 'function') {
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
    }

    if (
      (hasCrackle || Math.random() < 0.30)
      && this.trailSystem
      && typeof this.trailSystem.spawnMicroCrackle === 'function'
    ) {
      const cracklePos = spawnPos.clone().add(
        new THREE.Vector3(
          (Math.random() - 0.5) * 2.5,
          -Math.random() * 3.0,
          (Math.random() - 0.5) * 2.5
        )
      );
      this.trailSystem.spawnMicroCrackle(cracklePos, color);
    }

    // Phản lực phụt khí ngẫu nhiên làm hạt bay lệch quỹ đạo (khi xù thì bay lệch lung tung)
    if (velocity && deflectionScale > 0.05) {
      const kickBase = tadpoleCfg.variance?.kickImpulseBase ?? 2.8;
      const kickAngle = Math.random() * Math.PI * 2;
      const kickMag = kickBase * deflectionScale * (0.7 + Math.random() * 0.6);
      const kickVec = new THREE.Vector3()
        .addScaledVector(rightVec, Math.cos(kickAngle) * kickMag)
        .addScaledVector(forwardVec, Math.sin(kickAngle) * kickMag);
      velocity.add(kickVec);
    }
  }

  spawnTadpoleFlurry(
    position,
    color,
    velocity,
    isStrobe = false,
    hasCrackle = false,
    options = {}
  ) {
    const dir = velocity && velocity.lengthSq() > 0.01
      ? velocity.clone().normalize()
      : new THREE.Vector3(0, 1, 0);

    const upVec = Math.abs(dir.y) > 0.88
      ? new THREE.Vector3(1, 0, 0)
      : new THREE.Vector3(0, 1, 0);
    const rightVec = new THREE.Vector3().crossVectors(dir, upVec).normalize();
    const forwardVec = new THREE.Vector3().crossVectors(rightVec, dir).normalize();

    const flurryCfg = FIREWORK_CONFIG.COMET_TADPOLE || {};
    const sizeScale = options?.tadpoleSizeScale ?? options?.sizeScale ?? 1.0;
    const densityScale = options?.tadpoleDensityScale ?? options?.densityScale ?? 1.0;
    const deflectionScale = options?.tadpoleDeflectionScale ?? options?.deflectionScale ?? 1.0;

    const standoffDist = flurryCfg.standoffDistance ?? 0.25;
    const spawnPos = position.clone().addScaledVector(
      dir,
      -standoffDist
    );
    const baseCount = flurryCfg.flurryCount || 36;
    const flurryCount = Math.max(12, Math.round(baseCount * densityScale));

    const speedMin = (flurryCfg.arrowSpeedMin ? flurryCfg.arrowSpeedMin * 1.15 : 32.0) * sizeScale;
    const speedMax = (flurryCfg.arrowSpeedMax ? flurryCfg.arrowSpeedMax * 1.15 : 54.0) * sizeScale;
    const starLife = (flurryCfg.flurryStarLife || 0.58) * Math.sqrt(sizeScale);
    const brightness = (flurryCfg.sparkBrightnessMultiplier ?? 4.2) * 1.15;
    const needleDrag = flurryCfg.needleDragScale ?? 0.38;

    // Hot center flash at apex flurry
    if (this.trailSystem && typeof this.trailSystem.spawnTrailParticle === 'function') {
      const centerBrightness = (flurryCfg.centerCoreBrightness ?? 7.5) * 1.25 * sizeScale;
      const centerColor = new THREE.Color(0xffffff)
        .lerp(color, 0.20)
        .multiplyScalar(centerBrightness);
      for (let c = 0; c < 2; c++) {
        this.trailSystem.spawnTrailParticle(
          spawnPos,
          centerColor,
          1.0,
          true,
          0.20 + Math.random() * 0.12,
          1.0,
          false,
          null,
          0.0,
          1.0,
          false,
          null,
          true
        );
      }
    }

    for (let i = 0; i < flurryCount; i++) {
      const angle = (i / flurryCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
      // Bung tỏa hình cầu gai nhọn mở rộng góc quét
      const coneAngle = (0.95 + Math.random() * 0.55) * Math.min(1.15, Math.max(0.85, sizeScale));
      const radialX = Math.cos(angle) * Math.sin(coneAngle);
      const radialZ = Math.sin(angle) * Math.sin(coneAngle);
      const backScale = -Math.cos(coneAngle) * 0.40;

      const ejectDir = new THREE.Vector3()
        .addScaledVector(rightVec, radialX)
        .addScaledVector(forwardVec, radialZ)
        .addScaledVector(dir, backScale)
        .normalize();

      const speed = speedMin + Math.random() * (speedMax - speedMin);
      const subVel = ejectDir.multiplyScalar(speed);
      if (velocity) {
        subVel.addScaledVector(velocity, 0.25);
      }

      // Tăng sáng rực rỡ và phát quang (bloom) cho chùm xù bung tại đỉnh
      const subColor = color.clone().offsetHSL(
        (Math.random() - 0.5) * 0.06,
        0.10,
        0.32 + Math.random() * 0.16
      ).multiplyScalar(brightness);

      const sparkLife = starLife * (0.85 + Math.random() * 0.35);

      if (this.trailSystem && typeof this.trailSystem.spawnTrailParticle === 'function') {
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
    }

    if (this.trailSystem && typeof this.trailSystem.spawnEffectSpark === 'function') {
      const extraSparks = Math.round(14 * densityScale);
      for (let s = 0; s < extraSparks; s++) {
        const sparkPos = spawnPos.clone().add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 2.5 * sizeScale,
            -Math.random() * 3.0 * sizeScale,
            (Math.random() - 0.5) * 2.5 * sizeScale
          )
        );
        this.trailSystem.spawnEffectSpark(
          sparkPos,
          color,
          true,
          null,
          Math.random() * 1000,
          (0.40 + Math.random() * 0.25) * Math.sqrt(sizeScale),
          false
        );
      }
    }

    if (this.trailSystem && typeof this.trailSystem.spawnMicroCrackle === 'function') {
      for (let c = 0; c < 6; c++) {
        const cracklePos = position.clone().add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 3.5,
            -Math.random() * 3.5,
            (Math.random() - 0.5) * 3.5
          )
        );
        this.trailSystem.spawnMicroCrackle(cracklePos, color);
      }
    }

    // Reactive kick at apex flurry (đẩy hạt bay lệch hướng dứt khoát tại đỉnh)
    if (velocity && deflectionScale > 0.05) {
      const kickBase = (flurryCfg.variance?.kickImpulseBase ?? 2.8) * 1.35;
      const kickAngle = Math.random() * Math.PI * 2;
      const kickMag = kickBase * deflectionScale * (0.6 + Math.random() * 0.8);
      const kickVec = new THREE.Vector3()
        .addScaledVector(rightVec, Math.cos(kickAngle) * kickMag)
        .addScaledVector(forwardVec, Math.sin(kickAngle) * kickMag);
      velocity.add(kickVec);
    }
  }

  update(frameDeltaTime) {
    const frameEnd = this.simulationTime + frameDeltaTime;
    while (this.pendingDetachedLaunches.length && this.pendingDetachedLaunches[0].time <= frameEnd + 1e-10) {
      const pending = this.pendingDetachedLaunches.shift();
      const comet = this.spawnComet(pending.launch);
      comet._launchFrameDeltaTime = Math.max(0, frameEnd - pending.time);
    }
    this.simulationTime = frameEnd;
    let activeCount = 0;

    for (let i = 0; i < this.activeComets.length; i++) {
      const comet = this.activeComets[i];
      const isNewLaunch = comet._launchFrameDeltaTime !== undefined;
      const deltaTime = comet._launchFrameDeltaTime ?? frameDeltaTime;
      delete comet._launchFrameDeltaTime;
      if (isNewLaunch && deltaTime === 0) {
        this.activeComets[activeCount++] = comet;
        continue;
      }
      let isDead = comet.update(deltaTime);

      const H_max = comet.initialVy ? (comet.initialVy * comet.initialVy) / 60 : 0;
      const currentHeight = comet.mesh.position.y - (comet.launchY ?? 0);
      const heightRatio = H_max > 0 ? (currentHeight / H_max) : 0;

      const isStrobeActive = comet.hasStrobe &&
        comet.isStrobeStar &&
        comet.state === CometEntity.STATE.LAUNCHING &&
        heightRatio >= (comet.strobe?.activationThreshold ?? 0.5);

      const isDimmedOut = comet.hasStrobe &&
        !comet.isStrobeStar &&
        comet.state === CometEntity.STATE.LAUNCHING &&
        comet.age >= (comet.dimStartTime ?? 999);

      const isGhostDark = Boolean(comet.isGhostDarkPhase);
      const isGhostHidden = Boolean(comet.isGhostInvisible);
      const isSmokeLaunch = comet.preset?.cometTrail === 'smoke'
        || (Boolean(comet.preset?.flightSmoke) && comet.preset?.launchTrail === false)
        || (Boolean(comet.preset?.launchSmoke) && comet.preset?.launchTrail === false);
      let isNoTrailWindow = false;
      if (comet.noTrailTiming) {
        const start = comet.noTrailTiming.start ?? 0;
        const end = comet.noTrailTiming.end ?? (comet.totalLifetime ?? 9999);
        isNoTrailWindow = comet.age >= start && comet.age <= end;
      }
      const isTrailDisabled = (comet.noTrailTiming ? isNoTrailWindow : Boolean(comet.hasNoTrail))
        || comet.preset?.launchTrail === false
        || isSmokeLaunch;

      // Crossette apex cross splitting
      if (
        comet.hasCrossette &&
        !comet.hasSplitCrossette &&
        (comet.state === CometEntity.STATE.DECAYING || comet.velocity.y <= 0)
      ) {
        comet.hasSplitCrossette = true;
        this.spawnCrossetteCross(
          comet.mesh.position,
          comet.color,
          comet.velocity
        );
      }

      // Bắt đầu xù hạt chúc xuống dưới tạo hình mũi tên từ tầm thấp (progress >= 0.28)
      const flurryStartProgress = FIREWORK_CONFIG.COMET_TADPOLE?.arrowFlurryStartProgress ?? 0.28;
      if (
        comet.isTadpole &&
        comet.state === CometEntity.STATE.LAUNCHING &&
        comet.tadpoleProgress !== undefined &&
        comet.tadpoleProgress >= flurryStartProgress
      ) {
        comet.tadpoleArrowTimer = (comet.tadpoleArrowTimer || 0) + deltaTime;
        const arrowInterval = FIREWORK_CONFIG.COMET_TADPOLE?.arrowInterval ?? 0.065;
        if (comet.tadpoleArrowTimer >= arrowInterval) {
          comet.tadpoleArrowTimer = 0;
          this.spawnTadpoleArrowSparks(
            comet.mesh.position,
            comet.color,
            comet.velocity,
            Boolean(comet.hasStrobe),
            Boolean(comet.hasCrackle),
            comet
          );
        }
      }

      // Tadpole flurry burst near apex ("khi gần tới điểm cao nhất thì sẽ xù tỏa nhiều hạt ra xung quanh")
      const isApex = comet.state === CometEntity.STATE.DECAYING ||
        (comet.tadpoleProgress !== undefined && comet.tadpoleProgress >= 0.88) ||
        (comet.initialVy > 15.0 && comet.velocity.y <= 6.0);
      if (
        comet.isTadpole &&
        !comet.hasFlurried &&
        isApex
      ) {
        comet.hasFlurried = true;
        this.spawnTadpoleFlurry(
          comet.mesh.position,
          comet.color,
          comet.velocity,
          Boolean(comet.hasStrobe),
          Boolean(comet.hasCrackle),
          comet
        );
      }

      // Crackle at apex
      if (
        comet.hasCrackle &&
        !comet.hasCrackled &&
        (comet.state === CometEntity.STATE.DECAYING || comet.velocity.y <= 0)
      ) {
        comet.hasCrackled = true;
        if (this.trailSystem && typeof this.trailSystem.spawnMicroCrackle === 'function') {
          for (let c = 0; c < 6; c++) {
            _tempJitter.set(
              (Math.random() - 0.5) * 4.5,
              (Math.random() - 0.5) * 4.5,
              (Math.random() - 0.5) * 4.5
            );
            _tempCracklePos.copy(comet.mesh.position).add(_tempJitter);
            this.trailSystem.spawnMicroCrackle(
              _tempCracklePos,
              comet.color
            );
          }
        }
      }

      const isCluster = Boolean(
        (comet.preset?.clusterCount && comet.preset.clusterCount > 1) ||
        comet.preset?.shellType?.startsWith('comet_cluster') ||
        comet.preset?.type === 'comet_cluster'
      );

      // Thicker trails for comets during launch (before reaching strobe threshold or if not dimmed/ghost-dark/ghost-hidden)
      if (comet.state === CometEntity.STATE.LAUNCHING) {
        if (isSmokeLaunch && !isGhostDark && !isGhostHidden) {
          const prevPos = comet.prevPosition || comet.mesh.position;
          const currPos = comet.mesh.position;
          _tempMoveVec.subVectors(
            currPos,
            prevPos
          );
          const moveDist = _tempMoveVec.length();

          if (moveDist > 0.001) {
            _tempMoveDir.copy(_tempMoveVec).normalize();
          } else if (comet.velocity && comet.velocity.lengthSq() > 0.01) {
            _tempMoveDir.copy(comet.velocity).normalize();
          } else {
            _tempMoveDir.set(0, 1, 0);
          }

          const smokeCfg = FIREWORK_CONFIG.SMOKE;
          const stepDist = smokeCfg?.flightSmokeStepDist || 1.2;
          const maxSubPoints = isCluster ? 3 : 8;
          const subPoints = Math.max(
            1,
            Math.min(
              maxSubPoints,
              Math.ceil(moveDist / stepDist)
            )
          );

          _tempSmokeColor.copy(_tempDefaultSmokeColor);
          if (comet.color) {
            _tempSmokeColor.lerp(comet.color, 0.22);
          }

          for (let p = 1; p <= subPoints; p++) {
            const frac = p / subPoints;
            _tempSamplePos.lerpVectors(
              prevPos,
              currPos,
              frac
            );

            const taperJitter = (0.2 + 0.35 * (1.0 - frac)) * ((smokeCfg?.flightSmokeScale || 4.8) * 0.12);
            _tempSamplePos.x += (Math.random() - 0.5) * taperJitter;
            _tempSamplePos.y += (Math.random() - 0.5) * taperJitter;
            _tempSamplePos.z += (Math.random() - 0.5) * taperJitter;

            _tempJitter.set(
              (Math.random() - 0.5) * 0.8,
              0.3 + Math.random() * 0.8,
              (Math.random() - 0.5) * 0.8
            );
            _tempExhaustVel.copy(_tempMoveDir).multiplyScalar(
              (-1.6 - Math.random() * 1.2) * (0.8 + 0.4 * (1.0 - frac))
            ).add(_tempJitter);

            const smokeLife = (
              (smokeCfg?.flightSmokeLifeMin || 3.5) +
              Math.random() * ((smokeCfg?.flightSmokeLifeMax || 6.5) - (smokeCfg?.flightSmokeLifeMin || 3.5))
            );

            const smokeScale = (smokeCfg?.flightSmokeScale || 4.8) *
              (0.72 + 0.38 * (1.0 - frac)) +
              Math.random() * 1.2;

            const smokeOptions = {
              life: smokeLife,
              scale: smokeScale,
              growth: smokeCfg?.flightSmokeGrowth || 3.2,
              drag: smokeCfg?.flightSmokeDrag || 1.8,
              buoyancy: smokeCfg?.flightSmokeBuoyancy || 0.38,
              opacity: (smokeCfg?.flightSmokeOpacity || 0.28) *
                (1.15 - 0.25 * (1.0 - frac)),
              color: _tempSmokeColor
            };

            if (this.smokeSystem) {
              this.smokeSystem.addSmokePoint(
                _tempSamplePos,
                _tempExhaustVel,
                smokeOptions
              );
            } else {
              globalEventBus.emit(
                'smoke:spawn',
                {
                  position: _tempSamplePos.clone(),
                  velocity: _tempExhaustVel.clone(),
                  options: smokeOptions
                }
              );
            }
          }
        } else if (!isTrailDisabled && !isGhostDark && !isGhostHidden) {
          const isCoreVisible = comet.coreMesh ? (comet.coreMesh.visible || comet.preset?.sparkleAtEnd) : true;
          const currentOpacity = comet.coreMesh?.material?.opacity ?? 1.0;
          const customLife = comet.velocity.y > 0 ? (comet.velocity.y / 30) * 0.85 : 0.05;

          if (isStrobeActive) {
            // Hạt Strobe Star: Thả dòng hạt con lấp lánh (Glitter / Strobe Stream) độc lập lệch pha
            if (comet.shouldSpawnTrail(0.49)) {
              this.trailSystem.spawnTrailParticle(
                comet.mesh.position,
                comet.color,
                0.8,
                true,
                customLife * 0.6,
                0.85,
                true, // strobe
                null,
                1.0,
                1.0,
                false,
                Math.random() * 1000
              );
            }
            if (Math.random() < 0.25 && !comet.preset?.sparkleAtEnd) {
              this.trailSystem.spawnEffectSpark(
                comet.mesh.position,
                comet.isGlitterStrobe ? GLITTER_STROBE_COLOR : comet.color,
                true,
                null,
                Math.random() * 1000,
                customLife * 0.5,
                false
              );
            }
          } else if (!isDimmedOut) {
            // Giai đoạn phóng chuẩn (trước khi đạt ngưỡng phân tách)
            if (isCoreVisible) {
              const isDetached = Boolean(comet.preset?.detachedTrail)
                || comet.preset?.cometTrail === 'detached'
                || comet.preset?.cometTrail === 'detached-trail'
                || comet.preset?.shellType === 'comet_cluster_detached';

              const isCascade = Boolean(comet.preset?.isCascade)
                || comet.preset?.shellType === 'comet_cluster_cascade';

              const minDistSq = comet.isTadpole
                ? 1.44
                : (isCascade
                  ? 0.90
                  : (comet.preset?.thickTrail
                    ? 0.36
                    : ((comet.preset?.thinTrail || isDetached) ? 1.0 : 0.64)));

              if (comet.shouldSpawnTrail(minDistSq)) {
                let spawnPos = comet.mesh.position;
                if (isDetached) {
                  const vel = comet.velocity;
                  const velSpeed = vel ? vel.length() : 0;
                  if (velSpeed > 0.1) {
                    _tempVelDir.copy(vel).normalize();
                  } else {
                    _tempVelDir.set(0, 1, 0);
                  }
                  const gapDistance = Math.max(16.0, Math.min(28.0, velSpeed * 0.22));
                  _tempSpawnPos.copy(comet.mesh.position).addScaledVector(
                    _tempVelDir,
                    -gapDistance
                  );
                  spawnPos = _tempSpawnPos;
                }

                if (comet.isTadpole) {
                  // Kéo dãn vệt: Tăng thời gian sống của hạt và giảm tỷ lệ sinh để không bị vón cục
                  const tadpoleLife = Math.max(0.75, customLife * 0.90);
                  this.trailSystem.spawnTrailParticle(
                    comet.mesh.position,
                    comet.color,
                    1.4,
                    false,
                    tadpoleLife,
                    0.80,
                    false
                  );
                } else if (isDetached) {
                  _tempParticleColor.copy(comet.color).offsetHSL(0, -0.15, -0.12);
                  this.trailSystem.spawnTrailParticle(
                    spawnPos,
                    _tempParticleColor,
                    0.5,
                    false,
                    customLife * 0.5,
                    0.38,
                    false
                  );
                } else if (isCascade) {
                  this.trailSystem.spawnTrailParticle(
                    comet.mesh.position,
                    comet.color,
                    1.4,
                    false,
                    Math.min(1.5, customLife * 0.70),
                    0.85,
                    false
                  );
                } else if (comet.preset?.thickTrail) {
                  this.trailSystem.spawnTrailParticle(
                    comet.mesh.position,
                    comet.color,
                    1.5,
                    false,
                    customLife,
                    0.9,
                    false
                  );
                } else if (comet.preset?.thinTrail) {
                  this.trailSystem.spawnTrailParticle(
                    comet.mesh.position,
                    comet.color,
                    0.6,
                    false,
                    customLife * 0.7,
                    0.05,
                    false
                  );
                } else {
                  this.trailSystem.spawnTrailParticle(
                    comet.mesh.position,
                    comet.color,
                    1.0,
                    true,
                    customLife,
                    0.12,
                    false
                  );
                }
              }

              const sparkChance = isCascade ? 0.015 : 0.08;
              if (Math.random() < sparkChance && !comet.preset?.sparkleAtEnd && !isDetached) {
                this.trailSystem.spawnEffectSpark(
                  comet.mesh.position,
                  comet.color,
                  false
                );
              }

              const launchSmokeChance = isCluster ? 0.10 : 0.25;
              if (comet.preset?.launchSmoke && Math.random() < launchSmokeChance && !isDetached) {
                _tempSmokeVel.copy(comet.velocity).multiplyScalar(-0.12);
                const smokeOptions = {
                  life: 1.5 + Math.random() * 0.7,
                  scale: 4.8 + Math.random() * 2.2,
                  growth: 3.2,
                  opacity: 0.22,
                  color: comet.color
                };
                if (this.smokeSystem) {
                  this.smokeSystem.addSmokePoint(
                    comet.mesh.position,
                    _tempSmokeVel,
                    smokeOptions
                  );
                } else {
                  globalEventBus.emit(
                    'smoke:spawn',
                    {
                      position: comet.mesh.position.clone(),
                      velocity: _tempSmokeVel.clone(),
                      options: smokeOptions
                    }
                  );
                }
              }
            }
          } else if (currentOpacity > 0.08) {
            // Các hạt đang mờ dần: Nhả vệt đuôi mờ dần tỷ lệ thuận theo opacity
            if (comet.shouldSpawnTrail(1.2) && Math.random() < 0.35 * currentOpacity) {
              this.trailSystem.spawnTrailParticle(
                comet.mesh.position,
                comet.color,
                0.5,
                true,
                customLife * 0.4,
                0.15 * currentOpacity,
                false
              );
            }
          }
        }

        // Hiệu ứng crackle (tia lửa li ti nổ lách tách) dọc theo đường bay
        if (comet.hasCrackle && Math.random() < 0.10) {
          this.trailSystem.spawnMicroCrackle(
            comet.mesh.position,
            comet.color
          );
        }

        // Thêm hiệu ứng khói ở đuôi
        if (this.smokeSystem && comet.preset?.launchSmoke && !isTrailDisabled && Math.random() < (isCluster ? 0.08 : 0.20)) {
          _tempDrift.set(
            (Math.random() - 0.5) * 0.5,
            Math.random() * 0.5 + 0.2,
            (Math.random() - 0.5) * 0.5
          );
          this.smokeSystem.spawnPuff(
            comet.mesh.position,
            _tempDrift,
            {
              life: 1.0 + Math.random() * 0.5,
              scale: 2.5 + Math.random() * 2.0,
              growth: 2.5,
              opacity: 0.12 + Math.random() * 0.08,
              color: LAUNCH_SMOKE_COLOR
            }
          );
        }
      }
      if (
        comet.state === CometEntity.STATE.DECAYING ||
        comet.isFading ||
        comet.isGhostFlaring
      ) {
        // Ghost 3-Stage Flare: Bừng sáng chói lòa và tung chùm tia sáng lóe tại đỉnh
        if (comet.isGhostFlaring && !comet.hasEmittedGhostFlare) {
          comet.hasEmittedGhostFlare = true;
          for (let s = 0; s < 4; s++) {
            this.trailSystem.spawnEffectSpark(
              comet.mesh.position,
              WHITE_COLOR,
              true,
              null,
              Math.random() * 1000,
              0.35 + Math.random() * 0.20,
              false
            );
          }
          if (comet.hasCrackle) {
            this.trailSystem.spawnMicroCrackle(
              comet.mesh.position,
              comet.color
            );
          }
        }

        if (!comet.hasNoBurst) {
          if (comet.preset?.sparkleAtEnd) {
            const decayRatio = comet.decayTime / comet.maxDecayTime;
            if (decayRatio > 0.4) {
              // Tần suất lấp lánh tăng dần theo lũy thừa khi càng về cuối vòng đời
              const sparkleChance = 0.25 + Math.pow(decayRatio - 0.4, 2) * 0.75;
              if (Math.random() < sparkleChance) {
                const sparkleColor = Math.random() < 0.55 ? _tempSparkleColorA : _tempSparkleColorB;
                this.trailSystem.spawnEffectSpark(
                  comet.mesh.position,
                  sparkleColor,
                  Boolean(comet.hasStrobe)
                );
              }
            }
          }

          // Crackle lách tách khi đang tàn phai ở đỉnh
          if (comet.hasCrackle && Math.random() < 0.10) {
            this.trailSystem.spawnMicroCrackle(
              comet.mesh.position,
              comet.color
            );
          }
        }
      }

      // Water impact collision check at Y <= 0
      if (comet.mesh.position.y <= 0 && comet.age > 0.1) {
        if (this.smokeSystem) {
          _tempExhaustVel.set(
            (Math.random() - 0.5) * 0.8,
            1.0 + Math.random() * 0.8,
            (Math.random() - 0.5) * 0.8
          );
          _tempSamplePos.set(
            comet.mesh.position.x,
            0.05,
            comet.mesh.position.z
          );
          this.smokeSystem.spawnPuff(
            _tempSamplePos,
            _tempExhaustVel,
            {
              life: 0.9 + Math.random() * 0.5,
              scale: 2.8 + Math.random() * 1.5,
              growth: 2.5,
              opacity: 0.16,
              color: WATER_STEAM_COLOR
            }
          );
        }
        isDead = true;
      }

      if (isDead) {
        this.scene.remove(comet.mesh);
        comet.dispose();
      } else {
        if (i !== activeCount) {
          this.activeComets[activeCount] = comet;
        }
        activeCount++;
      }
    }

    this.activeComets.length = activeCount;
  }
}
