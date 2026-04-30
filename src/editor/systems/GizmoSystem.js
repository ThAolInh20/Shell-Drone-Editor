import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

export class GizmoSystem {
  constructor(scene, camera, domElement, orbitControls, state) {
    this.scene = scene;
    this.camera = camera;
    this.domElement = domElement;
    this.orbitControls = orbitControls;
    this.state = state;

    // TransformControls initialization
    this.transformControl = new TransformControls(this.camera, this.domElement);
    this.transformControl.addEventListener('dragging-changed', (event) => {
      this.orbitControls.enabled = !event.value;
      if (!event.value) {
        // Drag ended, save state
        this.applyProxyTransformsToState();
        this.state.saveStateToHistory();
      }
    });

    this.transformControl.addEventListener('change', () => {
      if (this.transformControl.getMode() === 'scale') {
        // Prevent proxy meshes from visually stretching when scaling the group
        const invScale = new THREE.Vector3(
          1 / (this.proxyGroup.scale.x || 1),
          1 / (this.proxyGroup.scale.y || 1),
          1 / (this.proxyGroup.scale.z || 1)
        );
        for (const mesh of this.proxyGroup.children) {
          mesh.scale.copy(invScale);
        }
      }
    });

    this.scene.add(this.transformControl.getHelper());

    // Group to hold proxy objects for selected particles
    this.proxyGroup = new THREE.Group();
    this.scene.add(this.proxyGroup);
    
    // Geometry for proxies
    this.proxyGeometry = new THREE.SphereGeometry(1.2, 16, 16);
    this.proxyMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x3a86ff, 
      wireframe: true,
      depthTest: false,
      transparent: true,
      opacity: 0.8
    });

    this.proxyMeshes = new Map(); // instanceId -> Mesh

    this.state.subscribe(() => this.onStateChange());
  }

  isHovering() {
    return this.transformControl.dragging || this.transformControl.axis !== null;
  }

  setMode(mode) {
    // mode: 'translate', 'rotate', 'scale'
    this.transformControl.setMode(mode);
  }

  onStateChange() {
    const selected = Array.from(this.state.selectedIndices);
    
    // If selection is empty, detach
    if (selected.length === 0) {
      this.transformControl.detach();
      this.clearProxies();
      return;
    }

    // Rebuild proxies if selection changed (simple check: length mismatch or missing key)
    let needsRebuild = selected.length !== this.proxyMeshes.size;
    if (!needsRebuild) {
      for (const id of selected) {
        if (!this.proxyMeshes.has(id)) {
          needsRebuild = true;
          break;
        }
      }
    }

    if (needsRebuild) {
      this.clearProxies();
      
      // Calculate bounding box center to place the group pivot
      const center = new THREE.Vector3();
      for (const id of selected) {
        center.add(this.state.positions[id]);
      }
      center.divideScalar(selected.length);
      
      this.proxyGroup.position.copy(center);
      this.proxyGroup.rotation.set(0, 0, 0);
      this.proxyGroup.scale.set(1, 1, 1);
      this.proxyGroup.updateMatrixWorld();

      // Create proxies relative to group center
      for (const id of selected) {
        const mesh = new THREE.Mesh(this.proxyGeometry, this.proxyMaterial);
        const worldPos = this.state.positions[id];
        
        // Local position relative to group
        mesh.position.copy(worldPos).sub(center);
        
        this.proxyGroup.add(mesh);
        this.proxyMeshes.set(id, mesh);
      }
      
      this.transformControl.attach(this.proxyGroup);
    }
  }

  clearProxies() {
    while (this.proxyGroup.children.length > 0) {
      this.proxyGroup.remove(this.proxyGroup.children[0]);
    }
    this.proxyMeshes.clear();
  }

  applyProxyTransformsToState() {
    // When dragging ends, apply the world positions of proxies back to state
    this.proxyGroup.updateMatrixWorld(true);
    
    const targetPos = new THREE.Vector3();
    const updates = [];
    
    for (const [id, mesh] of this.proxyMeshes.entries()) {
      mesh.getWorldPosition(targetPos);
      updates.push({ index: id, pos: targetPos.clone() });
    }
    this.state.updatePositions(updates);
  }
}
