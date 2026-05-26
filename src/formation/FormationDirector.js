import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { FormationState } from './FormationState.js';
import { GizmoSystem } from '../editor/systems/GizmoSystem.js';
import { setupFormationUI } from './ui/FormationUI.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

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
    window.addEventListener('keydown', this.onKeyDown.bind(this));
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
        return; // Dragging handle, bypass normal selection
      }
    }

    // 1. If Click-to-Place Snapping is active
    if (this.state.isClickToPlaceActive) {
      const targets = [];
      if (this.ghostMeshes.length > 0) {
        targets.push(...this.ghostMeshes);
      }
      if (this.refImageMesh) {
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
          alert(`Đã lưu đội hình static trực tiếp thành công vào: ${this.state.name}.json`);
        } catch (err) {
          alert("Lỗi khi lưu file trực tiếp: " + err.message);
        }
      } else {
        // Save As
        try {
          const res = await window.electronAPI.saveFileDialog(content, `${this.state.name}.json`);
          if (res) {
            this.state.currentFilePath = res.filePath;
            this.state.name = res.filename.replace('.json', '');
            alert(`Đã lưu đội hình mới thành công: ${res.filename}`);
          }
        } catch (err) {
          alert("Lỗi khi lưu đội hình mới: " + err.message);
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
    alert(`Đã xuất kịch bản thành file ${this.state.name}.json!`);
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
      if (this.bezierTransformControl) this.bezierTransformControl.detach();
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
      statusLabel.textContent = "Đang tải mô hình...";
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
        statusLabel.textContent = `Đã tải: ${filename} (~${Math.round(polyCount)} polys)`;
        statusLabel.style.color = "#4CAF50";
      }

      if (callback) callback();
    };

    const onLoadError = (error) => {
      console.error("Lỗi nạp mô hình Hologram:", error);
      URL.revokeObjectURL(url);
      if (statusLabel) {
        statusLabel.textContent = "Lỗi tải file!";
        statusLabel.style.color = "#ff4d4d";
      }
      alert("Lỗi tải file mô hình 3D! Vui lòng kiểm tra lại định dạng file.");
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
      onLoadError(new Error("Định dạng file không hỗ trợ."));
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

    // Clean state
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
}
