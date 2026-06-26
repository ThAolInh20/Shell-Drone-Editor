import { setupBaseEditorUI } from './BaseEditorUI.js';
import { renderFilePanel, setupFilePanel } from './panels/FilePanel.js';
import { renderGroupPanel, setupGroupPanel } from './panels/GroupPanel.js';
import { renderGizmoPanel, setupGizmoPanel } from './panels/GizmoPanel.js';
import { renderSelectionPanel, setupSelectionPanel } from './panels/SelectionPanel.js';
import { renderStepPanel, setupStepPanel } from './panels/StepPanel.js';
import { setupTimelinePanel } from './panels/TimelinePanel.js';
import { t } from './../../config/lang/i18n.js';

export function setupEditorUI(state, director) {
  setupBaseEditorUI(state, director, {
    title: t('editor.title'),
    resetViewText: t('editor.viewMain'),
    leftPanelsHtml: `
      ${renderFilePanel()}
      ${renderGroupPanel()}
    `,
    rightPanelsHtml: `
      ${renderGizmoPanel()}
      ${renderSelectionPanel()}
      ${renderStepPanel()}
    `,
    shouldCollapse: () => false,
    setupPanels: () => {
      setupFilePanel(state);
      setupGroupPanel(state);
      setupGizmoPanel(state, director);
      setupSelectionPanel(state, director);
      setupStepPanel(state);
      setupTimelinePanel(state);
    }
  });
}

