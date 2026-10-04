import * as THREE from 'three';
import { LAYER_REFLECTION } from '../config/layers.js';
import { renderingConfig } from '../config/rendering.js';

export class SkyDome {
  constructor(options = {}) {
    this.group = new THREE.Group();
    this.group.name = 'SkyDomeGroup';

    this.radius = options.radius || 1400;
    this.topColor = new THREE.Color(options.topColor || 0x02020a);
    this.bottomColor = new THREE.Color(options.bottomColor || 0x091226);
    this.starCount = options.starCount || 2200;
    this.cloudCoverage = options.cloudCoverage ?? renderingConfig.sky?.cloudCoverage ?? 0.55;
    this.cloudSpeed = options.cloudSpeed ?? renderingConfig.sky?.cloudSpeed ?? 1.0;
    this.moonDay = options.moonDay ?? renderingConfig.sky?.moonDay ?? 15;
    this.moonPhase = options.moonPhase ?? renderingConfig.sky?.moonPhase ?? 'full';
    this.moonPosition = options.moonPosition ?? renderingConfig.sky?.moonPosition ?? 'right';
    this.moonAltitude = options.moonAltitude ?? renderingConfig.sky?.moonAltitude ?? 'mid';

    this.time = 0;

    this._createDome();
    this._createStarfield();
    this._createMoon();
    if (options.moonDay !== undefined) {
      this.setMoonDay(this.moonDay);
    } else {
      this.setMoonPhase(this.moonPhase);
    }
    this._updateMoonTransform();

    this.setLayer(LAYER_REFLECTION);
  }

  _createDome() {
    const vertexShader = `
      varying vec3 vWorldPosition;

      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform vec3 uTopColor;
      uniform vec3 uBottomColor;
      uniform float uOffset;
      uniform float uExponent;
      uniform float uTime;
      uniform float uCloudCoverage;
      uniform float uCloudSpeed;
      uniform vec3 uFlashPos;
      uniform vec3 uFlashColor;
      uniform float uFlashIntensity;

      varying vec3 vWorldPosition;

      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        mat2 rot = mat2(0.87758, 0.47942, -0.47942, 0.87758);
        for (int i = 0; i < 4; i++) {
          v += a * noise(p);
          p = rot * p * 2.02 + vec2(1.7, 3.2);
          a *= 0.5;
        }
        return v;
      }

      void main() {
        float h = normalize(vWorldPosition + vec3(0.0, uOffset, 0.0)).y;
        float factor = max(pow(max(h, 0.0), uExponent), 0.0);
        vec3 skyColor = mix(uBottomColor, uTopColor, factor);

        vec3 dir = normalize(vWorldPosition);
        if (dir.y > 0.01 && uCloudCoverage > 0.001) {
          vec2 cloudUV = (dir.xz / (dir.y + 0.16)) * 1.8;
          float t = uTime * uCloudSpeed * 0.045;
          vec2 wind1 = vec2(t * 1.0, t * 0.28);
          vec2 wind2 = vec2(-t * 0.45, t * 0.65);

          float n1 = fbm(cloudUV * 0.9 + wind1);
          float n2 = fbm(cloudUV * 1.8 + wind2 + vec2(n1 * 0.5));
          float cloudDensity = smoothstep(0.40, 0.75, n2) * smoothstep(0.01, 0.22, dir.y) * uCloudCoverage;

          vec3 cloudIllumination = vec3(0.0);
          if (uFlashIntensity > 0.001) {
            float distToFlash = length(vWorldPosition - uFlashPos);
            float flashAtten = clamp(1.0 - distToFlash / 1800.0, 0.0, 1.0);
            cloudIllumination = uFlashColor * (uFlashIntensity * flashAtten * flashAtten * 2.8);
          }

          vec3 baseCloudColor = mix(uBottomColor * 1.35, vec3(0.08, 0.11, 0.20), 0.65);
          vec3 finalCloudColor = baseCloudColor + cloudIllumination;

          skyColor = mix(skyColor, finalCloudColor, cloudDensity * 0.78);
        }

        gl_FragColor = vec4(skyColor, 1.0);
      }
    `;

    this.domeUniforms = {
      uTopColor: {
        value: this.topColor.clone()
      },
      uBottomColor: {
        value: this.bottomColor.clone()
      },
      uOffset: {
        value: 100.0
      },
      uExponent: {
        value: 0.65
      },
      uTime: {
        value: 0.0
      },
      uCloudCoverage: {
        value: this.cloudCoverage
      },
      uCloudSpeed: {
        value: this.cloudSpeed
      },
      uFlashPos: {
        value: new THREE.Vector3(0, 120, 0)
      },
      uFlashColor: {
        value: new THREE.Color(0x000000)
      },
      uFlashIntensity: {
        value: 0.0
      }
    };

    const geometry = new THREE.SphereGeometry(
      this.radius,
      32,
      24
    );

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: this.domeUniforms,
      side: THREE.BackSide,
      depthWrite: false
    });

    this.domeMesh = new THREE.Mesh(
      geometry,
      material
    );
    this.group.add(this.domeMesh);
  }

  _createStarfield() {
    const starGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.starCount * 3);
    const colors = new Float32Array(this.starCount * 3);
    const sizes = new Float32Array(this.starCount);
    const phases = new Float32Array(this.starCount);
    const speeds = new Float32Array(this.starCount);

    const palette = [
      new THREE.Color(0xffffff),
      new THREE.Color(0xbcdcff),
      new THREE.Color(0xffe8c8),
      new THREE.Color(0x89baff)
    ];

    for (let i = 0; i < this.starCount; i++) {
      // Concentrate stars in upper dome
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 0.9 + 0.05); // Y > 0
      const dist = this.radius * (0.85 + Math.random() * 0.1);

      const x = Math.sin(phi) * Math.cos(theta) * dist;
      const y = Math.cos(phi) * dist;
      const z = Math.sin(phi) * Math.sin(theta) * dist;

      positions[i * 3 + 0] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const baseColor = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3 + 0] = baseColor.r;
      colors[i * 3 + 1] = baseColor.g;
      colors[i * 3 + 2] = baseColor.b;

      sizes[i] = 1.2 + Math.random() * 2.8;
      phases[i] = Math.random() * Math.PI * 2;
      speeds[i] = 0.6 + Math.random() * 2.0;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    starGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    starGeo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    starGeo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));

    const starVertexShader = `
      attribute float aSize;
      attribute float aPhase;
      attribute float aSpeed;
      attribute vec3 color;

      uniform float uTime;

      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vColor = color;
        float twinkle = 0.55 + 0.45 * sin(uTime * aSpeed + aPhase);
        vAlpha = twinkle;

        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * (350.0 / -mvPosition.z) * (0.8 + 0.35 * twinkle);
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const starFragmentShader = `
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vec2 coord = gl_PointCoord - vec2(0.5);
        float dist = length(coord);
        if (dist > 0.5) {
          discard;
        }

        float strength = smoothstep(0.5, 0.0, dist);
        gl_FragColor = vec4(vColor, vAlpha * strength);
      }
    `;

    this.starUniforms = {
      uTime: {
        value: 0.0
      }
    };

    const starMaterial = new THREE.ShaderMaterial({
      vertexShader: starVertexShader,
      fragmentShader: starFragmentShader,
      uniforms: this.starUniforms,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.stars = new THREE.Points(starGeo, starMaterial);
    this.group.add(this.stars);
  }

  _createMoon() {
    this.moonGroup = new THREE.Group();
    this.moonGroup.name = 'MoonGroup';
    // Positioned in upper right background sky
    this.moonGroup.position.set(520, 500, -750);

    const quadSize = 300;
    const moonGeo = new THREE.PlaneGeometry(
      quadSize,
      quadSize
    );

    const moonVertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const moonFragmentShader = `
      uniform float uMoonAngle;
      uniform float uMoonPhaseValue;
      uniform vec3 uMoonColor;
      varying vec2 vUv;

      void main() {
        vec2 center = vec2(0.5);
        float dist = length(vUv - center);

        if (dist > 0.5) {
          discard;
        }

        float moonRadius = 0.22;
        float moonAlpha = 0.0;
        vec3 moonLitColor = vec3(0.0);

        if (dist <= moonRadius) {
          vec2 p = (vUv - center) / moonRadius;
          float z = sqrt(max(0.0, 1.0 - p.x * p.x - p.y * p.y));
          vec3 normal = vec3(p.x, p.y, z);

          // Phase illumination directional vector based on 30-day lunar orbit angle
          vec3 sunLightDir = normalize(vec3(-sin(uMoonAngle), 0.0, -cos(uMoonAngle)));
          float NdotL = dot(normal, sunLightDir);
          float lit = smoothstep(-0.02, 0.03, NdotL);

          // Soft antialiased disc boundary mask
          float discMask = smoothstep(moonRadius, moonRadius - 0.015, dist);
          moonAlpha = lit * discMask;

          // Subtle lunar maria and crater details
          float n1 = sin(p.x * 14.0 + 1.2) * cos(p.y * 12.0 + 0.8) * 0.04;
          float n2 = sin(p.x * 28.0) * sin(p.y * 26.0) * 0.02;
          float detail = 0.96 + n1 + n2;

          // Gentle limb darkening towards edges
          float limb = 1.0 - pow(dist / moonRadius, 3.5) * 0.12;
          moonLitColor = uMoonColor * (detail * 0.78) * limb;
        }

        // Soft atmospheric halo glow fading outward
        float haloFactor = clamp((0.5 - dist) / 0.5, 0.0, 1.0);
        float glow = pow(haloFactor, 3.2) * 0.20 * uMoonPhaseValue;
        vec3 glowColor = vec3(0.84, 0.91, 1.0);

        vec3 finalColor = mix(glowColor, moonLitColor, moonAlpha);
        float finalAlpha = max(glow, moonAlpha);

        gl_FragColor = vec4(finalColor, finalAlpha);
      }
    `;

    this.moonUniforms = {
      uMoonAngle: {
        value: Math.PI
      },
      uMoonPhaseValue: {
        value: 1.0
      },
      uMoonColor: {
        value: new THREE.Color(0xeef4ff)
      }
    };

    const moonMat = new THREE.ShaderMaterial({
      vertexShader: moonVertexShader,
      fragmentShader: moonFragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: this.moonUniforms,
      fog: false
    });

    this.moonMesh = new THREE.Mesh(
      moonGeo,
      moonMat
    );
    this.moonGroup.add(this.moonMesh);

    // Directional moonlight illuminating the world (scaled to 70% ~0.20)
    this.moonLight = new THREE.DirectionalLight(
      0xd5e2ff,
      0.20
    );
    this.moonLight.position.copy(this.moonGroup.position);
    this.moonLight.target.position.set(0, 0, 0);

    this.group.add(this.moonGroup);
    this.group.add(this.moonLight);
    this.group.add(this.moonLight.target);
  }

  _updateMoonTransform() {
    let x = 520;
    if (this.moonPosition === 'left') {
      x = -520;
    } else if (this.moonPosition === 'center') {
      x = 0;
    }

    let y = 500;
    if (this.moonAltitude === 'low') {
      y = 280;
    } else if (this.moonAltitude === 'high') {
      y = 720;
    }

    const z = -750;

    if (this.moonGroup) {
      this.moonGroup.position.set(x, y, z);
    }
    if (this.moonMesh) {
      this.moonMesh.lookAt(0, 0, 0);
    }
    if (this.moonLight && this.moonGroup) {
      this.moonLight.position.copy(this.moonGroup.position);
    }
  }

  setMoonPosition(pos) {
    this.moonPosition = pos || 'right';
    this._updateMoonTransform();
  }

  setMoonAltitude(alt) {
    this.moonAltitude = alt || 'mid';
    this._updateMoonTransform();
  }

  getMoonWorldPosition() {
    return this.moonGroup
      ? this.moonGroup.position.clone()
      : new THREE.Vector3(520, 500, -750);
  }

  setMoonDay(day) {
    const d = Math.max(1, Math.min(30, parseInt(day, 10) || 15));
    this.moonDay = d;

    // Angle phi from 0 (Day 1) to 2*PI (Day 30)
    const phi = ((d - 1) / 29.0) * (Math.PI * 2.0);
    // Smooth cosine illumination: Day 1: 0.0 -> Day 15: 1.0 -> Day 30: 0.0
    const phaseValue = (1.0 - Math.cos(phi)) * 0.5;

    if (this.moonUniforms) {
      this.moonUniforms.uMoonAngle.value = phi;
      this.moonUniforms.uMoonPhaseValue.value = phaseValue;
    }

    if (this.moonMesh) {
      this.moonMesh.visible = phaseValue > 0.001;
    }

    if (this.moonLight) {
      this.moonLight.visible = phaseValue > 0.001;
      this.moonLight.intensity = phaseValue * 0.20;
    }
  }

  setMoonPhase(phase) {
    if (typeof phase === 'number') {
      this.setMoonDay(phase);
      return;
    }

    this.moonPhase = phase || 'full';
    let targetDay = 15;

    switch (this.moonPhase) {
      case 'off':
        targetDay = 1;
        break;
      case 'crescent':
        targetDay = 5;
        break;
      case 'half':
        targetDay = 8;
        break;
      case 'gibbous':
        targetDay = 12;
        break;
      case 'full':
      default:
        targetDay = 15;
        break;
    }

    this.setMoonDay(targetDay);
  }

  setLayer(layerIndex) {
    this.group.traverse((obj) => {
      obj.layers.enable(layerIndex);
    });
  }

  setBurstFlash(position, color, intensity) {
    if (position && this.domeUniforms.uFlashPos) {
      this.domeUniforms.uFlashPos.value.copy(position);
    }
    if (color && this.domeUniforms.uFlashColor) {
      this.domeUniforms.uFlashColor.value.copy(color);
    }
    if (this.domeUniforms.uFlashIntensity) {
      this.domeUniforms.uFlashIntensity.value = intensity || 0.0;
    }
  }

  setCloudCoverage(coverage) {
    this.cloudCoverage = Math.max(0.0, Math.min(1.0, Number(coverage) || 0.0));
    if (this.domeUniforms?.uCloudCoverage) {
      this.domeUniforms.uCloudCoverage.value = this.cloudCoverage;
    }
  }

  setCloudSpeed(speed) {
    this.cloudSpeed = Math.max(0.0, Math.min(5.0, Number(speed) || 0.0));
    if (this.domeUniforms?.uCloudSpeed) {
      this.domeUniforms.uCloudSpeed.value = this.cloudSpeed;
    }
  }

  setSkyColors(topColor, bottomColor) {
    if (topColor) {
      this.domeUniforms.uTopColor.value.copy(topColor);
    }
    if (bottomColor) {
      this.domeUniforms.uBottomColor.value.copy(bottomColor);
    }
  }

  update(deltaTime) {
    this.time += deltaTime;
    if (this.domeUniforms?.uTime) {
      this.domeUniforms.uTime.value = this.time;
    }
    if (this.starUniforms) {
      this.starUniforms.uTime.value = this.time;
    }
  }

  dispose() {
    this.group.traverse((obj) => {
      if (obj.geometry) {
        obj.geometry.dispose();
      }
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((mat) => mat.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  }
}
