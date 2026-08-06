import { setupBaseEditorUI } from '../../editor/ui/BaseEditorUI.js';
import { renderFormationShapePanel, setupFormationShapePanel } from './FormationShapePanel.js';
import { renderFormationPropertiesPanel, setupFormationPropertiesPanel } from './FormationPropertiesPanel.js';
import { renderGizmoPanel, setupGizmoPanel } from '../../editor/ui/panels/GizmoPanel.js';
import { renderGroupPanel, setupGroupPanel } from '../../editor/ui/panels/GroupPanel.js';
import { t } from '../../config/lang/i18n.js';

export function setupFormationUI(state, uiBridge) {
  setupBaseEditorUI(state, uiBridge, {
    title: t('editor.formationPanel.title'),
    subtitle: t('editor.formationPanel.subtitle'),
    resetViewText: t('editor.formationPanel.viewMain'),
    leftPanelsHtml: `
      ${renderFormationShapePanel()}
      ${renderGroupPanel()}
    `,
    rightPanelsHtml: `
      ${renderGizmoPanel()}
      ${renderFormationPropertiesPanel()}
    `,
    shouldCollapse: (title) => {
      const titleText = title.toLowerCase();
      return titleText.includes('group') || titleText.includes('selection') || titleText.includes('nhóm') || titleText.includes('chọn');
    },
    setupPanels: () => {
      setupFormationShapePanel(state, uiBridge);
      setupGroupPanel(state);
      setupGizmoPanel(state, uiBridge);
      setupFormationPropertiesPanel(state);
    }
  });
}
