import * as THREE from 'three';
import { DroneFormationFactory } from '../../factories/DroneFormationFactory.js';

export function renderFormationShapePanel() {
  return `
    <div class="panel-section">
      <div style="display: flex; gap: 10px; margin-bottom: 20px;">
        <button class="btn" id="btn-export-json" style="background-color: #4CAF50; flex: 1;">Export JSON</button>
        <button class="btn" id="btn-import-json-trigger" style="background-color: #2196F3; flex: 1;">Import JSON</button>
        <input type="file" id="ui-formation-json-file" accept=".json" style="display: none;" />
      </div>

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
      <div style="margin-top: 15px; border-top: 1px solid #444; padding-top: 10px;">
        <label style="font-weight: bold; font-size: 12px; color: #aaa;">Formation Center (Tâm)</label>
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
      <button class="btn btn-secondary" id="btn-apply-shape" style="margin-top: 15px; width: 100%;">Apply Shape</button>
      <button class="btn" id="btn-clear-all" style="margin-top: 10px; background-color: #d90429; color: white; width: 100%;">Clear All Drones</button>
    </div>
  `;
}

export function setupFormationShapePanel(state) {
  // Export JSON
  document.getElementById('btn-export-json').addEventListener('click', () => {
    const exportData = [];
    for (let i = 0; i < state.positions.length; i++) {
      const pos = state.positions[i];
      const col = state.colors[i] || new THREE.Color(0xffffff);
      const hexStr = col.getHexString();
      const r = parseInt(hexStr.substring(0, 2), 16);
      const g = parseInt(hexStr.substring(2, 4), 16);
      const b = parseInt(hexStr.substring(4, 6), 16);
      exportData.push({
        x: parseFloat(pos.x.toFixed(2)),
        y: parseFloat(pos.y.toFixed(2)),
        z: parseFloat(pos.z.toFixed(2)),
        r: r,
        g: g,
        b: b
      });
    }
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", state.name + ".json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  });

  // Import JSON Trigger
  document.getElementById('btn-import-json-trigger').addEventListener('click', () => {
    document.getElementById('ui-formation-json-file').click();
  });

  // Handle file read
  document.getElementById('ui-formation-json-file')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Suggest name based on filename
    state.name = file.name.replace('.json', '');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (Array.isArray(data)) {
          const positions = [];
          const colors = [];
          for (const item of data) {
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
             }
          }
          if (positions.length > 0) {
             state.positions = positions;
             state.colors = colors;
             state.particleGroups = new Array(positions.length).fill('Imported');
             state.selectedIndices.clear();
             state.saveStateToHistory();
             state.notify();
          } else {
             alert("No valid coordinates found in JSON");
          }
        } else {
          alert("JSON must be an array of objects");
        }
      } catch (err) {
        alert("Invalid JSON format");
        console.error("Shape Import Error:", err);
      }
      // Reset input
      e.target.value = '';
    };
    reader.readAsText(file);
  });

  // Shape generation logic
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

    const cx = parseFloat(document.getElementById('ui-shape-cx').value) || 0;
    const cy = parseFloat(document.getElementById('ui-shape-cy').value) || 0;
    const cz = parseFloat(document.getElementById('ui-shape-cz').value) || 0;

    let targetCount = 0;
    if (target === 'new') {
      targetCount = parseInt(document.getElementById('ui-count').value, 10) || 100;
    } else {
      if (state.selectedIndices.size === 0) {
        alert("No drones selected");
        return;
      }
      targetCount = state.selectedIndices.size;
    }

    let params = { y: 0, fill: fill };
    if (type === 'grid') params = { spacing: p1, y: 0, fill };
    if (type === 'circle') params = { radius: p1, y: 0, fill };
    if (type === 'sphere') params = { radius: p1, y: 0, fill };
    if (type === 'cube') params = { spacing: p1, y: 0, fill };
    if (type === 'cylinder') params = { radius: p1, height: p2, y: 0, fill };
    if (type === 'star') params = { radius: p1, y: 0, fill };
    if (type === 'text') params = { text: textVal, spacing: p1, y: 0, fill };

    if (type === 'grid') params.rows = Math.ceil(Math.sqrt(targetCount));
    const positions = DroneFormationFactory.createFormation(type, targetCount, params);

    if (!positions || positions.length === 0) return;

    // Apply offset of designated center coordinate
    const centerOffset = new THREE.Vector3(cx, cy, cz);
    for (const pos of positions) {
      pos.add(centerOffset);
    }

    if (target === 'new') {
      const startIndex = state.positions.length;
      const groupName = 'Generated_' + Date.now();
      for (const pos of positions) {
        state.positions.push(pos.clone());
        state.colors.push(new THREE.Color(0xffffff));
        state.particleGroups.push(groupName);
      }
      state.center.set(cx, cy, cz); // Update active formation center
      state.selectGroup(groupName, false); // select the new group
      state.saveStateToHistory();
      state.notify();
    } else {
      const currentCenter = new THREE.Vector3();
      for (const id of state.selectedIndices) {
        currentCenter.add(state.positions[id]);
      }
      currentCenter.divideScalar(targetCount);

      const shapeCenter = new THREE.Vector3();
      for (const pos of positions) {
        shapeCenter.add(pos);
      }
      if (positions.length > 0) {
        shapeCenter.divideScalar(positions.length);
      }

      const offset = currentCenter.sub(shapeCenter);
      const updates = [];
      let i = 0;

      for (const index of state.selectedIndices) {
        if (i < positions.length) {
          const finalPos = positions[i].clone().add(offset);
          updates.push({ index: index, pos: finalPos });
        }
        i++;
      }
      state.updatePositions(updates);
      state.saveStateToHistory();
    }
  });

  document.getElementById('btn-clear-all').addEventListener('click', () => {
    if (confirm("Are you sure you want to clear all drones?")) {
      state.positions = [];
      state.colors = [];
      state.particleGroups = [];
      state.selectedIndices.clear();
      state.saveStateToHistory();
      state.notify();
    }
  });
}
