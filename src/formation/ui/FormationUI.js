import { renderFormationShapePanel, setupFormationShapePanel } from './FormationShapePanel.js';
import { renderFormationPropertiesPanel, setupFormationPropertiesPanel } from './FormationPropertiesPanel.js';
import { renderGizmoPanel, setupGizmoPanel } from '../../editor/ui/panels/GizmoPanel.js';
import { renderGroupPanel, setupGroupPanel } from '../../editor/ui/panels/GroupPanel.js';

export function setupFormationUI(state, director) {
  const leftContainer = document.getElementById('editor-ui-left');
  const rightContainer = document.getElementById('editor-ui-right');
  if (!leftContainer || !rightContainer) return;

  leftContainer.innerHTML = `
    <h2>Formation Editor</h2>
    <p style="color: #888; font-size: 12px; margin-top: -10px;">Static 3D Arrangement</p>
    ${renderFormationShapePanel()}
    ${renderGroupPanel()}
  `;

  rightContainer.innerHTML = `
    ${renderGizmoPanel()}
    ${renderFormationPropertiesPanel()}
  `;

  // Bind Events & Logic
  setupFormationShapePanel(state);
  setupGroupPanel(state);
  setupGizmoPanel(state, director);
  setupFormationPropertiesPanel(state);
}
