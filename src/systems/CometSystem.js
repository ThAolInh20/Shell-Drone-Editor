import * as THREE from 'three';
import { LAUNCH_ZONE_CONFIG } from '../config/launchZone.js';
import { CometEntity } from '../entities/CometEntity.js';
import { globalEventBus } from '../core/EventBus.js';
import { ShellPresetFactory } from '../factories/ShellPresetFactory.js';
import { LAYER_REFLECTION } from '../config/layers.js';

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

function interpolatePaletteColor(palette, t) {
  const clampedT = Math.max(0, Math.min(1, t));
  const segmentCount = palette.length - 1;
  const scaled = clampedT * segmentCount;
  const idx = Math.min(Math.floor(scaled), segmentCount - 1);
  const frac = scaled - idx;
  const c1 = new THREE.Color(palette[idx]);
  const c2 = new THREE.Color(palette[idx + 1]);
  return c1.lerp(c2, frac);
}

const _tempSmokeVel = new THREE.Vector3();

export class CometSystem {
  constructor(scene, trailSystem) {
    this.scene = scene;
    this.trailSystem = trailSystem;
    this.activeComets = [];
    this.launchZone = LAUNCH_ZONE_CONFIG;
    this.shellPresetFactory = new ShellPresetFactory();
  }

  emitFireworkEvent(type, detail) {
    globalEventBus.emit(type, detail);
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

    const clusterCount = finalPreset?.clusterCount ?? 1;
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
          const startColor = new THREE.Color(color);
          const endColor = new THREE.Color(finalPreset.secondColor);
          cometColor = startColor.lerp(endColor, progress);
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
        targetHeight = this.resolveBurstHeight(preset, ratioY) *
          (0.97 + Math.random() * 0.06);
        velocity = this.resolveLaunchVelocity(targetHeight, angleOffset || 0);

        // Spread the cluster laterally only when shooting multiple comets
        if (clusterCount > 1) {
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

      const cometPreset = hasStrobeTag
        ? { ...finalPreset, isStrobeStar: (i < strobeCount) }
        : finalPreset;

      const comet = new CometEntity({
        position: basePosition.clone(),
        velocity,
        color: cometColor,
        preset: cometPreset,
        spiral: resolvedSpiral
      });

      comet.mesh.traverse((child) => {
        child.layers.enable(LAYER_REFLECTION);
      });
      this.scene.add(comet.mesh);
      this.activeComets.push(comet);
    }

    const baseTargetHeight = this.resolveBurstHeight(preset, ratioY);
    const baseVelocity = this.resolveLaunchVelocity(baseTargetHeight, angleOffset || 0);
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
    if (ratioY !== undefined) {
      // Độ cao tối đa của comet bằng 1/2 pháo hoa (ratioY 0 -> 1 tương ứng 0 -> 0.5 của pháo hoa)
      return THREE.MathUtils.lerp(
        this.launchZone.minBurstY,
        this.launchZone.maxBurstY,
        ratioY * 0.5
      );
    }
    // Mặc định comets bay ở khoảng tầm thấp/trung (0.35 - 0.55 của comet, tương ứng 0.175 - 0.275 của pháo hoa)
    return THREE.MathUtils.lerp(
      this.launchZone.minBurstY,
      this.launchZone.maxBurstY,
      (0.35 + Math.random() * 0.2) * 0.5
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
    // Vận tốc tạt ngang (tilt) để bay xéo, tính bằng tan(angle)
    const tiltRight = requiredVy * Math.tan(angleOffset);

    const vx = forwardSpeed * Math.cos(baseAngle) + tiltRight * Math.sin(baseAngle);
    const vz = -forwardSpeed * Math.sin(baseAngle) + tiltRight * Math.cos(baseAngle);

    return new THREE.Vector3(vx, vy, vz);
  }

  clear() {
    for (const comet of this.activeComets) {
      this.scene.remove(comet.mesh);
      comet.dispose();
    }
    this.activeComets = [];
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

  update(deltaTime) {
    const finished = [];

    for (const comet of this.activeComets) {
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
      const isTrailDisabled = Boolean(comet.hasNoTrail) || comet.preset?.launchTrail === false;

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

      // Thicker trails for comets during launch (before reaching strobe threshold or if not dimmed/ghost-dark/ghost-hidden)
      if (comet.state === CometEntity.STATE.LAUNCHING) {
        if (!isTrailDisabled && !isGhostDark && !isGhostHidden) {
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
                comet.isGlitterStrobe ? new THREE.Color(0xffe082) : comet.color,
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

              const minDistSq = comet.preset?.thickTrail
                ? 0.36
                : ((comet.preset?.thinTrail || isDetached) ? 1.0 : 0.64);

              if (comet.shouldSpawnTrail(minDistSq)) {
                let spawnPos = comet.mesh.position;
                if (isDetached) {
                  const vel = comet.velocity;
                  const velSpeed = vel ? vel.length() : 0;
                  const velDir = velSpeed > 0.1
                    ? vel.clone().normalize()
                    : new THREE.Vector3(0, 1, 0);
                  const gapDistance = Math.max(16.0, Math.min(28.0, velSpeed * 0.22));
                  spawnPos = comet.mesh.position.clone().addScaledVector(velDir, -gapDistance);
                }

                if (isDetached) {
                  const particleColor = comet.color.clone().offsetHSL(0, -0.15, -0.12);
                  this.trailSystem.spawnTrailParticle(
                    spawnPos,
                    particleColor,
                    0.5,
                    false,
                    customLife * 0.5,
                    0.38,
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

              if (Math.random() < 0.08 && !comet.preset?.sparkleAtEnd && !isDetached) {
                this.trailSystem.spawnEffectSpark(
                  comet.mesh.position,
                  comet.color,
                  false
                );
              }

              if (this.smokeSystem && Math.random() < 0.25 && !isDetached) {
                _tempSmokeVel.copy(comet.velocity).multiplyScalar(-0.12);
                this.smokeSystem.addSmokePoint(
                  comet.mesh.position,
                  _tempSmokeVel,
                  {
                    life: 1.5 + Math.random() * 0.7,
                    scale: 4.8 + Math.random() * 2.2,
                    growth: 3.2,
                    opacity: 0.22,
                    color: comet.color
                  }
                );
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
        if (this.smokeSystem && comet.preset?.launchSmoke && !isTrailDisabled && Math.random() < 0.2) {
          const drift = new THREE.Vector3(
            (Math.random() - 0.5) * 0.5,
            Math.random() * 0.5 + 0.2,
            (Math.random() - 0.5) * 0.5
          );
          this.smokeSystem.spawnPuff(comet.mesh.position.clone(), drift, {
            life: 1.0 + Math.random() * 0.5,
            scale: 2.5 + Math.random() * 2.0,
            growth: 2.5,
            opacity: 0.12 + Math.random() * 0.08,
            color: new THREE.Color(0x778090)
          });
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
              comet.mesh.position.clone(),
              new THREE.Color(0xffffff),
              true,
              null,
              Math.random() * 1000,
              0.35 + Math.random() * 0.20,
              false
            );
          }
          if (comet.hasCrackle) {
            this.trailSystem.spawnMicroCrackle(comet.mesh.position.clone(), comet.color);
          }
        }

        if (!comet.hasNoBurst) {
          if (comet.preset?.sparkleAtEnd) {
            const decayRatio = comet.decayTime / comet.maxDecayTime;
            if (decayRatio > 0.4) {
              // Tần suất lấp lánh tăng dần theo lũy thừa khi càng về cuối vòng đời
              const sparkleChance = 0.25 + Math.pow(decayRatio - 0.4, 2) * 0.75;
              if (Math.random() < sparkleChance) {
                const sparkleColor = new THREE.Color(Math.random() < 0.55 ? 0x666666 : 0x997700);
                this.trailSystem.spawnEffectSpark(
                  comet.mesh.position.clone(),
                  sparkleColor,
                  Boolean(comet.hasStrobe)
                );
              }
            }
          }

          // Crackle lách tách khi đang tàn phai ở đỉnh
          if (comet.hasCrackle && Math.random() < 0.10) {
            this.trailSystem.spawnMicroCrackle(comet.mesh.position.clone(), comet.color);
          }
        }
      }

      // Water impact collision check at Y <= 0
      if (comet.mesh.position.y <= 0 && comet.age > 0.1) {
        if (this.smokeSystem) {
          const steamVel = new THREE.Vector3(
            (Math.random() - 0.5) * 0.8,
            1.0 + Math.random() * 0.8,
            (Math.random() - 0.5) * 0.8
          );
          this.smokeSystem.spawnPuff(
            new THREE.Vector3(comet.mesh.position.x, 0.05, comet.mesh.position.z),
            steamVel,
            {
              life: 0.9 + Math.random() * 0.5,
              scale: 2.8 + Math.random() * 1.5,
              growth: 2.5,
              opacity: 0.16,
              color: new THREE.Color(0xdde5ee)
            }
          );
        }
        isDead = true;
      }

      if (isDead) {
        this.scene.remove(comet.mesh);
        comet.dispose();
        finished.push(comet);
      }
    }

    this.activeComets = this.activeComets.filter(item => !finished.includes(item));
  }
}
