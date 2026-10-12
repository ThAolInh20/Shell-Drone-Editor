import * as THREE from 'three';
import { LAYER_REFLECTION } from '../config/layers.js';

function hash2(
  ix,
  iz,
  seed = 17
) {
  const value = Math.sin(
    ix * 127.1 + iz * 311.7 + seed * 74.7
  ) * 43758.5453123;
  return value - Math.floor(value);
}

function smooth(t) {
  return t * t * (3 - 2 * t);
}

function valueNoise(
  x,
  z,
  seed = 17
) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);

  const fx = smooth(x - ix);
  const fz = smooth(z - iz);

  const a = hash2(
    ix,
    iz,
    seed
  );
  const b = hash2(
    ix + 1,
    iz,
    seed
  );
  const c = hash2(
    ix,
    iz + 1,
    seed
  );
  const d = hash2(
    ix + 1,
    iz + 1,
    seed
  );

  const top = a + (b - a) * fx;
  const bottom = c + (d - c) * fx;

  return top + (bottom - top) * fz;
}

function fbm(
  x,
  z,
  octaves = 5,
  seed = 17
) {
  let amplitude = 0.5;
  let frequency = 1.0;
  let sum = 0;
  let weight = 0;

  for (let i = 0; i < octaves; i++) {
    sum += valueNoise(
      x * frequency,
      z * frequency,
      seed + i * 19
    ) * amplitude;

    weight += amplitude;
    amplitude *= 0.5;
    frequency *= 2.03;
  }

  return sum / weight;
}

function ridgedNoise(
  x,
  z,
  octaves = 5,
  seed = 17
) {
  let amplitude = 0.5;
  let frequency = 1.0;
  let sum = 0;
  let weight = 0;

  for (let i = 0; i < octaves; i++) {
    const n = valueNoise(
      x * frequency,
      z * frequency,
      seed + i * 23
    );

    const ridge = 1.0 - Math.abs(2.0 * n - 1.0);

    sum += ridge * ridge * amplitude;
    weight += amplitude;

    amplitude *= 0.5;
    frequency *= 2.07;
  }

  return sum / weight;
}

function shorelineRadius(
  theta,
  baseRadius = 700,
  seed = 41
) {
  const x = Math.cos(theta);
  const z = Math.sin(theta);

  const broad = fbm(
    x * 1.8 + 7,
    z * 1.8 - 4,
    4,
    seed + 51
  );
  const detail = fbm(
    x * 5.5 - 3,
    z * 5.5 + 9,
    3,
    seed + 73
  );

  return baseRadius +
    (broad - 0.5) * 130 +
    (detail - 0.5) * 28;
}

export class DistantMountains {
  constructor(options = {}) {
    this.group = new THREE.Group();
    this.group.name = 'DistantMountainsGroup';

    this.innerRadius = options.innerRadius || (options.radius ? options.radius * 0.82 : 700);
    this.outerRadius = options.outerRadius || (options.radius ? options.radius * 1.41 : 1200);
    this.angularSegments = options.angularSegments || options.segments || 512;
    this.radialSegments = options.radialSegments || 24;
    this.maxHeight = options.maxHeight || 220;
    this.seed = options.seed || 41;

    this.mountainUniforms = {
      uMoonDirection: {
        value: new THREE.Vector3(-0.4, 0.8, -0.3).normalize()
      },
      uMoonColor: {
        value: new THREE.Color(0x9dbdff)
      },
      uMoonIntensity: {
        value: 0.32
      },
      uFogColor: {
        value: new THREE.Color(0x0a1428)
      },
      uFogDensity: {
        value: 0.0016
      },
      uFlashPosition0: {
        value: new THREE.Vector3(0, 180, 0)
      },
      uFlashPosition1: {
        value: new THREE.Vector3(100, 160, -100)
      },
      uFlashColor0: {
        value: new THREE.Color(0xffad79)
      },
      uFlashColor1: {
        value: new THREE.Color(0x8abfff)
      },
      uFlashIntensity0: {
        value: 0.0
      },
      uFlashIntensity1: {
        value: 0.0
      }
    };

    this._createMaterial();
    this._createMainMountainMesh();
    this._createLimestoneIslands();
    this.setLayer(LAYER_REFLECTION);

  }

  _createMaterial() {
    this.material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 1.0,
      metalness: 0.0,
      flatShading: true
    });

    const uniforms = this.mountainUniforms;

    this.material.onBeforeCompile = (shader) => {
      Object.assign(
        shader.uniforms,
        uniforms
      );

      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
           varying vec3 vMountainWorldPos;
           varying vec3 vMountainWorldNormal;`
        )
        .replace(
          '#include <worldpos_vertex>',
          `#include <worldpos_vertex>
           vec4 mountainWorldPos = modelMatrix * vec4(transformed, 1.0);
           vMountainWorldPos = mountainWorldPos.xyz;
           vMountainWorldNormal = normalize(
             (modelMatrix * vec4(normal, 0.0)).xyz
           );`
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
           varying vec3 vMountainWorldPos;
           varying vec3 vMountainWorldNormal;

           uniform vec3 uMoonDirection;
           uniform vec3 uMoonColor;
           uniform float uMoonIntensity;

           uniform vec3 uFogColor;
           uniform float uFogDensity;

           uniform vec3 uFlashPosition0;
           uniform vec3 uFlashPosition1;
           uniform vec3 uFlashColor0;
           uniform vec3 uFlashColor1;
           uniform float uFlashIntensity0;
           uniform float uFlashIntensity1;`
        )
        .replace(
          '#include <output_fragment>',
          `
          #ifdef FLAT_SHADED
            vec3 fdx = dFdx(vMountainWorldPos);
            vec3 fdy = dFdy(vMountainWorldPos);
            vec3 mountainN = normalize(cross(fdx, fdy));
          #else
            vec3 mountainN = normalize(vMountainWorldNormal);
          #endif

          vec3 mountainV = normalize(cameraPosition - vMountainWorldPos);

          // Directional moonlight diffuse on mountain facets
          float moonDiffuse = max(
            dot(mountainN, normalize(uMoonDirection)),
            0.0
          );

          // Restrained silver rim, biased toward moon-facing silhouettes
          float fresnel = pow(
            1.0 - max(dot(mountainN, mountainV), 0.0),
            3.0
          );

          float moonRim = fresnel * smoothstep(
            -0.25,
            0.65,
            dot(mountainN, normalize(uMoonDirection))
          );

          vec3 mountainLight = uMoonColor * (
            moonDiffuse * uMoonIntensity +
            moonRim * uMoonIntensity * 0.65
          );

          // Two point-like fireworks flashes with quadratic falloff
          vec3 delta0 = uFlashPosition0 - vMountainWorldPos;
          vec3 delta1 = uFlashPosition1 - vMountainWorldPos;

          float distance0 = length(delta0);
          float distance1 = length(delta1);

          vec3 direction0 = delta0 / max(distance0, 0.001);
          vec3 direction1 = delta1 / max(distance1, 0.001);

          float diffuse0 = max(dot(mountainN, direction0), 0.0);
          float diffuse1 = max(dot(mountainN, direction1), 0.0);

          float attenuation0 = 1.0 / (
            1.0 + 0.0004 * distance0 * distance0
          );

          float attenuation1 = 1.0 / (
            1.0 + 0.0004 * distance1 * distance1
          );

          vec3 flashLight =
            uFlashColor0 * diffuse0 * attenuation0 * uFlashIntensity0 +
            uFlashColor1 * diffuse1 * attenuation1 * uFlashIntensity1;

          outgoingLight += diffuseColor.rgb * (mountainLight + flashLight);

          // Exponential distance haze
          float cameraDistance = length(cameraPosition - vMountainWorldPos);
          float fogAmount = clamp(
            1.0 - exp(-uFogDensity * cameraDistance),
            0.0,
            0.82
          );

          outgoingLight = mix(
            outgoingLight,
            uFogColor,
            fogAmount
          );

          #include <output_fragment>
          `
        );

      this.material.userData.mountainShader = shader;
    };

    this.material.customProgramCacheKey = () => 'distant-mountains-night-shader-v2';
    this.material.needsUpdate = true;
  }

  _createMainMountainMesh() {
    const columns = this.angularSegments + 1;
    const rows = this.radialSegments + 1;
    const vertexCount = columns * rows;

    const positions = new Float32Array(vertexCount * 3);
    const colors = new Float32Array(vertexCount * 3);
    const indices = [];

    for (let j = 0; j <= this.radialSegments; j++) {
      const t = j / this.radialSegments;
      const envelope = Math.pow(Math.sin(Math.PI * t), 0.7);

      for (let i = 0; i <= this.angularSegments; i++) {
        const u = i / this.angularSegments;
        const theta = u * Math.PI * 2;

        const angularX = Math.cos(theta);
        const angularZ = Math.sin(theta);

        const ridge = ridgedNoise(
          angularX * 2.8 + 13,
          angularZ * 2.8 - 7,
          5,
          this.seed
        );

        const broad = fbm(
          angularX * 1.7 + 29,
          angularZ * 1.7 + 11,
          4,
          this.seed + 100
        );

        const shoreline = (
          fbm(angularX * 5, angularZ * 5, 3, this.seed + 200) - 0.5
        ) * 10;

        const mountainShape = Math.pow(
          THREE.MathUtils.clamp(
            ridge * 0.85 + broad * 0.55 - 0.22,
            0,
            1
          ),
          1.35
        );

        const radialNoise = fbm(
          angularX * 4 + t * 2,
          angularZ * 4 - t * 3,
          3,
          this.seed + 300
        );

        const height =
          shoreline +
          envelope * this.maxHeight *
          (0.3 + mountainShape * 0.7) *
          (0.78 + radialNoise * 0.42);

        const baseRadius = shorelineRadius(
          theta,
          this.innerRadius,
          this.seed
        );

        const radius = THREE.MathUtils.lerp(
          baseRadius,
          this.outerRadius,
          t
        );

        const index = j * columns + i;
        const p = index * 3;

        positions[p + 0] = angularX * radius;
        positions[p + 1] = height;
        positions[p + 2] = angularZ * radius;

        const altitude = THREE.MathUtils.clamp(
          height / this.maxHeight,
          0,
          1
        );

        colors[p + 0] = 0.025 + altitude * 0.045;
        colors[p + 1] = 0.035 + altitude * 0.055;
        colors[p + 2] = 0.065 + altitude * 0.085;
      }
    }

    for (let j = 0; j < this.radialSegments; j++) {
      for (let i = 0; i < this.angularSegments; i++) {
        const a = j * columns + i;
        const b = a + 1;
        const c = a + columns;
        const d = c + 1;

        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }

    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3)
    );

    geometry.setAttribute(
      'color',
      new THREE.BufferAttribute(colors, 3)
    );

    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();

    this.mountainsMesh = new THREE.Mesh(
      geometry,
      this.material
    );

    this.mountainsMesh.name = 'DistantHorizonMountains';
    this.mountainsMesh.frustumCulled = true;
    this.mountainsMesh.castShadow = false;
    this.mountainsMesh.receiveShadow = false;

    this.group.add(this.mountainsMesh);
  }

  _createLimestoneIslands() {
    this.islandsGroup = new THREE.Group();
    this.islandsGroup.name = 'MidDistanceIslandsGroup';

    // 8 distinct karst limestone pinnacle islands scattered in front of shoreline
    const islandConfigs = [
      { angle: 0.35, distance: 540, baseRadius: 28, height: 42, seed: 101 },
      { angle: 0.95, distance: 610, baseRadius: 22, height: 35, seed: 102 },
      { angle: 1.82, distance: 510, baseRadius: 36, height: 50, seed: 103 },
      { angle: 2.65, distance: 580, baseRadius: 18, height: 28, seed: 104 },
      { angle: 3.40, distance: 530, baseRadius: 32, height: 46, seed: 105 },
      { angle: 4.15, distance: 630, baseRadius: 26, height: 38, seed: 106 },
      { angle: 4.95, distance: 520, baseRadius: 40, height: 54, seed: 107 },
      { angle: 5.75, distance: 590, baseRadius: 24, height: 32, seed: 108 }
    ];

    islandConfigs.forEach((cfg, idx) => {
      const segs = 9;
      const heightSegs = 3;
      const islandGeo = new THREE.CylinderGeometry(
        cfg.baseRadius * 0.25,
        cfg.baseRadius,
        cfg.height,
        segs,
        heightSegs
      );

      const posAttr = islandGeo.getAttribute('position');
      const count = posAttr.count;
      const colors = new Float32Array(count * 3);

      for (let i = 0; i < count; i++) {
        const x = posAttr.getX(i);
        const y = posAttr.getY(i);
        const z = posAttr.getZ(i);

        // Craggy noise displacement for limestone cliffs
        const noiseVal = valueNoise(
          x * 0.12 + cfg.seed,
          z * 0.12 - cfg.seed,
          cfg.seed
        );

        const displace = (noiseVal - 0.5) * (cfg.baseRadius * 0.35);
        posAttr.setXYZ(
          i,
          x + displace,
          y,
          z + displace
        );

        const altNorm = THREE.MathUtils.clamp(
          (y + cfg.height * 0.5) / cfg.height,
          0,
          1
        );

        colors[i * 3 + 0] = 0.02 + altNorm * 0.04;
        colors[i * 3 + 1] = 0.03 + altNorm * 0.05;
        colors[i * 3 + 2] = 0.05 + altNorm * 0.07;
      }

      islandGeo.setAttribute(
        'color',
        new THREE.BufferAttribute(colors, 3)
      );

      islandGeo.computeVertexNormals();
      islandGeo.computeBoundingSphere();

      const islandMesh = new THREE.Mesh(
        islandGeo,
        this.material
      );

      const posX = Math.cos(cfg.angle) * cfg.distance;
      const posZ = Math.sin(cfg.angle) * cfg.distance;

      islandMesh.position.set(
        posX,
        cfg.height * 0.42,
        posZ
      );

      islandMesh.rotation.y = cfg.seed * 1.5;
      islandMesh.name = `LimestoneIsland_${idx}`;

      this.islandsGroup.add(islandMesh);
    });

    this.group.add(this.islandsGroup);
  }

  setMoonDirection(
    positionOrDir,
    intensity = 0.32
  ) {
    if (positionOrDir && positionOrDir.isVector3) {
      this.mountainUniforms.uMoonDirection.value.copy(positionOrDir).normalize();
    }
    this.mountainUniforms.uMoonIntensity.value = Math.max(
      0.0,
      Number(intensity) || 0.0
    );
  }

  setBurstFlash(
    color,
    intensity,
    position = null,
    slot = 0
  ) {
    const targetSlot = slot === 1 ? '1' : '0';
    const numIntensity = Math.max(0.0, Number(intensity) || 0.0);

    this.mountainUniforms[`uFlashIntensity${targetSlot}`].value = numIntensity;

    if (color && this.mountainUniforms[`uFlashColor${targetSlot}`]) {
      this.mountainUniforms[`uFlashColor${targetSlot}`].value.copy(color);
    }
    if (position && this.mountainUniforms[`uFlashPosition${targetSlot}`]) {
      this.mountainUniforms[`uFlashPosition${targetSlot}`].value.copy(position);
    }

    // If reset is triggered without slot specified, clear both slots
    if (numIntensity === 0 && slot === 0 && !color && !position) {
      this.mountainUniforms.uFlashIntensity1.value = 0.0;
    }
  }

  updateFlashes(fireworks = []) {
    for (let i = 0; i < 2; i++) {
      const fw = fireworks[i];
      const suffix = i === 0 ? '0' : '1';

      if (fw && fw.intensity > 0.001) {
        this.mountainUniforms[`uFlashIntensity${suffix}`].value = fw.intensity;
        if (fw.position) {
          this.mountainUniforms[`uFlashPosition${suffix}`].value.copy(fw.position);
        }
        if (fw.color) {
          this.mountainUniforms[`uFlashColor${suffix}`].value.copy(fw.color);
        }
      } else {
        this.mountainUniforms[`uFlashIntensity${suffix}`].value = 0.0;
      }
    }
  }

  update() {
    // Statics remain stable; animation hooks ready if required
  }

  setLayer(layerIndex) {
    this.group.traverse((obj) => {
      obj.layers.enable(layerIndex);
    });
  }

  dispose() {
    this.group.traverse((obj) => {
      if (obj.geometry) {
        obj.geometry.dispose();
      }
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  }
}
