import * as THREE from 'three';
import { globalEventBus } from '../core/EventBus.js';

export class SkyLightReactionSystem {
  constructor(
    sceneManager,
    smokeSystem = null,
    droneSystem = null
  ) {
    this.sceneManager = sceneManager;
    this.smokeSystem = smokeSystem;
    this.droneSystem = droneSystem;
    this.scene = sceneManager.instance;
    this.reactions = [];
    this.maxReactions = 8;
    this.eventSubscriptions = [];

    this.baseSkyColor = sceneManager.baseSkyColor.clone();
    this.baseAmbientIntensity = sceneManager.baseAmbientIntensity;
    this.baseHemisphereIntensity = sceneManager.baseHemisphereIntensity;

    this.reusableBurstLight = new THREE.PointLight(0xffffff, 0, 900, 2);
    this.scene.add(this.reusableBurstLight);

    this.eventSubscriptions.push(
      globalEventBus.on('firework:burst', (detail) => this.onBurst(detail))
    );
  }

  destroy() {
    for (const unsubscribe of this.eventSubscriptions) {
      unsubscribe();
    }
  }

  onBurst(detail = {}) {
    if (detail.intensity !== undefined && detail.intensity <= 0.001) {
      return;
    }
    const color = new THREE.Color(detail.colorHex ?? 0xffffff);
    const color2 = detail.color2Hex !== undefined && detail.color2Hex !== null
      ? new THREE.Color(detail.color2Hex)
      : null;
    const rawIntensity = THREE.MathUtils.clamp(
      detail.intensity ?? 0.6,
      0.1,
      1.0
    );
    const intensity = Math.pow(rawIntensity, 1.35);
    const skyDuration = THREE.MathUtils.clamp(
      detail.duration ?? 1.2,
      0.35,
      1.6
    );
    const starDuration = THREE.MathUtils.clamp(
      detail.particleLife ?? (2.0 + intensity * 1.5),
      1.2,
      6.0
    );

    const position = new THREE.Vector3(
      detail.position?.x ?? 0,
      detail.position?.y ?? 120,
      detail.position?.z ?? 0
    );

    this.reactions.push({
      color,
      color2,
      intensity,
      skyDuration,
      starDuration,
      age: 0,
      position,
      burstRadius: detail.burstRadius ?? 45.0,
      isStrobe: Boolean(detail.isStrobe)
    });

    if (this.reactions.length > this.maxReactions) {
      this.reactions.shift();
    }
  }

  update(deltaTime) {
    if (this.reactions.length === 0) {
      this.resetToBase(deltaTime);
      return;
    }

    const alive = [];
    const colorAccumulator = new THREE.Color(0, 0, 0);
    let totalWeight = 0;
    let skyEnergy = 0;
    let strongest = null;
    let secondStrongest = null;
    const activeSmokeLights = [];

    for (const reaction of this.reactions) {
      reaction.age += deltaTime;
      if (reaction.age >= reaction.starDuration) {
        continue;
      }

      // 1. Sky & Ambient Lighting (Short flash to keep sky night dark)
      const tSky = reaction.age / reaction.skyDuration;
      let skyWeight = 0;
      if (tSky < 1.0) {
        const flash = Math.exp(-4.6 * tSky) * reaction.intensity;
        const tail = Math.exp(-1.55 * tSky) * reaction.intensity * 0.42;
        skyWeight = flash + tail;
        totalWeight += skyWeight;
        skyEnergy += skyWeight;
        colorAccumulator.add(reaction.color.clone().multiplyScalar(skyWeight));
      }

      // 2. Star Cluster Radiance & Burst Illumination for Smoke & Local Objects
      const tStar = reaction.age / reaction.starDuration;
      const flashPeak = Math.exp(-7.5 * reaction.age) * reaction.intensity * 1.6;
      const starFuel = Math.pow(Math.max(0.0, 1.0 - tStar), 1.2);
      let starRadiance = reaction.intensity * 0.9 * starFuel;

      if (reaction.isStrobe) {
        const strobePhase = Math.sin(reaction.age * 36.0);
        const strobeMultiplier = strobePhase > 0.0 ? 1.4 : 0.2;
        starRadiance *= strobeMultiplier;
      }

      const localIntensity = flashPeak + starRadiance;
      const lightRadius = THREE.MathUtils.lerp(
        180.0,
        420.0,
        Math.min(1.0, reaction.age * 0.85)
      );

      const lightColor = reaction.color2
        ? reaction.color.clone().lerp(reaction.color2, tStar)
        : reaction.color;

      if (localIntensity > 0.005) {
        activeSmokeLights.push({
          position: reaction.position,
          color: lightColor,
          intensity: THREE.MathUtils.clamp(
            localIntensity * 1.35,
            0.0,
            1.8
          ),
          radius: lightRadius,
          weight: localIntensity
        });
      }

      const combinedWeight = Math.max(skyWeight, localIntensity);
      if (!strongest || combinedWeight > strongest.weight) {
        secondStrongest = strongest;
        strongest = {
          weight: combinedWeight,
          position: reaction.position,
          color: lightColor
        };
      } else if (!secondStrongest || combinedWeight > secondStrongest.weight) {
        secondStrongest = {
          weight: combinedWeight,
          position: reaction.position,
          color: lightColor
        };
      }

      alive.push(reaction);
    }

    this.reactions = alive;

    const droneLight = this.getDroneLight();
    if (droneLight) {
      activeSmokeLights.push(droneLight);
    }

    // Distribute multi-source illumination to smoke system
    activeSmokeLights.sort((a, b) => b.intensity - a.intensity);

    if (this.smokeSystem) {
      if (typeof this.smokeSystem.setMultiLights === 'function') {
        this.smokeSystem.setMultiLights(activeSmokeLights);
      } else if (typeof this.smokeSystem.setBurstFlash === 'function') {
        if (activeSmokeLights.length > 0) {
          this.smokeSystem.setBurstFlash(
            activeSmokeLights[0].position,
            activeSmokeLights[0].color,
            activeSmokeLights[0].intensity,
            activeSmokeLights[0].radius
          );
        } else {
          this.smokeSystem.setBurstFlash(null, null, 0);
        }
      }
    }

    const blendedColor = totalWeight > 0
      ? colorAccumulator.multiplyScalar(1 / totalWeight)
      : this.baseSkyColor.clone();

    // Significantly reduced global light influence to keep the sky dark
    const skyMix = THREE.MathUtils.clamp(
      skyEnergy * 0.005,
      0,
      0.008
    );
    const fogMix = THREE.MathUtils.clamp(
      skyEnergy * 0.005,
      0,
      0.008
    );
    const ambientBoost = THREE.MathUtils.clamp(
      skyEnergy * 0.002,
      0,
      0.004
    );
    const hemiBoost = THREE.MathUtils.clamp(
      skyEnergy * 0.002,
      0,
      0.004
    );

    const skyTarget = this.baseSkyColor.clone().lerp(blendedColor, skyMix);
    const fogTarget = this.baseSkyColor.clone().lerp(blendedColor, fogMix);

    this.scene.background.copy(skyTarget);
    this.scene.fog.color.copy(fogTarget);
    if (this.sceneManager.skyDome) {
      this.sceneManager.skyDome.setSkyColors(
        skyTarget,
        fogTarget
      );
    }
    this.sceneManager.ambientLight.intensity = this.baseAmbientIntensity + ambientBoost;
    this.sceneManager.hemisphereLight.intensity = this.baseHemisphereIntensity + hemiBoost;
    this.sceneManager.hemisphereLight.color.copy(skyTarget);

    if (strongest) {
      this.reusableBurstLight.color.copy(strongest.color);
      this.reusableBurstLight.position.copy(strongest.position);
      this.reusableBurstLight.intensity = THREE.MathUtils.clamp(
        strongest.weight * 3.5,
        0,
        2.0
      );

      const flashIntensity = THREE.MathUtils.clamp(
        strongest.weight * 1.5,
        0,
        1.0
      );

      if (this.sceneManager.waterSurface && typeof this.sceneManager.waterSurface.setBurstFlash === 'function') {
        this.sceneManager.waterSurface.setBurstFlash(
          strongest.position,
          strongest.color,
          flashIntensity
        );
      }
      if (this.sceneManager.distantMountains) {
        if (typeof this.sceneManager.distantMountains.updateFlashes === 'function') {
          const flashes = activeSmokeLights.slice(0, 2).map((l, idx) => ({
            position: l.position,
            color: l.color,
            intensity: l.intensity * (idx === 0 ? 0.45 : 0.35)
          }));
          this.sceneManager.distantMountains.updateFlashes(flashes);
        } else if (typeof this.sceneManager.distantMountains.setBurstFlash === 'function') {
          this.sceneManager.distantMountains.setBurstFlash(
            strongest.color,
            flashIntensity * 0.25,
            strongest.position
          );
        }
      }
      if (this.sceneManager.skyDome && typeof this.sceneManager.skyDome.setBurstFlash === 'function') {
        this.sceneManager.skyDome.setBurstFlash(
          strongest.position,
          strongest.color,
          flashIntensity
        );
      }
    } else {
      this.reusableBurstLight.intensity = 0;
      if (this.sceneManager.waterSurface && typeof this.sceneManager.waterSurface.setBurstFlash === 'function') {
        this.sceneManager.waterSurface.setBurstFlash(null, null, 0);
      }
      if (this.sceneManager.distantMountains) {
        if (typeof this.sceneManager.distantMountains.updateFlashes === 'function') {
          this.sceneManager.distantMountains.updateFlashes([]);
        } else if (typeof this.sceneManager.distantMountains.setBurstFlash === 'function') {
          this.sceneManager.distantMountains.setBurstFlash(null, 0);
        }
      }
      if (this.sceneManager.skyDome && typeof this.sceneManager.skyDome.setBurstFlash === 'function') {
        this.sceneManager.skyDome.setBurstFlash(null, null, 0);
      }
    }
  }

  resetToBase(deltaTime) {
    const lerpAlpha = 1 - Math.exp(-4 * deltaTime);
    this.scene.background.lerp(this.baseSkyColor, lerpAlpha);
    this.scene.fog.color.lerp(this.baseSkyColor, lerpAlpha);
    if (this.sceneManager.skyDome) {
      this.sceneManager.skyDome.setSkyColors(
        this.scene.background,
        this.scene.fog.color
      );
    }
    this.sceneManager.ambientLight.intensity = THREE.MathUtils.lerp(
      this.sceneManager.ambientLight.intensity,
      this.baseAmbientIntensity,
      lerpAlpha
    );
    this.sceneManager.hemisphereLight.intensity = THREE.MathUtils.lerp(
      this.sceneManager.hemisphereLight.intensity,
      this.baseHemisphereIntensity,
      lerpAlpha
    );
    this.reusableBurstLight.intensity = THREE.MathUtils.lerp(
      this.reusableBurstLight.intensity,
      0,
      lerpAlpha
    );

    const droneLight = this.getDroneLight();
    const activeSmokeLights = droneLight ? [droneLight] : [];

    if (this.smokeSystem) {
      if (typeof this.smokeSystem.setMultiLights === 'function') {
        this.smokeSystem.setMultiLights(activeSmokeLights);
      } else if (typeof this.smokeSystem.setBurstFlash === 'function') {
        if (activeSmokeLights.length > 0) {
          this.smokeSystem.setBurstFlash(
            activeSmokeLights[0].position,
            activeSmokeLights[0].color,
            activeSmokeLights[0].intensity,
            activeSmokeLights[0].radius
          );
        } else {
          this.smokeSystem.setBurstFlash(null, null, 0);
        }
      }
    }
    if (this.sceneManager.waterSurface && typeof this.sceneManager.waterSurface.setBurstFlash === 'function') {
      this.sceneManager.waterSurface.setBurstFlash(null, null, 0);
    }
    if (this.sceneManager.distantMountains && typeof this.sceneManager.distantMountains.setBurstFlash === 'function') {
      this.sceneManager.distantMountains.setBurstFlash(null, 0);
    }
    if (this.sceneManager.skyDome && typeof this.sceneManager.skyDome.setBurstFlash === 'function') {
      this.sceneManager.skyDome.setBurstFlash(null, null, 0);
    }
  }

  getDroneLight() {
    if (!this.droneSystem || typeof this.droneSystem.getLuminousCentroid !== 'function') {
      return null;
    }
    const centroid = this.droneSystem.getLuminousCentroid();
    if (!centroid || centroid.intensity <= 0.01) {
      return null;
    }
    return {
      position: centroid.position,
      color: centroid.color,
      intensity: centroid.intensity,
      radius: centroid.radius,
      weight: centroid.intensity
    };
  }
}
