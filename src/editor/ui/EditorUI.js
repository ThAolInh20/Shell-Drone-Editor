import { renderFilePanel, setupFilePanel } from './panels/FilePanel.js';
import { renderShapePanel, setupShapePanel } from './panels/ShapePanel.js';
import { renderGroupPanel, setupGroupPanel } from './panels/GroupPanel.js';
import { renderGizmoPanel, setupGizmoPanel } from './panels/GizmoPanel.js';
import { renderSelectionPanel, setupSelectionPanel } from './panels/SelectionPanel.js';
import { renderStepPanel, setupStepPanel } from './panels/StepPanel.js';
import { setupTimelinePanel } from './panels/TimelinePanel.js';

export function setupEditorUI(state, director) {
  const leftContainer = document.getElementById('editor-ui-left');
  const rightContainer = document.getElementById('editor-ui-right');
  if (!leftContainer || !rightContainer) return;

  leftContainer.innerHTML = `
    <h2>Drone Editor</h2>
    ${renderFilePanel()}
    ${renderShapePanel()}
    ${renderGroupPanel()}
  `;

  rightContainer.innerHTML = `
    ${renderGizmoPanel()}
    ${renderSelectionPanel()}
    ${renderStepPanel()}
  `;

  // Bind Events & Logic
  setupFilePanel(state);
  setupShapePanel(state, director);
  setupGroupPanel(state);
  setupGizmoPanel(state, director);
  setupSelectionPanel(state);
  setupStepPanel(state);
  setupTimelinePanel(state);
}
