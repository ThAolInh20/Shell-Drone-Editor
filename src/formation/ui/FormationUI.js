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
    <button id="btn-reset-view" class="btn" style="width: 100%; margin-bottom: 15px; background: linear-gradient(135deg, #2575fc 0%, #1a5adf 100%); color: #fff; border: 1px solid #3366ff; font-weight: bold; cursor: pointer; padding: 8px 12px; border-radius: 4px; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 10px rgba(37, 117, 252, 0.3); font-size: 13px; transition: all 0.2s;">
      🎥 View from Main (480m)
    </button>
    ${renderFormationShapePanel()}
    ${renderGroupPanel()}
  `;

  rightContainer.innerHTML = `
    ${renderGizmoPanel()}
    ${renderFormationPropertiesPanel()}
  `;

  // Make all sidebar panel-sections collapsible dropdowns
  makePanelsCollapsible();

  // Bind Reset View Event
  const resetViewBtn = document.getElementById('btn-reset-view');
  if (resetViewBtn) {
    resetViewBtn.addEventListener('click', () => {
      director.cameraManager.instance.position.set(0, 2, 480);
      director.controls.target.set(0, 20, 0);
      director.controls.update();
    });
    resetViewBtn.addEventListener('mouseover', () => {
      resetViewBtn.style.filter = 'brightness(1.15)';
      resetViewBtn.style.transform = 'translateY(-1px)';
    });
    resetViewBtn.addEventListener('mouseout', () => {
      resetViewBtn.style.filter = 'none';
      resetViewBtn.style.transform = 'none';
    });
  }

  // Bind Events & Logic
  setupFormationShapePanel(state, director);
  setupGroupPanel(state);
  setupGizmoPanel(state, director);
  setupFormationPropertiesPanel(state);
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

    // Collapse some less frequently used panels by default to save space
    const titleText = h3.textContent.trim().toLowerCase();
    if (
      titleText.includes('group') ||
      titleText.includes('selection')
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
