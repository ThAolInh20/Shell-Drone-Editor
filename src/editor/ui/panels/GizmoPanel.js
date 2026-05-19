export function renderGizmoPanel() {
  return `
    <div class="panel-section">
      <h3>Gizmo Controls</h3>
      <div class="gizmo-controls">
        <button class="gizmo-btn active" data-mode="translate">Move</button>
        <button class="gizmo-btn" data-mode="rotate">Rotate</button>
        <button class="gizmo-btn" data-mode="scale">Scale</button>
      </div>
      <div style="margin-top: 10px; font-size: 12px; color: #888;">
        Ctrl+Click to multi-select.
      </div>
      <div style="margin-top: 10px; display: flex; gap: 5px;">
        <button class="btn btn-secondary" id="btn-undo" style="margin-bottom: 0; padding: 5px;">Undo (Ctrl+Z)</button>
        <button class="btn btn-secondary" id="btn-redo" style="margin-bottom: 0; padding: 5px;">Redo (Ctrl+Y)</button>
      </div>
      <label style="display: block; margin-top: 10px; font-size: 14px; cursor: pointer;">
        <input type="checkbox" id="ui-select-group" checked /> Select Entire Group in Viewport
      </label>
    </div>
  `;
}

export function setupGizmoPanel(state, director) {
  document.getElementById('btn-undo')?.addEventListener('click', () => state.undo());
  document.getElementById('btn-redo')?.addEventListener('click', () => state.redo());

  const gizmoBtns = document.querySelectorAll('.gizmo-btn');
  gizmoBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      gizmoBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      director.gizmoSystem.setMode(e.target.dataset.mode);
    });
  });
}
