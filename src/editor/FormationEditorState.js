import * as THREE from 'three';

export class FormationEditorState {
  constructor() {
    this.name = "NewFormat";
    this.droneCount = 100;
    this.positions = []; // Array of THREE.Vector3
    this.colors = []; // Array of THREE.Color
    this.particleGroups = []; // Array of strings matching positions index
    this.effects = []; // Array of strings (e.g. 'none', 'wave', 'strobe')

    // Timeline state
    this.steps = [{
      id: 'step_0',
      time: 0,
      positions: [],
      colors: [],
      particleGroups: [],
      effects: [],
      transitionMode: 'transform', // 'transform' or 'move'
      transitionEffect: 'none'
    }];
    this.currentStepIndex = 0;
    this.isPlaying = false;
    this.playbackTime = 0;

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

  saveCurrentStep() {
    if (this.currentStepIndex >= 0 && this.currentStepIndex < this.steps.length) {
      this.steps[this.currentStepIndex].positions = this.positions.map(p => p.clone());
      this.steps[this.currentStepIndex].colors = this.colors.map(c => c.clone());
      this.steps[this.currentStepIndex].particleGroups = [...this.particleGroups];
      this.steps[this.currentStepIndex].effects = [...this.effects];
      this.recalculateTimes();
    }
  }

  loadStep(index) {
    this.saveCurrentStep();
    if (index >= 0 && index < this.steps.length) {
      this.currentStepIndex = index;
      const step = this.steps[index];
      this.positions = step.positions.map(p => p.clone());
      this.colors = step.colors.map(c => c.clone());
      this.particleGroups = [...step.particleGroups];
      this.effects = [...(step.effects || new Array(step.positions.length).fill('none'))];
      this.selectedIndices.clear(); // Clear selection when changing steps
      this.notify();
    }
  }

  addStep() {
    this.saveCurrentStep();
    const newStep = {
      id: 'step_' + Date.now(),
      time: 0,
      positions: this.positions.map(p => p.clone()),
      colors: this.colors.map(c => c.clone()),
      particleGroups: [...this.particleGroups],
      effects: [...this.effects],
      transitionMode: 'transform',
      transitionEffect: 'none',
      holdTime: 0,
      holdEffect: 'none'
    };

    this.steps.push(newStep);
    this.recalculateTimes();

    const newIndex = this.steps.findIndex(s => s.id === newStep.id);
    this.currentStepIndex = newIndex;
    this.notify();
  }

  removeStep(index) {
    if (this.steps.length <= 1) return; // Must have at least 1 step
    this.steps.splice(index, 1);
    this.currentStepIndex = 0;

    const step = this.steps[0];
    this.positions = step.positions.map(p => p.clone());
    this.colors = step.colors.map(c => c.clone());
    this.colors = step.colors.map(c => c.clone());
    this.particleGroups = [...step.particleGroups];
    this.effects = [...(step.effects || new Array(step.positions.length).fill('none'))];
    this.recalculateTimes();
    this.notify();
  }

  recalculateTimes() {
    const SPEED = 30.0; // Faster drone speed (m/s) for quick preview in Editor
    let currentTime = 0;

    for (let i = 0; i < this.steps.length; i++) {
      const step = this.steps[i];
      if (i === 0) {
        step.time = 0;
        currentTime = step.holdTime || 0;
      } else {
        const prevStep = this.steps[i - 1];

        // Calculate max distance to find transition duration
        let maxDist = 0;
        for (let j = 0; j < Math.min(step.positions.length, prevStep.positions.length); j++) {
          const p1 = prevStep.positions[j];
          const p2 = step.positions[j];
          if (p1 && p2) {
            const d = p1.distanceTo(p2);
            if (d > maxDist) maxDist = d;
          }
        }

        let flightTime = (maxDist / SPEED) * 1000;
        if (flightTime < 1000) flightTime = 1000; // minimum 1s flight time

        step.time = prevStep.time + (prevStep.holdTime || 0) + flightTime;
        currentTime = step.time + (step.holdTime || 0);
      }
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

    if (data.steps && data.steps.length > 0) {
      this.steps = data.steps.map((s, i) => ({
        id: 'step_' + i + '_' + Date.now(),
        time: s.time || i * 5000,
        positions: (s.positions || []).map(p => new THREE.Vector3(p.x, p.y, p.z)),
        colors: (s.colors || []).map(c => new THREE.Color(c)),
        particleGroups: s.particleGroups || new Array((s.positions || []).length).fill('Imported'),
        effects: s.effects || new Array((s.positions || []).length).fill('none'),
        transitionMode: s.transitionMode || 'transform',
        transitionEffect: s.transitionEffect || s.transitionLight || 'none',
        holdTime: s.holdTime || 0,
        holdEffect: s.holdEffect || 'none'
      }));
    } else {
      // Legacy support
      this.steps = [{
        id: 'step_0_' + Date.now(),
        time: 0,
        positions: (data.positions || []).map(p => new THREE.Vector3(p.x, p.y, p.z)),
        colors: (data.colors || []).map(c => new THREE.Color(c)),
        particleGroups: new Array(data.positions?.length || 0).fill('Imported'),
        effects: new Array(data.positions?.length || 0).fill('none'),
        transitionMode: 'transform',
        transitionEffect: 'none',
        holdTime: 0,
        holdEffect: 'none'
      }];
    }

    this.recalculateTimes();

    this.selectedIndices.clear();
    this.history = [];
    this.historyIndex = -1;
    this.currentStepIndex = 0;

    const step = this.steps[0];
    this.positions = step.positions.map(p => p.clone());
    this.colors = step.colors.map(c => c.clone());
    this.particleGroups = [...step.particleGroups];
    this.effects = [...step.effects];

    this.saveStateToHistory();
    this.notify();
  }

  exportFormat() {
    this.saveCurrentStep();
    this.recalculateTimes(); // Ensure absolute times are computed
    return {
      name: this.name,
      droneCount: this.positions.length,
      steps: this.steps.map(step => ({
        time: step.time, // We export time for scrubbing compatibility
        positions: step.positions.map(p => ({ x: p.x, y: p.y, z: p.z })),
        colors: step.colors.map(c => c.getHex()),
        particleGroups: step.particleGroups,
        effects: step.effects,
        transitionMode: step.transitionMode,
        transitionEffect: step.transitionEffect,
        holdTime: step.holdTime || 0,
        holdEffect: step.holdEffect || 'none'
      }))
    };
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

  updateSelectionEffect(effectName) {
    if (this.selectedIndices.size === 0) return;
    for (const index of this.selectedIndices) {
      this.effects[index] = effectName;
    }
    this.saveCurrentStep();
    this.saveStateToHistory();
    this.notify();
  }

  deleteSelected() {
    if (this.selectedIndices.size === 0) return;

    const sorted = Array.from(this.selectedIndices).sort((a, b) => b - a);

    for (const index of sorted) {
      this.positions.splice(index, 1);
      this.colors.splice(index, 1);
      this.particleGroups.splice(index, 1);
      this.effects.splice(index, 1);
    }

    for (const step of this.steps) {
      if (step === this.steps[this.currentStepIndex]) continue;

      for (const index of sorted) {
        step.positions.splice(index, 1);
        step.colors.splice(index, 1);
        step.particleGroups.splice(index, 1);
        step.effects.splice(index, 1);
      }
    }

    this.selectedIndices.clear();
    this.saveCurrentStep();
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
      const eff = this.effects[index] || 'none';

      this.positions.push(new THREE.Vector3(pos.x + 2, pos.y, pos.z + 2));
      this.colors.push(col.clone());
      this.particleGroups.push(group + '_copy');
      this.effects.push(eff);

      for (let sIndex = 0; sIndex < this.steps.length; sIndex++) {
        if (sIndex === this.currentStepIndex) continue;
        const step = this.steps[sIndex];
        const stepPos = step.positions[index] || pos;
        const stepCol = step.colors[index] || col;
        const stepGrp = step.particleGroups[index] || group;
        const stepEff = step.effects ? (step.effects[index] || eff) : eff;

        step.positions.push(new THREE.Vector3(stepPos.x + 2, stepPos.y, stepPos.z + 2));
        step.colors.push(stepCol.clone());
        step.particleGroups.push(stepGrp + '_copy');
        if (!step.effects) step.effects = [];
        step.effects.push(stepEff);
      }

      newIndices.add(startIndex + i);
      i++;
    }

    this.selectedIndices = newIndices;
    this.saveCurrentStep();
    this.saveStateToHistory();
    this.notify();
  }

  copyToClipboard() {
    if (this.selectedIndices.size === 0) return;

    this.clipboard = {
      positions: [],
      colors: [],
      particleGroups: [],
      effects: [],
      stepData: []
    };

    for (const index of this.selectedIndices) {
      this.clipboard.positions.push(this.positions[index].clone());
      this.clipboard.colors.push(this.colors[index].clone());
      this.clipboard.particleGroups.push(this.particleGroups[index] || 'Pasted');
      this.clipboard.effects.push(this.effects[index] || 'none');

      const stepInfo = [];
      for (const step of this.steps) {
        stepInfo.push({
          pos: step.positions[index] ? step.positions[index].clone() : this.positions[index].clone(),
          col: step.colors[index] ? step.colors[index].clone() : this.colors[index].clone(),
          grp: step.particleGroups[index] || 'Pasted',
          eff: step.effects && step.effects[index] ? step.effects[index] : 'none'
        });
      }
      this.clipboard.stepData.push(stepInfo);
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
      const eff = this.clipboard.effects[c];
      const stepData = this.clipboard.stepData[c];

      this.positions.push(new THREE.Vector3(pos.x + 2, pos.y, pos.z + 2));
      this.colors.push(col.clone());
      this.particleGroups.push(group + '_copy');
      this.effects.push(eff);

      for (let sIndex = 0; sIndex < this.steps.length; sIndex++) {
        if (sIndex === this.currentStepIndex) continue;
        const step = this.steps[sIndex];
        const sData = stepData[sIndex];

        step.positions.push(new THREE.Vector3(sData.pos.x + 2, sData.pos.y, sData.pos.z + 2));
        step.colors.push(sData.col.clone());
        step.particleGroups.push(sData.grp + '_copy');
        if (!step.effects) step.effects = [];
        step.effects.push(sData.eff);
      }

      newIndices.add(startIndex + i);
      i++;
    }

    this.selectedIndices = newIndices;
    this.saveCurrentStep();
    this.saveStateToHistory();
    this.notify();
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
