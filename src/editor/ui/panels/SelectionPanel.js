import * as THREE from 'three';

import { t } from '../../../config/lang/i18n.js';

import { renderSelectionPanel } from '../templates/EditorTemplates.js';
export { renderSelectionPanel };

export function setupSelectionPanel(state, director) {
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
      state.saveCurrentStep();
      state.saveStateToHistory();
    }
  };

  const updateTransformFromInputs = () => {
    if (state.selectedIndices.size > 0 && director && director.gizmoSystem) {
      const gizmo = director.gizmoSystem;
      if (!gizmo.proxyGroup) return;

      const rx = THREE.MathUtils.degToRad(parseFloat(document.getElementById('ui-rot-x').value) || 0);
      const ry = THREE.MathUtils.degToRad(parseFloat(document.getElementById('ui-rot-y').value) || 0);
      const rz = THREE.MathUtils.degToRad(parseFloat(document.getElementById('ui-rot-z').value) || 0);
      gizmo.proxyGroup.rotation.set(rx, ry, rz);

      const sx = parseFloat(document.getElementById('ui-scale-x').value) !== undefined && !isNaN(parseFloat(document.getElementById('ui-scale-x').value)) ? parseFloat(document.getElementById('ui-scale-x').value) : 1.0;
      const sy = parseFloat(document.getElementById('ui-scale-y').value) !== undefined && !isNaN(parseFloat(document.getElementById('ui-scale-y').value)) ? parseFloat(document.getElementById('ui-scale-y').value) : 1.0;
      const sz = parseFloat(document.getElementById('ui-scale-z').value) !== undefined && !isNaN(parseFloat(document.getElementById('ui-scale-z').value)) ? parseFloat(document.getElementById('ui-scale-z').value) : 1.0;
      gizmo.proxyGroup.scale.set(sx, sy, sz);

      gizmo.proxyGroup.updateMatrixWorld(true);

      const targetPos = new THREE.Vector3();
      const updates = [];
      for (const [id, mesh] of gizmo.proxyMeshes.entries()) {
        if (id === 'center') continue;
        mesh.getWorldPosition(targetPos);
        updates.push({ index: id, pos: targetPos.clone() });
      }

      state.updatePositions(updates);
      state.saveCurrentStep();
      state.saveStateToHistory();
    }
  };

  document.getElementById('ui-pos-x').addEventListener('change', updatePosFromInput);
  document.getElementById('ui-pos-y').addEventListener('change', updatePosFromInput);
  document.getElementById('ui-pos-z').addEventListener('change', updatePosFromInput);

  document.getElementById('ui-rot-x').addEventListener('change', updateTransformFromInputs);
  document.getElementById('ui-rot-y').addEventListener('change', updateTransformFromInputs);
  document.getElementById('ui-rot-z').addEventListener('change', updateTransformFromInputs);
  document.getElementById('ui-scale-x').addEventListener('change', updateTransformFromInputs);
  document.getElementById('ui-scale-y').addEventListener('change', updateTransformFromInputs);
  document.getElementById('ui-scale-z').addEventListener('change', updateTransformFromInputs);

  document.getElementById('ui-color').addEventListener('input', (e) => {
    const hex = parseInt(e.target.value.replace('#', '0x'));
    state.updateSelectionColor(hex);
    state.saveCurrentStep();
  });

  document.getElementById('ui-effect').addEventListener('change', (e) => {
    state.updateSelectionEffect(e.target.value);
    state.saveCurrentStep();
  });

  document.getElementById('btn-break-constraints').addEventListener('click', () => {
    state.breakLineConstraints();
  });

  document.getElementById('btn-delete-selected').addEventListener('click', () => {
    if (confirm(t('editor.selectionPanel.confirmDelete', { count: state.selectedIndices.size }))) {
      state.deleteSelected();
      state.saveCurrentStep();
    }
  });

  // Setup Center inputs and checkboxes
  const updateCenterFromInputs = () => {
    const cx = parseFloat(document.getElementById('ui-center-x').value) || 0;
    const cy = parseFloat(document.getElementById('ui-center-y').value) || 0;
    const cz = parseFloat(document.getElementById('ui-center-z').value) || 0;

    state.center.set(cx, cy, cz);
    state.saveCurrentStep();
    state.saveStateToHistory();
    state.notify();
  };

  document.getElementById('ui-center-x').addEventListener('change', updateCenterFromInputs);
  document.getElementById('ui-center-y').addEventListener('change', updateCenterFromInputs);
  document.getElementById('ui-center-z').addEventListener('change', updateCenterFromInputs);

  document.getElementById('ui-show-center').addEventListener('change', (e) => {
    state.showCenter = e.target.checked;
    state.saveCurrentStep();
    state.saveStateToHistory();
    state.notify();
  });

  document.getElementById('ui-show-pivot-lines').addEventListener('change', (e) => {
    state.showPivotLines = e.target.checked;
    state.saveCurrentStep();
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
      state.saveCurrentStep();
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

        // Determine if all selected share the same effect
        let sameEffect = true;
        let firstEffect = state.effects[firstId] || 'none';
        for (const id of state.selectedIndices) {
          const eff = state.effects[id] || 'none';
          if (eff !== firstEffect) {
            sameEffect = false;
            break;
          }
        }

        if (sameEffect) {
          document.getElementById('ui-effect').value = firstEffect;
        } else {
          document.getElementById('ui-effect').value = 'none';
        }

        // Sync rotate & scale inputs from gizmo proxyGroup
        if (director && director.gizmoSystem && director.gizmoSystem.proxyGroup) {
          const gizmo = director.gizmoSystem;
          const rot = gizmo.proxyGroup.rotation;
          const scl = gizmo.proxyGroup.scale;

          if (document.activeElement !== document.getElementById('ui-rot-x')) {
            document.getElementById('ui-rot-x').value = THREE.MathUtils.radToDeg(rot.x).toFixed(0);
          }
          if (document.activeElement !== document.getElementById('ui-rot-y')) {
            document.getElementById('ui-rot-y').value = THREE.MathUtils.radToDeg(rot.y).toFixed(0);
          }
          if (document.activeElement !== document.getElementById('ui-rot-z')) {
            document.getElementById('ui-rot-z').value = THREE.MathUtils.radToDeg(rot.z).toFixed(0);
          }

          if (document.activeElement !== document.getElementById('ui-scale-x')) {
            document.getElementById('ui-scale-x').value = scl.x.toFixed(2);
          }
          if (document.activeElement !== document.getElementById('ui-scale-y')) {
            document.getElementById('ui-scale-y').value = scl.y.toFixed(2);
          }
          if (document.activeElement !== document.getElementById('ui-scale-z')) {
            document.getElementById('ui-scale-z').value = scl.z.toFixed(2);
          }
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
