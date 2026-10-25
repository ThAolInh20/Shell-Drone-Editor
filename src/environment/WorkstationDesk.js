import * as THREE from 'three';
import { LAYER_DEFAULT, LAYER_REFLECTION } from '../config/layers.js';

export class WorkstationDesk {
  constructor(options = {}) {
    // Sized generously and positioned on the right of initial spectator position (0, 6, 420)
    this.position = options.position || new THREE.Vector3(3.2, 4.1, 420.5);
    this.interactionRadius = options.interactionRadius || 4.2;

    this.group = new THREE.Group();
    this.group.name = 'WorkstationDeskGroup';

    this.promptElement = null;
    this.isNearPlayer = false;
    this.timelineEditor = null;
    this.controls = null;

    this.canvas = null;
    this.screenTexture = null;

    this._initScreenTexture();
    this._createStructure();
    this._initDomPrompt();

    this.group.position.copy(this.position);
    // Angled toward viewer center
    this.group.rotation.y = options.rotationY !== undefined ? options.rotationY : -Math.PI * 0.14;
  }

  _initScreenTexture() {
    if (typeof document === 'undefined') {
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 640;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return;
    }

    this.canvas = canvas;
    this._drawScreenTexture(ctx, canvas.width, canvas.height);

    this.screenTexture = new THREE.CanvasTexture(canvas);
    this.screenTexture.colorSpace = THREE.SRGBColorSpace;
    this.screenTexture.minFilter = THREE.LinearFilter;
    this.screenTexture.magFilter = THREE.LinearFilter;
  }

  _drawHeart(ctx, x, y, size, fillStyle, strokeStyle, glowColor) {
    ctx.save();
    if (glowColor) {
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 28;
    }
    ctx.translate(x, y);
    ctx.beginPath();
    const topY = -size * 0.35;
    ctx.moveTo(0, topY);
    ctx.bezierCurveTo(
      -size * 0.55,
      -size * 0.85,
      -size * 0.95,
      -size * 0.05,
      0,
      size * 0.85
    );
    ctx.bezierCurveTo(
      size * 0.95,
      -size * 0.05,
      size * 0.55,
      -size * 0.85,
      0,
      topY
    );
    ctx.closePath();

    if (fillStyle) {
      ctx.fillStyle = fillStyle;
      ctx.fill();
    }
    if (strokeStyle) {
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = Math.max(3, size * 0.04);
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawScreenTexture(ctx, w, h) {
    // 1. Dark high-tech cyber background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#060a17');
    bgGrad.addColorStop(1, '#0d172a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Subtle sci-fi grid overlay
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.06)';
    ctx.lineWidth = 1;
    for (let gx = 0; gx < w; gx += 48) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, h);
      ctx.stroke();
    }
    for (let gy = 0; gy < h; gy += 48) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(w, gy);
      ctx.stroke();
    }

    // 2. Top application header bar
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, 52);
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, w, 52);

    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('TIMELINE WORKSTATION [PRO STUDIO]', 24, 34);

    ctx.fillStyle = '#38ef7d';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('ONLINE', w - 24, 34);
    ctx.textAlign = 'left';

    // 3. Audio spectrum bars flanking the center heart
    // Left spectrum
    ctx.fillStyle = '#00f0ff';
    for (let x = 40; x < 360; x += 8) {
      const barH = 14 + Math.sin(x * 0.05) * 45 + Math.cos(x * 0.02) * 20;
      ctx.fillRect(x, 210 - barH * 0.5, 4.5, barH);
    }
    // Right spectrum
    for (let x = 664; x < 984; x += 8) {
      const barH = 14 + Math.cos(x * 0.05) * 45 + Math.sin(x * 0.02) * 20;
      ctx.fillRect(x, 210 - barH * 0.5, 4.5, barH);
    }

    // 4. Center Glowing Heart
    const heartX = w * 0.5;
    const heartY = 205;
    const heartSize = 135;

    const heartGrad = ctx.createLinearGradient(
      heartX,
      heartY - heartSize * 0.6,
      heartX,
      heartY + heartSize * 0.8
    );
    heartGrad.addColorStop(0, '#ff4081');
    heartGrad.addColorStop(0.5, '#f50057');
    heartGrad.addColorStop(1, '#c2185b');

    // Main Heart with glow
    this._drawHeart(
      ctx,
      heartX,
      heartY,
      heartSize,
      heartGrad,
      '#ffffff',
      '#ff1744'
    );

    // Inner glowing accent heart
    this._drawHeart(
      ctx,
      heartX,
      heartY - 4,
      heartSize * 0.52,
      'rgba(255, 128, 171, 0.45)',
      'rgba(255, 255, 255, 0.8)',
      null
    );

    // 5. Large Prominent Text: ThaoLin20
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 74px "Segoe UI", Arial, sans-serif';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 24;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('ThaoLin20', w * 0.5, 375);

    // Gradient underline for ThaoLin20
    const lineGrad = ctx.createLinearGradient(
      w * 0.5 - 200,
      0,
      w * 0.5 + 200,
      0
    );
    lineGrad.addColorStop(0, 'rgba(255, 64, 129, 0)');
    lineGrad.addColorStop(0.2, '#ff4081');
    lineGrad.addColorStop(0.5, '#00f0ff');
    lineGrad.addColorStop(0.8, '#ff4081');
    lineGrad.addColorStop(1, 'rgba(255, 64, 129, 0)');

    ctx.fillStyle = lineGrad;
    ctx.fillRect(w * 0.5 - 200, 395, 400, 4);
    ctx.restore();

    // 6. Timeline Tracks Mini-Overview Strip
    const tracks = [
      { y: 425, h: 40, color: '#ffb703', label: 'SHELL' },
      { y: 472, h: 40, color: '#38ef7d', label: 'COMET' },
      { y: 519, h: 40, color: '#a06cd5', label: 'DRONE' }
    ];

    for (const t of tracks) {
      // Track Lane
      ctx.fillStyle = '#090e1c';
      ctx.fillRect(24, t.y, w - 48, t.h);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.strokeRect(24, t.y, w - 48, t.h);

      // Track Label
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 15px monospace';
      ctx.fillText(t.label, 36, t.y + 26);

      // Event Blocks
      const offsets = [180, 400, 620, 810];
      for (const ox of offsets) {
        ctx.fillStyle = t.color;
        ctx.fillRect(ox, t.y + 6, 120, t.h - 12);

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(ox, t.y + 6, 120, t.h - 12);
      }
    }

    // Playhead line through tracks
    ctx.strokeStyle = '#ff3366';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(460, 420);
    ctx.lineTo(460, 565);
    ctx.stroke();

    // 7. Bottom Status Line
    ctx.fillStyle = '#060a14';
    ctx.fillRect(0, h - 48, w, 48);
    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 19px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PRESS [F] TO EXPAND TIMELINE EDITOR  |  [ESC] TO EXIT OR UNLOCK', w * 0.5, h - 18);
    ctx.textAlign = 'left';
  }

  _createStructure() {
    // 1. Sleek Modern Desk Table Top (generous width 2.4m, depth 1.2m)
    const deskTopGeo = new THREE.BoxGeometry(2.4, 0.1, 1.2);
    const deskTopMat = new THREE.MeshStandardMaterial({
      color: 0x141a26,
      metalness: 0.85,
      roughness: 0.25
    });
    const deskTop = new THREE.Mesh(deskTopGeo, deskTopMat);
    deskTop.name = 'WorkstationDeskTop';
    deskTop.position.set(0, 0, 0);
    deskTop.layers.set(LAYER_DEFAULT);
    deskTop.layers.enable(LAYER_REFLECTION);
    this.group.add(deskTop);

    // Glowing edge trim around desk top
    const rimGeo = new THREE.BoxGeometry(2.44, 0.025, 1.24);
    const rimMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff
    });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.position.set(0, -0.045, 0);
    rim.layers.set(LAYER_DEFAULT);
    this.group.add(rim);

    // 2. 4 Desk Steel Legs (anchoring down to floor)
    const legHeight = 1.35;
    const legGeo = new THREE.CylinderGeometry(0.045, 0.045, legHeight, 12);
    const legMat = new THREE.MeshStandardMaterial({
      color: 0x0c1018,
      metalness: 0.94,
      roughness: 0.18
    });

    const legOffsets = [
      [-1.05, -legHeight * 0.5 - 0.05, -0.5],
      [1.05, -legHeight * 0.5 - 0.05, -0.5],
      [-1.05, -legHeight * 0.5 - 0.05, 0.5],
      [1.05, -legHeight * 0.5 - 0.05, 0.5]
    ];

    for (const offset of legOffsets) {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(offset[0], offset[1], offset[2]);
      leg.layers.set(LAYER_DEFAULT);
      leg.layers.enable(LAYER_REFLECTION);
      this.group.add(leg);
    }

    // 3. Giant Ultrawide Laptop Base (width 1.2m, depth 0.76m)
    const laptopBaseGeo = new THREE.BoxGeometry(1.2, 0.04, 0.76);
    const laptopChassisMat = new THREE.MeshStandardMaterial({
      color: 0x1e2636,
      metalness: 0.92,
      roughness: 0.22
    });
    const laptopBase = new THREE.Mesh(laptopBaseGeo, laptopChassisMat);
    laptopBase.position.set(-0.1, 0.07, 0.05);
    laptopBase.layers.set(LAYER_DEFAULT);
    this.group.add(laptopBase);

    // Giant Laptop Keyboard Plate
    const keyboardGeo = new THREE.BoxGeometry(1.05, 0.005, 0.38);
    const keyboardMat = new THREE.MeshStandardMaterial({
      color: 0x0a0f18,
      roughness: 0.65
    });
    const keyboard = new THREE.Mesh(keyboardGeo, keyboardMat);
    keyboard.position.set(-0.1, 0.093, -0.06);
    keyboard.layers.set(LAYER_DEFAULT);
    this.group.add(keyboard);

    // Glowing keyboard backlight border
    const kbGlowGeo = new THREE.BoxGeometry(1.07, 0.002, 0.40);
    const kbGlowMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff
    });
    const kbGlow = new THREE.Mesh(kbGlowGeo, kbGlowMat);
    kbGlow.position.set(-0.1, 0.091, -0.06);
    kbGlow.layers.set(LAYER_DEFAULT);
    this.group.add(kbGlow);

    // Large Laptop Trackpad
    const trackpadGeo = new THREE.BoxGeometry(0.38, 0.003, 0.22);
    const trackpadMat = new THREE.MeshStandardMaterial({
      color: 0x161e2c,
      metalness: 0.85,
      roughness: 0.28
    });
    const trackpad = new THREE.Mesh(trackpadGeo, trackpadMat);
    trackpad.position.set(-0.1, 0.093, 0.26);
    trackpad.layers.set(LAYER_DEFAULT);
    this.group.add(trackpad);

    // 4. Giant Laptop Open Screen Lid (width 1.2m, height 0.8m)
    const lidGroup = new THREE.Group();
    // Hinge positioned at the rear of laptop base
    lidGroup.position.set(-0.1, 0.09, -0.32);
    // Tilted back 25 degrees from vertical (toward -Z)
    lidGroup.rotation.x = -Math.PI * 0.14;

    const lidCaseGeo = new THREE.BoxGeometry(1.2, 0.8, 0.024);
    const lidCase = new THREE.Mesh(lidCaseGeo, laptopChassisMat);
    lidCase.position.set(0, 0.4, 0);
    lidCase.layers.set(LAYER_DEFAULT);
    lidGroup.add(lidCase);

    // Emissive Display Screen (width 1.12m, height 0.72m)
    const screenGeo = new THREE.PlaneGeometry(1.12, 0.72);
    const screenMat = this.screenTexture
      ? new THREE.MeshBasicMaterial({
          map: this.screenTexture,
          toneMapped: false,
          side: THREE.DoubleSide
        })
      : new THREE.MeshBasicMaterial({
          color: 0x00f0ff
        });
    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    // Face forward towards operator
    screenMesh.position.set(0, 0.4, 0.015);
    screenMesh.layers.set(LAYER_DEFAULT);
    screenMesh.layers.enable(LAYER_REFLECTION);
    lidGroup.add(screenMesh);

    this.group.add(lidGroup);

    // 5. Status LED Light
    const ledGeo = new THREE.SphereGeometry(0.018, 8, 8);
    const ledMat = new THREE.MeshBasicMaterial({
      color: 0x38ef7d
    });
    const ledMesh = new THREE.Mesh(ledGeo, ledMat);
    ledMesh.position.set(0.44, 0.095, 0.4);
    ledMesh.layers.set(LAYER_DEFAULT);
    this.group.add(ledMesh);

    // 6. Mousepad & Ergonomic Mouse
    const mousePadGeo = new THREE.BoxGeometry(0.36, 0.006, 0.44);
    const mousePadMat = new THREE.MeshStandardMaterial({
      color: 0x0e1422,
      roughness: 0.85
    });
    const mousePad = new THREE.Mesh(mousePadGeo, mousePadMat);
    mousePad.position.set(0.72, 0.053, 0.05);
    mousePad.layers.set(LAYER_DEFAULT);
    this.group.add(mousePad);

    const mouseGeo = new THREE.BoxGeometry(0.11, 0.045, 0.18);
    const mouseMat = new THREE.MeshStandardMaterial({
      color: 0x242e3e,
      metalness: 0.75,
      roughness: 0.28
    });
    const mouse = new THREE.Mesh(mouseGeo, mouseMat);
    mouse.position.set(0.72, 0.076, 0.05);
    mouse.layers.set(LAYER_DEFAULT);
    this.group.add(mouse);
  }

  _initDomPrompt() {
    if (typeof document === 'undefined') {
      return;
    }

    let prompt = document.getElementById('workstation-interaction-prompt');
    if (!prompt) {
      prompt = document.createElement('div');
      prompt.id = 'workstation-interaction-prompt';
      prompt.style.position = 'fixed';
      prompt.style.bottom = '110px';
      prompt.style.left = '50%';
      prompt.style.transform = 'translateX(-50%)';
      prompt.style.display = 'none';
      prompt.style.alignItems = 'center';
      prompt.style.gap = '12px';
      prompt.style.padding = '10px 22px';
      prompt.style.background = 'rgba(8, 14, 26, 0.88)';
      prompt.style.backdropFilter = 'blur(12px)';
      prompt.style.border = '1px solid rgba(0, 240, 255, 0.6)';
      prompt.style.borderRadius = '30px';
      prompt.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.65), 0 0 20px rgba(0, 240, 255, 0.25)';
      prompt.style.zIndex = '1000';
      prompt.style.pointerEvents = 'none';
      prompt.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
      prompt.style.opacity = '0';

      // Keycap Badge [ F ]
      const keycapF = document.createElement('span');
      keycapF.style.display = 'inline-flex';
      keycapF.style.alignItems = 'center';
      keycapF.style.justifyContent = 'center';
      keycapF.style.width = '34px';
      keycapF.style.height = '34px';
      keycapF.style.background = 'rgba(0, 240, 255, 0.18)';
      keycapF.style.border = '2px solid #00f0ff';
      keycapF.style.borderRadius = '8px';
      keycapF.style.color = '#ffffff';
      keycapF.style.fontFamily = 'monospace';
      keycapF.style.fontSize = '18px';
      keycapF.style.fontWeight = 'bold';
      keycapF.style.boxShadow = '0 0 10px rgba(0, 240, 255, 0.4)';
      keycapF.textContent = 'F';

      // Action Text [ F ]
      const textF = document.createElement('span');
      textF.style.color = '#e2f1ff';
      textF.style.fontFamily = '"Segoe UI", Roboto, sans-serif';
      textF.style.fontSize = '15px';
      textF.style.fontWeight = '600';
      textF.style.letterSpacing = '0.5px';
      textF.textContent = 'Timeline Workstation';

      // Separator
      const sep = document.createElement('span');
      sep.style.color = 'rgba(255, 255, 255, 0.35)';
      sep.style.margin = '0 4px';
      sep.textContent = '|';

      // Keycap Badge [ ESC ]
      const keycapEsc = document.createElement('span');
      keycapEsc.style.display = 'inline-flex';
      keycapEsc.style.alignItems = 'center';
      keycapEsc.style.justifyContent = 'center';
      keycapEsc.style.padding = '0 8px';
      keycapEsc.style.height = '34px';
      keycapEsc.style.background = 'rgba(255, 51, 102, 0.2)';
      keycapEsc.style.border = '2px solid #ff3366';
      keycapEsc.style.borderRadius = '8px';
      keycapEsc.style.color = '#ffffff';
      keycapEsc.style.fontFamily = 'monospace';
      keycapEsc.style.fontSize = '14px';
      keycapEsc.style.fontWeight = 'bold';
      keycapEsc.style.boxShadow = '0 0 10px rgba(255, 51, 102, 0.4)';
      keycapEsc.textContent = 'ESC';

      // Action Text [ ESC ]
      const textEsc = document.createElement('span');
      textEsc.style.color = '#e2f1ff';
      textEsc.style.fontFamily = '"Segoe UI", Roboto, sans-serif';
      textEsc.style.fontSize = '15px';
      textEsc.style.fontWeight = '600';
      textEsc.style.letterSpacing = '0.5px';
      textEsc.textContent = 'Unlock Mouse';

      prompt.appendChild(keycapF);
      prompt.appendChild(textF);
      prompt.appendChild(sep);
      prompt.appendChild(keycapEsc);
      prompt.appendChild(textEsc);
      document.body.appendChild(prompt);
    }
    this.promptElement = prompt;
  }

  getDistanceTo(cameraPos) {
    if (!cameraPos) return 9999;
    return this.position.distanceTo(cameraPos);
  }

  isNear(cameraPos, threshold = this.interactionRadius) {
    return this.getDistanceTo(cameraPos) <= threshold;
  }

  interact(timelineEditor, controls) {
    if (!timelineEditor) {
      return;
    }

    timelineEditor.toggle();

    // If opening timeline, automatically release pointer lock so cursor is free to edit
    if (timelineEditor.visible) {
      if (controls && controls.isLocked) {
        controls.unlock();
      }
      this.hidePrompt();
    }
  }

  showPrompt() {
    if (this.promptElement) {
      this.promptElement.style.display = 'flex';
      requestAnimationFrame(() => {
        if (this.promptElement) {
          this.promptElement.style.opacity = '1';
          this.promptElement.style.transform = 'translateX(-50%) translateY(0)';
        }
      });
    }
  }

  hidePrompt() {
    if (this.promptElement) {
      this.promptElement.style.opacity = '0';
      this.promptElement.style.transform = 'translateX(-50%) translateY(6px)';
      setTimeout(() => {
        if (this.promptElement && this.promptElement.style.opacity === '0') {
          this.promptElement.style.display = 'none';
        }
      }, 250);
    }
  }

  update(deltaTime, cameraPos, timelineVisible = false) {
    if (!cameraPos) return;

    const near = this.isNear(cameraPos);

    if (near && !timelineVisible) {
      if (!this.isNearPlayer) {
        this.isNearPlayer = true;
        this.showPrompt();
      }
    } else {
      if (this.isNearPlayer) {
        this.isNearPlayer = false;
        this.hidePrompt();
      }
    }
  }

  dispose() {
    if (this.promptElement && this.promptElement.parentNode) {
      this.promptElement.parentNode.removeChild(this.promptElement);
      this.promptElement = null;
    }

    if (this.screenTexture) {
      this.screenTexture.dispose();
      this.screenTexture = null;
    }

    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      if (child.geometry) {
        child.geometry.dispose();
      }
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
      this.group.remove(child);
    }
  }
}
