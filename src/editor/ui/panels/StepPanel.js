export function renderStepPanel() {
  return `
    <div class="panel-section">
      <h3>Step Properties</h3>
      <div id="step-props">
        <div class="input-group">
          <label>Mode</label>
          <select id="ui-step-mode" style="width: 120px; background: #222; color: #fff; border: 1px solid #444; padding: 4px;">
            <option value="transform">🔄 Transform</option>
            <option value="move">➡ Move Group</option>
          </select>
        </div>
        <div class="input-group" style="margin-top: 10px;">
          <label>Transition Effect</label>
          <select id="ui-step-transition" style="width: 120px; background: #222; color: #fff; border: 1px solid #444; padding: 4px;">
            <option value="none">✨ Normal</option>
            <option value="wave">✨ Wave</option>
            <option value="swing">✨ Swing</option>
            <option value="pulse">✨ Pulse</option>
            <option value="strobe">✨ Strobe</option>
            <option value="shimmer">✨ Shimmer</option>
          </select>
        </div>
        <div class="input-group" style="margin-top: 10px;">
          <label>Hold Time (ms)</label>
          <input type="number" id="ui-step-hold-time" step="100" style="width: 120px;" />
        </div>
        <div class="input-group" style="margin-top: 10px;">
          <label>Hold Move Effect</label>
          <select id="ui-step-hold-move-effect" style="width: 120px; background: #222; color: #fff; border: 1px solid #444; padding: 4px;">
            <option value="none">🌟 Normal</option>
            <option value="wave">🌟 Wave (Sóng nhấp nhô)</option>
            <option value="swing">🌟 Swing (Đung đưa)</option>
            <option value="pulse">🌟 Pulse (Phập phồng)</option>
            <option value="orbit">💫 Orbit (Xoay quanh tâm)</option>
            <option value="spiral">🌀 Spiral (Xoáy ốc quanh tâm)</option>
            <option value="expand">🛸 Expand (Nở hoa từ tâm)</option>
          </select>
        </div>
        <div class="input-group" style="margin-top: 10px;">
          <label>Hold Light Effect</label>
          <select id="ui-step-hold-light-effect" style="width: 120px; background: #222; color: #fff; border: 1px solid #444; padding: 4px;">
            <option value="none">💡 Solid (Không đổi)</option>
            <option value="strobe">⚡ Strobe (Chớp tắt)</option>
            <option value="shimmer">✨ Shimmer (Lấp lánh)</option>
            <option value="pulse-color">💥 Pulse Color (Mạch đập)</option>
            <option value="rainbow">🌈 Rainbow (Cầu vồng)</option>
            <option value="wave-light">🌊 Wave Light (Sóng sáng)</option>
          </select>
        </div>
      </div>
    </div>
  `;
}

export function setupStepPanel(state) {
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

  document.getElementById('ui-step-hold-move-effect').addEventListener('change', (e) => {
    state.steps[state.currentStepIndex].holdMoveEffect = e.target.value;
    state.saveCurrentStep();
  });

  document.getElementById('ui-step-hold-light-effect').addEventListener('change', (e) => {
    state.steps[state.currentStepIndex].holdLightEffect = e.target.value;
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
    }
  });
}
