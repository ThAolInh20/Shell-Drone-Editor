import * as THREE from 'three';
import { DroneFormationFactory } from '../../factories/DroneFormationFactory.js';

export function setupEditorUI(state, director) {
  const leftContainer = document.getElementById('editor-ui-left');
  const rightContainer = document.getElementById('editor-ui-right');
  if (!leftContainer || !rightContainer) return;

  leftContainer.innerHTML = `
    <h2>Drone Editor</h2>
    
    <div class="panel-section">
      <h3>File</h3>
      <div class="input-group">
        <label>Format Name</label>
        <input type="text" id="ui-name" value="NewFormat" style="width: 120px;" />
      </div>
      <button class="btn" id="btn-export">Export JSON</button>
      <input type="file" id="file-import" accept=".json" style="display: none;" />
      <button class="btn btn-secondary" id="btn-import">Import JSON</button>
    </div>

    <div class="panel-section">
      <h3>Formation Shaping</h3>
      <div class="input-group">
        <label>Shape</label>
        <select id="ui-shape-type" style="width: 120px; background: #222; color: #fff; border: 1px solid #444; padding: 4px;">
          <option value="grid">Grid</option>
          <option value="circle">Circle</option>
          <option value="sphere">Sphere</option>
          <option value="cube">Cube</option>
          <option value="cylinder">Cylinder</option>
          <option value="star">Star</option>
          <option value="text">Text / Numbers</option>
        </select>
      </div>
      <div class="input-group" id="ui-text-container" style="display: none; margin-top: 10px;">
        <label>Text</label>
        <input type="text" id="ui-shape-text" value="2026" style="width: 120px; background: #222; color: #fff; border: 1px solid #444; padding: 4px;" />
      </div>
      <div class="input-group" style="margin-top: 10px;">
        <label>Fill Mode</label>
        <select id="ui-shape-fill" style="width: 120px; background: #222; color: #fff; border: 1px solid #444; padding: 4px;">
          <option value="solid">Solid (Đặc)</option>
          <option value="outline">Outline (Rỗng)</option>
        </select>
      </div>
      <div class="input-group" style="margin-top: 10px;">
        <label>Target</label>
        <select id="ui-shape-target" style="width: 120px; background: #222; color: #fff; border: 1px solid #444; padding: 4px;">
          <option value="new">Spawn New Drones</option>
          <option value="selected">Apply to Selected</option>
        </select>
      </div>
      <div class="input-group" id="ui-count-container" style="margin-top: 10px;">
        <label>Count</label>
        <input type="number" id="ui-count" value="100" />
      </div>
      <div class="input-group" style="margin-top: 10px;">
        <label>Radius/Spacing</label>
        <input type="number" id="ui-shape-p1" value="15" />
      </div>
      <div class="input-group" style="margin-top: 10px;">
        <label>Height (Cylinder)</label>
        <input type="number" id="ui-shape-p2" value="30" />
      </div>
      <button class="btn btn-secondary" id="btn-apply-shape" style="margin-top: 10px; width: 100%;">Apply Shape</button>
      <button class="btn" id="btn-clear-all" style="margin-top: 10px; background-color: #d90429; color: white; width: 100%;">Clear All Drones</button>
    </div>

    <div class="panel-section">
      <h3>Groups</h3>
      <div style="display: flex; gap: 5px; margin-bottom: 10px;">
        <button class="btn btn-secondary" id="btn-group-selected" style="margin-bottom: 0; padding: 5px; flex: 1;">Group Selected</button>
        <button class="btn btn-secondary" id="btn-ungroup" style="margin-bottom: 0; padding: 5px; flex: 1;">Ungroup</button>
      </div>
      <div id="group-list" style="max-height: 150px; overflow-y: auto; background: #222; border: 1px solid #444; border-radius: 4px; padding: 5px;">
        <!-- Group items injected here -->
      </div>
    </div>
  `;

  rightContainer.innerHTML = `
    <div class="panel-section">
      <h3>Gizmo Controls</h3>
      <div class="gizmo-controls">
        <button class="gizmo-btn active" data-mode="translate">Move</button>
        <button class="gizmo-btn" data-mode="rotate">Rotate</button>
        <button class="gizmo-btn" data-mode="scale">Scale</button>
      </div>
      <div style="margin-top: 10px; font-size: 12px; color: #888;">
        Ctrl+Click to multi-select.
      </div>
      <div style="margin-top: 10px; display: flex; gap: 5px;">
        <button class="btn btn-secondary" id="btn-undo" style="margin-bottom: 0; padding: 5px;">Undo (Ctrl+Z)</button>
        <button class="btn btn-secondary" id="btn-redo" style="margin-bottom: 0; padding: 5px;">Redo (Ctrl+Y)</button>
      </div>
      <label style="display: block; margin-top: 10px; font-size: 14px; cursor: pointer;">
        <input type="checkbox" id="ui-select-group" checked /> Select Entire Group in Viewport
      </label>
    </div>
    
    <div class="panel-section">
      <h3>Selection Info</h3>
      <div id="selection-info" style="font-size: 14px; color: #ccc; margin-bottom: 10px;">
        0 particles selected
      </div>
      <div id="coord-inputs" style="display: none;">
        <div class="input-group">
          <label>X</label>
          <input type="number" id="ui-pos-x" step="0.5" />
        </div>
        <div class="input-group">
          <label>Y</label>
          <input type="number" id="ui-pos-y" step="0.5" />
        </div>
        <div class="input-group">
          <label>Z</label>
          <input type="number" id="ui-pos-z" step="0.5" />
        </div>
        <div class="input-group" style="margin-top: 10px;">
          <label>Color</label>
          <input type="color" id="ui-color" value="#ffffff" />
        </div>
        <div class="input-group" style="margin-top: 10px;">
          <label>Effect</label>
          <select id="ui-effect" style="width: 120px; background: #222; color: #fff; border: 1px solid #444; padding: 4px;">
            <option value="none">None</option>
            <option value="wave">Wave (Vertical)</option>
            <option value="swing">Swing (Horizontal)</option>
            <option value="pulse">Pulse (Scale)</option>
            <option value="strobe">Strobe (Blink)</option>
            <option value="shimmer">Shimmer (Flicker)</option>
          </select>
        </div>
        <button class="btn" id="btn-delete-selected" style="margin-top: 15px; background-color: #ff4d4d; color: white; width: 100%;">Delete Selected</button>
      </div>
    </div>
  `;

  // Bind Events
  document.getElementById('btn-export').addEventListener('click', () => {
    state.name = document.getElementById('ui-name').value;
    const data = state.exportFormat();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('btn-import').addEventListener('click', () => {
    document.getElementById('file-import').click();
  });

  document.getElementById('file-import').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        state.loadFormat(data);
        document.getElementById('ui-name').value = state.name;
        document.getElementById('ui-count').value = state.droneCount;
      } catch (err) {
        alert("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  });

  document.getElementById('ui-shape-type').addEventListener('change', (e) => {
    const isText = e.target.value === 'text';
    document.getElementById('ui-text-container').style.display = isText ? 'flex' : 'none';
  });

  document.getElementById('ui-shape-target').addEventListener('change', (e) => {
    const isNew = e.target.value === 'new';
    document.getElementById('ui-count-container').style.display = isNew ? 'flex' : 'none';
  });

  document.getElementById('btn-apply-shape').addEventListener('click', () => {
    const type = document.getElementById('ui-shape-type').value;
    const target = document.getElementById('ui-shape-target').value;
    const fill = document.getElementById('ui-shape-fill').value;
    const p1 = parseFloat(document.getElementById('ui-shape-p1').value) || 15;
    const p2 = parseFloat(document.getElementById('ui-shape-p2').value) || 30;
    const textVal = document.getElementById('ui-shape-text').value;
    
    // Define default params for shapes
    let params = { y: 20, fill: fill };
    if (type === 'grid') params = { spacing: p1, y: 20, fill };
    if (type === 'circle') params = { radius: p1, y: 20, fill };
    if (type === 'sphere') params = { radius: p1, y: 25, fill };
    if (type === 'cube') params = { spacing: p1, y: 15, fill };
    if (type === 'cylinder') params = { radius: p1, height: p2, y: 15, fill };
    if (type === 'star') params = { radius: p1, y: 20, fill };
    if (type === 'text') params = { text: textVal, spacing: p1, y: 20, fill };

    if (target === 'selected') {
      if (state.selectedIndices.size === 0) {
        alert("Please select some drones first.");
        return;
      }
      
      const count = state.selectedIndices.size;
      if (type === 'grid') params.rows = Math.ceil(Math.sqrt(count));
      
      const newPositions = DroneFormationFactory.createFormation(type, count, params);
      
      // We want to arrange the selected drones around their current center!
      const currentCenter = new THREE.Vector3();
      for (const id of state.selectedIndices) {
        currentCenter.add(state.positions[id]);
      }
      currentCenter.divideScalar(count);
      
      // Calculate the generated shape's center
      const shapeCenter = new THREE.Vector3();
      for (const pos of newPositions) {
        shapeCenter.add(pos);
      }
      shapeCenter.divideScalar(count);
      
      // Offset all new positions to match the current center
      const offset = currentCenter.sub(shapeCenter);
      
      const updates = [];
      let i = 0;
      for (const id of state.selectedIndices) {
        const finalPos = newPositions[i].add(offset);
        updates.push({ index: id, pos: finalPos });
        i++;
      }
      
      state.updatePositions(updates);
      state.saveStateToHistory();
      
    } else {
      // Spawn new drones
      const count = parseInt(document.getElementById('ui-count').value) || 100;
      if (type === 'grid') params.rows = Math.ceil(Math.sqrt(count));
      
      const positions = DroneFormationFactory.createFormation(type, count, params);
      const colors = new Array(positions.length).fill().map(() => new THREE.Color(0xffffff));
      const groupName = `${type.toUpperCase()}_${Math.floor(Math.random() * 1000)}`;
      const startIndex = state.positions.length;

      // Inject into active memory
      for(let i = 0; i < count; i++) {
         state.positions.push(positions[i]);
         state.colors.push(colors[i]);
         state.particleGroups.push(groupName);
         state.effects.push('none');
      }
      
      // Inject into all other steps to keep indices aligned
      for(let sIndex = 0; sIndex < state.steps.length; sIndex++) {
         if (sIndex === state.currentStepIndex) continue;
         const step = state.steps[sIndex];
         for(let i = 0; i < count; i++) {
             step.positions.push(positions[i].clone());
             step.colors.push(colors[i].clone());
             step.particleGroups.push(groupName);
             if (!step.effects) step.effects = [];
             step.effects.push('none');
         }
      }
      
      // Select the newly spawned drones
      state.selectedIndices.clear();
      for (let i = startIndex; i < state.positions.length; i++) {
        state.selectedIndices.add(i);
      }
      
      state.saveCurrentStep();
      state.saveStateToHistory();
      state.notify();
    }
  });

  document.getElementById('btn-clear-all').addEventListener('click', () => {
    if (confirm("Are you sure you want to clear all particles?")) {
      state.positions = [];
      state.particleGroups = [];
      state.colors = [];
      state.selectedIndices.clear();
      state.saveStateToHistory();
      state.notify();
    }
  });

  document.getElementById('btn-undo')?.addEventListener('click', () => state.undo());
  document.getElementById('btn-redo')?.addEventListener('click', () => state.redo());

  document.getElementById('btn-group-selected')?.addEventListener('click', () => {
    if (state.selectedIndices.size === 0) {
      alert("Select some drones to group.");
      return;
    }
    const parentName = prompt("Enter new Parent Group name:");
    if (!parentName) return;
    
    // Validate parent name to not contain slashes
    const cleanName = parentName.replace(/\//g, '_');
    
    for (const idx of state.selectedIndices) {
      const current = state.particleGroups[idx] || 'Default';
      state.particleGroups[idx] = cleanName + '/' + current;
    }
    state.saveStateToHistory();
    state.notify();
  });

  document.getElementById('btn-ungroup')?.addEventListener('click', () => {
    if (state.selectedIndices.size === 0) return;
    
    let changed = false;
    for (const idx of state.selectedIndices) {
      const current = state.particleGroups[idx];
      if (current && current.includes('/')) {
        // Remove the top-level parent
        const parts = current.split('/');
        parts.shift(); // remove the first element
        state.particleGroups[idx] = parts.join('/');
        changed = true;
      }
    }
    if (changed) {
      state.saveStateToHistory();
      state.notify();
    }
  });

  const gizmoBtns = document.querySelectorAll('.gizmo-btn');
  gizmoBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      gizmoBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      director.gizmoSystem.setMode(e.target.dataset.mode);
    });
  });

  const updatePosFromInput = () => {
    if (state.selectedIndices.size > 0) {
      const x = parseFloat(document.getElementById('ui-pos-x').value) || 0;
      const y = parseFloat(document.getElementById('ui-pos-y').value) || 0;
      const z = parseFloat(document.getElementById('ui-pos-z').value) || 0;
      
      const newCenter = new THREE.Vector3(x, y, z);
      
      // Calculate current center
      const currentCenter = new THREE.Vector3();
      for (const id of state.selectedIndices) {
        currentCenter.add(state.positions[id]);
      }
      currentCenter.divideScalar(state.selectedIndices.size);
      
      // Calculate delta
      const delta = newCenter.sub(currentCenter);
      
      const updates = [];
      for (const id of state.selectedIndices) {
        const pos = state.positions[id].clone().add(delta);
        updates.push({ index: id, pos: pos });
      }
      state.updatePositions(updates);
      state.saveStateToHistory();
    }
  };

  document.getElementById('ui-pos-x').addEventListener('change', updatePosFromInput);
  document.getElementById('ui-pos-y').addEventListener('change', updatePosFromInput);
  document.getElementById('ui-pos-z').addEventListener('change', updatePosFromInput);
  
  document.getElementById('ui-color').addEventListener('input', (e) => {
    const hex = parseInt(e.target.value.replace('#', '0x'));
    state.updateSelectionColor(hex);
  });

  document.getElementById('ui-effect').addEventListener('change', (e) => {
    state.updateSelectionEffect(e.target.value);
  });

  document.getElementById('btn-delete-selected').addEventListener('click', () => {
    if (confirm(`Delete ${state.selectedIndices.size} selected items?`)) {
      state.deleteSelected();
    }
  });

  // Timeline UI
  document.getElementById('btn-add-step').addEventListener('click', () => {
    state.addStep();
  });
  
  document.getElementById('btn-play').addEventListener('click', () => {
    state.isPlaying = !state.isPlaying;
    if (state.isPlaying) {
      document.getElementById('btn-play').textContent = '⏸ Pause';
      document.getElementById('btn-play').style.backgroundColor = '#f44336';
      // If we are at the end, restart
      const maxTime = state.steps[state.steps.length - 1].time;
      if (state.playbackTime >= maxTime) {
        state.playbackTime = 0;
      }
    } else {
      document.getElementById('btn-play').textContent = '▶ Play';
      document.getElementById('btn-play').style.backgroundColor = '#4CAF50';
      // Snap to current step when paused
      state.playbackTime = state.steps[state.currentStepIndex].time;
    }
  });

  function renderTimeline() {
    const container = document.getElementById('steps-container');
    container.innerHTML = '';
    
    state.steps.forEach((step, index) => {
      const card = document.createElement('div');
      card.style.minWidth = '130px';
      card.style.height = '105px';
      card.style.backgroundColor = index === state.currentStepIndex ? '#3498db' : '#333';
      card.style.border = index === state.currentStepIndex ? '2px solid #fff' : '1px solid #444';
      card.style.borderRadius = '4px';
      card.style.padding = '8px';
      card.style.cursor = 'pointer';
      card.style.display = 'flex';
      card.style.flexDirection = 'column';
      card.style.justifyContent = 'flex-start';
      card.style.gap = '4px';
      
      const header = document.createElement('div');
      header.style.display = 'flex';
      header.style.justifyContent = 'space-between';
      header.style.fontSize = '12px';
      header.style.fontWeight = 'bold';
      
      const title = document.createElement('span');
      title.textContent = `Step ${index + 1}`;
      
      const delBtn = document.createElement('span');
      delBtn.textContent = '×';
      delBtn.style.color = '#ffcccb';
      delBtn.onclick = (e) => {
        e.stopPropagation();
        if (confirm(`Delete Step ${index + 1}?`)) {
          state.removeStep(index);
        }
      };
      
      header.appendChild(title);
      if (state.steps.length > 1) {
        header.appendChild(delBtn);
      }
      
      const timeDiv = document.createElement('div');
      timeDiv.textContent = `${step.time} ms`;
      timeDiv.style.fontSize = '11px';
      timeDiv.style.color = index === state.currentStepIndex ? '#fff' : '#aaa';
      
      card.ondblclick = (e) => {
        e.stopPropagation();
        const newTime = prompt(`Set time (ms) for Step ${index + 1}:`, step.time);
        if (newTime !== null) {
          const t = parseInt(newTime);
          if (!isNaN(t)) {
            step.time = t;
            state.steps.sort((a, b) => a.time - b.time);
            state.currentStepIndex = state.steps.indexOf(step);
            state.notify();
          }
        }
      };
      
      card.onclick = () => {
        if (!state.isPlaying) {
          state.playbackTime = step.time;
          state.loadStep(index);
        }
      };
      
      const modeSelect = document.createElement('select');
      modeSelect.style.fontSize = '10px';
      modeSelect.style.background = 'rgba(0,0,0,0.3)';
      modeSelect.style.color = '#fff';
      modeSelect.style.border = '1px solid rgba(255,255,255,0.2)';
      modeSelect.style.borderRadius = '3px';
      modeSelect.style.padding = '2px';
      modeSelect.style.marginTop = '2px';
      
      const optTransform = document.createElement('option');
      optTransform.value = 'transform';
      optTransform.textContent = '🔄 Transform';
      
      const optMove = document.createElement('option');
      optMove.value = 'move';
      optMove.textContent = '➡ Move Group';
      
      modeSelect.appendChild(optTransform);
      modeSelect.appendChild(optMove);
      modeSelect.value = step.transitionMode || 'transform';
      
      modeSelect.onchange = (e) => {
        e.stopPropagation();
        step.transitionMode = e.target.value;
        state.saveCurrentStep();
      };
      
      modeSelect.onclick = (e) => e.stopPropagation();

      const effectSelect = document.createElement('select');
      effectSelect.style.fontSize = '10px';
      effectSelect.style.background = 'rgba(0,0,0,0.3)';
      effectSelect.style.color = '#fff';
      effectSelect.style.border = '1px solid rgba(255,255,255,0.2)';
      effectSelect.style.borderRadius = '3px';
      effectSelect.style.padding = '2px';
      effectSelect.style.marginTop = '2px';
      
      const optEffNone = document.createElement('option');
      optEffNone.value = 'none';
      optEffNone.textContent = '✨ Transition: Normal';
      
      const optEffWave = document.createElement('option');
      optEffWave.value = 'wave';
      optEffWave.textContent = '✨ Transition: Wave';
      
      const optEffSwing = document.createElement('option');
      optEffSwing.value = 'swing';
      optEffSwing.textContent = '✨ Transition: Swing';
      
      const optEffPulse = document.createElement('option');
      optEffPulse.value = 'pulse';
      optEffPulse.textContent = '✨ Transition: Pulse';
      
      const optEffStrobe = document.createElement('option');
      optEffStrobe.value = 'strobe';
      optEffStrobe.textContent = '✨ Transition: Strobe';
      
      const optEffShimmer = document.createElement('option');
      optEffShimmer.value = 'shimmer';
      optEffShimmer.textContent = '✨ Transition: Shimmer';
      
      effectSelect.appendChild(optEffNone);
      effectSelect.appendChild(optEffWave);
      effectSelect.appendChild(optEffSwing);
      effectSelect.appendChild(optEffPulse);
      effectSelect.appendChild(optEffStrobe);
      effectSelect.appendChild(optEffShimmer);
      
      effectSelect.value = step.transitionEffect || 'none';
      
      effectSelect.onchange = (e) => {
        e.stopPropagation();
        step.transitionEffect = e.target.value;
        state.saveCurrentStep();
      };
      
      effectSelect.onclick = (e) => e.stopPropagation();

      card.appendChild(header);
      card.appendChild(timeDiv);
      card.appendChild(modeSelect);
      card.appendChild(effectSelect);
      container.appendChild(card);
    });
  }

  state.subscribe(() => {
    const selInfo = document.getElementById('selection-info');
    const coordInputs = document.getElementById('coord-inputs');
    const groupList = document.getElementById('group-list');
    
    if (selInfo) {
      selInfo.textContent = `${state.selectedIndices.size} particles selected`;
      
      if (state.selectedIndices.size > 0) {
        coordInputs.style.display = 'block';
        
        // Calculate center of selection
        const center = new THREE.Vector3();
        for (const id of state.selectedIndices) {
          center.add(state.positions[id]);
        }
        center.divideScalar(state.selectedIndices.size);
        
        // Only update input values if they are not actively being focused
        if (document.activeElement !== document.getElementById('ui-pos-x')) document.getElementById('ui-pos-x').value = center.x.toFixed(2);
        if (document.activeElement !== document.getElementById('ui-pos-y')) document.getElementById('ui-pos-y').value = center.y.toFixed(2);
        if (document.activeElement !== document.getElementById('ui-pos-z')) document.getElementById('ui-pos-z').value = center.z.toFixed(2);
        
        // Get color of first selected particle to show in color picker
        const firstId = Array.from(state.selectedIndices)[0];
        if (state.colors[firstId]) {
          const hexStr = '#' + state.colors[firstId].getHexString();
          document.getElementById('ui-color').value = hexStr;
        }

        // Determine if all selected share the same effect
        let sameEffect = true;
        let firstEffect = state.effects[firstId] || 'none';
        for (const id of state.selectedIndices) {
          const eff = state.effects[id] || 'none';
          if (eff !== firstEffect) {
            sameEffect = false;
            break;
          }
        }
        
        if (sameEffect) {
          document.getElementById('ui-effect').value = firstEffect;
        } else {
          document.getElementById('ui-effect').value = 'none';
        }
      } else {
        coordInputs.style.display = 'none';
      }
    }

    if (groupList) {
      const groups = state.getUniqueGroups();
      groupList.innerHTML = '';
      groups.forEach(g => {
        const div = document.createElement('div');
        
        const depth = g.split('/').length - 1;
        const name = g.split('/').pop();
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = (depth > 0 ? '↳ ' : '') + name;
        div.appendChild(nameSpan);
        
        const delBtn = document.createElement('span');
        delBtn.textContent = '×';
        delBtn.style.float = 'right';
        delBtn.style.color = '#ff4d4d';
        delBtn.style.fontWeight = 'bold';
        delBtn.style.padding = '0 5px';
        delBtn.style.borderRadius = '3px';
        delBtn.addEventListener('mouseover', () => delBtn.style.background = 'rgba(255,0,0,0.2)');
        delBtn.addEventListener('mouseout', () => delBtn.style.background = 'transparent');
        
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm(`Are you sure you want to delete group "${name}" and all its drones?`)) {
            state.selectGroup(g, false);
            state.deleteSelected();
          }
        });
        
        div.appendChild(delBtn);

        div.style.paddingLeft = `${depth * 15 + 8}px`;
        div.style.paddingTop = '4px';
        div.style.paddingBottom = '4px';
        div.style.cursor = 'pointer';
        div.style.borderBottom = '1px solid #333';
        div.style.fontSize = '12px';
        
        // Count how many selected particles belong to this group or its children
        let selectedInGroup = 0;
        let totalInGroup = 0;
        const prefix = g + '/';
        state.particleGroups.forEach((pg, idx) => {
          if (pg === g || (pg && pg.startsWith(prefix))) {
            totalInGroup++;
            if (state.selectedIndices.has(idx)) {
              selectedInGroup++;
            }
          }
        });

        if (totalInGroup > 0) {
          const countSpan = document.createElement('span');
          countSpan.textContent = ` (${selectedInGroup}/${totalInGroup})`;
          countSpan.style.color = selectedInGroup > 0 ? '#4CAF50' : '#888';
          countSpan.style.fontSize = '10px';
          nameSpan.appendChild(countSpan);
        }

        if (selectedInGroup > 0 && selectedInGroup === totalInGroup) {
          div.style.backgroundColor = 'rgba(52, 152, 219, 0.3)'; // Highlight if fully selected
        } else if (selectedInGroup > 0) {
          div.style.backgroundColor = 'rgba(52, 152, 219, 0.1)'; // Highlight if partially selected
        }
        
        div.addEventListener('click', (event) => {
          state.selectGroup(g, event.ctrlKey || event.shiftKey); // hold ctrl to multi-select groups
        });

        groupList.appendChild(div);
      });
      
      // Update timeline
      renderTimeline();
    }
  });
}
