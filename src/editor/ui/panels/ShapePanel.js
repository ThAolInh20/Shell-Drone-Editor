import { t } from '../../../config/lang/i18n.js';

export function renderShapePanel() {
  return `
    <div class="panel-section">
      <h3>${t('editor.shapePanel.title')}</h3>
      <div class="input-group">
        <label>${t('editor.shapePanel.shapeLabel')}</label>
        <select id="ui-shape-type" style="width: 120px; background: #222; color: #fff; border: 1px solid #444; padding: 4px;">
          <option value="grid">${t('editor.shapePanel.shapeGrid')}</option>
          <option value="line">${t('editor.shapePanel.shapeLine')}</option>
          <option value="triangle">${t('editor.shapePanel.shapeTriangle')}</option>
          <option value="circle">${t('editor.shapePanel.shapeCircle')}</option>
          <option value="sphere">${t('editor.shapePanel.shapeSphere')}</option>
          <option value="cube">${t('editor.shapePanel.shapeCube')}</option>
          <option value="cylinder">${t('editor.shapePanel.shapeCylinder')}</option>
          <option value="star">${t('editor.shapePanel.shapeStar')}</option>
          <option value="text">${t('editor.shapePanel.shapeText')}</option>
          <option value="json">${t('editor.shapePanel.shapeJson')}</option>
        </select>
      </div>
      <div class="input-group" id="ui-json-container" style="display: none; margin-top: 10px;">
        <label>${t('editor.shapePanel.importFile')}</label>
        <div>
          <input type="file" id="ui-shape-json-file" accept=".json" style="width: 120px;" />
          <div id="ui-json-status" style="font-size: 11px; color: #888; margin-top: 4px;">${t('editor.shapePanel.noFileSelected')}</div>
        </div>
      </div>
      <div class="input-group" id="ui-text-container" style="display: none; margin-top: 10px;">
        <label>${t('editor.shapePanel.textLabel')}</label>
        <input type="text" id="ui-shape-text" value="2026" style="width: 120px; background: #222; color: #fff; border: 1px solid #444; padding: 4px;" />
      </div>
      <div class="input-group" style="margin-top: 10px;">
        <label>${t('editor.shapePanel.fillMode')}</label>
        <select id="ui-shape-fill" style="width: 120px; background: #222; color: #fff; border: 1px solid #444; padding: 4px;">
          <option value="solid">${t('editor.shapePanel.fillSolid')}</option>
          <option value="outline">${t('editor.shapePanel.fillOutline')}</option>
        </select>
      </div>
      <div class="input-group" style="margin-top: 10px;">
        <label>${t('editor.shapePanel.targetLabel')}</label>
        <select id="ui-shape-target" style="width: 120px; background: #222; color: #fff; border: 1px solid #444; padding: 4px;">
          <option value="new">${t('editor.shapePanel.targetNew')}</option>
          <option value="selected">${t('editor.shapePanel.targetSelected')}</option>
        </select>
      </div>
      <div class="input-group" id="ui-count-container" style="margin-top: 10px;">
        <label>${t('editor.shapePanel.countLabel')}</label>
        <input type="number" id="ui-count" value="100" />
      </div>
      <div class="input-group" style="margin-top: 10px;">
        <label>${t('editor.shapePanel.spacingLabel')}</label>
        <input type="number" id="ui-shape-p1" value="15" />
      </div>
      <div class="input-group" style="margin-top: 10px;">
        <label id="ui-shape-p2-label">${t('editor.shapePanel.heightLabel')}</label>
        <input type="number" id="ui-shape-p2" value="30" />
      </div>
      <div style="margin-top: 15px; border-top: 1px solid #444; padding-top: 10px;">
        <label style="font-weight: bold; font-size: 12px; color: #aaa;">${t('editor.shapePanel.centerLabel')}</label>
        <div style="display: flex; gap: 6px; margin-top: 6px;">
          <div style="flex: 1;">
            <label style="font-size: 10px; color: #888; display: block; margin-bottom: 2px;">X</label>
            <input type="number" id="ui-shape-cx" value="0" style="width: 100%; background: #222; color: #fff; border: 1px solid #444; padding: 4px; font-size: 12px;" />
          </div>
          <div style="flex: 1;">
            <label style="font-size: 10px; color: #888; display: block; margin-bottom: 2px;">Y</label>
            <input type="number" id="ui-shape-cy" value="20" style="width: 100%; background: #222; color: #fff; border: 1px solid #444; padding: 4px; font-size: 12px;" />
          </div>
          <div style="flex: 1;">
            <label style="font-size: 10px; color: #888; display: block; margin-bottom: 2px;">Z</label>
            <input type="number" id="ui-shape-cz" value="0" style="width: 100%; background: #222; color: #fff; border: 1px solid #444; padding: 4px; font-size: 12px;" />
          </div>
        </div>
      </div>
      <button class="btn btn-secondary" id="btn-apply-shape" style="margin-top: 15px; width: 100%;">${t('editor.shapePanel.applyBtn')}</button>
      <button class="btn" id="btn-clear-all" style="margin-top: 10px; background-color: #d90429; color: white; width: 100%;">${t('editor.shapePanel.clearAllBtn')}</button>
    </div>
  `;
}

export function setupShapePanel(state, director) {
  let customShapeData = null;

  document.getElementById('ui-shape-type').addEventListener('change', (e) => {
    const type = e.target.value;
    const isText = type === 'text';
    const isJson = type === 'json';
    document.getElementById('ui-text-container').style.display = isText ? 'flex' : 'none';
    const jsonContainer = document.getElementById('ui-json-container');
    if (jsonContainer) jsonContainer.style.display = isJson ? 'flex' : 'none';

    // Hide radius and height if json is selected
    const p1Container = document.getElementById('ui-shape-p1').parentElement;
    const p2Container = document.getElementById('ui-shape-p2').parentElement;
    const p2Label = document.getElementById('ui-shape-p2-label');
    const p2Input = document.getElementById('ui-shape-p2');

    if (isJson) {
      p1Container.style.display = 'none';
      p2Container.style.display = 'none';
    } else {
      p1Container.style.display = 'flex';
      
      if (type === 'cylinder' || type === 'star') {
        p2Container.style.display = 'flex';
        if (type === 'cylinder') {
          if (p2Label) p2Label.textContent = t('editor.shapePanel.heightLabel');
          if (p2Input && p2Input.value === '5') p2Input.value = '30';
        } else {
          if (p2Label) p2Label.textContent = t('editor.shapePanel.starPointsLabel');
          if (p2Input && (p2Input.value === '30' || p2Input.value === '')) p2Input.value = '5';
        }
      } else {
        p2Container.style.display = 'none';
      }
    }
  });

  document.getElementById('ui-shape-json-file')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) {
      customShapeData = null;
      document.getElementById('ui-json-status').textContent = t('editor.shapePanel.noFileSelected');
      document.getElementById('ui-json-status').style.color = '#888';
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        let droneData = [];
        if (Array.isArray(parsed)) {
          droneData = parsed;
        } else if (parsed && parsed.drones && Array.isArray(parsed.drones)) {
          droneData = parsed.drones;
        } else {
          throw new Error("JSON must be an array of objects or contain a drones array");
        }

        const positions = [];
        const colors = [];
        const particleGroups = [];
        for (const item of droneData) {
          if (item.x !== undefined || item.y !== undefined || item.z !== undefined) {
            const px = item.x || 0;
            const py = item.y || 0;
            const pz = item.z || 0;
            positions.push(new THREE.Vector3(px, py, pz));
            if (item.color !== undefined) {
              colors.push(new THREE.Color(item.color));
            } else if (item.r !== undefined && item.g !== undefined && item.b !== undefined) {
              colors.push(new THREE.Color(`rgb(${item.r}, ${item.g}, ${item.b})`));
            } else {
              colors.push(new THREE.Color(0xffffff));
            }
            const gName = String(item.group || item.particleGroup || 'Imported');
            particleGroups.push(gName);
          }
        }
        if (positions.length > 0) {
          customShapeData = { positions, colors, particleGroups };
          document.getElementById('ui-json-status').textContent = t('editor.shapePanel.loadedPoints', { count: positions.length });
          document.getElementById('ui-json-status').style.color = '#4CAF50';
        } else {
          throw new Error("No valid coordinates found");
        }
      } catch (err) {
        customShapeData = null;
        document.getElementById('ui-json-status').textContent = t('editor.shapePanel.invalidJson');
        document.getElementById('ui-json-status').style.color = '#ff4d4d';
        console.error("Shape Import Error:", err);
      }
    };
    reader.readAsText(file);
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
    const p2Container = document.getElementById('ui-shape-p2').parentElement;
    const p2Val = parseFloat(document.getElementById('ui-shape-p2').value);
    const p2 = p2Container.style.display !== 'none' ? (isNaN(p2Val) ? (type === 'star' ? 5 : 30) : p2Val) : (type === 'star' ? 5 : 30);
    const textVal = document.getElementById('ui-shape-text').value;

    const cx = parseFloat(document.getElementById('ui-shape-cx').value) || 0;
    const cy = parseFloat(document.getElementById('ui-shape-cy').value) || 0;
    const cz = parseFloat(document.getElementById('ui-shape-cz').value) || 0;

    if (type === 'json' && !customShapeData) {
      alert(t('editor.shapePanel.jsonAlert'));
      return;
    }

    // Define default params for shapes with base height 0
    let params = { y: 0, fill: fill };
    if (type === 'grid') params = { spacing: p1, y: 0, fill };
    if (type === 'line') params = { spacing: p1, y: 0 };
    if (type === 'triangle') params = { radius: p1, y: 0, fill };
    if (type === 'circle') params = { radius: p1, y: 0, fill };
    if (type === 'sphere') params = { radius: p1, y: 0, fill };
    if (type === 'cube') params = { spacing: p1, y: 0, fill };
    if (type === 'cylinder') params = { radius: p1, height: p2, y: 0, fill };
    if (type === 'star') params = { radius: p1, starPoints: p2, y: 0, fill };
    if (type === 'text') params = { text: textVal, spacing: p1, y: 0, fill };

    if (target === 'selected') {
      if (state.selectedIndices.size === 0) {
        alert(t('editor.shapePanel.selectAlert'));
        return;
      }

      const count = state.selectedIndices.size;
      let newPositions = [];
      let newColors = null;

      if (type === 'json') {
        newPositions = customShapeData.positions.slice(0, count).map(p => p.clone());
        newColors = customShapeData.colors.slice(0, count).map(c => c.clone());
        if (newPositions.length < count) {
          console.warn("JSON has fewer points than selected. Only updating available points.");
        }
      } else {
        if (type === 'grid') params.rows = Math.ceil(Math.sqrt(count));
        newPositions = DroneFormationFactory.createFormation(type, count, params);
      }

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
      if (newPositions.length > 0) {
        shapeCenter.divideScalar(newPositions.length);
      }

      // Offset all new positions to match the current center
      const offset = currentCenter.sub(shapeCenter);

      const updates = [];
      let i = 0;
      for (const id of state.selectedIndices) {
        if (i >= newPositions.length) break;
        const finalPos = newPositions[i].add(offset);
        updates.push({ index: id, pos: finalPos });
        i++;
      }

      state.updatePositions(updates);

      // Update colors and groups if json imported
      if (type === 'json' && newColors) {
        let j = 0;
        for (const id of state.selectedIndices) {
          if (j >= newColors.length) break;
          state.colors[id].copy(newColors[j]);
          if (customShapeData.particleGroups && customShapeData.particleGroups[j]) {
            state.particleGroups[id] = customShapeData.particleGroups[j];
          }
          j++;
        }
        state.saveCurrentStep();
        state.notify(); // Force UI color refresh if selection color changed
      }
      state.saveStateToHistory();

    } else {
      // Spawn new drones
      let count = parseInt(document.getElementById('ui-count').value) || 100;
      let positions = [];
      let colors = [];

      if (type === 'json') {
        positions = customShapeData.positions.map(p => p.clone());
        colors = customShapeData.colors.map(c => c.clone());
        count = positions.length; // Override count
      } else {
        if (type === 'grid') params.rows = Math.ceil(Math.sqrt(count));
        positions = DroneFormationFactory.createFormation(type, count, params);
        colors = new Array(positions.length).fill().map(() => new THREE.Color(0xffffff));
      }

      // Offset by target center
      const centerOffset = new THREE.Vector3(cx, cy, cz);
      for (const pos of positions) {
        pos.add(centerOffset);
      }

      const groupName = `${type.toUpperCase()}_${Math.floor(Math.random() * 1000)}`;
      const startIndex = state.positions.length;

      // Determine target group name for the new shape
      const targetGroupName = (type === 'json' && customShapeData && customShapeData.particleGroups && customShapeData.particleGroups[0]) ? customShapeData.particleGroups[0] : groupName;

      // Inject into active memory
      for (let i = 0; i < count; i++) {
        state.positions.push(positions[i]);
        state.colors.push(colors[i]);
        const gName = (type === 'json' && customShapeData.particleGroups && customShapeData.particleGroups[i]) ? customShapeData.particleGroups[i] : targetGroupName;
        state.particleGroups.push(gName);
        state.effects.push('none');
      }

      // Inject into all other steps to keep indices aligned
      for (let sIndex = 0; sIndex < state.steps.length; sIndex++) {
        if (sIndex === state.currentStepIndex) continue;
        const step = state.steps[sIndex];
        for (let i = 0; i < count; i++) {
          step.positions.push(positions[i].clone());
          step.colors.push(colors[i].clone());
          const gName = (type === 'json' && customShapeData.particleGroups && customShapeData.particleGroups[i]) ? customShapeData.particleGroups[i] : targetGroupName;
          step.particleGroups.push(gName);
          if (!step.effects) step.effects = [];
          step.effects.push('none');
        }
      }

      // Select the newly spawned drones
      state.selectedIndices.clear();
      for (let i = startIndex; i < state.positions.length; i++) {
        state.selectedIndices.add(i);
      }

      // Set the active group to the newly spawned group so editing works immediately!
      if (typeof state.setActiveGroup === 'function') {
        state.setActiveGroup(targetGroupName);
      } else {
        state.activeGroup = targetGroupName;
      }

      state.center.set(cx, cy, cz); // Update center
      state.saveCurrentStep();
      state.saveStateToHistory();
      state.notify();
    }
  });

  document.getElementById('btn-clear-all').addEventListener('click', () => {
    if (confirm(t('editor.shapePanel.confirmClear'))) {
      state.positions = [];
      state.particleGroups = [];
      state.colors = [];
      state.effects = [];
      state.selectedIndices.clear();
      state.saveCurrentStep();
      state.saveStateToHistory();
      state.notify();
    }
  });
}
