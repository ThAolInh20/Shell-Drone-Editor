import * as THREE from 'three';

export class InstancedShellRenderer {
  constructor(scene, maxShells = 300) {
    this.scene = scene;
    this.maxShells = maxShells;

    // 1. Core InstancedMesh
    const coreGeometry = new THREE.SphereGeometry(
      0.6,
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
      this.maxShells
    );
    this.coreMesh.frustumCulled = false;
    this.scene.add(this.coreMesh);

    // 2. Halo Points System
    this.maxHaloPoints = this.maxShells * 10;
    this.haloGeometry = new THREE.BufferGeometry();
    this.haloPositions = new Float32Array(this.maxHaloPoints * 3);
    this.haloColors = new Float32Array(this.maxHaloPoints * 3);

    this.haloGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(
        this.haloPositions,
        3
      )
    );
    this.haloGeometry.setAttribute(
      'color',
      new THREE.BufferAttribute(
        this.haloColors,
        3
      )
    );

    const haloMaterial = new THREE.PointsMaterial({
      size: 0.95,
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false
    });
    this.haloPoints = new THREE.Points(
      this.haloGeometry,
      haloMaterial
    );
    this.haloPoints.frustumCulled = false;
    this.scene.add(this.haloPoints);

    // Helper object for matrix calculations
    this.dummy = new THREE.Object3D();

    // Hide all initially
    this.dummy.position.set(
      0,
      -1000,
      0
    );
    this.dummy.updateMatrix();
    const initColor = new THREE.Color(
      0,
      0,
      0
    );
    for (let i = 0; i < this.maxShells; i++) {
      this.coreMesh.setMatrixAt(
        i,
        this.dummy.matrix
      );
      this.coreMesh.setColorAt(
        i,
        initColor
      );
    }
    this.coreMesh.instanceMatrix.needsUpdate = true;
    if (this.coreMesh.instanceColor) {
      this.coreMesh.instanceColor.needsUpdate = true;
    }
  }

  update(shells) {
    const count = Math.min(
      shells.length,
      this.maxShells
    );
    this.coreMesh.count = count;

    let haloIdx = 0;

    for (let i = 0; i < count; i++) {
      const shell = shells[i];

      // Update core matrix
      this.dummy.position.copy(shell.mesh.position);
      this.dummy.scale.copy(shell.mesh.scale);
      this.dummy.updateMatrix();
      this.coreMesh.setMatrixAt(
        i,
        this.dummy.matrix
      );

      // Get color and opacity
      const opacity = shell.coreMesh.material
        ? shell.coreMesh.material.opacity
        : 1.0;
      const coreColor = shell.color.clone().multiplyScalar(opacity);
      this.coreMesh.setColorAt(
        i,
        coreColor
      );

      // Update halo points (10 points per shell)
      const haloOpacity = shell.haloPoints.material
        ? shell.haloPoints.material.opacity
        : 0.8;
      
      const localPos = shell.haloPoints.geometry.attributes.position.array;
      const localColors = shell.haloPoints.geometry.attributes.color.array;

      for (let j = 0; j < 10; j++) {
        // Transform local position to world position
        const localX = localPos[j * 3];
        const localY = localPos[j * 3 + 1];
        const localZ = localPos[j * 3 + 2];

        // Apply scale and add position
        const worldX = localX * shell.mesh.scale.x + shell.mesh.position.x;
        const worldY = localY * shell.mesh.scale.y + shell.mesh.position.y;
        const worldZ = localZ * shell.mesh.scale.z + shell.mesh.position.z;

        this.haloPositions[haloIdx * 3] = worldX;
        this.haloPositions[haloIdx * 3 + 1] = worldY;
        this.haloPositions[haloIdx * 3 + 2] = worldZ;

        // Multiply local color by opacity
        this.haloColors[haloIdx * 3] = localColors[j * 3] * haloOpacity;
        this.haloColors[haloIdx * 3 + 1] = localColors[j * 3 + 1] * haloOpacity;
        this.haloColors[haloIdx * 3 + 2] = localColors[j * 3 + 2] * haloOpacity;

        haloIdx++;
      }
    }

    // Hide remaining instances
    for (let i = count; i < this.maxShells; i++) {
      this.dummy.position.set(
        0,
        -1000,
        0
      );
      this.dummy.updateMatrix();
      this.coreMesh.setMatrixAt(
        i,
        this.dummy.matrix
      );
    }

    // Fill the rest of halo buffers with 0s/offscreen
    const remainingHalos = this.maxHaloPoints - haloIdx;
    if (remainingHalos > 0) {
      this.haloPositions.fill(
        0,
        haloIdx * 3
      );
      this.haloColors.fill(
        0,
        haloIdx * 3
      );
    }

    // Mark buffers for update
    this.coreMesh.instanceMatrix.needsUpdate = true;
    if (this.coreMesh.instanceColor) {
      this.coreMesh.instanceColor.needsUpdate = true;
    }

    if (count > 0) {
      this.haloGeometry.getAttribute('position').needsUpdate = true;
      this.haloGeometry.getAttribute('color').needsUpdate = true;
      this.haloPoints.geometry.setDrawRange(
        0,
        haloIdx
      );
      this.haloPoints.visible = true;
    } else {
      this.haloPoints.visible = false;
    }
  }

  destroy() {
    this.scene.remove(this.coreMesh);
    this.scene.remove(this.haloPoints);
    if (this.coreMesh.geometry) {
      this.coreMesh.geometry.dispose();
    }
    if (this.coreMesh.material) {
      this.coreMesh.material.dispose();
    }
    if (this.haloGeometry) {
      this.haloGeometry.dispose();
    }
    if (this.haloPoints.material) {
      this.haloPoints.material.dispose();
    }
  }
}
