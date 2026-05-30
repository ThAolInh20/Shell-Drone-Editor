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
      
      const maxTime = this.state.getMaxPlaybackTime();

      const timeDiv = document.getElementById('playback-time');
      if (timeDiv) {
        const ms = Math.floor(this.state.playbackTime);
        const sec = Math.floor(ms / 1000);
        const millis = ms % 1000;
        timeDiv.textContent = `${sec.toString().padStart(2, '0')}:${millis.toString().padStart(3, '0')}`;
      }

      if (this.state.playbackTime >= maxTime) {
        this.state.playbackTime = 0; // Loop playback
      }

      const steps = this.state.steps;
      if (!steps || steps.length === 0) return;

      let stepA = steps[0];
      let stepB = steps[steps.length - 1];
      let stepPrev = null;

      if (steps.length > 1) {
        for (let s = 0; s < steps.length - 1; s++) {
          if (this.state.playbackTime >= steps[s].time && this.state.playbackTime <= steps[s + 1].time) {
            stepA = steps[s];
            stepB = steps[s + 1];
            if (s > 0) {
              stepPrev = steps[s - 1];
            } else {
              stepPrev = steps[steps.length - 1]; // Wraps around for seamless loop transition
            }
            break;
          }
        }
        if (this.state.playbackTime > stepB.time) {
          stepA = stepB;
          stepPrev = steps[steps.length - 2];
        }
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

      const holdProgress = holdTime > 0 ? THREE.MathUtils.clamp((this.state.playbackTime - stepA.time) / holdTime, 0.0, 1.0) : 1.0;

      const dummy = new THREE.Object3D();
      const color = new THREE.Color();
      const count = this.state.positions.length;
      const age = this.state.playbackTime / 1000; // in seconds

      const fadeA = 1.0 - t;
      const fadeB = t;

      // Helper function to calculate the offset and scale factor of a movement effect
      const getMoveEffectOffset = (effectType, basePos, centerPos, speed, freq, index) => {
        const offset = new THREE.Vector3();
        let scaleFactor = 1.0;
        if (effectType === 'none' || !effectType) return { offset, scaleFactor };

        if (effectType === 'wave') {
          offset.y = Math.sin(age * 3.0 * speed + (index * 0.1)) * 2.0 * freq;
        } else if (effectType === 'swing') {
          offset.x = Math.sin(age * 2.0 * speed + (index * 0.1)) * 2.5 * freq;
        } else if (effectType === 'pulse') {
          scaleFactor = 1.0 + Math.sin(age * Math.PI * 2 * speed + (index * 0.1)) * 0.5 * freq;
        } else if (effectType === 'orbit' || effectType === 'spiral') {
          const toDrone = new THREE.Vector3().subVectors(basePos, centerPos);
          let angle = age * 0.6 * speed;
          let radiusScale = 1.0;

          if (effectType === 'spiral') {
            const dist = toDrone.length();
            radiusScale = 1.0 + Math.sin(age * 2.0 * speed - dist * 0.05) * 0.15 * freq;
            angle += dist * 0.02 * freq;
          }

          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          const rx = toDrone.x * cos - toDrone.z * sin;
          const rz = toDrone.x * sin + toDrone.z * cos;

          const rotatedPos = new THREE.Vector3(
            centerPos.x + rx * radiusScale,
            basePos.y,
            centerPos.z + rz * radiusScale
          );
          offset.subVectors(rotatedPos, basePos);
        } else if (effectType === 'expand') {
          const toDrone = new THREE.Vector3().subVectors(basePos, centerPos);
          const pulseScale = 1.0 + Math.sin(age * 3.0 * speed) * 0.2 * freq;
          const expandedPos = new THREE.Vector3(
            centerPos.x + toDrone.x * pulseScale,
            basePos.y,
            centerPos.z + toDrone.z * pulseScale
          );
          offset.subVectors(expandedPos, basePos);
        }

        return { offset, scaleFactor };
      };

      // Helper function to apply light effects smoothly
      const getLightEffectColor = (effectType, baseColor, speed, freq, dummyPos, centerPos, fade, index, sparkleColor) => {
        const col = baseColor.clone();
        if (effectType === 'none' || !effectType || fade <= 0.001) return col;

        if (effectType === 'blackout') {
          return col.setRGB(0, 0, 0);
        } else if (effectType === 'sparkle-spark') {
          const flicker = Math.sin(age * 12.0 * speed + (index * 7.3)) * 0.5 + 0.5;
          const threshold = 1.0 - (freq * 0.3);
          const isSpark = flicker > threshold;
          const sparkCol = sparkleColor || new THREE.Color(1, 1, 1);
          const targetCol = isSpark ? sparkCol.clone() : new THREE.Color(0, 0, 0);
          return col.lerp(targetCol, fade);
        } else if (effectType === 'patch-spark') {
          const patchX = Math.floor(dummyPos.x / 10.0);
          const patchZ = Math.floor(dummyPos.z / 10.0);
          const noise = Math.sin(patchX * 12.9898 + patchZ * 78.233 + age * 6.0 * speed) * 0.5 + 0.5;
          const threshold = 1.0 - (freq * 0.3);
          const isSpark = noise > threshold;
          const sparkCol = sparkleColor || new THREE.Color(1, 1, 1);
          const targetCol = isSpark ? sparkCol.clone() : new THREE.Color(0, 0, 0);
          return col.lerp(targetCol, fade);
        } else if (effectType === 'strobe') {
          const p = Math.sin(age * 15.0 * speed + (index * 0.5));
          const factor = p < 0 ? (1.0 - 0.9 * freq) : 1.0;
          const blendedFactor = THREE.MathUtils.lerp(1.0, factor, fade);
          col.multiplyScalar(blendedFactor);
        } else if (effectType === 'shimmer') {
          const flicker = 1.0 + (Math.random() - 0.5) * 0.8 * freq * Math.sin(age * 10 * speed);
          const factor = Math.max(0, flicker);
          const blendedFactor = THREE.MathUtils.lerp(1.0, factor, fade);
          col.multiplyScalar(blendedFactor);
        } else if (effectType === 'pulse-color') {
          const factor = (1.0 - 0.5 * freq) + (0.5 * freq) * Math.sin(age * Math.PI * 2.0 * speed + (index * 0.1));
          const blendedFactor = THREE.MathUtils.lerp(1.0, factor, fade);
          col.multiplyScalar(blendedFactor);
        } else if (effectType === 'rainbow') {
          const hue = (age * 0.1 * speed + (index * 0.01 * freq)) % 1.0;
          const rainbowCol = new THREE.Color().setHSL(hue, 1.0, 0.5);
          col.lerp(rainbowCol, fade);
        } else if (effectType === 'wave-light') {
          const dist = dummyPos.distanceTo(centerPos);
          const factor = (1.0 - 0.5 * freq) + (0.5 * freq) * Math.sin(age * 5.0 * speed - dist * 0.2);
          const blendedFactor = THREE.MathUtils.lerp(1.0, factor, fade);
          col.multiplyScalar(blendedFactor);
        }

        return col;
      };



      for (let i = 0; i < count; i++) {
        const group = this.state.particleGroups[i] || 'Default';
        const configA = this.state.getGroupConfigForStep(group, stepA);
        const configB = this.state.getGroupConfigForStep(group, stepB);

        const defaultCenter = new THREE.Vector3(0, 20, 0);
        const centerA = configA.center || defaultCenter;
        const centerB = configB.center || defaultCenter;
        const currentCenter = new THREE.Vector3().lerpVectors(centerA, centerB, t);

        const posA = stepA.positions[i] || this.state.positions[i];
        const posB = stepB.positions[i] || posA;

        // Interpolate Hold Move speed and frequency
        const speedMoveA = configA.holdMoveSpeed !== undefined ? configA.holdMoveSpeed : 1.0;
        const speedMoveB = configB.holdMoveSpeed !== undefined ? configB.holdMoveSpeed : 1.0;
        const currentMoveSpeed = THREE.MathUtils.lerp(speedMoveA, speedMoveB, t);

        const freqMoveA = configA.holdMoveFreq !== undefined ? configA.holdMoveFreq : 1.0;
        const freqMoveB = configB.holdMoveFreq !== undefined ? configB.holdMoveFreq : 1.0;
        const currentMoveFreq = THREE.MathUtils.lerp(freqMoveA, freqMoveB, t);



        // Retrieve transition parameters from the destination step B (transitioning to step B)
        const currentTransMoveSpeed = configB.transitionMoveSpeed !== undefined ? configB.transitionMoveSpeed : 1.0;
        const currentTransMoveFreq = configB.transitionMoveFreq !== undefined ? configB.transitionMoveFreq : 1.0;
        const currentTransLightSpeed = configB.transitionLightSpeed !== undefined ? configB.transitionLightSpeed : 1.0;
        const currentTransLightFreq = configB.transitionLightFreq !== undefined ? configB.transitionLightFreq : 1.0;

        // Apply transition mode & effects from the destination step B
        const transMoveEff = configB.transitionMoveEffect || 'none';
        const transLightEff = configB.transitionLightEffect || 'none';
        const mode = configB.transitionMode || 'transform';

        let basePos = new THREE.Vector3();

        if (transMoveEff === 'arc' && t > 0.0 && t < 1.0) {
          basePos.lerpVectors(posA, posB, t);
          const dist = posA.distanceTo(posB);
          const arcHeight = Math.max(8, dist * 0.2) * Math.sin(t * Math.PI);
          basePos.y += arcHeight;
        } else if (transMoveEff === 'spiral' && t > 0.0 && t < 1.0) {
          const relA = new THREE.Vector3().subVectors(posA, centerA);
          const relB = new THREE.Vector3().subVectors(posB, centerB);
          const relPos = new THREE.Vector3().lerpVectors(relA, relB, t);
          const spinAngle = (1.0 - t) * Math.PI * 2.0 * (i % 2 === 0 ? 1 : -1) * currentTransMoveSpeed;
          const cos = Math.cos(spinAngle);
          const sin = Math.sin(spinAngle);
          const rx = relPos.x * cos - relPos.z * sin;
          const rz = relPos.x * sin + relPos.z * cos;
          basePos.set(currentCenter.x + rx, currentCenter.y + relPos.y, currentCenter.z + rz);
        } else if (transMoveEff === 'wave-delay' && t > 0.0 && t < 1.0) {
          const delay = (i % 10) * 0.04;
          let localT = (t - delay) / (1.0 - 0.36);
          localT = THREE.MathUtils.clamp(localT, 0.0, 1.0);
          localT = localT * localT * (3 - 2 * localT);
          basePos.lerpVectors(posA, posB, localT);
        } else {
          // Default transition mode (transform vs move)
          if (mode === 'move') {
            const relA = new THREE.Vector3().subVectors(posA, centerA);
            const relB = new THREE.Vector3().subVectors(posB, centerB);
            const relPos = new THREE.Vector3().lerpVectors(relA, relB, t);
            basePos.addVectors(currentCenter, relPos);
          } else {
            basePos.lerpVectors(posA, posB, t);
          }
        }

        // Apply mathematical effects with smooth transition (fading)
        const droneEffectA = stepA.effects ? (stepA.effects[i] || 'none') : 'none';
        const droneEffectB = stepB.effects ? (stepB.effects[i] || 'none') : 'none';

        const holdMoveEffectA = (configA.holdMoveEffect && configA.holdMoveEffect !== 'none') ? configA.holdMoveEffect : (['wave', 'swing', 'pulse'].includes(droneEffectA) ? droneEffectA : 'none');
        const holdMoveEffectB = (configB.holdMoveEffect && configB.holdMoveEffect !== 'none') ? configB.holdMoveEffect : (['wave', 'swing', 'pulse'].includes(droneEffectB) ? droneEffectB : 'none');

        // Calculate blended hold movement offsets
        const resA = getMoveEffectOffset(holdMoveEffectA, posA, centerA, speedMoveA, freqMoveA, i);
        const resB = getMoveEffectOffset(holdMoveEffectB, posB, centerB, speedMoveB, freqMoveB, i);

        const blendedOffset = new THREE.Vector3().addVectors(
          resA.offset.clone().multiplyScalar(fadeA),
          resB.offset.clone().multiplyScalar(fadeB)
        );

        let blendedScale = (resA.scaleFactor - 1.0) * fadeA + (resB.scaleFactor - 1.0) * fadeB + 1.0;

        // Apply transition movement effect if active (fades in and out during transition)
        const isTransMove = ['wave', 'swing', 'pulse', 'orbit', 'spiral', 'expand'].includes(transMoveEff);
        if (isTransMove && t > 0.0 && t < 1.0) {
          const fadeTrans = Math.sin(t * Math.PI);
          const resTrans = getMoveEffectOffset(transMoveEff, basePos, currentCenter, currentTransMoveSpeed, currentTransMoveFreq, i);
          blendedOffset.add(resTrans.offset.clone().multiplyScalar(fadeTrans));
          blendedScale += (resTrans.scaleFactor - 1.0) * fadeTrans;
        }

        dummy.position.addVectors(basePos, blendedOffset);
        dummy.scale.set(blendedScale, blendedScale, blendedScale);
        dummy.updateMatrix();
        this.instancedMesh.setMatrixAt(i, dummy.matrix);

        // --- ÁP DỤNG HIỆU ỨNG ÁNH SÁNG (LIGHT EFFECT) ---
        const colA = (stepA.colors && stepA.colors[i]) ? stepA.colors[i] : (this.state.colors[i] || new THREE.Color(1, 1, 1));

        // Apply Landing Color Effect (transition from black to step color colA) during the hold phase
        const landingLightEffA = configA.landingLightEffect || 'none';
        const landingLightSpeed = configA.landingLightSpeed !== undefined ? configA.landingLightSpeed : 1.0;
        const landingLightFreq = configA.landingLightFreq !== undefined ? configA.landingLightFreq : 1.0;

        if (landingLightEffA === 'none' || landingLightEffA === '') {
          color.copy(colA);
        } else {
          const colPrev = new THREE.Color(0, 0, 0);
          const progress = THREE.MathUtils.clamp(holdProgress * landingLightSpeed, 0.0, 1.0);

          if (landingLightEffA === 'radial') {
            const dist = dummy.position.distanceTo(centerA);
            const delay = dist * 0.03 * landingLightFreq;
            const maxDelay = 0.8;
            const scaledDelay = Math.min(delay, maxDelay);
            let localT = THREE.MathUtils.clamp((progress * (1.0 + scaledDelay)) - scaledDelay, 0.0, 1.0);
            localT = localT * localT * (3 - 2 * localT);
            color.copy(colPrev).lerp(colA, localT);
          } else if (landingLightEffA === 'linear-lr') {
            const relX = dummy.position.x - centerA.x;
            const delay = relX * 0.03 * landingLightFreq;
            const scaledDelay = THREE.MathUtils.clamp(delay, -0.4, 0.4);
            let localT = THREE.MathUtils.clamp(progress - scaledDelay, 0.0, 1.0);
            localT = localT * localT * (3 - 2 * localT);
            color.copy(colPrev).lerp(colA, localT);
          } else if (landingLightEffA === 'linear-rl') {
            const relX = centerA.x - dummy.position.x;
            const delay = relX * 0.03 * landingLightFreq;
            const scaledDelay = THREE.MathUtils.clamp(delay, -0.4, 0.4);
            let localT = THREE.MathUtils.clamp(progress - scaledDelay, 0.0, 1.0);
            localT = localT * localT * (3 - 2 * localT);
            color.copy(colPrev).lerp(colA, localT);
          } else {
            color.copy(colA);
          }
        }

        // Apply transition light effect if active (Flight Light Eff)
        // Rule: Only active for 95% of flight transition time, remaining 5% is blackout
        if (t > 0.0 && t < 1.0) {
          if (t >= 0.95) {
            color.setRGB(0, 0, 0);
          } else {
            const isTransLight = ['strobe', 'shimmer', 'pulse-color', 'rainbow', 'wave-light', 'sparkle-spark', 'patch-spark', 'blackout'].includes(transLightEff);
            if (isTransLight) {
              const normT = t / 0.95;
              const fadeTrans = Math.sin(normT * Math.PI);
              const transSparkleColor = new THREE.Color(configA.transitionSparkleColor || '#ffffff');
              const transCol = getLightEffectColor(transLightEff, color, currentTransLightSpeed, currentTransLightFreq, dummy.position, currentCenter, fadeTrans, i, transSparkleColor);
              color.copy(transCol);

              // Smoothly fade out the entire color to black as it approaches t = 0.95 (end of transition light)
              if (transLightEff !== 'blackout') {
                const fadeToBlack = Math.cos(normT * Math.PI * 0.5);
                color.multiplyScalar(fadeToBlack);
              }
            }
          }
        }

        this.instancedMesh.setColorAt(i, color);
      }

      this.instancedMesh.instanceMatrix.needsUpdate = true;
      if (this.instancedMesh.instanceColor) {
        this.instancedMesh.instanceColor.needsUpdate = true;
      }

      // Interpolate and update center + pivot lines of the active group during active playback
      if (this.centerHelper) {
        const activeConfigA = this.state.getGroupConfigForStep(this.state.activeGroup, stepA);
        const activeConfigB = this.state.getGroupConfigForStep(this.state.activeGroup, stepB);
        let activeCenter = new THREE.Vector3(0, 20, 0);
        
        if (activeConfigA && activeConfigB) {
          activeCenter.lerpVectors(activeConfigA.center || new THREE.Vector3(0, 20, 0), activeConfigB.center || new THREE.Vector3(0, 20, 0), t);
        }
        
        this.centerHelper.position.copy(activeCenter);
        this.centerHelper.visible = !!this.state.showCenter && !this.state.isCenterSelected;

        if (this.state.showPivotLines && count > 0) {
          const linePoints = [];
          const tempDronePos = new THREE.Vector3();
          for (let i = 0; i < count; i++) {
            this.instancedMesh.getMatrixAt(i, dummy.matrix);
            tempDronePos.setFromMatrixPosition(dummy.matrix);
            linePoints.push(tempDronePos.clone());
            linePoints.push(activeCenter.clone());
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
