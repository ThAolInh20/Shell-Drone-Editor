import * as THREE from 'three';
import { globalEventBus } from '../core/EventBus.js';

const MAX_SMOKE_PUFFS = 150; // Reduced from 1200 to keep particle count minimal

export class SmokeSystem {
  constructor(sceneManager) {
    this.scene = sceneManager.instance;
    this.maxPuffs = MAX_SMOKE_PUFFS;

    this.smokeTexture = this.createSmokeTexture();
    this.puffs = [];
    this.eventSubscriptions = [];

    // Hướng gió mặc định (thổi ngang sang phải X và hơi đẩy về sau Z)
    this.wind = new THREE.Vector3(
      5.5,
      0.8,
      2.5
    );

    // Pre-allocate arrays for geometry buffers to prevent Garbage Collection pauses
    this.positionsArray = new Float32Array(this.maxPuffs * 3);
    this.colorsArray = new Float32Array(this.maxPuffs * 3);
    this.sizesArray = new Float32Array(this.maxPuffs);
    this.opacitiesArray = new Float32Array(this.maxPuffs);

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

    this.smokeMaterial = new THREE.PointsMaterial({
      map: this.smokeTexture,
      transparent: true,
      depthWrite: false,
      depthTest: true, // Cho phép vật thể đặc (như drone) che khuất khói tự nhiên
      blending: THREE.NormalBlending,
      vertexColors: true
    });

    // Custom shader modifications to support per-point size and opacity
    this.smokeMaterial.onBeforeCompile = (shader) => {
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

      shader.fragmentShader = `
        varying float vOpacity;
      ` + shader.fragmentShader.replace(
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
    const size = 96;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(
      size * 0.5,
      size * 0.5,
      size * 0.1,
      size * 0.5,
      size * 0.5,
      size * 0.5
    );
    gradient.addColorStop(
      0,
      'rgba(185, 194, 210, 0.92)'
    );
    gradient.addColorStop(
      0.38,
      'rgba(126, 136, 154, 0.62)'
    );
    gradient.addColorStop(
      1,
      'rgba(70, 78, 96, 0.0)'
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

  spawnPuff(origin, velocity, options = {}) {
    if (this.puffs.length >= this.maxPuffs) {
      this.puffs.shift();
    }

    this.puffs.push({
      position: origin.clone(),
      velocity: velocity.clone(),
      age: 0,
      life: options.life ?? 2.2,
      growth: options.growth ?? 4.4,
      color: options.color ?? new THREE.Color(0x8892a3),
      baseScale: options.scale ?? 8,
      baseOpacity: options.opacity ?? 0.24
    });
  }

  onLaunch(detail = {}) {
    const launchPos = new THREE.Vector3(
      detail.position?.x ?? 0,
      (detail.position?.y ?? -50) + 2,
      detail.position?.z ?? 0
    );

    const count = 2; // Reduced from 8 to minimize smoke

    for (let i = 0; i < count; i++) {
      const drift = new THREE.Vector3(
        (Math.random() - 0.5) * 1.4,
        1.8 + Math.random() * 1.2,
        (Math.random() - 0.5) * 1.4
      );
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 1.2,
        (Math.random() - 0.5) * 2
      );
      this.spawnPuff(
        launchPos.clone().add(offset),
        drift,
        {
          life: 1.1 + Math.random() * 0.85,
          scale: 7.2 + Math.random() * 3.4,
          growth: 5.1,
          opacity: 0.24 + Math.random() * 0.12,
          color: new THREE.Color(0x666f7f)
        }
      );
    }
  }

  onBurst(detail = {}) {
    // Kích hoạt khói vụ nổ cho Chrysanthemum Smoke, Sparking và Sparking V2 để tạo quầng sáng trung mềm mại
    if (
      detail.effectType !== 'crysanthemum-smoke' &&
      detail.shellType !== 'crysanthemumSmoke' &&
      detail.effectType !== 'sparking' &&
      detail.effectType !== 'sparking-v2'
    ) {
      return;
    }

    const burstPos = new THREE.Vector3(
      detail.position?.x ?? 0,
      detail.position?.y ?? 160,
      detail.position?.z ?? 0
    );

    const burstColor = new THREE.Color(detail.colorHex ?? 0xffffff);
    const smokeColor = new THREE.Color(0x646d7d).lerp(
      burstColor,
      0.1
    );
    const intensity = THREE.MathUtils.clamp(
      detail.intensity ?? 0.45,
      0.1,
      1
    );
    const count = Math.round(2 + intensity * 4); // Reduced from 22 + intensity * 30 to minimize smoke

    for (let i = 0; i < count; i++) {
      const azimuth = Math.random() * Math.PI * 2;
      const radius = 1.8 + Math.random() * 7;
      const offset = new THREE.Vector3(
        Math.cos(azimuth) * radius,
        (Math.random() - 0.3) * 2.4,
        Math.sin(azimuth) * radius
      );
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 2.1,
        1.1 + Math.random() * 2.2,
        (Math.random() - 0.5) * 2.1
      );

      this.spawnPuff(
        burstPos.clone().add(offset),
        velocity,
        {
          life: 3 + Math.random() * 3.2,
          scale: 9 + Math.random() * 7.2,
          growth: 5.4 + Math.random() * 3.8,
          opacity: 0.28 + Math.random() * 0.2,
          color: smokeColor
        }
      );
    }
  }

  update(deltaTime) {
    const elapsed = performance.now() / 1000;
    const alive = [];

    // Update puff kinematics
    for (let i = 0; i < this.puffs.length; i++) {
      const puff = this.puffs[i];
      puff.age += deltaTime;

      if (puff.age < puff.life) {
        // Hạt khói dần dần hòa vào tốc độ của gió (lerp) để tạo cảm giác bị cuốn đi
        puff.velocity.lerp(
          this.wind,
          deltaTime * 1.2
        );

        // Khói vẫn giữ một chút lực nổi tự nhiên (bốc lên trên) kết hợp nhiễu động nhẹ (turbulence)
        const noiseX = Math.sin(elapsed * 3.0 + puff.age * 5.0) * 0.4;
        const noiseZ = Math.cos(elapsed * 2.5 + puff.age * 4.0) * 0.4;
        puff.velocity.x += noiseX * deltaTime;
        puff.velocity.z += noiseZ * deltaTime;
        puff.velocity.y += 0.45 * deltaTime;

        puff.position.addScaledVector(
          puff.velocity,
          deltaTime
        );
        alive.push(puff);
      }
    }

    this.puffs = alive;

    // Update geometry buffers
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
    }

    if (activeCount > 0) {
      this.smokeGeometry.getAttribute('position').needsUpdate = true;
      this.smokeGeometry.getAttribute('color').needsUpdate = true;
      this.smokeGeometry.getAttribute('aSize').needsUpdate = true;
      this.smokeGeometry.getAttribute('aOpacity').needsUpdate = true;
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
