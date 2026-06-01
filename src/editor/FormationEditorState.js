import * as THREE from 'three';
import { BaseFormationState } from '../core/BaseFormationState.js';

export class FormationEditorState extends BaseFormationState {
  constructor() {
    super();
    this.name = "NewFormat";
    this.droneCount = 100;
    this.effects = []; // Array of strings (e.g. 'none', 'wave', 'strobe')
    this.activeGroup = "Default";
    
    // Timeline state
    this.steps = [{
      id: 'step_0',
      time: 0,
      positions: [],
      colors: [],
      particleGroups: [],
      effects: [],
      transitionMode: 'transform', // 'transform' or 'move'
      transitionEffect: 'none',
      holdTime: 0,
      transitionTime: 2000,
      holdMoveEffect: 'none',
      holdLightEffect: 'none',
      holdMoveSpeed: 1.0,
      holdMoveFreq: 1.0,
      holdLightSpeed: 1.0,
      holdLightFreq: 1.0,
      center: new THREE.Vector3(0, 20, 0),
      groupConfigs: {}
    }];
    this.currentStepIndex = 0;
    this.isPlaying = false;
    this.playbackTime = 0;
  }

  isDroneInGroup(droneIndex, groupName) {
    if (!groupName) return false;
    const droneGroup = this.particleGroups[droneIndex] || 'Default';
    return droneGroup === groupName || droneGroup.startsWith(groupName + '/');
  }

  getGroupConfigForStep(groupName, step) {
    if (!step) return null;
    if (!step.groupConfigs) step.groupConfigs = {};
    if (!step.groupConfigs[groupName]) {
      // Lazy initialize group config using step parameters
      step.groupConfigs[groupName] = {
        transitionMode: step.transitionMode || 'transform',
        transitionMoveEffect: step.transitionMoveEffect || step.transitionEffect || 'none',
        transitionMoveSpeed: step.transitionMoveSpeed !== undefined ? step.transitionMoveSpeed : 1.0,
        transitionMoveFreq: step.transitionMoveFreq !== undefined ? step.transitionMoveFreq : 1.0,
        transitionLightEffect: step.transitionLightEffect || 'none',
        transitionLightSpeed: step.transitionLightSpeed !== undefined ? step.transitionLightSpeed : 1.0,
        transitionLightFreq: step.transitionLightFreq !== undefined ? step.transitionLightFreq : 1.0,
        transitionSparkleColor: step.transitionSparkleColor || '#ffffff',
        holdMoveEffect: step.holdMoveEffect || 'none',
        holdMoveSpeed: step.holdMoveSpeed !== undefined ? step.holdMoveSpeed : 1.0,
        holdMoveFreq: step.holdMoveFreq !== undefined ? step.holdMoveFreq : 1.0,
        holdLightEffect: step.holdLightEffect || 'none',
        holdLightSpeed: step.holdLightSpeed !== undefined ? step.holdLightSpeed : 1.0,
        holdLightFreq: step.holdLightFreq !== undefined ? step.holdLightFreq : 1.0,
        applyLightEffect: step.applyLightEffect || 'none',
        landingLightEffect: step.landingLightEffect || 'none',
        landingLightSpeed: step.landingLightSpeed !== undefined ? step.landingLightSpeed : 1.0,
        landingLightFreq: step.landingLightFreq !== undefined ? step.landingLightFreq : 1.0,
        center: step.center ? step.center.clone() : new THREE.Vector3(0, 20, 0)
      };
    }
    return step.groupConfigs[groupName];
  }

  getGroupConfig(groupName, stepIndex = this.currentStepIndex) {
    const step = this.steps[stepIndex];
    return this.getGroupConfigForStep(groupName, step);
  }

  setActiveGroup(groupName) {
    if (this.activeGroup === groupName) return;
    this.saveCurrentStep();
    this.activeGroup = groupName;

    // Load active group's center configuration for the current step
    const cfg = this.getGroupConfig(groupName);
    if (cfg && cfg.center) {
      this.center.copy(cfg.center);
    }
    this.notify();
  }

  getMaxPlaybackTime() {
    if (!this.steps || this.steps.length === 0) return 5000;
    const lastStep = this.steps[this.steps.length - 1];
    return lastStep.time + (lastStep.holdTime || 0);
  }

  recalculateTimesForTimeline(steps) {
    let currentTime = 0;
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (i === 0) {
        step.time = 0;
        currentTime = step.holdTime || 0;
      } else {
        const prevStep = steps[i - 1];
        if (step.transitionTime === undefined) {
          const SPEED = 30.0;
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
          if (flightTime < 1000) flightTime = 1000;
          step.transitionTime = Math.round(flightTime);
        }
        step.time = prevStep.time + (prevStep.holdTime || 0) + (step.transitionTime || 1000);
        currentTime = step.time + (step.holdTime || 0);
      }
    }
  }

  synchronizeStepDrones() {
    const targetCount = this.positions.length;
    for (let sIndex = 0; sIndex < this.steps.length; sIndex++) {
      if (sIndex === this.currentStepIndex) continue;
      const step = this.steps[sIndex];

      if (!step.effects) step.effects = [];

      // If the step has fewer drones, pad it with clones from this.positions
      if (step.positions.length < targetCount) {
        for (let i = step.positions.length; i < targetCount; i++) {
          step.positions.push(this.positions[i].clone());
          step.colors.push(this.colors[i] ? this.colors[i].clone() : new THREE.Color(0xffffff));
          step.particleGroups.push(this.particleGroups[i] || 'Default');
          step.effects.push(this.effects[i] || 'none');
        }
      }
      // If the step has more drones, truncate it to match the active state
      else if (step.positions.length > targetCount) {
        step.positions.splice(targetCount);
        step.colors.splice(targetCount);
        step.particleGroups.splice(targetCount);
        step.effects.splice(targetCount);
      }
    }
  }

  synchronizeGroupsToAllSteps() {
    for (const step of this.steps) {
      if (!step.particleGroups) step.particleGroups = [];
      while (step.particleGroups.length < this.particleGroups.length) {
        step.particleGroups.push('Default');
      }
      if (step.particleGroups.length > this.particleGroups.length) {
        step.particleGroups.splice(this.particleGroups.length);
      }
      for (let i = 0; i < this.particleGroups.length; i++) {
        step.particleGroups[i] = this.particleGroups[i] || 'Default';
      }
    }
  }

  saveCurrentStep() {
    if (this.currentStepIndex >= 0 && this.currentStepIndex < this.steps.length) {
      const step = this.steps[this.currentStepIndex];
      const targetCount = this.positions.length;

      // Ensure step arrays are initialized and padded to match drone count
      if (!step.positions) step.positions = [];
      if (!step.colors) step.colors = [];
      if (!step.particleGroups) step.particleGroups = [];
      if (!step.effects) step.effects = [];

      while (step.positions.length < targetCount) {
        step.positions.push(new THREE.Vector3());
        step.colors.push(new THREE.Color(0xffffff));
        step.particleGroups.push('Default');
        step.effects.push('none');
      }
      if (step.positions.length > targetCount) {
        step.positions.splice(targetCount);
        step.colors.splice(targetCount);
        step.particleGroups.splice(targetCount);
        step.effects.splice(targetCount);
      }

      for (let i = 0; i < targetCount; i++) {
        step.positions[i] = this.positions[i].clone();
        step.colors[i] = this.colors[i].clone();
        step.particleGroups[i] = this.particleGroups[i] || 'Default';
        step.effects[i] = this.effects[i] || 'none';
      }
      
      // Save center to active group config inside step
      const cfg = this.getGroupConfig(this.activeGroup);
      if (cfg) {
        cfg.center.copy(this.center);
      }
      
      this.synchronizeStepDrones();
      this.recalculateTimes();
    }
  }

  loadStep(index, saveFirst = true) {
    if (saveFirst) {
      this.saveCurrentStep();
    }
    if (index >= 0 && index < this.steps.length) {
      this.currentStepIndex = index;
      const step = this.steps[index];
      const targetCount = step.positions.length;
      
      const stepEffects = step.effects || new Array(targetCount).fill('none');

      for (let i = 0; i < this.positions.length; i++) {
        if (step.positions[i]) this.positions[i].copy(step.positions[i]);
        if (step.colors[i]) this.colors[i].copy(step.colors[i]);
        if (step.particleGroups[i] !== undefined) this.particleGroups[i] = step.particleGroups[i];
        if (stepEffects[i] !== undefined) this.effects[i] = stepEffects[i];
      }

      // Load active group's center configuration for the current step
      const cfg = this.getGroupConfig(this.activeGroup);
      if (cfg && cfg.center) {
        this.center.copy(cfg.center);
      } else {
        this.center.set(0, 20, 0);
      }

      this.isCenterSelected = false;
      this.notify();
    }
  }

  addStep() {
    this.saveCurrentStep();
    
    // Deep clone the active step's groupConfigs so the properties and centers carry over!
    const activeStep = this.steps[this.currentStepIndex];
    const newGroupConfigs = {};
    if (activeStep && activeStep.groupConfigs) {
      for (const gName in activeStep.groupConfigs) {
        const cfg = activeStep.groupConfigs[gName];
        newGroupConfigs[gName] = {
          transitionMode: cfg.transitionMode || 'transform',
          transitionMoveEffect: cfg.transitionMoveEffect || 'none',
          transitionMoveSpeed: cfg.transitionMoveSpeed !== undefined ? cfg.transitionMoveSpeed : 1.0,
          transitionMoveFreq: cfg.transitionMoveFreq !== undefined ? cfg.transitionMoveFreq : 1.0,
          transitionLightEffect: cfg.transitionLightEffect || 'none',
          transitionLightSpeed: cfg.transitionLightSpeed !== undefined ? cfg.transitionLightSpeed : 1.0,
          transitionLightFreq: cfg.transitionLightFreq !== undefined ? cfg.transitionLightFreq : 1.0,
          transitionSparkleColor: cfg.transitionSparkleColor || '#ffffff',
          holdMoveEffect: cfg.holdMoveEffect || 'none',
          holdMoveSpeed: cfg.holdMoveSpeed !== undefined ? cfg.holdMoveSpeed : 1.0,
          holdMoveFreq: cfg.holdMoveFreq !== undefined ? cfg.holdMoveFreq : 1.0,
          holdLightEffect: cfg.holdLightEffect || 'none',
          holdLightSpeed: cfg.holdLightSpeed !== undefined ? cfg.holdLightSpeed : 1.0,
          holdLightFreq: cfg.holdLightFreq !== undefined ? cfg.holdLightFreq : 1.0,
          applyLightEffect: cfg.applyLightEffect || 'none',
          landingLightEffect: cfg.landingLightEffect || 'none',
          landingLightSpeed: cfg.landingLightSpeed !== undefined ? cfg.landingLightSpeed : 1.0,
          landingLightFreq: cfg.landingLightFreq !== undefined ? cfg.landingLightFreq : 1.0,
          center: cfg.center ? cfg.center.clone() : new THREE.Vector3(0, 20, 0)
        };
      }
    }

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
      transitionTime: 2000, // Default to 2s transition duration
      holdMoveEffect: 'none',
      holdLightEffect: 'none',
      holdMoveSpeed: 1.0,
      holdMoveFreq: 1.0,
      holdLightSpeed: 1.0,
      holdLightFreq: 1.0,
      center: this.center.clone(),
      groupConfigs: newGroupConfigs
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
    this.particleGroups = [...step.particleGroups];
    this.effects = [...(step.effects || new Array(step.positions.length).fill('none'))];
    this.center = step.center ? step.center.clone() : new THREE.Vector3(0, 20, 0);
    this.recalculateTimes();
    this.notify();
  }

  recalculateTimes() {
    let currentTime = 0;

    for (let i = 0; i < this.steps.length; i++) {
      const step = this.steps[i];
      if (i === 0) {
        step.time = 0;
        currentTime = step.holdTime || 0;
      } else {
        const prevStep = this.steps[i - 1];

        // If step doesn't have transitionTime yet, calculate a default based on distance
        if (step.transitionTime === undefined) {
          const SPEED = 30.0; // Faster drone speed (m/s) for legacy calculation
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
          step.transitionTime = Math.round(flightTime);
        }

        step.time = prevStep.time + (prevStep.holdTime || 0) + (step.transitionTime || 1000);
        currentTime = step.time + (step.holdTime || 0);
      }
    }
  }

  createHistorySnapshot() {
    const snapshot = super.createHistorySnapshot();
    snapshot.effects = [...this.effects];
    return snapshot;
  }

  restoreFromSnapshot(snapshot) {
    super.restoreFromSnapshot(snapshot);
    this.effects = snapshot.effects ? [...snapshot.effects] : new Array(this.positions.length).fill('none');
  }

  parseStepsArray(stepsArray) {
    if (!stepsArray || stepsArray.length === 0) {
      return [{
        id: 'step_' + Date.now(),
        time: 0,
        positions: this.positions.map(p => p.clone()),
        colors: this.colors.map(c => c.clone()),
        particleGroups: [...this.particleGroups],
        effects: [...this.effects],
        transitionMode: 'transform',
        transitionEffect: 'none',
        holdTime: 0,
        transitionTime: 2000,
        holdMoveEffect: 'none',
        holdLightEffect: 'none',
        holdMoveSpeed: 1.0,
        holdMoveFreq: 1.0,
        holdLightSpeed: 1.0,
        holdLightFreq: 1.0,
        center: this.center.clone(),
        groupConfigs: {}
      }];
    }
    return stepsArray.map((s, i) => {
      let moveEff = s.holdMoveEffect;
      let lightEff = s.holdLightEffect;

      if (!moveEff && !lightEff && s.holdEffect) {
        if (['strobe', 'shimmer'].includes(s.holdEffect)) {
          moveEff = 'none';
          lightEff = s.holdEffect;
        } else {
          moveEff = s.holdEffect;
          lightEff = 'none';
        }
      }

      // Load groupConfigs
      const groupConfigs = {};
      if (s.groupConfigs) {
        for (const gName in s.groupConfigs) {
          const cfg = s.groupConfigs[gName];
          groupConfigs[gName] = {
            transitionMode: cfg.transitionMode || 'transform',
            transitionMoveEffect: cfg.transitionMoveEffect || cfg.transitionEffect || 'none',
            transitionMoveSpeed: cfg.transitionMoveSpeed !== undefined ? cfg.transitionMoveSpeed : 1.0,
            transitionMoveFreq: cfg.transitionMoveFreq !== undefined ? cfg.transitionMoveFreq : 1.0,
            transitionLightEffect: cfg.transitionLightEffect || 'none',
            transitionLightSpeed: cfg.transitionLightSpeed !== undefined ? cfg.transitionLightSpeed : 1.0,
            transitionLightFreq: cfg.transitionLightFreq !== undefined ? cfg.transitionLightFreq : 1.0,
            transitionSparkleColor: cfg.transitionSparkleColor || '#ffffff',
            holdMoveEffect: cfg.holdMoveEffect || 'none',
            holdMoveSpeed: cfg.holdMoveSpeed !== undefined ? cfg.holdMoveSpeed : 1.0,
            holdMoveFreq: cfg.holdMoveFreq !== undefined ? cfg.holdMoveFreq : 1.0,
            holdLightEffect: cfg.holdLightEffect || 'none',
            holdLightSpeed: cfg.holdLightSpeed !== undefined ? cfg.holdLightSpeed : 1.0,
            holdLightFreq: cfg.holdLightFreq !== undefined ? cfg.holdLightFreq : 1.0,
            applyLightEffect: cfg.applyLightEffect || 'none',
            landingLightEffect: cfg.landingLightEffect || 'none',
            landingLightSpeed: cfg.landingLightSpeed !== undefined ? cfg.landingLightSpeed : 1.0,
            landingLightFreq: cfg.landingLightFreq !== undefined ? cfg.landingLightFreq : 1.0,
            center: cfg.center ? new THREE.Vector3(cfg.center.x, cfg.center.y, cfg.center.z) : new THREE.Vector3(0, 20, 0)
          };
        }
      }

      return {
        id: 'step_' + i + '_' + Date.now(),
        time: s.time || i * 5000,
        positions: (s.positions || []).map(p => new THREE.Vector3(p.x, p.y, p.z)),
        colors: (s.colors || []).map(c => new THREE.Color(c)),
        particleGroups: s.particleGroups || new Array((s.positions || []).length).fill('Imported'),
        effects: s.effects || new Array((s.positions || []).length).fill('none'),
        transitionMode: s.transitionMode || 'transform',
        transitionEffect: s.transitionEffect || s.transitionLight || 'none',
        holdTime: s.holdTime || 0,
        transitionTime: s.transitionTime !== undefined ? s.transitionTime : 2000,
        holdMoveEffect: moveEff || 'none',
        holdLightEffect: lightEff || 'none',
        holdMoveSpeed: s.holdMoveSpeed !== undefined ? s.holdMoveSpeed : 1.0,
        holdMoveFreq: s.holdMoveFreq !== undefined ? s.holdMoveFreq : 1.0,
        holdLightSpeed: s.holdLightSpeed !== undefined ? s.holdLightSpeed : 1.0,
        holdLightFreq: s.holdLightFreq !== undefined ? s.holdLightFreq : 1.0,
        center: s.center ? new THREE.Vector3(s.center.x, s.center.y, s.center.z) : new THREE.Vector3(0, 20, 0),
        groupConfigs: groupConfigs
      };
    });
  }

  loadFormat(data, filePath = null) {
    this.name = data.name || "LoadedFormat";
    this.currentFilePath = filePath;
    this.droneCount = data.droneCount || 0;
    this.activeGroup = data.activeGroup || "Default";

    // Load global steps array
    const parsedSteps = data.steps || [];
    this.steps = this.parseStepsArray(parsedSteps);

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
    
    // Load active group's center configuration
    const cfg = this.getGroupConfig(this.activeGroup);
    if (cfg && cfg.center) {
      this.center.copy(cfg.center);
    } else {
      this.center.copy(step.center || new THREE.Vector3(0, 20, 0));
    }

    this.synchronizeStepDrones();
    this.saveStateToHistory();
    this.notify();
  }

  exportFormat() {
    this.saveCurrentStep();
    this.recalculateTimes(); // Ensure absolute times are computed
    
    return {
      name: this.name,
      droneCount: this.positions.length,
      activeGroup: this.activeGroup,
      steps: this.steps.map(step => {
        const exportedGroupConfigs = {};
        if (step.groupConfigs) {
          for (const gName in step.groupConfigs) {
            const cfg = step.groupConfigs[gName];
            exportedGroupConfigs[gName] = {
              transitionMode: cfg.transitionMode,
              transitionMoveEffect: cfg.transitionMoveEffect || 'none',
              transitionMoveSpeed: cfg.transitionMoveSpeed,
              transitionMoveFreq: cfg.transitionMoveFreq,
              transitionLightEffect: cfg.transitionLightEffect || 'none',
              transitionLightSpeed: cfg.transitionLightSpeed,
              transitionLightFreq: cfg.transitionLightFreq,
              transitionSparkleColor: cfg.transitionSparkleColor || '#ffffff',
              holdMoveEffect: cfg.holdMoveEffect,
              holdMoveSpeed: cfg.holdMoveSpeed,
              holdMoveFreq: cfg.holdMoveFreq,
              holdLightEffect: cfg.holdLightEffect,
              holdLightSpeed: cfg.holdLightSpeed,
              holdLightFreq: cfg.holdLightFreq,
              applyLightEffect: cfg.applyLightEffect || 'none',
              landingLightEffect: cfg.landingLightEffect || 'none',
              landingLightSpeed: cfg.landingLightSpeed !== undefined ? cfg.landingLightSpeed : 1.0,
              landingLightFreq: cfg.landingLightFreq !== undefined ? cfg.landingLightFreq : 1.0,
              center: { x: cfg.center.x, y: cfg.center.y, z: cfg.center.z }
            };
          }
        }
        
        return {
          time: step.time,
          positions: step.positions.map(p => ({ x: p.x, y: p.y, z: p.z })),
          colors: step.colors.map(c => c.getHex()),
          particleGroups: step.particleGroups,
          effects: step.effects,
          transitionMode: step.transitionMode || 'transform',
          transitionEffect: step.transitionEffect || 'none',
          holdTime: step.holdTime || 0,
          transitionTime: step.transitionTime || 0,
          holdMoveEffect: step.holdMoveEffect || 'none',
          holdLightEffect: step.holdLightEffect || 'none',
          holdMoveSpeed: step.holdMoveSpeed !== undefined ? step.holdMoveSpeed : 1.0,
          holdMoveFreq: step.holdMoveFreq !== undefined ? step.holdMoveFreq : 1.0,
          holdLightSpeed: step.holdLightSpeed !== undefined ? step.holdLightSpeed : 1.0,
          holdLightFreq: step.holdLightFreq !== undefined ? step.holdLightFreq : 1.0,
          center: step.center ? { x: step.center.x, y: step.center.y, z: step.center.z } : { x: 0, y: 20, z: 0 },
          groupConfigs: exportedGroupConfigs
        };
      })
    };
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

    const existingGroups = new Set();
    for (const g of this.particleGroups) {
      if (g) existingGroups.add(g);
    }
    for (const step of this.steps) {
      if (step && step.particleGroups) {
        for (const g of step.particleGroups) {
          if (g) existingGroups.add(g);
        }
      }
    }

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
      const eff = this.effects[index] || 'none';

      this.positions.push(new THREE.Vector3(pos.x + 2, pos.y, pos.z + 2));
      this.colors.push(col.clone());
      this.particleGroups.push(newGroup);
      this.effects.push(eff);

      for (let sIndex = 0; sIndex < this.steps.length; sIndex++) {
        if (sIndex === this.currentStepIndex) continue;
        const step = this.steps[sIndex];
        const stepPos = step.positions[index] || pos;
        const stepCol = step.colors[index] || col;
        const stepGrp = step.particleGroups[index] || group;
        const stepNewGroup = groupMapping.get(stepGrp) || newGroup;
        const stepEff = step.effects ? (step.effects[index] || eff) : eff;

        step.positions.push(new THREE.Vector3(stepPos.x + 2, stepPos.y, stepPos.z + 2));
        step.colors.push(stepCol.clone());
        step.particleGroups.push(stepNewGroup);
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

    const existingGroups = new Set();
    for (const g of this.particleGroups) {
      if (g) existingGroups.add(g);
    }
    for (const step of this.steps) {
      if (step && step.particleGroups) {
        for (const g of step.particleGroups) {
          if (g) existingGroups.add(g);
        }
      }
    }

    const groupMapping = new Map();
    for (const group of this.clipboard.particleGroups) {
      const grp = group || 'Pasted';
      if (!groupMapping.has(grp)) {
        groupMapping.set(grp, this.getUniqueGroupNameForPaste(grp, existingGroups));
      }
    }

    const stepGroupMapping = [];
    for (let sIndex = 0; sIndex < this.steps.length; sIndex++) {
      stepGroupMapping.push(new Map());
    }

    for (let c = 0; c < this.clipboard.positions.length; c++) {
      const pos = this.clipboard.positions[c];
      const col = this.clipboard.colors[c];
      const group = this.clipboard.particleGroups[c] || 'Pasted';
      const newGroup = groupMapping.get(group);
      const eff = this.clipboard.effects[c];
      const stepData = this.clipboard.stepData[c];

      this.positions.push(new THREE.Vector3(pos.x + 2, pos.y, pos.z + 2));
      this.colors.push(col.clone());
      this.particleGroups.push(newGroup);
      this.effects.push(eff);

      for (let sIndex = 0; sIndex < this.steps.length; sIndex++) {
        if (sIndex === this.currentStepIndex) continue;
        const step = this.steps[sIndex];
        const sData = stepData[sIndex];
        const sGrp = sData.grp || 'Pasted';
        
        let stepNewGroup = stepGroupMapping[sIndex].get(sGrp);
        if (!stepNewGroup) {
          stepNewGroup = this.getUniqueGroupNameForPaste(sGrp, existingGroups);
          stepGroupMapping[sIndex].set(sGrp, stepNewGroup);
        }

        step.positions.push(new THREE.Vector3(sData.pos.x + 2, sData.pos.y, sData.pos.z + 2));
        step.colors.push(sData.col.clone());
        step.particleGroups.push(stepNewGroup);
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
      this.setActiveGroup(groupName);
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
