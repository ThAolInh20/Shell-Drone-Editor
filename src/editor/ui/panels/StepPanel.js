import { t } from '../../../config/lang/i18n.js';

import { renderStepPanel } from '../templates/EditorTemplates.js';
export { renderStepPanel };

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

    // Update visibility of rotation direction dropdowns
    const transMode = document.getElementById('ui-step-mode')?.value || 'transform';
    const transMoveDirContainer = document.getElementById('ui-step-trans-move-dir-container');
    if (transMoveDirContainer) {
      const activeCfg = state.getGroupConfig(String(state.activeGroup || 'Default').split('/')[0]);
      const transMoveEff = activeCfg ? activeCfg.transitionMoveEffect : 'none';
      const needsTransDir = ['vortex', 'helix'].includes(transMode) || transMoveEff === 'spiral';
      transMoveDirContainer.style.display = needsTransDir ? 'flex' : 'none';
    }

    const holdMoveDirContainer = document.getElementById('ui-step-hold-move-dir-container');
    if (holdMoveDirContainer) {
      holdMoveDirContainer.style.display = ['orbit', 'spiral'].includes(holdMoveEff) ? 'flex' : 'none';
    }
  };

  // Timing (Global)
  document.getElementById('ui-step-hold-time').addEventListener('change', (e) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val >= 0) {
      state.steps[state.currentStepIndex].holdTime = val;
      state.saveCurrentStep();
      state.recalculateTimes();
      state.saveStateToHistory();
      state.notify();
    }
  });

  document.getElementById('ui-step-transition-time')?.addEventListener('change', (e) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val >= 0) {
      state.steps[state.currentStepIndex].transitionTime = val;
      state.saveCurrentStep();
      state.recalculateTimes();
      state.saveStateToHistory();
      state.notify();
    }
  });

  document.getElementById('ui-step-color')?.addEventListener('input', (e) => {
    state.steps[state.currentStepIndex].uiColor = e.target.value;
    state.notify();
  });

  document.getElementById('ui-step-color')?.addEventListener('change', (e) => {
    state.saveCurrentStep();
    state.saveStateToHistory();
  });

  // Mode & Transition Effects
  document.getElementById('ui-step-mode').addEventListener('change', (e) => {
    for (const group of getGroupsToUpdate(state)) {
      state.getGroupConfig(group).transitionMode = e.target.value;
    }
    state.saveCurrentStep();
    updateSettingsVisibility();
    state.saveStateToHistory();
    state.notify();
  });

  document.getElementById('ui-step-trans-move-dir')?.addEventListener('change', (e) => {
    for (const group of getGroupsToUpdate(state)) {
      state.getGroupConfig(group).transitionMoveDir = e.target.value;
    }
    state.saveCurrentStep();
    state.saveStateToHistory();
    state.notify();
  });

  document.getElementById('ui-step-trans-light-effect').addEventListener('change', (e) => {
    for (const group of getGroupsToUpdate(state)) {
      state.getGroupConfig(group).transitionLightEffect = e.target.value;
    }
    state.saveCurrentStep();
    updateSettingsVisibility();
    state.saveStateToHistory();
    state.notify();
  });

  document.getElementById('ui-step-trans-light-color')?.addEventListener('input', (e) => {
    for (const group of getGroupsToUpdate(state)) {
      state.getGroupConfig(group).transitionSparkleColor = e.target.value;
    }
    state.saveCurrentStep();
    state.notify();
  });

  document.getElementById('ui-step-trans-light-color')?.addEventListener('change', (e) => {
    state.saveStateToHistory();
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

  document.getElementById('ui-step-trans-light-speed')?.addEventListener('change', () => {
    state.saveStateToHistory();
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

  document.getElementById('ui-step-trans-light-freq')?.addEventListener('change', () => {
    state.saveStateToHistory();
  });

  // Hold Effects
  document.getElementById('ui-step-hold-move-effect').addEventListener('change', (e) => {
    for (const group of getGroupsToUpdate(state)) {
      state.getGroupConfig(group).holdMoveEffect = e.target.value;
    }
    state.saveCurrentStep();
    updateSettingsVisibility();
    state.saveStateToHistory();
    state.notify();
  });

  document.getElementById('ui-step-hold-move-dir')?.addEventListener('change', (e) => {
    for (const group of getGroupsToUpdate(state)) {
      state.getGroupConfig(group).holdMoveDir = e.target.value;
    }
    state.saveCurrentStep();
    state.saveStateToHistory();
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

  document.getElementById('ui-step-hold-move-speed')?.addEventListener('change', () => {
    state.saveStateToHistory();
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

  document.getElementById('ui-step-hold-move-freq')?.addEventListener('change', () => {
    state.saveStateToHistory();
  });

  // Landing Color Effects
  document.getElementById('ui-step-landing-light-effect')?.addEventListener('change', (e) => {
    for (const group of getGroupsToUpdate(state)) {
      state.getGroupConfig(group).landingLightEffect = e.target.value;
    }
    state.saveCurrentStep();
    updateSettingsVisibility();
    state.saveStateToHistory();
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

  document.getElementById('ui-step-landing-light-speed')?.addEventListener('change', () => {
    state.saveStateToHistory();
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

  document.getElementById('ui-step-landing-light-freq')?.addEventListener('change', () => {
    state.saveStateToHistory();
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

      const stepHoldMoveDirEl = document.getElementById('ui-step-hold-move-dir');
      const stepTransMoveDirEl = document.getElementById('ui-step-trans-move-dir');

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

      const stepColorEl = document.getElementById('ui-step-color');
      if (stepColorEl && document.activeElement !== stepColorEl) {
        stepColorEl.value = currentStep.uiColor || '#333333';
      }

      if (stepModeEl && document.activeElement !== stepModeEl) stepModeEl.value = activeCfg.transitionMode || 'transform';
      if (stepTransLightEffEl && document.activeElement !== stepTransLightEffEl) stepTransLightEffEl.value = activeCfg.transitionLightEffect || 'none';
      if (stepHoldMoveEffEl && document.activeElement !== stepHoldMoveEffEl) stepHoldMoveEffEl.value = activeCfg.holdMoveEffect || 'none';
      if (stepLandingLightEffEl && document.activeElement !== stepLandingLightEffEl) {
        stepLandingLightEffEl.value = activeCfg.landingLightEffect || 'none';
      }

      // Populate directions
      const holdMoveDir = activeCfg.holdMoveDir || 'clockwise';
      const transMoveDir = activeCfg.transitionMoveDir || 'alternate';

      if (stepHoldMoveDirEl && document.activeElement !== stepHoldMoveDirEl) {
        stepHoldMoveDirEl.value = holdMoveDir;
      }
      if (stepTransMoveDirEl && document.activeElement !== stepTransMoveDirEl) {
        stepTransMoveDirEl.value = transMoveDir;
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
