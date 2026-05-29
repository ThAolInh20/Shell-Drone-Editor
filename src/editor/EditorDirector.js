import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FormationEditorState } from './FormationEditorState.js';
import { GizmoSystem } from './systems/GizmoSystem.js';
import { setupEditorUI } from './ui/EditorUI.js';

export class EditorDirector {
  constructor(sceneManager, cameraManager, renderer) {
    this.sceneManager = sceneManager;
    this.cameraManager = cameraManager;
    this.renderer = renderer;

    this.state = new FormationEditorState();

    // Editor UI Setup
    setupEditorUI(this.state, this);

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
    // Move axes slightly up so it doesn't z-fight with the grid
    axesHelper.position.y = 0.1;
    this.sceneManager.instance.add(axesHelper);

    const geometry = new THREE.SphereGeometry(1, 16, 16);
    geometry.computeBoundingSphere();
    geometry.boundingSphere.radius = 999999; // Prevent raycaster early-culling

    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      toneMapped: false
    });

    // We allow up to 10,000 drones in the editor
    this.instancedMesh = new THREE.InstancedMesh(geometry, material, 10000);
    this.instancedMesh.frustumCulled = false; // Prevent disappearing when looking away from origin
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.instancedMesh.count = 0;

    // Highlight material logic (can use vertex colors)
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
    // Calculate mouse position in normalized device coordinates
    // (-1 to +1) for both components
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.cameraManager.instance);

    // 1. Standard drone / center point selection logic
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
          // Check if this group already has ANY selected drones
          let groupHasSelection = false;
          for (const idx of this.state.selectedIndices) {
            if (this.state.particleGroups[idx] === groupName) {
              groupHasSelection = true;
              break;
            }
          }

          if (groupHasSelection) {
            // Group is already "active", drill down to individual particle
            if (multiSelect && this.state.selectedIndices.has(instanceId)) {
              this.state.deselect(instanceId);
            } else {
              this.state.select(instanceId, multiSelect);
            }
          } else {
            // Group is not active, select the entire group
            this.state.selectGroup(groupName, multiSelect);
          }
        }
      } else {
        // Strict individual selection mode
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
      console.log('Copied to clipboard');
    }
    if (event.shiftKey && isV) {
      event.preventDefault();
      this.state.pasteFromClipboard();
      console.log('Pasted from clipboard');
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      this.state.deleteSelected();
    }
  }

  async saveDirectly() {
    const data = this.state.exportFormat();
    const content = JSON.stringify(data, null, 2);

    if (window.electronAPI) {
      if (this.state.currentFilePath) {
        try {
          await window.electronAPI.saveFileAbsolute(this.state.currentFilePath, content);
          alert(`Đã lưu kịch bản động trực tiếp thành công vào: ${this.state.name}.json`);
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
            document.getElementById('ui-name').value = this.state.name;
            alert(`Đã lưu kịch bản mới thành công: ${res.filename}`);
          }
        } catch (err) {
          alert("Lỗi khi lưu kịch bản mới: " + err.message);
        }
      }
      return;
    }

    // Fallback to browser download if not in Electron
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.state.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
    alert(`Đã tải xuống kịch bản ${this.state.name}.json thành công!`);
  }

  updateMeshFromState() {
    const positions = this.state.positions;
    this.instancedMesh.count = positions.length;

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    for (let i = 0; i < positions.length; i++) {
      dummy.position.copy(positions[i]);
      dummy.scale.set(1, 1, 1);

      // Hide the mesh if it's currently selected and being managed by the Gizmo proxy
      // Or we can just render it with a different color. Let's just color it blue if selected.
      if (this.state.selectedIndices.has(i)) {
        // We actually let GizmoSystem handle proxy. We'll shrink the instance or color it
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

    // Crucial for Raycasting: recompute the bounding sphere of the instanced mesh 
    // because the instance matrices have changed!
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

    if (this.state.isPlaying && this.instancedMesh) {
      this.state.playbackTime += deltaTime * 1000;
      const steps = this.state.steps;
      if (steps.length === 0) return;

      const maxTime = steps[steps.length - 1].time;

      const timeDiv = document.getElementById('playback-time');
      if (timeDiv) {
        const ms = Math.floor(this.state.playbackTime);
        const sec = Math.floor(ms / 1000);
        const millis = ms % 1000;
        timeDiv.textContent = `${sec.toString().padStart(2, '0')}:${millis.toString().padStart(3, '0')}`;
      }

      if (this.state.playbackTime >= maxTime && steps.length > 1) {
        this.state.playbackTime = 0; // Loop playback
      }

      if (steps.length > 1) {
        let stepA = steps[0];
        let stepB = steps[steps.length - 1];

        for (let i = 0; i < steps.length - 1; i++) {
          if (this.state.playbackTime >= steps[i].time && this.state.playbackTime <= steps[i + 1].time) {
            stepA = steps[i];
            stepB = steps[i + 1];
            break;
          }
        }

        if (this.state.playbackTime > stepB.time) {
          stepA = stepB;
        }

        const holdTime = stepA.holdTime || 0;
        const flightDuration = stepB.time - (stepA.time + holdTime);
        let t = 0;

        if (this.state.playbackTime <= stepA.time + holdTime) {
          t = 0; // Holding
        } else if (flightDuration > 0) {
          t = (this.state.playbackTime - (stepA.time + holdTime)) / flightDuration;
          // Smoothstep for nicer easing
          t = t * t * (3 - 2 * t);
          if (t > 1) t = 1;
        } else {
          t = 1;
        }
        const defaultCenter = new THREE.Vector3(0, 20, 0);
        const centerA = stepA.center || defaultCenter;
        const centerB = stepB.center || defaultCenter;
        const currentCenter = new THREE.Vector3().lerpVectors(centerA, centerB, t);

        const dummy = new THREE.Object3D();
        const color = new THREE.Color();
        const count = this.state.positions.length;
        const age = this.state.playbackTime / 1000; // in seconds

        for (let i = 0; i < count; i++) {
          const posA = stepA.positions[i] || this.state.positions[i];
          const posB = stepB.positions[i] || posA;

          // Interpolate Move speed and frequency
          const speedMoveA = stepA.holdMoveSpeed !== undefined ? stepA.holdMoveSpeed : 1.0;
          const speedMoveB = stepB.holdMoveSpeed !== undefined ? stepB.holdMoveSpeed : 1.0;
          const currentMoveSpeed = THREE.MathUtils.lerp(speedMoveA, speedMoveB, t);

          const freqMoveA = stepA.holdMoveFreq !== undefined ? stepA.holdMoveFreq : 1.0;
          const freqMoveB = stepB.holdMoveFreq !== undefined ? stepB.holdMoveFreq : 1.0;
          const currentMoveFreq = THREE.MathUtils.lerp(freqMoveA, freqMoveB, t);

          // Interpolate Light speed and frequency
          const speedLightA = stepA.holdLightSpeed !== undefined ? stepA.holdLightSpeed : 1.0;
          const speedLightB = stepB.holdLightSpeed !== undefined ? stepB.holdLightSpeed : 1.0;
          const currentLightSpeed = THREE.MathUtils.lerp(speedLightA, speedLightB, t);

          const freqLightA = stepA.holdLightFreq !== undefined ? stepA.holdLightFreq : 1.0;
          const freqLightB = stepB.holdLightFreq !== undefined ? stepB.holdLightFreq : 1.0;
          const currentLightFreq = THREE.MathUtils.lerp(freqLightA, freqLightB, t);

          // Apply transition mode & effects
          const transEff = stepA.transitionEffect || 'none';
          const mode = stepB.transitionMode || 'transform';

          if (transEff === 'arc' && t > 0.01 && t < 0.99) {
            dummy.position.lerpVectors(posA, posB, t);
            const dist = posA.distanceTo(posB);
            const arcHeight = Math.max(8, dist * 0.2) * Math.sin(t * Math.PI);
            dummy.position.y += arcHeight;
          } else if (transEff === 'spiral' && t > 0.01 && t < 0.99) {
            const relA = new THREE.Vector3().subVectors(posA, centerA);
            const relB = new THREE.Vector3().subVectors(posB, centerB);
            const relPos = new THREE.Vector3().lerpVectors(relA, relB, t);
            const spinAngle = (1.0 - t) * Math.PI * 2.0 * (i % 2 === 0 ? 1 : -1) * currentMoveSpeed;
            const cos = Math.cos(spinAngle);
            const sin = Math.sin(spinAngle);
            const rx = relPos.x * cos - relPos.z * sin;
            const rz = relPos.x * sin + relPos.z * cos;
            dummy.position.set(currentCenter.x + rx, currentCenter.y + relPos.y, currentCenter.z + rz);
          } else if (transEff === 'wave-delay' && t > 0.01 && t < 0.99) {
            const delay = (i % 10) * 0.04;
            let localT = (t - delay) / (1.0 - 0.36);
            localT = THREE.MathUtils.clamp(localT, 0.0, 1.0);
            localT = localT * localT * (3 - 2 * localT);
            dummy.position.lerpVectors(posA, posB, localT);
          } else {
            // Default transition mode (transform vs move)
            if (mode === 'move') {
              const relA = new THREE.Vector3().subVectors(posA, centerA);
              const relB = new THREE.Vector3().subVectors(posB, centerB);
              const relPos = new THREE.Vector3().lerpVectors(relA, relB, t);
              dummy.position.addVectors(currentCenter, relPos);
            } else {
              dummy.position.lerpVectors(posA, posB, t);
            }
          }

          dummy.scale.set(1, 1, 1);

          // Apply mathematical effects
          const droneEffectA = stepA.effects ? (stepA.effects[i] || 'none') : 'none';
          const droneEffectB = stepB.effects ? (stepB.effects[i] || 'none') : 'none';

          // 1. Phân tích Chuyển động (Movement Effect)
          const holdMoveEffectA = (stepA.holdMoveEffect && stepA.holdMoveEffect !== 'none') ? stepA.holdMoveEffect : (['wave', 'swing', 'pulse'].includes(droneEffectA) ? droneEffectA : 'none');
          const holdMoveEffectB = (stepB.holdMoveEffect && stepB.holdMoveEffect !== 'none') ? stepB.holdMoveEffect : (['wave', 'swing', 'pulse'].includes(droneEffectB) ? droneEffectB : 'none');

          let currentMoveEffect = 'none';
          if (t > 0.01 && t < 0.99) {
            const transEff = stepA.transitionEffect || 'none';
            currentMoveEffect = ['wave', 'swing', 'pulse'].includes(transEff) ? transEff : 'none';
          } else if (t <= 0.01) {
            currentMoveEffect = holdMoveEffectA;
          } else {
            currentMoveEffect = holdMoveEffectB;
          }

          // 2. Phân tích Ánh sáng (Light Effect)
          const holdLightEffectA = (stepA.holdLightEffect && stepA.holdLightEffect !== 'none') ? stepA.holdLightEffect : (['strobe', 'shimmer'].includes(droneEffectA) ? droneEffectA : 'none');
          const holdLightEffectB = (stepB.holdLightEffect && stepB.holdLightEffect !== 'none') ? stepB.holdLightEffect : (['strobe', 'shimmer'].includes(droneEffectB) ? droneEffectB : 'none');

          let currentLightEffect = 'none';
          if (t > 0.01 && t < 0.99) {
            const transEff = stepA.transitionEffect || 'none';
            currentLightEffect = ['strobe', 'shimmer'].includes(transEff) ? transEff : 'none';
          } else if (t <= 0.01) {
            currentLightEffect = holdLightEffectA;
          } else {
            currentLightEffect = holdLightEffectB;
          }

          // --- ÁP DỤNG HIỆU ỨNG DI CHUYỂN (MOVEMENT EFFECT) ---
          if (currentMoveEffect === 'wave') {
            dummy.position.y += Math.sin(age * 3.0 * currentMoveSpeed + (i * 0.1)) * 2.0 * currentMoveFreq;
          } else if (currentMoveEffect === 'swing') {
            dummy.position.x += Math.sin(age * 2.0 * currentMoveSpeed + (i * 0.1)) * 2.5 * currentMoveFreq;
          } else if (currentMoveEffect === 'pulse') {
            const p = 1.0 + Math.sin(age * Math.PI * 2 * currentMoveSpeed + (i * 0.1)) * 0.5 * currentMoveFreq;
            dummy.scale.set(p, p, p);
          } else if (currentMoveEffect === 'orbit' || currentMoveEffect === 'spiral') {
            const toDrone = new THREE.Vector3().subVectors(dummy.position, currentCenter);
            let angle = age * 0.6 * currentMoveSpeed; // Rotation speed
            let radiusScale = 1.0;

            if (currentMoveEffect === 'spiral') {
              const dist = toDrone.length();
              radiusScale = 1.0 + Math.sin(age * 2.0 * currentMoveSpeed - dist * 0.05) * 0.15 * currentMoveFreq;
              angle += dist * 0.02 * currentMoveFreq; // Twist spiral
            }

            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            const rx = toDrone.x * cos - toDrone.z * sin;
            const rz = toDrone.x * sin + toDrone.z * cos;

            dummy.position.set(
              currentCenter.x + rx * radiusScale,
              dummy.position.y, // Maintain current height
              currentCenter.z + rz * radiusScale
            );
          } else if (currentMoveEffect === 'expand') {
            const toDrone = new THREE.Vector3().subVectors(dummy.position, currentCenter);
            const pulseScale = 1.0 + Math.sin(age * 3.0 * currentMoveSpeed) * 0.2 * currentMoveFreq;

            dummy.position.set(
              currentCenter.x + toDrone.x * pulseScale,
              dummy.position.y,
              currentCenter.z + toDrone.z * pulseScale
            );
          }

          dummy.updateMatrix();
          this.instancedMesh.setMatrixAt(i, dummy.matrix);

          // --- ÁP DỤNG HIỆU ỨNG ÁNH SÁNG (LIGHT EFFECT) ---
          const colA = stepA.colors[i] || this.state.colors[i];
          const colB = stepB.colors[i] || colA;
          color.copy(colA).lerp(colB, t);

          if (currentLightEffect === 'strobe') {
            const p = Math.sin(age * 15.0 * currentLightSpeed + (i * 0.5));
            if (p < 0) color.multiplyScalar(1.0 - 0.9 * currentLightFreq);
          } else if (currentLightEffect === 'shimmer') {
            const flicker = 1.0 + (Math.random() - 0.5) * 0.8 * currentLightFreq * Math.sin(age * 10 * currentLightSpeed);
            color.multiplyScalar(Math.max(0, flicker));
          } else if (currentLightEffect === 'pulse-color') {
            const factor = (1.0 - 0.5 * currentLightFreq) + (0.5 * currentLightFreq) * Math.sin(age * Math.PI * 2.0 * currentLightSpeed + (i * 0.1));
            color.multiplyScalar(factor);
          } else if (currentLightEffect === 'rainbow') {
            const hue = (age * 0.1 * currentLightSpeed + (i * 0.01 * currentLightFreq)) % 1.0;
            color.setHSL(hue, 1.0, 0.5);
          } else if (currentLightEffect === 'wave-light') {
            const dist = dummy.position.distanceTo(currentCenter);
            const waveFactor = (1.0 - 0.5 * currentLightFreq) + (0.5 * currentLightFreq) * Math.sin(age * 5.0 * currentLightSpeed - dist * 0.2);
            color.multiplyScalar(waveFactor);
          }

          this.instancedMesh.setColorAt(i, color);
        }
        this.instancedMesh.instanceMatrix.needsUpdate = true;
        if (this.instancedMesh.instanceColor) {
          this.instancedMesh.instanceColor.needsUpdate = true;
        }

        // Interpolate and update center + pivot lines during active playback
        if (this.centerHelper) {
          this.centerHelper.position.copy(currentCenter);
          this.centerHelper.visible = !!this.state.showCenter && !this.state.isCenterSelected;

          if (this.state.showPivotLines && count > 0) {
            const linePoints = [];
            const tempDronePos = new THREE.Vector3();
            for (let i = 0; i < count; i++) {
              this.instancedMesh.getMatrixAt(i, dummy.matrix);
              tempDronePos.setFromMatrixPosition(dummy.matrix);
              linePoints.push(tempDronePos.clone());
              linePoints.push(currentCenter.clone());
            }
            this.pivotLines.geometry.setFromPoints(linePoints);
            this.pivotLines.visible = true;
          } else {
            this.pivotLines.visible = false;
          }
        }
      }
    }
  }
}
