import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { t } from '../config/lang/i18n.js';

import { FormationState } from './FormationState.js';
import { GizmoSystem } from '../editor/systems/GizmoSystem.js';
import { setupFormationUI } from './ui/FormationUI.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { DroneFormationFactory } from '../factories/DroneFormationFactory.js';

export class FormationDirector {
  constructor(sceneManager, cameraManager, renderer) {
    this.sceneManager = sceneManager;
    this.cameraManager = cameraManager;
    this.renderer = renderer;

    // Performance Scratch Variables (GC prevention)
    this.scratchVec1 = new THREE.Vector3();
    this.scratchDummy = new THREE.Object3D();
    this.scratchColor = new THREE.Color();

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
    
    this.isCtrlPressed = false;
    this.setupEvents();

    // Hologram Ghost Guide fields
    this.ghostModel = null;
    this.ghostMeshes = [];

    // 2D Reference Image fields
    this.refImageMesh = null;
    this.refImageTexture = null;

    // Bezier Curve helpers
    this.bezierHelpers = [];
    this.bezierLine = null;
    this.initBezierHelpers();
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
    this.renderer.instance.domElement.addEventListener('pointerdown', this.onPointerDown.bind(this));
    this.renderer.instance.domElement.addEventListener('contextmenu', this.onContextMenu.bind(this));
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));
    window.addEventListener('blur', this.onBlur.bind(this));

    // Synchronize isCtrlPressed state via pointer events
    this.handlePointer = (e) => {
      const ctrl = e.ctrlKey;
      if (ctrl !== this.isCtrlPressed) {
        this.isCtrlPressed = ctrl;
        this.updateBezierGizmoVisibility();
      }
    };
    window.addEventListener('pointerdown', this.handlePointer, true);
    window.addEventListener('pointerup', this.handlePointer, true);
    window.addEventListener('pointermove', this.handlePointer, true);
  }

  onPointerDown(event) {
    if (event.button !== 0) return; // Only left click
    if (this.gizmoSystem.isHovering()) return; // Don't select if interacting with Gizmo
    if (this.bezierTransformControl && (this.bezierTransformControl.dragging || this.bezierTransformControl.axis !== null)) return;

    const startX = event.clientX;
    const startY = event.clientY;

    const onPointerUp = (upEvent) => {
      window.removeEventListener('pointerup', onPointerUp);

      const dx = upEvent.clientX - startX;
      const dy = upEvent.clientY - startY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Only handle selection/placement if it's a true click (dragged < 5px)
      if (dist < 5) {
        this.handleCanvasClick(upEvent);
      }
    };

    window.addEventListener('pointerup', onPointerUp);
  }

  handleCanvasClick(event) {
    // Calculate mouse position in normalized device coordinates (-1 to +1)
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.cameraManager.instance);

    // 0. Bezier Control Points click detection
    if (this.state.isBezierEditActive) {
      const bezierIntersects = this.raycaster.intersectObjects(this.bezierHelpers);
      if (bezierIntersects.length > 0) {
        const hitHelper = bezierIntersects[0].object;
        this.activeBezierHelper = hitHelper;
        this.bezierTransformControl.attach(hitHelper);
        this.updateBezierGizmoVisibility();
        return; // Dragging handle, bypass normal selection
      }
    }

    // 1. If Click-to-Place Snapping is active
    if (this.state.isClickToPlaceActive && this.state.guideMode !== 'none') {
      const targets = [];
      if (this.state.guideMode === 'hologram' && this.ghostMeshes.length > 0) {
        targets.push(...this.ghostMeshes);
      }
      if (this.state.guideMode === 'reference' && this.refImageMesh) {
        targets.push(this.refImageMesh);
      }

      if (targets.length > 0) {
        const intersects = this.raycaster.intersectObjects(targets);
        if (intersects.length > 0) {
          // Place new drone snapped to surface
          const snapPoint = intersects[0].point.clone();
          const defaultColor = new THREE.Color(0xffffff);
          
          // Determine if we snapped to the 3D model or 2D image
          const snappedMesh = intersects[0].object;
          const groupName = snappedMesh === this.refImageMesh ? "REF_IMAGE_GUIDE" : "GHOST_GUIDE";

          this.state.positions.push(snapPoint);
          this.state.colors.push(defaultColor);
          this.state.particleGroups.push(groupName);

          // Select the newly added drone
          const newIndex = this.state.positions.length - 1;
          this.state.select(newIndex);

          // Record history and notify
          this.state.saveStateToHistory();
          this.state.notify();
          return; // Drone successfully placed, bypass standard selection
        }
      }
    }

    // 2. Standard drone / center point selection logic
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
      const multiSelect = event.shiftKey || event.ctrlKey;
      if (!multiSelect) {
        this.state.clearSelection();
      }
    }
  }

  onKeyDown(event) {
    if (event.key === 'Control') {
      this.isCtrlPressed = true;
      this.updateBezierGizmoVisibility();
    }
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT') return;

    const isZ = event.key.toLowerCase() === 'z' || event.code === 'KeyZ';
    const isY = event.key.toLowerCase() === 'y' || event.code === 'KeyY';
    const isD = event.key.toLowerCase() === 'd' || event.code === 'KeyD';
    const isC = event.key.toLowerCase() === 'c' || event.code === 'KeyC';
    const isV = event.key.toLowerCase() === 'v' || event.code === 'KeyV';
    const isS = event.key.toLowerCase() === 's' || event.code === 'KeyS';

    if (event.shiftKey && isS) {
      event.preventDefault();
      this.saveDirectly();
    }
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

  onKeyUp(event) {
    if (event.key === 'Control') {
      this.isCtrlPressed = false;
      this.updateBezierGizmoVisibility();
    }
  }

  onBlur() {
    this.isCtrlPressed = false;
    this.updateBezierGizmoVisibility();
  }

  async saveDirectly() {
    const drones = [];
    for (let i = 0; i < this.state.positions.length; i++) {
      const pos = this.state.positions[i];
      const col = this.state.colors[i] || new THREE.Color(0xffffff);
      const hexStr = col.getHexString();
      const r = parseInt(hexStr.substring(0, 2), 16);
      const g = parseInt(hexStr.substring(2, 4), 16);
      const b = parseInt(hexStr.substring(4, 6), 16);
      const groupName = this.state.particleGroups[i] || 'Default';
      drones.push({
        x: parseFloat(pos.x.toFixed(2)),
        y: parseFloat(pos.y.toFixed(2)),
        z: parseFloat(pos.z.toFixed(2)),
        r: r,
        g: g,
        b: b,
        group: groupName
      });
    }

    const exportObject = {
      drones,
      ghostModelConfig: {
        position: { x: this.state.ghostModelConfig.position.x, y: this.state.ghostModelConfig.position.y, z: this.state.ghostModelConfig.position.z },
        scale: this.state.ghostModelConfig.scale,
        rotationY: this.state.ghostModelConfig.rotationY,
        opacity: this.state.ghostModelConfig.opacity,
        wireframe: this.state.ghostModelConfig.wireframe
      },
      referenceImageConfig: {
        url: this.state.referenceImageConfig.url,
        fileName: this.state.referenceImageConfig.fileName,
        position: { x: this.state.referenceImageConfig.position.x, y: this.state.referenceImageConfig.position.y, z: this.state.referenceImageConfig.position.z },
        scale: this.state.referenceImageConfig.scale,
        rotationY: this.state.referenceImageConfig.rotationY,
        opacity: this.state.referenceImageConfig.opacity,
        orientation: this.state.referenceImageConfig.orientation
      },
      bezierControlPoints: this.state.bezierControlPoints.map(p => ({ x: p.x, y: p.y, z: p.z }))
    };

    const content = JSON.stringify(exportObject, null, 2);

    if (window.electronAPI) {
      if (this.state.currentFilePath) {
        try {
          await window.electronAPI.saveFileAbsolute(this.state.currentFilePath, content);
          alert(t('editor.formationPanel.saveSuccessDirect', { filename: this.state.name }));
        } catch (err) {
          alert(t('editor.formationPanel.saveErrorDirect', { error: err.message }));
        }
      } else {
        // Save As
        try {
          const res = await window.electronAPI.saveFileDialog(content, `${this.state.name}.json`);
          if (res) {
            this.state.currentFilePath = res.filePath;
            this.state.name = res.filename.replace('.json', '');
            alert(t('editor.formationPanel.saveNewSuccess', { filename: res.filename }));
          }
        } catch (err) {
          alert(t('editor.formationPanel.saveNewError', { error: err.message }));
        }
      }
      return;
    }

    // Fallback to browser download if not in Electron
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(content);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", this.state.name + ".json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    alert(t('editor.formationPanel.exportSuccessBrowser', { filename: this.state.name }));
  }

  updateMeshFromState() {
    const positions = this.state.positions;
    this.instancedMesh.count = positions.length;

    const dummy = this.scratchDummy;
    const color = this.scratchColor;

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

    // Sync guide modes visibility
    if (this.ghostModel) {
      this.ghostModel.visible = (this.state.guideMode === 'hologram');
    }
    if (this.refImageMesh) {
      this.refImageMesh.visible = (this.state.guideMode === 'reference');
    }

    // Sync reference image if state changed (e.g., Undo/Redo)
    if (this.refImageMesh && !this.state.referenceImageConfig.url) {
      this.clearReferenceImage();
    } else if (this.refImageMesh && this.state.referenceImageConfig.url) {
      this.updateReferenceImageTransform();
    }

    // Update center visualizer objects
    if (this.state.center && this.centerHelper) {
      this.centerHelper.position.copy(this.state.center);
      this.centerHelper.visible = !!this.state.showCenter && !this.state.isCenterSelected;

      if (this.state.showPivotLines && positions.length > 0) {
        if (!this._pivotLinePoints) this._pivotLinePoints = [];
        while (this._pivotLinePoints.length < positions.length * 2) {
          this._pivotLinePoints.push(new THREE.Vector3());
        }
        const centerPos = this.state.center;
        for (let i = 0; i < positions.length; i++) {
          this._pivotLinePoints[i * 2].copy(positions[i]);
          this._pivotLinePoints[i * 2 + 1].copy(centerPos);
        }
        if (this._pivotLinePoints.length > positions.length * 2) {
          this._pivotLinePoints.length = positions.length * 2;
        }
        this.pivotLines.geometry.setFromPoints(this._pivotLinePoints);
        this.pivotLines.visible = true;
      } else {
        this.pivotLines.visible = false;
      }
    } else if (this.centerHelper) {
      this.centerHelper.visible = false;
      this.pivotLines.visible = false;
    }

    // Update Bezier helper spheres and dashed line guide path
    const shapeTypeUI = document.getElementById('ui-shape-type');
    const isBezierActive = !!(this.state.isBezierEditActive && shapeTypeUI && shapeTypeUI.value === 'bezier');
    
    if (isBezierActive) {
      for (let i = 0; i < 3; i++) {
        const helper = this.bezierHelpers[i];
        if (helper) {
          helper.position.copy(this.state.bezierControlPoints[i]);
          helper.visible = true;
        }
      }
      
      if (this.bezierLine) {
        const p0 = this.state.bezierControlPoints[0];
        const p1 = this.state.bezierControlPoints[1];
        const p2 = this.state.bezierControlPoints[2];
        const curve = new THREE.QuadraticBezierCurve3(p0, p1, p2);
        const linePoints = curve.getPoints(50);
        this.bezierLine.geometry.setFromPoints(linePoints);
        this.bezierLine.computeLineDistances(); // Required for dashed rendering
        this.bezierLine.visible = true;
      }
    } else {
      for (let i = 0; i < 3; i++) {
        if (this.bezierHelpers[i]) this.bezierHelpers[i].visible = false;
      }
      if (this.bezierLine) this.bezierLine.visible = false;
      if (this.bezierTransformControl) {
        this.bezierTransformControl.detach();
        this.updateBezierGizmoVisibility();
      }
      this.activeBezierHelper = null;
    }
  }

  initBezierHelpers() {
    const colors = [0x00ffff, 0xffaa00, 0x00ff00]; // Cyan, Orange, Green
    const geometry = new THREE.SphereGeometry(1.2, 16, 16);
    
    for (let i = 0; i < 3; i++) {
      const material = new THREE.MeshBasicMaterial({
        color: colors[i],
        toneMapped: false,
        depthTest: false,
        transparent: true,
        opacity: 0.8
      });
      const helper = new THREE.Mesh(geometry, material);
      helper.visible = false;
      helper.userData = { isBezierHelper: true, controlPointIndex: i };
      this.sceneManager.instance.add(helper);
      this.bezierHelpers.push(helper);
    }

    const lineMat = new THREE.LineDashedMaterial({
      color: 0x00ffff,
      dashSize: 1.5,
      gapSize: 1.0,
      transparent: true,
      opacity: 0.5,
      depthWrite: false
    });
    const lineGeo = new THREE.BufferGeometry();
    this.bezierLine = new THREE.Line(lineGeo, lineMat);
    this.bezierLine.visible = false;
    this.sceneManager.instance.add(this.bezierLine);

    this.bezierTransformControl = new TransformControls(this.cameraManager.instance, this.renderer.instance.domElement);
    this.bezierTransformControl.setMode('translate');
    this.bezierTransformControl.addEventListener('dragging-changed', (event) => {
      this.controls.enabled = !event.value;
      if (!event.value) {
        this.state.saveStateToHistory();
      }
    });

    this.bezierTransformControl.addEventListener('change', () => {
      if (this.bezierTransformControl.dragging && this.activeBezierHelper) {
        const index = this.activeBezierHelper.userData.controlPointIndex;
        const newPos = new THREE.Vector3();
        this.activeBezierHelper.getWorldPosition(newPos);
        
        this.state.bezierControlPoints[index].copy(newPos);
        this.recalculateBezierDrones();
        this.state.notify();
      }
    });

    this.sceneManager.instance.add(this.bezierTransformControl.getHelper());
    this.activeBezierHelper = null;
    this.updateBezierGizmoVisibility();
  }

  updateBezierGizmoVisibility() {
    if (!this.bezierTransformControl) return;
    const isVisible = !this.isCtrlPressed && !!this.bezierTransformControl.object;
    this.bezierTransformControl.visible = isVisible;
    this.bezierTransformControl.enabled = isVisible;

    const helper = this.bezierTransformControl.getHelper ? this.bezierTransformControl.getHelper() : null;
    if (helper) {
      helper.visible = isVisible;
    }
  }

  recalculateBezierDrones() {
    const p0 = this.state.bezierControlPoints[0];
    const p1 = this.state.bezierControlPoints[1];
    const p2 = this.state.bezierControlPoints[2];
    
    const shapeTypeUI = document.getElementById('ui-shape-type');
    if (!shapeTypeUI || shapeTypeUI.value !== 'bezier') return;
    
    const targetUI = document.getElementById('ui-shape-target');
    const target = targetUI ? targetUI.value : 'new';
    
    let indicesToUpdate = [];
    if (target === 'new') {
      if (this.state.selectedIndices.size > 0) {
        indicesToUpdate = Array.from(this.state.selectedIndices);
      } else {
        indicesToUpdate = Array.from({ length: this.state.positions.length }, (_, i) => i);
      }
    } else {
      indicesToUpdate = Array.from(this.state.selectedIndices);
    }
    
    if (indicesToUpdate.length === 0) return;
    
    const count = indicesToUpdate.length;
    const curve = new THREE.QuadraticBezierCurve3(p0, p1, p2);
    const points = curve.getSpacedPoints(count - 1);
    
    const indicesSorted = [...indicesToUpdate].sort((a, b) => a - b);
    for (let i = 0; i < count; i++) {
      const idx = indicesSorted[i];
      if (this.state.positions[idx]) {
        this.state.positions[idx].copy(points[i]);
      }
    }
  }

  update(deltaTime) {
    this.controls.update();
  }

  loadGhostModel(file, callback) {
    const statusLabel = document.getElementById('ui-ghost-model-status');
    if (statusLabel) {
      statusLabel.textContent = t('editor.formationPanel.loadingModel');
      statusLabel.style.color = "#00ffff";
    }

    const filename = file.name;
    const extension = filename.split('.').pop().toLowerCase();
    const url = URL.createObjectURL(file);

    const onLoadSuccess = (model) => {
      this.clearGhostModel();

      // 1. Calculate Bounding Box for auto-scale and auto-centering
      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      box.getSize(size);
      const center = new THREE.Vector3();
      box.getCenter(center);

      const maxDim = Math.max(size.x, size.y, size.z);
      // Normalize model to a standard size of 50 units
      const normalizationScale = maxDim > 0 ? (50 / maxDim) : 1;

      // 2. Create wrapper group to align geometry center to local (0, 0, 0)
      const wrapper = new THREE.Group();
      
      // Offset the submodel to center it geometric-wise inside the wrapper
      model.position.copy(center).multiplyScalar(-1);
      
      // Normalize dimensions of the model
      model.scale.set(normalizationScale, normalizationScale, normalizationScale);
      
      wrapper.add(model);

      this.ghostModel = wrapper;
      this.sceneManager.instance.add(this.ghostModel);
      this.ghostModel.visible = (this.state.guideMode === 'hologram');

      this.applyHologramMaterial();
      this.updateGhostModelTransform();

      URL.revokeObjectURL(url);

      if (statusLabel) {
        let polyCount = 0;
        this.ghostModel.traverse((child) => {
          if (child.isMesh) {
            child.frustumCulled = false; // Prevent model from disappearing due to frustum culling
            if (child.geometry && child.geometry.index) {
              polyCount += child.geometry.index.count / 3;
            } else if (child.geometry && child.geometry.attributes.position) {
              polyCount += child.geometry.attributes.position.count / 3;
            }
          }
        });
        statusLabel.textContent = t('editor.formationPanel.modelLoaded', { name: `${filename} (~${Math.round(polyCount)} polys)` });
        statusLabel.style.color = "#4CAF50";
      }

      if (callback) callback();
    };

    const onLoadError = (error) => {
      console.error("Lỗi nạp mô hình Hologram:", error);
      URL.revokeObjectURL(url);
      if (statusLabel) {
        statusLabel.textContent = t('editor.formationPanel.loadModelError');
        statusLabel.style.color = "#ff4d4d";
      }
      alert(t('editor.formationPanel.loadModelErrorAlert'));
    };

    if (extension === 'gltf' || extension === 'glb') {
      const loader = new GLTFLoader();
      loader.load(url, (gltf) => {
        onLoadSuccess(gltf.scene);
      }, undefined, onLoadError);
    } else if (extension === 'obj') {
      const loader = new OBJLoader();
      loader.load(url, (obj) => {
        onLoadSuccess(obj);
      }, undefined, onLoadError);
    } else {
      onLoadError(new Error(t('editor.formationPanel.unsupportedFormat')));
    }
  }

  applyHologramMaterial() {
    if (!this.ghostModel) return;

    this.ghostMeshes = [];
    const config = this.state.ghostModelConfig;

    this.ghostModel.traverse((child) => {
      if (child.isMesh) {
        // Create a unique hologram material instance per mesh to ensure stability and isolate modifications
        const hologramMaterial = new THREE.MeshBasicMaterial({
          color: 0x00ffff, // Sleek cyan hologram glow
          transparent: true,
          opacity: config.opacity,
          wireframe: config.wireframe,
          depthWrite: false,
          side: THREE.DoubleSide
        });

        child.material = hologramMaterial;
        child.frustumCulled = false; // Prevent culling
        this.ghostMeshes.push(child);
      }
    });
  }

  updateGhostModelTransform() {
    if (!this.ghostModel) return;

    const config = this.state.ghostModelConfig;

    // Apply translation
    this.ghostModel.position.copy(config.position);

    // Apply scale
    this.ghostModel.scale.set(config.scale, config.scale, config.scale);

    // Apply Yaw (Y rotation)
    this.ghostModel.rotation.set(0, (config.rotationY * Math.PI) / 180, 0);

    // Update opacity and wireframe of children meshes, supporting both single materials and multi-material arrays
    this.ghostModel.traverse((child) => {
      if (child.isMesh && child.material) {
        const updateMat = (mat) => {
          mat.opacity = config.opacity;
          mat.wireframe = config.wireframe;
          mat.needsUpdate = true;
        };

        if (Array.isArray(child.material)) {
          child.material.forEach(updateMat);
        } else {
          updateMat(child.material);
        }
      }
    });
  }

  clearGhostModel() {
    if (this.ghostModel) {
      this.sceneManager.instance.remove(this.ghostModel);

      // Deep dispose geometries and materials to avoid memory leaks
      this.ghostModel.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });

      this.ghostModel = null;
    }
    this.ghostMeshes = [];

    const statusLabel = document.getElementById('ui-ghost-model-status');
    if (statusLabel) {
      statusLabel.textContent = "Chưa tải mô hình";
      statusLabel.style.color = "#888";
    }
  }

  loadReferenceImage(file, callback) {
    const statusLabel = document.getElementById('ui-ref-image-status');
    if (statusLabel) {
      statusLabel.textContent = "Đang tải ảnh...";
      statusLabel.style.color = "#00ffff";
    }

    const filename = file.name;
    const url = URL.createObjectURL(file);
    
    // Clear old image mesh and texture first (which resets old state info)
    this.clearReferenceImage();

    // Save NEW image info to state
    this.state.referenceImageConfig.url = url;
    this.state.referenceImageConfig.fileName = filename;

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      url,
      (texture) => {
        this.refImageTexture = texture;
        // Enable bilinear filtering for smoother preview
        texture.minFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;

        const aspect = texture.image.width / texture.image.height;

        // Use standard 1x1 geometry and scale the mesh to preserve aspect ratio
        const geometry = new THREE.PlaneGeometry(1, 1);
        const material = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          opacity: this.state.referenceImageConfig.opacity,
          side: THREE.DoubleSide,
          depthWrite: false
        });

        this.refImageMesh = new THREE.Mesh(geometry, material);
        this.refImageMesh.userData = { isReferenceImage: true, aspect: aspect };
        this.refImageMesh.visible = (this.state.guideMode === 'reference');
        
        this.sceneManager.instance.add(this.refImageMesh);
        this.updateReferenceImageTransform();

        if (statusLabel) {
          statusLabel.textContent = `Đã tải: ${filename}`;
          statusLabel.style.color = "#4CAF50";
        }

        if (callback) callback();
      },
      undefined,
      (error) => {
        console.error("Lỗi tải ảnh tham chiếu:", error);
        URL.revokeObjectURL(url);
        if (statusLabel) {
          statusLabel.textContent = "Lỗi tải ảnh!";
          statusLabel.style.color = "#ff4d4d";
        }
        alert("Lỗi tải ảnh tham chiếu! Vui lòng kiểm tra lại định dạng file.");
      }
    );
  }

  updateReferenceImageTransform() {
    if (!this.refImageMesh || !this.refImageTexture) return;

    const config = this.state.referenceImageConfig;
    const aspect = this.refImageMesh.userData.aspect || 1.0;

    // Apply translation
    this.refImageMesh.position.copy(config.position);

    // Apply scale (maintain aspect ratio)
    this.refImageMesh.scale.set(config.scale * aspect, config.scale, 1.0);

    // Apply rotation based on orientation
    if (config.orientation === 'horizontal') {
      // Lie flat on XZ plane: rotate -90 degrees around X axis
      this.refImageMesh.rotation.set(-Math.PI / 2, 0, (config.rotationY * Math.PI) / 180);
    } else {
      // Stand vertically on XY plane
      this.refImageMesh.rotation.set(0, (config.rotationY * Math.PI) / 180, 0);
    }

    // Update opacity
    if (this.refImageMesh.material) {
      this.refImageMesh.material.opacity = config.opacity;
      this.refImageMesh.material.needsUpdate = true;
    }
  }

  clearReferenceImage() {
    if (this.refImageMesh) {
      this.sceneManager.instance.remove(this.refImageMesh);

      if (this.refImageMesh.geometry) this.refImageMesh.geometry.dispose();
      if (this.refImageMesh.material) {
        this.refImageMesh.material.dispose();
      }
      this.refImageMesh = null;
    }

    if (this.refImageTexture) {
      this.refImageTexture.dispose();
      this.refImageTexture = null;
    }

    if (this.state.referenceImageConfig.url) {
      if (this.state.referenceImageConfig.url.startsWith('blob:')) {
        URL.revokeObjectURL(this.state.referenceImageConfig.url);
      }
      this.state.referenceImageConfig.url = null;
      this.state.referenceImageConfig.fileName = '';
    }
 
    const statusLabel = document.getElementById('ui-ref-image-status');
    if (statusLabel) {
      statusLabel.textContent = "Chưa tải ảnh nền";
      statusLabel.style.color = "#888";
    }
  }

  onContextMenu(event) {
    event.preventDefault();

    // Remove any existing context menu first
    document.getElementById('viewport-context-menu')?.remove();

    const hasSelection = this.state.selectedIndices.size > 0;

    const menu = document.createElement('div');
    menu.id = 'viewport-context-menu';
    menu.style.position = 'fixed';
    menu.style.left = `${event.clientX}px`;
    menu.style.top = `${event.clientY}px`;
    menu.style.background = '#1e1e1e';
    menu.style.border = '1px solid #3a86ff';
    menu.style.boxShadow = '0 5px 15px rgba(0,0,0,0.5)';
    menu.style.borderRadius = '4px';
    menu.style.padding = '5px 0';
    menu.style.zIndex = '999999';
    menu.style.display = 'flex';
    menu.style.flexDirection = 'column';
    menu.style.minWidth = '180px';

    // Prevent propagation
    menu.addEventListener('pointerdown', (e) => e.stopPropagation());
    menu.addEventListener('mousedown', (e) => e.stopPropagation());

    const item = document.createElement('div');
    item.textContent = hasSelection ? '✨ Apply Formation Shaping' : '➕ Add Formation Shaping';
    item.style.padding = '8px 15px';
    item.style.color = '#fff';
    item.style.cursor = 'pointer';
    item.style.fontSize = '12px';
    item.style.fontWeight = 'bold';
    item.style.transition = 'background 0.2s';

    item.addEventListener('mouseover', () => item.style.background = 'rgba(58, 134, 255, 0.2)');
    item.addEventListener('mouseout', () => item.style.background = 'transparent');

    item.addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('viewport-context-menu')?.remove();
      this.showFormationShapingModal(hasSelection);
    });

    menu.appendChild(item);

    // 2-Drone Anchor Shape Generator Option
    const selectedArray = Array.from(this.state.selectedIndices);
    if (selectedArray.length === 2) {
      const item2 = document.createElement('div');
      item2.textContent = '🧬 Sinh hình/khối nối 2 drone chọn...';
      item2.style.padding = '8px 15px';
      item2.style.color = '#00ffff';
      item2.style.cursor = 'pointer';
      item2.style.fontSize = '12px';
      item2.style.fontWeight = 'bold';
      item2.style.borderTop = '1px dashed #444';
      item2.style.transition = 'background 0.2s';

      item2.addEventListener('mouseover', () => item2.style.background = 'rgba(0, 255, 255, 0.2)');
      item2.addEventListener('mouseout', () => item2.style.background = 'transparent');

      item2.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('viewport-context-menu')?.remove();
        this.showDeformSpawnModal(selectedArray[0], selectedArray[1]);
      });

      menu.appendChild(item2);
    }

    // 3D Volume Spawner from Selected Group Option
    if (selectedArray.length > 0) {
      const item3 = document.createElement('div');
      item3.textContent = '🧬 Sinh khối 3D từ nhóm chọn...';
      item3.style.padding = '8px 15px';
      item3.style.color = '#ff00ff';
      item3.style.cursor = 'pointer';
      item3.style.fontSize = '12px';
      item3.style.fontWeight = 'bold';
      item3.style.borderTop = '1px dashed #444';
      item3.style.transition = 'background 0.2s';

      item3.addEventListener('mouseover', () => item3.style.background = 'rgba(255, 0, 255, 0.2)');
      item3.addEventListener('mouseout', () => item3.style.background = 'transparent');

      item3.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('viewport-context-menu')?.remove();
        this.showVolumeSpawnModal(selectedArray);
      });

      menu.appendChild(item3);
    }

    document.body.appendChild(menu);

    const dismiss = () => {
      document.getElementById('viewport-context-menu')?.remove();
      window.removeEventListener('click', dismiss);
      window.removeEventListener('contextmenu', dismiss);
    };

    setTimeout(() => {
      window.addEventListener('click', dismiss);
      window.addEventListener('contextmenu', dismiss);
    }, 50);
  }

  showDeformSpawnModal(idxA, idxB) {
    // Gather all existing groups
    const existingGroups = new Set();
    for (const g of this.state.particleGroups) {
      if (g) existingGroups.add(g);
    }

    const defaultGroupBase = 'Line_Group';
    const defaultGroupName = this.state.getUniqueGroupNameForPaste(defaultGroupBase, existingGroups);

    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(0, 0, 0, 0.7)';
    overlay.style.backdropFilter = 'blur(6px)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '999999';

    // Prevent propagation
    overlay.addEventListener('pointerdown', (e) => e.stopPropagation());
    overlay.addEventListener('mousedown', (e) => e.stopPropagation());
    overlay.addEventListener('click', (e) => e.stopPropagation());

    // Create modal container
    const modal = document.createElement('div');
    modal.style.background = '#1e1e1e';
    modal.style.border = '1px solid #00ffff';
    modal.style.boxShadow = '0 15px 30px rgba(0, 255, 255, 0.2)';
    modal.style.borderRadius = '8px';
    modal.style.padding = '20px';
    modal.style.width = '360px';
    modal.style.display = 'flex';
    modal.style.flexDirection = 'column';
    modal.style.gap = '12px';

    // Title
    const titleEl = document.createElement('div');
    titleEl.textContent = '🧬 Sinh hình/khối nối 2 drone chọn';
    titleEl.style.color = '#fff';
    titleEl.style.fontWeight = 'bold';
    titleEl.style.fontSize = '16px';
    titleEl.style.borderBottom = '1px solid #333';
    titleEl.style.paddingBottom = '8px';
    modal.appendChild(titleEl);

    // Form content
    let formHTML = `
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <label style="font-size: 12px; color: #ccc;">Loại hình thể</label>
          <select id="modal-spawn-shape" style="width: 160px; background: #222; color: #fff; border: 1px solid #444; padding: 4px; border-radius: 2px;">
            <option value="line">Đường nối (Line)</option>
            <option value="wireframe_box">Khung khối hộp (Wireframe Box)</option>
            <option value="solid_box">Khối đặc (Solid Box)</option>
          </select>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center;">
          <label style="font-size: 12px; color: #ccc;">Số lượng drone</label>
          <input type="number" id="modal-spawn-count" value="10" min="2" max="500" style="width: 160px; background: #222; color: #fff; border: 1px solid #444; padding: 4px; border-radius: 2px;" />
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center;">
          <label style="font-size: 12px; color: #ccc;">Tên nhóm mới</label>
          <input type="text" id="modal-spawn-group-name" value="${defaultGroupName}" style="width: 160px; background: #222; color: #fff; border: 1px solid #444; padding: 4px; border-radius: 2px;" />
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center;">
          <label style="font-size: 12px; color: #ccc;">Chuyển sắc Gradient</label>
          <input type="checkbox" id="modal-spawn-gradient" checked style="cursor: pointer;" />
        </div>
      </div>
    `;

    const formDiv = document.createElement('div');
    formDiv.innerHTML = formHTML;
    modal.appendChild(formDiv);

    // Bind dynamic update to pre-filled group name
    const shapeSelect = modal.querySelector('#modal-spawn-shape');
    const groupNameInput = modal.querySelector('#modal-spawn-group-name');

    shapeSelect.addEventListener('change', () => {
      const type = shapeSelect.value;
      const base = type === 'line' ? 'Line_Group' : 'Box_Group';
      groupNameInput.value = this.state.getUniqueGroupNameForPaste(base, existingGroups);
    });

    // Buttons Container
    const btns = document.createElement('div');
    btns.style.display = 'flex';
    btns.style.justifyContent = 'flex-end';
    btns.style.gap = '10px';
    btns.style.marginTop = '10px';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Huỷ';
    cancelBtn.style.background = '#333';
    cancelBtn.style.border = '1px solid #555';
    cancelBtn.style.color = '#ccc';
    cancelBtn.style.padding = '6px 12px';
    cancelBtn.style.borderRadius = '4px';
    cancelBtn.style.cursor = 'pointer';
    cancelBtn.style.fontSize = '12px';
    cancelBtn.addEventListener('click', () => overlay.remove());

    const okBtn = document.createElement('button');
    okBtn.textContent = 'Sinh ngay';
    okBtn.style.background = '#00ffff';
    okBtn.style.border = 'none';
    okBtn.style.color = '#111';
    okBtn.style.padding = '6px 12px';
    okBtn.style.borderRadius = '4px';
    okBtn.style.cursor = 'pointer';
    okBtn.style.fontSize = '12px';
    okBtn.style.fontWeight = 'bold';
    okBtn.style.boxShadow = '0 0 10px rgba(0, 255, 255, 0.4)';

    okBtn.addEventListener('click', () => {
      const count = parseInt(modal.querySelector('#modal-spawn-count').value, 10) || 10;
      const shapeType = shapeSelect.value;
      const newGroupName = groupNameInput.value.trim() || 'Spawned';
      const applyGradient = modal.querySelector('#modal-spawn-gradient').checked;

      const posA = this.state.positions[idxA];
      const posB = this.state.positions[idxB];
      const colorA = '#' + this.state.colors[idxA].getHexString();
      const colorB = '#' + this.state.colors[idxB].getHexString();

      // Retrieve generated shapes
      let generated;
      if (shapeType === 'line') {
        generated = DroneFormationFactory.generateLineBetweenPoints(posA, posB, colorA, applyGradient ? colorB : colorA, count);
      } else {
        generated = DroneFormationFactory.generateBoxBetweenPoints(posA, posB, colorA, applyGradient ? colorB : colorA, count, shapeType === 'solid_box');
      }

      const startIndex = this.state.positions.length;

      // Inject into active memory
      for (let i = 0; i < generated.positions.length; i++) {
        this.state.positions.push(generated.positions[i]);
        this.state.colors.push(generated.colors[i]);
        this.state.particleGroups.push(newGroupName);
      }

      // Automatically register a persistent line constraint if it is a 2-point line shape
      if (shapeType === 'line') {
        const intermediates = [];
        for (let i = 0; i < generated.positions.length; i++) {
          intermediates.push(startIndex + i);
        }
        if (!this.state.lineConstraints) {
          this.state.lineConstraints = [];
        }
        this.state.lineConstraints.push({
          id: 'line_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
          anchorA: idxA,
          anchorB: idxB,
          intermediates: intermediates
        });
      }

      // Auto-select the newly spawned group
      this.state.selectedIndices.clear();
      for (let i = startIndex; i < this.state.positions.length; i++) {
        this.state.selectedIndices.add(i);
      }

      // Set the active group to the newly spawned group so editing works immediately!
      if (typeof this.state.setActiveGroup === 'function') {
        this.state.setActiveGroup(newGroupName);
      } else {
        this.state.activeGroup = newGroupName;
      }

      // Update Center to midpoint of posA and posB
      const midpoint = new THREE.Vector3().addVectors(posA, posB).multiplyScalar(0.5);
      this.state.center.copy(midpoint);

      this.state.saveStateToHistory();
      this.state.notify();

      overlay.remove();
    });

    btns.appendChild(cancelBtn);
    btns.appendChild(okBtn);
    modal.appendChild(btns);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  showVolumeSpawnModal(selectedIndices) {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(0,0,0,0.7)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '9999';

    // Prevent propagation
    overlay.addEventListener('pointerdown', (e) => e.stopPropagation());
    overlay.addEventListener('mousedown', (e) => e.stopPropagation());

    // Modal
    const modal = document.createElement('div');
    modal.style.background = '#1e1e1e';
    modal.style.border = '1px solid #ff00ff'; // Neon Magenta theme
    modal.style.boxShadow = '0 15px 30px rgba(255, 0, 255, 0.2)';
    modal.style.borderRadius = '8px';
    modal.style.padding = '20px';
    modal.style.width = '360px';
    modal.style.display = 'flex';
    modal.style.flexDirection = 'column';
    modal.style.gap = '12px';

    // Title
    const titleEl = document.createElement('div');
    titleEl.textContent = '🧬 Sinh khối 3D từ nhóm chọn';
    titleEl.style.color = '#fff';
    titleEl.style.fontWeight = 'bold';
    titleEl.style.fontSize = '16px';
    titleEl.style.borderBottom = '1px solid #333';
    titleEl.style.paddingBottom = '8px';
    modal.appendChild(titleEl);

    // Form content
    let formHTML = `
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <label style="font-size: 12px; color: #ccc;">Loại khối 3D</label>
          <select id="modal-vol-type" style="width: 160px; background: #222; color: #fff; border: 1px solid #444; padding: 4px; border-radius: 2px;">
            <option value="cylinder">Trụ xoay tròn (Cylinder)</option>
            <option value="radial">Xếp vòng tròn cứng (Radial Circle)</option>
            <option value="cube">Khối tịnh tiến (Cube/Grid)</option>
          </select>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center;">
          <label style="font-size: 12px; color: #ccc;">Số lượng bản sao</label>
          <input type="number" id="modal-vol-copies" value="5" min="1" max="100" style="width: 160px; background: #222; color: #fff; border: 1px solid #444; padding: 4px; border-radius: 2px;" />
        </div>

        <!-- Dynamic Cylinder Section -->
        <div id="section-cylinder" style="display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="font-size: 12px; color: #ccc;">Góc xoay tối đa (°)</label>
            <input type="number" id="modal-vol-angle" value="360" min="1" max="360" style="width: 160px; background: #222; color: #fff; border: 1px solid #444; padding: 4px; border-radius: 2px;" />
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="font-size: 12px; color: #ccc;">Trụ xoắn Y (Spiral offset)</label>
            <input type="number" id="modal-vol-spiral" value="0" step="0.5" style="width: 160px; background: #222; color: #fff; border: 1px solid #444; padding: 4px; border-radius: 2px;" />
          </div>
        </div>

        <!-- Dynamic Radial Section -->
        <div id="section-radial" style="display: none; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="font-size: 12px; color: #ccc;">Bán kính R (0 = Tự động)</label>
            <input type="number" id="modal-vol-radius" value="0" min="0" max="500" style="width: 160px; background: #222; color: #fff; border: 1px solid #444; padding: 4px; border-radius: 2px;" />
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="font-size: 12px; color: #ccc;">Xoay theo vòng tròn</label>
            <input type="checkbox" id="modal-vol-rotateout" checked style="cursor: pointer;" />
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="font-size: 12px; color: #ccc;">Góc xoay tối đa (°)</label>
            <input type="number" id="modal-vol-radial-angle" value="360" min="1" max="360" style="width: 160px; background: #222; color: #fff; border: 1px solid #444; padding: 4px; border-radius: 2px;" />
          </div>
        </div>

        <!-- Dynamic Cube Section -->
        <div id="section-cube" style="display: none; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="font-size: 12px; color: #ccc;">Offset X (m)</label>
            <input type="number" id="modal-vol-offsetx" value="0" step="0.5" style="width: 160px; background: #222; color: #fff; border: 1px solid #444; padding: 4px; border-radius: 2px;" />
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="font-size: 12px; color: #ccc;">Offset Y (m)</label>
            <input type="number" id="modal-vol-offsety" value="5" step="0.5" style="width: 160px; background: #222; color: #fff; border: 1px solid #444; padding: 4px; border-radius: 2px;" />
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="font-size: 12px; color: #ccc;">Offset Z (m)</label>
            <input type="number" id="modal-vol-offsetz" value="0" step="0.5" style="width: 160px; background: #222; color: #fff; border: 1px solid #444; padding: 4px; border-radius: 2px;" />
          </div>
        </div>
      </div>
    `;

    const formDiv = document.createElement('div');
    formDiv.innerHTML = formHTML;
    modal.appendChild(formDiv);

    const typeSelect = modal.querySelector('#modal-vol-type');
    const secCylinder = modal.querySelector('#section-cylinder');
    const secRadial = modal.querySelector('#section-radial');
    const secCube = modal.querySelector('#section-cube');

    typeSelect.addEventListener('change', () => {
      if (typeSelect.value === 'cylinder') {
        secCylinder.style.display = 'flex';
        secRadial.style.display = 'none';
        secCube.style.display = 'none';
      } else if (typeSelect.value === 'radial') {
        secCylinder.style.display = 'none';
        secRadial.style.display = 'flex';
        secCube.style.display = 'none';
      } else {
        secCylinder.style.display = 'none';
        secRadial.style.display = 'none';
        secCube.style.display = 'flex';
      }
    });

    // Buttons Container
    const btns = document.createElement('div');
    btns.style.display = 'flex';
    btns.style.justifyContent = 'flex-end';
    btns.style.gap = '10px';
    btns.style.marginTop = '10px';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Huỷ';
    cancelBtn.style.background = '#333';
    cancelBtn.style.border = '1px solid #555';
    cancelBtn.style.color = '#ccc';
    cancelBtn.style.padding = '6px 12px';
    cancelBtn.style.borderRadius = '4px';
    cancelBtn.style.cursor = 'pointer';
    cancelBtn.style.fontSize = '12px';
    cancelBtn.addEventListener('click', () => overlay.remove());

    const okBtn = document.createElement('button');
    okBtn.textContent = 'Sinh ngay';
    okBtn.style.background = '#ff00ff'; // Neon Magenta
    okBtn.style.border = 'none';
    okBtn.style.color = '#fff';
    okBtn.style.padding = '6px 12px';
    okBtn.style.borderRadius = '4px';
    okBtn.style.cursor = 'pointer';
    okBtn.style.fontSize = '12px';
    okBtn.style.fontWeight = 'bold';
    okBtn.style.boxShadow = '0 0 10px rgba(255, 0, 255, 0.4)';

    okBtn.addEventListener('click', () => {
      const volType = typeSelect.value;
      const copiesCount = parseInt(modal.querySelector('#modal-vol-copies').value, 10) || 5;

      const params = {};
      if (volType === 'cylinder') {
        params.maxAngle = parseFloat(modal.querySelector('#modal-vol-angle').value) || 360;
        params.spiralOffset = parseFloat(modal.querySelector('#modal-vol-spiral').value) || 0;
      } else if (volType === 'radial') {
        params.radius = parseFloat(modal.querySelector('#modal-vol-radius').value) || 10;
        params.rotateOutward = modal.querySelector('#modal-vol-rotateout').checked;
        params.maxAngle = parseFloat(modal.querySelector('#modal-vol-radial-angle').value) || 360;
      } else {
        params.offsetX = parseFloat(modal.querySelector('#modal-vol-offsetx').value) || 0;
        params.offsetY = parseFloat(modal.querySelector('#modal-vol-offsety').value) || 0;
        params.offsetZ = parseFloat(modal.querySelector('#modal-vol-offsetz').value) || 0;
      }

      // Collect source positions and colors from the selected indices
      const srcPositions = [];
      const srcColors = [];
      for (const idx of selectedIndices) {
        srcPositions.push(this.state.positions[idx]);
        srcColors.push(this.state.colors[idx]);
      }

      // Generate the 3D volume
      const generated = DroneFormationFactory.generateVolumeFromGroup(srcPositions, srcColors, volType, copiesCount, params);

      // Parent/Original group name is preserved
      const originalGroup = this.state.particleGroups[selectedIndices[0]] || 'Default';
      const startIndex = this.state.positions.length;

      // Inject into active memory
      for (let i = 0; i < generated.positions.length; i++) {
        this.state.positions.push(generated.positions[i]);
        this.state.colors.push(generated.colors[i]);
        this.state.particleGroups.push(originalGroup);
      }

      // Keep original selection plus new spawned indices inside the same group
      for (let i = startIndex; i < this.state.positions.length; i++) {
        this.state.selectedIndices.add(i);
      }

      this.state.saveStateToHistory();
      this.state.notify();

      overlay.remove();
    });

    btns.appendChild(cancelBtn);
    btns.appendChild(okBtn);
    modal.appendChild(btns);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  showFormationShapingModal(hasSelection) {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(0, 0, 0, 0.7)';
    overlay.style.backdropFilter = 'blur(6px)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '999999';

    // Prevent propagation
    overlay.addEventListener('pointerdown', (e) => e.stopPropagation());
    overlay.addEventListener('mousedown', (e) => e.stopPropagation());
    overlay.addEventListener('click', (e) => e.stopPropagation());

    // Create modal container
    const modal = document.createElement('div');
    modal.style.background = '#1e1e1e';
    modal.style.border = '1px solid #3a86ff';
    modal.style.boxShadow = '0 15px 30px rgba(0,0,0,0.6)';
    modal.style.borderRadius = '8px';
    modal.style.padding = '20px';
    modal.style.width = '360px';
    modal.style.display = 'flex';
    modal.style.flexDirection = 'column';
    modal.style.gap = '12px';

    // Title
    const titleEl = document.createElement('div');
    titleEl.textContent = hasSelection ? '✨ Apply Formation Shaping' : '➕ Add Formation Shaping';
    titleEl.style.color = '#fff';
    titleEl.style.fontWeight = 'bold';
    titleEl.style.fontSize = '16px';
    titleEl.style.borderBottom = '1px solid #333';
    titleEl.style.paddingBottom = '8px';
    modal.appendChild(titleEl);

    // Form content
    let formHTML = `
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <label style="font-size: 12px; color: #ccc;">Shape</label>
          <select id="modal-shape-type" style="width: 150px; background: #222; color: #fff; border: 1px solid #444; padding: 4px;">
            <option value="grid">Grid</option>
            <option value="line">Line (Đường thẳng)</option>
            <option value="triangle">Triangle (Tam giác)</option>
            <option value="circle">Circle</option>
            <option value="sphere">Sphere</option>
            <option value="cube">Cube</option>
            <option value="cylinder">Cylinder</option>
            <option value="star">Star</option>
            <option value="text">Text / Numbers</option>
            <option value="json">JSON File (Tệp tin)</option>
          </select>
        </div>
        
        <div id="modal-json-container" style="display: none; justify-content: space-between; align-items: center;">
          <label style="font-size: 12px; color: #ccc;">Import File</label>
          <div>
            <input type="file" id="modal-shape-json-file" accept=".json" style="width: 150px; background: #222; color: #fff; border: 1px solid #444; padding: 4px; border-radius: 2px;" />
            <div id="modal-json-status" style="font-size: 10px; color: #888; margin-top: 2px; text-align: right;">No file selected</div>
          </div>
        </div>

        <div id="modal-text-container" style="display: none; justify-content: space-between; align-items: center;">
          <label style="font-size: 12px; color: #ccc;">Text</label>
          <input type="text" id="modal-shape-text" value="2026" style="width: 150px; background: #222; color: #fff; border: 1px solid #444; padding: 4px; border-radius: 2px;" />
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center;">
          <label style="font-size: 12px; color: #ccc;">Fill Mode</label>
          <select id="modal-shape-fill" style="width: 150px; background: #222; color: #fff; border: 1px solid #444; padding: 4px;">
            <option value="solid">Solid (Đặc)</option>
            <option value="outline">Outline (Rỗng)</option>
          </select>
        </div>

        ${!hasSelection ? `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <label style="font-size: 12px; color: #ccc;">Count</label>
          <input type="number" id="modal-count" value="100" style="width: 150px; background: #222; color: #fff; border: 1px solid #444; padding: 4px; border-radius: 2px;" />
        </div>
        ` : ''}

        <div style="display: flex; justify-content: space-between; align-items: center;">
          <label style="font-size: 12px; color: #ccc;">Radius/Spacing</label>
          <input type="number" id="modal-shape-p1" value="15" style="width: 150px; background: #222; color: #fff; border: 1px solid #444; padding: 4px; border-radius: 2px;" />
        </div>

        <div id="modal-p2-container" style="display: none; justify-content: space-between; align-items: center;">
          <label id="modal-p2-label" style="font-size: 12px; color: #ccc;">Height (Cylinder)</label>
          <input type="number" id="modal-shape-p2" value="30" style="width: 150px; background: #222; color: #fff; border: 1px solid #444; padding: 4px; border-radius: 2px;" />
        </div>

        ${!hasSelection ? `
        <div style="margin-top: 5px; border-top: 1px solid #333; padding-top: 8px;">
          <label style="font-weight: bold; font-size: 11px; color: #aaa;">Formation Center (Tâm)</label>
          <div style="display: flex; gap: 6px; margin-top: 6px;">
            <div style="flex: 1;">
              <label style="font-size: 10px; color: #888; display: block; margin-bottom: 2px;">X</label>
              <input type="number" id="modal-shape-cx" value="0" style="width: 100%; background: #222; color: #fff; border: 1px solid #444; padding: 4px; font-size: 12px; border-radius: 2px;" />
            </div>
            <div style="flex: 1;">
              <label style="font-size: 10px; color: #888; display: block; margin-bottom: 2px;">Y</label>
              <input type="number" id="modal-shape-cy" value="20" style="width: 100%; background: #222; color: #fff; border: 1px solid #444; padding: 4px; font-size: 12px; border-radius: 2px;" />
            </div>
            <div style="flex: 1;">
              <label style="font-size: 10px; color: #888; display: block; margin-bottom: 2px;">Z</label>
              <input type="number" id="modal-shape-cz" value="0" style="width: 100%; background: #222; color: #fff; border: 1px solid #444; padding: 4px; font-size: 12px; border-radius: 2px;" />
            </div>
          </div>
        </div>
        ` : ''}
      </div>
    `;

    const formDiv = document.createElement('div');
    formDiv.innerHTML = formHTML;
    modal.appendChild(formDiv);

    // Bind reactive show/hide of shape-type fields
    const shapeTypeSelect = modal.querySelector('#modal-shape-type');
    const textContainer = modal.querySelector('#modal-text-container');
    const p2Container = modal.querySelector('#modal-p2-container');
    const p2Label = modal.querySelector('#modal-p2-label');
    const p2Input = modal.querySelector('#modal-shape-p2');

    const updateModalUI = () => {
      const type = shapeTypeSelect.value;
      const isJson = type === 'json';

      textContainer.style.display = type === 'text' ? 'flex' : 'none';

      const jsonContainer = modal.querySelector('#modal-json-container');
      if (jsonContainer) jsonContainer.style.display = isJson ? 'flex' : 'none';

      const p1Input = modal.querySelector('#modal-shape-p1');
      if (p1Input && p1Input.parentElement) {
        p1Input.parentElement.style.display = isJson ? 'none' : 'flex';
      }

      const countInput = modal.querySelector('#modal-count');
      if (countInput && countInput.parentElement) {
        countInput.parentElement.style.display = isJson ? 'none' : 'flex';
      }

      const fillSelect = modal.querySelector('#modal-shape-fill');
      if (fillSelect && fillSelect.parentElement) {
        fillSelect.parentElement.style.display = isJson ? 'none' : 'flex';
      }

      if (type === 'cylinder' || type === 'star') {
        p2Container.style.display = 'flex';
        if (type === 'cylinder') {
          if (p2Label) p2Label.textContent = "Height (Cylinder)";
          if (p2Input && p2Input.value === '5') p2Input.value = '30';
        } else {
          if (p2Label) p2Label.textContent = "Star Points (Số cánh)";
          if (p2Input && (p2Input.value === '30' || p2Input.value === '')) p2Input.value = '5';
        }
      } else {
        p2Container.style.display = 'none';
      }
    };
    shapeTypeSelect.addEventListener('change', updateModalUI);
    // Initial call
    updateModalUI();

    let customShapeData = null;
    modal.querySelector('#modal-shape-json-file')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      const statusLabel = modal.querySelector('#modal-json-status');
      if (!file) {
        customShapeData = null;
        if (statusLabel) {
          statusLabel.textContent = 'No file selected';
          statusLabel.style.color = '#888';
        }
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          let droneData = [];
          if (Array.isArray(parsed)) {
            droneData = parsed;
          } else if (parsed && parsed.drones && Array.isArray(parsed.drones)) {
            droneData = parsed.drones;
          } else {
            throw new Error("JSON must be an array of objects or contain a drones array");
          }

          const positions = [];
          const colors = [];
          const particleGroups = [];
          for (const item of droneData) {
            if (item.x !== undefined || item.y !== undefined || item.z !== undefined) {
              const px = item.x || 0;
              const py = item.y || 0;
              const pz = item.z || 0;
              positions.push(new THREE.Vector3(px, py, pz));
              if (item.color !== undefined) {
                colors.push(new THREE.Color(item.color));
              } else if (item.r !== undefined && item.g !== undefined && item.b !== undefined) {
                colors.push(new THREE.Color(`rgb(${item.r}, ${item.g}, ${item.b})`));
              } else {
                colors.push(new THREE.Color(0xffffff));
              }
              const gName = String(item.group || item.particleGroup || 'Imported');
              particleGroups.push(gName);
            }
          }
          if (positions.length > 0) {
            customShapeData = { positions, colors, particleGroups };
            if (statusLabel) {
              statusLabel.textContent = `Loaded ${positions.length} points`;
              statusLabel.style.color = '#4CAF50';
            }
          } else {
            throw new Error("No valid coordinates found");
          }
        } catch (err) {
          customShapeData = null;
          if (statusLabel) {
            statusLabel.textContent = 'Invalid JSON format';
            statusLabel.style.color = '#ff4d4d';
          }
          console.error("Shape Import Error:", err);
        }
      };
      reader.readAsText(file);
    });

    // Buttons Container
    const btns = document.createElement('div');
    btns.style.display = 'flex';
    btns.style.justifyContent = 'flex-end';
    btns.style.gap = '10px';
    btns.style.marginTop = '10px';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.background = '#333';
    cancelBtn.style.border = '1px solid #555';
    cancelBtn.style.color = '#ccc';
    cancelBtn.style.padding = '6px 12px';
    cancelBtn.style.borderRadius = '4px';
    cancelBtn.style.cursor = 'pointer';
    cancelBtn.style.fontSize = '12px';
    cancelBtn.addEventListener('click', () => overlay.remove());

    const okBtn = document.createElement('button');
    okBtn.textContent = hasSelection ? 'Apply Shape' : 'Spawn Shape';
    okBtn.style.background = '#3a86ff';
    okBtn.style.border = 'none';
    okBtn.style.color = '#fff';
    okBtn.style.padding = '6px 12px';
    okBtn.style.borderRadius = '4px';
    okBtn.style.cursor = 'pointer';
    okBtn.style.fontSize = '12px';
    okBtn.style.fontWeight = 'bold';

    okBtn.addEventListener('click', () => {
      const type = shapeTypeSelect.value;
      const fill = modal.querySelector('#modal-shape-fill').value;
      const p1 = parseFloat(modal.querySelector('#modal-shape-p1').value) || 15;
      const p2Val = parseFloat(modal.querySelector('#modal-shape-p2').value);
      const p2 = p2Container.style.display !== 'none' ? (isNaN(p2Val) ? (type === 'star' ? 5 : 30) : p2Val) : (type === 'star' ? 5 : 30);
      const textVal = textContainer.style.display !== 'none' ? modal.querySelector('#modal-shape-text').value : '2026';

      if (type === 'json' && !customShapeData) {
        alert("Please choose a valid JSON file first.");
        return;
      }

      let params = { y: 0, fill: fill };
      if (type === 'grid') params = { spacing: p1, y: 0, fill };
      if (type === 'line') params = { spacing: p1, y: 0 };
      if (type === 'triangle') params = { radius: p1, y: 0, fill };
      if (type === 'circle') params = { radius: p1, y: 0, fill };
      if (type === 'sphere') params = { radius: p1, y: 0, fill };
      if (type === 'cube') params = { spacing: p1, y: 0, fill };
      if (type === 'cylinder') params = { radius: p1, height: p2, y: 0, fill };
      if (type === 'star') params = { radius: p1, starPoints: p2, y: 0, fill };
      if (type === 'text') params = { text: textVal, spacing: p1, y: 0, fill };

      if (hasSelection) {
        // Apply formation to selected drones
        const count = this.state.selectedIndices.size;
        let newPositions = [];
        let newColors = null;
        let newGroups = null;

        if (type === 'json') {
          newPositions = customShapeData.positions.slice(0, count).map(p => p.clone());
          newColors = customShapeData.colors.slice(0, count).map(c => c.clone());
          newGroups = customShapeData.particleGroups.slice(0, count);
        } else {
          if (type === 'grid') params.rows = Math.ceil(Math.sqrt(count));
          newPositions = DroneFormationFactory.createFormation(type, count, params);
        }

        // Center calculation
        const currentCenter = new THREE.Vector3();
        for (const id of this.state.selectedIndices) {
          currentCenter.add(this.state.positions[id]);
        }
        currentCenter.divideScalar(count);

        const shapeCenter = new THREE.Vector3();
        for (const pos of newPositions) {
          shapeCenter.add(pos);
        }
        if (newPositions.length > 0) {
          shapeCenter.divideScalar(newPositions.length);
        }

        const offset = currentCenter.sub(shapeCenter);
        const updates = [];
        let i = 0;
        for (const id of this.state.selectedIndices) {
          if (i >= newPositions.length) break;
          const finalPos = newPositions[i].clone().add(offset);
          updates.push({ index: id, pos: finalPos });
          i++;
        }
        this.state.updatePositions(updates);

        // Update colors & groups if JSON imported
        if (type === 'json' && newColors) {
          let j = 0;
          for (const id of this.state.selectedIndices) {
            if (j >= newColors.length) break;
            this.state.colors[id].copy(newColors[j]);
            if (newGroups && newGroups[j]) {
              this.state.particleGroups[id] = newGroups[j];
            }
            j++;
          }
          this.state.notify(); // Force UI colors refresh
        }

        this.state.saveStateToHistory();
      } else {
        // Spawn new drones in shape
        let count = 0;
        let positions = [];
        let colors = [];
        let particleGroups = [];

        if (type === 'json') {
          positions = customShapeData.positions.map(p => p.clone());
          colors = customShapeData.colors.map(c => c.clone());
          particleGroups = customShapeData.particleGroups;
          count = positions.length;
        } else {
          count = parseInt(modal.querySelector('#modal-count').value) || 100;
          if (type === 'grid') params.rows = Math.ceil(Math.sqrt(count));
          positions = DroneFormationFactory.createFormation(type, count, params);
          colors = new Array(positions.length).fill().map(() => new THREE.Color(0xffffff));
        }

        const cx = parseFloat(modal.querySelector('#modal-shape-cx').value) || 0;
        const cy = parseFloat(modal.querySelector('#modal-shape-cy').value) || 0;
        const cz = parseFloat(modal.querySelector('#modal-shape-cz').value) || 0;

        const centerOffset = new THREE.Vector3(cx, cy, cz);
        for (const pos of positions) {
          pos.add(centerOffset);
        }

        const groupName = `${type.toUpperCase()}_${Math.floor(Math.random() * 1000)}`;
        const startIndex = this.state.positions.length;

        // Determine target group name for the new shape
        const targetGroupName = (type === 'json' && particleGroups[0]) ? particleGroups[0] : groupName;

        // Inject into active memory
        for (let i = 0; i < count; i++) {
          this.state.positions.push(positions[i]);
          this.state.colors.push(colors[i]);
          const gName = (type === 'json' && particleGroups[i]) ? particleGroups[i] : targetGroupName;
          this.state.particleGroups.push(gName);
        }

        // Select the newly spawned drones
        this.state.selectedIndices.clear();
        for (let i = startIndex; i < this.state.positions.length; i++) {
          this.state.selectedIndices.add(i);
        }

        // Set the active group to the newly spawned group so editing works immediately!
        if (typeof this.state.setActiveGroup === 'function') {
          this.state.setActiveGroup(targetGroupName);
        } else {
          this.state.activeGroup = targetGroupName;
        }

        this.state.center.set(cx, cy, cz); // Update center
        this.state.saveStateToHistory();
        this.state.notify();
      }

      overlay.remove();
    });

    btns.appendChild(cancelBtn);
    btns.appendChild(okBtn);
    modal.appendChild(btns);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }
}
