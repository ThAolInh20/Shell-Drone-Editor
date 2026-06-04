import { t } from '../../../config/lang/i18n.js';

export function renderFormationShapePanel() {
  return `
    <div class="panel-section">
      <div style="display: flex; gap: 10px; margin-bottom: 10px;">
        <button class="btn" id="btn-export-json" style="background-color: #4CAF50; flex: 1;">${t('editor.filePanel.exportBtn')}</button>
        <button class="btn" id="btn-import-json-trigger" style="background-color: #2196F3; flex: 1;">${t('editor.filePanel.importBtn')}</button>
        <input type="file" id="ui-formation-json-file" accept=".json" style="display: none;" />
      </div>
      <button class="btn" id="btn-clear-all" style="margin-top: 5px; background-color: #d90429; color: white; width: 100%;">${t('editor.shapePanel.clearAllBtn')}</button>
    </div>

    <div class="panel-section" style="margin-top: 20px; border-top: 1px dashed #444; padding-top: 15px;">
      <h3>${t('editor.formationPanel.guideSystemTitle')}</h3>
      <div class="input-group">
        <label>${t('editor.formationPanel.guideModeLabel')}</label>
        <select id="ui-guide-mode" style="width: 120px; background: #222; color: #fff; border: 1px solid #444; padding: 4px; font-size: 12px;">
          <option value="none">${t('editor.formationPanel.guideModeNone')}</option>
          <option value="hologram">${t('editor.formationPanel.guideModeHologram')}</option>
          <option value="reference">${t('editor.formationPanel.guideModeRef')}</option>
        </select>
      </div>
      <!-- Click-to-Place Toggle -->
      <div id="ui-click-to-place-container" style="display: none; margin-top: 15px;">
        <button class="btn" id="btn-toggle-click-to-place" style="width: 100%; font-weight: bold; background: #111; color: #00ffff; border: 2px solid #00ffff; box-shadow: 0 0 8px rgba(0, 255, 255, 0.3); transition: all 0.3s ease;">
          ${t('editor.formationPanel.brushToggleOff')}
        </button>
      </div>
    </div>

    <div id="ui-hologram-section" class="panel-section" style="margin-top: 20px; border-top: 1px dashed #444; padding-top: 15px; display: none;">
      <h3>${t('editor.formationPanel.hologramTitle')}</h3>

      <!-- File Import -->
      <div class="input-group">
        <label>${t('editor.formationPanel.importModelLabel')}</label>
        <input type="file" id="ui-ghost-model-file" accept=".glb,.gltf,.obj" style="width: 100%; font-size: 11px; background: #222; border: 1px solid #444; padding: 4px;" />
      </div>
      <div id="ui-ghost-model-status" style="font-size: 11px; color: #888; margin-top: 4px; font-style: italic;">
        ${t('editor.formationPanel.noModelLoaded')}
      </div>

      <!-- Transform Controls -->
      <div style="margin-top: 15px; border-top: 1px solid #333; padding-top: 10px;">
        <label style="font-weight: bold; font-size: 12px; color: #00ffff;">${t('editor.formationPanel.adjustModel')}</label>
        
        <!-- Y Height Offset -->
        <div class="input-group" style="margin-top: 8px;">
          <label style="font-size: 11px;">${t('editor.formationPanel.heightOffset')}</label>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="range" id="ui-ghost-pos-y" min="-300" max="500" value="20" style="flex: 1;" />
            <span id="ui-ghost-pos-y-val" style="font-size: 11px; width: 30px; text-align: right; font-family: monospace;">20</span>
          </div>
        </div>

        <!-- X Offset -->
        <div class="input-group" style="margin-top: 8px;">
          <label style="font-size: 11px;">${t('editor.formationPanel.xOffset')}</label>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="range" id="ui-ghost-pos-x" min="-500" max="500" value="0" style="flex: 1;" />
            <span id="ui-ghost-pos-x-val" style="font-size: 11px; width: 30px; text-align: right; font-family: monospace;">0</span>
          </div>
        </div>

        <!-- Z Offset -->
        <div class="input-group" style="margin-top: 8px;">
          <label style="font-size: 11px;">${t('editor.formationPanel.zOffset')}</label>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="range" id="ui-ghost-pos-z" min="-500" max="500" value="0" style="flex: 1;" />
            <span id="ui-ghost-pos-z-val" style="font-size: 11px; width: 30px; text-align: right; font-family: monospace;">0</span>
          </div>
        </div>

        <!-- Scale multiplier -->
        <div class="input-group" style="margin-top: 8px;">
          <label style="font-size: 11px;">${t('editor.formationPanel.scaleLabel')}</label>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="range" id="ui-ghost-scale" min="0.05" max="50" step="0.05" value="1.0" style="flex: 1;" />
            <span id="ui-ghost-scale-val" style="font-size: 11px; width: 30px; text-align: right; font-family: monospace;">1.0</span>
          </div>
        </div>

        <!-- Yaw Y rotation -->
        <div class="input-group" style="margin-top: 8px;">
          <label style="font-size: 11px;">${t('editor.formationPanel.rotationYLabel')}</label>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="range" id="ui-ghost-rot-y" min="0" max="360" value="0" style="flex: 1;" />
            <span id="ui-ghost-rot-y-val" style="font-size: 11px; width: 30px; text-align: right; font-family: monospace;">0°</span>
          </div>
        </div>

        <!-- Opacity -->
        <div class="input-group" style="margin-top: 8px;">
          <label style="font-size: 11px;">${t('editor.formationPanel.opacityLabel')}</label>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="range" id="ui-ghost-opacity" min="0.05" max="0.8" step="0.05" value="0.15" style="flex: 1;" />
            <span id="ui-ghost-opacity-val" style="font-size: 11px; width: 30px; text-align: right; font-family: monospace;">0.15</span>
          </div>
        </div>

        <!-- Wireframe Checkbox -->
        <div style="display: flex; align-items: center; gap: 6px; margin-top: 8px;">
          <input type="checkbox" id="ui-ghost-wireframe" checked style="width: auto; margin: 0;" />
          <label for="ui-ghost-wireframe" style="font-size: 11px; margin: 0; cursor: pointer; user-select: none;">${t('editor.formationPanel.wireframeLabel')}</label>
        </div>
      </div>

      <!-- Delete Ghost -->
      <button class="btn" id="btn-clear-ghost" style="margin-top: 15px; background-color: #666; color: white; width: 100%; font-size: 12px;">${t('editor.formationPanel.deleteHologram')}</button>
    </div>

    <div id="ui-ref-image-section" class="panel-section" style="margin-top: 20px; border-top: 1px dashed #444; padding-top: 15px; display: none;">
      <h3>${t('editor.formationPanel.refImageTitle')}</h3>
      
      <!-- File Import -->
      <div class="input-group">
        <label>${t('editor.formationPanel.importImageLabel')}</label>
        <input type="file" id="ui-ref-image-file" accept="image/*" style="width: 100%; font-size: 11px; background: #222; border: 1px solid #444; padding: 4px;" />
      </div>
      <div id="ui-ref-image-status" style="font-size: 11px; color: #888; margin-top: 4px; font-style: italic;">
        ${t('editor.formationPanel.noImageLoaded')}
      </div>

      <!-- Transform Controls -->
      <div style="margin-top: 15px; border-top: 1px solid #333; padding-top: 10px;">
        <label style="font-weight: bold; font-size: 12px; color: #00ffff;">${t('editor.formationPanel.adjustRefImage')}</label>
        
        <!-- Y Height Offset -->
        <div class="input-group" style="margin-top: 8px;">
          <label style="font-size: 11px;">${t('editor.formationPanel.heightOffset')}</label>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="range" id="ui-ref-pos-y" min="-300" max="500" value="20" style="flex: 1;" />
            <span id="ui-ref-pos-y-val" style="font-size: 11px; width: 30px; text-align: right; font-family: monospace;">20</span>
          </div>
        </div>

        <!-- X Offset -->
        <div class="input-group" style="margin-top: 8px;">
          <label style="font-size: 11px;">${t('editor.formationPanel.xOffset')}</label>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="range" id="ui-ref-pos-x" min="-500" max="500" value="0" style="flex: 1;" />
            <span id="ui-ref-pos-x-val" style="font-size: 11px; width: 30px; text-align: right; font-family: monospace;">0</span>
          </div>
        </div>

        <!-- Z Offset -->
        <div class="input-group" style="margin-top: 8px;">
          <label style="font-size: 11px;">${t('editor.formationPanel.zOffset')}</label>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="range" id="ui-ref-pos-z" min="-500" max="500" value="0" style="flex: 1;" />
            <span id="ui-ref-pos-z-val" style="font-size: 11px; width: 30px; text-align: right; font-family: monospace;">0</span>
          </div>
        </div>

        <!-- Scale multiplier -->
        <div class="input-group" style="margin-top: 8px;">
          <label style="font-size: 11px;">${t('editor.formationPanel.scaleLabel')}</label>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="range" id="ui-ref-scale" min="1" max="500" step="1" value="40" style="flex: 1;" />
            <span id="ui-ref-scale-val" style="font-size: 11px; width: 30px; text-align: right; font-family: monospace;">40</span>
          </div>
        </div>

        <!-- Yaw Y rotation -->
        <div class="input-group" style="margin-top: 8px;">
          <label style="font-size: 11px;">${t('editor.formationPanel.rotationYLabel')}</label>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="range" id="ui-ref-rot-y" min="0" max="360" value="0" style="flex: 1;" />
            <span id="ui-ref-rot-y-val" style="font-size: 11px; width: 30px; text-align: right; font-family: monospace;">0°</span>
          </div>
        </div>

        <!-- Orientation Dropdown -->
        <div class="input-group" style="margin-top: 8px;">
          <label style="font-size: 11px;">${t('editor.formationPanel.orientationLabel')}</label>
          <select id="ui-ref-orientation" style="width: 100%; background: #222; color: #fff; border: 1px solid #444; padding: 4px; font-size: 11px;">
            <option value="horizontal">${t('editor.formationPanel.orientationHorizontal')}</option>
            <option value="vertical">${t('editor.formationPanel.orientationVertical')}</option>
          </select>
        </div>

        <!-- Opacity -->
        <div class="input-group" style="margin-top: 8px;">
          <label style="font-size: 11px;">${t('editor.formationPanel.opacityLabel')}</label>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="range" id="ui-ref-opacity" min="0.05" max="0.9" step="0.05" value="0.35" style="flex: 1;" />
            <span id="ui-ref-opacity-val" style="font-size: 11px; width: 30px; text-align: right; font-family: monospace;">0.35</span>
          </div>
        </div>
      </div>

      <!-- Delete Reference Image -->
      <button class="btn" id="btn-clear-ref-image" style="margin-top: 15px; background-color: #666; color: white; width: 100%; font-size: 12px;">${t('editor.formationPanel.deleteRefImage')}</button>
    </div>
  `;
}

export function renderFormationPropertiesPanel() {
  return `
    <div class="panel-section">
      <h3>${t('editor.selectionPanel.title')}</h3>
      <div id="selection-info" style="font-size: 14px; color: #ccc; margin-bottom: 10px;">
        ${t('editor.selectionPanel.selectedCount', { count: 0 })}
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
          <label>${t('editor.selectionPanel.colorLabel')}</label>
          <input type="color" id="ui-color" value="#ffffff" />
        </div>
        <button class="btn" id="btn-break-constraints" style="margin-top: 10px; background-color: #e67e22; color: white; width: 100%;">${t('editor.selectionPanel.breakConstraintsBtn')}</button>
        <button class="btn" id="btn-delete-selected" style="margin-top: 15px; background-color: #ff4d4d; color: white; width: 100%;">${t('editor.selectionPanel.deleteBtn')}</button>
      </div>
    </div>

    <div class="panel-section" style="margin-top: 20px; border-top: 1px solid #444; padding-top: 15px;">
      <h3>${t('editor.selectionPanel.visualsTitle')}</h3>
      <div style="display: flex; gap: 6px; margin-top: 10px; margin-bottom: 15px;">
        <div style="flex: 1;">
          <label style="font-size: 11px; color: #aaa; display: block; margin-bottom: 2px;">${t('editor.selectionPanel.centerX')}</label>
          <input type="number" id="ui-center-x" step="0.5" style="width: 100%; background: #222; color: #fff; border: 1px solid #444; padding: 4px; font-size: 12px;" />
        </div>
        <div style="flex: 1;">
          <label style="font-size: 11px; color: #aaa; display: block; margin-bottom: 2px;">${t('editor.selectionPanel.centerY')}</label>
          <input type="number" id="ui-center-y" step="0.5" style="width: 100%; background: #222; color: #fff; border: 1px solid #444; padding: 4px; font-size: 12px;" />
        </div>
        <div style="flex: 1;">
          <label style="font-size: 11px; color: #aaa; display: block; margin-bottom: 2px;">${t('editor.selectionPanel.centerZ')}</label>
          <input type="number" id="ui-center-z" step="0.5" style="width: 100%; background: #222; color: #fff; border: 1px solid #444; padding: 4px; font-size: 12px;" />
        </div>
      </div>
      
      <div class="checkbox-group" style="display: flex; flex-direction: column; gap: 8px; font-size: 13px;">
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: #ccc;">
          <input type="checkbox" id="ui-show-center" checked style="cursor: pointer;" />
          ${t('editor.selectionPanel.showCenterCheckbox')}
        </label>
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: #ccc;">
          <input type="checkbox" id="ui-show-pivot-lines" style="cursor: pointer;" />
          ${t('editor.selectionPanel.pivotLinesCheckbox')}
        </label>
      </div>
      <button class="btn" id="btn-center-to-selection" style="margin-top: 12px; background-color: #2a9d8f; color: white; width: 100%; font-size: 12px; padding: 6px; display: none;">${t('editor.selectionPanel.centerToSelectionBtn')}</button>
    </div>
  `;
}
