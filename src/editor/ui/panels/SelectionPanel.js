import * as THREE from 'three';

export function renderSelectionPanel() {
  return `
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
        <div class="input-group" style="margin-top: 15px;">
          <label>Effect (Per Drone)</label>
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
}

export function setupSelectionPanel(state) {
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

  state.subscribe(() => {
    const selInfo = document.getElementById('selection-info');
    const coordInputs = document.getElementById('coord-inputs');

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
  });
}
