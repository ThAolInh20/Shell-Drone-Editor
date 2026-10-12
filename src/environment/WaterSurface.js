import * as THREE from 'three';
import { LAYER_DEFAULT } from '../config/layers.js';

export class WaterSurface {
  constructor(options = {}) {
    this.planarReflector = options.planarReflector;
    this.size = options.size || 3500;
    this.waterY = options.waterY || 0.0;
    this.time = 0;

    const resW = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const resH = typeof window !== 'undefined' ? window.innerHeight : 720;

    this.normalTexture = this._generateWaveNormalTexture();

    this.uniforms = {
      uReflectionTexture: {
        value: this.planarReflector ? this.planarReflector.texture : null
      },
      uTextureMatrix: {
        value: this.planarReflector ? this.planarReflector.textureMatrix : new THREE.Matrix4()
      },
      uNormalMap: {
        value: this.normalTexture
      },
      uTime: {
        value: 0.0
      },
      uResolution: {
        value: new THREE.Vector2(resW, resH)
      },
      uWaterColor: {
        value: new THREE.Color(0x020713)
      },
      uFresnelColor: {
        value: new THREE.Color(0x07152e)
      },
      uDistortionStrength: {
        value: 0.028
      },
      uWaveScale: {
        value: 45.0
      },
      uWaveSpeed: {
        value: 0.025
      },
      uMirrorEnabled: {
        value: 1.0
      },
      uMoonDirection: {
        value: new THREE.Vector3(520, 500, -750).normalize()
      },
      uMoonColor: {
        value: new THREE.Color(0xd5e2ff)
      },
      uMoonIntensity: {
        value: 0.60
      },
      uFlashPos: {
        value: new THREE.Vector3(0, 150, 0)
      },
      uFlashColor: {
        value: new THREE.Color(0x000000)
      },
      uFlashIntensity: {
        value: 0.0
      }
    };

    this._createMesh();
  }

  _generateWaveNormalTexture() {
    if (typeof document === 'undefined') {
      return new THREE.Texture();
    }
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;

    const heightMap = new Float32Array(size * size);

    // Multi-directional Trochoidal wave summation with varying angles and frequencies
    const waveDirections = [
      { dir: [1.0, 0.2], freq: 3.5, amp: 0.35 },
      { dir: [-0.6, 0.8], freq: 6.2, amp: 0.22 },
      { dir: [0.7, -0.7], freq: 11.8, amp: 0.16 },
      { dir: [0.3, 0.95], freq: 19.5, amp: 0.11 },
      { dir: [-0.9, -0.4], freq: 31.0, amp: 0.08 },
      { dir: [0.85, 0.5], freq: 47.0, amp: 0.05 },
      { dir: [-0.3, 0.95], freq: 73.0, amp: 0.03 }
    ];

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = (x / size) * Math.PI * 2;
        const v = (y / size) * Math.PI * 2;

        let h = 0;
        for (let w = 0; w < waveDirections.length; w++) {
          const wave = waveDirections[w];
          const dp = u * wave.dir[0] + v * wave.dir[1];
          // Trochoidal peak shaping creates sharper crests and rounded troughs
          const s = Math.sin(dp * wave.freq);
          const trochoid = Math.sign(s) * Math.pow(Math.abs(s), 1.25);
          h += trochoid * wave.amp;
        }

        // Add cross-turbulence noise to eliminate grid alignment
        const crossNoise = Math.sin(u * 17.3 + Math.cos(v * 19.7)) * 0.06 +
          Math.cos(v * 29.1 + Math.sin(u * 31.3)) * 0.04;
        h += crossNoise;

        heightMap[y * size + x] = h;
      }
    }

    // Compute Sobel normals from heightmap
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const xL = (x - 1 + size) % size;
        const xR = (x + 1) % size;
        const yU = (y - 1 + size) % size;
        const yD = (y + 1) % size;

        const dX = heightMap[y * size + xR] - heightMap[y * size + xL];
        const dY = heightMap[yD * size + x] - heightMap[yU * size + x];

        const nx = -dX * 3.2;
        const ny = -dY * 3.2;
        const nz = 1.0;

        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
        const normX = nx / len;
        const normY = ny / len;
        const normZ = nz / len;

        const idx = (y * size + x) * 4;
        data[idx + 0] = Math.floor((normX * 0.5 + 0.5) * 255);
        data[idx + 1] = Math.floor((normY * 0.5 + 0.5) * 255);
        data[idx + 2] = Math.floor((normZ * 0.5 + 0.5) * 255);
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    texture.needsUpdate = true;

    return texture;
  }

  _createMesh() {
    const geometry = new THREE.PlaneGeometry(
      this.size,
      this.size,
      64,
      64
    );

    const vertexShader = `
      varying vec4 vProjectedCoord;
      varying vec3 vWorldPosition;
      varying vec2 vUv;

      uniform mat4 uTextureMatrix;

      void main() {
        vUv = uv;
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        vProjectedCoord = uTextureMatrix * worldPos;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `;

    const fragmentShader = `
      uniform sampler2D uReflectionTexture;
      uniform sampler2D uNormalMap;
      uniform float uTime;
      uniform vec2 uResolution;
      uniform vec3 uWaterColor;
      uniform vec3 uFresnelColor;
      uniform vec3 uMoonDirection;
      uniform vec3 uMoonColor;
      uniform float uMoonIntensity;
      uniform float uDistortionStrength;
      uniform float uWaveScale;
      uniform float uWaveSpeed;
      uniform float uMirrorEnabled;
      uniform vec3 uFlashPos;
      uniform vec3 uFlashColor;
      uniform float uFlashIntensity;

      varying vec4 vProjectedCoord;
      varying vec3 vWorldPosition;
      varying vec2 vUv;

      void main() {
        float t = uTime * uWaveSpeed;

        // Tri-directional rotation matrices for non-aligned scrolling
        mat2 rot1 = mat2(0.866, -0.5, 0.5, 0.866);
        mat2 rot2 = mat2(0.707, 0.707, -0.707, 0.707);
        mat2 rot3 = mat2(0.5, 0.866, -0.866, 0.5);

        // Layer 1: Macro base waves
        vec2 uv1 = (rot1 * (vUv * (uWaveScale * 0.42))) + vec2(t * 0.7, t * 0.35);
        vec3 n1 = texture2D(uNormalMap, uv1).rgb * 2.0 - 1.0;

        // Layer 2: Medium ripples with domain warping from Layer 1
        vec2 uv2 = (rot2 * (vUv * uWaveScale)) + vec2(-t * 0.85, t * 0.6) + n1.xy * 0.04;
        vec3 n2 = texture2D(uNormalMap, uv2).rgb * 2.0 - 1.0;

        // Layer 3: Micro fine ripples
        vec2 uv3 = (rot3 * (vUv * (uWaveScale * 1.85))) + vec2(t * 1.15, -t * 0.95) + n2.xy * 0.03;
        vec3 n3 = texture2D(uNormalMap, uv3).rgb * 2.0 - 1.0;

        // Macro Spatial Noise Modulation across Lake Surface (calm patches vs choppy breeze patches)
        vec2 worldCoord = vWorldPosition.xz * 0.0018;
        float macroWave = sin(worldCoord.x * 2.1 + cos(worldCoord.y * 1.7 + t * 0.3)) *
                          cos(worldCoord.y * 2.4 - sin(worldCoord.x * 1.5 - t * 0.2));
        float spatialModulation = clamp(0.45 + 0.55 * (macroWave * 0.5 + 0.5), 0.25, 1.35);

        // Blend 3 normal layers with weighted contributions
        vec3 combinedNorm = normalize(vec3(
          n1.xy * 0.45 + n2.xy * 0.35 + n3.xy * 0.20,
          n1.z * n2.z * n3.z
        ));
        
        // Convert tangent space normal to world normal (Y is up)
        vec3 normal = normalize(vec3(combinedNorm.x, combinedNorm.z, combinedNorm.y));

        // View direction
        vec3 viewDir = normalize(cameraPosition - vWorldPosition);

        // Projective coordinates for planar reflection sampling
        vec2 baseCoord = vProjectedCoord.xy / vProjectedCoord.w;

        // Distance attenuation to prevent excessive shimmering at the far horizon
        float distToCam = length(cameraPosition - vWorldPosition);
        float distFactor = clamp(400.0 / distToCam, 0.15, 1.0);

        // Distort UV by wave normal modulated spatially
        vec2 distortion = normal.xz * uDistortionStrength * spatialModulation * distFactor;
        vec2 reflectUV = clamp(baseCoord + distortion, vec2(0.001), vec2(0.999));

        // Sample reflected image
        vec4 reflectionColor = texture2D(uReflectionTexture, reflectUV);

        // Schlick Fresnel
        float NdotV = max(dot(viewDir, normal), 0.0);
        float R0 = 0.05;
        float fresnel = R0 + (1.0 - R0) * pow(1.0 - NdotV, 5.0);

        // Base water body color
        vec3 baseWater = mix(uWaterColor, uFresnelColor, fresnel * 0.35);

        // Specular Mirror Reflection Component
        vec3 finalColor = baseWater;
        if (uMirrorEnabled > 0.5) {
          finalColor = mix(baseWater, reflectionColor.rgb, clamp(fresnel * 1.45, 0.1, 1.0));
        }

        // Moonlight Specular Highlight & Shimmer Column
        if (uMoonIntensity > 0.001) {
          vec3 halfVec = normalize(uMoonDirection + viewDir);
          float NdotH = max(dot(normal, halfVec), 0.0);
          float moonSpec = pow(NdotH, 64.0) * 0.55 * uMoonIntensity;

          vec3 reflectDir = reflect(-viewDir, normal);
          float RdotL = max(dot(reflectDir, uMoonDirection), 0.0);
          float moonStreak = pow(RdotL, 18.0) * 0.65 * uMoonIntensity;

          finalColor += uMoonColor * (moonSpec + moonStreak);
        }

        // Dynamic Burst Flash & Anisotropic Specular Highlight on Water
        if (uFlashIntensity > 0.001) {
          vec3 lightVec = uFlashPos - vWorldPosition;
          float lightDist = length(lightVec);
          vec3 lightDir = normalize(lightVec);

          // Quadratic distance attenuation
          float atten = 1.0 / (1.0 + lightDist * 0.006 + lightDist * lightDist * 0.00003);

          // Half-vector for Blinn-Phong specular highlight
          vec3 halfVec = normalize(lightDir + viewDir);
          float NdotH = max(dot(normal, halfVec), 0.0);
          float specHighlight = pow(NdotH, 32.0);

          // Anisotropic vertical stretch reflection column
          vec3 reflectDir = reflect(-viewDir, normal);
          float RdotL = max(dot(reflectDir, lightDir), 0.0);
          float streak = pow(RdotL, 16.0) * 1.5;

          // Diffuse water scatter and specular flash
          float NdotL = max(dot(normal, lightDir), 0.0);
          vec3 flashDiffuse = uFlashColor * (NdotL * 0.4 + 0.1) * atten * uFlashIntensity;
          vec3 flashSpecular = uFlashColor * (specHighlight + streak) * atten * uFlashIntensity * 2.2;

          finalColor += flashDiffuse + flashSpecular;
        }

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: this.uniforms,
      side: THREE.FrontSide,
      depthWrite: true
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.y = this.waterY;
    this.mesh.name = 'WaterSurface';

    // Set to default layer 0 so reflection camera does not capture water into itself
    this.mesh.layers.set(LAYER_DEFAULT);
  }

  setMoonIntensity(intensity) {
    if (this.uniforms?.uMoonIntensity) {
      this.uniforms.uMoonIntensity.value = Math.max(0.0, Number(intensity) || 0.0);
    }
  }

  setMoonDirection(dirVector) {
    if (this.uniforms?.uMoonDirection && dirVector) {
      this.uniforms.uMoonDirection.value.copy(dirVector).normalize();
    }
  }

  setBurstFlash(position, color, intensity) {
    if (position) {
      this.uniforms.uFlashPos.value.copy(position);
    }
    if (color) {
      this.uniforms.uFlashColor.value.copy(color);
    }
    this.uniforms.uFlashIntensity.value = intensity;
  }

  setMirrorReflection(enabled) {
    this.mirrorEnabled = Boolean(enabled);
    this.uniforms.uMirrorEnabled.value = this.mirrorEnabled ? 1.0 : 0.0;
  }

  isMirrorEnabled() {
    return this.mirrorEnabled !== false;
  }

  setWaveDistortion(strength) {
    this.uniforms.uDistortionStrength.value = strength;
  }

  setResolution(width, height) {
    this.uniforms.uResolution.value.set(width, height);
  }

  update(deltaTime) {
    this.time += deltaTime;
    this.uniforms.uTime.value = this.time;
    if (this.planarReflector) {
      if (this.uniforms.uReflectionTexture.value !== this.planarReflector.texture) {
        this.uniforms.uReflectionTexture.value = this.planarReflector.texture;
      }
      this.uniforms.uTextureMatrix.value = this.planarReflector.textureMatrix;
    }
  }

  dispose() {
    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
    }
    if (this.normalTexture) {
      this.normalTexture.dispose();
    }
  }
}
