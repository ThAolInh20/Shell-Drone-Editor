import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FormationState } from './FormationState.js';
import { GizmoSystem } from '../editor/systems/GizmoSystem.js';
import { setupFormationUI } from './ui/FormationUI.js';

export class FormationDirector {
  constructor(sceneManager, cameraManager, renderer) {
    this.sceneManager = sceneManager;
    this.cameraManager = cameraManager;
    this.renderer = renderer;

    this.state = new FormationState();
    
    // Editor UI Setup
    setupFormationUI(this.state, this);

    // Camera controls
    this.controls = new OrbitControls(this.cameraManager.instance, this.renderer.instance.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.target.set(0, 50, 0);

    // Instanced rendering for performance
    this.initInstancedMesh();

    this.centerHelper = null;
    this.pivotLines = null;
    this.initCenterVisualizers();

    // Gizmo System for selecting and moving drones
    // We re-use GizmoSystem from the main editor, it just expects an object with {positions, selectedIndices, etc.}
    this.gizmoSystem = new GizmoSystem(
      this.sceneManager.instance,
      this.cameraManager.instance,
      this.renderer.instance.domElement,
      this.controls,
      this.state
    );

    // Listen to state changes to update the mesh
    this.state.subscribe(() => this.updateMeshFromState());
    
    // Raycaster for selection
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    this.setupEvents();
  }

  initInstancedMesh() {
    // Add visual aids
    const gridHelper = new THREE.GridHelper(500, 50, 0x444444, 0x222222);
    this.sceneManager.instance.add(gridHelper);

    const axesHelper = new THREE.AxesHelper(100);
    axesHelper.position.y = 0.1;
    this.sceneManager.instance.add(axesHelper);

    const geometry = new THREE.SphereGeometry(1, 16, 16);
    geometry.computeBoundingSphere();
    geometry.boundingSphere.radius = 999999; 

    const material = new THREE.MeshBasicMaterial({ 
      color: 0xffffff,
      toneMapped: false
    });
    
    this.instancedMesh = new THREE.InstancedMesh(geometry, material, 10000);
    this.instancedMesh.frustumCulled = false;
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.instancedMesh.count = 0;
    
    this.instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(10000 * 3), 3);
    
    this.sceneManager.instance.add(this.instancedMesh);
  }

  initCenterVisualizers() {
    // 1. Center Point Helper (Sphere)
    const sphereGeo = new THREE.SphereGeometry(1.5, 16, 16);
    const sphereMat = new THREE.MeshBasicMaterial({ 
      color: 0xffaa00, 
      toneMapped: false,
      transparent: true,
      opacity: 0.8
    });
    this.centerHelper = new THREE.Mesh(sphereGeo, sphereMat);
    this.centerHelper.visible = false;
    this.sceneManager.instance.add(this.centerHelper);

    // 2. Pivot Connection Lines
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.3,
      depthWrite: false
    });
    const lineGeo = new THREE.BufferGeometry();
    this.pivotLines = new THREE.LineSegments(lineGeo, lineMat);
    this.pivotLines.visible = false;
    this.sceneManager.instance.add(this.pivotLines);
  }

  setupEvents() {
    window.addEventListener('pointerdown', this.onPointerDown.bind(this));
    window.addEventListener('keydown', this.onKeyDown.bind(this));
  }

  onPointerDown(event) {
    if (event.button !== 0) return; 
    if (event.target !== this.renderer.instance.domElement) return; 
    if (this.gizmoSystem.isHovering()) return; 

    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.cameraManager.instance);

    // Raycast centerHelper if visible
    const centerIntersects = this.state.showCenter ? this.raycaster.intersectObject(this.centerHelper) : [];
    if (centerIntersects.length > 0) {
      this.state.selectCenter();
      return;
    }

    const intersects = this.raycaster.intersectObject(this.instancedMesh);

    if (intersects.length > 0) {
      const instanceId = intersects[0].instanceId;
      const multiSelect = event.shiftKey || event.ctrlKey;
      
      const selectGroupUI = document.getElementById('ui-select-group');
      if (selectGroupUI && selectGroupUI.checked) {
        const groupName = this.state.particleGroups[instanceId];
        if (groupName) {
          let groupHasSelection = false;
          for (const idx of this.state.selectedIndices) {
            if (this.state.particleGroups[idx] === groupName) {
              groupHasSelection = true;
              break;
            }
          }
          if (groupHasSelection) {
            if (multiSelect && this.state.selectedIndices.has(instanceId)) {
              this.state.deselect(instanceId);
            } else {
              this.state.select(instanceId, multiSelect);
            }
          } else {
            this.state.selectGroup(groupName, multiSelect);
          }
        }
      } else {
        if (multiSelect && this.state.selectedIndices.has(instanceId)) {
          this.state.deselect(instanceId);
        } else {
          this.state.select(instanceId, multiSelect);
        }
      }
    } else {
      this.state.clearSelection();
    }
  }

  onKeyDown(event) {
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT') return;

    const isZ = event.key.toLowerCase() === 'z' || event.code === 'KeyZ';
    const isY = event.key.toLowerCase() === 'y' || event.code === 'KeyY';
    const isD = event.key.toLowerCase() === 'd' || event.code === 'KeyD';
    const isC = event.key.toLowerCase() === 'c' || event.code === 'KeyC';
    const isV = event.key.toLowerCase() === 'v' || event.code === 'KeyV';

    if (event.ctrlKey && isZ) {
      event.preventDefault();
      this.state.undo();
    }
    if (event.ctrlKey && isY) {
      event.preventDefault();
      this.state.redo();
    }
    if (event.ctrlKey && isD) {
      event.preventDefault();
      this.state.duplicateSelected();
    }
    if (event.shiftKey && isC) {
      event.preventDefault();
      this.state.copyToClipboard();
    }
    if (event.shiftKey && isV) {
      event.preventDefault();
      this.state.pasteFromClipboard();
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      this.state.deleteSelected();
    }
  }

  updateMeshFromState() {
    const positions = this.state.positions;
    this.instancedMesh.count = positions.length;

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    for (let i = 0; i < positions.length; i++) {
      dummy.position.copy(positions[i]);
      dummy.scale.set(1, 1, 1);
      
      if (this.state.selectedIndices.has(i)) {
        dummy.scale.set(0.01, 0.01, 0.01); 
      }
      
      dummy.updateMatrix();
      this.instancedMesh.setMatrixAt(i, dummy.matrix);
      
      if (this.state.colors && this.state.colors[i]) {
        this.instancedMesh.setColorAt(i, this.state.colors[i]);
      } else {
        color.setHex(0xffffff);
        this.instancedMesh.setColorAt(i, color);
      }
    }

    this.instancedMesh.instanceMatrix.needsUpdate = true;
    if (this.instancedMesh.instanceColor) {
        this.instancedMesh.instanceColor.needsUpdate = true;
    }
    
    this.instancedMesh.computeBoundingSphere();

    // Update center visualizer objects
    if (this.state.center && this.centerHelper) {
      this.centerHelper.position.copy(this.state.center);
      this.centerHelper.visible = !!this.state.showCenter && !this.state.isCenterSelected;

      if (this.state.showPivotLines && positions.length > 0) {
        const linePoints = [];
        const centerPos = this.state.center;
        for (let i = 0; i < positions.length; i++) {
          linePoints.push(positions[i].clone());
          linePoints.push(centerPos.clone());
        }
        this.pivotLines.geometry.setFromPoints(linePoints);
        this.pivotLines.visible = true;
      } else {
        this.pivotLines.visible = false;
      }
    } else if (this.centerHelper) {
      this.centerHelper.visible = false;
      this.pivotLines.visible = false;
    }
  }

  update(deltaTime) {
    this.controls.update();
    // No timeline interpolation needed!
  }
}
