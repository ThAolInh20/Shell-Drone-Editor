import * as THREE from 'three';
import { LAYER_REFLECTION } from '../config/layers.js';

export class DistantMountains {
  constructor(options = {}) {
    this.group = new THREE.Group();
    this.group.name = 'DistantMountainsGroup';

    this.radius = options.radius || 850;
    this.segments = options.segments || 128;
    this.baseY = options.baseY || -20;
    this.maxHeight = options.maxHeight || 160;

    this._createMountainRange();
    this.setLayer(LAYER_REFLECTION);
  }

  _createMountainRange() {
    // Generate layered cylindrical silhouette ring
    const vertexCount = (this.segments + 1) * 2;
    const positions = new Float32Array(vertexCount * 3);
    const indices = [];

    // Height generator using combination of sines
    const getHeight = (angle, layerSeed = 0) => {
      const s1 = Math.sin(angle * 3.0 + layerSeed);
      const s2 = Math.sin(angle * 7.0 + layerSeed * 1.5) * 0.5;
      const s3 = Math.sin(angle * 13.0 + layerSeed * 2.3) * 0.25;
      const s4 = Math.sin(angle * 29.0) * 0.1;
      
      const raw = (s1 + s2 + s3 + s4);
      // Normalize to positive peaks
      const normalized = Math.max(0.0, raw + 0.3);
      return normalized * this.maxHeight * 0.85;
    };

    // Build 2 rings of mountains (far outer ring and slightly closer inner ring)
    const layers = [
      { radiusScale: 1.05, heightScale: 1.15, seed: 1.2, colorTop: 0x010308 },
      { radiusScale: 0.95, heightScale: 0.85, seed: 4.8, colorTop: 0x020612 }
    ];

    layers.forEach((layer, layerIdx) => {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array((this.segments + 1) * 2 * 3);
      const idxs = [];

      const currentRadius = this.radius * layer.radiusScale;

      for (let i = 0; i <= this.segments; i++) {
        const theta = (i / this.segments) * Math.PI * 2;
        const x = Math.sin(theta) * currentRadius;
        const z = Math.cos(theta) * currentRadius;

        const peakY = this.baseY + getHeight(theta, layer.seed) * layer.heightScale;

        // Bottom vertex
        const vBotIdx = i * 2;
        pos[vBotIdx * 3 + 0] = x;
        pos[vBotIdx * 3 + 1] = this.baseY;
        pos[vBotIdx * 3 + 2] = z;

        // Top vertex (mountain ridge)
        const vTopIdx = i * 2 + 1;
        pos[vTopIdx * 3 + 0] = x;
        pos[vTopIdx * 3 + 1] = peakY;
        pos[vTopIdx * 3 + 2] = z;

        if (i < this.segments) {
          const b0 = i * 2;
          const t0 = i * 2 + 1;
          const b1 = (i + 1) * 2;
          const t1 = (i + 1) * 2 + 1;

          // Two triangles for quad segment
          idxs.push(b0, t0, b1);
          idxs.push(b1, t0, t1);
        }
      }

      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setIndex(idxs);
      geo.computeVertexNormals();

      const vertexShader = `
        varying float vHeightNorm;
        uniform float uBaseY;
        uniform float uMaxY;

        void main() {
          vHeightNorm = clamp((position.y - uBaseY) / (uMaxY - uBaseY), 0.0, 1.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `;

      const fragmentShader = `
        uniform vec3 uColorBase;
        uniform vec3 uColorTop;
        varying float vHeightNorm;

        void main() {
          vec3 finalColor = mix(uColorBase, uColorTop, vHeightNorm);
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `;

      const mat = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uBaseY: {
            value: this.baseY
          },
          uMaxY: {
            value: this.baseY + this.maxHeight * layer.heightScale
          },
          uColorBase: {
            value: new THREE.Color(0x060c1d)
          },
          uColorTop: {
            value: new THREE.Color(layer.colorTop)
          }
        },
        side: THREE.DoubleSide,
        depthWrite: true
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = `MountainLayer_${layerIdx}`;
      this.group.add(mesh);
    });
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
