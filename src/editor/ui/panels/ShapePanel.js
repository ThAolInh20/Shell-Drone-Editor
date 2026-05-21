import * as THREE from 'three';
import { DroneFormationFactory } from '../../../factories/DroneFormationFactory.js';

export function renderShapePanel() {
  return `
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
          <option value="json">From JSON File</option>
        </select>
      </div>
      <div class="input-group" id="ui-json-container" style="display: none; margin-top: 10px;">
        <label>Import File</label>
        <div>
          <input type="file" id="ui-shape-json-file" accept=".json" style="width: 120px;" />
          <div id="ui-json-status" style="font-size: 11px; color: #888; margin-top: 4px;">No file selected</div>
        </div>
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
      
      <!-- Hologram Guide Model Section -->
      <div style="margin-top: 20px; border-top: 1px dashed #555; padding-top: 15px;">
        <h4 style="margin: 0 0 10px 0; color: #00ffff; text-transform: uppercase; font-size: 13px; letter-spacing: 0.5px;">Hologram Guide Model</h4>
        
        <div class="input-group" style="margin-bottom: 10px;">
          <label style="font-size: 12px;">3D Model (.obj, .gltf, .glb)</label>
          <input type="file" id="ui-ghost-model-file" accept=".obj,.gltf,.glb" style="width: 120px; font-size: 11px; background: #222; border: 1px solid #444; padding: 2px;" />
        </div>
        <div id="ui-ghost-model-status" style="font-size: 11px; color: #888; margin-top: -5px; margin-bottom: 12px; text-align: right;">Chưa tải mô hình</div>
        
        <button class="btn btn-secondary" id="btn-toggle-ghost-draw" style="margin-bottom: 15px; font-size: 12px; padding: 8px 10px; transition: all 0.3s ease; border: 1px solid #444; color: #fff;">
          🎨 Bút vẽ Drone: Tắt
        </button>
        
        <div style="margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #aaa;">
            <span>Y Height (Chiều cao)</span>
            <span id="val-ghost-offset-y">20m</span>
          </div>
          <input type="range" id="range-ghost-offset-y" min="-50" max="150" value="20" style="width: 100%; height: 4px; background: #333; accent-color: #00ffff; cursor: pointer; margin-top: 4px;" />
        </div>
        
        <div style="margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #aaa;">
            <span>X Offset (Ngang)</span>
            <span id="val-ghost-offset-x">0m</span>
          </div>
          <input type="range" id="range-ghost-offset-x" min="-150" max="150" value="0" style="width: 100%; height: 4px; background: #333; accent-color: #00ffff; cursor: pointer; margin-top: 4px;" />
        </div>
        
        <div style="margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #aaa;">
            <span>Z Offset (Dọc)</span>
            <span id="val-ghost-offset-z">0m</span>
          </div>
          <input type="range" id="range-ghost-offset-z" min="-150" max="150" value="0" style="width: 100%; height: 4px; background: #333; accent-color: #00ffff; cursor: pointer; margin-top: 4px;" />
        </div>
        
        <div style="margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #aaa;">
            <span>Scale (Tỉ lệ co giãn)</span>
            <span id="val-ghost-scale">1.0x</span>
          </div>
          <input type="range" id="range-ghost-scale" min="0.05" max="10.0" step="0.05" value="1.0" style="width: 100%; height: 4px; background: #333; accent-color: #00ffff; cursor: pointer; margin-top: 4px;" />
        </div>
        
        <div style="margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #aaa;">
            <span>Rotation Y (Xoay Yaw)</span>
            <span id="val-ghost-rotation-y">0°</span>
          </div>
          <input type="range" id="range-ghost-rotation-y" min="0" max="360" value="0" style="width: 100%; height: 4px; background: #333; accent-color: #00ffff; cursor: pointer; margin-top: 4px;" />
        </div>
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; margin-top: 10px;">
          <div style="width: 55%;">
            <div style="display: flex; justify-content: space-between; font-size: 11px; color: #aaa; padding-right: 10px;">
              <span>Opacity</span>
              <span id="val-ghost-opacity">0.15</span>
            </div>
            <input type="range" id="range-ghost-opacity" min="0.02" max="0.8" step="0.01" value="0.15" style="width: 90%; height: 4px; background: #333; accent-color: #00ffff; cursor: pointer; margin-top: 4px;" />
          </div>
          <div style="width: 45%; display: flex; align-items: center; gap: 6px; margin-top: 6px;">
            <input type="checkbox" id="chk-ghost-wireframe" checked style="accent-color: #00ffff; cursor: pointer;" />
            <label for="chk-ghost-wireframe" style="font-size: 11px; color: #aaa; cursor: pointer; user-select: none;">Wireframe</label>
          </div>
        </div>
        
        <button class="btn btn-secondary" id="btn-clear-ghost-model" style="margin-top: 5px; background-color: #444; border: 1px solid #555; font-size: 12px; padding: 6px 10px; color: #fff;">
          🗑️ Xóa Hologram
        </button>
      </div>
    </div>
  `;
}

export function setupShapePanel(state, director) {
  let customShapeData = null;

  document.getElementById('ui-shape-type').addEventListener('change', (e) => {
    const isText = e.target.value === 'text';
    const isJson = e.target.value === 'json';
    document.getElementById('ui-text-container').style.display = isText ? 'flex' : 'none';
    const jsonContainer = document.getElementById('ui-json-container');
    if (jsonContainer) jsonContainer.style.display = isJson ? 'flex' : 'none';

    // Hide radius and height if json is selected
    const p1Container = document.getElementById('ui-shape-p1').parentElement;
    const p2Container = document.getElementById('ui-shape-p2').parentElement;
    if (isJson) {
      p1Container.style.display = 'none';
      p2Container.style.display = 'none';
    } else {
      p1Container.style.display = 'flex';
      p2Container.style.display = 'flex';
    }
  });

  document.getElementById('ui-shape-json-file')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) {
      customShapeData = null;
      document.getElementById('ui-json-status').textContent = 'No file selected';
      document.getElementById('ui-json-status').style.color = '#888';
      return;
    }
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
             customShapeData = { positions, colors };
             document.getElementById('ui-json-status').textContent = `Loaded ${positions.length} points`;
             document.getElementById('ui-json-status').style.color = '#4CAF50';
          } else {
             throw new Error("No valid coordinates found");
          }
        } else {
          throw new Error("JSON must be an array of objects");
        }
      } catch (err) {
        customShapeData = null;
        document.getElementById('ui-json-status').textContent = 'Invalid JSON format';
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
    const p2 = parseFloat(document.getElementById('ui-shape-p2').value) || 30;
    const textVal = document.getElementById('ui-shape-text').value;

    const cx = parseFloat(document.getElementById('ui-shape-cx').value) || 0;
    const cy = parseFloat(document.getElementById('ui-shape-cy').value) || 0;
    const cz = parseFloat(document.getElementById('ui-shape-cz').value) || 0;

    if (type === 'json' && !customShapeData) {
       alert("Please choose a valid JSON file first.");
       return;
    }

    // Define default params for shapes with base height 0
    let params = { y: 0, fill: fill };
    if (type === 'grid') params = { spacing: p1, y: 0, fill };
    if (type === 'circle') params = { radius: p1, y: 0, fill };
    if (type === 'sphere') params = { radius: p1, y: 0, fill };
    if (type === 'cube') params = { spacing: p1, y: 0, fill };
    if (type === 'cylinder') params = { radius: p1, height: p2, y: 0, fill };
    if (type === 'star') params = { radius: p1, y: 0, fill };
    if (type === 'text') params = { text: textVal, spacing: p1, y: 0, fill };

    if (target === 'selected') {
      if (state.selectedIndices.size === 0) {
        alert("Please select some drones first.");
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
      
      // Update colors if json imported
      if (type === 'json' && newColors) {
         let j = 0;
         for (const id of state.selectedIndices) {
            if (j >= newColors.length) break;
            state.colors[id].copy(newColors[j]);
            j++;
         }
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

      // Inject into active memory
      for (let i = 0; i < count; i++) {
        state.positions.push(positions[i]);
        state.colors.push(colors[i]);
        state.particleGroups.push(groupName);
        state.effects.push('none');
      }

      // Inject into all other steps to keep indices aligned
      for (let sIndex = 0; sIndex < state.steps.length; sIndex++) {
        if (sIndex === state.currentStepIndex) continue;
        const step = state.steps[sIndex];
        for (let i = 0; i < count; i++) {
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

      state.center.set(cx, cy, cz); // Update center
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

  // --- Hologram Guide Model Bindings ---
  if (director) {
    const config = state.ghostModelConfig;

    // Sync HTML inputs with the current state
    document.getElementById('range-ghost-offset-y').value = config.position.y;
    document.getElementById('val-ghost-offset-y').textContent = `${config.position.y}m`;

    document.getElementById('range-ghost-offset-x').value = config.position.x;
    document.getElementById('val-ghost-offset-x').textContent = `${config.position.x}m`;

    document.getElementById('range-ghost-offset-z').value = config.position.z;
    document.getElementById('val-ghost-offset-z').textContent = `${config.position.z}m`;

    document.getElementById('range-ghost-scale').value = config.scale;
    document.getElementById('val-ghost-scale').textContent = `${config.scale.toFixed(1)}x`;

    document.getElementById('range-ghost-rotation-y').value = config.rotationY;
    document.getElementById('val-ghost-rotation-y').textContent = `${config.rotationY}°`;

    document.getElementById('range-ghost-opacity').value = config.opacity;
    document.getElementById('val-ghost-opacity').textContent = config.opacity;

    document.getElementById('chk-ghost-wireframe').checked = config.wireframe;

    // Sync Click-to-Place Snapping Button Style
    const toggleBtn = document.getElementById('btn-toggle-ghost-draw');
    const syncButtonUI = () => {
      if (state.isClickToPlaceActive) {
        toggleBtn.textContent = '🎨 Bút vẽ Drone: BẬT (Click để đặt)';
        toggleBtn.style.backgroundColor = '#00ffff';
        toggleBtn.style.color = '#000';
        toggleBtn.style.boxShadow = '0 0 10px #00ffff';
        toggleBtn.style.fontWeight = 'bold';
        toggleBtn.style.borderColor = '#00ffff';
      } else {
        toggleBtn.textContent = '🎨 Bút vẽ Drone: Tắt';
        toggleBtn.style.backgroundColor = '#444';
        toggleBtn.style.color = '#fff';
        toggleBtn.style.boxShadow = 'none';
        toggleBtn.style.fontWeight = 'normal';
        toggleBtn.style.borderColor = '#444';
      }
    };
    syncButtonUI();

    // 1. File Upload Selector
    document.getElementById('ui-ghost-model-file').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        director.loadGhostModel(file);
      }
    });

    // 2. Click-to-Place Toggle Mode Button
    toggleBtn.addEventListener('click', () => {
      state.isClickToPlaceActive = !state.isClickToPlaceActive;
      syncButtonUI();
    });

    // 3. Y Height Translation Range Slider
    document.getElementById('range-ghost-offset-y').addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      config.position.y = val;
      document.getElementById('val-ghost-offset-y').textContent = `${val}m`;
      director.updateGhostModelTransform();
    });

    // 4. X Horizontal Translation Range Slider
    document.getElementById('range-ghost-offset-x').addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      config.position.x = val;
      document.getElementById('val-ghost-offset-x').textContent = `${val}m`;
      director.updateGhostModelTransform();
    });

    // 5. Z Depth Translation Range Slider
    document.getElementById('range-ghost-offset-z').addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      config.position.z = val;
      document.getElementById('val-ghost-offset-z').textContent = `${val}m`;
      director.updateGhostModelTransform();
    });

    // 6. Scale Multiplying Range Slider
    document.getElementById('range-ghost-scale').addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      config.scale = val;
      document.getElementById('val-ghost-scale').textContent = `${val.toFixed(1)}x`;
      director.updateGhostModelTransform();
    });

    // 7. Rotation Yaw Range Slider
    document.getElementById('range-ghost-rotation-y').addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      config.rotationY = val;
      document.getElementById('val-ghost-rotation-y').textContent = `${val}°`;
      director.updateGhostModelTransform();
    });

    // 8. Opacity Shading Range Slider
    document.getElementById('range-ghost-opacity').addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      config.opacity = val;
      document.getElementById('val-ghost-opacity').textContent = val;
      director.updateGhostModelTransform();
    });

    // 9. Wireframe Toggle Checkbox
    document.getElementById('chk-ghost-wireframe').addEventListener('change', (e) => {
      config.wireframe = e.target.checked;
      director.updateGhostModelTransform();
    });

    // 10. Clear Ghost Model Button
    document.getElementById('btn-clear-ghost-model').addEventListener('click', () => {
      director.clearGhostModel();
      document.getElementById('ui-ghost-model-file').value = '';
    });
  }
}
