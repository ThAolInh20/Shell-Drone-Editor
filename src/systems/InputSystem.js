import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

export class InputSystem {
  constructor(camera, domElement) {
    this.controls = new PointerLockControls(camera, domElement);
    
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
      looking: false
    };
    
    // Click to lock cursor
    domElement.addEventListener('click', () => {
      if (!this.controls.isLocked) {
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
    
    // Instruction overlay
    this.setupInstructions();
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
    this.instructions.innerHTML = 'Click to Look Around<br/><br/>W A S D to Move';
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
      this.instructions.style.display = '';
      this.status.moving = false;
      this.status.direction = 'idle';
      this.updateStatusOverlay();
    });
  }

  updateStatusOverlay() {
    if (!this.statusOverlay) return;
    const locked = this.controls.isLocked ? 'Yes' : 'No';
    const moving = this.status.moving ? 'Yes' : 'No';
    this.statusOverlay.innerHTML = `Locked: ${locked}<br>Moving: ${moving} (${this.status.direction})<br>Looking: ${this.status.looking ? 'Yes' : 'No'}`;
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
    if(!this.controls.isLocked) return;
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
