import * as THREE from 'three';
import { globalEventBus } from '../core/EventBus.js';
import { renderingConfig } from '../config/rendering.js';

export class AtmosphereManager {
  constructor(options = {}) {
    this.windSpeed = options.windSpeed
      ?? renderingConfig.smoke?.windSpeed
      ?? 1.0;
    this.windDirection = options.windDirection
      ?? renderingConfig.smoke?.windDirection
      ?? 25;
    this.turbulenceStrength = options.turbulenceStrength ?? 0.22;
    this.thermalDraft = options.thermalDraft ?? 0.8;

    this.baseWind = new THREE.Vector3();
    this.currentWind = new THREE.Vector3();

    this.eventSubscriptions = [];
    this.updateWindVectors();
    this.setupEventListeners();
  }

  destroy() {
    for (const unsubscribe of this.eventSubscriptions) {
      unsubscribe();
    }
    this.eventSubscriptions = [];
  }

  setupEventListeners() {
    this.eventSubscriptions.push(
      globalEventBus.on(
        'wind:speed',
        (speed) => this.setWindSpeed(speed)
      ),
      globalEventBus.on(
        'wind:direction',
        (degrees) => this.setWindDirection(degrees)
      )
    );
  }

  updateWindVectors() {
    const rad = ((this.windDirection % 360) * Math.PI) / 180;
    const horizontalMagnitude = 6.04;
    this.baseWind.set(
      Math.cos(rad) * horizontalMagnitude,
      this.thermalDraft,
      Math.sin(rad) * horizontalMagnitude
    );
    this.currentWind.copy(this.baseWind).multiplyScalar(this.windSpeed);
  }

  setWindSpeed(speed) {
    this.windSpeed = Math.max(
      0.0,
      Number(speed) || 0.0
    );
    this.updateWindVectors();
  }

  setWindDirection(degrees) {
    this.windDirection = Number(degrees) || 0;
    this.updateWindVectors();
  }

  setTurbulenceStrength(strength) {
    this.turbulenceStrength = Math.max(
      0.0,
      Number(strength) || 0.0
    );
  }

  getWindVectorAt(position = null, time = 0, outVector = null) {
    const target = outVector || new THREE.Vector3();
    target.copy(this.currentWind);

    if (position && this.turbulenceStrength > 0.001) {
      const spatialFreq = 0.012;
      const noiseX = Math.sin(position.x * spatialFreq + time * 1.25)
        * Math.cos(position.z * spatialFreq);
      const noiseZ = Math.cos(position.z * spatialFreq + time * 1.15)
        * Math.sin(position.y * spatialFreq);

      target.x += noiseX * this.turbulenceStrength * 2.8;
      target.z += noiseZ * this.turbulenceStrength * 2.8;
    }

    return target;
  }
}

export const atmosphereManager = new AtmosphereManager();
