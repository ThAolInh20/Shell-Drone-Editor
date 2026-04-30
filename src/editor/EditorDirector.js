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

  setupEvents() {
    window.addEventListener('pointerdown', this.onPointerDown.bind(this));
    window.addEventListener('keydown', this.onKeyDown.bind(this));
  }

  onPointerDown(event) {
    if (event.button !== 0) return; // Only left click
    if (event.target !== this.renderer.instance.domElement) return; // Only interact with canvas
    if (this.gizmoSystem.isHovering()) return; // Don't select if interacting with Gizmo

    // Calculate mouse position in normalized device coordinates
    // (-1 to +1) for both components
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.cameraManager.instance);

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
          if (this.state.playbackTime >= steps[i].time && this.state.playbackTime <= steps[i+1].time) {
            stepA = steps[i];
            stepB = steps[i+1];
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
        
        const dummy = new THREE.Object3D();
        const color = new THREE.Color();
        const count = this.state.positions.length;
        
        for (let i = 0; i < count; i++) {
          const posA = stepA.positions[i] || this.state.positions[i];
          const posB = stepB.positions[i] || posA;
          
          dummy.position.lerpVectors(posA, posB, t);
          dummy.scale.set(1, 1, 1);
          
          // Apply mathematical effects
          const droneEffectA = stepA.effects ? (stepA.effects[i] || 'none') : 'none';
          const droneEffectB = stepB.effects ? (stepB.effects[i] || 'none') : 'none';
          
          const holdEffectA = (stepA.holdEffect && stepA.holdEffect !== 'none') ? stepA.holdEffect : droneEffectA;
          const holdEffectB = (stepB.holdEffect && stepB.holdEffect !== 'none') ? stepB.holdEffect : droneEffectB;
          
          let currentEffect = 'none';
          if (t > 0.01 && t < 0.99) {
             currentEffect = stepA.transitionEffect || 'none';
          } else if (t <= 0.01) {
             currentEffect = holdEffectA;
          } else {
             currentEffect = holdEffectB;
          }
          
          const age = this.state.playbackTime / 1000; // in seconds
          
          if (currentEffect === 'wave') {
            dummy.position.y += Math.sin(age * 3.0 + (i * 0.1)) * 2.0;
          } else if (currentEffect === 'swing') {
            dummy.position.x += Math.sin(age * 2.0 + (i * 0.1)) * 2.5;
          } else if (currentEffect === 'pulse') {
            const p = 1.0 + Math.sin(age * Math.PI * 2 + (i * 0.1)) * 0.5;
            dummy.scale.set(p, p, p);
          }
          
          dummy.updateMatrix();
          this.instancedMesh.setMatrixAt(i, dummy.matrix);
          
          const colA = stepA.colors[i] || this.state.colors[i];
          const colB = stepB.colors[i] || colA;
          color.copy(colA).lerp(colB, t);
          
          if (currentEffect === 'strobe') {
            const p = Math.sin(age * 15.0 + (i * 0.5));
            if (p < 0) color.multiplyScalar(0.1);
          } else if (currentEffect === 'shimmer') {
            const flicker = 1.0 + (Math.random() - 0.5) * 0.8;
            color.multiplyScalar(Math.max(0, flicker));
          }
          
          this.instancedMesh.setColorAt(i, color);
        }
        this.instancedMesh.instanceMatrix.needsUpdate = true;
        if (this.instancedMesh.instanceColor) {
           this.instancedMesh.instanceColor.needsUpdate = true;
        }
      }
    }
  }
}
