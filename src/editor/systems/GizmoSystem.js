import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

export class GizmoSystem {
  constructor(scene, camera, domElement, orbitControls, state) {
    this.scene = scene;
    this.camera = camera;
    this.domElement = domElement;
    this.orbitControls = orbitControls;
    this.state = state;

    // Deform properties
    this.isDeformModeActive = false;
    this.deformType = 'bend'; // 'bend' or 'straighten'
    this.deformStrength = 1.0;
    this.deformOriginalPositions = new Map(); // index -> Vector3
    this.deformDroneParams = new Map(); // index -> { t, offsetVec }
    this.deformHandles = []; // [handleA, handleB, handleC]
    this.deformLine = null;
    this.activeHandle = null;
    this.deformMainAxis = 'x';
    this.deformOriginalDir = new THREE.Vector3(1, 0, 0);
    this.deformOriginalLength = 1.0;
    this.deformOriginalA = new THREE.Vector3();
    this.deformOriginalB = new THREE.Vector3();

    // TransformControls initialization
    this.transformControl = new TransformControls(this.camera, this.domElement);
    this.transformControl.addEventListener('dragging-changed', (event) => {
      this.orbitControls.enabled = !event.value;
      if (!event.value) {
        // Drag ended, save state
        if (this.isDeformModeActive) {
          this.updateDeformLine();
          if (typeof this.state.saveCurrentStep === 'function') {
            this.state.saveCurrentStep();
          }
        } else {
          this.applyProxyTransformsToState();
          this.state.saveStateToHistory();
        }
      }
    });

    this.transformControl.addEventListener('change', () => {
      if (this.transformControl.getMode() === 'scale' && !this.isDeformModeActive) {
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

      // Realtime translation/rotation/scale/bending feedback!
      if (this.transformControl.dragging) {
        if (this.isDeformModeActive) {
          this.updateGroupDeformation();
        } else {
          this.applyProxyTransformsToStateRealtime();
        }
      }
    });

    this.scene.add(this.transformControl.getHelper());

    // Event listener for raycasting handles in deform mode
    this.handleDeformPointerDown = (e) => this.onDeformPointerDown(e);
    this.domElement.addEventListener('pointerdown', this.handleDeformPointerDown);

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

    // Ctrl key tracking for hiding the gizmo during selection
    this.isCtrlPressed = false;
    this.handleKeyDown = (e) => {
      if (e.key === 'Control') {
        this.isCtrlPressed = true;
        this.updateGizmoVisibility();
      }
    };
    this.handleKeyUp = (e) => {
      if (e.key === 'Control') {
        this.isCtrlPressed = false;
        this.updateGizmoVisibility();
      }
    };
    this.handleBlur = () => {
      this.isCtrlPressed = false;
      this.updateGizmoVisibility();
    };

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);

    this.handlePointer = (e) => {
      const ctrl = e.ctrlKey;
      if (ctrl !== this.isCtrlPressed) {
        this.isCtrlPressed = ctrl;
        this.updateGizmoVisibility();
      }
    };
    window.addEventListener('pointerdown', this.handlePointer, true);
    window.addEventListener('pointerup', this.handlePointer, true);
    window.addEventListener('pointermove', this.handlePointer, true);

    // Hide gizmo initially since no object is attached yet
    this.updateGizmoVisibility();
  }

  isHovering() {
    return this.transformControl.dragging || this.transformControl.axis !== null;
  }

  setMode(mode) {
    // mode: 'translate', 'rotate', 'scale'
    this.transformControl.setMode(mode);
  }

  updateGizmoVisibility() {
    const isVisible = !this.isCtrlPressed && !!this.transformControl.object;
    this.transformControl.visible = isVisible;
    this.transformControl.enabled = isVisible;

    const helper = this.transformControl.getHelper ? this.transformControl.getHelper() : null;
    if (helper) {
      helper.visible = isVisible;
    }
  }

  onStateChange() {
    // If in Deform Mode, ignore standard proxy updates
    if (this.isDeformModeActive) {
      return;
    }

    // If actively dragging, do not rebuild proxies to avoid interrupting the TransformControls
    if (this.transformControl.dragging) {
      return;
    }

    // Check if Center is selected
    if (this.state.isCenterSelected) {
      this.clearProxies();
      
      this.proxyGroup.position.copy(this.state.center);
      this.proxyGroup.rotation.set(0, 0, 0);
      this.proxyGroup.scale.set(1, 1, 1);
      this.proxyGroup.updateMatrixWorld();
      
      // Create a proxy mesh for the center (using a slightly larger geometry for visibility)
      const mesh = new THREE.Mesh(this.proxyGeometry, this.proxyMaterial);
      mesh.position.set(0, 0, 0);
      this.proxyGroup.add(mesh);
      this.proxyMeshes.set('center', mesh);
      
      this.transformControl.attach(this.proxyGroup);
      this.updateGizmoVisibility();
      return;
    }

    const selected = Array.from(this.state.selectedIndices);
    
    // If selection is empty, detach
    if (selected.length === 0) {
      this.transformControl.detach();
      this.clearProxies();
      this.updateGizmoVisibility();
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
      this.updateGizmoVisibility();
    }
  }

  clearProxies() {
    while (this.proxyGroup.children.length > 0) {
      this.proxyGroup.remove(this.proxyGroup.children[0]);
    }
    this.proxyMeshes.clear();
  }

  applyProxyTransformsToStateRealtime() {
    // Apply changes in realtime during dragging
    this.proxyGroup.updateMatrixWorld(true);
    
    if (this.state.isCenterSelected) {
      const targetPos = new THREE.Vector3();
      const mesh = this.proxyMeshes.get('center');
      if (mesh) {
        mesh.getWorldPosition(targetPos);
        this.state.center.copy(targetPos);
        this.state.notify();
      }
      return;
    }

    const targetPos = new THREE.Vector3();
    const updates = [];
    
    for (const [id, mesh] of this.proxyMeshes.entries()) {
      if (id === 'center') continue;
      mesh.getWorldPosition(targetPos);
      updates.push({ index: id, pos: targetPos.clone() });
    }
    
    this.state.updatePositions(updates);
  }

  applyProxyTransformsToState() {
    // When dragging ends, apply the world positions of proxies back to state
    this.proxyGroup.updateMatrixWorld(true);
    
    if (this.state.isCenterSelected) {
      const targetPos = new THREE.Vector3();
      const mesh = this.proxyMeshes.get('center');
      if (mesh) {
        mesh.getWorldPosition(targetPos);
        this.state.center.copy(targetPos);
        if (typeof this.state.saveCurrentStep === 'function') {
          this.state.saveCurrentStep();
        }
        this.state.notify();
      }
      return;
    }

    const targetPos = new THREE.Vector3();
    const updates = [];
    
    for (const [id, mesh] of this.proxyMeshes.entries()) {
      if (id === 'center') continue;
      mesh.getWorldPosition(targetPos);
      updates.push({ index: id, pos: targetPos.clone() });
    }
    this.state.updatePositions(updates);
    if (typeof this.state.saveCurrentStep === 'function') {
      this.state.saveCurrentStep();
    }
  }

  activateDeformMode() {
    const selected = Array.from(this.state.selectedIndices);
    if (selected.length === 0) return;

    this.isDeformModeActive = true;
    this.activeHandle = null;

    // Detach standard controls
    this.transformControl.detach();
    this.clearProxies();
    this.updateGizmoVisibility();

    // 1. Store original world positions
    this.deformOriginalPositions.clear();
    let min = new THREE.Vector3(Infinity, Infinity, Infinity);
    let max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);

    for (const id of selected) {
      const p = this.state.positions[id].clone();
      this.deformOriginalPositions.set(id, p);
      min.min(p);
      max.max(p);
    }

    const center = new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5);
    const size = new THREE.Vector3().subVectors(max, min);

    // 2. Determine main axis
    let mainAxis = 'x';
    let largestSize = size.x;
    if (size.y > largestSize) { mainAxis = 'y'; largestSize = size.y; }
    if (size.z > largestSize) { mainAxis = 'z'; largestSize = size.z; }
    this.deformMainAxis = mainAxis;

    // 3. Build original handle endpoints
    const halfSize = (largestSize / 2) || 10;
    const posA = center.clone();
    const posB = center.clone();

    if (mainAxis === 'x') {
      posA.x -= halfSize;
      posB.x += halfSize;
    } else if (mainAxis === 'y') {
      posA.y -= halfSize;
      posB.y += halfSize;
    } else {
      posA.z -= halfSize;
      posB.z += halfSize;
    }

    this.deformOriginalA.copy(posA);
    this.deformOriginalB.copy(posB);
    this.deformOriginalDir.subVectors(posB, posA).normalize();
    this.deformOriginalLength = posA.distanceTo(posB) || 1.0;

    // Place C exactly in the middle of A and B
    const posC = new THREE.Vector3().addVectors(posA, posB).multiplyScalar(0.5);

    // 4. Map each drone to a normalized parameter t ∈ [0, 1] and a lateral offset perpendicular to AB
    this.deformDroneParams.clear();
    const abLen = this.deformOriginalLength;
    const abDir = this.deformOriginalDir;

    for (const id of selected) {
      const p = this.deformOriginalPositions.get(id);
      const ap = new THREE.Vector3().subVectors(p, posA);
      
      // Normalized projection coordinate t
      const t = THREE.MathUtils.clamp(ap.dot(abDir) / abLen, 0, 1);
      
      // Compute projection point on the original line
      const projPoint = new THREE.Vector3().addScaledVector(abDir, t * abLen).add(posA);
      
      // Compute perpendicular offset vector
      const offsetVec = new THREE.Vector3().subVectors(p, projPoint);
      
      this.deformDroneParams.set(id, { t, offsetVec });
    }

    // 5. Create 3D handle meshes in the scene
    this.createDeformHandles(posA, posB, posC);
    
    // Auto-select Handle C (the middle bend controller) initially!
    if (this.deformHandles[2]) {
      this.selectDeformHandle(this.deformHandles[2]);
    }
  }

  createDeformHandles(posA, posB, posC) {
    this.clearDeformHandles();

    const handleGeo = new THREE.SphereGeometry(2.0, 16, 16);
    
    const matA = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: false, depthTest: false, transparent: true, opacity: 0.85 });
    const matB = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: false, depthTest: false, transparent: true, opacity: 0.85 });
    const matC = new THREE.MeshBasicMaterial({ color: 0xff00ff, wireframe: false, depthTest: false, transparent: true, opacity: 0.85 });

    const handleA = new THREE.Mesh(handleGeo, matA);
    handleA.position.copy(posA);
    handleA.name = 'handleA';
    this.scene.add(handleA);
    this.deformHandles.push(handleA);

    const handleB = new THREE.Mesh(handleGeo, matB);
    handleB.position.copy(posB);
    handleB.name = 'handleB';
    this.scene.add(handleB);
    this.deformHandles.push(handleB);

    const handleC = new THREE.Mesh(handleGeo, matC);
    handleC.position.copy(posC);
    handleC.name = 'handleC';
    this.scene.add(handleC);
    this.deformHandles.push(handleC);

    // Create visual line guide
    const lineMat = new THREE.LineDashedMaterial({ color: 0x00ffff, dashSize: 3, gapSize: 2, depthTest: false, transparent: true, opacity: 0.7 });
    const lineGeo = new THREE.BufferGeometry();
    this.deformLine = new THREE.Line(lineGeo, lineMat);
    this.scene.add(this.deformLine);

    this.updateDeformLine();
  }

  clearDeformHandles() {
    for (const mesh of this.deformHandles) {
      this.scene.remove(mesh);
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) mesh.material.dispose();
    }
    this.deformHandles = [];

    if (this.deformLine) {
      this.scene.remove(this.deformLine);
      if (this.deformLine.geometry) this.deformLine.geometry.dispose();
      if (this.deformLine.material) this.deformLine.material.dispose();
      this.deformLine = null;
    }
  }

  deactivateDeformMode(applyChanges) {
    if (!this.isDeformModeActive) return;

    this.transformControl.detach();
    this.clearDeformHandles();
    this.isDeformModeActive = false;
    this.activeHandle = null;

    if (!applyChanges) {
      // Revert positions to original
      const updates = [];
      for (const [id, pos] of this.deformOriginalPositions.entries()) {
        updates.push({ index: id, pos: pos.clone() });
      }
      this.state.updatePositions(updates);
    } else {
      // Bake current positions
      if (typeof this.state.saveCurrentStep === 'function') {
        this.state.saveCurrentStep();
      }
      this.state.saveStateToHistory();
    }

    this.deformOriginalPositions.clear();
    this.deformDroneParams.clear();

    // Rebuild normal proxies
    this.onStateChange();
  }

  onDeformPointerDown(event) {
    if (!this.isDeformModeActive || this.deformHandles.length < 3) return;

    // Calculate mouse coordinates in normalized device space [-1, 1]
    const rect = this.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);

    const intersects = raycaster.intersectObjects(this.deformHandles);
    if (intersects.length > 0) {
      event.stopPropagation(); // Avoid raycaster selecting behind it
      const clickedHandle = intersects[0].object;
      this.selectDeformHandle(clickedHandle);
    }
  }

  selectDeformHandle(handle) {
    this.activeHandle = handle;
    this.transformControl.attach(handle);
    this.updateGizmoVisibility();
  }

  updateDeformLine() {
    if (!this.deformLine || this.deformHandles.length < 3) return;

    const posA = this.deformHandles[0].position;
    const posB = this.deformHandles[1].position;
    const posC = this.deformHandles[2].position;

    const points = [];
    if (this.deformType === 'bend') {
      // Draw smooth Bezier curve line (24 samples)
      for (let i = 0; i <= 24; i++) {
        const t = i / 24;
        const p = new THREE.Vector3()
          .addScaledVector(posA, (1 - t) * (1 - t))
          .addScaledVector(posC, 2 * (1 - t) * t)
          .addScaledVector(posB, t * t);
        points.push(p);
      }
    } else {
      // Draw straight line segment
      points.push(posA.clone(), posB.clone());
    }

    this.deformLine.geometry.setFromPoints(points);
    this.deformLine.computeLineDistances();
  }

  updateGroupDeformation() {
    if (!this.isDeformModeActive || this.deformHandles.length < 3) return;

    this.updateDeformLine();

    const posA = this.deformHandles[0].position;
    const posB = this.deformHandles[1].position;
    const posC = this.deformHandles[2].position;

    const updates = [];
    const originalDir = this.deformOriginalDir;

    for (const [id, params] of this.deformDroneParams.entries()) {
      const t = params.t;
      const offsetVec = params.offsetVec;

      let finalPos = new THREE.Vector3();

      if (this.deformType === 'bend') {
        // 1. Calculate point on Bezier Curve
        const pointOnCurve = new THREE.Vector3()
          .addScaledVector(posA, (1 - t) * (1 - t))
          .addScaledVector(posC, 2 * (1 - t) * t)
          .addScaledVector(posB, t * t);

        // 2. Calculate local tangent direction at parameter t
        // Bezier derivative: 2*(1-t)*(C - A) + 2*t*(B - C)
        const tangent = new THREE.Vector3()
          .addVectors(
            new THREE.Vector3().subVectors(posC, posA).multiplyScalar(2 * (1 - t)),
            new THREE.Vector3().subVectors(posB, posC).multiplyScalar(2 * t)
          );
        
        const tangentLen = tangent.length();
        if (tangentLen > 0.001) {
          tangent.divideScalar(tangentLen);
        } else {
          tangent.subVectors(posB, posA).normalize();
        }

        // 3. Rotate the perpendicular offset vector using Quaternion rotation from originalDir to tangent
        const rot = new THREE.Quaternion().setFromUnitVectors(originalDir, tangent);
        const rotatedOffset = offsetVec.clone().applyQuaternion(rot);

        finalPos.addVectors(pointOnCurve, rotatedOffset);
      } else {
        // Straighten mode (Linear Project with strength slider)
        // 1. Point on the straight line segment between A and B
        const pointOnLine = new THREE.Vector3().lerpVectors(posA, posB, t);

        // 2. Linear projection direction
        const lineDir = new THREE.Vector3().subVectors(posB, posA);
        const lineLen = lineDir.length();
        if (lineLen > 0.001) {
          lineDir.divideScalar(lineLen);
        } else {
          lineDir.copy(originalDir);
        }

        // 3. Rotate offset vector to align with the new line segment orientation
        const rot = new THREE.Quaternion().setFromUnitVectors(originalDir, lineDir);
        const rotatedOffset = offsetVec.clone().applyQuaternion(rot);

        // 4. Interpolate offset scaling based on flattening strength (deformStrength)
        const scaledOffset = rotatedOffset.multiplyScalar(1 - this.deformStrength);

        finalPos.addVectors(pointOnLine, scaledOffset);
      }

      updates.push({ index: id, pos: finalPos });
    }

    this.state.updatePositions(updates);
  }
}
