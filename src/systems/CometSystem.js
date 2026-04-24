import * as THREE from 'three';
import { LAUNCH_ZONE_CONFIG } from '../config/launchZone.js';
import { CometEntity } from '../entities/CometEntity.js';

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
  }

  emitFireworkEvent(type, detail) {
    window.dispatchEvent(new CustomEvent(type, { detail }));
  }

  launchRandom(preset = null, options = {}) {
    const { ratioX, ratioY, ratioZ, sectorId } = options;
    
    // A comet launch is usually a cluster (mine effect)
    const clusterCount = preset?.particleCountMultiplier ? Math.floor(7 * preset.particleCountMultiplier) : 8;
    const basePosition = this.resolveLaunchPosition(ratioX, ratioZ, sectorId);
    
    // Use a unified color for the cluster, or mixed. We'll use a unified color for elegance.
    const clusterColor = new THREE.Color(FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)]);

    for (let i = 0; i < clusterCount; i++) {
      // Slightly vary the height and velocity for each comet in the cluster
      const targetHeight = this.resolveBurstHeight(preset, ratioY) * (0.8 + Math.random() * 0.4);
      const velocity = this.resolveLaunchVelocity(targetHeight);
      
      // Spread the cluster more laterally
      velocity.x += (Math.random() - 0.5) * 25;
      velocity.z += (Math.random() - 0.5) * 25;
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

  resolveLaunchVelocity(burstHeight) {
    const normalizedHeight = THREE.MathUtils.clamp(
      (burstHeight - this.launchZone.minBurstY) / Math.max(this.launchZone.maxBurstY - this.launchZone.minBurstY, 1),
      0,
      1
    );
    const launchSpeedY = THREE.MathUtils.lerp(this.launchZone.minLaunchSpeedY, this.launchZone.maxLaunchSpeedY, normalizedHeight);
    
    const angle = this._lastLaunchAngle || (Math.PI / 2);
    const fanSpeedX = Math.cos(angle) * 15;
    const fanSpeedZ = -Math.sin(angle) * 15;

    return new THREE.Vector3(fanSpeedX, launchSpeedY, fanSpeedZ);
  }

  update(deltaTime) {
    const finished = [];

    for (const comet of this.activeComets) {
      const isDead = comet.update(deltaTime);

      // Thicker trails for comets
      if (comet.state === CometEntity.STATE.LAUNCHING || comet.state === CometEntity.STATE.DECAYING) {
        // Spawn 1-2 particles per frame per comet
        this.trailSystem.spawnTrailParticle(comet.mesh.position.clone(), comet.color);
        if (Math.random() > 0.5) {
          this.trailSystem.spawnTrailParticle(comet.mesh.position.clone(), comet.color);
        }
        
        // Occasional sparks
        if (Math.random() < 0.15) {
          this.trailSystem.spawnEffectSpark(comet.mesh.position.clone(), comet.color);
        }
      }

      if (isDead) {
        this.scene.remove(comet.mesh);
        finished.push(comet);
      }
    }

    this.activeComets = this.activeComets.filter(item => !finished.includes(item));
  }
}
