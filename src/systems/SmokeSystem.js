import * as THREE from 'three';
import { globalEventBus } from '../core/EventBus.js';
import { renderingConfig } from '../config/rendering.js';
import { FIREWORK_CONFIG } from '../config/fireworks.js';

const QUALITY_CAPACITIES = {
  off: 0,
  low: 600,
  medium: 1800,
  high: 4000
};

export class SmokeSystem {
  constructor(sceneManager) {
    this.scene = sceneManager.instance;
    this.quality = renderingConfig.smoke?.quality ?? 'medium';
    this.density = renderingConfig.smoke?.density ?? 1.0;
    this.windSpeed = renderingConfig.smoke?.windSpeed ?? 1.0;
    this.maxPuffs = QUALITY_CAPACITIES[this.quality] ?? 1800;

    this.smokeTexture = this.createSmokeTexture();
    this.puffs = [];
    this.eventSubscriptions = [];
    this.activePuffCount = 0;

    // Huong gio mac dinh (thoi ngang X va day Z)
    this.baseWind = new THREE.Vector3(
      5.5,
      0.8,
      2.5
    );
    this.currentWind = this.baseWind.clone().multiplyScalar(this.windSpeed);

    // Pre-allocated Float32Array ring buffers to eliminate GC pauses
    this.positionsArray = new Float32Array(QUALITY_CAPACITIES.high * 3);
    this.colorsArray = new Float32Array(QUALITY_CAPACITIES.high * 3);
    this.sizesArray = new Float32Array(QUALITY_CAPACITIES.high);
    this.opacitiesArray = new Float32Array(QUALITY_CAPACITIES.high);
    this.seedsArray = new Float32Array(QUALITY_CAPACITIES.high);

    this.smokeGeometry = new THREE.BufferGeometry();
    this.smokeGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(
        this.positionsArray,
        3
      )
    );
    this.smokeGeometry.setAttribute(
      'color',
      new THREE.BufferAttribute(
        this.colorsArray,
        3
      )
    );
    this.smokeGeometry.setAttribute(
      'aSize',
      new THREE.BufferAttribute(
        this.sizesArray,
        1
      )
    );
    this.smokeGeometry.setAttribute(
      'aOpacity',
      new THREE.BufferAttribute(
        this.opacitiesArray,
        1
      )
    );
    this.smokeGeometry.setAttribute(
      'aSeed',
      new THREE.BufferAttribute(
        this.seedsArray,
        1
      )
    );

    this.smokeUniforms = {
      uTime: {
        value: 0
      }
    };

    this.smokeMaterial = new THREE.PointsMaterial({
      map: this.smokeTexture,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.NormalBlending,
      vertexColors: true
    });

    // Custom GLSL shader with per-point size, opacity, atmospheric haze, and seed-based rotation/noise
    this.smokeMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.smokeUniforms.uTime;

      shader.vertexShader = `
        uniform float uTime;
        attribute float aSize;
        attribute float aOpacity;
        attribute float aSeed;
        varying float vOpacity;
        varying float vSeed;
      ` + shader.vertexShader.replace(
        '#include <common>',
        `
        #include <common>
        `
      ).replace(
        'gl_PointSize = size;',
        `
        float sizeNoise = sin(uTime * 1.6 + aSeed * 19.37) * 0.12;
        gl_PointSize = aSize * (1.0 + sizeNoise);
        vOpacity = aOpacity;
        vSeed = aSeed;
        `
      );

      shader.fragmentShader = `
        uniform float uTime;
        varying float vOpacity;
        varying float vSeed;
      ` + shader.fragmentShader.replace(
        '#include <map_particle_fragment>',
        `
        #ifdef USE_MAP
          float angle = vSeed * 6.2831853 + uTime * (0.12 + 0.08 * fract(vSeed * 5.71));
          vec2 centered = gl_PointCoord - vec2(0.5);
          float s = sin(angle);
          float c = cos(angle);
          vec2 rotatedCoord = vec2(
            centered.x * c - centered.y * s,
            centered.x * s + centered.y * c
          ) + vec2(0.5);
          vec4 mapTexel = texture2D( map, rotatedCoord );
          diffuseColor *= mapTexel;
        #endif
        `
      ).replace(
        'vec4 diffuseColor = vec4( diffuse, opacity );',
        `
        vec4 diffuseColor = vec4( diffuse, opacity * vOpacity );
        `
      );
    };

    this.smokePoints = new THREE.Points(
      this.smokeGeometry,
      this.smokeMaterial
    );
    this.smokePoints.frustumCulled = false;
    this.scene.add(this.smokePoints);

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.eventSubscriptions.push(
      globalEventBus.on(
        'firework:launch',
        (detail) => this.onLaunch(detail)
      ),
      globalEventBus.on(
        'firework:burst',
        (detail) => this.onBurst(detail)
      ),
      globalEventBus.on(
        'firework:clear',
        () => this.clear()
      ),
      globalEventBus.on(
        'smoke:spawn',
        (detail) => {
          if (detail && detail.position && detail.velocity) {
            this.spawnPuff(
              detail.position,
              detail.velocity,
              detail.options
            );
          }
        }
      )
    );
  }

  setQuality(qualityStr) {
    this.quality = qualityStr;
    this.maxPuffs = QUALITY_CAPACITIES[qualityStr] ?? 1800;
    if (this.quality === 'off') {
      this.clear();
      this.smokePoints.visible = false;
    } else {
      this.smokePoints.visible = true;
    }
  }

  setDensity(densityVal) {
    this.density = Math.max(
      0.1,
      densityVal
    );
  }

  setWindSpeed(speedVal) {
    this.windSpeed = Math.max(
      0,
      speedVal
    );
    this.currentWind.copy(this.baseWind).multiplyScalar(this.windSpeed);
  }

  destroy() {
    for (const unsubscribe of this.eventSubscriptions) {
      unsubscribe();
    }
    this.clear();
    if (this.smokeTexture) {
      this.smokeTexture.dispose();
    }
    if (this.smokeGeometry) {
      this.smokeGeometry.dispose();
    }
    if (this.smokeMaterial) {
      this.smokeMaterial.dispose();
    }
    this.scene.remove(this.smokePoints);
  }

  createSmokeTexture() {
    if (typeof document === 'undefined') {
      return null;
    }
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(
      size * 0.5,
      size * 0.5,
      size * 0.04,
      size * 0.5,
      size * 0.5,
      size * 0.5
    );
    gradient.addColorStop(
      0,
      'rgba(195, 204, 218, 0.95)'
    );
    gradient.addColorStop(
      0.2,
      'rgba(160, 170, 188, 0.72)'
    );
    gradient.addColorStop(
      0.45,
      'rgba(115, 126, 146, 0.42)'
    );
    gradient.addColorStop(
      0.72,
      'rgba(75, 84, 102, 0.14)'
    );
    gradient.addColorStop(
      1,
      'rgba(50, 58, 74, 0.0)'
    );

    ctx.fillStyle = gradient;
    ctx.fillRect(
      0,
      0,
      size,
      size
    );

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  // Fast direct particle injection method (bypasses EventBus for high performance)
  addSmokePoint(origin, velocity, options = {}) {
    if (this.quality === 'off' || this.maxPuffs === 0) return;
    this.spawnPuff(
      origin,
      velocity,
      options
    );
  }

  spawnPuff(origin, velocity, options = {}) {
    if (
      this.quality === 'off' ||
      this.maxPuffs === 0 ||
      this.puffs.length >= this.maxPuffs
    ) {
      return;
    }

    const cfg = FIREWORK_CONFIG.SMOKE;
    const defaultLife = cfg.trailLifeMin + Math.random() * (cfg.trailLifeMax - cfg.trailLifeMin);

    this.puffs.push({
      position: origin.clone(),
      velocity: velocity.clone(),
      age: 0,
      life: options.life ?? defaultLife,
      growth: options.growth ?? cfg.trailGrowth,
      drag: options.drag ?? cfg.trailDrag,
      buoyancy: options.buoyancy ?? cfg.trailBuoyancy,
      seed: options.seed ?? Math.random(),
      color: options.color ? options.color.clone() : new THREE.Color(0x8892a3),
      baseScale: (options.scale ?? cfg.trailBaseScale) * this.density,
      baseOpacity: (options.opacity ?? cfg.trailOpacity) * this.density
    });
  }

  // Trail Emitter: Sinh vet khoi manh cho rocket phong len
  onLaunch(detail = {}) {
    if (this.quality === 'off') return;
    const cfg = FIREWORK_CONFIG.SMOKE;
    const launchPos = new THREE.Vector3(
      detail.position?.x ?? 0,
      (detail.position?.y ?? -50) + 2,
      detail.position?.z ?? 0
    );

    const count = this.quality === 'high' ? 8 : (this.quality === 'low' ? 3 : 5);

    for (let i = 0; i < count; i++) {
      const drift = new THREE.Vector3(
        (Math.random() - 0.5) * 1.2,
        1.5 + Math.random() * 1.0,
        (Math.random() - 0.5) * 1.2
      );
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 1.8,
        Math.random() * 1.2,
        (Math.random() - 0.5) * 1.8
      );
      this.spawnPuff(
        launchPos.clone().add(offset),
        drift,
        {
          life: cfg.trailLifeMin + Math.random() * (cfg.trailLifeMax - cfg.trailLifeMin),
          scale: cfg.trailBaseScale + Math.random() * 3.0,
          growth: cfg.trailGrowth,
          drag: cfg.trailDrag,
          buoyancy: cfg.trailBuoyancy,
          opacity: cfg.trailOpacity + Math.random() * 0.1,
          color: new THREE.Color(0x6a7384)
        }
      );
    }
  }

  // Burst Cloud Emitter: Mo phong the tich dam khoi phao hoa qua cau
  onBurst(detail = {}) {
    if (this.quality === 'off') return;

    const cfg = FIREWORK_CONFIG.SMOKE;
    const burstPos = new THREE.Vector3(
      detail.position?.x ?? 0,
      detail.position?.y ?? 160,
      detail.position?.z ?? 0
    );

    const burstColor = new THREE.Color(detail.colorHex ?? 0xffffff);
    const smokeColor = new THREE.Color(0x626b7c).lerp(
      burstColor,
      0.18
    );
    const intensity = THREE.MathUtils.clamp(
      detail.intensity ?? 0.5,
      0.1,
      1.0
    );

    // Xac dinh so cum con (micro-clusters) va so hat moi cum
    const clusterCount = this.quality === 'high' ? 5 : (this.quality === 'low' ? 2 : 3);
    const puffsPerCluster = Math.round((this.quality === 'high' ? 6 : (this.quality === 'low' ? 2 : 4)) * (0.8 + 0.4 * intensity));
    const burstSpreadRadius = 4.0 + intensity * 6.0;

    for (let c = 0; c < clusterCount; c++) {
      // Tam cua tung cum con nam lech trong khong gian the tich hinh cau
      const clusterAzimuth = Math.random() * Math.PI * 2;
      const clusterElevation = (Math.random() - 0.5) * Math.PI;
      const clusterDist = (0.2 + 0.8 * Math.random()) * burstSpreadRadius;

      const clusterOffset = new THREE.Vector3(
        Math.cos(clusterElevation) * Math.cos(clusterAzimuth) * clusterDist,
        Math.sin(clusterElevation) * clusterDist * 0.7,
        Math.cos(clusterElevation) * Math.sin(clusterAzimuth) * clusterDist
      );

      const clusterCenter = burstPos.clone().add(clusterOffset);
      const clusterSeed = Math.random();

      for (let i = 0; i < puffsPerCluster; i++) {
        const puffOffset = new THREE.Vector3(
          (Math.random() - 0.5) * 3.2,
          (Math.random() - 0.5) * 2.6,
          (Math.random() - 0.5) * 3.2
        );

        // Van toc bung ra tu tam cum voi luc can cao
        const puffVelocity = clusterOffset.clone().normalize().multiplyScalar(2.0 + Math.random() * 3.5).add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 1.5,
            0.6 + Math.random() * 1.8,
            (Math.random() - 0.5) * 1.5
          )
        );

        const burstLife = cfg.burstLifeMin + Math.random() * (cfg.burstLifeMax - cfg.burstLifeMin);
        const burstDrag = cfg.burstDragMin + Math.random() * (cfg.burstDragMax - cfg.burstDragMin);
        const burstBuoyancy = cfg.burstBuoyancyMin + Math.random() * (cfg.burstBuoyancyMax - cfg.burstBuoyancyMin);

        this.spawnPuff(
          clusterCenter.clone().add(puffOffset),
          puffVelocity,
          {
            life: burstLife,
            scale: cfg.burstBaseScale + Math.random() * 6.5,
            growth: cfg.burstGrowth + Math.random() * 3.0,
            drag: burstDrag,
            buoyancy: burstBuoyancy,
            seed: (clusterSeed + i * 0.17) % 1.0,
            opacity: cfg.burstOpacity + Math.random() * 0.14,
            color: smokeColor
          }
        );
      }
    }
  }

  update(deltaTime) {
    if (this.quality === 'off') {
      if (this.activePuffCount > 0) {
        this.clear();
      }
      return;
    }

    const elapsed = performance.now() / 1000;
    this.smokeUniforms.uTime.value = elapsed;
    const alive = [];

    // Cap nhat dong luc hoc hat (Kinematics with exponential drag, buoyancy & curl noise)
    for (let i = 0; i < this.puffs.length; i++) {
      const puff = this.puffs[i];
      puff.age += deltaTime;

      if (puff.age < puff.life) {
        // Luc can khong khi suy giam ham mu
        const dragFactor = Math.exp(-puff.drag * deltaTime);
        puff.velocity.multiplyScalar(dragFactor);

        // Noi suy dan ve van toc gio toan cuc
        puff.velocity.lerp(
          this.currentWind,
          deltaTime * 0.85
        );

        // Luc day noi va nhieu xoay dua tren seed
        const noiseX = Math.sin(elapsed * 2.2 + puff.seed * 12.3) * 0.42;
        const noiseZ = Math.cos(elapsed * 1.8 + puff.seed * 12.3) * 0.42;
        puff.velocity.x += noiseX * deltaTime;
        puff.velocity.z += noiseZ * deltaTime;
        puff.velocity.y += puff.buoyancy * deltaTime;

        puff.position.addScaledVector(
          puff.velocity,
          deltaTime
        );
        alive.push(puff);
      }
    }

    this.puffs = alive;
    this.activePuffCount = this.puffs.length;

    // Cap nhat Float32Array buffers
    const activeCount = this.puffs.length;
    for (let i = 0; i < activeCount; i++) {
      const puff = this.puffs[i];

      this.positionsArray[i * 3] = puff.position.x;
      this.positionsArray[i * 3 + 1] = puff.position.y;
      this.positionsArray[i * 3 + 2] = puff.position.z;

      this.colorsArray[i * 3] = puff.color.r;
      this.colorsArray[i * 3 + 1] = puff.color.g;
      this.colorsArray[i * 3 + 2] = puff.color.b;

      const t = puff.age / puff.life;
      const growthScale = 1 + puff.growth * t;
      this.sizesArray[i] = puff.baseScale * growthScale;

      const fade = 1 - t;
      this.opacitiesArray[i] = fade * fade * puff.baseOpacity;
      this.seedsArray[i] = puff.seed;
    }

    if (activeCount > 0) {
      this.smokeGeometry.getAttribute('position').needsUpdate = true;
      this.smokeGeometry.getAttribute('color').needsUpdate = true;
      this.smokeGeometry.getAttribute('aSize').needsUpdate = true;
      this.smokeGeometry.getAttribute('aOpacity').needsUpdate = true;
      this.smokeGeometry.getAttribute('aSeed').needsUpdate = true;
      this.smokeGeometry.setDrawRange(
        0,
        activeCount
      );
    } else {
      this.smokeGeometry.setDrawRange(
        0,
        0
      );
    }
  }

  clear() {
    this.puffs = [];
    this.activePuffCount = 0;
    if (this.smokeGeometry) {
      this.smokeGeometry.setDrawRange(
        0,
        0
      );
      const positionAttribute = this.smokeGeometry.getAttribute('position');
      if (positionAttribute) positionAttribute.needsUpdate = true;
    }
  }
}
