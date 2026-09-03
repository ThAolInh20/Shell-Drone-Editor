import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { sequences } from '../config/sequences/index.js';
import { globalEventBus } from '../core/EventBus.js';
import { t } from '../config/lang/i18n.js';
import {
  SETTINGS_DEFINITION,
  applySetting,
  resetSettings
} from '../config/settings.js';

export class InputSystem {
  constructor(
    camera,
    domElement,
    fireworkSystem = null,
    renderer = null,
    postProcessing = null,
    audioSystem = null
  ) {
    this.controls = new PointerLockControls(
      camera,
      domElement
    );
    this.fireworkSystem = fireworkSystem;
    this.renderer = renderer;
    this.postProcessing = postProcessing;
    this.audioSystem = audioSystem;

    this.settingsContext = {
      renderer: this.renderer,
      postProcessing: this.postProcessing,
      audioSystem: this.audioSystem
    };

    this.paused = false;
    this.selectedPresetKey = 'random';
    this.eventSubscriptions = [];
    
    this.sequenceOptions = sequences;
    this.selectedSequenceKey = sequences.length > 0 ? sequences[0].key : null;
    
    // Movement state
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      shift: false
    };
    this.status = {
      moving: false,
      direction: 'idle',
      looking: false,
      firework: 'none',
      effect: 'none',
      diagnostics: {
        launched: 0,
        bursted: 0,
        shapeFallbacks: 0,
        effectFallbacks: 0,
        warnings: 0,
        lastWarning: 'none'
      }
    };

    this.presetOptions = this.fireworkSystem?.shellPresetFactory?.getPresetMenuEntries?.() ?? [
      { key: 'random', label: 'Random' }
    ];
    
    // Click to lock cursor
    domElement.addEventListener('click', () => {
      if (!this.controls.isLocked && !this.paused) {
        this.controls.lock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement === domElement) {
        this.instructions.style.display = 'none';
        this.updateStatusOverlay();
      } else {
        this.instructions.style.display = '';
      }
    });

    document.addEventListener('mousemove', (event) => this.onMouseMove(event));
    document.addEventListener('keydown', (event) => this.onKeyDown(event));
    document.addEventListener('keyup', (event) => this.onKeyUp(event));

    this.eventSubscriptions.push(
      globalEventBus.on('firework:launch', (detail) => {
        this.status.firework = detail.shellType;
        this.status.effect = detail.effectType;
        this.updateStatusOverlay();
      }),

      globalEventBus.on('firework:burst', (detail) => {
        this.status.firework = detail.shellType;
        this.status.effect = detail.effectType;
        this.updateStatusOverlay();
      }),

      globalEventBus.on('firework:diagnostics', (detail) => {
        this.status.diagnostics = detail;
        this.updateStatusOverlay();
      })
    );
    
    // Instruction overlay
    this.setupInstructions();
    this.setupPauseMenu();
  }
  
  setupInstructions() {
    // Crosshair dot
    const crosshair = document.createElement('div');
    crosshair.style.position = 'absolute';
    crosshair.style.top = '50%';
    crosshair.style.left = '50%';
    crosshair.style.width = '4px';
    crosshair.style.height = '4px';
    crosshair.style.marginLeft = '-2px';
    crosshair.style.marginTop = '-2px';
    crosshair.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
    crosshair.style.borderRadius = '50%';
    crosshair.style.pointerEvents = 'none';
    crosshair.style.zIndex = '100';
    document.body.appendChild(crosshair);

    this.instructions = document.createElement('div');
    this.instructions.style.position = 'absolute';
    this.instructions.style.top = '50%';
    this.instructions.style.width = '100%';
    this.instructions.style.textAlign = 'center';
    this.instructions.style.color = '#fff';
    this.instructions.style.fontFamily = 'monospace';
    this.instructions.style.fontSize = '18px';
    this.instructions.style.pointerEvents = 'none';
    this.instructions.innerHTML = 'Click to Look Around<br/><br/>W A S D to Move (Shift+W/S to fly up/down)<br/><br/>Click while locked to launch the selected firework<br/><br/>Press ESC for the firework menu<br/><br/>Press ENTER to play Demo Show';
    this.instructions.style.textShadow = '0px 0px 5px rgba(0,0,0,1)';
    document.body.appendChild(this.instructions);

    this.statusOverlay = document.createElement('div');
    this.statusOverlay.style.position = 'absolute';
    this.statusOverlay.style.top = '12px';
    this.statusOverlay.style.left = '12px';
    this.statusOverlay.style.padding = '8px 12px';
    this.statusOverlay.style.background = 'rgba(0, 0, 0, 0.55)';
    this.statusOverlay.style.color = '#fff';
    this.statusOverlay.style.fontFamily = 'monospace';
    this.statusOverlay.style.fontSize = '12px';
    this.statusOverlay.style.lineHeight = '1.4';
    this.statusOverlay.style.borderRadius = '8px';
    this.statusOverlay.style.zIndex = '100';
    this.statusOverlay.style.pointerEvents = 'none';
    document.body.appendChild(this.statusOverlay);
    this.updateStatusOverlay();

    this.controls.addEventListener('lock', () => {
      this.instructions.style.display = 'none';
      this.status.looking = false;
      this.updateStatusOverlay();
    });
    this.controls.addEventListener('unlock', () => {
      this.instructions.style.display = this.paused ? 'none' : '';
      this.status.moving = false;
      this.status.direction = 'idle';
      if (this.paused) {
        this.showPauseMenu();
      }
      this.updateStatusOverlay();
    });
  }

  setupPauseMenu() {
    this.pauseOverlay = document.createElement('div');
    this.pauseOverlay.className = 'firework-pause-overlay';
    this.pauseOverlay.style.display = 'none';

    const panel = document.createElement('div');
    panel.className = 'firework-pause-panel';

    const title = document.createElement('div');
    title.className = 'firework-pause-title';
    title.textContent = 'Settings & Controls';

    const description = document.createElement('div');
    description.className = 'firework-pause-description';
    description.textContent = 'Press ESC to resume. Adjust settings below:';

    panel.appendChild(title);
    panel.appendChild(description);

    const categories = {
      graphics: 'Đồ họa & Hậu kỳ',
      audio: 'Âm thanh (Volumes)'
    };

    for (const [catKey, catTitle] of Object.entries(categories)) {
      const section = document.createElement('div');
      section.className = 'settings-section';

      const secHeader = document.createElement('div');
      secHeader.className = 'settings-section-title';
      secHeader.textContent = catTitle;
      section.appendChild(secHeader);

      const catItems = SETTINGS_DEFINITION.filter(
        (s) => s.category === catKey
      );

      for (const item of catItems) {
        const row = document.createElement('div');
        row.className = 'settings-row';

        const saved = localStorage.getItem(`settings_${item.key}`);
        let currentVal = item.default;
        if (saved !== null) {
          currentVal = item.type === 'checkbox'
            ? saved === 'true'
            : (item.type === 'select' ? saved : parseFloat(saved));
        }

        if (item.type === 'slider') {
          const header = document.createElement('div');
          header.className = 'settings-slider-header';

          const labelSpan = document.createElement('span');
          labelSpan.className = 'settings-label';
          labelSpan.textContent = t(`editor.${item.key}`) || item.label;

          const valSpan = document.createElement('span');
          valSpan.className = 'settings-value';
          valSpan.textContent = currentVal.toFixed(2);

          header.appendChild(labelSpan);
          header.appendChild(valSpan);
          row.appendChild(header);

          const slider = document.createElement('input');
          slider.type = 'range';
          slider.className = 'settings-slider';
          slider.min = item.min;
          slider.max = item.max;
          slider.step = item.step;
          slider.value = currentVal;

          slider.addEventListener('input', () => {
            const val = parseFloat(slider.value);
            valSpan.textContent = val.toFixed(2);
            item.apply(val, this.settingsContext);
          });

          slider.addEventListener('change', () => {
            const val = parseFloat(slider.value);
            localStorage.setItem(
              `settings_${item.key}`,
              val.toString()
            );
          });

          row.appendChild(slider);

          item.inputElement = slider;
          item.valueDisplayElement = valSpan;
        } else if (item.type === 'checkbox') {
          const cbLabel = document.createElement('label');
          cbLabel.className = 'settings-checkbox-label';

          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.className = 'settings-checkbox';
          checkbox.checked = currentVal;

          checkbox.addEventListener('change', () => {
            const val = checkbox.checked;
            localStorage.setItem(
              `settings_${item.key}`,
              val.toString()
            );
            item.apply(val, this.settingsContext);
          });

          const labelText = document.createTextNode(' ' + (t(`editor.${item.key}`) || item.label));

          cbLabel.appendChild(checkbox);
          cbLabel.appendChild(labelText);
          row.appendChild(cbLabel);

          item.inputElement = checkbox;
        } else if (item.type === 'select') {
          const header = document.createElement('div');
          header.className = 'settings-slider-header';
          header.style.marginBottom = '6px';

          const labelSpan = document.createElement('span');
          labelSpan.className = 'settings-label';
          labelSpan.textContent = t(`editor.${item.key}`) || item.label;
          header.appendChild(labelSpan);
          row.appendChild(header);

          const select = document.createElement('select');
          select.className = 'firework-pause-select';

          for (const optKey of (item.options || [])) {
            const optionElement = document.createElement('option');
            optionElement.value = optKey;
            optionElement.textContent = t(`editor.graphics${optKey.charAt(0).toUpperCase() + optKey.slice(1)}`) || t(`editor.${optKey}`) || optKey.toUpperCase();
            if (optKey === currentVal) {
              optionElement.selected = true;
            }
            select.appendChild(optionElement);
          }

          select.addEventListener('change', () => {
            const val = select.value;
            localStorage.setItem(
              `settings_${item.key}`,
              val
            );
            item.apply(val, this.settingsContext);
          });

          row.appendChild(select);
          item.inputElement = select;
        }

        section.appendChild(row);
      }

      // Add Quality Select specifically at the bottom of the graphics section
      if (catKey === 'graphics') {
        const row = document.createElement('div');
        row.className = 'settings-row';

        const qLabel = document.createElement('div');
        qLabel.className = 'settings-label';
        qLabel.style.marginBottom = '6px';
        qLabel.textContent = t('editor.graphicsQuality') || 'Graphics Quality';
        row.appendChild(qLabel);

        this.qualitySelect = document.createElement('select');
        this.qualitySelect.className = 'firework-pause-select';

        const qualityOptions = [
          {
            key: 'low',
            label: t('editor.graphicsLow') || 'Low'
          },
          {
            key: 'medium',
            label: t('editor.graphicsMedium') || 'Medium'
          },
          {
            key: 'high',
            label: t('editor.graphicsHigh') || 'High'
          }
        ];

        for (const option of qualityOptions) {
          const optionElement = document.createElement('option');
          optionElement.value = option.key;
          optionElement.textContent = option.label;
          this.qualitySelect.appendChild(optionElement);
        }

        this.qualitySelect.value = localStorage.getItem('graphics_quality') || 'medium';
        this.qualitySelect.addEventListener('change', () => {
          const quality = this.qualitySelect.value;
          localStorage.setItem(
            'graphics_quality',
            quality
          );
          globalEventBus.emit(
            'graphics:quality',
            quality
          );
        });

        row.appendChild(this.qualitySelect);
        section.appendChild(row);
      }

      panel.appendChild(section);
    }

    const buttonRow = document.createElement('div');
    buttonRow.className = 'firework-pause-actions';
    buttonRow.style.gap = '10px';

    this.resumeButton = document.createElement('button');
    this.resumeButton.type = 'button';
    this.resumeButton.className = 'firework-pause-button';
    this.resumeButton.textContent = 'Resume';
    this.resumeButton.addEventListener('click', () => this.resume());

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'firework-pause-button';
    resetBtn.style.backgroundColor = '#d32f2f';
    resetBtn.style.color = '#fff';
    resetBtn.style.boxShadow = '0 8px 20px rgba(211, 47, 47, 0.22)';
    resetBtn.textContent = 'Reset';
    resetBtn.addEventListener('click', () => {
      resetSettings(this.settingsContext);

      for (const item of SETTINGS_DEFINITION) {
        if (item.type === 'slider') {
          item.inputElement.value = item.default;
          item.valueDisplayElement.textContent = item.default.toFixed(2);
        } else if (item.type === 'checkbox') {
          item.inputElement.checked = item.default;
        }
      }
    });

    this.timelineButton = document.createElement('button');
    this.timelineButton.type = 'button';
    this.timelineButton.className = 'firework-pause-button';
    this.timelineButton.textContent = 'Timeline (Ctrl+T)';
    this.timelineButton.style.backgroundColor = '#1976d2';
    this.timelineButton.style.boxShadow = '0 8px 20px rgba(25, 118, 210, 0.22)';
    this.timelineButton.addEventListener('click', () => {
      if (this.timelineEditor) {
        this.timelineEditor.toggle();
      }
    });

    buttonRow.appendChild(resetBtn);
    buttonRow.appendChild(this.timelineButton);
    buttonRow.appendChild(this.resumeButton);
    panel.appendChild(buttonRow);

    const navSection = document.createElement('div');
    navSection.style.marginTop = '20px';
    navSection.style.paddingTop = '16px';
    navSection.style.borderTop = '1px solid rgba(255, 255, 255, 0.12)';
    navSection.style.display = 'flex';
    navSection.style.flexDirection = 'column';
    navSection.style.gap = '10px';

    const navTitle = document.createElement('div');
    navTitle.className = 'firework-pause-label';
    navTitle.style.marginBottom = '4px';
    navTitle.textContent = 'Tools & Editors';

    const navButtons = document.createElement('div');
    navButtons.style.display = 'flex';
    navButtons.style.gap = '10px';

    const btnTimeline = document.createElement('button');
    btnTimeline.type = 'button';
    btnTimeline.className = 'firework-pause-button';
    btnTimeline.style.flex = '1';
    btnTimeline.style.background = 'linear-gradient(180deg, #1e3c72 0%, #2a5298 100%)';
    btnTimeline.style.color = '#fff';
    btnTimeline.style.border = '1px solid rgba(0, 243, 255, 0.3)';
    btnTimeline.style.boxShadow = '0 6px 15px rgba(42, 82, 152, 0.3)';
    btnTimeline.style.fontSize = '13px';
    btnTimeline.style.fontWeight = 'bold';
    btnTimeline.style.padding = '10px 14px';
    btnTimeline.style.borderRadius = '999px';
    btnTimeline.style.cursor = 'pointer';
    btnTimeline.style.transition = 'all 0.3s ease';
    btnTimeline.innerHTML = 'Timeline Editor';
    btnTimeline.addEventListener('mouseover', () => {
      btnTimeline.style.filter = 'brightness(1.15)';
      btnTimeline.style.boxShadow = '0 0 15px rgba(0, 243, 255, 0.4)';
    });
    btnTimeline.addEventListener('mouseout', () => {
      btnTimeline.style.filter = 'none';
      btnTimeline.style.boxShadow = '0 6px 15px rgba(42, 82, 152, 0.3)';
    });
    btnTimeline.addEventListener('click', () => {
      window.location.href = 'editor.html';
    });

    const btnStatic = document.createElement('button');
    btnStatic.type = 'button';
    btnStatic.className = 'firework-pause-button';
    btnStatic.style.flex = '1';
    btnStatic.style.background = 'linear-gradient(180deg, #aa3bff 0%, #8a1bef 100%)';
    btnStatic.style.color = '#fff';
    btnStatic.style.border = '1px solid rgba(170, 59, 255, 0.3)';
    btnStatic.style.boxShadow = '0 6px 15px rgba(170, 59, 255, 0.3)';
    btnStatic.style.fontSize = '13px';
    btnStatic.style.fontWeight = 'bold';
    btnStatic.style.padding = '10px 14px';
    btnStatic.style.borderRadius = '999px';
    btnStatic.style.cursor = 'pointer';
    btnStatic.style.transition = 'all 0.3s ease';
    btnStatic.innerHTML = 'Static Editor';
    btnStatic.addEventListener('mouseover', () => {
      btnStatic.style.filter = 'brightness(1.15)';
      btnStatic.style.boxShadow = '0 0 15px rgba(170, 59, 255, 0.4)';
    });
    btnStatic.addEventListener('mouseout', () => {
      btnStatic.style.filter = 'none';
      btnStatic.style.boxShadow = '0 6px 15px rgba(170, 59, 255, 0.3)';
    });
    btnStatic.addEventListener('click', () => {
      window.location.href = 'formation.html';
    });

    navButtons.appendChild(btnTimeline);
    navButtons.appendChild(btnStatic);
    navSection.appendChild(navTitle);
    navSection.appendChild(navButtons);
    panel.appendChild(navSection);

    this.pauseOverlay.appendChild(panel);
    document.body.appendChild(this.pauseOverlay);
  }

  getSelectedPresetKey() {
    return this.selectedPresetKey;
  }

  getSelectedPreset() {
    if (!this.fireworkSystem?.shellPresetFactory) {
      return null;
    }

    return this.selectedPresetKey === 'random'
      ? null
      : this.fireworkSystem.shellPresetFactory.createPresetByKey(this.selectedPresetKey);
  }

  getSelectedPresetLabel() {
    return this.presetOptions.find(option => option.key === this.selectedPresetKey)?.label ?? 'Random';
  }

  isPaused() {
    return this.paused;
  }

  pause() {
    if (this.paused) {
      return;
    }

    this.paused = true;
    this.instructions.style.display = 'none';
    this.showPauseMenu();
    if (this.controls.isLocked) {
      this.controls.unlock();
    }
    this.updateStatusOverlay();
  }

  resume() {
    if (!this.paused) {
      return;
    }

    this.paused = false;
    this.hidePauseMenu();
    this.instructions.style.display = '';
    this.updateStatusOverlay();
  }

  togglePause() {
    if (this.paused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  showPauseMenu() {
    if (!this.pauseOverlay) {
      return;
    }

    for (const item of SETTINGS_DEFINITION) {
      const saved = localStorage.getItem(`settings_${item.key}`);
      let currentVal = item.default;
      if (saved !== null) {
        currentVal = item.type === 'checkbox'
          ? saved === 'true'
          : parseFloat(saved);
      }

      if (item.type === 'slider' && item.inputElement) {
        item.inputElement.value = currentVal;
        if (item.valueDisplayElement) {
          item.valueDisplayElement.textContent = currentVal.toFixed(2);
        }
      } else if (item.type === 'checkbox' && item.inputElement) {
        item.inputElement.checked = currentVal;
      }
    }

    if (this.qualitySelect) {
      this.qualitySelect.value = localStorage.getItem('graphics_quality') || 'medium';
    }

    this.pauseOverlay.style.display = 'flex';
  }

  hidePauseMenu() {
    if (!this.pauseOverlay) {
      return;
    }

    this.pauseOverlay.style.display = 'none';
  }

  updateStatusOverlay() {
    if (!this.statusOverlay) return;
    const locked = this.controls.isLocked ? 'Yes' : 'No';
    const moving = this.status.moving ? 'Yes' : 'No';
    const d = this.status.diagnostics;
    const warningText = d.lastWarning === 'none' ? 'none' : d.lastWarning;
    const pauseState = this.paused ? 'Paused' : 'Live';
    const selectedSeqLabel = this.sequenceOptions.find(o => o.key === this.selectedSequenceKey)?.label ?? 'None';
    this.statusOverlay.innerHTML = `Mode: ${pauseState}<br>Locked: ${locked}<br>Moving: ${moving} (${this.status.direction})<br>Looking: ${this.status.looking ? 'Yes' : 'No'}<br>Preset: ${this.getSelectedPresetLabel()}<br>Sequence: ${selectedSeqLabel}<br>Shell: ${this.status.firework}<br>Effect: ${this.status.effect}<br>Launch/Burst: ${d.launched}/${d.bursted}<br>Fallback S/E: ${d.shapeFallbacks}/${d.effectFallbacks}<br>Warnings: ${d.warnings}<br>Last Warn: ${warningText}`;
  }

  onMouseMove(event) {
    if (!this.controls.isLocked) return;
    this.status.looking = true;
    this.updateStatusOverlay();
    clearTimeout(this.lookTimer);
    this.lookTimer = setTimeout(() => {
      this.status.looking = false;
      this.updateStatusOverlay();
    }, 150);
  }

  onKeyDown(event) {
    const target = event.target;
    if (
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable)
    ) {
      return;
    }

    if (event.code === 'Escape') {
      event.preventDefault();
      if (this.timelineEditor && this.timelineEditor.visible) {
        this.timelineEditor.toggle();
      } else {
        this.togglePause();
      }
      return;
    }

    if (!this.controls.isLocked || this.paused) return;
    switch (event.code) {
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.shift = true;
        break;
      case 'ArrowUp':
      case 'KeyW':
        this.keys.forward = true;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.keys.left = true;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.keys.backward = true;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.keys.right = true;
        break;
      case 'Enter':
        if (this.showDirector) {
          if (this.showDirector.isPlaying) {
            this.showDirector.stop();
            console.log('Show stopped.');
          } else {
            const selectedSeq = this.sequenceOptions.find(o => o.key === this.selectedSequenceKey);
            if (selectedSeq && selectedSeq.script) {
              this.showDirector.loadScript(selectedSeq.script);
              this.showDirector.play();
              console.log(`Started Sequence: ${selectedSeq.label}`);
            } else {
              console.warn('No valid sequence selected.');
            }
          }
        }
        break;
    }
  }

  onKeyUp(event) {
    switch (event.code) {
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.shift = false;
        break;
      case 'ArrowUp':
      case 'KeyW':
        this.keys.forward = false;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.keys.left = false;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.keys.backward = false;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.keys.right = false;
        break;
    }
  }

  setMovementStatus(direction) {
    const moving = direction !== '' && direction !== 'idle';
    this.status.moving = moving;
    this.status.direction = moving ? direction : 'idle';
    this.updateStatusOverlay();
  }

  destroy() {
    for (const unsubscribe of this.eventSubscriptions) {
      unsubscribe();
    }
  }
}
