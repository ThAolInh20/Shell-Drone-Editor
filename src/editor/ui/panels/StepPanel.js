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
          <label>Hold Effect</label>
          <select id="ui-step-hold-effect" style="width: 120px; background: #222; color: #fff; border: 1px solid #444; padding: 4px;">
            <option value="none">🌟 Normal</option>
            <option value="wave">🌟 Wave</option>
            <option value="swing">🌟 Swing</option>
            <option value="pulse">🌟 Pulse</option>
            <option value="strobe">🌟 Strobe</option>
            <option value="shimmer">🌟 Shimmer</option>
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

  document.getElementById('ui-step-hold-effect').addEventListener('change', (e) => {
    state.steps[state.currentStepIndex].holdEffect = e.target.value;
    state.saveCurrentStep();
  });

  state.subscribe(() => {
    const currentStep = state.steps[state.currentStepIndex];
    if (currentStep) {
      const stepModeEl = document.getElementById('ui-step-mode');
      const stepTransEl = document.getElementById('ui-step-transition');
      const stepHoldTimeEl = document.getElementById('ui-step-hold-time');
      const stepHoldEffEl = document.getElementById('ui-step-hold-effect');

      if (stepModeEl && document.activeElement !== stepModeEl) stepModeEl.value = currentStep.transitionMode || 'transform';
      if (stepTransEl && document.activeElement !== stepTransEl) stepTransEl.value = currentStep.transitionEffect || 'none';
      if (stepHoldTimeEl && document.activeElement !== stepHoldTimeEl) stepHoldTimeEl.value = currentStep.holdTime || 0;
      if (stepHoldEffEl && document.activeElement !== stepHoldEffEl) stepHoldEffEl.value = currentStep.holdEffect || 'none';
    }
  });
}
