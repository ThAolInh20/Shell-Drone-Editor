export function setupTimelinePanel(state) {
  document.getElementById('btn-add-step')?.addEventListener('click', () => {
    state.addStep();
  });

  document.getElementById('btn-play')?.addEventListener('click', () => {
    state.isPlaying = !state.isPlaying;
    if (state.isPlaying) {
      document.getElementById('btn-play').textContent = '⏸ Pause';
      document.getElementById('btn-play').style.backgroundColor = '#f44336';
      // If we are at the end, restart
      const maxTime = state.steps[state.steps.length - 1].time;
      if (state.playbackTime >= maxTime) {
        state.playbackTime = 0;
      }
    } else {
      document.getElementById('btn-play').textContent = '▶ Play';
      document.getElementById('btn-play').style.backgroundColor = '#4CAF50';
      // Snap to current step when paused
      state.playbackTime = state.steps[state.currentStepIndex].time;
    }
  });

  state.subscribe(() => {
    renderTimeline(state);
  });
}

function renderTimeline(state) {
  const container = document.getElementById('steps-container');
  if (!container) return;
  container.innerHTML = '';

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
    title.textContent = `Step ${index + 1}`;

    const delBtn = document.createElement('span');
    delBtn.textContent = '×';
    delBtn.style.color = '#ffcccb';
    delBtn.onclick = (e) => {
      e.stopPropagation();
      if (confirm(`Delete Step ${index + 1}?`)) {
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
