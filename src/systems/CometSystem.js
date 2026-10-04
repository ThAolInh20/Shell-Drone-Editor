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

    for (let i = 0; i < clusterCount; i++) {
      // Độ cao tính toán trực tiếp từ resolveBurstHeight theo ratioY, dao động nhẹ (+/- 3%)
      const targetHeight = this.resolveBurstHeight(preset, ratioY) *
        (0.97 + Math.random() * 0.06);
      const velocity = this.resolveLaunchVelocity(targetHeight, angleOffset || 0);

      // Spread the cluster more laterally
      velocity.x += (Math.random() - 0.5) * 5;
      velocity.z += (Math.random() - 0.5) * 5;
      velocity.y *= (0.95 + Math.random() * 0.1);

      // Slightly vary color
      const cometColor = clusterColor.clone().offsetHSL(
        (Math.random() - 0.5) * 0.05,
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.2
      );

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

  update(deltaTime) {
    const finished = [];

    for (const comet of this.activeComets) {
      let isDead = comet.update(deltaTime);

      const H_max = comet.initialVy ? (comet.initialVy * comet.initialVy) / 60 : 0;
      const currentHeight = comet.mesh.position.y - (comet.launchY ?? 0);
      const heightRatio = H_max > 0 ? (currentHeight / H_max) : 0;

      const hasStrobeTag = Boolean(
        comet.preset?.strobe ||
        (Array.isArray(comet.preset?.effects) && (
          comet.preset.effects.includes('strobe') ||
          comet.preset.effects.includes('white-strobe') ||
          comet.preset.effects.includes('glitter-strobe')
        ))
      );

      const isStrobeActive = hasStrobeTag &&
        comet.isStrobeStar &&
        comet.state === CometEntity.STATE.LAUNCHING &&
        heightRatio >= (comet.strobe?.activationThreshold ?? 0.5);

      const isDimmedOut = hasStrobeTag &&
        !comet.isStrobeStar &&
        comet.state === CometEntity.STATE.LAUNCHING &&
        comet.age >= (comet.dimStartTime ?? 999);

      // Thicker trails for comets during launch (before reaching strobe threshold or if not dimmed)
      if (comet.state === CometEntity.STATE.LAUNCHING) {
        if (comet.preset?.launchTrail !== false) {
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
                comet.color,
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
              const minDistSq = comet.preset?.thickTrail ? 0.36 : (comet.preset?.thinTrail ? 1.0 : 0.64);
              if (comet.shouldSpawnTrail(minDistSq)) {
                if (comet.preset?.thickTrail) {
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

              if (Math.random() < 0.08 && !comet.preset?.sparkleAtEnd) {
                this.trailSystem.spawnEffectSpark(
                  comet.mesh.position,
                  comet.color,
                  false
                );
              }

              if (this.smokeSystem && Math.random() < 0.25) {
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

        // Hiệu ứng crackle (tiếng nổ lách tách) dọc theo đường bay
        if (comet.preset?.crackle && Math.random() < 0.08) {
          this.trailSystem.spawnMicroCrackle(
            comet.mesh.position,
            comet.color
          );
          this.emitFireworkEvent('firework:crackle', {
            position: {
              x: comet.mesh.position.x,
              y: comet.mesh.position.y,
              z: comet.mesh.position.z
            }
          });
        }

        // Thêm hiệu ứng khói ở đuôi
        if (this.smokeSystem && comet.preset?.launchSmoke && Math.random() < 0.2) {
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
        comet.isFading
      ) {
        if (comet.preset?.sparkleAtEnd) {
          const decayRatio = comet.decayTime / comet.maxDecayTime;
          if (decayRatio > 0.4) {
            // Tần suất lấp lánh tăng dần theo lũy thừa khi càng về cuối vòng đời
            const sparkleChance = 0.25 + Math.pow(decayRatio - 0.4, 2) * 0.75;
            if (Math.random() < sparkleChance) {
              const sparkleColor = new THREE.Color(Math.random() < 0.55 ? 0x666666 : 0x997700);
              this.trailSystem.spawnEffectSpark(comet.mesh.position.clone(), sparkleColor, Boolean(comet.preset?.strobe));
            }
          }
        }

        // Crackle lách tách khi đang tàn phai ở đỉnh
        if (comet.preset?.crackle && Math.random() < 0.08) {
          this.trailSystem.spawnMicroCrackle(comet.mesh.position.clone(), comet.color);
          this.emitFireworkEvent('firework:crackle', {
            position: {
              x: comet.mesh.position.x,
              y: comet.mesh.position.y,
              z: comet.mesh.position.z
            }
          });
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
