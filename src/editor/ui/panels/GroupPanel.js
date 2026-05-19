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
  document.getElementById('btn-group-selected')?.addEventListener('click', () => {
    if (state.selectedIndices.size === 0) {
      alert("Select some drones to group.");
      return;
    }
    const parentName = prompt("Enter new Parent Group name:");
    if (!parentName) return;

    // Validate parent name to not contain slashes
    const cleanName = parentName.replace(/\//g, '_');

    for (const idx of state.selectedIndices) {
      const current = state.particleGroups[idx] || 'Default';
      state.particleGroups[idx] = cleanName + '/' + current;
    }
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
        
        nameSpan.ondblclick = (e) => {
          e.stopPropagation();
          const newName = prompt(`Rename group "${name}":`, name);
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
            
            // Update all steps
            if (state.steps) {
              for (const step of state.steps) {
                for (let i = 0; i < step.particleGroups.length; i++) {
                  if (step.particleGroups[i] === oldGroup) {
                    step.particleGroups[i] = newGroup;
                  } else if (step.particleGroups[i] && step.particleGroups[i].startsWith(oldGroup + '/')) {
                    step.particleGroups[i] = step.particleGroups[i].replace(oldGroup + '/', newGroup + '/');
                  }
                }
              }
            }
            
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
