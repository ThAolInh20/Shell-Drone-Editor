export function renderGroupPanel() {
  return `
    <div class="panel-section">
      <h3>Groups</h3>
      <div style="display: flex; gap: 5px; margin-bottom: 10px;">
        <button class="btn btn-secondary" id="btn-group-selected" style="margin-bottom: 0; padding: 5px; flex: 1;">Group Selected</button>
        <button class="btn btn-secondary" id="btn-ungroup" style="margin-bottom: 0; padding: 5px; flex: 1;">Ungroup</button>
      </div>
      <div id="group-list" style="max-height: 150px; overflow-y: auto; background: #222; border: 1px solid #444; border-radius: 4px; padding: 5px;">
        <!-- Group items injected here -->
      </div>
    </div>
  `;
}

export function setupGroupPanel(state) {
  document.getElementById('btn-group-selected')?.addEventListener('click', async () => {
    if (state.selectedIndices.size === 0) {
      alert("Select some drones to group.");
      return;
    }
    const parentName = await customPrompt("Enter new Parent Group name:");
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

  state.subscribe(() => {
    const groupList = document.getElementById('group-list');
    if (groupList) {
      const groups = state.getUniqueGroups();
      groupList.innerHTML = '';
      groups.forEach(g => {
        const div = document.createElement('div');

        const depth = g.split('/').length - 1;
        const name = g.split('/').pop();

        const nameSpan = document.createElement('span');
        nameSpan.textContent = (depth > 0 ? '↳ ' : '') + name;
        nameSpan.title = "Double click to rename group";
        
        nameSpan.ondblclick = async (e) => {
          e.stopPropagation();
          const newName = await customPrompt(`Rename group "${name}":`, name);
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
        delBtn.addEventListener('mouseover', () => delBtn.style.background = 'rgba(255,0,0,0.2)');
        delBtn.addEventListener('mouseout', () => delBtn.style.background = 'transparent');

        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm(`Are you sure you want to delete group "${name}" and all its drones?`)) {
            state.selectGroup(g, false);
            state.deleteSelected();
          }
        });

        div.appendChild(delBtn);

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
    cancelBtn.textContent = 'Cancel';
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
    okBtn.textContent = 'OK';
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
