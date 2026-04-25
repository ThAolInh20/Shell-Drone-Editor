import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { sequences } from '../config/sequences/index.js';

export class InputSystem {
  constructor(camera, domElement, fireworkSystem = null) {
    this.controls = new PointerLockControls(camera, domElement);
    this.fireworkSystem = fireworkSystem;
    this.paused = false;
    this.selectedPresetKey = 'random';
    
    this.sequenceOptions = sequences;
    this.selectedSequenceKey = sequences.length > 0 ? sequences[0].key : null;
    
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
      // do nothing
    });

    document.addEventListener('mousemove', (event) => this.onMouseMove(event));
    document.addEventListener('keydown', (event) => this.onKeyDown(event));
    document.addEventListener('keyup', (event) => this.onKeyUp(event));

    window.addEventListener('firework:diagnostics', (event) => {
      this.status.diagnostics = event.detail;
    });
    
    // Giao diện tinh gọn cho Editor
  }
  
  // setupInstructions and setupPauseMenu have been removed

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
    return false;
  }

  pause() {
    this.controls.unlock();
  }

  resume() {
    this.controls.lock();
  }

  togglePause() {
    if (this.controls.isLocked) {
      this.pause();
    } else {
      this.resume();
    }
  }

  onMouseMove(event) {
    if (!this.controls.isLocked) return;
    this.status.looking = true;
    clearTimeout(this.lookTimer);
    this.lookTimer = setTimeout(() => {
      this.status.looking = false;
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
      // Removed Space and Enter keys for Editor
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
  }
}
