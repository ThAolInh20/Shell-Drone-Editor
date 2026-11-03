import * as THREE from 'three';
import { globalEventBus } from '../core/EventBus.js';
import { FIREWORK_CONFIG } from '../config/fireworks.js';
import { LAYER_REFLECTION } from '../config/layers.js';
import { renderingConfig } from '../config/rendering.js';

const GRAVITY = FIREWORK_CONFIG.GRAVITY;
const DEFAULT_TRAIL_COLOR = new THREE.Color(0xffd700);
const CRACKLE_SPARK_COLOR = new THREE.Color(0xffd77a);
const _scratchTrailColor = new THREE.Color();

const MAX_PARTICLES = FIREWORK_CONFIG.SYSTEM.maxTrailParticles;

export class TrailSystem {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.trailParticles = [];
    this.eventSubscriptions = [];
    this.particlePool = [];
    this.maxPoolSize = 100000;
    this.currentTime = 0;

    const baseMax = FIREWORK_CONFIG.SYSTEM.maxTrailParticles;
    this.allocatedMaxTrailParticles = Math.max(
      100000,
      Math.round(baseMax * 2.0)
    );
    this.maxTrailParticles = baseMax;

    const isTestEnv = (
      typeof process !== 'undefined'
      && (process.env?.VITEST || process.env?.NODE_ENV === 'test')
    ) || (typeof window === 'undefined');

    this.useGpuSimulation = options.useGpuSimulation !== undefined
      ? Boolean(options.useGpuSimulation)
      : !isTestEnv;

    // GPU Ring-Buffer State
    this.gpuCursor = 0;
    this.gpuParticleCount = 0;
    this.gpuDirtyMin = -1;
    this.gpuDirtyMax = -1;
    this.gpuDirtyWrapped = false;

    // Trail particles geometry
    this.trailGeometry = new THREE.BufferGeometry();

    // Pre-allocate buffers for GPU upload and vertex kinematics
    this.positionsArray = new Float32Array(
      this.allocatedMaxTrailParticles * 3
    );
    this.velocitiesArray = new Float32Array(
      this.allocatedMaxTrailParticles * 3
    );
    this.colorsArray = new Float32Array(
      this.allocatedMaxTrailParticles * 4
    );
    this.baseColorsArray = new Float32Array(
      this.allocatedMaxTrailParticles * 4
    );
    this.paramsArray = new Float32Array(
      this.allocatedMaxTrailParticles * 4
    );
    this.effectParamsArray = new Float32Array(
      this.allocatedMaxTrailParticles * 4
    );

    // Initialize paramsArray with inactive birth times
    this.paramsArray.fill(-999999.0);

    this.positionsAttr = new THREE.BufferAttribute(
      this.positionsArray,
      3
    );
    this.positionsAttr.setUsage(
      THREE.DynamicDrawUsage
    );
    this.trailGeometry.setAttribute(
      'position',
      this.positionsAttr
    );

    this.velocitiesAttr = new THREE.BufferAttribute(
      this.velocitiesArray,
      3
    );
    this.velocitiesAttr.setUsage(
      THREE.DynamicDrawUsage
    );
    this.trailGeometry.setAttribute(
      'aVelocity',
      this.velocitiesAttr
    );

    this.colorsAttr = new THREE.BufferAttribute(
      this.colorsArray,
      4
    );
    this.colorsAttr.setUsage(
      THREE.DynamicDrawUsage
    );
    this.trailGeometry.setAttribute(
      'color',
      this.colorsAttr
    );

    this.baseColorsAttr = new THREE.BufferAttribute(
      this.baseColorsArray,
      4
    );
    this.baseColorsAttr.setUsage(
      THREE.DynamicDrawUsage
    );
    this.trailGeometry.setAttribute(
      'aBaseColor',
      this.baseColorsAttr
    );

    this.paramsAttr = new THREE.BufferAttribute(
      this.paramsArray,
      4
    );
    this.paramsAttr.setUsage(
      THREE.DynamicDrawUsage
    );
    this.trailGeometry.setAttribute(
      'aParams',
      this.paramsAttr
    );

    this.effectParamsAttr = new THREE.BufferAttribute(
      this.effectParamsArray,
      4
    );
    this.effectParamsAttr.setUsage(
      THREE.DynamicDrawUsage
    );
    this.trailGeometry.setAttribute(
      'aEffectParams',
      this.effectParamsAttr
    );

    this.trailUniforms = {
      uEdgeSoftness: {
        value: renderingConfig.post?.particleEdgeSoftness ?? 0.75
      },
      uTime: {
        value: 0.0
      },
      uGravity: {
        value: GRAVITY
      },
      uGpuSim: {
        value: this.useGpuSimulation ? 1.0 : 0.0
      }
    };

    this.trailMaterial = new THREE.PointsMaterial({
      size: 8,
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.trailMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.uEdgeSoftness = this.trailUniforms.uEdgeSoftness;
      shader.uniforms.uTime = this.trailUniforms.uTime;
      shader.uniforms.uGravity = this.trailUniforms.uGravity;
      shader.uniforms.uGpuSim = this.trailUniforms.uGpuSim;
      this.trailShader = shader;

      if (shader.vertexShader) {
        shader.vertexShader = `
          attribute vec3 aVelocity;
          attribute vec4 aBaseColor;
          attribute vec4 aParams;
          attribute vec4 aEffectParams;
          uniform float uTime;
          uniform float uGravity;
          uniform float uGpuSim;
          varying vec4 vGpuTrailColor;
          varying float vGpuIsDead;
        ` + shader.vertexShader.replace(
          '#include <begin_vertex>',
          `
          #include <begin_vertex>
          vGpuIsDead = 0.0;
          if (uGpuSim > 0.5) {
            float birthTime = aParams.x;
            float life = aParams.y;
            float age = uTime - birthTime;

            if (age < 0.0 || age >= life) {
              transformed = vec3(0.0, -99999.0, 0.0);
              vGpuTrailColor = vec4(0.0);
              vGpuIsDead = 1.0;
            } else {
              float gravityScale = aParams.z;
              float dragScale = aParams.w;
              float k = max(0.001, 4.0 * dragScale);
              float gEff = 0.5 * uGravity * gravityScale;
              float dragFactor = (1.0 - exp(-k * age)) / k;

              vec3 calculatedPos = position + aVelocity * dragFactor;
              calculatedPos.y += (gEff / k) * (age - dragFactor);

              if (calculatedPos.y <= 0.0) {
                transformed = vec3(0.0, -99999.0, 0.0);
                vGpuTrailColor = vec4(0.0);
                vGpuIsDead = 1.0;
              } else {
                transformed = calculatedPos;

                float lifeRatio = clamp(age / life, 0.0, 1.0);
                float invR = max(0.0, 1.0 - lifeRatio);
                float mode = aEffectParams.x;

                float decay = (mode == 3.0)
                  ? pow(invR, 1.6)
                  : (invR * invR * sqrt(invR));
                float alphaBase = (mode == 3.0) ? 1.0 : 0.75;
                float alpha = decay * aBaseColor.a * alphaBase;
                vec3 c = aBaseColor.rgb;

                if (mode == 0.0) {
                  if (lifeRatio < 0.15) {
                    float flashT = (1.0 - lifeRatio / 0.15) * 0.35;
                    c.r += (max(c.r, 1.05) - c.r) * flashT;
                    c.g += (max(c.g, 1.02) - c.g) * (flashT * 0.857);
                    c.b += (max(c.b, 1.0) - c.b) * (flashT * 0.714);
                  } else if (lifeRatio > 0.65) {
                    float coolT = (lifeRatio - 0.65) / 0.35;
                    c.r += (0.95 - c.r) * (coolT * 0.5);
                    c.g += (0.38 - c.g) * (coolT * 0.6);
                    c.b += (0.05 - c.b) * (coolT * 0.8);
                  }
                } else if (mode == 1.0) {
                  float timeMs = uTime * 1000.0 + aEffectParams.y;
                  float freq = max(1.0, aEffectParams.z);
                  float duty = aEffectParams.w;
                  float cycle = mod(timeMs, freq);
                  if (cycle >= freq * duty) {
                    alpha = 0.0;
                  } else {
                    c = vec3(1.0);
                  }
                } else if (mode == 2.0) {
                  float timeMs = uTime * 1000.0 + aEffectParams.y;
                  float speed = aEffectParams.z > 0.0 ? aEffectParams.z : 0.05;
                  float sVal = 0.2 + 0.8 * abs(sin(timeMs * speed));
                  alpha *= sVal;
                  float blendFactor = 0.5 + 0.5 * sin(timeMs * speed);
                  c = mix(c, vec3(1.0), blendFactor);
                }

                vGpuTrailColor = vec4(c, alpha);
              }
            }
          } else {
            vGpuTrailColor = vec4(1.0);
          }
          `
        ).replace(
          'gl_PointSize = size;',
          `
          if (uGpuSim > 0.5 && vGpuIsDead > 0.5) {
            gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
            gl_PointSize = 0.0;
          } else {
            gl_PointSize = size;
          }
          `
        );
      }

      if (shader.fragmentShader) {
        shader.fragmentShader = `
          uniform float uEdgeSoftness;
          uniform float uGpuSim;
          varying vec4 vGpuTrailColor;
        ` + shader.fragmentShader.replace(
          '#include <color_fragment>',
          `
          #include <color_fragment>
          
          vec2 coord = gl_PointCoord - vec2(0.5);
          float dist = length(coord) * 2.0;
          if (dist > uEdgeSoftness) discard;

          vec3 baseRgb = (uGpuSim > 0.5) ? vGpuTrailColor.rgb : diffuseColor.rgb;
          float baseAlpha = (uGpuSim > 0.5) ? vGpuTrailColor.a : diffuseColor.a;
          if (baseAlpha <= 0.001) discard;

          vec4 stop0 = vec4(1.0, 1.0, 1.0, 1.0);
          vec4 stop1 = vec4(baseRgb, 0.3);
          vec4 stop2 = vec4(baseRgb, 0.13);
          vec4 stop3 = vec4(baseRgb, 0.0);
          
          float outerStart = min(0.32, uEdgeSoftness * 0.45);
          vec4 gradientColor;
          if (dist < 0.024) {
              gradientColor = stop0;
          } else if (dist < min(0.125, outerStart)) {
              float t = (dist - 0.024) / max(0.001, min(0.125, outerStart) - 0.024);
              gradientColor = mix(stop0, stop1, t);
          } else if (dist < outerStart) {
              float t = (dist - min(0.125, outerStart)) / max(0.001, outerStart - min(0.125, outerStart));
              gradientColor = mix(stop1, stop2, t);
          } else {
              float t = (dist - outerStart) / max(0.001, uEdgeSoftness - outerStart);
              gradientColor = mix(stop2, stop3, t);
          }
          
          diffuseColor = vec4(gradientColor.rgb, gradientColor.a * baseAlpha);
          `
        );
      }
    };
    this.trailPoints = new THREE.Points(
      this.trailGeometry,
      this.trailMaterial
    );
    this.trailPoints.frustumCulled = false;
    this.trailPoints.layers.enable(LAYER_REFLECTION);
    this.scene.add(this.trailPoints);

    this.eventSubscriptions.push(
      globalEventBus.on('firework:clear', () => this.clear())
    );

    const savedQuality = (typeof localStorage !== 'undefined' && localStorage?.getItem)
      ? localStorage.getItem('graphics_quality') || 'medium'
      : 'medium';
    this.setGraphicsQuality(savedQuality);
    this.eventSubscriptions.push(
      globalEventBus.on(
        'graphics:quality',
        (quality) => this.setGraphicsQuality(quality)
      )
    );
  }

  setGpuSimulation(enabled) {
    this.useGpuSimulation = Boolean(enabled);
    if (this.trailUniforms?.uGpuSim) {
      this.trailUniforms.uGpuSim.value = this.useGpuSimulation ? 1.0 : 0.0;
    }
    this.clear();
  }

  isGpuSimulationEnabled() {
    return this.useGpuSimulation;
  }

  markGpuIndexDirty(idx) {
    if (this.gpuDirtyMin === -1) {
      this.gpuDirtyMin = idx;
      this.gpuDirtyMax = idx;
    } else {
      if (idx < this.gpuDirtyMin) {
        this.gpuDirtyMin = idx;
      }
      if (idx > this.gpuDirtyMax) {
        this.gpuDirtyMax = idx;
      }
    }
  }

  setParticleEdgeSoftness(value) {
    if (
      this.trailUniforms &&
      this.trailUniforms.uEdgeSoftness
    ) {
      this.trailUniforms.uEdgeSoftness.value = value;
    }
  }

  getParticleEdgeSoftness() {
    return this.trailUniforms?.uEdgeSoftness?.value ??
      renderingConfig.post?.particleEdgeSoftness ??
      0.75;
  }

  setGraphicsQuality(quality) {
    const baseMax = FIREWORK_CONFIG.SYSTEM.maxTrailParticles;
    if (quality === 'low') {
      this.maxTrailParticles = Math.round(baseMax * 0.4);
    } else if (quality === 'medium') {
      this.maxTrailParticles = baseMax;
    } else if (quality === 'high') {
      this.maxTrailParticles = Math.round(baseMax * 1.6);
    }
  }

  destroy() {
    for (const unsubscribe of this.eventSubscriptions) {
      unsubscribe();
    }
  }

  spawnTrailParticle(
    position,
    color,
    lifeMultiplier = 1.0,
    zeroVelocity = false,
    customLife = null,
    opacityMultiplier = 0.65,
    strobe = false,
    customVelocity = null,
    gravityScale = 1.0,
    dragScale = 1.0,
    shimmer = false,
    phase = null,
    exactColor = false
  ) {
    const useFireworkColor = Math.random() < 0.75;
    if (exactColor) {
      _scratchTrailColor.copy(color);
    } else if (useFireworkColor) {
      _scratchTrailColor.copy(color).offsetHSL(
        (Math.random() - 0.5) * 0.04,
        (Math.random() - 0.5) * 0.08,
        (Math.random() - 0.5) * 0.12
      );
    } else {
      _scratchTrailColor.copy(DEFAULT_TRAIL_COLOR);
    }

    const vx = customVelocity
      ? customVelocity.x
      : (zeroVelocity ? 0 : (Math.random() - 0.5) * 5);
    const vy = customVelocity
      ? customVelocity.y
      : (zeroVelocity ? 0 : (Math.random() - 0.5) * 5);
    const vz = customVelocity
      ? customVelocity.z
      : (zeroVelocity ? 0 : (Math.random() - 0.5) * 5);
    const pLife = customLife !== null
      ? customLife
      : (2 + Math.random() * 3) * lifeMultiplier;

    if (this.useGpuSimulation) {
      const idx = this.gpuCursor;
      const p3 = idx * 3;
      const p4 = idx * 4;

      this.positionsArray[p3] = position.x;
      this.positionsArray[p3 + 1] = position.y;
      this.positionsArray[p3 + 2] = position.z;

      this.velocitiesArray[p3] = vx;
      this.velocitiesArray[p3 + 1] = vy;
      this.velocitiesArray[p3 + 2] = vz;

      this.baseColorsArray[p4] = _scratchTrailColor.r;
      this.baseColorsArray[p4 + 1] = _scratchTrailColor.g;
      this.baseColorsArray[p4 + 2] = _scratchTrailColor.b;
      this.baseColorsArray[p4 + 3] = opacityMultiplier;

      this.paramsArray[p4] = this.currentTime;
      this.paramsArray[p4 + 1] = pLife;
      this.paramsArray[p4 + 2] = gravityScale;
      this.paramsArray[p4 + 3] = dragScale;

      const effectMode = strobe ? 1.0 : (shimmer ? 2.0 : (exactColor ? 3.0 : 0.0));
      const pPhase = phase !== null ? phase : Math.random() * 1000;
      const strobeFreq = 90 + Math.random() * 90;
      const dutyRatio = 0.25 + Math.random() * 0.2;
      const shimmerSpeed = 0.03 + Math.random() * 0.04;

      this.effectParamsArray[p4] = effectMode;
      this.effectParamsArray[p4 + 1] = pPhase;
      this.effectParamsArray[p4 + 2] = strobe ? strobeFreq : (shimmer ? shimmerSpeed : 0.0);
      this.effectParamsArray[p4 + 3] = strobe ? dutyRatio : 0.0;

      this.markGpuIndexDirty(idx);
      const nextCursor = (this.gpuCursor + 1) % this.maxTrailParticles;
      if (nextCursor < this.gpuCursor) {
        this.gpuDirtyWrapped = true;
      }
      this.gpuCursor = nextCursor;
      if (this.gpuParticleCount < this.maxTrailParticles) {
        this.gpuParticleCount++;
      }
      return;
    }

    if (this.trailParticles.length >= this.maxTrailParticles) {
      return;
    }

    let particle;
    if (this.particlePool.length > 0) {
      particle = this.particlePool.pop();
      particle.position.set(position.x, position.y, position.z);
      particle.velocity.set(vx, vy, vz);
      particle.color.copy(_scratchTrailColor);
      particle.life = pLife;
      particle.age = 0;
      particle.opacity = opacityMultiplier;
      particle.strobe = strobe;
      particle.shimmer = shimmer;
      particle.exactColor = exactColor;
      particle.phase = phase !== null ? phase : Math.random() * 1000;
      particle.strobeFreq = 90 + Math.random() * 90;
      particle.dutyRatio = 0.25 + Math.random() * 0.2;
      particle.shimmerSpeed = 0.03 + Math.random() * 0.04;
      particle.gravityScale = gravityScale;
      particle.dragScale = dragScale;
    } else {
      particle = {
        position: new THREE.Vector3(position.x, position.y, position.z),
        velocity: new THREE.Vector3(vx, vy, vz),
        color: _scratchTrailColor.clone(),
        life: pLife,
        age: 0,
        opacity: opacityMultiplier,
        strobe: strobe,
        shimmer: shimmer,
        exactColor: exactColor,
        phase: phase !== null ? phase : Math.random() * 1000,
        strobeFreq: 90 + Math.random() * 90,
        dutyRatio: 0.25 + Math.random() * 0.2,
        shimmerSpeed: 0.03 + Math.random() * 0.04,
        gravityScale: gravityScale,
        dragScale: dragScale
      };
    }
    this.trailParticles.push(particle);
  }

  spawnEffectSpark(
    position,
    color,
    strobe = false,
    customVelocity = null,
    phase = null,
    customLife = null,
    shimmer = false
  ) {
    const vx = customVelocity ? customVelocity.x : (Math.random() - 0.5) * 6;
    const vy = customVelocity ? customVelocity.y : Math.random() * 5;
    const vz = customVelocity ? customVelocity.z : (Math.random() - 0.5) * 6;
    const sparkLife = customLife !== null ? customLife : 1.5 + Math.random() * 1.2;

    if (this.useGpuSimulation) {
      const idx = this.gpuCursor;
      const p3 = idx * 3;
      const p4 = idx * 4;

      this.positionsArray[p3] = position.x;
      this.positionsArray[p3 + 1] = position.y;
      this.positionsArray[p3 + 2] = position.z;

      this.velocitiesArray[p3] = vx;
      this.velocitiesArray[p3 + 1] = vy;
      this.velocitiesArray[p3 + 2] = vz;

      this.baseColorsArray[p4] = color.r;
      this.baseColorsArray[p4 + 1] = color.g;
      this.baseColorsArray[p4 + 2] = color.b;
      this.baseColorsArray[p4 + 3] = 0.65;

      this.paramsArray[p4] = this.currentTime;
      this.paramsArray[p4 + 1] = sparkLife;
      this.paramsArray[p4 + 2] = 1.0;
      this.paramsArray[p4 + 3] = 1.0;

      const effectMode = strobe ? 1.0 : (shimmer ? 2.0 : 0.0);
      const pPhase = phase !== null ? phase : Math.random() * 1000;
      const strobeFreq = 90 + Math.random() * 90;
      const dutyRatio = 0.25 + Math.random() * 0.2;
      const shimmerSpeed = 0.03 + Math.random() * 0.04;

      this.effectParamsArray[p4] = effectMode;
      this.effectParamsArray[p4 + 1] = pPhase;
      this.effectParamsArray[p4 + 2] = strobe ? strobeFreq : (shimmer ? shimmerSpeed : 0.0);
      this.effectParamsArray[p4 + 3] = strobe ? dutyRatio : 0.0;

      this.markGpuIndexDirty(idx);
      const nextCursor = (this.gpuCursor + 1) % this.maxTrailParticles;
      if (nextCursor < this.gpuCursor) {
        this.gpuDirtyWrapped = true;
      }
      this.gpuCursor = nextCursor;
      if (this.gpuParticleCount < this.maxTrailParticles) {
        this.gpuParticleCount++;
      }
      return;
    }

    if (this.trailParticles.length >= this.maxTrailParticles) {
      return;
    }

    let spark;
    if (this.particlePool.length > 0) {
      spark = this.particlePool.pop();
      spark.position.set(position.x, position.y, position.z);
      spark.velocity.set(vx, vy, vz);
      spark.color.copy(color);
      spark.life = sparkLife;
      spark.age = 0;
      spark.opacity = 0.65;
      spark.strobe = strobe;
      spark.shimmer = shimmer;
      spark.exactColor = false;
      spark.phase = phase !== null ? phase : Math.random() * 1000;
      spark.strobeFreq = 90 + Math.random() * 90;
      spark.dutyRatio = 0.25 + Math.random() * 0.2;
      spark.shimmerSpeed = 0.03 + Math.random() * 0.04;
      spark.gravityScale = 1.0;
      spark.dragScale = 1.0;
    } else {
      spark = {
        position: new THREE.Vector3(position.x, position.y, position.z),
        velocity: new THREE.Vector3(vx, vy, vz),
        color: color.clone(),
        life: sparkLife,
        age: 0,
        opacity: 0.65,
        strobe: strobe,
        shimmer: shimmer,
        exactColor: false,
        phase: phase !== null ? phase : Math.random() * 1000,
        strobeFreq: 90 + Math.random() * 90,
        dutyRatio: 0.25 + Math.random() * 0.2,
        shimmerSpeed: 0.03 + Math.random() * 0.04,
        gravityScale: 1.0,
        dragScale: 1.0
      };
    }
    this.trailParticles.push(spark);
  }

  spawnMicroCrackle(position, baseColor) {
    const crackleCount = 12 + Math.floor(Math.random() * 4);
    const sparkColor = baseColor ? baseColor : CRACKLE_SPARK_COLOR;

    for (let i = 0; i < crackleCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);

      const sinPhi = Math.sin(phi);
      const speed = (0.5 + Math.random() * 0.5) * 14;
      const vx = sinPhi * Math.cos(theta) * speed;
      const vy = sinPhi * Math.sin(theta) * speed;
      const vz = Math.cos(phi) * speed;
      const life = 0.8 + Math.random() * 0.4;

      if (this.useGpuSimulation) {
        const idx = this.gpuCursor;
        const p3 = idx * 3;
        const p4 = idx * 4;

        this.positionsArray[p3] = position.x;
        this.positionsArray[p3 + 1] = position.y;
        this.positionsArray[p3 + 2] = position.z;

        this.velocitiesArray[p3] = vx;
        this.velocitiesArray[p3 + 1] = vy;
        this.velocitiesArray[p3 + 2] = vz;

        this.baseColorsArray[p4] = sparkColor.r;
        this.baseColorsArray[p4 + 1] = sparkColor.g;
        this.baseColorsArray[p4 + 2] = sparkColor.b;
        this.baseColorsArray[p4 + 3] = 0.75;

        this.paramsArray[p4] = this.currentTime;
        this.paramsArray[p4 + 1] = life;
        this.paramsArray[p4 + 2] = 1.0;
        this.paramsArray[p4 + 3] = 1.0;

        this.effectParamsArray[p4] = 0.0;
        this.effectParamsArray[p4 + 1] = 0.0;
        this.effectParamsArray[p4 + 2] = 0.0;
        this.effectParamsArray[p4 + 3] = 0.0;

        this.markGpuIndexDirty(idx);
        const nextCursor = (this.gpuCursor + 1) % this.maxTrailParticles;
        if (nextCursor < this.gpuCursor) {
          this.gpuDirtyWrapped = true;
        }
        this.gpuCursor = nextCursor;
        if (this.gpuParticleCount < this.maxTrailParticles) {
          this.gpuParticleCount++;
        }
      } else {
        if (this.trailParticles.length >= this.maxTrailParticles) break;

        this.trailParticles.push({
          position: new THREE.Vector3(position.x, position.y, position.z),
          velocity: new THREE.Vector3(vx, vy, vz),
          color: sparkColor.clone(),
          life: life,
          age: 0
        });
      }
    }
  }

  update(deltaTime) {
    this.currentTime += deltaTime;

    if (this.useGpuSimulation) {
      if (this.trailUniforms?.uTime) {
        this.trailUniforms.uTime.value = this.currentTime;
      }

      if (this.gpuDirtyMin !== -1) {
        const offset = this.gpuDirtyWrapped ? 0 : this.gpuDirtyMin;
        const count = this.gpuDirtyWrapped
          ? this.maxTrailParticles
          : (this.gpuDirtyMax - this.gpuDirtyMin + 1);

        this.positionsAttr.needsUpdate = true;
        this.velocitiesAttr.needsUpdate = true;
        this.baseColorsAttr.needsUpdate = true;
        this.paramsAttr.needsUpdate = true;
        this.effectParamsAttr.needsUpdate = true;

        if (this.positionsAttr.updateRange) {
          this.positionsAttr.updateRange.offset = offset * 3;
          this.positionsAttr.updateRange.count = count * 3;
        }
        if (this.velocitiesAttr.updateRange) {
          this.velocitiesAttr.updateRange.offset = offset * 3;
          this.velocitiesAttr.updateRange.count = count * 3;
        }
        if (this.baseColorsAttr.updateRange) {
          this.baseColorsAttr.updateRange.offset = offset * 4;
          this.baseColorsAttr.updateRange.count = count * 4;
        }
        if (this.paramsAttr.updateRange) {
          this.paramsAttr.updateRange.offset = offset * 4;
          this.paramsAttr.updateRange.count = count * 4;
        }
        if (this.effectParamsAttr.updateRange) {
          this.effectParamsAttr.updateRange.offset = offset * 4;
          this.effectParamsAttr.updateRange.count = count * 4;
        }

        this.gpuDirtyMin = -1;
        this.gpuDirtyMax = -1;
        this.gpuDirtyWrapped = false;
      }

      this.trailGeometry.setDrawRange(
        0,
        this.gpuParticleCount
      );
      return;
    }

    // CPU mode simulation
    let activeCount = 0;
    const nowMs = performance.now();
    const dt = deltaTime;
    const baseGravDt = GRAVITY * dt * 0.5;

    for (let i = 0; i < this.trailParticles.length; i++) {
      const particle = this.trailParticles[i];

      // Direct scalar kinematics - Zero function call overhead
      const drag = 1.0 - 4.0 * dt * (particle.dragScale ?? 1.0);
      const vx = particle.velocity.x * drag;
      const vy = particle.velocity.y * drag + baseGravDt * (particle.gravityScale ?? 1.0);
      const vz = particle.velocity.z * drag;

      particle.velocity.x = vx;
      particle.velocity.y = vy;
      particle.velocity.z = vz;

      particle.position.x += vx * dt;
      particle.position.y += vy * dt;
      particle.position.z += vz * dt;
      particle.age += dt;

      if (particle.position.y <= 0) {
        // Quench trail particle when it hits water surface
        if (this.particlePool.length < this.maxPoolSize) {
          this.particlePool.push(particle);
        }
        continue;
      }

      if (particle.age < particle.life) {
        if (activeCount < this.maxTrailParticles) {
          const lifeRatio = particle.age / particle.life;
          const invR = Math.max(0, 1.0 - lifeRatio);
          const alphaBase = particle.exactColor ? 1.0 : 0.75;
          const decay = particle.exactColor
            ? Math.pow(invR, 1.6)
            : invR * invR * Math.sqrt(invR);
          let alpha =
            decay * (particle.opacity ?? 0.65) * alphaBase;
          let r = particle.color.r;
          let g = particle.color.g;
          let b = particle.color.b;

          // Thermal lifecycle
          if (!particle.strobe && !particle.shimmer && !particle.exactColor) {
            if (lifeRatio < 0.15) {
              const flashT = (1.0 - lifeRatio / 0.15) * 0.35;
              r += (Math.max(r, 1.05) - r) * flashT;
              g += (Math.max(g, 1.02) - g) * (flashT * 0.857);
              b += (Math.max(b, 1.0) - b) * (flashT * 0.714);
            } else if (lifeRatio > 0.65) {
              const coolT = (lifeRatio - 0.65) / 0.35;
              r += (0.95 - r) * (coolT * 0.5);
              g += (0.38 - g) * (coolT * 0.6);
              b += (0.05 - b) * (coolT * 0.8);
            }
          }

          // Strobe effect
          if (particle.strobe) {
            const timeMs = nowMs + (particle.phase ?? 0);
            const freq = particle.strobeFreq ?? 120;
            const cycleTime = timeMs % freq;
            const isBlinking = cycleTime < (freq * (particle.dutyRatio ?? 0.35));
            if (!isBlinking) {
              alpha = 0.0;
            } else {
              r = 1.0;
              g = 1.0;
              b = 1.0;
            }
          } else if (particle.shimmer) {
            const timeMs = nowMs + (particle.phase ?? 0);
            const speed = particle.shimmerSpeed ?? 0.05;
            const shimmerVal =
              0.2 +
              0.8 *
                Math.abs(
                  Math.sin(timeMs * speed)
                );
            alpha *= shimmerVal;
            const blendFactor =
              0.5 + 0.5 * Math.sin(timeMs * speed);
            r += (1.0 - r) * blendFactor;
            g += (1.0 - g) * blendFactor;
            b += (1.0 - b) * blendFactor;
          }

          const posIdx = activeCount * 3;
          this.positionsArray[posIdx] =
            particle.position.x;
          this.positionsArray[posIdx + 1] =
            particle.position.y;
          this.positionsArray[posIdx + 2] =
            particle.position.z;

          const colIdx = activeCount * 4;
          this.colorsArray[colIdx] = r;
          this.colorsArray[colIdx + 1] = g;
          this.colorsArray[colIdx + 2] = b;
          this.colorsArray[colIdx + 3] = alpha;

          if (i !== activeCount) {
            this.trailParticles[activeCount] = particle;
          }
          activeCount++;
        }
      } else {
        if (this.particlePool.length < this.maxPoolSize) {
          this.particlePool.push(particle);
        }
      }
    }

    this.trailParticles.length = activeCount;

    if (activeCount > 0) {
      this.positionsAttr.needsUpdate = true;
      this.colorsAttr.needsUpdate = true;

      if (this.positionsAttr.updateRange) {
        this.positionsAttr.updateRange.offset = 0;
        this.positionsAttr.updateRange.count =
          activeCount * 3;
      }

      if (this.colorsAttr.updateRange) {
        this.colorsAttr.updateRange.offset = 0;
        this.colorsAttr.updateRange.count =
          activeCount * 4;
      }

      this.trailGeometry.setDrawRange(
        0,
        activeCount
      );
    } else {
      this.trailGeometry.setDrawRange(
        0,
        0
      );
    }
  }

  clear() {
    this.gpuCursor = 0;
    this.gpuParticleCount = 0;
    this.gpuDirtyMin = -1;
    this.gpuDirtyMax = -1;
    this.gpuDirtyWrapped = false;

    if (this.paramsArray) {
      this.paramsArray.fill(-999999.0);
      if (this.paramsAttr) {
        this.paramsAttr.needsUpdate = true;
        if (this.paramsAttr.updateRange) {
          this.paramsAttr.updateRange.offset = 0;
          this.paramsAttr.updateRange.count =
            this.allocatedMaxTrailParticles * 4;
        }
      }
    }

    if (this.particlePool && this.trailParticles.length > 0) {
      for (let i = 0; i < this.trailParticles.length; i++) {
        if (this.particlePool.length < this.maxPoolSize) {
          this.particlePool.push(this.trailParticles[i]);
        }
      }
    }
    this.trailParticles = [];
    if (this.trailGeometry) {
      this.trailGeometry.setDrawRange(0, 0);
      const positionAttribute = this.trailGeometry.getAttribute('position');
      if (positionAttribute) positionAttribute.needsUpdate = true;
    }
  }
}
