import { t } from '../../../config/lang/i18n.js';

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


        <!-- Transition Light Effect -->
        <div class="input-group">
          <label>${t('editor.stepPanel.flightLightEff')}</label>
          <select id="ui-step-trans-light-effect" style="width: 120px; background: #222; color: #fff; border: 1px solid #444; padding: 4px;">
            <option value="none">${t('editor.stepPanel.effLightNone')}</option>
            <option value="sparkle-spark">${t('editor.stepPanel.effLightSparkle')}</option>
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

export function setupStepPanel(state) {
  const getGroupsToUpdate = (state) => {
    const selectedGroups = new Set();
    for (const idx of state.selectedIndices) {
      const g = state.particleGroups[idx];
      if (g) {
        const rootGroup = String(g).split('/')[0];
        selectedGroups.add(rootGroup);
      }
    }
    if (selectedGroups.size > 0) {
      return Array.from(selectedGroups);
    }
    const rootActive = String(state.activeGroup || 'Default').split('/')[0];
    return [rootActive];
  };

  const updateSettingsVisibility = () => {
    const transLightEff = document.getElementById('ui-step-trans-light-effect')?.value || 'none';
    const holdMoveEff = document.getElementById('ui-step-hold-move-effect')?.value || 'none';
    const landingLightEff = document.getElementById('ui-step-landing-light-effect')?.value || 'none';

    const transLightSettings = document.getElementById('ui-step-trans-light-settings');
    const holdMoveSettings = document.getElementById('ui-step-hold-move-settings');
    const landingLightSettings = document.getElementById('ui-step-landing-light-settings');
    
    if (transLightSettings) {
      transLightSettings.style.display = transLightEff !== 'none' ? 'flex' : 'none';
      
      const colorContainer = document.getElementById('ui-step-trans-light-color-container');
      if (colorContainer) {
        colorContainer.style.display = ['sparkle-spark', 'patch-spark'].includes(transLightEff) ? 'flex' : 'none';
      }

      const lblSpeed = document.getElementById('lbl-step-trans-light-speed');
      const lblFreq = document.getElementById('lbl-step-trans-light-freq');
      const speedSlider = document.getElementById('ui-step-trans-light-speed');
      const freqSlider = document.getElementById('ui-step-trans-light-freq');

      if (transLightEff === 'blackout') {
        if (speedSlider) speedSlider.closest('.input-group').style.display = 'none';
        if (freqSlider) freqSlider.closest('.input-group').style.display = 'none';
      } else {
        if (speedSlider) speedSlider.closest('.input-group').style.display = 'flex';
        if (freqSlider) freqSlider.closest('.input-group').style.display = 'flex';
        
        if (['sparkle-spark', 'patch-spark'].includes(transLightEff)) {
          if (lblSpeed) lblSpeed.textContent = t('editor.stepPanel.sparkFreq');
          if (lblFreq) lblFreq.textContent = t('editor.stepPanel.sparkQty');
        } else {
          if (lblSpeed) lblSpeed.textContent = t('editor.stepPanel.lightSpeed');
          if (lblFreq) lblFreq.textContent = t('editor.stepPanel.lightFreq');
        }
      }

    }
    
    if (holdMoveSettings) holdMoveSettings.style.display = holdMoveEff !== 'none' ? 'flex' : 'none';
    if (landingLightSettings) landingLightSettings.style.display = landingLightEff !== 'none' ? 'flex' : 'none';
  };

  // Timing (Global)
  document.getElementById('ui-step-hold-time').addEventListener('change', (e) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val >= 0) {
      state.steps[state.currentStepIndex].holdTime = val;
      state.saveCurrentStep();
      state.recalculateTimes();
      state.notify();
    }
  });

  document.getElementById('ui-step-transition-time')?.addEventListener('change', (e) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val >= 0) {
      state.steps[state.currentStepIndex].transitionTime = val;
      state.saveCurrentStep();
      state.recalculateTimes();
      state.notify();
    }
  });

  // Mode & Transition Effects
  document.getElementById('ui-step-mode').addEventListener('change', (e) => {
    for (const group of getGroupsToUpdate(state)) {
      state.getGroupConfig(group).transitionMode = e.target.value;
    }
    state.saveCurrentStep();
    state.notify();
  });



  document.getElementById('ui-step-trans-light-effect').addEventListener('change', (e) => {
    for (const group of getGroupsToUpdate(state)) {
      state.getGroupConfig(group).transitionLightEffect = e.target.value;
    }
    state.saveCurrentStep();
    updateSettingsVisibility();
    state.notify();
  });

  document.getElementById('ui-step-trans-light-color')?.addEventListener('input', (e) => {
    for (const group of getGroupsToUpdate(state)) {
      state.getGroupConfig(group).transitionSparkleColor = e.target.value;
    }
    state.saveCurrentStep();
    state.notify();
  });

  document.getElementById('ui-step-trans-light-speed')?.addEventListener('input', (e) => {
    for (const group of getGroupsToUpdate(state)) {
      state.getGroupConfig(group).transitionLightSpeed = parseFloat(e.target.value);
    }
    const span = document.getElementById('val-step-trans-light-speed');
    if (span) span.textContent = `${parseFloat(e.target.value).toFixed(1)}x`;
    state.saveCurrentStep();
    state.notify();
  });

  document.getElementById('ui-step-trans-light-freq')?.addEventListener('input', (e) => {
    for (const group of getGroupsToUpdate(state)) {
      state.getGroupConfig(group).transitionLightFreq = parseFloat(e.target.value);
    }
    const span = document.getElementById('val-step-trans-light-freq');
    if (span) span.textContent = `${parseFloat(e.target.value).toFixed(1)}x`;
    state.saveCurrentStep();
    state.notify();
  });

  // Hold Effects
  document.getElementById('ui-step-hold-move-effect').addEventListener('change', (e) => {
    for (const group of getGroupsToUpdate(state)) {
      state.getGroupConfig(group).holdMoveEffect = e.target.value;
    }
    state.saveCurrentStep();
    updateSettingsVisibility();
    state.notify();
  });

  document.getElementById('ui-step-hold-move-speed')?.addEventListener('input', (e) => {
    for (const group of getGroupsToUpdate(state)) {
      state.getGroupConfig(group).holdMoveSpeed = parseFloat(e.target.value);
    }
    const span = document.getElementById('val-step-hold-move-speed');
    if (span) span.textContent = `${parseFloat(e.target.value).toFixed(1)}x`;
    state.saveCurrentStep();
    state.notify();
  });

  document.getElementById('ui-step-hold-move-freq')?.addEventListener('input', (e) => {
    for (const group of getGroupsToUpdate(state)) {
      state.getGroupConfig(group).holdMoveFreq = parseFloat(e.target.value);
    }
    const span = document.getElementById('val-step-hold-move-freq');
    if (span) span.textContent = `${parseFloat(e.target.value).toFixed(1)}x`;
    state.saveCurrentStep();
    state.notify();
  });

  // Landing Color Effects
  document.getElementById('ui-step-landing-light-effect')?.addEventListener('change', (e) => {
    for (const group of getGroupsToUpdate(state)) {
      state.getGroupConfig(group).landingLightEffect = e.target.value;
    }
    state.saveCurrentStep();
    updateSettingsVisibility();
    state.notify();
  });

  document.getElementById('ui-step-landing-light-speed')?.addEventListener('input', (e) => {
    for (const group of getGroupsToUpdate(state)) {
      state.getGroupConfig(group).landingLightSpeed = parseFloat(e.target.value);
    }
    const span = document.getElementById('val-step-landing-light-speed');
    if (span) span.textContent = `${parseFloat(e.target.value).toFixed(1)}x`;
    state.saveCurrentStep();
    state.notify();
  });

  document.getElementById('ui-step-landing-light-freq')?.addEventListener('input', (e) => {
    for (const group of getGroupsToUpdate(state)) {
      state.getGroupConfig(group).landingLightFreq = parseFloat(e.target.value);
    }
    const span = document.getElementById('val-step-landing-light-freq');
    if (span) span.textContent = `${parseFloat(e.target.value).toFixed(1)}x`;
    state.saveCurrentStep();
    state.notify();
  });

  // UI Subscriptions
  state.subscribe(() => {
    const currentStep = state.steps[state.currentStepIndex];
    if (currentStep) {
      const parentGroup = String(state.activeGroup || 'Default').split('/')[0];
      const activeCfg = state.getGroupConfig(parentGroup);

      const stepHoldTimeEl = document.getElementById('ui-step-hold-time');
      const stepTransTimeEl = document.getElementById('ui-step-transition-time');
      const stepTransTimeContainer = document.getElementById('ui-step-transition-time-container');

      const stepModeEl = document.getElementById('ui-step-mode');
      const stepTransLightEffEl = document.getElementById('ui-step-trans-light-effect');
      const stepHoldMoveEffEl = document.getElementById('ui-step-hold-move-effect');
      const stepLandingLightEffEl = document.getElementById('ui-step-landing-light-effect');

      if (stepHoldTimeEl && document.activeElement !== stepHoldTimeEl) stepHoldTimeEl.value = currentStep.holdTime || 0;

      if (stepTransTimeContainer) {
        if (state.currentStepIndex === 0) {
          stepTransTimeContainer.style.display = 'none';
        } else {
          stepTransTimeContainer.style.display = '';
          if (stepTransTimeEl && document.activeElement !== stepTransTimeEl) {
            stepTransTimeEl.value = currentStep.transitionTime !== undefined ? currentStep.transitionTime : 2000;
          }
        }
      }

      if (stepModeEl && document.activeElement !== stepModeEl) stepModeEl.value = activeCfg.transitionMode || 'transform';
      if (stepTransLightEffEl && document.activeElement !== stepTransLightEffEl) stepTransLightEffEl.value = activeCfg.transitionLightEffect || 'none';
      if (stepHoldMoveEffEl && document.activeElement !== stepHoldMoveEffEl) stepHoldMoveEffEl.value = activeCfg.holdMoveEffect || 'none';
      if (stepLandingLightEffEl && document.activeElement !== stepLandingLightEffEl) {
        stepLandingLightEffEl.value = activeCfg.landingLightEffect || 'none';
      }

      const stepTransLightSpeedEl = document.getElementById('ui-step-trans-light-speed');
      const stepTransLightFreqEl = document.getElementById('ui-step-trans-light-freq');
      const valTransLightSpeedEl = document.getElementById('val-step-trans-light-speed');
      const valTransLightFreqEl = document.getElementById('val-step-trans-light-freq');

      const transLightSpeed = activeCfg.transitionLightSpeed !== undefined ? activeCfg.transitionLightSpeed : 1.0;
      const transLightFreq = activeCfg.transitionLightFreq !== undefined ? activeCfg.transitionLightFreq : 1.0;

      if (stepTransLightSpeedEl && document.activeElement !== stepTransLightSpeedEl) {
        stepTransLightSpeedEl.value = transLightSpeed;
        if (valTransLightSpeedEl) valTransLightSpeedEl.textContent = `${transLightSpeed.toFixed(1)}x`;
      }
      if (stepTransLightFreqEl && document.activeElement !== stepTransLightFreqEl) {
        stepTransLightFreqEl.value = transLightFreq;
        if (valTransLightFreqEl) valTransLightFreqEl.textContent = `${transLightFreq.toFixed(1)}x`;
      }

      const stepTransLightColorEl = document.getElementById('ui-step-trans-light-color');
      const sparkleColor = activeCfg.transitionSparkleColor !== undefined ? activeCfg.transitionSparkleColor : '#ffffff';
      if (stepTransLightColorEl && document.activeElement !== stepTransLightColorEl) {
        stepTransLightColorEl.value = sparkleColor;
      }

      const stepHoldMoveSpeedEl = document.getElementById('ui-step-hold-move-speed');
      const stepHoldMoveFreqEl = document.getElementById('ui-step-hold-move-freq');
      const valHoldMoveSpeedEl = document.getElementById('val-step-hold-move-speed');
      const valHoldMoveFreqEl = document.getElementById('val-step-hold-move-freq');

      const holdMoveSpeed = activeCfg.holdMoveSpeed !== undefined ? activeCfg.holdMoveSpeed : 1.0;
      const holdMoveFreq = activeCfg.holdMoveFreq !== undefined ? activeCfg.holdMoveFreq : 1.0;

      if (stepHoldMoveSpeedEl && document.activeElement !== stepHoldMoveSpeedEl) {
        stepHoldMoveSpeedEl.value = holdMoveSpeed;
        if (valHoldMoveSpeedEl) valHoldMoveSpeedEl.textContent = `${holdMoveSpeed.toFixed(1)}x`;
      }
      if (stepHoldMoveFreqEl && document.activeElement !== stepHoldMoveFreqEl) {
        stepHoldMoveFreqEl.value = holdMoveFreq;
        if (valHoldMoveFreqEl) valHoldMoveFreqEl.textContent = `${holdMoveFreq.toFixed(1)}x`;
      }

      const stepLandingLightSpeedEl = document.getElementById('ui-step-landing-light-speed');
      const stepLandingLightFreqEl = document.getElementById('ui-step-landing-light-freq');
      const valLandingLightSpeedEl = document.getElementById('val-step-landing-light-speed');
      const valLandingLightFreqEl = document.getElementById('val-step-landing-light-freq');

      const landingLightSpeed = activeCfg.landingLightSpeed !== undefined ? activeCfg.landingLightSpeed : 1.0;
      const landingLightFreq = activeCfg.landingLightFreq !== undefined ? activeCfg.landingLightFreq : 1.0;

      if (stepLandingLightSpeedEl && document.activeElement !== stepLandingLightSpeedEl) {
        stepLandingLightSpeedEl.value = landingLightSpeed;
        if (valLandingLightSpeedEl) valLandingLightSpeedEl.textContent = `${landingLightSpeed.toFixed(1)}x`;
      }
      if (stepLandingLightFreqEl && document.activeElement !== stepLandingLightFreqEl) {
        stepLandingLightFreqEl.value = landingLightFreq;
        if (valLandingLightFreqEl) valLandingLightFreqEl.textContent = `${landingLightFreq.toFixed(1)}x`;
      }

      updateSettingsVisibility();
    }
  });
}
