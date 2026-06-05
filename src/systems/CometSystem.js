import * as THREE from 'three';
import { LAUNCH_ZONE_CONFIG } from '../config/launchZone.js';
import { CometEntity } from '../entities/CometEntity.js';
import { globalEventBus } from '../core/EventBus.js';
import { ShellPresetFactory } from '../factories/ShellPresetFactory.js';

const FIREWORK_COLORS = [
  0xffd700, // vàng (gold)
  0xff4500, // cam đỏ (orange red)
  0x00bfff, // xanh da trời (deep sky blue)
  0xff69b4, // hồng (hot pink)
  0x7fffd4, // xanh ngọc (aquamarine)
  0x8a2be2, // tím (blue violet)
  0xffffff  // trắng bạc (silver/white)
];

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
    const { ratioX, ratioY, ratioZ, sectorId, angleOffset, color, effectOverrides } = options;
    
    // Nếu preset là tên key (string), phân giải thành object preset
    let resolvedPreset = preset;
    if (typeof preset === 'string') {
      resolvedPreset = this.shellPresetFactory.createPresetByKey(preset);
    } else if (preset === null) {
      resolvedPreset = this.shellPresetFactory.createPresetByKey('comet_cluster');
    }
    
    // Áp dụng ghi đè cấu hình hiệu ứng từ sequence
    let finalPreset = resolvedPreset;
    if (effectOverrides && typeof effectOverrides === 'object') {
      finalPreset = { ...(resolvedPreset || {}), ...effectOverrides };
    }
    
    const clusterCount = finalPreset?.clusterCount ?? 1;
    const basePosition = this.resolveLaunchPosition(ratioX, ratioZ, sectorId);
    
    // Use a unified color for the cluster, or mixed. We'll use a unified color for elegance.
    const clusterColor = color ? new THREE.Color(color) : new THREE.Color(FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)]);

    for (let i = 0; i < clusterCount; i++) {
      // Độ lệch rất nhỏ (chỉ khoảng +/- 2%) để các tia trong chuỗi tạo thành hình quạt/cung tròn đều đặn
      // Giảm độ cao xuống còn 2/3 so với ban đầu
      const targetHeight = this.resolveBurstHeight(preset, ratioY) * 0.66 * (0.98 + Math.random() * 0.04);
      const velocity = this.resolveLaunchVelocity(targetHeight, angleOffset || 0);
      
      // Spread the cluster more laterally
      velocity.x += (Math.random() - 0.5) * 5; // Reduced spread for single streak
      velocity.z += (Math.random() - 0.5) * 5; // Reduced spread for single streak
      velocity.y *= (0.85 + Math.random() * 0.3);

      // Slightly vary color
      const cometColor = clusterColor.clone().offsetHSL(
        (Math.random() - 0.5) * 0.05,
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.2
      );

      const comet = new CometEntity({
        position: basePosition.clone(),
        velocity,
        color: cometColor,
        preset
      });

      this.scene.add(comet.mesh);
      this.activeComets.push(comet);
    }

    // Emit a launch event so AudioSystem can play the launch sound
    this.emitFireworkEvent('firework:launch', {
      shellId: Date.now(), // Fake ID for audio
      shellType: 'comet_cluster',
      shapeType: 'comet',
      effectType: 'comet',
      colorHex: clusterColor.getHex(),
      position: {
        x: basePosition.x,
        y: basePosition.y,
        z: basePosition.z
      },
      intensity: 0.8
    });
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
      return THREE.MathUtils.lerp(this.launchZone.minBurstY, this.launchZone.maxBurstY, ratioY / 3);
    }
    // Comets generally don't go as high as big shells, lowered to 1/3
    return THREE.MathUtils.lerp(this.launchZone.minBurstY, this.launchZone.maxBurstY, (0.4 + Math.random() * 0.3) / 3);
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
      const isDead = comet.update(deltaTime);

      // Thicker trails for comets
      if (comet.state === CometEntity.STATE.LAUNCHING) {
        const isCoreVisible = comet.coreMesh ? comet.coreMesh.visible : true;
        if (comet.preset?.launchTrail !== false && isCoreVisible) {
          // vy / 30 chính là thời gian còn lại để đạt đỉnh (trọng lực g = 30)
          // Nhân thêm 0.85 để hạt tắt trước đỉnh một chút, giúp phần đuôi thu gọn lại gọn gàng khi đạt đỉnh
          const customLife = comet.velocity.y > 0 ? (comet.velocity.y / 30) * 0.85 : 0.05;
          this.trailSystem.spawnTrailParticle(comet.mesh.position.clone(), comet.color, 1.0, true, customLife);
          if (Math.random() < 0.15) {
            this.trailSystem.spawnEffectSpark(comet.mesh.position.clone(), comet.color);
          }
        }

        // Hiệu ứng crackle (tiếng nổ lách tách) dọc theo đường bay
        if (comet.preset?.crackle && Math.random() < 0.12) {
          this.trailSystem.spawnMicroCrackle(comet.mesh.position.clone(), comet.color);
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

      // Sinh hạt lấp lánh khi gần kết thúc (decaying phase) nếu preset yêu cầu hoặc có hiệu ứng crackle
      if (comet.state === CometEntity.STATE.DECAYING) {
        if (comet.preset?.sparkleAtEnd) {
          const decayRatio = comet.decayTime / comet.maxDecayTime;
          if (decayRatio > 0.4) {
            // Tần suất lấp lánh tăng dần theo lũy thừa khi càng về cuối vòng đời
            const sparkleChance = 0.25 + Math.pow(decayRatio - 0.4, 2) * 0.75;
            if (Math.random() < sparkleChance) {
              const sparkleColor = new THREE.Color(Math.random() < 0.55 ? 0xffffff : 0xffd700);
              this.trailSystem.spawnEffectSpark(comet.mesh.position.clone(), sparkleColor);
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

      if (isDead) {
        this.scene.remove(comet.mesh);
        comet.dispose();
        finished.push(comet);
      }
    }

    this.activeComets = this.activeComets.filter(item => !finished.includes(item));
  }
}
