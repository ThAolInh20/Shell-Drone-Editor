// src/core/BaseDirector.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { HotkeyManager } from './HotkeyManager.js';
import { GizmoSystem } from '../editor/systems/GizmoSystem.js';

/**
 * BaseDirector provides shared functionality for editor-like directors.
 * It encapsulates common scene setup, camera controls, instanced mesh handling,
 * center visualizers, selection box UI, gizmo system, hotkey manager and event wiring.
 */
export class BaseDirector {
  constructor(sceneManager, cameraManager, renderer) {
    this.sceneManager = sceneManager;
    this.cameraManager = cameraManager;
    this.renderer = renderer;

    // Generic scratch variables used across directors.
    this.scratchVec1 = new THREE.Vector3();
    this.scratchVec2 = new THREE.Vector3();
    this.scratchVec3 = new THREE.Vector3();
    this.scratchVec4 = new THREE.Vector3();
    this.scratchVecCenter = new THREE.Vector3();
    this.scratchVecPosA = new THREE.Vector3();
    this.scratchVecPosB = new THREE.Vector3();
    this.scratchColor1 = new THREE.Color();
    this.scratchColor2 = new THREE.Color();
    this.scratchColor3 = new THREE.Color();
    this.scratchDummy = new THREE.Object3D();
    this.defaultCenter = new THREE.Vector3(0, 20, 0);
  }

  /** Subclasses should override to provide the hotkey context string. */
  getHotkeyContext() {
    return '';
  }

  /** Initialise common components after the subclass has created its state. */
  initCommon() {
    // Camera controls
    this.controls = new OrbitControls(
      this.cameraManager.instance,
      this.renderer.instance.domElement
    );
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.target.set(0, 50, 0);

    // Instanced mesh for drones
    this.initInstancedMesh();

    // Center visualisers (sphere + pivot lines)
    this.initCenterVisualizers();

    // Gizmo system – expects this.state to be defined by subclass.
    this.gizmoSystem = new GizmoSystem(
      this.sceneManager.instance,
      this.cameraManager.instance,
      this.renderer.instance.domElement,
      this.controls,
      this.state
    );

    // React to state changes.
    if (this.state && typeof this.state.subscribe === 'function') {
      this.state.subscribe(() => this.updateMeshFromState());
    }

    // Raycaster and mouse for click handling.
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Selection box DOM element.
    this.selectionBoxEl = document.createElement('div');
    this.selectionBoxEl.style.position = 'absolute';
    this.selectionBoxEl.style.border = '1.5px dashed #3a86ff';
    this.selectionBoxEl.style.backgroundColor = 'rgba(58, 134, 255, 0.15)';
    this.selectionBoxEl.style.borderRadius = '2px';
    this.selectionBoxEl.style.boxShadow = '0 0 8px rgba(58, 134, 255, 0.4)';
    this.selectionBoxEl.style.pointerEvents = 'none';
    this.selectionBoxEl.style.zIndex = '99999';
    this.selectionBoxEl.style.display = 'none';
    document.body.appendChild(this.selectionBoxEl);
    this.isSelectingBox = false;

    // Hotkey manager with context derived from subclass.
    this.hotkeyManager = new HotkeyManager();
    const ctx = this.getHotkeyContext();
    if (ctx) this.hotkeyManager.setActiveContext(ctx);

    // Subclass can add additional event listeners.
    if (typeof this.setupEvents === 'function') {
      this.setupEvents();
    }
  }

  /** Initialise the instanced mesh used for drone rendering. */
  initInstancedMesh() {
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
    this.instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(10000 * 3),
      3
    );
    this.sceneManager.instance.add(this.instancedMesh);
  }

  /** Initialise centre helper sphere and pivot line visualisers. */
  initCenterVisualizers() {
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

  /** Update instanced mesh from current state – subclasses may extend. */
  updateMeshFromState() {
    if (!this.state) return;
    const positions = this.state.positions;
    this.instancedMesh.count = positions.length;

    const dummy = this.scratchDummy;
    const color = this.scratchColor1;

    for (let i = 0; i < positions.length; i++) {
      dummy.position.copy(positions[i]);
      dummy.scale.set(1, 1, 1);
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
  }
}
