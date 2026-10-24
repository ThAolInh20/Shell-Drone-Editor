import * as THREE from 'three';
import { LAYER_REFLECTION } from '../config/layers.js';

const CLOUD_COUNT = 45;
const MAX_LIGHTS = 4;

export class CloudSystem {
  constructor(options = {}) {
    this.scene = options.scene || null;
    this.cloudCount = options.count || CLOUD_COUNT;
    this.windSpeed = options.windSpeed || 1.2;
    this.windAngle = options.windAngle || 0.45; // Radians

    this.windVector = new THREE.Vector3(
      Math.cos(this.windAngle) * this.windSpeed,
      0,
      Math.sin(this.windAngle) * this.windSpeed
    );

    this.positionsArray = new Float32Array(this.cloudCount * 3);
    this.sizesArray = new Float32Array(this.cloudCount);
    this.opacitiesArray = new Float32Array(this.cloudCount);
    this.seedsArray = new Float32Array(this.cloudCount);

    this._initCloudParticles();

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(
        this.positionsArray,
        3
      )
    );
    this.geometry.setAttribute(
      'aSize',
      new THREE.BufferAttribute(
        this.sizesArray,
        1
      )
    );
    this.geometry.setAttribute(
      'aOpacity',
      new THREE.BufferAttribute(
        this.opacitiesArray,
        1
      )
    );
    this.geometry.setAttribute(
      'aSeed',
      new THREE.BufferAttribute(
        this.seedsArray,
        1
      )
    );

    this.cloudTexture = this._createCloudTexture();

    this.cloudUniforms = {
      uTime: {
        value: 0.0
      },
      uActiveLightCount: {
        value: 0.0
      },
      uLightPositions: {
        value: [
          new THREE.Vector3(0, -9999, 0),
          new THREE.Vector3(0, -9999, 0),
          new THREE.Vector3(0, -9999, 0),
          new THREE.Vector3(0, -9999, 0)
        ]
      },
      uLightColors: {
        value: [
          new THREE.Color(0x000000),
          new THREE.Color(0x000000),
          new THREE.Color(0x000000),
          new THREE.Color(0x000000)
        ]
      },
      uLightIntensities: {
        value: new Float32Array(MAX_LIGHTS)
      },
      uLightRadii: {
        value: new Float32Array([
          420.0,
          420.0,
          420.0,
          420.0
        ])
      }
    };

    this.material = new THREE.PointsMaterial({
      map: this.cloudTexture,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.NormalBlending,
      vertexColors: false,
      color: new THREE.Color(0x0a1024)
    });

    this.material.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.cloudUniforms.uTime;
      shader.uniforms.uActiveLightCount = this.cloudUniforms.uActiveLightCount;
      shader.uniforms.uLightPositions = this.cloudUniforms.uLightPositions;
      shader.uniforms.uLightColors = this.cloudUniforms.uLightColors;
      shader.uniforms.uLightIntensities = this.cloudUniforms.uLightIntensities;
      shader.uniforms.uLightRadii = this.cloudUniforms.uLightRadii;

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
        float sizeBreathe = sin(uTime * 0.45 + aSeed * 12.3) * 0.06;
        gl_PointSize = aSize * (1.0 + sizeBreathe);
        vOpacity = aOpacity;
        vSeed = aSeed;
        vWorldPos = position;
        `
      );

      shader.fragmentShader = `
        #define MAX_LIGHTS 4
        uniform float uTime;
        uniform float uActiveLightCount;
        uniform vec3 uLightPositions[MAX_LIGHTS];
        uniform vec3 uLightColors[MAX_LIGHTS];
        uniform float uLightIntensities[MAX_LIGHTS];
        uniform float uLightRadii[MAX_LIGHTS];
        varying float vOpacity;
        varying float vSeed;
        varying vec3 vWorldPos;
      ` + shader.fragmentShader.replace(
        '#include <map_particle_fragment>',
        `
        #ifdef USE_MAP
          float angle = vSeed * 6.2831853 + uTime * 0.02;
          float s = sin(angle);
          float c = cos(angle);
          vec2 rotCoord = vec2(
            c * (gl_PointCoord.x - 0.5) - s * (gl_PointCoord.y - 0.5) + 0.5,
            s * (gl_PointCoord.x - 0.5) + c * (gl_PointCoord.y - 0.5) + 0.5
          );
          vec4 mapTexel = texture2D(map, rotCoord);
          diffuseColor *= mapTexel;
        #endif
        `
      ).replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>
        
        vec3 nightAmbient = vec3(0.015, 0.025, 0.055);
        vec3 accumulatedLight = vec3(0.0);
        float totalIllum = 0.0;

        vec2 centeredP = gl_PointCoord - vec2(0.5);
        float r2 = clamp(dot(centeredP, centeredP) * 4.0, 0.0, 1.0);
        float nz = sqrt(max(0.0, 1.0 - r2));
        float edgeScattering = pow(1.0 - nz, 1.8) * 0.45;

        int activeLights = int(clamp(uActiveLightCount, 0.0, float(MAX_LIGHTS)));

        if (activeLights > 0) {
          for (int i = 0; i < MAX_LIGHTS; i++) {
            if (i >= activeLights) break;
            float lIntensity = uLightIntensities[i];
            if (lIntensity <= 0.001) continue;

            vec3 lPos = uLightPositions[i];
            vec3 lColor = uLightColors[i];
            float lRadius = max(50.0, uLightRadii[i]);

            vec3 toLight = lPos - vWorldPos;
            float distToLight = length(toLight);
            if (distToLight >= lRadius) continue;

            float lightAtten = clamp(1.0 - distToLight / lRadius, 0.0, 1.0);
            lightAtten = lightAtten * lightAtten;

            vec2 dirToLight2D = normalize(toLight.xz + vec2(0.0001));
            float NdotL = clamp(
              dot(centeredP * 2.0, dirToLight2D) * 0.40 + nz * 0.60 + 0.20,
              0.20,
              1.20
            );

            float lightIllum = (NdotL + edgeScattering) * lightAtten * lIntensity * 1.85;
            vec3 dyedColor = mix(
              vec3(0.9, 0.95, 1.0),
              lColor * 1.65,
              0.65
            );

            accumulatedLight += dyedColor * lightIllum;
            totalIllum += lightIllum;
          }
        }

        if (totalIllum > 0.001) {
          diffuseColor.rgb = mix(
            nightAmbient,
            accumulatedLight,
            clamp(totalIllum, 0.0, 1.0)
          );
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

    this.points = new THREE.Points(
      this.geometry,
      this.material
    );
    this.points.frustumCulled = false;
    this.points.layers.enable(LAYER_REFLECTION);

    if (this.scene) {
      this.scene.add(this.points);
    }
  }

  _initCloudParticles() {
    for (let i = 0; i < this.cloudCount; i++) {
      // Stratified distribution in upper atmosphere (Y = 390m to 520m)
      const x = (Math.random() - 0.5) * 1400;
      const y = 390 + Math.random() * 140;
      const z = (Math.random() - 0.5) * 1400;

      this.positionsArray[i * 3] = x;
      this.positionsArray[i * 3 + 1] = y;
      this.positionsArray[i * 3 + 2] = z;

      // Broad billowy clouds: 260px - 440px
      this.sizesArray[i] = 260 + Math.random() * 180;
      // Soft translucent night cloud opacity: 0.04 - 0.10
      this.opacitiesArray[i] = 0.04 + Math.random() * 0.06;
      this.seedsArray[i] = Math.random();
    }
  }

  _createCloudTexture() {
    if (typeof document === 'undefined') {
      return null;
    }
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const half = size * 0.5;

    // Organic soft multi-lobed cloud puff
    const lobes = [
      { x: half - 4, y: half + 2, r: 28, a: 0.70 },
      { x: half + 6, y: half - 4, r: 25, a: 0.60 },
      { x: half + 16, y: half + 8, r: 22, a: 0.50 },
      { x: half - 18, y: half - 6, r: 23, a: 0.52 },
      { x: half - 8, y: half + 16, r: 20, a: 0.44 },
      { x: half + 14, y: half - 14, r: 21, a: 0.46 }
    ];

    for (const lobe of lobes) {
      const grad = ctx.createRadialGradient(
        lobe.x,
        lobe.y,
        0,
        lobe.x,
        lobe.y,
        lobe.r
      );
      grad.addColorStop(0, `rgba(255, 255, 255, ${lobe.a})`);
      grad.addColorStop(0.55, `rgba(240, 245, 255, ${lobe.a * 0.45})`);
      grad.addColorStop(1, 'rgba(230, 240, 255, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(lobe.x, lobe.y, lobe.r, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
    return texture;
  }

  setMultiLights(lights = []) {
    const count = Math.min(MAX_LIGHTS, lights.length);
    this.cloudUniforms.uActiveLightCount.value = count;

    for (let i = 0; i < MAX_LIGHTS; i++) {
      if (i < count) {
        const light = lights[i];
        if (light.position) {
          this.cloudUniforms.uLightPositions.value[i].copy(light.position);
        }
        if (light.color) {
          this.cloudUniforms.uLightColors.value[i].copy(light.color);
        }
        this.cloudUniforms.uLightIntensities.value[i] = Math.max(
          0,
          Number(light.intensity) || 0
        );
        this.cloudUniforms.uLightRadii.value[i] = Math.max(
          50,
          Number(light.radius) || 420.0
        );
      } else {
        this.cloudUniforms.uLightIntensities.value[i] = 0.0;
      }
    }
  }

  update(deltaTime) {
    this.cloudUniforms.uTime.value += deltaTime;

    const dx = this.windVector.x * deltaTime;
    const dz = this.windVector.z * deltaTime;
    const boundary = 720;
    const wrapSpan = boundary * 2;

    for (let i = 0; i < this.cloudCount; i++) {
      let x = this.positionsArray[i * 3] + dx;
      let z = this.positionsArray[i * 3 + 2] + dz;

      if (x > boundary) x -= wrapSpan;
      else if (x < -boundary) x += wrapSpan;

      if (z > boundary) z -= wrapSpan;
      else if (z < -boundary) z += wrapSpan;

      this.positionsArray[i * 3] = x;
      this.positionsArray[i * 3 + 2] = z;
    }

    const posAttr = this.geometry.getAttribute('position');
    if (posAttr) {
      posAttr.needsUpdate = true;
    }
  }

  dispose() {
    if (this.scene && this.points) {
      this.scene.remove(this.points);
    }
    this.geometry?.dispose();
    this.material?.dispose();
    this.cloudTexture?.dispose();
  }
}
