export function renderGizmoPanel() {
  return `
    <div class="panel-section">
      <h3>Gizmo Controls</h3>
      <div class="gizmo-controls">
        <button class="gizmo-btn active" data-mode="translate">Move</button>
        <button class="gizmo-btn" data-mode="rotate">Rotate</button>
        <button class="gizmo-btn" data-mode="scale">Scale</button>
      </div>

      <!-- Group Bending & Flattening Deformer Section -->
      <div id="ui-group-deform-section" style="margin-top: 15px; border-top: 1px dashed #444; padding-top: 15px; display: none;">
        <h4 style="color: #00ffff; font-size: 12px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.5px;">Group Deformer (Uốn nhóm)</h4>
        
        <button class="btn" id="btn-deform-mode-toggle" style="width: 100%; margin-bottom: 10px; background: #111; color: #00ffff; border: 1.5px solid #00ffff; font-weight: bold; cursor: pointer; padding: 6px 12px; border-radius: 4px; box-shadow: 0 0 8px rgba(0, 255, 255, 0.2); transition: all 0.2s;">
          📐 Bật Uốn Nhóm: TẮT
        </button>

        <div id="ui-deform-controls-container" style="display: none; flex-direction: column; gap: 8px; margin-top: 5px;">
          <div class="input-group" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
            <label style="font-size: 11px; color: #ccc;">Loại biến dạng</label>
            <select id="ui-deform-type" style="width: 120px; background: #222; color: #fff; border: 1px solid #444; padding: 4px; font-size: 11px;">
              <option value="bend">Uốn cong (Bezier)</option>
              <option value="straighten">Kéo thẳng (Linear)</option>
            </select>
          </div>

          <!-- Flattening Strength Slider -->
          <div class="input-group" id="ui-deform-strength-container" style="display: none; margin-bottom: 5px;">
            <label style="font-size: 11px; color: #ccc;">Cường độ kéo thẳng</label>
            <div style="display: flex; align-items: center; gap: 8px; margin-top: 2px;">
              <input type="range" id="ui-deform-strength" min="0" max="100" value="100" style="flex: 1;" />
              <span id="ui-deform-strength-val" style="font-size: 11px; width: 32px; text-align: right; font-family: monospace; color: #00ffff;">100%</span>
            </div>
          </div>

          <div style="font-size: 10.5px; color: #888; margin-bottom: 8px; font-style: italic; line-height: 1.3;">
            Nhấn chuột vào 3 khối cầu Handle (Neon) ngoài Viewport để kéo uốn/giãn nhóm drone!
          </div>

          <div style="display: flex; gap: 6px;">
            <button class="btn" id="btn-deform-apply" style="flex: 1; background: #4CAF50; color: white; padding: 6px; font-size: 11px; font-weight: bold; margin: 0;">Áp dụng</button>
            <button class="btn" id="btn-deform-cancel" style="flex: 1; background: #d90429; color: white; padding: 6px; font-size: 11px; font-weight: bold; margin: 0;">Huỷ bỏ</button>
          </div>
        </div>
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

  // Bind Mode buttons dynamically
  const bindGizmoModes = () => {
    const gizmoBtns = document.querySelectorAll('.gizmo-btn');
    gizmoBtns.forEach(btn => {
      btn.onclick = (e) => {
        const btns = document.querySelectorAll('.gizmo-btn');
        btns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        director.gizmoSystem.setMode(e.target.dataset.mode);
      };
    });
  };
  bindGizmoModes();

  if (!director.gizmoSystem) return;

  function syncDeformUI() {
    const isDeformActive = director.gizmoSystem.isDeformModeActive;
    const toggleBtn = document.getElementById('btn-deform-mode-toggle');
    const container = document.getElementById('ui-deform-controls-container');
    const typeSelect = document.getElementById('ui-deform-type');
    const strengthContainer = document.getElementById('ui-deform-strength-container');

    if (!toggleBtn || !container) return;

    if (isDeformActive) {
      toggleBtn.textContent = "📐 Bật Uốn Nhóm: ĐANG BẬT";
      toggleBtn.style.background = "#00ffff";
      toggleBtn.style.color = "#111";
      toggleBtn.style.boxShadow = "0 0 15px rgba(0, 255, 255, 0.6)";
      container.style.display = 'flex';

      const type = typeSelect ? typeSelect.value : 'bend';
      if (strengthContainer) {
        strengthContainer.style.display = type === 'straighten' ? 'block' : 'none';
      }
    } else {
      toggleBtn.textContent = "📐 Bật Uốn Nhóm: TẮT";
      toggleBtn.style.background = "#111";
      toggleBtn.style.color = "#00ffff";
      toggleBtn.style.boxShadow = "0 0 8px rgba(0, 255, 255, 0.2)";
      container.style.display = 'none';
    }
  }

  // Bind deform actions dynamically to active DOM elements
  const bindDeformEvents = () => {
    const toggleBtn = document.getElementById('btn-deform-mode-toggle');
    const typeSelect = document.getElementById('ui-deform-type');
    const strengthInput = document.getElementById('ui-deform-strength');
    const strengthVal = document.getElementById('ui-deform-strength-val');
    const applyBtn = document.getElementById('btn-deform-apply');
    const cancelBtn = document.getElementById('btn-deform-cancel');

    if (toggleBtn) {
      toggleBtn.onclick = () => {
        const nextState = !director.gizmoSystem.isDeformModeActive;
        if (nextState) {
          director.gizmoSystem.activateDeformMode();
        } else {
          director.gizmoSystem.deactivateDeformMode(false);
        }
        syncDeformUI();
      };
    }

    if (typeSelect) {
      typeSelect.onchange = (e) => {
        const type = e.target.value;
        director.gizmoSystem.deformType = type;
        director.gizmoSystem.updateDeformLine();
        director.gizmoSystem.updateGroupDeformation();
        syncDeformUI();
      };
    }

    if (strengthInput) {
      strengthInput.oninput = (e) => {
        const val = parseInt(e.target.value, 10);
        if (strengthVal) strengthVal.textContent = val + "%";
        director.gizmoSystem.deformStrength = val / 100;
        director.gizmoSystem.updateGroupDeformation();
      };
    }

    if (applyBtn) {
      applyBtn.onclick = () => {
        director.gizmoSystem.deactivateDeformMode(true);
        syncDeformUI();
      };
    }

    if (cancelBtn) {
      cancelBtn.onclick = () => {
        director.gizmoSystem.deactivateDeformMode(false);
        syncDeformUI();
      };
    }
  };
  bindDeformEvents();

  // Selection subscription to auto show/hide the panel (using fully dynamic DOM queries)
  state.subscribe(() => {
    const deformSection = document.getElementById('ui-group-deform-section');
    const hasSelection = state.selectedIndices.size > 0;

    // Proactively re-bind mode buttons and deform elements if the DOM was re-rendered
    bindGizmoModes();
    bindDeformEvents();

    if (deformSection) {
      if (hasSelection) {
        deformSection.style.display = 'block';
      } else {
        // If selection is cleared, turn off deform mode and hide the section
        if (director.gizmoSystem.isDeformModeActive) {
          director.gizmoSystem.deactivateDeformMode(false);
        }
        deformSection.style.display = 'none';
        syncDeformUI();
      }
    }
  });

  // Initial Sync selection state
  const initDeformSection = document.getElementById('ui-group-deform-section');
  if (initDeformSection) {
    const hasSelection = state.selectedIndices.size > 0;
    initDeformSection.style.display = hasSelection ? 'block' : 'none';
  }

  syncDeformUI();
}
