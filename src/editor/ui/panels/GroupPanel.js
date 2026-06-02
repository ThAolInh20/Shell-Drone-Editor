import { t } from '../../../config/lang/i18n.js';

export function renderGroupPanel() {
  return `
    <div class="panel-section">
      <h3>${t('editor.groupsPanel.title')}</h3>
      <div style="display: flex; flex-direction: column; gap: 5px; margin-bottom: 10px;">
        <div style="display: flex; gap: 5px;">
          <button class="btn btn-secondary" id="btn-group-selected" style="margin-bottom: 0; padding: 5px; flex: 1; font-size: 11px;" title="${t('editor.groupsPanel.groupNestedTooltip')}">${t('editor.groupsPanel.groupNested')}</button>
          <button class="btn btn-secondary" id="btn-group-selected-flat" style="margin-bottom: 0; padding: 5px; flex: 1; font-size: 11px;" title="${t('editor.groupsPanel.groupFlatTooltip')}">${t('editor.groupsPanel.groupFlat')}</button>
        </div>
        <button class="btn btn-secondary" id="btn-ungroup" style="margin-bottom: 0; padding: 5px; width: 100%; font-size: 11px;">${t('editor.groupsPanel.ungroup')}</button>
      </div>
      <button class="btn btn-secondary" id="btn-reset-group" style="margin-bottom: 10px; width: 100%; padding: 6px; font-size: 11px; background-color: #3a86ff; color: white; display: flex; align-items: center; justify-content: center; gap: 5px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">${t('editor.groupsPanel.resetGroup')}</button>
      <div id="group-list" style="max-height: 350px; overflow-y: auto; background: #222; border: 1px solid #444; border-radius: 4px; padding: 5px;">
        <!-- Group items injected here -->
      </div>
    </div>
  `;
}

export function setupGroupPanel(state) {
  const collapsedGroups = new Set();

  document.getElementById('btn-group-selected')?.addEventListener('click', async () => {
    if (state.selectedIndices.size === 0) {
      alert(t('editor.selectDronesToGroup'));
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
    state.synchronizeGroupsToAllSteps();
    state.saveStateToHistory();
    state.notify();
  });

  document.getElementById('btn-group-selected-flat')?.addEventListener('click', () => {
    if (state.selectedIndices.size === 0) {
      alert(t('editor.selectDronesToGroup'));
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
    state.synchronizeGroupsToAllSteps();
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
      state.synchronizeGroupsToAllSteps();
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
      alert(t('editor.resetAlertPivotDronesOrigin', { name: activeGroup, count }));
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
      alert(t('editor.resetAlertResetStep0', { name: activeGroup, count }));
    } else if (choice === "pivot_only") {
      state.center.copy(defaultOrigin);
      state.saveCurrentStep();
      state.saveStateToHistory();
      state.notify();
      alert(t('editor.resetAlertPivotOnly', { name: activeGroup }));
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

        div.appendChild(toggleSpan);

        const nameSpan = document.createElement('span');
        nameSpan.textContent = name;
        nameSpan.title = t('editor.doubleClickRename');
        
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
            
            // Apply group changes to all steps
            state.synchronizeGroupsToAllSteps();
            
            state.saveStateToHistory();
            state.notify();
          }
        };
        
        div.appendChild(nameSpan);

        const delBtn = document.createElement('span');
        delBtn.textContent = '×';
        delBtn.style.float = 'right';
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

        div.appendChild(delBtn);

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
        splitBtn.style.float = 'right';
        splitBtn.style.marginRight = '8px';
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
            alert(t('editor.noDronesToSplit'));
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
            alert(t('editor.splitInvalidCount', { total: totalInThisGroup }));
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
          state.synchronizeGroupsToAllSteps();
          state.saveStateToHistory();
          state.notify();

          // Auto-select the newly created split group
          state.selectGroup(newGroupPath, false);

          alert(t('editor.splitSuccess', { count: splitCount, newGroup: newGroupPath }));
        });

        div.appendChild(splitBtn);

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
          nameSpan.appendChild(countSpan);
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

function customPrompt(title, defaultValue = "") {
  return new Promise((resolve) => {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(0, 0, 0, 0.6)';
    overlay.style.backdropFilter = 'blur(5px)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '99999';
    overlay.style.transition = 'opacity 0.2s ease';
    overlay.style.opacity = '0';

    // Prevent any pointer events from leaking into the 3D scene / OrbitControls
    overlay.addEventListener('pointerdown', (e) => e.stopPropagation());
    overlay.addEventListener('mousedown', (e) => e.stopPropagation());
    overlay.addEventListener('pointerup', (e) => e.stopPropagation());
    overlay.addEventListener('mouseup', (e) => e.stopPropagation());
    overlay.addEventListener('click', (e) => e.stopPropagation());

    // Create modal container
    const modal = document.createElement('div');
    modal.style.background = '#1e1e1e';
    modal.style.border = '1px solid #333';
    modal.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';
    modal.style.borderRadius = '8px';
    modal.style.padding = '20px';
    modal.style.width = '320px';
    modal.style.display = 'flex';
    modal.style.flexDirection = 'column';
    modal.style.gap = '15px';

    // Title
    const titleEl = document.createElement('div');
    titleEl.textContent = title;
    titleEl.style.color = '#fff';
    titleEl.style.fontWeight = 'bold';
    titleEl.style.fontSize = '14px';
    modal.appendChild(titleEl);

    // Input
    const input = document.createElement('input');
    input.type = 'text';
    input.value = defaultValue;
    input.style.width = '100%';
    input.style.background = '#222';
    input.style.border = '1px solid #555';
    input.style.color = '#fff';
    input.style.padding = '8px';
    input.style.borderRadius = '4px';
    input.style.boxSizing = 'border-box';
    input.style.outline = 'none';
    input.style.userSelect = 'text';
    input.style.webkitUserSelect = 'text';
    input.autocomplete = 'off';

    // Prevent events inside the input field from triggering hotkeys or canvas selection
    input.addEventListener('pointerdown', (e) => e.stopPropagation());
    input.addEventListener('mousedown', (e) => e.stopPropagation());
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        submit();
      } else if (e.key === 'Escape') {
        cleanup(null);
      }
    });
    input.addEventListener('keyup', (e) => e.stopPropagation());
    input.addEventListener('keypress', (e) => e.stopPropagation());

    modal.appendChild(input);

    // Buttons Container
    const btns = document.createElement('div');
    btns.style.display = 'flex';
    btns.style.justifyContent = 'flex-end';
    btns.style.gap = '10px';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = t('editor.cancelBtn');
    cancelBtn.style.background = '#333';
    cancelBtn.style.border = '1px solid #555';
    cancelBtn.style.color = '#ccc';
    cancelBtn.style.padding = '6px 12px';
    cancelBtn.style.borderRadius = '4px';
    cancelBtn.style.cursor = 'pointer';
    cancelBtn.style.fontSize = '12px';
    
    cancelBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
    cancelBtn.addEventListener('mousedown', (e) => e.stopPropagation());
    cancelBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      cleanup(null);
    });

    const okBtn = document.createElement('button');
    okBtn.textContent = t('editor.okBtn');
    okBtn.style.background = '#3a86ff';
    okBtn.style.border = 'none';
    okBtn.style.color = '#fff';
    okBtn.style.padding = '6px 12px';
    okBtn.style.borderRadius = '4px';
    okBtn.style.cursor = 'pointer';
    okBtn.style.fontSize = '12px';
    okBtn.style.fontWeight = 'bold';
    
    const submit = () => {
      const val = input.value.trim();
      cleanup(val);
    };

    okBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
    okBtn.addEventListener('mousedown', (e) => e.stopPropagation());
    okBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      submit();
    });

    btns.appendChild(cancelBtn);
    btns.appendChild(okBtn);
    modal.appendChild(btns);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Focus immediately
    input.focus();
    input.select();

    // Fade in and focus on the input field again to make sure
    setTimeout(() => {
      overlay.style.opacity = '1';
      input.focus();
      input.select();
    }, 50);

    function cleanup(value) {
      overlay.style.opacity = '0';
      setTimeout(() => {
        if (document.body.contains(overlay)) {
          document.body.removeChild(overlay);
        }
        resolve(value);
      }, 200);
    }
  });
}

function customChoicePrompt(title, options) {
  return new Promise((resolve) => {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(0, 0, 0, 0.6)';
    overlay.style.backdropFilter = 'blur(5px)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '99999';
    overlay.style.transition = 'opacity 0.2s ease';
    overlay.style.opacity = '0';

    overlay.addEventListener('pointerdown', (e) => e.stopPropagation());
    overlay.addEventListener('mousedown', (e) => e.stopPropagation());

    const modal = document.createElement('div');
    modal.style.background = '#1e1e1e';
    modal.style.border = '1px solid #333';
    modal.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';
    modal.style.borderRadius = '8px';
    modal.style.padding = '20px';
    modal.style.width = '350px';
    modal.style.display = 'flex';
    modal.style.flexDirection = 'column';
    modal.style.gap = '10px';

    const titleEl = document.createElement('div');
    titleEl.textContent = title;
    titleEl.style.color = '#fff';
    titleEl.style.fontWeight = 'bold';
    titleEl.style.fontSize = '14px';
    titleEl.style.marginBottom = '5px';
    modal.appendChild(titleEl);

    // Render options as buttons
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.textContent = opt.label;
      btn.style.width = '100%';
      btn.style.background = '#2a2a2a';
      btn.style.border = '1px solid #444';
      btn.style.color = '#fff';
      btn.style.padding = '10px';
      btn.style.borderRadius = '4px';
      btn.style.cursor = 'pointer';
      btn.style.textAlign = 'left';
      btn.style.fontSize = '12px';
      btn.style.fontWeight = '500';
      btn.style.transition = 'background 0.2s, border-color 0.2s';
      
      btn.addEventListener('mouseover', () => {
        btn.style.background = '#333';
        btn.style.borderColor = '#3a86ff';
      });
      btn.addEventListener('mouseout', () => {
        btn.style.background = '#2a2a2a';
        btn.style.borderColor = '#444';
      });
      btn.addEventListener('click', () => {
        cleanup(opt.value);
      });
      modal.appendChild(btn);
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = t('editor.cancelBtn');
    cancelBtn.style.background = '#333';
    cancelBtn.style.border = '1px solid #555';
    cancelBtn.style.color = '#ccc';
    cancelBtn.style.padding = '6px 12px';
    cancelBtn.style.borderRadius = '4px';
    cancelBtn.style.cursor = 'pointer';
    cancelBtn.style.fontSize = '12px';
    cancelBtn.style.alignSelf = 'flex-end';
    cancelBtn.style.marginTop = '5px';
    
    cancelBtn.addEventListener('click', () => {
      cleanup(null);
    });
    modal.appendChild(cancelBtn);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    setTimeout(() => {
      overlay.style.opacity = '1';
    }, 50);

    function cleanup(value) {
      overlay.style.opacity = '0';
      setTimeout(() => {
        if (document.body.contains(overlay)) {
          document.body.removeChild(overlay);
        }
        resolve(value);
      }, 200);
    }
  });
}
