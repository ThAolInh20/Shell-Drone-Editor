export function renderStepPanel() {
  return `
    <div class="panel-section" style="max-height: 80vh; overflow-y: auto; padding-right: 5px;">
      <h3>Step Properties</h3>
      <div id="step-props" style="display: flex; flex-direction: column; gap: 10px;">
        
        <!-- SECTION 1: TIMING (GLOBAL) -->
        <div style="font-weight: bold; margin-top: 5px; margin-bottom: 5px; color: #3a86ff; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid #333; padding-bottom: 2px;">Timing (Global)</div>
        <div class="input-group">
          <label>Hold Time (ms)</label>
          <input type="number" id="ui-step-hold-time" step="100" style="width: 120px;" />
        </div>
        <div class="input-group" id="ui-step-transition-time-container">
          <label>Transition (ms)</label>
          <input type="number" id="ui-step-transition-time" step="100" style="width: 120px;" />
        </div>

        <!-- SECTION 2: TRANSITION CONFIG (GROUP) -->
        <div style="font-weight: bold; margin-top: 10px; margin-bottom: 5px; color: #3a86ff; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid #333; padding-bottom: 2px;">Transition Style</div>
        <div class="input-group">
          <label>Mode</label>
          <select id="ui-step-mode" style="width: 120px; background: #222; color: #fff; border: 1px solid #444; padding: 4px;">
            <option value="transform">Transform</option>
            <option value="move">➡ Move Group</option>
          </select>
        </div>
        
        <!-- Transition Move Effect -->
        <div class="input-group">
          <label>Flight Move Eff</label>
          <select id="ui-step-trans-move-effect" style="width: 120px; background: #222; color: #fff; border: 1px solid #444; padding: 4px;">
            <option value="none">Normal</option>
            <option value="wave">Wave (Nhấp nhô)</option>
            <option value="swing">Swing (Đung đưa)</option>
            <option value="pulse">Pulse (Phập phồng)</option>
            <option value="orbit">Orbit (Xoay quanh)</option>
            <option value="spiral">Spiral (Xoáy ốc)</option>
            <option value="expand">Expand (Nở hoa)</option>
          </select>
        </div>
        <div id="ui-step-trans-move-settings" style="display: none; flex-direction: column; gap: 8px; padding-left: 10px; border-left: 2px solid #3a86ff; margin-bottom: 5px;">
          <div class="input-group">
            <label style="font-size: 11px; color: #aaa;">Move Speed</label>
            <input type="range" id="ui-step-trans-move-speed" min="0.1" max="5.0" step="0.1" value="1.0" style="width: 80px;" />
            <span id="val-step-trans-move-speed" style="font-size: 11px; color: #888; width: 25px; text-align: right;">1.0x</span>
          </div>
          <div class="input-group">
            <label style="font-size: 11px; color: #aaa;">Move Freq</label>
            <input type="range" id="ui-step-trans-move-freq" min="0.0" max="3.0" step="0.1" value="1.0" style="width: 80px;" />
            <span id="val-step-trans-move-freq" style="font-size: 11px; color: #888; width: 25px; text-align: right;">1.0x</span>
          </div>
        </div>

        <!-- Transition Light Effect -->
        <div class="input-group">
          <label>Flight Light Eff</label>
          <select id="ui-step-trans-light-effect" style="width: 120px; background: #222; color: #fff; border: 1px solid #444; padding: 4px;">
            <option value="none">Normal</option>
            <option value="strobe">Strobe (Chớp tắt)</option>
            <option value="shimmer">Shimmer (Lấp lánh)</option>
            <option value="pulse-color">Pulse Color</option>
            <option value="rainbow">Rainbow</option>
            <option value="wave-light">Wave Light</option>
          </select>
        </div>
        <div id="ui-step-trans-light-settings" style="display: none; flex-direction: column; gap: 8px; padding-left: 10px; border-left: 2px solid #3a86ff; margin-bottom: 5px;">
          <div class="input-group">
            <label style="font-size: 11px; color: #aaa;">Light Speed</label>
            <input type="range" id="ui-step-trans-light-speed" min="0.1" max="5.0" step="0.1" value="1.0" style="width: 80px;" />
            <span id="val-step-trans-light-speed" style="font-size: 11px; color: #888; width: 25px; text-align: right;">1.0x</span>
          </div>
          <div class="input-group">
            <label style="font-size: 11px; color: #aaa;">Light Freq</label>
            <input type="range" id="ui-step-trans-light-freq" min="0.0" max="3.0" step="0.1" value="1.0" style="width: 80px;" />
            <span id="val-step-trans-light-freq" style="font-size: 11px; color: #888; width: 25px; text-align: right;">1.0x</span>
          </div>
        </div>

        <!-- SECTION 3: HOLD CONFIG (GROUP) -->
        <div style="font-weight: bold; margin-top: 10px; margin-bottom: 5px; color: #3a86ff; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid #333; padding-bottom: 2px;">Hold Style</div>
        
        <!-- Hold Move Effect -->
        <div class="input-group">
          <label>Hold Move Eff</label>
          <select id="ui-step-hold-move-effect" style="width: 120px; background: #222; color: #fff; border: 1px solid #444; padding: 4px;">
            <option value="none">Normal</option>
            <option value="wave">Wave (Sóng nhấp nhô)</option>
            <option value="swing">Swing (Đung đưa)</option>
            <option value="pulse">Pulse (Phập phồng)</option>
            <option value="orbit">Orbit (Xoay quanh)</option>
            <option value="spiral">Spiral (Xoáy ốc)</option>
            <option value="expand">Expand (Nở hoa)</option>
          </select>
        </div>
        <div id="ui-step-hold-move-settings" style="display: none; flex-direction: column; gap: 8px; padding-left: 10px; border-left: 2px solid #3a86ff; margin-bottom: 5px;">
          <div class="input-group">
            <label style="font-size: 11px; color: #aaa;">Move Speed</label>
            <input type="range" id="ui-step-hold-move-speed" min="0.1" max="5.0" step="0.1" value="1.0" style="width: 80px;" />
            <span id="val-step-hold-move-speed" style="font-size: 11px; color: #888; width: 25px; text-align: right;">1.0x</span>
          </div>
          <div class="input-group">
            <label style="font-size: 11px; color: #aaa;">Move Freq</label>
            <input type="range" id="ui-step-hold-move-freq" min="0.0" max="3.0" step="0.1" value="1.0" style="width: 80px;" />
            <span id="val-step-hold-move-freq" style="font-size: 11px; color: #888; width: 25px; text-align: right;">1.0x</span>
          </div>
        </div>

        <!-- Hold Light Effect -->
        <div class="input-group">
          <label>Hold Light Eff</label>
          <select id="ui-step-hold-light-effect" style="width: 120px; background: #222; color: #fff; border: 1px solid #444; padding: 4px;">
            <option value="none">Solid (Không đổi)</option>
            <option value="strobe">Strobe (Chớp tắt)</option>
            <option value="shimmer">Shimmer (Lấp lánh)</option>
            <option value="pulse-color">Pulse Color (Mạch đập)</option>
            <option value="rainbow">Rainbow (Cầu vồng)</option>
            <option value="wave-light">Wave Light (Sóng sáng)</option>
          </select>
        </div>
        <div id="ui-step-hold-light-settings" style="display: none; flex-direction: column; gap: 8px; padding-left: 10px; border-left: 2px solid #3a86ff; margin-bottom: 5px;">
          <div class="input-group">
            <label style="font-size: 11px; color: #aaa;">Light Speed</label>
            <input type="range" id="ui-step-hold-light-speed" min="0.1" max="5.0" step="0.1" value="1.0" style="width: 80px;" />
            <span id="val-step-hold-light-speed" style="font-size: 11px; color: #888; width: 25px; text-align: right;">1.0x</span>
          </div>
          <div class="input-group">
            <label style="font-size: 11px; color: #aaa;">Light Freq</label>
            <input type="range" id="ui-step-hold-light-freq" min="0.0" max="3.0" step="0.1" value="1.0" style="width: 80px;" />
            <span id="val-step-hold-light-freq" style="font-size: 11px; color: #888; width: 25px; text-align: right;">1.0x</span>
          </div>
        </div>

        <!-- SECTION 4: COLOR DISTRIBUTION (APPLY LIGHT EFFECT) -->
        <div style="font-weight: bold; margin-top: 10px; margin-bottom: 5px; color: #3a86ff; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid #333; padding-bottom: 2px;">Color Spreading</div>
        <div class="input-group">
          <label>Light Style</label>
          <select id="ui-step-apply-light-effect" style="width: 120px; background: #222; color: #fff; border: 1px solid #444; padding: 4px;">
            <option value="none">Solid (Toàn dải đồng nhất)</option>
            <option value="radial">🌌 Radial Ripple (Lan tỏa từ tâm)</option>
            <option value="linear-lr">🌅 Linear L-to-R (Trái qua phải)</option>
            <option value="fade-in">🔆 Breathing Fade (Sáng dần/Nhịp thở)</option>
          </select>
        </div>

      </div>
    </div>
  `;
}

export function setupStepPanel(state) {
  const updateSettingsVisibility = () => {
    const transMoveEff = document.getElementById('ui-step-trans-move-effect')?.value || 'none';
    const transLightEff = document.getElementById('ui-step-trans-light-effect')?.value || 'none';
    const holdMoveEff = document.getElementById('ui-step-hold-move-effect')?.value || 'none';
    const holdLightEff = document.getElementById('ui-step-hold-light-effect')?.value || 'none';

    const transMoveSettings = document.getElementById('ui-step-trans-move-settings');
    const transLightSettings = document.getElementById('ui-step-trans-light-settings');
    const holdMoveSettings = document.getElementById('ui-step-hold-move-settings');
    const holdLightSettings = document.getElementById('ui-step-hold-light-settings');

    if (transMoveSettings) transMoveSettings.style.display = transMoveEff !== 'none' ? 'flex' : 'none';
    if (transLightSettings) transLightSettings.style.display = transLightEff !== 'none' ? 'flex' : 'none';
    if (holdMoveSettings) holdMoveSettings.style.display = holdMoveEff !== 'none' ? 'flex' : 'none';
    if (holdLightSettings) holdLightSettings.style.display = holdLightEff !== 'none' ? 'flex' : 'none';
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
    state.getGroupConfig(state.activeGroup).transitionMode = e.target.value;
    state.saveCurrentStep();
    state.notify();
  });

  document.getElementById('ui-step-trans-move-effect').addEventListener('change', (e) => {
    state.getGroupConfig(state.activeGroup).transitionMoveEffect = e.target.value;
    state.saveCurrentStep();
    updateSettingsVisibility();
    state.notify();
  });

  document.getElementById('ui-step-trans-move-speed')?.addEventListener('input', (e) => {
    state.getGroupConfig(state.activeGroup).transitionMoveSpeed = parseFloat(e.target.value);
    const span = document.getElementById('val-step-trans-move-speed');
    if (span) span.textContent = `${parseFloat(e.target.value).toFixed(1)}x`;
    state.saveCurrentStep();
    state.notify();
  });

  document.getElementById('ui-step-trans-move-freq')?.addEventListener('input', (e) => {
    state.getGroupConfig(state.activeGroup).transitionMoveFreq = parseFloat(e.target.value);
    const span = document.getElementById('val-step-trans-move-freq');
    if (span) span.textContent = `${parseFloat(e.target.value).toFixed(1)}x`;
    state.saveCurrentStep();
    state.notify();
  });

  document.getElementById('ui-step-trans-light-effect').addEventListener('change', (e) => {
    state.getGroupConfig(state.activeGroup).transitionLightEffect = e.target.value;
    state.saveCurrentStep();
    updateSettingsVisibility();
    state.notify();
  });

  document.getElementById('ui-step-trans-light-speed')?.addEventListener('input', (e) => {
    state.getGroupConfig(state.activeGroup).transitionLightSpeed = parseFloat(e.target.value);
    const span = document.getElementById('val-step-trans-light-speed');
    if (span) span.textContent = `${parseFloat(e.target.value).toFixed(1)}x`;
    state.saveCurrentStep();
    state.notify();
  });

  document.getElementById('ui-step-trans-light-freq')?.addEventListener('input', (e) => {
    state.getGroupConfig(state.activeGroup).transitionLightFreq = parseFloat(e.target.value);
    const span = document.getElementById('val-step-trans-light-freq');
    if (span) span.textContent = `${parseFloat(e.target.value).toFixed(1)}x`;
    state.saveCurrentStep();
    state.notify();
  });

  // Hold Effects
  document.getElementById('ui-step-hold-move-effect').addEventListener('change', (e) => {
    state.getGroupConfig(state.activeGroup).holdMoveEffect = e.target.value;
    state.saveCurrentStep();
    updateSettingsVisibility();
    state.notify();
  });

  document.getElementById('ui-step-hold-move-speed')?.addEventListener('input', (e) => {
    state.getGroupConfig(state.activeGroup).holdMoveSpeed = parseFloat(e.target.value);
    const span = document.getElementById('val-step-hold-move-speed');
    if (span) span.textContent = `${parseFloat(e.target.value).toFixed(1)}x`;
    state.saveCurrentStep();
    state.notify();
  });

  document.getElementById('ui-step-hold-move-freq')?.addEventListener('input', (e) => {
    state.getGroupConfig(state.activeGroup).holdMoveFreq = parseFloat(e.target.value);
    const span = document.getElementById('val-step-hold-move-freq');
    if (span) span.textContent = `${parseFloat(e.target.value).toFixed(1)}x`;
    state.saveCurrentStep();
    state.notify();
  });

  document.getElementById('ui-step-hold-light-effect').addEventListener('change', (e) => {
    state.getGroupConfig(state.activeGroup).holdLightEffect = e.target.value;
    state.saveCurrentStep();
    updateSettingsVisibility();
    state.notify();
  });

  document.getElementById('ui-step-hold-light-speed')?.addEventListener('input', (e) => {
    state.getGroupConfig(state.activeGroup).holdLightSpeed = parseFloat(e.target.value);
    const span = document.getElementById('val-step-hold-light-speed');
    if (span) span.textContent = `${parseFloat(e.target.value).toFixed(1)}x`;
    state.saveCurrentStep();
    state.notify();
  });

  document.getElementById('ui-step-hold-light-freq')?.addEventListener('input', (e) => {
    state.getGroupConfig(state.activeGroup).holdLightFreq = parseFloat(e.target.value);
    const span = document.getElementById('val-step-hold-light-freq');
    if (span) span.textContent = `${parseFloat(e.target.value).toFixed(1)}x`;
    state.saveCurrentStep();
    state.notify();
  });

  // Apply Light Spreading Style
  document.getElementById('ui-step-apply-light-effect').addEventListener('change', (e) => {
    state.getGroupConfig(state.activeGroup).applyLightEffect = e.target.value;
    state.saveCurrentStep();
    state.notify();
  });

  // UI Subscriptions
  state.subscribe(() => {
    const currentStep = state.steps[state.currentStepIndex];
    if (currentStep) {
      const activeCfg = state.getGroupConfig(state.activeGroup);

      const stepHoldTimeEl = document.getElementById('ui-step-hold-time');
      const stepTransTimeEl = document.getElementById('ui-step-transition-time');
      const stepTransTimeContainer = document.getElementById('ui-step-transition-time-container');

      const stepModeEl = document.getElementById('ui-step-mode');
      const stepTransMoveEffEl = document.getElementById('ui-step-trans-move-effect');
      const stepTransLightEffEl = document.getElementById('ui-step-trans-light-effect');
      const stepHoldMoveEffEl = document.getElementById('ui-step-hold-move-effect');
      const stepHoldLightEffEl = document.getElementById('ui-step-hold-light-effect');
      const stepApplyLightEffEl = document.getElementById('ui-step-apply-light-effect');

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
      if (stepTransMoveEffEl && document.activeElement !== stepTransMoveEffEl) stepTransMoveEffEl.value = activeCfg.transitionMoveEffect || 'none';
      if (stepTransLightEffEl && document.activeElement !== stepTransLightEffEl) stepTransLightEffEl.value = activeCfg.transitionLightEffect || 'none';
      if (stepHoldMoveEffEl && document.activeElement !== stepHoldMoveEffEl) stepHoldMoveEffEl.value = activeCfg.holdMoveEffect || 'none';
      if (stepHoldLightEffEl && document.activeElement !== stepHoldLightEffEl) stepHoldLightEffEl.value = activeCfg.holdLightEffect || 'none';
      if (stepApplyLightEffEl && document.activeElement !== stepApplyLightEffEl) stepApplyLightEffEl.value = activeCfg.applyLightEffect || 'none';

      // Update range inputs
      const stepTransMoveSpeedEl = document.getElementById('ui-step-trans-move-speed');
      const stepTransMoveFreqEl = document.getElementById('ui-step-trans-move-freq');
      const valTransMoveSpeedEl = document.getElementById('val-step-trans-move-speed');
      const valTransMoveFreqEl = document.getElementById('val-step-trans-move-freq');

      const transMoveSpeed = activeCfg.transitionMoveSpeed !== undefined ? activeCfg.transitionMoveSpeed : 1.0;
      const transMoveFreq = activeCfg.transitionMoveFreq !== undefined ? activeCfg.transitionMoveFreq : 1.0;

      if (stepTransMoveSpeedEl && document.activeElement !== stepTransMoveSpeedEl) {
        stepTransMoveSpeedEl.value = transMoveSpeed;
        if (valTransMoveSpeedEl) valTransMoveSpeedEl.textContent = `${transMoveSpeed.toFixed(1)}x`;
      }
      if (stepTransMoveFreqEl && document.activeElement !== stepTransMoveFreqEl) {
        stepTransMoveFreqEl.value = transMoveFreq;
        if (valTransMoveFreqEl) valTransMoveFreqEl.textContent = `${transMoveFreq.toFixed(1)}x`;
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

      const stepHoldLightSpeedEl = document.getElementById('ui-step-hold-light-speed');
      const stepHoldLightFreqEl = document.getElementById('ui-step-hold-light-freq');
      const valHoldLightSpeedEl = document.getElementById('val-step-hold-light-speed');
      const valHoldLightFreqEl = document.getElementById('val-step-hold-light-freq');

      const holdLightSpeed = activeCfg.holdLightSpeed !== undefined ? activeCfg.holdLightSpeed : 1.0;
      const holdLightFreq = activeCfg.holdLightFreq !== undefined ? activeCfg.holdLightFreq : 1.0;

      if (stepHoldLightSpeedEl && document.activeElement !== stepHoldLightSpeedEl) {
        stepHoldLightSpeedEl.value = holdLightSpeed;
        if (valHoldLightSpeedEl) valHoldLightSpeedEl.textContent = `${holdLightSpeed.toFixed(1)}x`;
      }
      if (stepHoldLightFreqEl && document.activeElement !== stepHoldLightFreqEl) {
        stepHoldLightFreqEl.value = holdLightFreq;
        if (valHoldLightFreqEl) valHoldLightFreqEl.textContent = `${holdLightFreq.toFixed(1)}x`;
      }

      updateSettingsVisibility();
    }
  });
}
