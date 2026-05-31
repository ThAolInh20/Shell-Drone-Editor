import * as THREE from 'three';
import { DroneFormationFactory } from '../../factories/DroneFormationFactory.js';

export function renderFormationShapePanel() {
  return `
    <div class="panel-section">
      <div style="display: flex; gap: 10px; margin-bottom: 10px;">
        <button class="btn" id="btn-export-json" style="background-color: #4CAF50; flex: 1;">Export JSON</button>
        <button class="btn" id="btn-import-json-trigger" style="background-color: #2196F3; flex: 1;">Import JSON</button>
        <input type="file" id="ui-formation-json-file" accept=".json" style="display: none;" />
      </div>
      <button class="btn" id="btn-clear-all" style="margin-top: 5px; background-color: #d90429; color: white; width: 100%;">Clear All Drones</button>
    </div>

    <div class="panel-section" style="margin-top: 20px; border-top: 1px dashed #444; padding-top: 15px;">
      <h3>Hệ thống Dẫn hướng (Guide System)</h3>
      <div class="input-group">
        <label>Chế độ dẫn hướng</label>
        <select id="ui-guide-mode" style="width: 120px; background: #222; color: #fff; border: 1px solid #444; padding: 4px; font-size: 12px;">
          <option value="none">Không sử dụng</option>
          <option value="hologram">Hologram 3D (Model)</option>
          <option value="reference">Ảnh tham chiếu (2D)</option>
        </select>
      </div>
      <!-- Click-to-Place Toggle -->
      <div id="ui-click-to-place-container" style="display: none; margin-top: 15px;">
        <button class="btn" id="btn-toggle-click-to-place" style="width: 100%; font-weight: bold; background: #111; color: #00ffff; border: 2px solid #00ffff; box-shadow: 0 0 8px rgba(0, 255, 255, 0.3); transition: all 0.3s ease;">
          🎨 Bút vẽ Drone: TẮT
        </button>
      </div>
    </div>

    <div id="ui-hologram-section" class="panel-section" style="margin-top: 20px; border-top: 1px dashed #444; padding-top: 15px; display: none;">
      <h3>Hologram Guide (Mô hình ảo ảnh 3D)</h3>

      <!-- File Import -->
      <div class="input-group">
        <label>Import Model (3D)</label>
        <input type="file" id="ui-ghost-model-file" accept=".glb,.gltf,.obj" style="width: 100%; font-size: 11px; background: #222; border: 1px solid #444; padding: 4px;" />
      </div>
      <div id="ui-ghost-model-status" style="font-size: 11px; color: #888; margin-top: 4px; font-style: italic;">
        Chưa tải mô hình
      </div>

      <!-- Transform Controls -->
      <div style="margin-top: 15px; border-top: 1px solid #333; padding-top: 10px;">
        <label style="font-weight: bold; font-size: 12px; color: #00ffff;">Hiệu chỉnh mô hình</label>
        
        <!-- Y Height Offset -->
        <div class="input-group" style="margin-top: 8px;">
          <label style="font-size: 11px;">Y Offset (Chiều cao)</label>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="range" id="ui-ghost-pos-y" min="-300" max="500" value="20" style="flex: 1;" />
            <span id="ui-ghost-pos-y-val" style="font-size: 11px; width: 30px; text-align: right; font-family: monospace;">20</span>
          </div>
        </div>

        <!-- X Offset -->
        <div class="input-group" style="margin-top: 8px;">
          <label style="font-size: 11px;">X Offset (Dịch ngang)</label>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="range" id="ui-ghost-pos-x" min="-500" max="500" value="0" style="flex: 1;" />
            <span id="ui-ghost-pos-x-val" style="font-size: 11px; width: 30px; text-align: right; font-family: monospace;">0</span>
          </div>
        </div>

        <!-- Z Offset -->
        <div class="input-group" style="margin-top: 8px;">
          <label style="font-size: 11px;">Z Offset (Dịch sâu)</label>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="range" id="ui-ghost-pos-z" min="-500" max="500" value="0" style="flex: 1;" />
            <span id="ui-ghost-pos-z-val" style="font-size: 11px; width: 30px; text-align: right; font-family: monospace;">0</span>
          </div>
        </div>

        <!-- Scale multiplier -->
        <div class="input-group" style="margin-top: 8px;">
          <label style="font-size: 11px;">Scale (Tỉ lệ)</label>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="range" id="ui-ghost-scale" min="0.05" max="50" step="0.05" value="1.0" style="flex: 1;" />
            <span id="ui-ghost-scale-val" style="font-size: 11px; width: 30px; text-align: right; font-family: monospace;">1.0</span>
          </div>
        </div>

        <!-- Yaw Y rotation -->
        <div class="input-group" style="margin-top: 8px;">
          <label style="font-size: 11px;">Rotation Y (Góc xoay)</label>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="range" id="ui-ghost-rot-y" min="0" max="360" value="0" style="flex: 1;" />
            <span id="ui-ghost-rot-y-val" style="font-size: 11px; width: 30px; text-align: right; font-family: monospace;">0°</span>
          </div>
        </div>

        <!-- Opacity -->
        <div class="input-group" style="margin-top: 8px;">
          <label style="font-size: 11px;">Opacity (Độ mờ)</label>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="range" id="ui-ghost-opacity" min="0.05" max="0.8" step="0.05" value="0.15" style="flex: 1;" />
            <span id="ui-ghost-opacity-val" style="font-size: 11px; width: 30px; text-align: right; font-family: monospace;">0.15</span>
          </div>
        </div>

        <!-- Wireframe Checkbox -->
        <div style="display: flex; align-items: center; gap: 6px; margin-top: 8px;">
          <input type="checkbox" id="ui-ghost-wireframe" checked style="width: auto; margin: 0;" />
          <label for="ui-ghost-wireframe" style="font-size: 11px; margin: 0; cursor: pointer; user-select: none;">Hiển thị dạng khung lưới (Wireframe)</label>
        </div>
      </div>

      <!-- Delete Ghost -->
      <button class="btn" id="btn-clear-ghost" style="margin-top: 15px; background-color: #666; color: white; width: 100%; font-size: 12px;">Xoá Hologram</button>
    </div>

    <div id="ui-ref-image-section" class="panel-section" style="margin-top: 20px; border-top: 1px dashed #444; padding-top: 15px; display: none;">
      <h3>Ảnh tham chiếu 2D (Reference Image)</h3>
      
      <!-- File Import -->
      <div class="input-group">
        <label>Import Ảnh Nền (2D)</label>
        <input type="file" id="ui-ref-image-file" accept="image/*" style="width: 100%; font-size: 11px; background: #222; border: 1px solid #444; padding: 4px;" />
      </div>
      <div id="ui-ref-image-status" style="font-size: 11px; color: #888; margin-top: 4px; font-style: italic;">
        Chưa tải ảnh nền
      </div>

      <!-- Transform Controls -->
      <div style="margin-top: 15px; border-top: 1px solid #333; padding-top: 10px;">
        <label style="font-weight: bold; font-size: 12px; color: #00ffff;">Hiệu chỉnh ảnh nền</label>
        
        <!-- Y Height Offset -->
        <div class="input-group" style="margin-top: 8px;">
          <label style="font-size: 11px;">Y Offset (Chiều cao)</label>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="range" id="ui-ref-pos-y" min="-300" max="500" value="20" style="flex: 1;" />
            <span id="ui-ref-pos-y-val" style="font-size: 11px; width: 30px; text-align: right; font-family: monospace;">20</span>
          </div>
        </div>

        <!-- X Offset -->
        <div class="input-group" style="margin-top: 8px;">
          <label style="font-size: 11px;">X Offset (Dịch ngang)</label>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="range" id="ui-ref-pos-x" min="-500" max="500" value="0" style="flex: 1;" />
            <span id="ui-ref-pos-x-val" style="font-size: 11px; width: 30px; text-align: right; font-family: monospace;">0</span>
          </div>
        </div>

        <!-- Z Offset -->
        <div class="input-group" style="margin-top: 8px;">
          <label style="font-size: 11px;">Z Offset (Dịch sâu)</label>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="range" id="ui-ref-pos-z" min="-500" max="500" value="0" style="flex: 1;" />
            <span id="ui-ref-pos-z-val" style="font-size: 11px; width: 30px; text-align: right; font-family: monospace;">0</span>
          </div>
        </div>

        <!-- Scale multiplier -->
        <div class="input-group" style="margin-top: 8px;">
          <label style="font-size: 11px;">Kích thước (Scale)</label>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="range" id="ui-ref-scale" min="1" max="500" step="1" value="40" style="flex: 1;" />
            <span id="ui-ref-scale-val" style="font-size: 11px; width: 30px; text-align: right; font-family: monospace;">40</span>
          </div>
        </div>

        <!-- Yaw Y rotation -->
        <div class="input-group" style="margin-top: 8px;">
          <label style="font-size: 11px;">Góc xoay Y</label>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="range" id="ui-ref-rot-y" min="0" max="360" value="0" style="flex: 1;" />
            <span id="ui-ref-rot-y-val" style="font-size: 11px; width: 30px; text-align: right; font-family: monospace;">0°</span>
          </div>
        </div>

        <!-- Orientation Dropdown -->
        <div class="input-group" style="margin-top: 8px;">
          <label style="font-size: 11px;">Hướng ảnh</label>
          <select id="ui-ref-orientation" style="width: 100%; background: #222; color: #fff; border: 1px solid #444; padding: 4px; font-size: 11px;">
            <option value="horizontal">Nằm ngang (XZ)</option>
            <option value="vertical">Thẳng đứng (XY)</option>
          </select>
        </div>

        <!-- Opacity -->
        <div class="input-group" style="margin-top: 8px;">
          <label style="font-size: 11px;">Opacity (Độ mờ)</label>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="range" id="ui-ref-opacity" min="0.05" max="0.9" step="0.05" value="0.35" style="flex: 1;" />
            <span id="ui-ref-opacity-val" style="font-size: 11px; width: 30px; text-align: right; font-family: monospace;">0.35</span>
          </div>
        </div>
      </div>

      <!-- Delete Reference Image -->
      <button class="btn" id="btn-clear-ref-image" style="margin-top: 15px; background-color: #666; color: white; width: 100%; font-size: 12px;">Xoá ảnh tham chiếu</button>
    </div>
  `;
}

export function setupFormationShapePanel(state, director) {
  // Helper to load parsed formation JSON data safely
  function loadFormationFromData(parsed, filename, filePath = null) {
    let droneData = [];
    let importedConfig = null;
    let importedRefConfig = null;

    if (Array.isArray(parsed)) {
      droneData = parsed;
    } else if (parsed && parsed.drones && Array.isArray(parsed.drones)) {
      droneData = parsed.drones;
      if (parsed.ghostModelConfig) {
        importedConfig = parsed.ghostModelConfig;
      }
      if (parsed.referenceImageConfig) {
        importedRefConfig = parsed.referenceImageConfig;
      }
    } else {
      alert("JSON không đúng định dạng Drone Formation!");
      return false;
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
        const groupName = item.group || item.particleGroup || 'Imported';
        particleGroups.push(groupName);
      }
    }

    if (positions.length > 0) {
      state.positions = positions;
      state.colors = colors;
      state.particleGroups = particleGroups;
      state.selectedIndices.clear();
      state.currentFilePath = filePath;
      state.name = filename.replace('.json', '');

      if (importedConfig) {
        if (importedConfig.position) {
          state.ghostModelConfig.position.set(
            importedConfig.position.x !== undefined ? importedConfig.position.x : 0,
            importedConfig.position.y !== undefined ? importedConfig.position.y : 20,
            importedConfig.position.z !== undefined ? importedConfig.position.z : 0
          );
        }
        if (importedConfig.scale !== undefined) state.ghostModelConfig.scale = importedConfig.scale;
        if (importedConfig.rotationY !== undefined) state.ghostModelConfig.rotationY = importedConfig.rotationY;
        if (importedConfig.opacity !== undefined) state.ghostModelConfig.opacity = importedConfig.opacity;
        if (importedConfig.wireframe !== undefined) state.ghostModelConfig.wireframe = importedConfig.wireframe;
        if (director && typeof director.updateGhostModelTransform === 'function') {
          director.updateGhostModelTransform();
        }
      }

      if (importedRefConfig) {
        if (importedRefConfig.position) {
          state.referenceImageConfig.position.set(
            importedRefConfig.position.x !== undefined ? importedRefConfig.position.x : 0,
            importedRefConfig.position.y !== undefined ? importedRefConfig.position.y : 20,
            importedRefConfig.position.z !== undefined ? importedRefConfig.position.z : 0
          );
        }
        if (importedRefConfig.scale !== undefined) state.referenceImageConfig.scale = importedRefConfig.scale;
        if (importedRefConfig.rotationY !== undefined) state.referenceImageConfig.rotationY = importedRefConfig.rotationY;
        if (importedRefConfig.opacity !== undefined) state.referenceImageConfig.opacity = importedRefConfig.opacity;
        if (importedRefConfig.orientation !== undefined) state.referenceImageConfig.orientation = importedRefConfig.orientation;
        if (director && typeof director.updateReferenceImageTransform === 'function') {
          director.updateReferenceImageTransform();
        }
      }

      if (parsed.guideMode) {
        state.guideMode = parsed.guideMode;
      } else {
        if (importedConfig) state.guideMode = 'hologram';
        else if (importedRefConfig && importedRefConfig.url) state.guideMode = 'reference';
        else state.guideMode = 'none';
      }

      if (parsed.bezierControlPoints && Array.isArray(parsed.bezierControlPoints)) {
        state.bezierControlPoints = parsed.bezierControlPoints.map(p => new THREE.Vector3(
          p.x !== undefined ? p.x : 0,
          p.y !== undefined ? p.y : 20,
          p.z !== undefined ? p.z : 0
        ));
      }

      state.saveStateToHistory();
      state.notify();
      return true;
    } else {
      alert("Không tìm thấy dữ liệu tọa độ drone hợp lệ trong JSON!");
      return false;
    }
  }

  // Export JSON
  document.getElementById('btn-export-json').addEventListener('click', async () => {
    const drones = [];
    for (let i = 0; i < state.positions.length; i++) {
      const pos = state.positions[i];
      const col = state.colors[i] || new THREE.Color(0xffffff);
      const hexStr = col.getHexString();
      const r = parseInt(hexStr.substring(0, 2), 16);
      const g = parseInt(hexStr.substring(2, 4), 16);
      const b = parseInt(hexStr.substring(4, 6), 16);
      const groupName = state.particleGroups[i] || 'Default';
      drones.push({
        x: parseFloat(pos.x.toFixed(2)),
        y: parseFloat(pos.y.toFixed(2)),
        z: parseFloat(pos.z.toFixed(2)),
        r: r,
        g: g,
        b: b,
        group: groupName
      });
    }

    const exportObject = {
      drones,
      guideMode: state.guideMode,
      ghostModelConfig: {
        position: { x: state.ghostModelConfig.position.x, y: state.ghostModelConfig.position.y, z: state.ghostModelConfig.position.z },
        scale: state.ghostModelConfig.scale,
        rotationY: state.ghostModelConfig.rotationY,
        opacity: state.ghostModelConfig.opacity,
        wireframe: state.ghostModelConfig.wireframe
      },
      referenceImageConfig: {
        url: state.referenceImageConfig.url,
        fileName: state.referenceImageConfig.fileName,
        position: { x: state.referenceImageConfig.position.x, y: state.referenceImageConfig.position.y, z: state.referenceImageConfig.position.z },
        scale: state.referenceImageConfig.scale,
        rotationY: state.referenceImageConfig.rotationY,
        opacity: state.referenceImageConfig.opacity,
        orientation: state.referenceImageConfig.orientation
      },
      bezierControlPoints: state.bezierControlPoints.map(p => ({ x: p.x, y: p.y, z: p.z }))
    };

    const content = JSON.stringify(exportObject, null, 2);

    if (window.electronAPI) {
      try {
        const res = await window.electronAPI.saveFileDialog(content, `${state.name}.json`);
        if (res) {
          state.currentFilePath = res.filePath;
          state.name = res.filename.replace('.json', '');
          alert(`Đã lưu tệp static formation thành công: ${res.filename}`);
        }
      } catch (err) {
        alert("Lỗi khi lưu file qua Electron: " + err.message);
      }
    } else {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(content);
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", state.name + ".json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    }
  });

  // Import JSON Trigger
  document.getElementById('btn-import-json-trigger').addEventListener('click', async () => {
    if (window.electronAPI) {
      try {
        const fileData = await window.electronAPI.openFileDialog();
        if (fileData) {
          const { filePath, content, filename } = fileData;
          const parsed = JSON.parse(content);
          if (loadFormationFromData(parsed, filename, filePath)) {
            alert(`Import thành công từ file: ${filename}`);
          }
        }
      } catch (err) {
        alert("Lỗi khi đọc file qua Electron: " + err.message);
      }
    } else {
      document.getElementById('ui-formation-json-file').click();
    }
  });

  // Handle file read (Browser fallback)
  document.getElementById('ui-formation-json-file')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        loadFormationFromData(parsed, file.name);
      } catch (err) {
        alert("Lỗi phân tích cú pháp file JSON!");
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  });

  // Shape generation logic
  const shapeTypeEl = document.getElementById('ui-shape-type');
  if (shapeTypeEl) {
    shapeTypeEl.addEventListener('change', (e) => {
      const isText = e.target.value === 'text';
      const textContainer = document.getElementById('ui-text-container');
      if (textContainer) textContainer.style.display = isText ? 'flex' : 'none';

      const isBezier = e.target.value === 'bezier';
      const bezierContainer = document.getElementById('ui-bezier-container');
      if (bezierContainer) bezierContainer.style.display = isBezier ? 'block' : 'none';
      
      if (isBezier) {
        state.isBezierEditActive = true;
        const btn = document.getElementById('btn-toggle-bezier-edit');
        if (btn) {
          btn.textContent = "🎨 Vẽ & Kéo Cong Bezier: BẬT";
          btn.style.background = "#00ffff";
          btn.style.color = "#000";
          btn.style.boxShadow = "0 0 15px rgba(0, 255, 255, 0.8)";
        }
      } else {
        state.isBezierEditActive = false;
      }
      state.notify();
    });
  }

  const shapeTargetEl = document.getElementById('ui-shape-target');
  if (shapeTargetEl) {
    shapeTargetEl.addEventListener('change', (e) => {
      const isNew = e.target.value === 'new';
      const countContainer = document.getElementById('ui-count-container');
      if (countContainer) countContainer.style.display = isNew ? 'flex' : 'none';
    });
  }

  const btnApplyShapeEl = document.getElementById('btn-apply-shape');
  if (btnApplyShapeEl) {
    btnApplyShapeEl.addEventListener('click', () => {
      const type = document.getElementById('ui-shape-type')?.value;
      const target = document.getElementById('ui-shape-target')?.value;
      const fill = document.getElementById('ui-shape-fill')?.value;
      const p1 = parseFloat(document.getElementById('ui-shape-p1')?.value) || 15;
      const p2 = parseFloat(document.getElementById('ui-shape-p2')?.value) || 30;
      const textVal = document.getElementById('ui-shape-text')?.value;

      const cx = parseFloat(document.getElementById('ui-shape-cx')?.value) || 0;
      const cy = parseFloat(document.getElementById('ui-shape-cy')?.value) || 0;
      const cz = parseFloat(document.getElementById('ui-shape-cz')?.value) || 0;

      let targetCount = 0;
      if (target === 'new') {
        targetCount = parseInt(document.getElementById('ui-count')?.value, 10) || 100;
      } else {
        if (state.selectedIndices.size === 0) {
          alert("No drones selected");
          return;
        }
        targetCount = state.selectedIndices.size;
      }

      let params = { y: 0, fill: fill };
      if (type === 'grid') params = { spacing: p1, y: 0, fill };
      if (type === 'line') params = { spacing: p1, y: 0 };
      if (type === 'triangle') params = { radius: p1, y: 0, fill };
      if (type === 'bezier') params = { p0: state.bezierControlPoints[0], p1: state.bezierControlPoints[1], p2: state.bezierControlPoints[2] };
      if (type === 'circle') params = { radius: p1, y: 0, fill };
      if (type === 'sphere') params = { radius: p1, y: 0, fill };
      if (type === 'cube') params = { spacing: p1, y: 0, fill };
      if (type === 'cylinder') params = { radius: p1, height: p2, y: 0, fill };
      if (type === 'star') params = { radius: p1, y: 0, fill };
      if (type === 'text') params = { text: textVal, spacing: p1, y: 0, fill };

      if (type === 'grid') params.rows = Math.ceil(Math.sqrt(targetCount));
      const positions = DroneFormationFactory.createFormation(type, targetCount, params);

      if (!positions || positions.length === 0) return;

      // Apply offset of designated center coordinate (except absolute Bezier Curve)
      if (type !== 'bezier') {
        const centerOffset = new THREE.Vector3(cx, cy, cz);
        for (const pos of positions) {
          pos.add(centerOffset);
        }
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
  }

  const btnClearAllEl = document.getElementById('btn-clear-all');
  if (btnClearAllEl) {
    btnClearAllEl.addEventListener('click', () => {
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

  // Hologram Guide and Click-to-Place Listeners
  const btnToggle = document.getElementById('btn-toggle-click-to-place');
  if (btnToggle) {
    btnToggle.addEventListener('click', () => {
      state.isClickToPlaceActive = !state.isClickToPlaceActive;
      updateClickToPlaceUI();
      state.notify();
    });
  }

  function updateClickToPlaceUI() {
    const btn = document.getElementById('btn-toggle-click-to-place');
    if (!btn) return;
    if (state.isClickToPlaceActive) {
      btn.textContent = "🎨 Bút vẽ Drone: ĐANG BẬT";
      btn.style.background = "#00ffff";
      btn.style.color = "#111";
      btn.style.boxShadow = "0 0 15px rgba(0, 255, 255, 0.8)";
    } else {
      btn.textContent = "🎨 Bút vẽ Drone: TẮT";
      btn.style.background = "#111";
      btn.style.color = "#00ffff";
      btn.style.boxShadow = "0 0 8px rgba(0, 255, 255, 0.3)";
    }
  }

  // Initialize click-to-place UI
  updateClickToPlaceUI();

  const fileInput = document.getElementById('ui-ghost-model-file');
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (director && typeof director.loadGhostModel === 'function') {
        director.loadGhostModel(file);
      }
    });
  }

  const sliders = [
    { id: 'ui-ghost-pos-y', prop: 'position', subProp: 'y', valId: 'ui-ghost-pos-y-val', suffix: '' },
    { id: 'ui-ghost-pos-x', prop: 'position', subProp: 'x', valId: 'ui-ghost-pos-x-val', suffix: '' },
    { id: 'ui-ghost-pos-z', prop: 'position', subProp: 'z', valId: 'ui-ghost-pos-z-val', suffix: '' },
    { id: 'ui-ghost-scale', prop: 'scale', valId: 'ui-ghost-scale-val', suffix: '' },
    { id: 'ui-ghost-rot-y', prop: 'rotationY', valId: 'ui-ghost-rot-y-val', suffix: '°' },
    { id: 'ui-ghost-opacity', prop: 'opacity', valId: 'ui-ghost-opacity-val', suffix: '' }
  ];

  // Utility to synchronize all Sidebar UI controls from current state values
  function syncGhostModelUIFromState() {
    sliders.forEach(sliderDef => {
      const el = document.getElementById(sliderDef.id);
      const valEl = document.getElementById(sliderDef.valId);
      if (el) {
        let val;
        if (sliderDef.subProp) {
          val = state.ghostModelConfig[sliderDef.prop][sliderDef.subProp];
        } else {
          val = state.ghostModelConfig[sliderDef.prop];
        }
        el.value = val;
        if (valEl) valEl.textContent = val + sliderDef.suffix;
      }
    });

    const wireframeCheckbox = document.getElementById('ui-ghost-wireframe');
    if (wireframeCheckbox) {
      wireframeCheckbox.checked = state.ghostModelConfig.wireframe;
    }
  }

  const refSliders = [
    { id: 'ui-ref-pos-y', prop: 'position', subProp: 'y', valId: 'ui-ref-pos-y-val', suffix: '' },
    { id: 'ui-ref-pos-x', prop: 'position', subProp: 'x', valId: 'ui-ref-pos-x-val', suffix: '' },
    { id: 'ui-ref-pos-z', prop: 'position', subProp: 'z', valId: 'ui-ref-pos-z-val', suffix: '' },
    { id: 'ui-ref-scale', prop: 'scale', valId: 'ui-ref-scale-val', suffix: '' },
    { id: 'ui-ref-rot-y', prop: 'rotationY', valId: 'ui-ref-rot-y-val', suffix: '°' },
    { id: 'ui-ref-opacity', prop: 'opacity', valId: 'ui-ref-opacity-val', suffix: '' }
  ];

  // Utility to synchronize reference image controls from state values
  function syncRefImageUIFromState() {
    refSliders.forEach(sliderDef => {
      const el = document.getElementById(sliderDef.id);
      const valEl = document.getElementById(sliderDef.valId);
      if (el) {
        let val;
        if (sliderDef.subProp) {
          val = state.referenceImageConfig[sliderDef.prop][sliderDef.subProp];
        } else {
          val = state.referenceImageConfig[sliderDef.prop];
        }
        el.value = val;
        if (valEl) valEl.textContent = val + sliderDef.suffix;
      }
    });

    const orientationSelect = document.getElementById('ui-ref-orientation');
    if (orientationSelect) {
      orientationSelect.value = state.referenceImageConfig.orientation;
    }

    const statusLabel = document.getElementById('ui-ref-image-status');
    if (statusLabel) {
      if (state.referenceImageConfig.fileName) {
        statusLabel.textContent = `Đã tải: ${state.referenceImageConfig.fileName}`;
        statusLabel.style.color = "#4CAF50";
      } else {
        statusLabel.textContent = "Chưa tải ảnh nền";
        statusLabel.style.color = "#888";
      }
    }
  }

  function syncGuideModeUI() {
    const dropdown = document.getElementById('ui-guide-mode');
    if (dropdown) {
      dropdown.value = state.guideMode;
    }

    const holoSec = document.getElementById('ui-hologram-section');
    if (holoSec) {
      holoSec.style.display = (state.guideMode === 'hologram') ? 'block' : 'none';
    }

    const refSec = document.getElementById('ui-ref-image-section');
    if (refSec) {
      refSec.style.display = (state.guideMode === 'reference') ? 'block' : 'none';
    }

    const snapContainer = document.getElementById('ui-click-to-place-container');
    if (snapContainer) {
      snapContainer.style.display = (state.guideMode !== 'none') ? 'block' : 'none';
    }
  }

  // Bind initial UI control values
  syncGhostModelUIFromState();
  syncRefImageUIFromState();
  syncBezierUIFromState();
  syncGuideModeUI();

  // Subscribe to state notifications to dynamically sync sliders on Undo/Redo or JSON import
  state.subscribe(() => {
    syncGhostModelUIFromState();
    syncRefImageUIFromState();
    syncBezierUIFromState();
    syncGuideModeUI();
  });

  document.getElementById('ui-guide-mode')?.addEventListener('change', (e) => {
    state.guideMode = e.target.value;
    syncGuideModeUI();
    state.saveStateToHistory();
    state.notify();
  });

  // Bezier Edit Toggler & Slider Listeners
  document.getElementById('btn-toggle-bezier-edit')?.addEventListener('click', () => {
    state.isBezierEditActive = !state.isBezierEditActive;
    syncBezierUIFromState();
    state.notify();
  });

  const bezierYInput = document.getElementById('ui-bezier-control-y');
  const bezierYVal = document.getElementById('ui-bezier-control-y-val');
  if (bezierYInput) {
    bezierYInput.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (bezierYVal) bezierYVal.textContent = val;
      state.bezierControlPoints[1].y = val;
      
      if (director && typeof director.recalculateBezierDrones === 'function') {
        director.recalculateBezierDrones();
      }
      state.notify();
    });
    bezierYInput.addEventListener('change', () => {
      state.saveStateToHistory();
    });
  }

  function syncBezierUIFromState() {
    const btn = document.getElementById('btn-toggle-bezier-edit');
    if (btn) {
      if (state.isBezierEditActive) {
        btn.textContent = "🎨 Vẽ & Kéo Cong Bezier: BẬT";
        btn.style.background = "#00ffff";
        btn.style.color = "#000";
        btn.style.boxShadow = "0 0 15px rgba(0, 255, 255, 0.8)";
      } else {
        btn.textContent = "🎨 Vẽ & Kéo Cong Bezier: TẮT";
        btn.style.background = "#111";
        btn.style.color = "#00ffff";
        btn.style.boxShadow = "0 0 8px rgba(0, 255, 255, 0.3)";
      }
    }
    
    const slider = document.getElementById('ui-bezier-control-y');
    const label = document.getElementById('ui-bezier-control-y-val');
    if (slider && state.bezierControlPoints[1]) {
      const yVal = Math.round(state.bezierControlPoints[1].y);
      slider.value = yVal;
      if (label) label.textContent = yVal;
    }
  }

  sliders.forEach(sliderDef => {
    const el = document.getElementById(sliderDef.id);
    const valEl = document.getElementById(sliderDef.valId);
    if (el) {
      el.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (valEl) valEl.textContent = val + sliderDef.suffix;

        if (sliderDef.subProp) {
          state.ghostModelConfig[sliderDef.prop][sliderDef.subProp] = val;
        } else {
          state.ghostModelConfig[sliderDef.prop] = val;
        }

        if (director && typeof director.updateGhostModelTransform === 'function') {
          director.updateGhostModelTransform();
        }
      });
    }
  });

  const wireframeCheckbox = document.getElementById('ui-ghost-wireframe');
  if (wireframeCheckbox) {
    wireframeCheckbox.addEventListener('change', (e) => {
      state.ghostModelConfig.wireframe = e.target.checked;
      if (director && typeof director.updateGhostModelTransform === 'function') {
        director.updateGhostModelTransform();
      }
    });
  }

  const btnClearGhost = document.getElementById('btn-clear-ghost');
  if (btnClearGhost) {
    btnClearGhost.addEventListener('click', () => {
      if (director && typeof director.clearGhostModel === 'function') {
        director.clearGhostModel();
      }
      const fileInput = document.getElementById('ui-ghost-model-file');
      if (fileInput) fileInput.value = '';
    });
  }

  const refFileInput = document.getElementById('ui-ref-image-file');
  if (refFileInput) {
    refFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (director && typeof director.loadReferenceImage === 'function') {
        director.loadReferenceImage(file);
      }
    });
  }

  refSliders.forEach(sliderDef => {
    const el = document.getElementById(sliderDef.id);
    const valEl = document.getElementById(sliderDef.valId);
    if (el) {
      el.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (valEl) valEl.textContent = val + sliderDef.suffix;

        if (sliderDef.subProp) {
          state.referenceImageConfig[sliderDef.prop][sliderDef.subProp] = val;
        } else {
          state.referenceImageConfig[sliderDef.prop] = val;
        }

        if (director && typeof director.updateReferenceImageTransform === 'function') {
          director.updateReferenceImageTransform();
        }
      });
      el.addEventListener('change', () => {
        state.saveStateToHistory();
      });
    }
  });

  const orientationSelect = document.getElementById('ui-ref-orientation');
  if (orientationSelect) {
    orientationSelect.addEventListener('change', (e) => {
      state.referenceImageConfig.orientation = e.target.value;
      if (director && typeof director.updateReferenceImageTransform === 'function') {
        director.updateReferenceImageTransform();
      }
      state.saveStateToHistory();
    });
  }

  const btnClearRef = document.getElementById('btn-clear-ref-image');
  if (btnClearRef) {
    btnClearRef.addEventListener('click', () => {
      if (director && typeof director.clearReferenceImage === 'function') {
        director.clearReferenceImage();
      }
      const refFileInput = document.getElementById('ui-ref-image-file');
      if (refFileInput) refFileInput.value = '';
      state.saveStateToHistory();
    });
  }
}
