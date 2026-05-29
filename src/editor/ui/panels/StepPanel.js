export function renderStepPanel() {
  return `
    <div class="panel-section">
      <h3>Step Properties</h3>
      <div id="step-props">
        <div class="input-group">
          <label>Mode</label>
          <select id="ui-step-mode" style="width: 120px; background: #222; color: #fff; border: 1px solid #444; padding: 4px;">
            <option value="transform">Transform</option>
            <option value="move">➡ Move Group</option>
          </select>
        </div>
        <div class="input-group" style="margin-top: 10px;">
          <label>Transition Effect</label>
          <select id="ui-step-transition" style="width: 120px; background: #222; color: #fff; border: 1px solid #444; padding: 4px;">
            <option value="none">Normal</option>
            <option value="wave">Wave</option>
            <option value="swing">Swing</option>
            <option value="pulse">Pulse</option>
            <option value="strobe">Strobe</option>
            <option value="shimmer">Shimmer</option>
          </select>
        </div>
        <div class="input-group" style="margin-top: 10px;">
          <label>Hold Time (ms)</label>
          <input type="number" id="ui-step-hold-time" step="100" style="width: 120px;" />
        </div>
        <div class="input-group" style="margin-top: 10px;" id="ui-step-transition-time-container">
          <label>Transition Time (ms)</label>
          <input type="number" id="ui-step-transition-time" step="100" style="width: 120px;" />
        </div>
        <div class="input-group" style="margin-top: 10px;">
          <label>Hold Move Effect</label>
          <select id="ui-step-hold-move-effect" style="width: 120px; background: #222; color: #fff; border: 1px solid #444; padding: 4px;">
            <option value="none">Normal</option>
            <option value="wave">Wave (Sóng nhấp nhô)</option>
            <option value="swing">Swing (Đung đưa)</option>
            <option value="pulse">Pulse (Phập phồng)</option>
            <option value="orbit">Orbit (Xoay quanh tâm)</option>
            <option value="spiral">Spiral (Xoáy ốc quanh tâm)</option>
            <option value="expand">Expand (Nở hoa từ tâm)</option>
          </select>
        </div>
        <div id="ui-step-hold-move-settings" style="display: none; flex-direction: column; gap: 8px; margin-top: 8px; padding-left: 10px; border-left: 2px solid #3a86ff; margin-bottom: 10px;">
          <div class="input-group">
            <label style="font-size: 12px; color: #aaa;">Move Speed</label>
            <input type="range" id="ui-step-hold-move-speed" min="0.1" max="5.0" step="0.1" value="1.0" style="width: 80px;" />
            <span id="val-step-hold-move-speed" style="font-size: 11px; color: #888; width: 25px; text-align: right;">1.0x</span>
          </div>
          <div class="input-group">
            <label style="font-size: 12px; color: #aaa;">Move Amp/Freq</label>
            <input type="range" id="ui-step-hold-move-freq" min="0.0" max="3.0" step="0.1" value="1.0" style="width: 80px;" />
            <span id="val-step-hold-move-freq" style="font-size: 11px; color: #888; width: 25px; text-align: right;">1.0x</span>
          </div>
        </div>
        <div class="input-group" style="margin-top: 10px;">
          <label>Hold Light Effect</label>
          <select id="ui-step-hold-light-effect" style="width: 120px; background: #222; color: #fff; border: 1px solid #444; padding: 4px;">
            <option value="none">Solid (Không đổi)</option>
            <option value="strobe">Strobe (Chớp tắt)</option>
            <option value="shimmer">Shimmer (Lấp lánh)</option>
            <option value="pulse-color">Pulse Color (Mạch đập)</option>
            <option value="rainbow">Rainbow (Cầu vồng)</option>
            <option value="wave-light">Wave Light (Sóng sáng)</option>
          </select>
        </div>
        <div id="ui-step-hold-light-settings" style="display: none; flex-direction: column; gap: 8px; margin-top: 8px; padding-left: 10px; border-left: 2px solid #3a86ff; margin-bottom: 10px;">
          <div class="input-group">
            <label style="font-size: 12px; color: #aaa;">Light Speed</label>
            <input type="range" id="ui-step-hold-light-speed" min="0.1" max="5.0" step="0.1" value="1.0" style="width: 80px;" />
            <span id="val-step-hold-light-speed" style="font-size: 11px; color: #888; width: 25px; text-align: right;">1.0x</span>
          </div>
          <div class="input-group">
            <label style="font-size: 12px; color: #aaa;">Light Amp/Freq</label>
            <input type="range" id="ui-step-hold-light-freq" min="0.0" max="3.0" step="0.1" value="1.0" style="width: 80px;" />
            <span id="val-step-hold-light-freq" style="font-size: 11px; color: #888; width: 25px; text-align: right;">1.0x</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function setupStepPanel(state) {
  const updateSettingsVisibility = () => {
    const moveEff = document.getElementById('ui-step-hold-move-effect')?.value || 'none';
    const lightEff = document.getElementById('ui-step-hold-light-effect')?.value || 'none';

    const moveSettings = document.getElementById('ui-step-hold-move-settings');
    const lightSettings = document.getElementById('ui-step-hold-light-settings');

    if (moveSettings) moveSettings.style.display = moveEff !== 'none' ? 'flex' : 'none';
    if (lightSettings) lightSettings.style.display = lightEff !== 'none' ? 'flex' : 'none';
  };

  document.getElementById('ui-step-mode').addEventListener('change', (e) => {
    state.steps[state.currentStepIndex].transitionMode = e.target.value;
    state.saveCurrentStep();
  });

  document.getElementById('ui-step-transition').addEventListener('change', (e) => {
    state.steps[state.currentStepIndex].transitionEffect = e.target.value;
    state.saveCurrentStep();
  });

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

  document.getElementById('ui-step-hold-move-effect').addEventListener('change', (e) => {
    state.steps[state.currentStepIndex].holdMoveEffect = e.target.value;
    state.saveCurrentStep();
    updateSettingsVisibility();
  });

  document.getElementById('ui-step-hold-light-effect').addEventListener('change', (e) => {
    state.steps[state.currentStepIndex].holdLightEffect = e.target.value;
    state.saveCurrentStep();
    updateSettingsVisibility();
  });

  document.getElementById('ui-step-hold-move-speed')?.addEventListener('input', (e) => {
    state.steps[state.currentStepIndex].holdMoveSpeed = parseFloat(e.target.value);
    const span = document.getElementById('val-step-hold-move-speed');
    if (span) span.textContent = `${parseFloat(e.target.value).toFixed(1)}x`;
    state.saveCurrentStep();
  });

  document.getElementById('ui-step-hold-move-freq')?.addEventListener('input', (e) => {
    state.steps[state.currentStepIndex].holdMoveFreq = parseFloat(e.target.value);
    const span = document.getElementById('val-step-hold-move-freq');
    if (span) span.textContent = `${parseFloat(e.target.value).toFixed(1)}x`;
    state.saveCurrentStep();
  });

  document.getElementById('ui-step-hold-light-speed')?.addEventListener('input', (e) => {
    state.steps[state.currentStepIndex].holdLightSpeed = parseFloat(e.target.value);
    const span = document.getElementById('val-step-hold-light-speed');
    if (span) span.textContent = `${parseFloat(e.target.value).toFixed(1)}x`;
    state.saveCurrentStep();
  });

  document.getElementById('ui-step-hold-light-freq')?.addEventListener('input', (e) => {
    state.steps[state.currentStepIndex].holdLightFreq = parseFloat(e.target.value);
    const span = document.getElementById('val-step-hold-light-freq');
    if (span) span.textContent = `${parseFloat(e.target.value).toFixed(1)}x`;
    state.saveCurrentStep();
  });

  state.subscribe(() => {
    const currentStep = state.steps[state.currentStepIndex];
    if (currentStep) {
      const stepModeEl = document.getElementById('ui-step-mode');
      const stepTransEl = document.getElementById('ui-step-transition');
      const stepHoldTimeEl = document.getElementById('ui-step-hold-time');
      const stepHoldMoveEffEl = document.getElementById('ui-step-hold-move-effect');
      const stepHoldLightEffEl = document.getElementById('ui-step-hold-light-effect');

      if (stepModeEl && document.activeElement !== stepModeEl) stepModeEl.value = currentStep.transitionMode || 'transform';
      if (stepTransEl && document.activeElement !== stepTransEl) stepTransEl.value = currentStep.transitionEffect || 'none';
      if (stepHoldTimeEl && document.activeElement !== stepHoldTimeEl) stepHoldTimeEl.value = currentStep.holdTime || 0;
      if (stepHoldMoveEffEl && document.activeElement !== stepHoldMoveEffEl) stepHoldMoveEffEl.value = currentStep.holdMoveEffect || 'none';
      if (stepHoldLightEffEl && document.activeElement !== stepHoldLightEffEl) stepHoldLightEffEl.value = currentStep.holdLightEffect || 'none';

      // Update range inputs
      const stepHoldMoveSpeedEl = document.getElementById('ui-step-hold-move-speed');
      const stepHoldMoveFreqEl = document.getElementById('ui-step-hold-move-freq');
      const stepHoldLightSpeedEl = document.getElementById('ui-step-hold-light-speed');
      const stepHoldLightFreqEl = document.getElementById('ui-step-hold-light-freq');

      const valHoldMoveSpeedEl = document.getElementById('val-step-hold-move-speed');
      const valHoldMoveFreqEl = document.getElementById('val-step-hold-move-freq');
      const valHoldLightSpeedEl = document.getElementById('val-step-hold-light-speed');
      const valHoldLightFreqEl = document.getElementById('val-step-hold-light-freq');

      const moveSpeed = currentStep.holdMoveSpeed !== undefined ? currentStep.holdMoveSpeed : 1.0;
      const moveFreq = currentStep.holdMoveFreq !== undefined ? currentStep.holdMoveFreq : 1.0;
      const lightSpeed = currentStep.holdLightSpeed !== undefined ? currentStep.holdLightSpeed : 1.0;
      const lightFreq = currentStep.holdLightFreq !== undefined ? currentStep.holdLightFreq : 1.0;

      if (stepHoldMoveSpeedEl && document.activeElement !== stepHoldMoveSpeedEl) {
        stepHoldMoveSpeedEl.value = moveSpeed;
        if (valHoldMoveSpeedEl) valHoldMoveSpeedEl.textContent = `${moveSpeed.toFixed(1)}x`;
      }
      if (stepHoldMoveFreqEl && document.activeElement !== stepHoldMoveFreqEl) {
        stepHoldMoveFreqEl.value = moveFreq;
        if (valHoldMoveFreqEl) valHoldMoveFreqEl.textContent = `${moveFreq.toFixed(1)}x`;
      }
      if (stepHoldLightSpeedEl && document.activeElement !== stepHoldLightSpeedEl) {
        stepHoldLightSpeedEl.value = lightSpeed;
        if (valHoldLightSpeedEl) valHoldLightSpeedEl.textContent = `${lightSpeed.toFixed(1)}x`;
      }
      if (stepHoldLightFreqEl && document.activeElement !== stepHoldLightFreqEl) {
        stepHoldLightFreqEl.value = lightFreq;
        if (valHoldLightFreqEl) valHoldLightFreqEl.textContent = `${lightFreq.toFixed(1)}x`;
      }

      const stepTransTimeEl = document.getElementById('ui-step-transition-time');
      const stepTransTimeContainer = document.getElementById('ui-step-transition-time-container');
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

      updateSettingsVisibility();
    }
  });
}
