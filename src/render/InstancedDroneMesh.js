import * as THREE from 'three';

export class InstancedDroneMesh {
    constructor(maxDrones = 2000) {
        this.maxDrones = maxDrones;
        this.count = 0;
        
        // Use a low-poly sphere (Icosahedron)
        const geometry = new THREE.IcosahedronGeometry(1.5, 1);
        
        // Basic material with additive blending for glow
        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        // Use InstancedMesh instead of Points
        this.mesh = new THREE.InstancedMesh(geometry, material, this.maxDrones);
        this.mesh.frustumCulled = false; // Prevent clipping
        
        // Hide all initially by setting far away
        const dummy = new THREE.Object3D();
        dummy.position.set(0, -1000, 0);
        dummy.updateMatrix();
        
        for (let i = 0; i < this.maxDrones; i++) {
            this.mesh.setMatrixAt(i, dummy.matrix);
            this.mesh.setColorAt(i, new THREE.Color(1, 1, 1));
        }
        
        this.mesh.instanceMatrix.needsUpdate = true;
        if (this.mesh.instanceColor) {
            this.mesh.instanceColor.needsUpdate = true;
        }
        
        // Keep a temporary object for matrix math
        this.dummy = new THREE.Object3D();
    }

    setCount(count) {
        this.count = Math.min(count, this.maxDrones);
        this.mesh.count = this.count;
    }

    updateInstance(index, position, rotation, scale, color) {
        // Build matrix
        this.dummy.position.copy(position);
        
        if (rotation) {
            this.dummy.rotation.copy(rotation);
        } else {
            this.dummy.rotation.set(0, 0, 0);
        }
        
        if (scale) {
            this.dummy.scale.copy(scale);
        } else {
            this.dummy.scale.set(1, 1, 1);
        }
        
        this.dummy.updateMatrix();
        
        this.mesh.setMatrixAt(index, this.dummy.matrix);
        this.mesh.setColorAt(index, color);
    }

    updateBuffers() {
        this.mesh.instanceMatrix.needsUpdate = true;
        if (this.mesh.instanceColor) {
            this.mesh.instanceColor.needsUpdate = true;
        }
    }
}
