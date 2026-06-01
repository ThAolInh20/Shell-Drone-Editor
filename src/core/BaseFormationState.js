import * as THREE from 'three';

export class BaseFormationState {
  constructor() {
    this.name = "NewFormation";
    this.currentFilePath = null;
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

    const snapshot = this.createHistorySnapshot();

    this.history.push(snapshot);
    if (this.history.length > 50) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }
    this.notify();
  }

  createHistorySnapshot() {
    return {
      positions: this.positions.map(p => ({ x: p.x, y: p.y, z: p.z })),
      colors: this.colors.map(c => c.getHex()),
      particleGroups: [...this.particleGroups],
      center: { x: this.center.x, y: this.center.y, z: this.center.z },
      showCenter: this.showCenter,
      showPivotLines: this.showPivotLines,
      isCenterSelected: this.isCenterSelected
    };
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
    this.isCenterSelected = false;
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

  getUniqueGroupNameForPaste(originalGroupName, existingGroups) {
    const baseName = originalGroupName;
    let candidate = baseName + '_copy';
    if (!existingGroups.has(candidate)) {
      return candidate;
    }
    let counter = 1;
    while (true) {
      candidate = `${baseName}_copy_${counter}`;
      if (!existingGroups.has(candidate)) {
        return candidate;
      }
      counter++;
    }
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
