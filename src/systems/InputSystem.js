import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

export class InputSystem {
  constructor(camera, domElement, fireworkSystem = null) {
    this.controls = new PointerLockControls(camera, domElement);
    this.fireworkSystem = fireworkSystem;
    this.paused = false;
    this.selectedPresetKey = 'random';
    
    // Movement state
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false
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

    window.addEventListener('firework:launch', (event) => {
      this.status.firework = event.detail.shellType;
      this.status.effect = event.detail.effectType;
      this.updateStatusOverlay();
    });

    window.addEventListener('firework:burst', (event) => {
      this.status.firework = event.detail.shellType;
      this.status.effect = event.detail.effectType;
      this.updateStatusOverlay();
    });

    window.addEventListener('firework:diagnostics', (event) => {
      this.status.diagnostics = event.detail;
      this.updateStatusOverlay();
    });
    
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
    this.instructions.innerHTML = 'Click to Look Around<br/><br/>W A S D to Move<br/><br/>Click while locked to launch the selected firework<br/><br/>Press ESC for the firework menu<br/><br/>Press SPACE for auto-launch mode';
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
    title.textContent = 'Firework Selector';

    const description = document.createElement('div');
    description.className = 'firework-pause-description';
    description.textContent = 'Press ESC to resume, or choose a firework type before clicking to launch.';

    const label = document.createElement('label');
    label.className = 'firework-pause-label';
    label.textContent = 'Type';

    this.presetSelect = document.createElement('select');
    this.presetSelect.className = 'firework-pause-select';
    for (const option of this.presetOptions) {
      const optionElement = document.createElement('option');
      optionElement.value = option.key;
      optionElement.textContent = option.label;
      this.presetSelect.appendChild(optionElement);
    }
    this.presetSelect.value = this.selectedPresetKey;
    this.presetSelect.addEventListener('change', () => {
      this.selectedPresetKey = this.presetSelect.value;
      this.updateSelectedPresetHighlight();
      this.updateStatusOverlay();
    });

    this.selectedPresetHighlight = document.createElement('div');
    this.selectedPresetHighlight.className = 'firework-pause-selected';
    this.selectedPresetHighlight.innerHTML = '<span class="firework-pause-selected-label">Selected</span><span class="firework-pause-selected-value"></span>';

    const buttonRow = document.createElement('div');
    buttonRow.className = 'firework-pause-actions';

    this.resumeButton = document.createElement('button');
    this.resumeButton.type = 'button';
    this.resumeButton.className = 'firework-pause-button';
    this.resumeButton.textContent = 'Resume';
    this.resumeButton.addEventListener('click', () => this.resume());

    buttonRow.appendChild(this.resumeButton);
    label.appendChild(this.presetSelect);
    panel.appendChild(this.selectedPresetHighlight);
    panel.appendChild(title);
    panel.appendChild(description);
    panel.appendChild(label);
    panel.appendChild(buttonRow);
    this.pauseOverlay.appendChild(panel);
    document.body.appendChild(this.pauseOverlay);
    this.updateSelectedPresetHighlight();
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

    this.presetSelect.value = this.selectedPresetKey;
    this.updateSelectedPresetHighlight();
    this.pauseOverlay.style.display = 'flex';
  }

  hidePauseMenu() {
    if (!this.pauseOverlay) {
      return;
    }

    this.pauseOverlay.style.display = 'none';
  }

  updateSelectedPresetHighlight() {
    if (!this.selectedPresetHighlight) {
      return;
    }

    const label = this.getSelectedPresetLabel();
    this.selectedPresetHighlight.querySelector('.firework-pause-selected-value').textContent = label;
    this.selectedPresetHighlight.dataset.preset = this.selectedPresetKey;
  }

  updateStatusOverlay() {
    if (!this.statusOverlay) return;
    const locked = this.controls.isLocked ? 'Yes' : 'No';
    const moving = this.status.moving ? 'Yes' : 'No';
    const d = this.status.diagnostics;
    const warningText = d.lastWarning === 'none' ? 'none' : d.lastWarning;
    const pauseState = this.paused ? 'Paused' : 'Live';
    this.statusOverlay.innerHTML = `Mode: ${pauseState}<br>Locked: ${locked}<br>Moving: ${moving} (${this.status.direction})<br>Looking: ${this.status.looking ? 'Yes' : 'No'}<br>Preset: ${this.getSelectedPresetLabel()}<br>Shell: ${this.status.firework}<br>Effect: ${this.status.effect}<br>Launch/Burst: ${d.launched}/${d.bursted}<br>Fallback S/E: ${d.shapeFallbacks}/${d.effectFallbacks}<br>Warnings: ${d.warnings}<br>Last Warn: ${warningText}`;
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
    if (event.code === 'Escape') {
      event.preventDefault();
      this.togglePause();
      return;
    }

    if (!this.controls.isLocked || this.paused) return;
    switch (event.code) {
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
      case 'Space':
        if (this.fireworkSystem) {
          this.fireworkSystem.autoLaunchEnabled = !this.fireworkSystem.autoLaunchEnabled;
          console.log('Auto launch:', this.fireworkSystem.autoLaunchEnabled ? 'ON' : 'OFF');
        }
        break;
    }
  }

  onKeyUp(event) {
    switch (event.code) {
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
}
