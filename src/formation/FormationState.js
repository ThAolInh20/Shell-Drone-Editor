import * as THREE from 'three';
import { BaseFormationState } from '../core/BaseFormationState.js';

export class FormationState extends BaseFormationState {
  constructor() {
    super();
    this.isClickToPlaceActive = false;
    this.guideMode = 'none'; // 'none', 'hologram', 'reference'
    
    this.ghostModelConfig = {
      position: new THREE.Vector3(0, 20, 0),
      scale: 1.0,
      rotationY: 0,
      opacity: 0.35,
      wireframe: false
    };

    this.referenceImageConfig = {
      url: null,
      fileName: '',
      position: new THREE.Vector3(0, 20, 0),
      scale: 40.0,
      rotationY: 0,
      opacity: 0.35,
      orientation: 'horizontal'
    };

    // Bezier control points for uốn cong drone
    this.bezierControlPoints = [
      new THREE.Vector3(-30, 20, 0),
      new THREE.Vector3(0, 35, 0),
      new THREE.Vector3(30, 20, 0)
    ];
    this.isBezierEditActive = false;
  }

  createHistorySnapshot() {
    const snapshot = super.createHistorySnapshot();
    snapshot.isClickToPlaceActive = this.isClickToPlaceActive;
    snapshot.guideMode = this.guideMode;
    snapshot.ghostModelConfig = {
      position: { x: this.ghostModelConfig.position.x, y: this.ghostModelConfig.position.y, z: this.ghostModelConfig.position.z },
      scale: this.ghostModelConfig.scale,
      rotationY: this.ghostModelConfig.rotationY,
      opacity: this.ghostModelConfig.opacity,
      wireframe: this.ghostModelConfig.wireframe
    };
    snapshot.referenceImageConfig = {
      url: this.referenceImageConfig.url,
      fileName: this.referenceImageConfig.fileName,
      position: { x: this.referenceImageConfig.position.x, y: this.referenceImageConfig.position.y, z: this.referenceImageConfig.position.z },
      scale: this.referenceImageConfig.scale,
      rotationY: this.referenceImageConfig.rotationY,
      opacity: this.referenceImageConfig.opacity,
      orientation: this.referenceImageConfig.orientation
    };
    snapshot.bezierControlPoints = this.bezierControlPoints.map(p => ({ x: p.x, y: p.y, z: p.z }));
    snapshot.isBezierEditActive = this.isBezierEditActive;
    return snapshot;
  }

  restoreFromSnapshot(snapshot) {
    super.restoreFromSnapshot(snapshot);
    this.isClickToPlaceActive = snapshot.isClickToPlaceActive !== undefined ? snapshot.isClickToPlaceActive : false;
    this.guideMode = snapshot.guideMode !== undefined ? snapshot.guideMode : 'none';
    
    if (snapshot.ghostModelConfig) {
      this.ghostModelConfig = {
        position: new THREE.Vector3(snapshot.ghostModelConfig.position.x, snapshot.ghostModelConfig.position.y, snapshot.ghostModelConfig.position.z),
        scale: snapshot.ghostModelConfig.scale,
        rotationY: snapshot.ghostModelConfig.rotationY,
        opacity: snapshot.ghostModelConfig.opacity,
        wireframe: snapshot.ghostModelConfig.wireframe
      };
    }
    
    if (snapshot.referenceImageConfig) {
      this.referenceImageConfig = {
        url: snapshot.referenceImageConfig.url,
        fileName: snapshot.referenceImageConfig.fileName,
        position: new THREE.Vector3(snapshot.referenceImageConfig.position.x, snapshot.referenceImageConfig.position.y, snapshot.referenceImageConfig.position.z),
        scale: snapshot.referenceImageConfig.scale,
        rotationY: snapshot.referenceImageConfig.rotationY,
        opacity: snapshot.referenceImageConfig.opacity,
        orientation: snapshot.referenceImageConfig.orientation
      };
    }
    
    if (snapshot.bezierControlPoints) {
      this.bezierControlPoints = snapshot.bezierControlPoints.map(p => new THREE.Vector3(p.x, p.y, p.z));
    } else {
      this.bezierControlPoints = [
        new THREE.Vector3(-30, 20, 0),
        new THREE.Vector3(0, 35, 0),
        new THREE.Vector3(30, 20, 0)
      ];
    }
    this.isBezierEditActive = snapshot.isBezierEditActive !== undefined ? snapshot.isBezierEditActive : false;
  }

  deleteSelected() {
    if (this.selectedIndices.size === 0) return;

    const sorted = Array.from(this.selectedIndices).sort((a, b) => b - a);

    for (const index of sorted) {
      this.positions.splice(index, 1);
      this.colors.splice(index, 1);
      this.particleGroups.splice(index, 1);
    }

    this.selectedIndices.clear();
    this.saveStateToHistory();
    this.notify();
  }

  duplicateSelected() {
    if (this.selectedIndices.size === 0) return;

    const newIndices = new Set();
    const startIndex = this.positions.length;
    let i = 0;

    const existingGroups = new Set(this.particleGroups);
    const groupMapping = new Map();
    for (const index of this.selectedIndices) {
      const group = this.particleGroups[index] || 'Duplicate';
      if (!groupMapping.has(group)) {
        groupMapping.set(group, this.getUniqueGroupNameForPaste(group, existingGroups));
      }
    }

    for (const index of this.selectedIndices) {
      const pos = this.positions[index];
      const col = this.colors[index];
      const group = this.particleGroups[index] || 'Duplicate';
      const newGroup = groupMapping.get(group);

      this.positions.push(new THREE.Vector3(pos.x + 2, pos.y, pos.z + 2));
      this.colors.push(col.clone());
      this.particleGroups.push(newGroup);

      newIndices.add(startIndex + i);
      i++;
    }

    this.selectedIndices = newIndices;
    this.saveStateToHistory();
    this.notify();
  }

  copyToClipboard() {
    if (this.selectedIndices.size === 0) return;

    this.clipboard = {
      positions: [],
      colors: [],
      particleGroups: []
    };

    for (const index of this.selectedIndices) {
      this.clipboard.positions.push(this.positions[index].clone());
      this.clipboard.colors.push(this.colors[index].clone());
      this.clipboard.particleGroups.push(this.particleGroups[index] || 'Pasted');
    }
  }

  pasteFromClipboard() {
    if (!this.clipboard || this.clipboard.positions.length === 0) return;

    const newIndices = new Set();
    const startIndex = this.positions.length;
    let i = 0;

    const existingGroups = new Set(this.particleGroups);
    const groupMapping = new Map();
    for (const group of this.clipboard.particleGroups) {
      const grp = group || 'Pasted';
      if (!groupMapping.has(grp)) {
        groupMapping.set(grp, this.getUniqueGroupNameForPaste(grp, existingGroups));
      }
    }

    for (let c = 0; c < this.clipboard.positions.length; c++) {
      const pos = this.clipboard.positions[c];
      const col = this.clipboard.colors[c];
      const group = this.clipboard.particleGroups[c] || 'Pasted';
      const newGroup = groupMapping.get(group);

      this.positions.push(new THREE.Vector3(pos.x + 2, pos.y, pos.z + 2));
      this.colors.push(col.clone());
      this.particleGroups.push(newGroup);

      newIndices.add(startIndex + i);
      i++;
    }

    this.selectedIndices = newIndices;
    this.saveStateToHistory();
    this.notify();
  }

  updateBezierControlPoint(index, newPos) {
    if (this.bezierControlPoints[index]) {
      this.bezierControlPoints[index].copy(newPos);
      this.notify();
    }
  }
}
