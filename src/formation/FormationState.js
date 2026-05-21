import * as THREE from 'three';

export class FormationState {
  constructor() {
    this.name = "NewFormation";
    this.positions = []; // Array of THREE.Vector3
    this.colors = []; // Array of THREE.Color
    this.particleGroups = []; // Array of strings matching positions index

    this.center = new THREE.Vector3(0, 20, 0);
    this.showCenter = true;
    this.showPivotLines = false;
    this.isCenterSelected = false;

    // Selection state
    this.selectedIndices = new Set();

    // Undo/Redo stack
    this.history = [];
    this.historyIndex = -1;
    
    // Clipboard for copy/paste
    this.clipboard = null;

    this.isClickToPlaceActive = false;
    this.ghostModelConfig = {
      position: new THREE.Vector3(0, 20, 0),
      scale: 1.0,
      rotationY: 0,
      opacity: 0.35,
      wireframe: false
    };

    this.listeners = [];
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    for (const listener of this.listeners) {
      listener(this);
    }
  }

  saveStateToHistory() {
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    const snapshot = {
      positions: this.positions.map(p => ({ x: p.x, y: p.y, z: p.z })),
      colors: this.colors.map(c => c.getHex()),
      particleGroups: [...this.particleGroups],
      center: { x: this.center.x, y: this.center.y, z: this.center.z },
      showCenter: this.showCenter,
      showPivotLines: this.showPivotLines,
      isCenterSelected: this.isCenterSelected,
      isClickToPlaceActive: this.isClickToPlaceActive,
      ghostModelConfig: {
        position: { x: this.ghostModelConfig.position.x, y: this.ghostModelConfig.position.y, z: this.ghostModelConfig.position.z },
        scale: this.ghostModelConfig.scale,
        rotationY: this.ghostModelConfig.rotationY,
        opacity: this.ghostModelConfig.opacity,
        wireframe: this.ghostModelConfig.wireframe
      }
    };

    this.history.push(snapshot);
    if (this.history.length > 50) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }
    this.notify();
  }

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.restoreFromSnapshot(this.history[this.historyIndex]);
      this.notify();
    }
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.restoreFromSnapshot(this.history[this.historyIndex]);
      this.notify();
    }
  }

  restoreFromSnapshot(snapshot) {
    this.positions = snapshot.positions.map(p => new THREE.Vector3(p.x, p.y, p.z));
    this.colors = snapshot.colors ? snapshot.colors.map(c => new THREE.Color(c)) : new Array(this.positions.length).fill().map(() => new THREE.Color(0xffffff));
    this.particleGroups = snapshot.particleGroups ? [...snapshot.particleGroups] : new Array(this.positions.length).fill('Default');
    this.center = snapshot.center ? new THREE.Vector3(snapshot.center.x, snapshot.center.y, snapshot.center.z) : new THREE.Vector3(0, 20, 0);
    this.showCenter = snapshot.showCenter !== undefined ? snapshot.showCenter : true;
    this.showPivotLines = snapshot.showPivotLines !== undefined ? snapshot.showPivotLines : false;
    this.isCenterSelected = snapshot.isCenterSelected !== undefined ? snapshot.isCenterSelected : false;
    
    this.isClickToPlaceActive = snapshot.isClickToPlaceActive !== undefined ? snapshot.isClickToPlaceActive : false;
    if (snapshot.ghostModelConfig) {
      this.ghostModelConfig = {
        position: new THREE.Vector3(snapshot.ghostModelConfig.position.x, snapshot.ghostModelConfig.position.y, snapshot.ghostModelConfig.position.z),
        scale: snapshot.ghostModelConfig.scale,
        rotationY: snapshot.ghostModelConfig.rotationY,
        opacity: snapshot.ghostModelConfig.opacity,
        wireframe: snapshot.ghostModelConfig.wireframe
      };
    }
    
    this.selectedIndices.clear();
  }

  updatePosition(index, newPos) {
    if (this.positions[index]) {
      this.positions[index].copy(newPos);
      this.notify();
    }
  }

  updatePositions(entries) {
    for (const { index, pos } of entries) {
      if (this.positions[index]) {
        this.positions[index].copy(pos);
      }
    }
    this.notify();
  }

  updateSelectionColor(hex) {
    if (this.selectedIndices.size === 0) return;

    for (const index of this.selectedIndices) {
      if (this.colors[index]) {
        this.colors[index].setHex(hex);
      }
    }
    this.saveStateToHistory();
    this.notify();
  }

  selectCenter() {
    this.selectedIndices.clear();
    this.isCenterSelected = true;
    this.notify();
  }

  deselectCenter() {
    if (this.isCenterSelected) {
      this.isCenterSelected = false;
      this.notify();
    }
  }

  select(index, multi = false) {
    this.isCenterSelected = false; // Deselect Center when selecting drone
    if (!multi) {
      this.selectedIndices.clear();
    }
    this.selectedIndices.add(index);
    this.notify();
  }

  deselect(index) {
    this.selectedIndices.delete(index);
    this.notify();
  }

  clearSelection() {
    this.selectedIndices.clear();
    this.isCenterSelected = false;
    this.notify();
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

    for (const index of this.selectedIndices) {
      const pos = this.positions[index];
      const col = this.colors[index];
      const group = this.particleGroups[index] || 'Duplicate';

      this.positions.push(new THREE.Vector3(pos.x + 2, pos.y, pos.z + 2));
      this.colors.push(col.clone());
      this.particleGroups.push(group + '_copy');

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

    for (let c = 0; c < this.clipboard.positions.length; c++) {
      const pos = this.clipboard.positions[c];
      const col = this.clipboard.colors[c];
      const group = this.clipboard.particleGroups[c];

      this.positions.push(new THREE.Vector3(pos.x + 2, pos.y, pos.z + 2));
      this.colors.push(col.clone());
      this.particleGroups.push(group + '_copy');

      newIndices.add(startIndex + i);
      i++;
    }

    this.selectedIndices = newIndices;
    this.saveStateToHistory();
    this.notify();
  }

  selectGroup(groupName, multi = false) {
    if (!multi) {
      this.selectedIndices.clear();
    }

    const prefix = groupName + '/';
    for (let i = 0; i < this.particleGroups.length; i++) {
      if (this.particleGroups[i] === groupName || (this.particleGroups[i] && this.particleGroups[i].startsWith(prefix))) {
        this.selectedIndices.add(i);
      }
    }
    this.notify();
  }

  getUniqueGroups() {
    const groups = new Set();
    for (const g of this.particleGroups) {
      if (g) {
        let currentPath = '';
        const parts = g.split('/');
        for (const part of parts) {
          currentPath += (currentPath ? '/' : '') + part;
          groups.add(currentPath);
        }
      }
    }
    return Array.from(groups).sort();
  }
}
