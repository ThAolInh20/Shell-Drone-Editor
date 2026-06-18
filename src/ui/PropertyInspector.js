import { t } from '../config/lang/i18n.js';

export class PropertyInspector {
  constructor(container, onUpdate, presetOptions = ['random']) {
    this.container = container;
    this.onUpdate = onUpdate;
    this.presetOptions = presetOptions;
    this.selectedEvent = null;
    this.collapsedGroups = {}; // Keep track of open/closed states

    this.container.style.position = 'relative';
    this.container.style.width = '320px';
    this.container.style.minWidth = '320px';
    this.container.style.flexShrink = '0';
    this.container.style.height = '100%';
    this.container.style.background = 'rgba(15, 20, 25, 0.95)';
    this.container.style.borderLeft = '1px solid rgba(255, 255, 255, 0.1)';
    this.container.style.boxShadow = '-4px 0 16px rgba(0,0,0,0.5)';
    this.container.style.padding = '15px';
    this.container.style.boxSizing = 'border-box';
    this.container.style.color = '#fff';
    this.container.style.fontFamily = 'monospace';
    this.container.style.overflowY = 'auto';
    this.container.style.display = 'none';
    this.container.style.zIndex = '1001';

    this.debounceTimeout = null;
    this.isEditing = false;

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

  triggerUpdate(action) {
    if (action === 'beforeChange') {
      if (!this.isEditing) {
        this.onUpdate('beforeChange');
        this.isEditing = true;
      }
      return;
    }

    if (this.debounceTimeout) clearTimeout(this.debounceTimeout);
    this.debounceTimeout = setTimeout(() => {
      this.onUpdate();
      this.debounceTimeout = null;
    }, 250);
  }

  getSchema() {
    const isCometPreset = (event) => {
      return (event.preset && (event.preset.type === 'comet_cluster' || event.preset.type === 'comet')) 
          || (typeof event.preset === 'string' && (event.preset.startsWith('comet_cluster') || event.preset.includes('comet')));
    };

    return {
      audio: [
        {
          groupKey: 'audioSettings',
          fields: [
            { name: 'time', labelKey: 'time', type: 'number', step: '0.1' },
            { name: 'volume', labelKey: 'volume', type: 'number', step: '0.1' },
            { name: 'url', labelKey: 'url', type: 'text', span: 2 }
          ]
        }
      ],
      event: [
        {
          groupKey: 'coreSettings',
          fields: [
            { name: 'time', labelKey: 'time', type: 'number', step: '0.1' },
            { name: 'type', labelKey: 'type', type: 'select', options: ['single', 'sequence', 'cometsequence', 'finale'] },
            { name: 'pattern', labelKey: 'pattern', type: 'select', options: ['random', 'sweep-left', 'sweep-right', 'converge', 'diverge', 'zigzag', 'fan', 'continuous', 'fan-sweep-left', 'fan-sweep-right', 'fan-sweep-continuous', 'fan-burst'], span: 2 },
            { name: 'preset', labelKey: 'preset', type: 'select', options: this.presetOptions, span: 2 },
            { name: 'count', labelKey: 'count', type: 'number', step: '1' },
            { name: 'duration', labelKey: 'duration', type: 'number', step: '0.1' },
            { name: 'sectorId', labelKey: 'sectorId', type: 'select', options: ['left', 'center', 'right', ''] }
          ]
        },
        {
          groupKey: 'cometConfig',
          visibleIf: (event) => event.type === 'cometsequence' || (event.type === 'single' && isCometPreset(event)),
          fields: [
            { name: 'angle', labelKey: 'angle', type: 'angle' }
          ]
        },
        {
          groupKey: 'visualEffects',
          fields: [
            { name: 'color', labelKey: 'color', type: 'color-badges' },
            { name: 'shellSize', labelKey: 'shellSize', type: 'number', step: '0.1' },
            { name: 'pistil', labelKey: 'pistil', type: 'checkbox' },
            { name: 'instantBurst', labelKey: 'instantBurst', type: 'checkbox' },
            { name: 'strobe', labelKey: 'strobe', type: 'checkbox' },
            { name: 'crackle', labelKey: 'crackle', type: 'checkbox' }
          ]
        },
        {
          groupKey: 'geometryOffsets',
          fields: [
            { name: 'ratioX', labelKey: 'ratioX', type: 'number', step: '0.05' },
            { name: 'ratioY', labelKey: 'ratioY', type: 'number', step: '0.05' },
            { name: 'x1', labelKey: 'x1', type: 'number', step: '0.1' },
            { name: 'x2', labelKey: 'x2', type: 'number', step: '0.1' },
            { name: 'y1', labelKey: 'y1', type: 'number', step: '0.1' },
            { name: 'y2', labelKey: 'y2', type: 'number', step: '0.1' }
          ]
        }
      ]
    };
  }

  render() {
    this.container.innerHTML = `<h3 class="inspector-title">${t('editor.inspector.title')}</h3>`;
    if (!this.selectedEvent) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'inspector-empty';
      emptyMsg.textContent = t('editor.inspector.empty');
      this.container.appendChild(emptyMsg);
      return;
    }

    // Default sectorId to 'center' if undefined for non-audio
    if (this.selectedEvent.type !== 'audio' && this.selectedEvent.sectorId === undefined) {
      this.selectedEvent.sectorId = 'center';
    }

    const typeKey = this.selectedEvent.type === 'audio' ? 'audio' : 'event';
    const groups = this.getSchema()[typeKey];

    groups.forEach(group => {
      // Check visibility condition
      if (group.visibleIf && !group.visibleIf(this.selectedEvent)) {
        return;
      }

      const accordion = document.createElement('div');
      accordion.className = 'inspector-accordion';

      const header = document.createElement('div');
      const isCollapsed = this.collapsedGroups[group.groupKey] === true;
      header.className = `inspector-accordion-header ${!isCollapsed ? 'active' : ''}`;
      header.innerHTML = `<span>${t(`editor.inspector.groups.${group.groupKey}`)}</span><span>${isCollapsed ? '▶' : '▼'}</span>`;
      
      header.addEventListener('click', () => {
        this.collapsedGroups[group.groupKey] = !isCollapsed;
        this.render();
      });

      accordion.appendChild(header);

      if (!isCollapsed) {
        const content = document.createElement('div');
        content.className = 'inspector-accordion-content';

        group.fields.forEach(field => {
          const fieldWrapper = document.createElement('div');
          if (field.span === 2) {
            fieldWrapper.className = 'inspector-field-span-2';
          }

          if (field.type === 'color-badges') {
            this.renderColorBadges(fieldWrapper);
          } else if (field.type === 'angle') {
            this.renderAngleDial(fieldWrapper, field);
          } else if (field.type === 'checkbox') {
            this.renderCheckbox(fieldWrapper, field);
          } else {
            this.renderStandardInput(fieldWrapper, field);
          }

          content.appendChild(fieldWrapper);
        });

        accordion.appendChild(content);
      }

      this.container.appendChild(accordion);
    });

    // Delete Button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'inspector-delete-btn';
    deleteBtn.textContent = t('editor.inspector.deleteBtn');
    deleteBtn.addEventListener('click', () => {
      this.onUpdate('beforeChange');
      this.selectedEvent._deleted = true;
      this.onUpdate();
      this.hide();
    });
    this.container.appendChild(deleteBtn);
  }

  renderStandardInput(parent, field) {
    const label = document.createElement('label');
    label.className = 'inspector-label';
    label.textContent = t(`editor.inspector.fields.${field.labelKey}`);

    let input;
    if (field.type === 'select') {
      input = document.createElement('select');
      input.className = 'inspector-input';
      field.options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        const lookupKey = opt === '' ? 'empty' : opt;
        const translationKey = `editor.inspector.options.${field.name}.${lookupKey}`;
        const translated = t(translationKey);
        option.textContent = translated === translationKey ? (opt || 'random') : translated;
        input.appendChild(option);
      });
      input.value = this.selectedEvent[field.name] !== undefined ? this.selectedEvent[field.name] : '';
    } else {
      input = document.createElement('input');
      input.className = 'inspector-input';
      input.type = field.type;
      if (field.step) input.step = field.step;
      input.value = this.selectedEvent[field.name] !== undefined ? this.selectedEvent[field.name] : '';
    }

    input.addEventListener('focus', () => {
      this.isEditing = true;
    });

    input.addEventListener('blur', () => {
      this.isEditing = false;
      this.onUpdate(); // Final sync on blur
    });

    input.addEventListener('input', (e) => {
      let val = e.target.value;
      if (field.type === 'number') {
        val = val === '' ? undefined : parseFloat(val);
      }
      
      this.triggerUpdate('beforeChange');

      if (val === '' || val === undefined) {
        if (field.name === 'sectorId') {
          this.selectedEvent[field.name] = '';
        } else {
          delete this.selectedEvent[field.name];
        }
      } else {
        this.selectedEvent[field.name] = val;
      }

      this.triggerUpdate();
    });

    // Render loop helper to re-render inspector on type update
    input.addEventListener('change', () => {
      if (field.type === 'select') {
        this.render();
      }
    });

    parent.appendChild(label);
    parent.appendChild(input);
  }

  renderCheckbox(parent, field) {
    const container = document.createElement('label');
    container.className = 'inspector-checkbox-container';

    const input = document.createElement('input');
    input.className = 'inspector-checkbox';
    input.type = 'checkbox';
    input.checked = !!this.selectedEvent[field.name];

    input.addEventListener('change', (e) => {
      this.onUpdate('beforeChange');
      if (e.target.checked) {
        this.selectedEvent[field.name] = true;
      } else {
        delete this.selectedEvent[field.name];
      }
      this.onUpdate();
    });

    container.appendChild(input);
    const span = document.createElement('span');
    span.textContent = t(`editor.inspector.fields.${field.labelKey}`);
    container.appendChild(span);
    parent.appendChild(container);
  }

  renderColorBadges(parent) {
    const label = document.createElement('label');
    label.className = 'inspector-label';
    label.textContent = t('editor.inspector.fields.color');
    parent.appendChild(label);

    const COLOR_MAP = {
      'red': '#ff3333',
      'gold': '#ffd700',
      'white': '#ffffff',
      'blue': '#00bfff',
      'green': '#00ff00',
      'purple': '#8a2be2',
      'pink': '#ff69b4'
    };

    const container = document.createElement('div');
    container.className = 'color-badge-container';

    let activeKey = null;
    const currentColor = this.selectedEvent.color;
    if (currentColor) {
      const cLower = currentColor.toLowerCase();
      activeKey = Object.keys(COLOR_MAP).find(k => k === cLower || COLOR_MAP[k] === cLower);
    }

    // Render default preset circles
    Object.keys(COLOR_MAP).forEach(key => {
      const badge = document.createElement('div');
      badge.className = `color-badge ${activeKey === key ? 'active' : ''}`;
      badge.style.backgroundColor = COLOR_MAP[key];
      badge.title = t(`editor.inspector.colors.${key}`) || key;

      badge.addEventListener('click', () => {
        this.onUpdate('beforeChange');
        this.selectedEvent.color = key;
        this.onUpdate();
        this.render(); // Redraw selection outline
      });

      container.appendChild(badge);
    });

    // Custom hex color input picker
    const customWrapper = document.createElement('div');
    customWrapper.className = 'color-custom-wrapper';

    const customCb = document.createElement('input');
    customCb.type = 'checkbox';
    customCb.className = 'inspector-checkbox';
    customCb.id = 'inspector-custom-color-cb';
    customCb.checked = currentColor !== undefined;

    const customInput = document.createElement('input');
    customInput.type = 'color';
    customInput.className = 'color-custom-input';
    customInput.disabled = !customCb.checked;

    let initialHex = '#ffffff';
    if (currentColor) {
      const cLower = currentColor.toLowerCase();
      if (COLOR_MAP[cLower]) {
        initialHex = COLOR_MAP[cLower];
      } else if (currentColor.startsWith('#')) {
        initialHex = currentColor;
      }
    }
    customInput.value = initialHex;

    customCb.addEventListener('change', (e) => {
      this.onUpdate('beforeChange');
      if (e.target.checked) {
        customInput.disabled = false;
        this.selectedEvent.color = customInput.value;
      } else {
        customInput.disabled = true;
        delete this.selectedEvent.color;
      }
      this.onUpdate();
      this.render();
    });

    customInput.addEventListener('input', (e) => {
      if (customCb.checked) {
        this.triggerUpdate('beforeChange');
        this.selectedEvent.color = e.target.value;
        this.triggerUpdate();
      }
    });

    customInput.addEventListener('change', () => {
      this.render();
    });

    const customLabel = document.createElement('label');
    customLabel.htmlFor = 'inspector-custom-color-cb';
    customLabel.textContent = t('editor.inspector.fields.customColor');
    customLabel.style.fontSize = '10px';
    customLabel.style.color = '#aaa';
    customLabel.style.cursor = 'pointer';

    customWrapper.appendChild(customCb);
    customWrapper.appendChild(customLabel);
    customWrapper.appendChild(customInput);
    container.appendChild(customWrapper);

    parent.appendChild(container);
  }

  renderAngleDial(parent, field) {
    const label = document.createElement('label');
    label.className = 'inspector-label';
    label.textContent = t(`editor.inspector.fields.${field.labelKey}`);
    parent.appendChild(label);

    const container = document.createElement('div');
    container.className = 'angle-dial-container';

    // The angle dial circle
    const dial = document.createElement('div');
    dial.className = 'angle-dial';

    const dialLine = document.createElement('div');
    dialLine.className = 'angle-dial-line';
    dial.appendChild(dialLine);

    const dialCenter = document.createElement('div');
    dialCenter.className = 'angle-dial-center';
    dial.appendChild(dialCenter);

    // Numeric input next to dial
    const angleInput = document.createElement('input');
    angleInput.className = 'inspector-input';
    angleInput.type = 'number';
    angleInput.style.width = '70px';
    angleInput.min = '10';
    angleInput.max = '170';

    const rad = this.selectedEvent.angle;
    // Map radian to degree input: 90 - (rad * 180 / PI)
    const currentDegVal = (rad !== undefined && rad !== null) ? (90 - Math.round(rad * 180 / Math.PI)) : 90;
    angleInput.value = currentDegVal;

    // Position dial pointer initially
    const currentRad = (rad !== undefined && rad !== null) ? rad : 0;
    dialLine.style.transform = `translate(-50%, -50%) rotate(${currentRad - Math.PI/2}rad)`;

    // Dial mouse/pointer interaction
    dial.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const rect = dial.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const updateAngle = (pe) => {
        const dx = pe.clientX - centerX;
        const dy = pe.clientY - centerY;
        
        // Deflection angle from vertical (straight up is 0 rad)
        let deflectionRad = Math.atan2(dx, -dy);
        const maxLimitRad = 80 * Math.PI / 180;
        deflectionRad = Math.min(maxLimitRad, Math.max(-maxLimitRad, deflectionRad));

        this.onUpdate('beforeChange');
        this.selectedEvent.angle = deflectionRad;
        this.onUpdate();

        dialLine.style.transform = `translate(-50%, -50%) rotate(${deflectionRad - Math.PI/2}rad)`;
        angleInput.value = Math.round(90 - (deflectionRad * 180 / Math.PI));
      };

      const onPointerMove = (pe) => {
        updateAngle(pe);
      };

      const onPointerUp = () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        this.isEditing = false;
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      this.isEditing = true;
      updateAngle(e);
    });

    // Handle input change manually
    angleInput.addEventListener('input', (e) => {
      let val = e.target.value;
      if (val === '') return;
      val = parseFloat(val);

      this.triggerUpdate('beforeChange');
      // Convert degrees to deflection radians: (90 - val) * PI / 180
      const offsetDeg = Math.min(80, Math.max(-80, 90 - val));
      const deflectionRad = (offsetDeg * Math.PI) / 180;

      this.selectedEvent.angle = deflectionRad;
      dialLine.style.transform = `translate(-50%, -50%) rotate(${deflectionRad - Math.PI/2}rad)`;
      this.triggerUpdate();
    });

    angleInput.addEventListener('blur', () => {
      this.isEditing = false;
      this.onUpdate();
    });

    container.appendChild(dial);
    container.appendChild(angleInput);
    parent.appendChild(container);
  }
}
