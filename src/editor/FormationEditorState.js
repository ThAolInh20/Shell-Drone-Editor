import * as THREE from 'three';

export class FormationEditorState {
  constructor() {
    this.name = "NewFormat";
    this.droneCount = 100;
    this.positions = []; // Array of THREE.Vector3
    this.colors = []; // Array of THREE.Color
    this.particleGroups = []; // Array of strings matching positions index
    
    // Selection state
    this.selectedIndices = new Set();
    
    // Undo/Redo stack
    // Format of history: { positions: Array<{x, y, z}> }
    this.history = [];
    this.historyIndex = -1;

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
    // Drop future history if we're branching
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }
    
    const snapshot = {
      positions: this.positions.map(p => ({ x: p.x, y: p.y, z: p.z })),
      colors: this.colors.map(c => c.getHex()),
      particleGroups: [...this.particleGroups]
    };
    
    this.history.push(snapshot);
    if (this.history.length > 50) { // Limit history size
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
    // Clear selection on undo/redo to avoid invalid states
    this.selectedIndices.clear();
  }

  loadFormat(data) {
    this.name = data.name || "LoadedFormat";
    this.droneCount = data.droneCount || 0;
    this.positions = (data.positions || []).map(p => new THREE.Vector3(p.x, p.y, p.z));
    this.colors = (data.colors || []).map(c => new THREE.Color(c));
    if (this.colors.length !== this.positions.length) {
      this.colors = new Array(this.positions.length).fill().map(() => new THREE.Color(0xffffff));
    }
    this.particleGroups = new Array(this.positions.length).fill('Imported');
    this.selectedIndices.clear();
    
    // Reset history
    this.history = [];
    this.historyIndex = -1;
    this.saveStateToHistory();
  }

  exportFormat() {
    return {
      name: this.name,
      droneCount: this.positions.length,
      positions: this.positions.map(p => ({ x: p.x, y: p.y, z: p.z })),
      colors: this.colors.map(c => c.getHex())
    };
  }

  updatePosition(index, newPos) {
    if (this.positions[index]) {
      this.positions[index].copy(newPos);
      this.notify();
    }
  }

  updatePositions(entries) {
    for (const {index, pos} of entries) {
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
  }

  select(index, multi = false) {
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
    this.notify();
  }

  deleteSelected() {
    if (this.selectedIndices.size === 0) return;
    
    // Sort indices descending so we can splice without messing up earlier indices
    const sorted = Array.from(this.selectedIndices).sort((a, b) => b - a);
    
    for (const index of sorted) {
      this.positions.splice(index, 1);
      this.colors.splice(index, 1);
      this.particleGroups.splice(index, 1);
    }
    
    this.selectedIndices.clear();
    this.saveStateToHistory();
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
      
      // Offset slightly so it's visible
      this.positions.push(new THREE.Vector3(pos.x + 2, pos.y, pos.z + 2));
      this.colors.push(col.clone());
      this.particleGroups.push(group + '_copy');
      
      newIndices.add(startIndex + i);
      i++;
    }
    
    this.selectedIndices = newIndices;
    this.saveStateToHistory();
  }

  getUniqueGroups() {
    const groups = new Set();
    for (const g of this.particleGroups) {
      if (!g) continue;
      groups.add(g);
      const parts = g.split('/');
      let current = '';
      for (let i = 0; i < parts.length - 1; i++) {
        current += (current ? '/' : '') + parts[i];
        groups.add(current);
      }
    }
    return [...groups].sort();
  }

  selectGroup(groupName, multi = false) {
    if (!multi) {
      this.selectedIndices.clear();
    }
    
    const prefix = groupName + '/';
    for (let i = 0; i < this.particleGroups.length; i++) {
      if (this.particleGroups[i] === groupName || this.particleGroups[i].startsWith(prefix)) {
        this.selectedIndices.add(i);
      }
    }
    this.notify();
  }
}
