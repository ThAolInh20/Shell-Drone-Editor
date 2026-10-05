import * as THREE from 'three';
import { globalEventBus } from '../core/EventBus.js';

export class SkyLightReactionSystem {
  constructor(sceneManager, smokeSystem = null) {
    this.sceneManager = sceneManager;
    this.smokeSystem = smokeSystem;
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
    const rawIntensity = THREE.MathUtils.clamp(detail.intensity ?? 0.6, 0.1, 1);
    const intensity = Math.pow(rawIntensity, 1.35);
    const duration = THREE.MathUtils.clamp(detail.duration ?? 1.2, 0.35, 1.6);

    const position = new THREE.Vector3(
      detail.position?.x ?? 0,
      detail.position?.y ?? 120,
      detail.position?.z ?? 0
    );

    this.reactions.push({
      color,
      intensity,
      duration,
      age: 0,
      position
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

    for (const reaction of this.reactions) {
      reaction.age += deltaTime;
      const t = reaction.age / reaction.duration;
      if (t >= 1) {
        continue;
      }
      // Strong immediate flash with softer trailing afterglow.
      const flash = Math.exp(-4.6 * t) * reaction.intensity;
      const tail = Math.exp(-1.55 * t) * reaction.intensity * 0.42;
      const weight = flash + tail;

      totalWeight += weight;
      skyEnergy += weight;
      colorAccumulator.add(reaction.color.clone().multiplyScalar(weight));

      if (!strongest || weight > strongest.weight) {
        strongest = {
          weight,
          position: reaction.position,
          color: reaction.color
        };
      }

      alive.push(reaction);
    }

    this.reactions = alive;

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
      // Increased the multiplier and max intensity since global lighting is reduced
      this.reusableBurstLight.intensity = THREE.MathUtils.clamp(strongest.weight * 3.5, 0, 2.0);

      const flashIntensity = THREE.MathUtils.clamp(strongest.weight * 1.5, 0, 1.0);
      if (this.smokeSystem && typeof this.smokeSystem.setBurstFlash === 'function') {
        this.smokeSystem.setBurstFlash(
          strongest.position,
          strongest.color,
          flashIntensity
        );
      }
      if (this.sceneManager.waterSurface && typeof this.sceneManager.waterSurface.setBurstFlash === 'function') {
        this.sceneManager.waterSurface.setBurstFlash(
          strongest.position,
          strongest.color,
          flashIntensity
        );
      }
      if (this.sceneManager.distantMountains && typeof this.sceneManager.distantMountains.setBurstFlash === 'function') {
        this.sceneManager.distantMountains.setBurstFlash(
          strongest.color,
          flashIntensity * 0.25
        );
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
      if (this.smokeSystem && typeof this.smokeSystem.setBurstFlash === 'function') {
        this.smokeSystem.setBurstFlash(null, null, 0);
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
    this.reusableBurstLight.intensity = THREE.MathUtils.lerp(this.reusableBurstLight.intensity, 0, lerpAlpha);

    if (this.smokeSystem && typeof this.smokeSystem.setBurstFlash === 'function') {
      this.smokeSystem.setBurstFlash(null, null, 0);
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
}
