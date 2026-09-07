import * as THREE from 'three';

export class SkyDome {
  constructor(options = {}) {
    this.group = new THREE.Group();
    this.group.name = 'SkyDomeGroup';

    this.radius = options.radius || 1400;
    this.topColor = new THREE.Color(options.topColor || 0x02020a);
    this.bottomColor = new THREE.Color(options.bottomColor || 0x091226);
    this.starCount = options.starCount || 2200;

    this.time = 0;

    this._createDome();
    this._createStarfield();
    this._createMoon();
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

      varying vec3 vWorldPosition;

      void main() {
        float h = normalize(vWorldPosition + vec3(0.0, uOffset, 0.0)).y;
        float factor = max(pow(max(h, 0.0), uExponent), 0.0);
        vec3 color = mix(uBottomColor, uTopColor, factor);
        gl_FragColor = vec4(color, 1.0);
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
    // Shifted further to the right in the background sky
    this.moonGroup.position.set(520, 220, -750);

    const quadSize = 300;
    const moonGeo = new THREE.PlaneGeometry(quadSize, quadSize);

    const moonVertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const moonFragmentShader = `
      varying vec2 vUv;

      void main() {
        vec2 center = vec2(0.5);
        float dist = length(vUv - center);

        if (dist > 0.5) {
          discard;
        }

        float moonRadius = 0.22;

        if (dist <= moonRadius) {
          // Inside Moon Disc
          vec2 p = (vUv - center) / moonRadius;
          float n1 = sin(p.x * 14.0 + 1.2) * cos(p.y * 12.0 + 0.8) * 0.04;
          float n2 = sin(p.x * 28.0) * sin(p.y * 26.0) * 0.02;
          float detail = 0.96 + n1 + n2;

          // Soft limb darkening towards disc edge
          float limb = 1.0 - pow(dist / moonRadius, 3.5) * 0.12;
          vec3 coreColor = vec3(0.95, 0.94, 0.90) * detail * limb;

          // Controlled subtle emissive level
          gl_FragColor = vec4(coreColor * 0.95, 1.0);
        } else {
          // Atmospheric halo glow outside moon disc
          float haloFactor = (0.5 - dist) / (0.5 - moonRadius);
          float glow = pow(clamp(haloFactor, 0.0, 1.0), 2.8) * 0.22;
          vec3 glowColor = vec3(0.80, 0.88, 1.0);

          gl_FragColor = vec4(glowColor, glow);
        }
      }
    `;

    const moonMat = new THREE.ShaderMaterial({
      vertexShader: moonVertexShader,
      fragmentShader: moonFragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false
    });

    this.moonMesh = new THREE.Mesh(moonGeo, moonMat);
    // Face the camera default origin
    this.moonMesh.lookAt(0, 0, 0);
    this.moonGroup.add(this.moonMesh);

    // Subtle moonlight directed towards the scene
    this.moonLight = new THREE.DirectionalLight(0xd5e2ff, 0.18);
    this.moonLight.position.copy(this.moonGroup.position);
    this.moonLight.target.position.set(0, 0, 0);

    this.group.add(this.moonGroup);
    this.group.add(this.moonLight);
    this.group.add(this.moonLight.target);
  }

  setLayer(layerIndex) {
    this.group.traverse((obj) => {
      obj.layers.enable(layerIndex);
    });
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
