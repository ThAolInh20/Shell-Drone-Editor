import * as THREE from 'three';

export class BaseFormationState {
  constructor() {
    this.name = "NewFormation";
    this.currentFilePath = null;
    this.positions = []; // Array of THREE.Vector3
    this.colors = []; // Array of THREE.Color
    this.particleGroups = []; // Array of strings matching positions index
    this.activeGroup = "Default";

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

    this.lineConstraints = [];

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
      isCenterSelected: this.isCenterSelected,
      lineConstraints: this.lineConstraints.map(lc => ({
        id: lc.id,
        anchorA: lc.anchorA,
        anchorB: lc.anchorB,
        intermediates: [...lc.intermediates]
      }))
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
    this.lineConstraints = snapshot.lineConstraints ? snapshot.lineConstraints.map(lc => ({
      id: lc.id,
      anchorA: lc.anchorA,
      anchorB: lc.anchorB,
      intermediates: [...lc.intermediates]
    })) : [];
  }

  updatePosition(index, newPos) {
    if (this.positions[index]) {
      this.positions[index].copy(newPos);
      this.updateLineConstraints();
      this.notify();
    }
  }

  updatePositions(entries) {
    for (const { index, pos } of entries) {
      if (this.positions[index]) {
        this.positions[index].copy(pos);
      }
    }
    this.updateLineConstraints();
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

  updateLineConstraints() {
    let changed = false;
    for (const lc of this.lineConstraints) {
      const posA = this.positions[lc.anchorA];
      const posB = this.positions[lc.anchorB];
      if (posA && posB) {
        const count = lc.intermediates.length;
        for (let i = 0; i < count; i++) {
          const idx = lc.intermediates[i];
          if (this.positions[idx]) {
            const t = (i + 1) / (count + 1);
            const newPos = new THREE.Vector3().lerpVectors(posA, posB, t);
            if (this.positions[idx].distanceToSquared(newPos) > 0.0001) {
              this.positions[idx].copy(newPos);
              changed = true;
            }
          }
        }
      }
    }
    return changed;
  }

  adjustConstraintsOnDeletion(deletedIndicesSortedDescending) {
    this.lineConstraints = this.lineConstraints.filter(lc => {
      // If anchorA or anchorB is deleted, the constraint is invalid
      if (deletedIndicesSortedDescending.includes(lc.anchorA) || deletedIndicesSortedDescending.includes(lc.anchorB)) {
        return false;
      }
      
      // Filter out deleted intermediates
      lc.intermediates = lc.intermediates.filter(idx => !deletedIndicesSortedDescending.includes(idx));
      
      // If no intermediates left, the constraint is invalid
      if (lc.intermediates.length === 0) {
        return false;
      }
      
      // Adjust remaining indices
      for (const deletedIdx of deletedIndicesSortedDescending) {
        if (lc.anchorA > deletedIdx) lc.anchorA--;
        if (lc.anchorB > deletedIdx) lc.anchorB--;
        lc.intermediates = lc.intermediates.map(idx => idx > deletedIdx ? idx - 1 : idx);
      }
      return true;
    });
  }

  selectAll() {
    this.isCenterSelected = false;
    this.selectedIndices.clear();
    for (let i = 0; i < this.positions.length; i++) {
      this.selectedIndices.add(i);
    }
    this.notify();
  }

  selectMultiple(indices) {
    this.isCenterSelected = false;
    this.selectedIndices.clear();
    for (const idx of indices) {
      if (idx >= 0 && idx < this.positions.length) {
        this.selectedIndices.add(idx);
      }
    }
    this.notify();
  }
}
