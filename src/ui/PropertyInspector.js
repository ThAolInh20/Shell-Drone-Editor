export class PropertyInspector {
  constructor(container, onUpdate, presetOptions = ['random']) {
    this.container = container;
    this.onUpdate = onUpdate;
    this.presetOptions = presetOptions;
    this.selectedEvent = null;

    this.container.style.position = 'relative';
    this.container.style.width = '320px';
    this.container.style.minWidth = '320px';
    this.container.style.flexShrink = '0';
    this.container.style.height = '100%';
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

    // Mặc định sectorId là 'center' nếu sự kiện chưa được thiết lập thuộc tính này
    if (this.selectedEvent.type !== 'audio' && this.selectedEvent.sectorId === undefined) {
      this.selectedEvent.sectorId = 'center';
    }

    const form = document.createElement('div');
    form.style.display = 'grid';
    form.style.gridTemplateColumns = '1fr 1fr';
    form.style.gap = '6px';
    form.style.alignItems = 'end';

    let fields = [];
    if (this.selectedEvent.type === 'audio') {
      fields = [
        { name: 'time', type: 'number', step: '0.1' },
        { name: 'volume', type: 'number', step: '0.1' },
        { name: 'url', type: 'text', span: 2 }
      ];
    } else {
      fields = [
        { name: 'time', type: 'number', step: '0.1' },
        { name: 'type', type: 'select', options: ['single', 'sequence', 'cometsequence', 'finale'] },
        { name: 'pattern', type: 'select', options: ['random', 'sweep-left', 'sweep-right', 'converge', 'diverge', 'zigzag', 'fan', 'continuous', 'fan-sweep-left', 'fan-sweep-right', 'fan-sweep-continuous', 'fan-burst'], span: 2 }
      ];

      const isCometPreset = (this.selectedEvent.preset && (this.selectedEvent.preset.type === 'comet_cluster' || this.selectedEvent.preset.type === 'comet')) 
                         || (typeof this.selectedEvent.preset === 'string' && (this.selectedEvent.preset.startsWith('comet_cluster') || this.selectedEvent.preset.includes('comet')));
      if (this.selectedEvent.type === 'cometsequence' || (this.selectedEvent.type === 'single' && isCometPreset)) {
        fields.push({ name: 'angle', type: 'number', step: '1', span: 2 });
      }

      fields.push(
        { name: 'preset', type: 'select', options: this.presetOptions, span: 2 },
        { name: 'count', type: 'number', step: '1' },
        { name: 'duration', type: 'number', step: '0.1' },
        { name: 'sectorId', type: 'select', options: ['left', 'center', 'right', ''] },

        { name: 'shellSize', type: 'number', step: '0.1' },
        { name: 'color', type: 'text', span: 2 },
        { name: 'pistil', type: 'checkbox' },
        { name: 'instantBurst', type: 'checkbox' },
        { name: 'strobe', type: 'checkbox' },
        { name: 'crackle', type: 'checkbox' },
        { name: 'ratioX', type: 'number', step: '0.05' },
        { name: 'ratioY', type: 'number', step: '0.05' },
        { name: 'x1', type: 'number', step: '0.1' },
        { name: 'x2', type: 'number', step: '0.1' },
        { name: 'y1', type: 'number', step: '0.1' },
        { name: 'y2', type: 'number', step: '0.1' }
      );
    }

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

      if (field.name === 'color') {
        row.style.gridColumn = 'span 2';
        row.style.flexDirection = 'row';
        row.style.alignItems = 'center';
        row.style.justifyContent = 'space-between';
        row.style.gap = '10px';
        row.style.marginTop = '4px';
        row.style.marginBottom = '4px';

        const leftSide = document.createElement('div');
        leftSide.style.display = 'flex';
        leftSide.style.alignItems = 'center';
        leftSide.style.gap = '6px';

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.id = 'inspector-use-custom-color';
        cb.checked = this.selectedEvent.color !== undefined;

        const lbl = document.createElement('label');
        lbl.htmlFor = 'inspector-use-custom-color';
        lbl.textContent = 'Custom Color';
        lbl.style.fontSize = '11px';
        lbl.style.color = '#aaa';
        lbl.style.cursor = 'pointer';

        leftSide.appendChild(cb);
        leftSide.appendChild(lbl);

        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.style.border = '1px solid #555';
        colorInput.style.background = 'none';
        colorInput.style.padding = '0';
        colorInput.style.width = '60px';
        colorInput.style.height = '24px';
        colorInput.style.cursor = 'pointer';
        colorInput.style.borderRadius = '4px';

        const COLOR_MAP = {
          'red': '#ff3333',
          'gold': '#ffd700',
          'white': '#ffffff',
          'blue': '#00bfff',
          'green': '#00ff00',
          'purple': '#8a2be2',
          'pink': '#ff69b4'
        };
        let initialHex = '#ffffff';
        if (this.selectedEvent.color) {
          const cLower = this.selectedEvent.color.toLowerCase();
          if (COLOR_MAP[cLower]) {
            initialHex = COLOR_MAP[cLower];
          } else if (this.selectedEvent.color.startsWith('#')) {
            initialHex = this.selectedEvent.color;
          }
        }
        colorInput.value = initialHex;
        colorInput.disabled = !cb.checked;
        if (colorInput.disabled) {
          colorInput.style.opacity = '0.4';
          colorInput.style.cursor = 'not-allowed';
        }

        cb.addEventListener('change', (e) => {
          this.onUpdate('beforeChange');
          if (e.target.checked) {
            colorInput.disabled = false;
            colorInput.style.opacity = '1';
            colorInput.style.cursor = 'pointer';
            this.selectedEvent.color = colorInput.value;
          } else {
            colorInput.disabled = true;
            colorInput.style.opacity = '0.4';
            colorInput.style.cursor = 'not-allowed';
            delete this.selectedEvent.color;
          }
          this.onUpdate();
        });

        colorInput.addEventListener('change', (e) => {
          if (cb.checked) {
            this.onUpdate('beforeChange');
            this.selectedEvent.color = e.target.value;
            this.onUpdate();
          }
        });

        row.appendChild(leftSide);
        row.appendChild(colorInput);
        form.appendChild(row);
        return;
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
          option.textContent = opt || 'random';
          input.appendChild(option);
        });
        input.value = this.selectedEvent[field.name] !== undefined ? this.selectedEvent[field.name] : '';
      } else if (field.type === 'checkbox') {
        input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = !!this.selectedEvent[field.name];
        input.style.margin = '0';
      } else {
        input = document.createElement('input');
        input.type = field.type;
        if (field.step) input.step = field.step;
        if (field.name === 'angle') {
          const rad = this.selectedEvent.angle;
          input.value = (rad !== undefined && rad !== null) ? (90 - Math.round(rad * 180 / Math.PI)) : '';
        } else {
          input.value = this.selectedEvent[field.name] !== undefined ? this.selectedEvent[field.name] : '';
        }
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
        this.onUpdate('beforeChange');
        if (val === '' || val === undefined || (field.type === 'checkbox' && !val)) {
          if (field.name === 'sectorId' && val === '') {
            this.selectedEvent[field.name] = '';
          } else {
            delete this.selectedEvent[field.name];
          }
        } else {
          if (field.name === 'angle') {
            const offsetDeg = Math.min(80, Math.max(-80, 90 - val));
            this.selectedEvent.angle = (offsetDeg * Math.PI) / 180;
          } else {
            this.selectedEvent[field.name] = val;
          }
        }
        this.onUpdate(); // Trigger re-render of timeline
        this.render(); // Re-render the inspector to display new/hidden fields
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
      this.onUpdate('beforeChange');
      this.selectedEvent._deleted = true;
      this.onUpdate();
      this.hide();
    });
    form.appendChild(deleteBtn);

    this.container.appendChild(form);
  }
}
