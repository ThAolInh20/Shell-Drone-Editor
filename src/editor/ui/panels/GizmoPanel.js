import { t } from '../../../config/lang/i18n.js';

import { renderGizmoPanel } from '../templates/EditorTemplates.js';
export { renderGizmoPanel };

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
      toggleBtn.textContent = t('editor.gizmoPanel.deformerToggleOn');
      toggleBtn.style.background = "#00ffff";
      toggleBtn.style.color = "#111";
      toggleBtn.style.boxShadow = "0 0 15px rgba(0, 255, 255, 0.6)";
      container.style.display = 'flex';

      const type = typeSelect ? typeSelect.value : 'bend';
      if (strengthContainer) {
        strengthContainer.style.display = type === 'straighten' ? 'block' : 'none';
      }
    } else {
      toggleBtn.textContent = t('editor.gizmoPanel.deformerToggleOff');
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
