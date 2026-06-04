import { t } from '../../../config/lang/i18n.js';

export function renderFilePanel() {
  return `
    <div class="panel-section">
      <h3>${t('editor.filePanel.title')}</h3>
      <div class="input-group">
        <label>${t('editor.filePanel.formatName')}</label>
        <input type="text" id="ui-name" value="NewFormat" style="width: 120px;" />
      </div>
      <button class="btn" id="btn-export">${t('editor.filePanel.exportBtn')}</button>
      <input type="file" id="file-import" accept=".json" style="display: none;" />
      <button class="btn btn-secondary" id="btn-import">${t('editor.filePanel.importBtn')}</button>
      <input type="file" id="file-import-append" accept=".json" style="display: none;" />
      <button class="btn btn-secondary" id="btn-import-append" style="margin-top: 5px;">${t('editor.filePanel.importAppendBtn')}</button>
    </div>
  `;
}

export function renderGroupPanel() {
  return `
    <div class="panel-section">
      <h3>${t('editor.groupsPanel.title')}</h3>
      <div style="display: flex; flex-direction: column; gap: 5px; margin-bottom: 10px;">
        <div style="display: flex; gap: 5px;">
          <button class="btn btn-secondary" id="btn-group-selected" style="margin-bottom: 0; padding: 5px; flex: 1; font-size: 11px;" title="${t('editor.groupsPanel.groupNestedTooltip')}">${t('editor.groupsPanel.groupNested')}</button>
          <button class="btn btn-secondary" id="btn-group-selected-flat" style="margin-bottom: 0; padding: 5px; flex: 1; font-size: 11px;" title="${t('editor.groupsPanel.groupFlatTooltip')}">${t('editor.groupsPanel.groupFlat')}</button>
        </div>
        <button class="btn btn-secondary" id="btn-ungroup" style="margin-bottom: 0; padding: 5px; width: 100%; font-size: 11px;">${t('editor.groupsPanel.ungroup')}</button>
      </div>
      <button class="btn btn-secondary" id="btn-reset-group" style="margin-bottom: 10px; width: 100%; padding: 6px; font-size: 11px; background-color: #3a86ff; color: white; display: flex; align-items: center; justify-content: center; gap: 5px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">${t('editor.groupsPanel.resetGroup')}</button>
      <div id="group-list" style="max-height: 350px; overflow-y: auto; background: #222; border: 1px solid #444; border-radius: 4px; padding: 5px;">
        <!-- Group items injected here -->
      </div>
    </div>
  `;
}

export function renderGizmoPanel() {
  return `
    <div class="panel-section">
      <h3>${t('editor.gizmoPanel.title')}</h3>
      <div class="gizmo-controls">
        <button class="gizmo-btn active" data-mode="translate">${t('editor.gizmoPanel.move')}</button>
        <button class="gizmo-btn" data-mode="rotate">${t('editor.gizmoPanel.rotate')}</button>
        <button class="gizmo-btn" data-mode="scale">${t('editor.gizmoPanel.scale')}</button>
      </div>

      <!-- Group Bending & Flattening Deformer Section -->
      <div id="ui-group-deform-section" style="margin-top: 15px; border-top: 1px dashed #444; padding-top: 15px; display: none;">
        <h4 style="color: #00ffff; font-size: 12px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.5px;">${t('editor.gizmoPanel.deformerTitle')}</h4>
        
        <button class="btn" id="btn-deform-mode-toggle" style="width: 100%; margin-bottom: 10px; background: #111; color: #00ffff; border: 1.5px solid #00ffff; font-weight: bold; cursor: pointer; padding: 6px 12px; border-radius: 4px; box-shadow: 0 0 8px rgba(0, 255, 255, 0.2); transition: all 0.2s;">
          ${t('editor.gizmoPanel.deformerToggleOff')}
        </button>

        <div id="ui-deform-controls-container" style="display: none; flex-direction: column; gap: 8px; margin-top: 5px;">
          <div class="input-group" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
            <label style="font-size: 11px; color: #ccc;">${t('editor.gizmoPanel.deformType')}</label>
            <select id="ui-deform-type" style="width: 120px; background: #222; color: #fff; border: 1px solid #444; padding: 4px; font-size: 11px;">
              <option value="bend">${t('editor.gizmoPanel.deformBend')}</option>
              <option value="straighten">${t('editor.gizmoPanel.deformStraighten')}</option>
            </select>
          </div>

          <!-- Flattening Strength Slider -->
          <div class="input-group" id="ui-deform-strength-container" style="display: none; margin-bottom: 5px;">
            <label style="font-size: 11px; color: #ccc;">${t('editor.gizmoPanel.deformStrength')}</label>
            <div style="display: flex; align-items: center; gap: 8px; margin-top: 2px;">
              <input type="range" id="ui-deform-strength" min="0" max="100" value="100" style="flex: 1;" />
              <span id="ui-deform-strength-val" style="font-size: 11px; width: 32px; text-align: right; font-family: monospace; color: #00ffff;">100%</span>
            </div>
          </div>

          <div style="font-size: 10.5px; color: #888; margin-bottom: 8px; font-style: italic; line-height: 1.3;">
            ${t('editor.gizmoPanel.deformHelp')}
          </div>

          <div style="display: flex; gap: 6px;">
            <button class="btn" id="btn-deform-apply" style="flex: 1; background: #4CAF50; color: white; padding: 6px; font-size: 11px; font-weight: bold; margin: 0;">${t('editor.gizmoPanel.apply')}</button>
            <button class="btn" id="btn-deform-cancel" style="flex: 1; background: #d90429; color: white; padding: 6px; font-size: 11px; font-weight: bold; margin: 0;">${t('editor.gizmoPanel.cancel')}</button>
          </div>
        </div>
      </div>

      <div style="margin-top: 10px; font-size: 12px; color: #888;">
        ${t('editor.gizmoPanel.multiselectHelp')}
      </div>
      <div style="margin-top: 10px; display: flex; gap: 5px;">
        <button class="btn btn-secondary" id="btn-undo" style="margin-bottom: 0; padding: 5px;">${t('editor.gizmoPanel.undo')}</button>
        <button class="btn btn-secondary" id="btn-redo" style="margin-bottom: 0; padding: 5px;">${t('editor.gizmoPanel.redo')}</button>
      </div>
      <label style="display: block; margin-top: 10px; font-size: 14px; cursor: pointer;">
        <input type="checkbox" id="ui-select-group" checked /> ${t('editor.gizmoPanel.selectGroupCheckbox')}
      </label>
    </div>
  `;
}

export function renderSelectionPanel() {
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
        <div class="input-group" style="margin-top: 15px;">
          <label>${t('editor.selectionPanel.effectLabel')}</label>
          <select id="ui-effect" style="width: 120px; background: #222; color: #fff; border: 1px solid #444; padding: 4px;">
            <option value="none">${t('editor.selectionPanel.effectNone')}</option>
            <option value="wave">${t('editor.selectionPanel.effectWave')}</option>
            <option value="swing">${t('editor.selectionPanel.effectSwing')}</option>
            <option value="pulse">${t('editor.selectionPanel.effectPulse')}</option>
            <option value="strobe">${t('editor.selectionPanel.effectStrobe')}</option>
            <option value="shimmer">${t('editor.selectionPanel.effectShimmer')}</option>
          </select>
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

export function renderStepPanel() {
  return `
    <div class="panel-section" style="max-height: 80vh; overflow-y: auto; padding-right: 5px;">
      <h3>${t('editor.stepPanel.title')}</h3>
      <div id="step-props" style="display: flex; flex-direction: column; gap: 10px;">
        
        <!-- SECTION 1: TIMING (GLOBAL) -->
        <div style="font-weight: bold; margin-top: 5px; margin-bottom: 5px; color: #3a86ff; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid #333; padding-bottom: 2px;">${t('editor.stepPanel.timingGlobal')}</div>
        <div class="input-group">
          <label>${t('editor.stepPanel.holdTime')}</label>
          <input type="number" id="ui-step-hold-time" step="100" style="width: 120px;" />
        </div>
        <div class="input-group" id="ui-step-transition-time-container">
          <label>${t('editor.stepPanel.transitionTime')}</label>
          <input type="number" id="ui-step-transition-time" step="100" style="width: 120px;" />
        </div>
        <div class="input-group">
          <label>${t('editor.stepPanel.uiColor') || 'UI Color'}</label>
          <input type="color" id="ui-step-color" value="#333333" style="width: 45px; height: 22px; border: 1px solid #444; padding: 0; background: none; cursor: pointer; border-radius: 4px;" />
        </div>

        <!-- SECTION 2: TRANSITION CONFIG (GROUP) -->
        <div style="font-weight: bold; margin-top: 10px; margin-bottom: 5px; color: #3a86ff; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid #333; padding-bottom: 2px;">${t('editor.stepPanel.transitionStyle')}</div>
        <div class="input-group">
          <label>${t('editor.stepPanel.mode')}</label>
          <select id="ui-step-mode" style="width: 120px; background: #222; color: #fff; border: 1px solid #444; padding: 4px;">
            <option value="transform">${t('editor.stepPanel.modeTransform')}</option>
            <option value="move">${t('editor.stepPanel.modeMove')}</option>
            <option value="disperse">${t('editor.stepPanel.modeDisperse')}</option>
            <option value="vortex">${t('editor.stepPanel.modeVortex')}</option>
            <option value="cascade">${t('editor.stepPanel.modeCascade')}</option>
            <option value="helix">${t('editor.stepPanel.modeHelix')}</option>
          </select>
        </div>

        <!-- Transition Direction -->
        <div class="input-group" id="ui-step-trans-move-dir-container" style="display: none;">
          <label>${t('editor.stepPanel.rotationDirection')}</label>
          <select id="ui-step-trans-move-dir" style="width: 120px; background: #222; color: #fff; border: 1px solid #444; padding: 4px;">
            <option value="alternate">${t('editor.stepPanel.dirAlternate')}</option>
            <option value="clockwise">${t('editor.stepPanel.dirClockwise')}</option>
            <option value="counter">${t('editor.stepPanel.dirCounter')}</option>
          </select>
        </div>

        <!-- Transition Light Effect -->
        <div class="input-group">
          <label>${t('editor.stepPanel.flightLightEff')}</label>
          <select id="ui-step-trans-light-effect" style="width: 120px; background: #222; color: #fff; border: 1px solid #444; padding: 4px;">
            <option value="none">${t('editor.stepPanel.effLightNone')}</option>
            <option value="sparkle-spark">${t('editor.stepPanel.effLightSparkle')}</option>
            <option value="sparkle-spark-random">${t('editor.stepPanel.effLightSparkleRandom') || 'Sparkle Random'}</option>
            <option value="patch-spark">${t('editor.stepPanel.effLightPatchSparkle')}</option>
            <option value="blackout">${t('editor.stepPanel.effLightBlackout')}</option>
            <option value="rainbow">${t('editor.stepPanel.effLightRainbow')}</option>
            <option value="strobe">${t('editor.stepPanel.effLightStrobe')}</option>
          </select>
        </div>
        <div id="ui-step-trans-light-settings" style="display: none; flex-direction: column; gap: 8px; padding-left: 10px; border-left: 2px solid #3a86ff; margin-bottom: 5px;">
          <div class="input-group" id="ui-step-trans-light-color-container" style="display: none;">
            <label style="font-size: 11px; color: #aaa;">${t('editor.stepPanel.sparkleCol')}</label>
            <input type="color" id="ui-step-trans-light-color" value="#ffffff" style="width: 40px; height: 20px; border: none; padding: 0; background: none; cursor: pointer;" />
          </div>
          <div class="input-group">
            <label id="lbl-step-trans-light-speed" style="font-size: 11px; color: #aaa;">${t('editor.stepPanel.lightSpeed')}</label>
            <input type="range" id="ui-step-trans-light-speed" min="0.1" max="5.0" step="0.1" value="1.0" style="width: 80px;" />
            <span id="val-step-trans-light-speed" style="font-size: 11px; color: #888; width: 25px; text-align: right;">1.0x</span>
          </div>
          <div class="input-group">
            <label id="lbl-step-trans-light-freq" style="font-size: 11px; color: #aaa;">${t('editor.stepPanel.lightFreq')}</label>
            <input type="range" id="ui-step-trans-light-freq" min="0.0" max="3.0" step="0.1" value="1.0" style="width: 80px;" />
            <span id="val-step-trans-light-freq" style="font-size: 11px; color: #888; width: 25px; text-align: right;">1.0x</span>
          </div>
        </div>

        <!-- SECTION 3: HOLD CONFIG (GROUP) -->
        <div style="font-weight: bold; margin-top: 10px; margin-bottom: 5px; color: #3a86ff; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid #333; padding-bottom: 2px;">${t('editor.stepPanel.holdStyle')}</div>
        
        <!-- Hold Move Effect -->
        <div class="input-group">
          <label>${t('editor.stepPanel.holdMoveEff')}</label>
          <select id="ui-step-hold-move-effect" style="width: 120px; background: #222; color: #fff; border: 1px solid #444; padding: 4px;">
            <option value="none">${t('editor.stepPanel.effNone')}</option>
            <option value="wave">${t('editor.stepPanel.effWave')}</option>
            <option value="swing">${t('editor.stepPanel.effSwing')}</option>
            <option value="pulse">${t('editor.stepPanel.effPulse')}</option>
            <option value="orbit">${t('editor.stepPanel.effOrbit')}</option>
            <option value="spiral">${t('editor.stepPanel.effSpiral')}</option>
            <option value="expand">${t('editor.stepPanel.effExpand')}</option>
          </select>
        </div>

        <!-- Hold Move Effect Direction -->
        <div class="input-group" id="ui-step-hold-move-dir-container" style="display: none;">
          <label>${t('editor.stepPanel.rotationDirection')}</label>
          <select id="ui-step-hold-move-dir" style="width: 120px; background: #222; color: #fff; border: 1px solid #444; padding: 4px;">
            <option value="clockwise">${t('editor.stepPanel.dirClockwise')}</option>
            <option value="counter">${t('editor.stepPanel.dirCounter')}</option>
          </select>
        </div>
        <div id="ui-step-hold-move-settings" style="display: none; flex-direction: column; gap: 8px; padding-left: 10px; border-left: 2px solid #3a86ff; margin-bottom: 5px;">
          <div class="input-group">
            <label style="font-size: 11px; color: #aaa;">${t('editor.stepPanel.moveSpeed')}</label>
            <input type="range" id="ui-step-hold-move-speed" min="0.1" max="5.0" step="0.1" value="1.0" style="width: 80px;" />
            <span id="val-step-hold-move-speed" style="font-size: 11px; color: #888; width: 25px; text-align: right;">1.0x</span>
          </div>
          <div class="input-group">
            <label style="font-size: 11px; color: #aaa;">${t('editor.stepPanel.moveFreq')}</label>
            <input type="range" id="ui-step-hold-move-freq" min="0.0" max="3.0" step="0.1" value="1.0" style="width: 80px;" />
            <span id="val-step-hold-move-freq" style="font-size: 11px; color: #888; width: 25px; text-align: right;">1.0x</span>
          </div>
        </div>

        <!-- SECTION 4: LANDING STYLE (GROUP) -->
        <div style="font-weight: bold; margin-top: 10px; margin-bottom: 5px; color: #3a86ff; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid #333; padding-bottom: 2px;">${t('editor.stepPanel.landingStyle')}</div>
        
        <!-- Landing Color Effect -->
        <div class="input-group">
          <label>${t('editor.stepPanel.landingColor')}</label>
          <select id="ui-step-landing-light-effect" style="width: 120px; background: #222; color: #fff; border: 1px solid #444; padding: 4px;">
            <option value="none">${t('editor.stepPanel.effLandingInstant')}</option>
            <option value="radial">${t('editor.stepPanel.effLandingRadial')}</option>
            <option value="linear-lr">${t('editor.stepPanel.effLandingLeftRight')}</option>
            <option value="linear-rl">${t('editor.stepPanel.effLandingRightLeft')}</option>
          </select>
        </div>
        <div id="ui-step-landing-light-settings" style="display: none; flex-direction: column; gap: 8px; padding-left: 10px; border-left: 2px solid #3a86ff; margin-bottom: 5px;">
          <div class="input-group">
            <label style="font-size: 11px; color: #aaa;">${t('editor.stepPanel.landingSpeed')}</label>
            <input type="range" id="ui-step-landing-light-speed" min="0.1" max="5.0" step="0.1" value="1.0" style="width: 80px;" />
            <span id="val-step-landing-light-speed" style="font-size: 11px; color: #888; width: 25px; text-align: right;">1.0x</span>
          </div>
          <div class="input-group">
            <label style="font-size: 11px; color: #aaa;">${t('editor.stepPanel.landingFreq')}</label>
            <input type="range" id="ui-step-landing-light-freq" min="0.0" max="3.0" step="0.1" value="1.0" style="width: 80px;" />
            <span id="val-step-landing-light-freq" style="font-size: 11px; color: #888; width: 25px; text-align: right;">1.0x</span>
          </div>
        </div>

      </div>
    </div>
  `;
}
