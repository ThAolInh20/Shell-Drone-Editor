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
      uMoonDirection: {
        value: new THREE.Vector3(520, 220, -750).normalize()
      },
      uMoonColor: {
        value: new THREE.Color(0xd5e2ff)
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
      }
    };

    this._createMesh();
  }

  _generateWaveNormalTexture() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;

    const heightMap = new Float32Array(size * size);

    // Generate multi-octave perlin/sin wave heightmap
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = (x / size) * Math.PI * 2;
        const v = (y / size) * Math.PI * 2;

        let h = Math.sin(u * 3 + v * 2) * 0.4;
        h += Math.sin(u * 7 - v * 5) * 0.25;
        h += Math.sin(u * 13 + v * 11) * 0.15;
        h += Math.sin(u * 23 - v * 19) * 0.1;
        h += Math.sin(u * 41 + v * 37) * 0.05;

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

        const nx = -dX * 2.5;
        const ny = -dY * 2.5;
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
      uniform float uDistortionStrength;
      uniform float uWaveScale;
      uniform float uWaveSpeed;
      uniform float uMirrorEnabled;

      varying vec4 vProjectedCoord;
      varying vec3 vWorldPosition;
      varying vec2 vUv;

      void main() {
        // Dual scrolling UVs
        vec2 uv1 = vUv * uWaveScale + vec2(uTime * uWaveSpeed, uTime * uWaveSpeed * 0.6);
        vec2 uv2 = vUv * uWaveScale * 1.35 - vec2(uTime * uWaveSpeed * 0.7, -uTime * uWaveSpeed * 0.9);

        // Sample normal maps
        vec3 n1 = texture2D(uNormalMap, uv1).rgb * 2.0 - 1.0;
        vec3 n2 = texture2D(uNormalMap, uv2).rgb * 2.0 - 1.0;

        // Blend normals
        vec3 normal = normalize(vec3(n1.xy + n2.xy, n1.z * n2.z));
        normal = normalize(vec3(normal.x, normal.z, normal.y)); // Convert tangent space to world normal (Y is up)

        // View direction
        vec3 viewDir = normalize(cameraPosition - vWorldPosition);

        // Projective coordinates for planar reflection sampling
        vec2 baseCoord = vProjectedCoord.xy / vProjectedCoord.w;

        // Distance attenuation to prevent excessive shimmering at the far horizon
        float distToCam = length(cameraPosition - vWorldPosition);
        float distFactor = clamp(350.0 / distToCam, 0.15, 1.0);

        // Distort UV by wave normal
        vec2 distortion = normal.xz * uDistortionStrength * distFactor;
        vec2 reflectUV = clamp(baseCoord + distortion, vec2(0.001), vec2(0.999));

        // Sample reflected image
        vec4 reflectionColor = texture2D(uReflectionTexture, reflectUV);

        // Schlick Fresnel
        float NdotV = max(dot(viewDir, normal), 0.0);
        float R0 = 0.05;
        float fresnel = R0 + (1.0 - R0) * pow(1.0 - NdotV, 5.0);

        // Moonlight Specular Highlight
        vec3 halfVec = normalize(uMoonDirection + viewDir);
        float NdotH = max(dot(normal, halfVec), 0.0);
        float specular = pow(NdotH, 90.0) * 0.75;
        vec3 specColor = uMoonColor * specular;

        // Base water body color
        vec3 baseWater = mix(uWaterColor, uFresnelColor, fresnel * 0.35);

        // Specular Mirror Reflection Component
        vec3 finalColor = baseWater;
        if (uMirrorEnabled > 0.5) {
          finalColor = mix(baseWater, reflectionColor.rgb, clamp(fresnel * 1.45, 0.1, 1.0));
        }
        finalColor += specColor;

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

  setMirrorReflection(enabled) {
    this.uniforms.uMirrorEnabled.value = enabled ? 1.0 : 0.0;
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
