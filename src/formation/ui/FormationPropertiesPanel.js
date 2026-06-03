import * as THREE from 'three';
import { t } from '../../config/lang/i18n.js';

import { renderFormationPropertiesPanel } from './templates/FormationTemplates.js';
export { renderFormationPropertiesPanel };

export function setupFormationPropertiesPanel(state) {
  const updatePosFromInput = () => {
    if (state.selectedIndices.size > 0) {
      const x = parseFloat(document.getElementById('ui-pos-x').value) || 0;
      const y = parseFloat(document.getElementById('ui-pos-y').value) || 0;
      const z = parseFloat(document.getElementById('ui-pos-z').value) || 0;

      const newCenter = new THREE.Vector3(x, y, z);

      // Calculate current center
      const currentCenter = new THREE.Vector3();
      for (const id of state.selectedIndices) {
        currentCenter.add(state.positions[id]);
      }
      currentCenter.divideScalar(state.selectedIndices.size);

      // Calculate delta
      const delta = newCenter.sub(currentCenter);

      const updates = [];
      for (const id of state.selectedIndices) {
        const pos = state.positions[id].clone().add(delta);
        updates.push({ index: id, pos: pos });
      }
      state.updatePositions(updates);
      state.saveStateToHistory();
    }
  };

  document.getElementById('ui-pos-x').addEventListener('change', updatePosFromInput);
  document.getElementById('ui-pos-y').addEventListener('change', updatePosFromInput);
  document.getElementById('ui-pos-z').addEventListener('change', updatePosFromInput);

  document.getElementById('ui-color').addEventListener('input', (e) => {
    const hex = parseInt(e.target.value.replace('#', '0x'));
    state.updateSelectionColor(hex);
  });

  document.getElementById('btn-delete-selected').addEventListener('click', () => {
    if (confirm(t('editor.selectionPanel.confirmDelete', { count: state.selectedIndices.size }))) {
      state.deleteSelected();
    }
  });

  // Setup Center inputs and checkboxes
  const updateCenterFromInputs = () => {
    const cx = parseFloat(document.getElementById('ui-center-x').value) || 0;
    const cy = parseFloat(document.getElementById('ui-center-y').value) || 0;
    const cz = parseFloat(document.getElementById('ui-center-z').value) || 0;
    
    state.center.set(cx, cy, cz);
    state.saveStateToHistory();
    state.notify();
  };

  document.getElementById('ui-center-x').addEventListener('change', updateCenterFromInputs);
  document.getElementById('ui-center-y').addEventListener('change', updateCenterFromInputs);
  document.getElementById('ui-center-z').addEventListener('change', updateCenterFromInputs);

  document.getElementById('ui-show-center').addEventListener('change', (e) => {
    state.showCenter = e.target.checked;
    state.saveStateToHistory();
    state.notify();
  });

  document.getElementById('ui-show-pivot-lines').addEventListener('change', (e) => {
    state.showPivotLines = e.target.checked;
    state.saveStateToHistory();
    state.notify();
  });

  document.getElementById('btn-center-to-selection').addEventListener('click', () => {
    if (state.selectedIndices.size > 0) {
      const center = new THREE.Vector3();
      for (const id of state.selectedIndices) {
        center.add(state.positions[id]);
      }
      center.divideScalar(state.selectedIndices.size);

      state.center.copy(center);
      state.saveStateToHistory();
      state.notify();
    }
  });

  state.subscribe(() => {
    const selInfo = document.getElementById('selection-info');
    const coordInputs = document.getElementById('coord-inputs');

    if (selInfo) {
      selInfo.textContent = t('editor.selectionPanel.selectedCount', { count: state.selectedIndices.size });

      if (state.selectedIndices.size > 0) {
        coordInputs.style.display = 'block';

        // Calculate center of selection
        const center = new THREE.Vector3();
        for (const id of state.selectedIndices) {
          center.add(state.positions[id]);
        }
        center.divideScalar(state.selectedIndices.size);

        // Only update input values if they are not actively being focused
        if (document.activeElement !== document.getElementById('ui-pos-x')) document.getElementById('ui-pos-x').value = center.x.toFixed(2);
        if (document.activeElement !== document.getElementById('ui-pos-y')) document.getElementById('ui-pos-y').value = center.y.toFixed(2);
        if (document.activeElement !== document.getElementById('ui-pos-z')) document.getElementById('ui-pos-z').value = center.z.toFixed(2);

        // Get color of first selected particle to show in color picker
        const firstId = Array.from(state.selectedIndices)[0];
        if (state.colors[firstId]) {
          const hexStr = '#' + state.colors[firstId].getHexString();
          document.getElementById('ui-color').value = hexStr;
        }

      } else {
        coordInputs.style.display = 'none';
      }
    }

    // Update Center values and checkboxes in subscriber
    if (state.center) {
      if (document.activeElement !== document.getElementById('ui-center-x')) {
        document.getElementById('ui-center-x').value = state.center.x.toFixed(2);
      }
      if (document.activeElement !== document.getElementById('ui-center-y')) {
        document.getElementById('ui-center-y').value = state.center.y.toFixed(2);
      }
      if (document.activeElement !== document.getElementById('ui-center-z')) {
        document.getElementById('ui-center-z').value = state.center.z.toFixed(2);
      }
    }

    const showCenterCb = document.getElementById('ui-show-center');
    if (showCenterCb) showCenterCb.checked = !!state.showCenter;

    const showPivotCb = document.getElementById('ui-show-pivot-lines');
    if (showPivotCb) showPivotCb.checked = !!state.showPivotLines;

    const btnCenterSel = document.getElementById('btn-center-to-selection');
    if (btnCenterSel) {
      if (state.selectedIndices.size > 0) {
        btnCenterSel.style.display = 'block';
      } else {
        btnCenterSel.style.display = 'none';
      }
    }
  });
}
