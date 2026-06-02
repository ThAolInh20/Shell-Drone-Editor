import { t } from '../../../config/lang/i18n.js';

export function setupTimelinePanel(state) {
  // Translate initial UI components
  const playBtn = document.getElementById('btn-play');
  if (playBtn) {
    playBtn.textContent = state.isPlaying ? t('editor.timelinePanel.pauseLabel') : t('editor.timelinePanel.playLabel');
    playBtn.style.backgroundColor = state.isPlaying ? '#f44336' : '#4CAF50';
  }
  const addStepBtn = document.getElementById('btn-add-step');
  if (addStepBtn) {
    addStepBtn.textContent = t('editor.timelinePanel.addStepBtn') || 'Add Step +';
  }

  document.getElementById('btn-add-step')?.addEventListener('click', () => {
    state.addStep();
  });

  document.getElementById('btn-play')?.addEventListener('click', () => {
    state.isPlaying = !state.isPlaying;
    if (state.isPlaying) {
      document.getElementById('btn-play').textContent = t('editor.timelinePanel.pauseLabel');
      document.getElementById('btn-play').style.backgroundColor = '#f44336';
      // If we are at the end, restart
      const maxTime = state.getMaxPlaybackTime();
      if (state.playbackTime >= maxTime) {
        state.playbackTime = 0;
      }
    } else {
      document.getElementById('btn-play').textContent = t('editor.timelinePanel.playLabel');
      document.getElementById('btn-play').style.backgroundColor = '#4CAF50';
      // Snap to current step when paused
      if (state.steps && state.steps[state.currentStepIndex]) {
        state.playbackTime = state.steps[state.currentStepIndex].time;
      }
    }
  });

  const playbackTimeEl = document.getElementById('playback-time');
  if (playbackTimeEl) {
    let groupSelect = document.getElementById('ui-active-group-timeline');
    if (!groupSelect) {
      const label = document.createElement('label');
      label.textContent = t('editor.timelinePanel.activeGroupLabel');
      label.style.marginLeft = '20px';
      label.style.marginRight = '5px';
      label.style.fontSize = '12px';
      label.style.color = '#aaa';
      label.style.fontWeight = 'bold';
      
      groupSelect = document.createElement('select');
      groupSelect.id = 'ui-active-group-timeline';
      groupSelect.style.background = '#222';
      groupSelect.style.color = '#fff';
      groupSelect.style.border = '1px solid #444';
      groupSelect.style.padding = '4px 8px';
      groupSelect.style.borderRadius = '4px';
      groupSelect.style.fontSize = '12px';
      groupSelect.style.cursor = 'pointer';
      groupSelect.style.outline = 'none';
      
      groupSelect.addEventListener('pointerdown', (e) => e.stopPropagation());
      groupSelect.addEventListener('mousedown', (e) => e.stopPropagation());
      groupSelect.addEventListener('keydown', (e) => e.stopPropagation());
      
      groupSelect.addEventListener('change', (e) => {
        state.setActiveGroup(e.target.value);
      });
      
      playbackTimeEl.parentNode.appendChild(label);
      playbackTimeEl.parentNode.appendChild(groupSelect);
    }
  }

  state.subscribe(() => {
    updateGroupTimelineDropdown(state);
    renderTimeline(state);
  });
}

function updateGroupTimelineDropdown(state) {
  const groupSelect = document.getElementById('ui-active-group-timeline');
  if (!groupSelect) return;
  
  const currentVal = state.activeGroup;
  const groups = ['Default', ...state.getUniqueGroups()];
  
  // Only rebuild if the options have actually changed to avoid losing focus/selection during simple updates
  const existingOptions = Array.from(groupSelect.options).map(o => o.value);
  const newOptions = groups;
  
  const isIdentical = existingOptions.length === newOptions.length && existingOptions.every((val, idx) => val === newOptions[idx]);
  
  if (!isIdentical) {
    groupSelect.innerHTML = '';
    groups.forEach(g => {
      const opt = document.createElement('option');
      opt.value = g;
      opt.textContent = g === 'Default' ? t('editor.timelinePanel.defaultGroup') : t('editor.timelinePanel.groupLabel', { name: g });
      groupSelect.appendChild(opt);
    });
  }
  
  if (groupSelect.value !== currentVal) {
    groupSelect.value = currentVal;
  }
}

function renderTimeline(state) {
  const container = document.getElementById('steps-container');
  if (!container) return;
  container.innerHTML = '';

  if (!state.steps || state.steps.length === 0) {
    const noStepsDiv = document.createElement('div');
    noStepsDiv.textContent = t('editor.timelinePanel.noSteps');
    noStepsDiv.style.color = '#888';
    noStepsDiv.style.fontSize = '12px';
    noStepsDiv.style.padding = '10px';
    container.appendChild(noStepsDiv);
    return;
  }

  state.steps.forEach((step, index) => {
    const card = document.createElement('div');
    card.style.minWidth = '80px';
    card.style.height = '40px';
    card.style.backgroundColor = index === state.currentStepIndex ? '#3498db' : '#333';
    card.style.border = index === state.currentStepIndex ? '2px solid #fff' : '1px solid #444';
    card.style.borderRadius = '4px';
    card.style.padding = '8px';
    card.style.cursor = 'pointer';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.justifyContent = 'flex-start';
    card.style.gap = '4px';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.fontSize = '12px';
    header.style.fontWeight = 'bold';

    const title = document.createElement('span');
    title.textContent = t('editor.timelinePanel.stepLabel', { index: index + 1 });

    const delBtn = document.createElement('span');
    delBtn.textContent = '×';
    delBtn.style.color = '#ffcccb';
    delBtn.onclick = (e) => {
      e.stopPropagation();
      if (confirm(t('editor.timelinePanel.confirmDeleteStep', { index: index + 1 }))) {
        state.removeStep(index);
      }
    };

    header.appendChild(title);
    if (state.steps.length > 1) {
      header.appendChild(delBtn);
    }

    const timeDiv = document.createElement('div');
    timeDiv.textContent = `${step.time} ms`;
    timeDiv.style.fontSize = '11px';
    timeDiv.style.color = index === state.currentStepIndex ? '#fff' : '#aaa';

    card.onclick = () => {
      if (!state.isPlaying) {
        state.playbackTime = step.time;
        state.loadStep(index);
      }
    };

    card.appendChild(header);
    card.appendChild(timeDiv);
    container.appendChild(card);
  });
}
