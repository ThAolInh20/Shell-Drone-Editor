import { t } from '../../../config/lang/i18n.js';
import { customPrompt, customChoicePrompt, customAlert } from '../utils/Modal.js';

import { renderGroupPanel } from '../templates/EditorTemplates.js';
export { renderGroupPanel };

export function setupGroupPanel(state) {
  const collapsedGroups = new Set();

  document.getElementById('btn-group-selected')?.addEventListener('click', async () => {
    if (state.selectedIndices.size === 0) {
      await customAlert(t('editor.selectDronesToGroup'));
      return;
    }
    const parentName = await customPrompt(t('editor.enterParentName'));
    if (!parentName) return;

    // Validate parent name to not contain slashes
    const cleanName = parentName.replace(/\//g, '_');

    for (const idx of state.selectedIndices) {
      const current = state.particleGroups[idx] || 'Default';
      state.particleGroups[idx] = cleanName + '/' + current;
    }
    state.saveCurrentStep();
    state.saveStateToHistory();
    state.notify();
  });

  document.getElementById('btn-group-selected-flat')?.addEventListener('click', async () => {
    if (state.selectedIndices.size === 0) {
      await customAlert(t('editor.selectDronesToGroup'));
      return;
    }

    // Auto-generate unique flat group name
    const existing = new Set(state.getUniqueGroups());
    let count = 1;
    let cleanName = `Group_${count}`;
    while (existing.has(cleanName)) {
      count++;
      cleanName = `Group_${count}`;
    }

    for (const idx of state.selectedIndices) {
      state.particleGroups[idx] = cleanName;
    }
    state.saveCurrentStep();
    state.saveStateToHistory();
    state.notify();
  });

  document.getElementById('btn-ungroup')?.addEventListener('click', () => {
    if (state.selectedIndices.size === 0) return;

    let changed = false;
    for (const idx of state.selectedIndices) {
      const current = state.particleGroups[idx];
      if (current && current.includes('/')) {
        // Remove the top-level parent
        const parts = current.split('/');
        parts.shift(); // remove the first element
        state.particleGroups[idx] = parts.join('/');
        changed = true;
      }
    }
    if (changed) {
      state.saveCurrentStep();
      state.saveStateToHistory();
      state.notify();
    }
  });

  document.getElementById('btn-reset-group')?.addEventListener('click', async () => {
    const activeGroup = state.activeGroup;
    const choice = await customChoicePrompt(t('editor.resetGroupTitle', { name: activeGroup }), [
      { label: t('editor.resetChoicePivotDronesOrigin'), value: "pivot_drones_origin" },
      { label: t('editor.resetChoiceResetStep0'), value: "reset_step_0" },
      { label: t('editor.resetChoicePivotOnly'), value: "pivot_only" }
    ]);

    if (!choice) return;

    const defaultOrigin = new THREE.Vector3(0, 20, 0);

    if (choice === "pivot_drones_origin") {
      const offset = new THREE.Vector3().subVectors(defaultOrigin, state.center);
      let count = 0;
      for (let i = 0; i < state.positions.length; i++) {
        if (state.isDroneInGroup(i, activeGroup)) {
          state.positions[i].add(offset);
          count++;
        }
      }
      state.center.copy(defaultOrigin);
      state.saveCurrentStep();
      state.saveStateToHistory();
      state.notify();
      await customAlert(t('editor.resetAlertPivotDronesOrigin', { name: activeGroup, count }));
    } else if (choice === "reset_step_0") {
      const step0 = state.steps[0];
      if (!step0) return;
      let count = 0;
      for (let i = 0; i < state.positions.length; i++) {
        if (state.isDroneInGroup(i, activeGroup)) {
          if (step0.positions[i]) {
            state.positions[i].copy(step0.positions[i]);
            count++;
          }
        }
      }
      const cfg0 = state.getGroupConfigForStep(activeGroup, step0);
      if (cfg0 && cfg0.center) {
        state.center.copy(cfg0.center);
      }
      state.saveCurrentStep();
      state.saveStateToHistory();
      state.notify();
      await customAlert(t('editor.resetAlertResetStep0', { name: activeGroup, count }));
    } else if (choice === "pivot_only") {
      state.center.copy(defaultOrigin);
      state.saveCurrentStep();
      state.saveStateToHistory();
      state.notify();
      await customAlert(t('editor.resetAlertPivotOnly', { name: activeGroup }));
    }
  });

  state.subscribe(() => {
    const groupList = document.getElementById('group-list');
    if (groupList) {
      const groups = state.getUniqueGroups();
      groupList.innerHTML = '';

      // Helper function to check if a group is collapsed by any ancestor
      const isHidden = (groupPath) => {
        const parts = groupPath.split('/');
        for (let i = 1; i < parts.length; i++) {
          const ancestor = parts.slice(0, i).join('/');
          if (collapsedGroups.has(ancestor)) {
            return true;
          }
        }
        return false;
      };

      groups.forEach(g => {
        // Skip rendering if any parent/ancestor group is collapsed
        if (isHidden(g)) {
          return;
        }

        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.justifyContent = 'space-between';
        div.style.gap = '8px';

        const depth = g.split('/').length - 1;
        const name = g.split('/').pop();

        // Check if this group has children in the groups list
        const hasChildren = groups.some(otherG => otherG.startsWith(g + '/'));

        // Render arrow icon or matching spacer
        const toggleSpan = document.createElement('span');
        toggleSpan.style.display = 'inline-block';
        toggleSpan.style.width = '12px';
        toggleSpan.style.marginRight = '5px';
        toggleSpan.style.textAlign = 'center';
        toggleSpan.style.userSelect = 'none';

        if (hasChildren) {
          const isCollapsed = collapsedGroups.has(g);
          toggleSpan.textContent = isCollapsed ? '▸' : '▾';
          toggleSpan.style.cursor = 'pointer';
          toggleSpan.style.color = '#aaa';
          toggleSpan.addEventListener('click', (e) => {
            e.stopPropagation(); // Don't trigger selecting the group when collapsing/expanding
            if (isCollapsed) {
              collapsedGroups.delete(g);
            } else {
              collapsedGroups.add(g);
            }
            state.notify();
          });
        } else {
          toggleSpan.textContent = '';
        }

        const leftContent = document.createElement('div');
        leftContent.style.display = 'flex';
        leftContent.style.alignItems = 'center';
        leftContent.style.minWidth = '0';
        leftContent.style.flex = '1';

        leftContent.appendChild(toggleSpan);

        const nameSpan = document.createElement('span');
        nameSpan.textContent = name;
        nameSpan.title = t('editor.doubleClickRename');
        nameSpan.style.textOverflow = 'ellipsis';
        nameSpan.style.whiteSpace = 'nowrap';
        nameSpan.style.overflow = 'hidden';
        nameSpan.style.minWidth = '0';
        nameSpan.style.flex = '1';
        
        nameSpan.ondblclick = async (e) => {
          e.stopPropagation();
          const newName = await customPrompt(t('editor.renamePrompt', { name }), name);
          if (newName !== null && newName.trim() !== '') {
            const cleanName = newName.trim().replace(/\//g, '_'); // prevent nesting issues
            const oldGroup = g;
            
            // Reconstruct the new full path
            const parts = g.split('/');
            parts[parts.length - 1] = cleanName;
            const newGroup = parts.join('/');
            
            // Update active state
            for (let i = 0; i < state.particleGroups.length; i++) {
              if (state.particleGroups[i] === oldGroup) {
                state.particleGroups[i] = newGroup;
              } else if (state.particleGroups[i] && state.particleGroups[i].startsWith(oldGroup + '/')) {
                state.particleGroups[i] = state.particleGroups[i].replace(oldGroup + '/', newGroup + '/');
              }
            }

            // Rename group step properties configurations in all steps (Solution B)
            for (const step of state.steps) {
              if (step.groupConfigs && step.groupConfigs[oldGroup]) {
                step.groupConfigs[newGroup] = step.groupConfigs[oldGroup];
                delete step.groupConfigs[oldGroup];
              }
            }
            if (state.activeGroup === oldGroup) {
              state.activeGroup = newGroup;
            }
            
            // Apply group changes to the current step
            state.saveCurrentStep();
            
            state.saveStateToHistory();
            state.notify();
          }
        };
        
        leftContent.appendChild(nameSpan);
        div.appendChild(leftContent);

        // Actions container
        const actionsDiv = document.createElement('div');
        actionsDiv.style.display = 'flex';
        actionsDiv.style.alignItems = 'center';
        actionsDiv.style.gap = '6px';
        actionsDiv.style.flexShrink = '0';

        const delBtn = document.createElement('span');
        delBtn.textContent = '×';
        delBtn.style.color = '#ff4d4d';
        delBtn.style.fontWeight = 'bold';
        delBtn.style.padding = '0 5px';
        delBtn.style.borderRadius = '3px';
        delBtn.style.cursor = 'pointer';
        delBtn.addEventListener('mouseover', () => delBtn.style.background = 'rgba(255,0,0,0.2)');
        delBtn.addEventListener('mouseout', () => delBtn.style.background = 'transparent');

        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm(t('editor.confirmDeleteGroup', { name }))) {
            state.selectGroup(g, false);
            state.deleteSelected();
          }
        });

        // Count total drones in this group (and its children)
        let totalInThisGroup = 0;
        let dronesInThisGroupIndices = [];
        const thisPrefix = g + '/';
        state.particleGroups.forEach((pg, idx) => {
          if (pg === g || (pg && pg.startsWith(thisPrefix))) {
            totalInThisGroup++;
            dronesInThisGroupIndices.push(idx);
          }
        });

        // Add Split Group Button (✂️)
        const splitBtn = document.createElement('span');
        splitBtn.textContent = '✂️';
        splitBtn.style.cursor = 'pointer';
        splitBtn.style.fontSize = '11px';
        splitBtn.style.padding = '0 3px';
        splitBtn.style.borderRadius = '3px';
        splitBtn.style.transition = 'background 0.2s';
        splitBtn.title = t('editor.splitBtnTitle');
        splitBtn.addEventListener('mouseover', () => splitBtn.style.background = 'rgba(255,255,255,0.15)');
        splitBtn.addEventListener('mouseout', () => splitBtn.style.background = 'transparent');

        splitBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          
          if (totalInThisGroup === 0) {
            await customAlert(t('editor.noDronesToSplit'));
            return;
          }

          // Auto-generate sibling group name with suffix _split
          const existing = new Set(state.getUniqueGroups());
          const parts = g.split('/');
          const baseLeafName = parts[parts.length - 1];
          let cleanNewName = `${baseLeafName}_split`;
          
          // Reconstruct path to check uniqueness
          parts[parts.length - 1] = cleanNewName;
          let candidatePath = parts.join('/');
          
          let count = 1;
          while (existing.has(candidatePath)) {
            cleanNewName = `${baseLeafName}_split_${count}`;
            parts[parts.length - 1] = cleanNewName;
            candidatePath = parts.join('/');
            count++;
          }
          
          const newGroupPath = candidatePath;

          const countStr = await customPrompt(t('editor.splitPrompt', { name, newName: cleanNewName, total: totalInThisGroup }), "1");
          if (countStr === null) return;
          
          const splitCount = parseInt(countStr, 10);
          if (isNaN(splitCount) || splitCount <= 0 || splitCount > totalInThisGroup) {
            await customAlert(t('editor.splitInvalidCount', { total: totalInThisGroup }));
            return;
          }

          // Take the last K drones from the group indices
          const dronesToSplit = dronesInThisGroupIndices.slice(-splitCount);

          for (const idx of dronesToSplit) {
            const currentPg = state.particleGroups[idx];
            if (currentPg && currentPg.startsWith(g + '/')) {
              const relativePath = currentPg.substring(g.length); // e.g., '/D'
              state.particleGroups[idx] = newGroupPath + relativePath;
            } else {
              state.particleGroups[idx] = newGroupPath;
            }
          }

          // Apply and notify
          state.saveCurrentStep();
          state.saveStateToHistory();
          state.notify();

          // Auto-select the newly created split group
          state.selectGroup(newGroupPath, false);

          await customAlert(t('editor.splitSuccess', { count: splitCount, newGroup: newGroupPath }));
        });

        actionsDiv.appendChild(splitBtn);
        actionsDiv.appendChild(delBtn);
        div.appendChild(actionsDiv);

        div.style.paddingLeft = `${depth * 15 + 8}px`;
        div.style.paddingTop = '4px';
        div.style.paddingBottom = '4px';
        div.style.cursor = 'pointer';
        div.style.borderBottom = '1px solid #333';
        div.style.fontSize = '12px';

        // Count how many selected particles belong to this group or its children
        let selectedInGroup = 0;
        let totalInGroup = 0;
        const prefix = g + '/';
        state.particleGroups.forEach((pg, idx) => {
          if (pg === g || (pg && pg.startsWith(prefix))) {
            totalInGroup++;
            if (state.selectedIndices.has(idx)) {
              selectedInGroup++;
            }
          }
        });

        if (totalInGroup > 0) {
          const countSpan = document.createElement('span');
          countSpan.textContent = ` (${selectedInGroup}/${totalInGroup})`;
          countSpan.style.color = selectedInGroup > 0 ? '#4CAF50' : '#888';
          countSpan.style.fontSize = '10px';
          countSpan.style.marginLeft = '4px';
          countSpan.style.flexShrink = '0';
          leftContent.appendChild(countSpan);
        }

        if (selectedInGroup > 0 && selectedInGroup === totalInGroup) {
          div.style.backgroundColor = 'rgba(52, 152, 219, 0.3)'; // Highlight if fully selected
        } else if (selectedInGroup > 0) {
          div.style.backgroundColor = 'rgba(52, 152, 219, 0.1)'; // Highlight if partially selected
        }

        div.addEventListener('click', (event) => {
          state.selectGroup(g, event.ctrlKey || event.shiftKey); // hold ctrl to multi-select groups
        });

        groupList.appendChild(div);
      });
    }
  });
}

