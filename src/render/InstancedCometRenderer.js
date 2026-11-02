import * as THREE from 'three';
import { LAYER_REFLECTION } from '../config/layers.js';

const _tempColor = new THREE.Color();
const _tempInnerColor = new THREE.Color();
const _tempDummy = new THREE.Object3D();
const _tempScale = new THREE.Vector3();
const _blackColor = new THREE.Color(0, 0, 0);

export class InstancedCometRenderer {
  constructor(scene, maxComets = 1200) {
    this.scene = scene;
    this.maxComets = maxComets;
    this.isAttached = false;

    // Temporarily bypass Math.random during Three.js internal UUID generation
    // to preserve exact PRNG sequence in simulation and determinism tests
    const currentRandom = Math.random;
    Math.random = () => 0.5;

    try {
      // 1. Core InstancedMesh
      const coreGeometry = new THREE.SphereGeometry(
        1,
        8,
        8
      );
      const coreMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 1,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false
      });
      this.coreMesh = new THREE.InstancedMesh(
        coreGeometry,
        coreMaterial,
        this.maxComets
      );
      this.coreMesh.frustumCulled = false;
      this.coreMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.coreMesh.instanceColor = new THREE.InstancedBufferAttribute(
        new Float32Array(this.maxComets * 3),
        3
      );
      this.coreMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
      if (this.coreMesh.layers && typeof this.coreMesh.layers.enable === 'function') {
        this.coreMesh.layers.enable(LAYER_REFLECTION);
      }

      // 2. Inner Hot-White Core InstancedMesh
      const innerGeometry = new THREE.SphereGeometry(
        1,
        8,
        8
      );
      const innerMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 1,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false
      });
      this.innerMesh = new THREE.InstancedMesh(
        innerGeometry,
        innerMaterial,
        this.maxComets
      );
      this.innerMesh.frustumCulled = false;
      this.innerMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.innerMesh.instanceColor = new THREE.InstancedBufferAttribute(
        new Float32Array(this.maxComets * 3),
        3
      );
      this.innerMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
      if (this.innerMesh.layers && typeof this.innerMesh.layers.enable === 'function') {
        this.innerMesh.layers.enable(LAYER_REFLECTION);
      }

      // Initialize all instances off-screen
      _tempDummy.position.set(
        0,
        -9999,
        0
      );
      _tempDummy.scale.set(
        0,
        0,
        0
      );
      _tempDummy.updateMatrix();

      for (let i = 0; i < this.maxComets; i++) {
        this.coreMesh.setMatrixAt(
          i,
          _tempDummy.matrix
        );
        this.coreMesh.setColorAt(
          i,
          _blackColor
        );
        this.innerMesh.setMatrixAt(
          i,
          _tempDummy.matrix
        );
        this.innerMesh.setColorAt(
          i,
          _blackColor
        );
      }

      this.coreMesh.instanceMatrix.needsUpdate = true;
      if (this.coreMesh.instanceColor) {
        this.coreMesh.instanceColor.needsUpdate = true;
      }
      this.innerMesh.instanceMatrix.needsUpdate = true;
      if (this.innerMesh.instanceColor) {
        this.innerMesh.instanceColor.needsUpdate = true;
      }

      this.coreMesh.count = 0;
      this.innerMesh.count = 0;
    } finally {
      Math.random = currentRandom;
    }
  }

  update(comets) {
    let instanceIdx = 0;
    const totalComets = Array.isArray(comets) ? comets.length : 0;

    for (let i = 0; i < totalComets && instanceIdx < this.maxComets; i++) {
      const comet = comets[i];
      if (!comet || comet.state === 'dead') {
        continue;
      }

      // Points mesh (e.g. notrail) is rendered separately via its own shader
      if (!comet.coreMesh || comet.coreMesh.isPoints) {
        continue;
      }

      const isCoreVisible = comet.coreMesh.visible !== false;
      const coreOpacity = comet.coreMesh.material?.opacity ?? 1.0;
      if (!isCoreVisible || coreOpacity <= 0.001) {
        continue;
      }

      // Extract transformation from comet mesh
      _tempDummy.position.copy(comet.mesh.position);
      _tempDummy.quaternion.copy(comet.mesh.quaternion);

      // Core scale
      const geomRadius = comet.coreMesh.geometry?.parameters?.radius || 1;
      _tempScale.set(
        geomRadius * comet.coreMesh.scale.x * comet.mesh.scale.x,
        geomRadius * comet.coreMesh.scale.y * comet.mesh.scale.y,
        geomRadius * comet.coreMesh.scale.z * comet.mesh.scale.z
      );
      _tempDummy.scale.copy(_tempScale);
      _tempDummy.updateMatrix();

      this.coreMesh.setMatrixAt(
        instanceIdx,
        _tempDummy.matrix
      );

      const baseCoreColor = comet.coreMesh.material?.color || comet.coreColor;
      _tempColor.copy(baseCoreColor).multiplyScalar(coreOpacity);
      this.coreMesh.setColorAt(
        instanceIdx,
        _tempColor
      );

      // Inner mesh scale & color
      if (comet.innerMesh && comet.innerMesh.visible !== false) {
        const innerOpacity = comet.innerMesh.material?.opacity ?? 1.0;
        const innerGeomRadius = comet.innerMesh.geometry?.parameters?.radius || 1;
        _tempScale.set(
          innerGeomRadius * comet.innerMesh.scale.x * comet.mesh.scale.x,
          innerGeomRadius * comet.innerMesh.scale.y * comet.mesh.scale.y,
          innerGeomRadius * comet.innerMesh.scale.z * comet.mesh.scale.z
        );
        _tempDummy.scale.copy(_tempScale);
        _tempDummy.updateMatrix();

        this.innerMesh.setMatrixAt(
          instanceIdx,
          _tempDummy.matrix
        );

        const baseInnerColor = comet.innerMesh.material?.color || _blackColor;
        _tempInnerColor.copy(baseInnerColor).multiplyScalar(innerOpacity);
        this.innerMesh.setColorAt(
          instanceIdx,
          _tempInnerColor
        );
      } else {
        _tempDummy.scale.set(
          0,
          0,
          0
        );
        _tempDummy.updateMatrix();
        this.innerMesh.setMatrixAt(
          instanceIdx,
          _tempDummy.matrix
        );
        this.innerMesh.setColorAt(
          instanceIdx,
          _blackColor
        );
      }

      instanceIdx++;
    }

    this.coreMesh.count = instanceIdx;
    this.innerMesh.count = instanceIdx;

    if (instanceIdx > 0) {
      if (!this.isAttached && this.scene && typeof this.scene.add === 'function') {
        this.scene.add(this.coreMesh);
        this.scene.add(this.innerMesh);
        this.isAttached = true;
      }
      this.coreMesh.instanceMatrix.needsUpdate = true;
      if (this.coreMesh.instanceColor) {
        this.coreMesh.instanceColor.needsUpdate = true;
      }
      this.innerMesh.instanceMatrix.needsUpdate = true;
      if (this.innerMesh.instanceColor) {
        this.innerMesh.instanceColor.needsUpdate = true;
      }
      this.coreMesh.visible = true;
      this.innerMesh.visible = true;
    } else {
      if (this.isAttached && this.scene && typeof this.scene.remove === 'function') {
        this.scene.remove(this.coreMesh);
        this.scene.remove(this.innerMesh);
        this.isAttached = false;
      }
      this.coreMesh.visible = false;
      this.innerMesh.visible = false;
    }
  }

  destroy() {
    if (this.isAttached && this.scene && typeof this.scene.remove === 'function') {
      this.scene.remove(this.coreMesh);
      this.scene.remove(this.innerMesh);
      this.isAttached = false;
    }
    if (this.coreMesh.geometry) {
      this.coreMesh.geometry.dispose();
    }
    if (this.coreMesh.material) {
      this.coreMesh.material.dispose();
    }
    if (this.innerMesh.geometry) {
      this.innerMesh.geometry.dispose();
    }
    if (this.innerMesh.material) {
      this.innerMesh.material.dispose();
    }
  }
}
