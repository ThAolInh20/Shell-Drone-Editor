export class PropertyInspector {
  constructor(container, onUpdate, presetOptions = ['random']) {
    this.container = container;
    this.onUpdate = onUpdate;
    this.presetOptions = presetOptions;
    this.selectedEvent = null;
    
    this.container.style.position = 'fixed';
    this.container.style.top = '0';
    this.container.style.right = '0';
    this.container.style.width = '320px';
    this.container.style.height = '100vh';
    this.container.style.background = 'rgba(20, 25, 30, 0.95)';
    this.container.style.borderLeft = '1px solid #444';
    this.container.style.padding = '15px';
    this.container.style.boxSizing = 'border-box';
    this.container.style.color = '#fff';
    this.container.style.fontFamily = 'monospace';
    this.container.style.overflowY = 'auto';
    this.container.style.display = 'none';
    this.container.style.zIndex = '1001';

    this.render();
  }

  show(event) {
    this.selectedEvent = event;
    this.container.style.display = 'block';
    this.render();
  }

  hide() {
    this.selectedEvent = null;
    this.container.style.display = 'none';
  }

  render() {
    this.container.innerHTML = '<h3>Property Inspector</h3>';
    if (!this.selectedEvent) {
      this.container.innerHTML += '<p>No sequence selected.</p>';
      return;
    }

    const form = document.createElement('div');
    form.style.display = 'grid';
    form.style.gridTemplateColumns = '1fr 1fr';
    form.style.gap = '6px';
    form.style.alignItems = 'end';

    const fields = [
      { name: 'time', type: 'number', step: '0.1' },
      { name: 'type', type: 'select', options: ['sequence', 'cometsequence', 'finale'] },
      { name: 'pattern', type: 'select', options: ['random', 'sweep-left', 'sweep-right', 'converge', 'diverge', 'zigzag', 'fan', 'continuous', 'fan-sweep-left', 'fan-sweep-right', 'fan-sweep-continuous', 'fan-burst'], span: 2 },
      { name: 'preset', type: 'select', options: this.presetOptions, span: 2 },
      { name: 'count', type: 'number', step: '1' },
      { name: 'duration', type: 'number', step: '0.1' },
      { name: 'sectorId', type: 'select', options: ['left', 'center', 'right', ''] },
      { name: 'shellSize', type: 'number', step: '0.1' },
      { name: 'color', type: 'text', span: 2 },
      { name: 'ratioX', type: 'number', step: '0.05' },
      { name: 'ratioY', type: 'number', step: '0.05' },
      { name: 'ratioZ', type: 'number', step: '0.05' },
      { name: 'instantBurst', type: 'checkbox' },
      { name: 'x1', type: 'number', step: '0.1' },
      { name: 'x2', type: 'number', step: '0.1' },
      { name: 'y1', type: 'number', step: '0.1' },
      { name: 'y2', type: 'number', step: '0.1' },
      { name: 'pistil', type: 'checkbox', span: 2 },
    ];

    fields.forEach(field => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.flexDirection = field.type === 'checkbox' ? 'row' : 'column';
      if (field.type === 'checkbox') {
        row.style.alignItems = 'center';
        row.style.gap = '8px';
      }
      if (field.span === 2) {
        row.style.gridColumn = 'span 2';
      }
      
      const label = document.createElement('label');
      label.textContent = field.name;
      label.style.fontSize = '11px';
      label.style.marginBottom = field.type === 'checkbox' ? '0' : '2px';
      label.style.color = '#aaa';

      let input;
      if (field.type === 'select') {
        input = document.createElement('select');
        field.options.forEach(opt => {
          const option = document.createElement('option');
          option.value = opt;
          option.textContent = opt || 'none';
          input.appendChild(option);
        });
        input.value = this.selectedEvent[field.name] || '';
      } else if (field.type === 'checkbox') {
        input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = !!this.selectedEvent[field.name];
        input.style.margin = '0';
      } else {
        input = document.createElement('input');
        input.type = field.type;
        if (field.step) input.step = field.step;
        input.value = this.selectedEvent[field.name] !== undefined ? this.selectedEvent[field.name] : '';
      }

      input.style.padding = '3px';
      input.style.fontSize = '12px';
      input.style.background = '#222';
      input.style.color = '#fff';
      input.style.border = '1px solid #555';
      input.style.width = field.type === 'checkbox' ? 'auto' : '100%';
      input.style.boxSizing = 'border-box';

      input.addEventListener('change', (e) => {
        let val = field.type === 'checkbox' ? e.target.checked : e.target.value;
        if (field.type === 'number') val = val === '' ? undefined : parseFloat(val);
        if (val === '' || val === undefined) {
          delete this.selectedEvent[field.name];
        } else {
          this.selectedEvent[field.name] = val;
        }
        this.onUpdate(); // Trigger re-render of timeline
      });

      if (field.type === 'checkbox') {
        row.appendChild(input);
        row.appendChild(label);
      } else {
        row.appendChild(label);
        row.appendChild(input);
      }
      form.appendChild(row);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete Sequence';
    deleteBtn.style.gridColumn = 'span 2';
    deleteBtn.style.marginTop = '10px';
    deleteBtn.style.background = '#d32f2f';
    deleteBtn.style.color = 'white';
    deleteBtn.style.border = 'none';
    deleteBtn.style.padding = '6px';
    deleteBtn.style.cursor = 'pointer';
    deleteBtn.addEventListener('click', () => {
      this.selectedEvent._deleted = true;
      this.onUpdate();
      this.hide();
    });
    form.appendChild(deleteBtn);

    this.container.appendChild(form);
  }
}
