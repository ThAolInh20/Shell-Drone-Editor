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

  // Make all sidebar panel-sections collapsible dropdowns
  makePanelsCollapsible();

  // Bind Events & Logic
  setupFilePanel(state);
  setupShapePanel(state, director);
  setupGroupPanel(state);
  setupGizmoPanel(state, director);
  setupSelectionPanel(state);
  setupStepPanel(state);
  setupTimelinePanel(state);
}

function makePanelsCollapsible() {
  const sections = document.querySelectorAll('.panel-section');
  sections.forEach(section => {
    const h3 = section.querySelector('h3');
    if (!h3) return;

    // Avoid double initialization
    if (h3.dataset.collapsibleBound) return;
    h3.dataset.collapsibleBound = 'true';

    // Style the header
    h3.style.cursor = 'pointer';
    h3.style.display = 'flex';
    h3.style.justifyContent = 'space-between';
    h3.style.alignItems = 'center';
    h3.style.userSelect = 'none';
    h3.style.transition = 'color 0.2s ease';

    // Create an arrow indicator
    const arrow = document.createElement('span');
    arrow.innerHTML = '▾';
    arrow.className = 'section-arrow';
    arrow.style.transition = 'transform 0.2s ease';
    arrow.style.fontSize = '12px';
    h3.appendChild(arrow);

    // Collect all sibling elements after h3 and wrap them in a panel-content div
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'panel-content';
    contentWrapper.style.transition = 'all 0.3s ease';
    
    // Move all siblings of h3 to the content wrapper
    let sibling = h3.nextSibling;
    while (sibling) {
      const next = sibling.nextSibling;
      contentWrapper.appendChild(sibling);
      sibling = next;
    }
    section.appendChild(contentWrapper);

    let isCollapsed = false;

    // Collapse some less frequently used panels by default to save space (Keep Groups and Selection expanded!)
    const titleText = h3.textContent.trim().toLowerCase();
    if (
      titleText.includes('gizmo')
    ) {
      isCollapsed = true;
      contentWrapper.style.display = 'none';
      arrow.style.transform = 'rotate(-90deg)';
    }

    h3.addEventListener('click', () => {
      isCollapsed = !isCollapsed;
      if (isCollapsed) {
        contentWrapper.style.display = 'none';
        arrow.style.transform = 'rotate(-90deg)';
      } else {
        contentWrapper.style.display = '';
        arrow.style.transform = 'rotate(0deg)';
      }
    });

    h3.addEventListener('mouseenter', () => {
      h3.style.color = '#fff';
    });
    h3.addEventListener('mouseleave', () => {
      h3.style.color = '#aaa';
    });
  });
}
