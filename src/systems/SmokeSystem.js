import * as THREE from 'three';
import { globalEventBus } from '../core/EventBus.js';
import { renderingConfig } from '../config/rendering.js';
import { FIREWORK_CONFIG } from '../config/fireworks.js';

const QUALITY_CAPACITIES = renderingConfig.smoke?.qualityCapacities
  ?? FIREWORK_CONFIG.SMOKE?.qualityCapacities
  ?? {
    off: {
      launch: 0,
      aerial: 0
    },
    low: {
      launch: 150,
      aerial: 450
    },
    medium: {
      launch: 450,
      aerial: 1350
    },
    high: {
      launch: 5000,
      aerial: 10000
    },
    unlimited: {
      launch: 10000,
      aerial: 15000
    }
  };

const BUFFER_CAPACITY = (QUALITY_CAPACITIES.unlimited?.launch ?? 10000)
  + (QUALITY_CAPACITIES.unlimited?.aerial ?? 15000);

export class SmokeSystem {
  constructor(sceneManager) {
    this.scene = sceneManager.instance;
    this.quality = renderingConfig.smoke?.quality ?? 'medium';
    this.density = renderingConfig.smoke?.density ?? 1.0;
    this.windSpeed = renderingConfig.smoke?.windSpeed ?? 1.0;
    this.windDirection = renderingConfig.smoke?.windDirection ?? 25;
    this.unlimited = Boolean(renderingConfig.smoke?.unlimited);
    this.lifespanMultiplier = renderingConfig.smoke?.lifespanMultiplier ?? 1.0;
    this.activePuffCount = 0;
    this.activeLaunchCount = 0;
    this.activeAerialCount = 0;
    this.updateCapacities();

    this.smokeTexture = this.createSmokeTexture();
    this.puffs = [];
    this.eventSubscriptions = [];

    // Huong gio mac dinh (tinh theo windDirection va windSpeed)
    this.baseWind = new THREE.Vector3();
    this.currentWind = new THREE.Vector3();
    this.updateWindVectors();

    // Pre-allocated Float32Array ring buffers to eliminate GC pauses
    this.positionsArray = new Float32Array(BUFFER_CAPACITY * 3);
    this.colorsArray = new Float32Array(BUFFER_CAPACITY * 3);
    this.sizesArray = new Float32Array(BUFFER_CAPACITY);
    this.opacitiesArray = new Float32Array(BUFFER_CAPACITY);
    this.seedsArray = new Float32Array(BUFFER_CAPACITY);

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
      },
      uFlashPos: {
        value: new THREE.Vector3(0, 100, 0)
      },
      uFlashColor: {
        value: new THREE.Color(0x000000)
      },
      uFlashIntensity: {
        value: 0.0
      },
      uFlashRadius: {
        value: 650.0
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

    // Custom GLSL shader with per-point size, opacity, atmospheric haze, and dynamic burst flash illumination
    this.smokeMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.smokeUniforms.uTime;
      shader.uniforms.uFlashPos = this.smokeUniforms.uFlashPos;
      shader.uniforms.uFlashColor = this.smokeUniforms.uFlashColor;
      shader.uniforms.uFlashIntensity = this.smokeUniforms.uFlashIntensity;
      shader.uniforms.uFlashRadius = this.smokeUniforms.uFlashRadius;

      shader.vertexShader = `
        uniform float uTime;
        attribute float aSize;
        attribute float aOpacity;
        attribute float aSeed;
        varying float vOpacity;
        varying float vSeed;
        varying vec3 vWorldPos;
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
        vWorldPos = position;
        `
      );

      shader.fragmentShader = `
        uniform float uTime;
        uniform vec3 uFlashPos;
        uniform vec3 uFlashColor;
        uniform float uFlashIntensity;
        uniform float uFlashRadius;
        varying float vOpacity;
        varying float vSeed;
        varying vec3 vWorldPos;
      ` + shader.fragmentShader.replace(
        '#include <map_particle_fragment>',
        `
        #ifdef USE_MAP
          float angle = vSeed * 6.2831853 + uTime * (0.12 + 0.08 * fract(vSeed * 5.71));
          vec2 centered = gl_PointCoord - vec2(0.5);
          float s = sin(angle);
          float c = cos(angle);
          vec2 rotated = vec2(
            centered.x * c - centered.y * s,
            centered.x * s + centered.y * c
          );

          // Organic harmonic contour warping (bien dang vien thanh cac thuy meo mo go ghe)
          float pAngle = atan(rotated.y, rotated.x);
          float pDist = length(rotated);
          float warp = sin(pAngle * 3.0 + vSeed * 11.3) * 0.11
                     + cos(pAngle * 5.0 - vSeed * 7.7) * 0.07;
          vec2 warpedCoord = rotated * (1.0 + warp) + vec2(0.5);
          vec4 mapTexel = texture2D( map, warpedCoord );
          float edgeCutoff = smoothstep(0.50, 0.44, pDist * (1.0 + warp * 0.65));
          mapTexel.a *= edgeCutoff;
          diffuseColor *= mapTexel;
        #endif

        // Troi dem: khoi khong tu phat sang, co mau tram toi mac dinh
        vec3 nightAmbient = diffuseColor.rgb * 0.16;

        if (uFlashIntensity > 0.001) {
          vec3 toLight = uFlashPos - vWorldPos;
          float distToFlash = length(toLight);
          float flashAtten = clamp(1.0 - distToFlash / uFlashRadius, 0.0, 1.0);
          flashAtten = flashAtten * flashAtten;

          // Pseudo-spherical normal across billboard point sprite
          vec2 centeredP = gl_PointCoord - vec2(0.5);
          float r2 = clamp(dot(centeredP, centeredP) * 4.0, 0.0, 1.0);
          float nz = sqrt(max(0.0, 1.0 - r2));

          // Directional illumination from burst position towards puff surface
          vec2 dirToLight2D = normalize(toLight.xz + vec2(0.0001));
          float NdotL = clamp(
            dot(centeredP * 2.0, dirToLight2D) * 0.45 + nz * 0.55 + 0.2,
            0.2,
            1.25
          );

          // Translucent rim scattering on puff boundaries
          float edgeScattering = pow(1.0 - nz, 1.6) * 0.55;
          float totalIllum = (NdotL + edgeScattering) * flashAtten * uFlashIntensity * 2.5;

          // Phan tich do bao hoa mau (color saturation) cua anh sang phao hoa
          float maxChan = max(uFlashColor.r, max(uFlashColor.g, uFlashColor.b));
          float minChan = min(uFlashColor.r, min(uFlashColor.g, uFlashColor.b));
          float colorSat = (maxChan > 0.001) ? ((maxChan - minChan) / maxChan) : 0.0;

          // 1. Anh sang trang hoac vang nhe: kich thich hien ro khoi trang sang tu nhien
          vec3 illuminatedWhite = diffuseColor.rgb * 1.45;

          // 2. Anh sang mau cuong do manh: nhuom mau sac dam da cua phao hoa len khoi
          float dyeRatio = clamp(0.35 + colorSat * 0.60, 0.35, 0.95);
          vec3 dyedColor = mix(
            illuminatedWhite,
            uFlashColor * 1.85,
            dyeRatio
          );

          // Chuyen doi tu bong toi dem sang the tich khoi duoc chieu sang
          float illumFactor = clamp(totalIllum, 0.0, 1.0);
          diffuseColor.rgb = mix(
            nightAmbient,
            dyedColor,
            illumFactor
          );

          // Hieu ung phan xa the tich loi khi o rat gan tam no phao
          diffuseColor.rgb += dyedColor * (max(0.0, totalIllum - 1.0) * 0.35);
        } else {
          diffuseColor.rgb = nightAmbient;
        }
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

  setBurstFlash(position, color, intensity) {
    if (position) {
      this.smokeUniforms.uFlashPos.value.copy(position);
    }
    if (color) {
      this.smokeUniforms.uFlashColor.value.copy(color);
    }
    this.smokeUniforms.uFlashIntensity.value = intensity || 0.0;
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

  updateCapacities() {
    const raw = this.unlimited
      ? QUALITY_CAPACITIES.unlimited
      : (QUALITY_CAPACITIES[this.quality] ?? QUALITY_CAPACITIES.medium);

    const launchCap = typeof raw === 'number'
      ? Math.round(raw * 0.25)
      : (raw?.launch ?? 450);

    const aerialCap = typeof raw === 'number'
      ? Math.round(raw * 0.75)
      : (raw?.aerial ?? 1350);

    this.maxPuffs = {
      launch: launchCap,
      aerial: aerialCap,
      total: launchCap + aerialCap
    };
  }

  setQuality(qualityStr) {
    this.quality = qualityStr;
    this.updateCapacities();
    if (this.quality === 'off') {
      this.clear();
      this.smokePoints.visible = false;
    } else {
      this.smokePoints.visible = true;
    }
  }

  setUnlimited(enabled) {
    this.unlimited = Boolean(enabled);
    this.updateCapacities();
  }

  setLifespanMultiplier(multiplier) {
    this.lifespanMultiplier = Math.max(
      0.5,
      Math.min(10.0, Number(multiplier) || 1.0)
    );
  }

  setDensity(densityVal) {
    this.density = Math.max(
      0.1,
      densityVal
    );
  }

  updateWindVectors() {
    const rad = ((this.windDirection % 360) * Math.PI) / 180;
    const horizontalMagnitude = 6.04;
    this.baseWind.set(
      Math.cos(rad) * horizontalMagnitude,
      0.8,
      Math.sin(rad) * horizontalMagnitude
    );
    this.currentWind.copy(this.baseWind).multiplyScalar(this.windSpeed);
  }

  setWindDirection(degrees) {
    this.windDirection = Number(degrees) || 0;
    this.updateWindVectors();
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
    const half = size * 0.5;

    // Organic cauliflower cloud puff with asymmetric lobes and uneven radii
    // Khong dung gradient tron dong tam phu toan bo canvas de tao vien loi lom meo mo
    const puffBlobs = [
      // Core mass
      {
        x: half - 2,
        y: half + 1,
        r: 25,
        alpha: 0.72
      },
      {
        x: half + 3,
        y: half - 3,
        r: 21,
        alpha: 0.62
      },
      // Irregular perimeter bulges (cac thuy may loi lom khong doi xung)
      {
        x: half + 17,
        y: half - 11,
        r: 21,
        alpha: 0.54
      },
      {
        x: half - 18,
        y: half - 7,
        r: 22,
        alpha: 0.50
      },
      {
        x: half - 11,
        y: half + 18,
        r: 20,
        alpha: 0.48
      },
      {
        x: half + 19,
        y: half + 13,
        r: 18,
        alpha: 0.45
      },
      {
        x: half + 2,
        y: half - 21,
        r: 18,
        alpha: 0.46
      },
      {
        x: half - 21,
        y: half + 6,
        r: 17,
        alpha: 0.44
      },
      {
        x: half + 21,
        y: half - 2,
        r: 16,
        alpha: 0.40
      },
      {
        x: half + 6,
        y: half + 23,
        r: 16,
        alpha: 0.42
      }
    ];

    puffBlobs.forEach((blob) => {
      const g = ctx.createRadialGradient(
        blob.x,
        blob.y,
        blob.r * 0.1,
        blob.x,
        blob.y,
        blob.r
      );
      g.addColorStop(
        0,
        `rgba(255, 255, 255, ${blob.alpha})`
      );
      g.addColorStop(
        0.45,
        `rgba(255, 255, 255, ${blob.alpha * 0.65})`
      );
      g.addColorStop(
        0.8,
        `rgba(255, 255, 255, ${blob.alpha * 0.2})`
      );
      g.addColorStop(
        1,
        'rgba(255, 255, 255, 0.0)'
      );

      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(
        blob.x,
        blob.y,
        blob.r,
        0,
        Math.PI * 2
      );
      ctx.fill();
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  // Fast direct particle injection method (bypasses EventBus for high performance)
  addSmokePoint(origin, velocity, options = {}) {
    if (this.quality === 'off') return;
    this.spawnPuff(
      origin,
      velocity,
      {
        category: 'aerial',
        ...options
      }
    );
  }

  spawnPuff(origin, velocity, options = {}) {
    if (this.quality === 'off') {
      return;
    }

    const category = options.category === 'launch'
      ? 'launch'
      : 'aerial';

    const maxForCategory = this.maxPuffs[category] ?? 0;
    const currentCount = category === 'launch'
      ? this.activeLaunchCount
      : this.activeAerialCount;

    if (
      maxForCategory === 0 ||
      currentCount >= maxForCategory ||
      this.puffs.length >= BUFFER_CAPACITY
    ) {
      return;
    }

    const cfg = FIREWORK_CONFIG.SMOKE;
    const defaultLife = cfg.trailLifeMin + Math.random() * (cfg.trailLifeMax - cfg.trailLifeMin);
    const rawLife = options.life ?? defaultLife;
    const effectiveLife = rawLife * this.lifespanMultiplier;

    const growth = options.growth ?? cfg.trailGrowth;
    const isHaze = Boolean(options.isHaze);
    const hazeChance = cfg.hazeChance ?? 0.22;
    const isNucleus = Boolean(
      options.isNucleus !== undefined
        ? options.isNucleus
        : (options.isHazePromoter !== undefined
          ? options.isHazePromoter
          : Math.random() < hazeChance)
    );
    const isHazePromoter = !isHaze && isNucleus;
    const nucleusBoost = options.nucleusBoost
      ?? (cfg.coalescenceExpansionBoost ?? 3.5);

    this.puffs.push({
      category: category,
      position: origin.clone(),
      velocity: velocity.clone(),
      age: 0,
      life: effectiveLife,
      initialLife: effectiveLife,
      growth: growth,
      drag: options.drag ?? cfg.trailDrag,
      buoyancy: options.buoyancy ?? cfg.trailBuoyancy,
      seed: options.seed ?? Math.random(),
      color: options.color ? options.color.clone() : new THREE.Color(0xf2f5f9),
      baseScale: (options.scale ?? cfg.trailBaseScale) * this.density,
      baseOpacity: (options.opacity ?? cfg.trailOpacity) * this.density,
      isHaze: isHaze,
      isHazePromoter: isHazePromoter,
      isNucleus: isNucleus,
      nucleusBoost: nucleusBoost
    });

    if (category === 'launch') {
      this.activeLaunchCount++;
    } else {
      this.activeAerialCount++;
    }
    this.activePuffCount = this.puffs.length;
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

    const count = this.unlimited
      ? 14
      : (this.quality === 'high' ? 8 : (this.quality === 'low' ? 3 : 5));

    const defaultWhiteSmoke = new THREE.Color(0xf2f5f9);
    const launchSmokeColor = detail.hasCustomColor && detail.colorHex !== undefined
      ? new THREE.Color(detail.colorHex)
      : defaultWhiteSmoke;

    for (let i = 0; i < count; i++) {
      const isNucleus = (i === 0);
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
          category: 'launch',
          isNucleus: isNucleus,
          nucleusBoost: 3.2,
          life: cfg.trailLifeMin + Math.random() * (cfg.trailLifeMax - cfg.trailLifeMin),
          scale: cfg.trailBaseScale + Math.random() * 3.0,
          growth: cfg.trailGrowth,
          drag: cfg.trailDrag,
          buoyancy: cfg.trailBuoyancy,
          opacity: cfg.trailOpacity + Math.random() * 0.1,
          color: launchSmokeColor
        }
      );
    }
  }

  // Burst Cloud Emitter: Mo phong the tich dam khoi phao hoa hinh dang tron meo mo go ghe (asymmetric cauliflower cloud)
  onBurst(detail = {}) {
    if (this.quality === 'off') return;

    const hasBurstSmoke = Boolean(detail.hasBurstSmoke)
      || (Array.isArray(detail.effects) && detail.effects.includes('burst-smoke'))
      || Boolean(detail.burstSmoke);

    if (!hasBurstSmoke) {
      return;
    }

    const cfg = FIREWORK_CONFIG.SMOKE;
    const burstPos = new THREE.Vector3(
      detail.position?.x ?? 0,
      detail.position?.y ?? 160,
      detail.position?.z ?? 0
    );

    // Khoi mac dinh mau trang; chi khi co custom mau thi moi nhan mau theo phao
    const defaultWhiteSmoke = new THREE.Color(0xf2f5f9);
    const smokeColor = detail.hasCustomColor && detail.colorHex !== undefined
      ? new THREE.Color(detail.colorHex)
      : defaultWhiteSmoke;

    const intensity = THREE.MathUtils.clamp(
      detail.intensity ?? 0.5,
      0.1,
      1.0
    );

    // 1. Bien dang the tich 3D khong doi xung (anisotropic stretch tensor)
    // Thiet lap ti le det truc doc Y de khoi bung rong be ngang tu nhien hon
    const stretchX = 0.85 + Math.random() * 0.55;
    const stretchY = 0.58 + Math.random() * 0.42;
    const stretchZ = 0.85 + Math.random() * 0.55;

    // Huong bung phinh bat doi xung cuc dai (dominant blowout vector)
    const blowoutAzimuth = Math.random() * Math.PI * 2;
    const blowoutElev = (Math.random() - 0.5) * Math.PI * 0.65;
    const blowoutDir = new THREE.Vector3(
      Math.cos(blowoutElev) * Math.cos(blowoutAzimuth),
      Math.sin(blowoutElev),
      Math.cos(blowoutElev) * Math.sin(blowoutAzimuth)
    ).normalize();

    const harmonicPhase = Math.random() * Math.PI * 2;
    // Ban kinh phao hoa toa ra toan phan (mac dinh 38 - 60m)
    const fireworkSpread = detail.burstRadius
      ? detail.burstRadius
      : (38.0 + intensity * 22.0);
    // Ban kinh cum khoi co ban nam trong khoang ~1/4 den 1/3 ban kinh phao
    const burstSpreadRadius = fireworkSpread * (0.18 + 0.08 * intensity);

    // Phase 1: Core Mass (Nhan dac trung tam) - Tao do dac noi tai ma khong lam phong to toan bo hinh
    const coreCount = this.unlimited
      ? 6
      : (this.quality === 'high' ? 4 : (this.quality === 'low' ? 2 : 3));

    for (let i = 0; i < coreCount; i++) {
      const isNucleus = (i === 0);
      const coreOffset = new THREE.Vector3(
        (Math.random() - 0.5) * 6.5 * stretchX,
        (Math.random() - 0.5) * 4.5 * stretchY,
        (Math.random() - 0.5) * 6.5 * stretchZ
      );
      const coreVelocity = coreOffset.clone().normalize().multiplyScalar(
        0.8 + Math.random() * 1.5
      );
      const burstLife = cfg.burstLifeMin + Math.random() * (cfg.burstLifeMax - cfg.burstLifeMin);
      const burstDrag = cfg.burstDragMin + Math.random() * (cfg.burstDragMax - cfg.burstDragMin);
      const burstBuoyancy = cfg.burstBuoyancyMin + Math.random() * (cfg.burstBuoyancyMax - cfg.burstBuoyancyMin);

      this.spawnPuff(
        burstPos.clone().add(coreOffset),
        coreVelocity,
        {
          category: 'aerial',
          isNucleus: isNucleus,
          nucleusBoost: 3.8,
          life: burstLife,
          scale: (cfg.burstBaseScale * 0.95) + Math.random() * 2.5,
          growth: (cfg.burstGrowth * 0.55) + Math.random() * 0.8,
          drag: burstDrag,
          buoyancy: burstBuoyancy,
          seed: (i * 0.23) % 1.0,
          opacity: cfg.burstOpacity * 1.15 + Math.random() * 0.08,
          color: smokeColor
        }
      );
    }

    // Phase 2: Asymmetric Primary & Secondary Lobes (Cac thuy chinh loi lom meo mo)
    const lobeCount = this.unlimited
      ? 8
      : (this.quality === 'high' ? 6 : (this.quality === 'low' ? 3 : 4));
    const puffsPerLobe = this.unlimited ? 4 : (this.quality === 'high' ? 3 : 2);

    for (let l = 0; l < lobeCount; l++) {
      const lobeAzimuth = (l / lobeCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const lobeElevation = (Math.random() - 0.5) * Math.PI * 0.75;

      const lobeDir = new THREE.Vector3(
        Math.cos(lobeElevation) * Math.cos(lobeAzimuth),
        Math.sin(lobeElevation),
        Math.cos(lobeElevation) * Math.sin(lobeAzimuth)
      ).normalize();

      // Song dieu hoa khong gian tao goc loi/lom tu nhien quanh duong bien
      const harmonic = Math.sin(lobeAzimuth * 2.0 + harmonicPhase) * 0.25
        + Math.cos(lobeAzimuth * 3.0 - harmonicPhase * 0.5) * 0.16
        + Math.sin(lobeElevation * 2.5) * 0.14;

      const blowoutAlign = Math.max(0.0, lobeDir.dot(blowoutDir));
      const blowoutBoost = Math.pow(blowoutAlign, 1.6) * 0.40;
      const indent = Math.max(0.0, -lobeDir.dot(blowoutDir)) * 0.22;

      const lobeDistortion = Math.max(0.55, 0.82 + harmonic + blowoutBoost - indent);
      const lobeDist = burstSpreadRadius * lobeDistortion;

      const lobeOffset = new THREE.Vector3(
        lobeDir.x * lobeDist * stretchX,
        lobeDir.y * lobeDist * stretchY,
        lobeDir.z * lobeDist * stretchZ
      );

      const isDominantLobe = blowoutAlign > 0.6;
      const lobeScaleMult = isDominantLobe
        ? (1.35 + Math.random() * 0.40)
        : (0.75 + Math.random() * 0.35);

      const lobeCenter = burstPos.clone().add(lobeOffset);
      const lobeSeed = Math.random();

      for (let p = 0; p < puffsPerLobe; p++) {
        const isNucleus = (p === 0);
        const puffJitter = new THREE.Vector3(
          (Math.random() - 0.5) * 6.5 * stretchX,
          (Math.random() - 0.5) * 4.5 * stretchY,
          (Math.random() - 0.5) * 6.5 * stretchZ
        );

        const puffVel = lobeOffset.clone().normalize().multiplyScalar(
          1.6 + Math.random() * 3.2
        ).add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 1.5,
            0.5 + Math.random() * 1.5,
            (Math.random() - 0.5) * 1.5
          )
        );

        const burstLife = cfg.burstLifeMin + Math.random() * (cfg.burstLifeMax - cfg.burstLifeMin);
        const burstDrag = cfg.burstDragMin + Math.random() * (cfg.burstDragMax - cfg.burstDragMin);
        const burstBuoyancy = cfg.burstBuoyancyMin + Math.random() * (cfg.burstBuoyancyMax - cfg.burstBuoyancyMin);

        this.spawnPuff(
          lobeCenter.clone().add(puffJitter),
          puffVel,
          {
            category: 'aerial',
            isNucleus: isNucleus,
            nucleusBoost: 3.5,
            life: burstLife,
            scale: (cfg.burstBaseScale * lobeScaleMult) + Math.random() * 3.2,
            growth: (cfg.burstGrowth * 0.6) + Math.random() * 0.8,
            drag: burstDrag,
            buoyancy: burstBuoyancy,
            seed: (lobeSeed + p * 0.19) % 1.0,
            opacity: cfg.burstOpacity + Math.random() * 0.08,
            color: smokeColor
          }
        );
      }
    }

    // Phase 3: Perimeter Breakout Tufts (Cac vet mun khoi ria meo mo go ghe)
    // Pha vo duong cong tron hoan hao, tao cam giac canh khoi hoa lo tu nhien
    const tuftCount = this.unlimited
      ? 10
      : (this.quality === 'high' ? 7 : (this.quality === 'low' ? 2 : 4));

    for (let t = 0; t < tuftCount; t++) {
      const tuftAzimuth = Math.random() * Math.PI * 2;
      const tuftElev = (Math.random() - 0.5) * Math.PI * 0.8;
      const tuftDir = new THREE.Vector3(
        Math.cos(tuftElev) * Math.cos(tuftAzimuth),
        Math.sin(tuftElev),
        Math.cos(tuftElev) * Math.sin(tuftAzimuth)
      ).normalize();

      const tuftDist = burstSpreadRadius * (0.85 + Math.random() * 0.65);
      const tuftOffset = new THREE.Vector3(
        tuftDir.x * tuftDist * stretchX,
        tuftDir.y * tuftDist * stretchY,
        tuftDir.z * tuftDist * stretchZ
      );

      const burstLife = cfg.burstLifeMin * 0.8 + Math.random() * 4.0;
      const burstDrag = cfg.burstDragMin + Math.random() * 0.8;
      const burstBuoyancy = cfg.burstBuoyancyMin + Math.random() * 0.3;

      this.spawnPuff(
        burstPos.clone().add(tuftOffset),
        tuftDir.clone().multiplyScalar(2.5 + Math.random() * 3.5),
        {
          life: burstLife,
          scale: (cfg.burstBaseScale * 0.45) + Math.random() * 2.0,
          growth: (cfg.burstGrowth * 0.5) + Math.random() * 0.7,
          drag: burstDrag,
          buoyancy: burstBuoyancy,
          seed: Math.random(),
          opacity: cfg.burstOpacity * 0.78 + Math.random() * 0.06,
          color: smokeColor
        }
      );
    }

    // Phase 4: Radial Burst Streaks (Cac vet khoi toa theo tia ban cua hat, keo dai xap xi 1/3 phao)
    // Mo phong tia khoi sinh ra theo duong bay cua hat trong khoang 1/3 ban kinh/dien tich toa
    const streakCount = this.unlimited
      ? 14
      : (this.quality === 'high' ? 9 : (this.quality === 'low' ? 3 : 6));

    for (let s = 0; s < streakCount; s++) {
      const sAzimuth = Math.random() * Math.PI * 2;
      const sElev = (Math.random() - 0.5) * Math.PI * 0.85;
      const streakDir = new THREE.Vector3(
        Math.cos(sElev) * Math.cos(sAzimuth),
        Math.sin(sElev),
        Math.cos(sElev) * Math.sin(sAzimuth)
      ).normalize();

      // Do dai tia xap xi ngau nhien trong khoang 1/3 ban kinh/dien tich toa cua phao (0.24 den 0.38)
      const maxStreakDist = fireworkSpread * (0.24 + Math.random() * 0.14);
      const pointsOnStreak = this.quality === 'low' ? 2 : 3;

      for (let p = 1; p <= pointsOnStreak; p++) {
        const frac = p / pointsOnStreak;
        const d = maxStreakDist * (frac * 0.75 + 0.25 * Math.random());
        const streakPos = burstPos.clone().add(
          new THREE.Vector3(
            streakDir.x * d * stretchX,
            streakDir.y * d * stretchY,
            streakDir.z * d * stretchZ
          )
        );

        // Van toc huong doc theo tia ban cua hat
        const streakVel = streakDir.clone().multiplyScalar(
          (2.2 + Math.random() * 2.8) * (1.1 - frac * 0.4)
        ).add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 1.2,
            0.4 + Math.random() * 1.0,
            (Math.random() - 0.5) * 1.2
          )
        );

        const burstLife = cfg.burstLifeMin * 0.85 + Math.random() * 3.5;
        const burstDrag = cfg.burstDragMin + Math.random() * 0.6;
        const burstBuoyancy = cfg.burstBuoyancyMin + Math.random() * 0.25;

        this.spawnPuff(
          streakPos,
          streakVel,
          {
            life: burstLife,
            scale: (cfg.burstBaseScale * (0.55 + 0.35 * (1.0 - frac * 0.5))) + Math.random() * 1.8,
            growth: (cfg.burstGrowth * 0.52) + Math.random() * 0.6,
            drag: burstDrag,
            buoyancy: burstBuoyancy,
            seed: (s * 0.17 + p * 0.29) % 1.0,
            opacity: (cfg.burstOpacity * (0.85 - frac * 0.25)) + Math.random() * 0.05,
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
    const cfg = FIREWORK_CONFIG.SMOKE;
    const isHazeEnabled = renderingConfig.smoke?.hazeConsolidation
      ?? cfg.hazeConsolidation
      ?? true;
    const handoverRatio = cfg.hazeHandoverRatio ?? 0.30;
    const hazeRatio = cfg.hazeLifeRatio ?? 0.70;
    const nonPromoterCutoffRatio = handoverRatio * 1.25;

    // Cap nhat dong luc hoc hat (Kinematics with exponential drag, buoyancy, wind shear & turbulent dispersion)
    for (let i = 0; i < this.puffs.length; i++) {
      const puff = this.puffs[i];
      puff.age += deltaTime;

      if (puff.isHaze) {
        // Hat da chuyen sinh: ton tai trong 70% tong thoi gian
        if (puff.age < puff.life) {
          const tHaze = puff.age / puff.life;
          const dragFactor = Math.exp(-puff.drag * deltaTime);
          puff.velocity.multiplyScalar(dragFactor);

          const windShear = 0.78 + 0.44 * puff.seed;
          const localWindX = this.currentWind.x * windShear;
          const localWindZ = this.currentWind.z * windShear;
          const localWindY = this.currentWind.y;

          puff.velocity.x = THREE.MathUtils.lerp(
            puff.velocity.x,
            localWindX,
            deltaTime * 0.72
          );
          puff.velocity.z = THREE.MathUtils.lerp(
            puff.velocity.z,
            localWindZ,
            deltaTime * 0.72
          );
          puff.velocity.y = THREE.MathUtils.lerp(
            puff.velocity.y,
            localWindY,
            deltaTime * 0.5
          );

          const dispersionStrength = 0.45 + 2.2 * tHaze;
          const noiseX = Math.sin(elapsed * 1.6 + puff.seed * 19.3) * dispersionStrength;
          const noiseZ = Math.cos(elapsed * 1.4 + puff.seed * 23.7) * dispersionStrength;
          puff.velocity.x += noiseX * deltaTime;
          puff.velocity.z += noiseZ * deltaTime;
          puff.velocity.y += puff.buoyancy * deltaTime;

          puff.position.addScaledVector(
            puff.velocity,
            deltaTime
          );
          alive.push(puff);
        }
      } else {
        // Giai doan sinh ban dau (30% tong thoi gian)
        const t = puff.age / puff.life;

        // Kiem tra ban giao som sang Ambient Haze o moc 30%
        if (isHazeEnabled && puff.isHazePromoter && t >= handoverRatio) {
          const growthCurve = Math.pow(t, 0.55);
          const growthScale = 1.0 + puff.growth * growthCurve * 0.45;
          const coalescenceMult = puff.isNucleus
            ? (1.0 + (puff.nucleusBoost - 1.0) * THREE.MathUtils.smoothstep(t, 0.05, handoverRatio))
            : 1.0;
          const currentSize = puff.baseScale * growthScale * coalescenceMult;

          const fade = Math.max(0.0, 1.0 - t);
          const expansionThinned = 1.0 / Math.sqrt(Math.max(1.0, growthScale * coalescenceMult * 0.28));
          const currentOpacity = fade * fade * puff.baseOpacity * expansionThinned;

          puff.isHaze = true;
          puff.isHazePromoter = false;
          puff.age = 0;
          puff.life = (puff.initialLife || puff.life) * hazeRatio;
          puff.baseScale = currentSize;
          puff.baseOpacity = currentOpacity;
          puff.drag = cfg.hazeDrag ?? 0.65;
          puff.buoyancy = cfg.hazeBuoyancy ?? 0.16;
          puff.growth = cfg.hazeGrowth ?? 1.45;
          puff.velocity.multiplyScalar(0.45);

          alive.push(puff);
        } else {
          // Hat thuong chua hoac khong chuyen sinh
          // Giai phong hat som: hat khong chuyen sinh chet o moc nonPromoterCutoffRatio (~37.5%)
          const maxSpawnT = puff.isHazePromoter ? handoverRatio : nonPromoterCutoffRatio;

          if (t < maxSpawnT) {
            const dragFactor = Math.exp(-puff.drag * deltaTime);
            puff.velocity.multiplyScalar(dragFactor);

            if (!puff.isNucleus && t > 0.06) {
              // Hat ve tinh ham toc nhe de chim tron vao vung hat nhan dang no to
              puff.velocity.multiplyScalar(Math.exp(-0.85 * deltaTime));
            }

            const windShear = 0.78 + 0.44 * puff.seed;
            const localWindX = this.currentWind.x * windShear;
            const localWindZ = this.currentWind.z * windShear;
            const localWindY = this.currentWind.y;

            puff.velocity.x = THREE.MathUtils.lerp(
              puff.velocity.x,
              localWindX,
              deltaTime * 0.72
            );
            puff.velocity.z = THREE.MathUtils.lerp(
              puff.velocity.z,
              localWindZ,
              deltaTime * 0.72
            );
            puff.velocity.y = THREE.MathUtils.lerp(
              puff.velocity.y,
              localWindY,
              deltaTime * 0.5
            );

            const dispersionStrength = 0.45 + 2.2 * t;
            const noiseX = Math.sin(elapsed * 1.6 + puff.seed * 19.3) * dispersionStrength;
            const noiseZ = Math.cos(elapsed * 1.4 + puff.seed * 23.7) * dispersionStrength;
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
      }
    }

    let nextLaunchCount = 0;
    let nextAerialCount = 0;
    for (let i = 0; i < alive.length; i++) {
      if (alive[i].category === 'launch') {
        nextLaunchCount++;
      } else {
        nextAerialCount++;
      }
    }
    this.activeLaunchCount = nextLaunchCount;
    this.activeAerialCount = nextAerialCount;
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

      if (puff.isHaze) {
        // Pha suong mu nen: Da sap nhap thanh khoi vi mo, tiep tuc no rong nhe nhang va suy giam don dieu
        const growthHaze = 1.0 + (puff.growth * 0.35) * Math.pow(t, 0.60);
        this.sizesArray[i] = puff.baseScale * growthHaze;

        // Suy giam do mo muon muot ma, khong dung expansionThinned hai lan gay sut do mo dot ngot
        const fadeHaze = Math.max(0.0, 1.0 - t);
        this.opacitiesArray[i] = puff.baseOpacity * Math.pow(fadeHaze, 1.35);
      } else {
        // Pha sinh va sap nhap (Coalescence Window)
        const growthCurve = Math.pow(t, 0.55);
        const growthScale = 1.0 + puff.growth * growthCurve * 0.45;

        if (puff.isNucleus) {
          // Hat nhan: No phong to dan theo smoothstep de hap thu the tich cac hat ve tinh xung quanh
          const mergeProgress = THREE.MathUtils.smoothstep(t, 0.05, handoverRatio);
          const coalescenceScale = 1.0 + (puff.nucleusBoost - 1.0) * mergeProgress;
          this.sizesArray[i] = puff.baseScale * growthScale * coalescenceScale;

          const fade = Math.max(0.0, 1.0 - t);
          const expansionThinned = 1.0 / Math.sqrt(Math.max(1.0, growthScale * coalescenceScale * 0.28));
          this.opacitiesArray[i] = fade * fade * puff.baseOpacity * expansionThinned;
        } else {
          // Hat ve tinh: Giu kich thuoc goc, tan bien deu de nhuong the tich cho hat nhan
          this.sizesArray[i] = puff.baseScale * growthScale;

          // Chuan hoa dung cu phap: THREE.MathUtils.smoothstep(x, min, max)
          // fadeProgress giam deu tu 1.0 xuong 0.0 giup hat tieu bien hoan toan truoc khi bi cull
          const fadeProgress = 1.0 - THREE.MathUtils.smoothstep(t, 0.06, nonPromoterCutoffRatio);
          const expansionThinned = 1.0 / Math.sqrt(Math.max(1.0, growthScale * 0.25));
          this.opacitiesArray[i] = fadeProgress * fadeProgress * puff.baseOpacity * expansionThinned;
        }
      }

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
    this.activeLaunchCount = 0;
    this.activeAerialCount = 0;
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
