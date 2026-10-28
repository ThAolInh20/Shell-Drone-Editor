import * as THREE from 'three';
import { LAYER_DEFAULT, LAYER_REFLECTION } from '../config/layers.js';

export class ControlsBillboard {
  constructor(options = {}) {
    // Sized and positioned close enough to audience (Z = 438, distance 18m) to fill FOV with giant readable text
    this.width = options.width || 36;
    this.height = options.height || 18;
    this.position = options.position || new THREE.Vector3(0, 9.5, 438);

    this.group = new THREE.Group();
    this.group.name = 'ControlsBillboardGroup';

    this.canvas = null;
    this.canvasTexture = null;
    this.boardMesh = null;
    this.backMesh = null;
    this.frameMesh = null;
    this.pillars = [];
    this.crossBeams = [];

    this._initCanvas();
    this._createStructure();
    this.group.position.copy(this.position);
  }

  _initCanvas() {
    if (typeof document === 'undefined') {
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 4096;
    canvas.height = 2048;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return;
    }

    this.canvas = canvas;
    this._renderTexture(ctx, canvas.width, canvas.height);

    this.canvasTexture = new THREE.CanvasTexture(canvas);
    this.canvasTexture.colorSpace = THREE.SRGBColorSpace;
    this.canvasTexture.minFilter = THREE.LinearMipmapLinearFilter;
    this.canvasTexture.magFilter = THREE.LinearFilter;
    this.canvasTexture.generateMipmaps = true;
    this.canvasTexture.anisotropy = 16;
  }

  _renderTexture(ctx, w, h) {
    // 1. Dark deep navy background
    const bgGradient = ctx.createLinearGradient(0, 0, 0, h);
    bgGradient.addColorStop(0, '#040711');
    bgGradient.addColorStop(0.5, '#070f22');
    bgGradient.addColorStop(1, '#02050c');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, w, h);

    // 2. High contrast grid
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.05)';
    ctx.lineWidth = 2;
    const gridSize = 80;
    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // 3. Glowing Outer Border
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.5)';
    ctx.lineWidth = 8;
    ctx.strokeRect(32, 32, w - 64, h - 64);

    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 4;
    ctx.strokeRect(48, 48, w - 96, h - 96);

    // Tech Brackets
    const bracketSize = 80;
    const corners = [
      { x: 48, y: 48, dx: 1, dy: 1 },
      { x: w - 48, y: 48, dx: -1, dy: 1 },
      { x: 48, y: h - 48, dx: 1, dy: -1 },
      { x: w - 48, y: h - 48, dx: -1, dy: -1 }
    ];

    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 12;
    for (const c of corners) {
      ctx.beginPath();
      ctx.moveTo(c.x, c.y + c.dy * bracketSize);
      ctx.lineTo(c.x, c.y);
      ctx.lineTo(c.x + c.dx * bracketSize, c.y);
      ctx.stroke();
    }

    // 4. Header Bar (Large and high-contrast)
    const headerHeight = 200;
    const headerGrad = ctx.createLinearGradient(0, 64, 0, 64 + headerHeight);
    headerGrad.addColorStop(0, 'rgba(0, 229, 255, 0.25)');
    headerGrad.addColorStop(1, 'rgba(0, 229, 255, 0.04)');
    ctx.fillStyle = headerGrad;
    ctx.fillRect(72, 72, w - 144, headerHeight);

    ctx.strokeStyle = 'rgba(0, 229, 255, 0.6)';
    ctx.lineWidth = 3;
    ctx.strokeRect(72, 72, w - 144, headerHeight);

    // Main Header Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 72px "Segoe UI", Roboto, sans-serif';
    ctx.fillText('DRONE & FIREWORK SHOW DIRECTOR', 120, 155);

    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 36px "Segoe UI", Roboto, monospace';
    ctx.fillText('SYSTEM CONTROLS AND SHORTCUT REFERENCE GUIDE', 120, 222);

    // Header Right Badge
    const badgeW = 380;
    const badgeH = 86;
    const badgeX = w - 120 - badgeW;
    const badgeY = 128;

    ctx.fillStyle = 'rgba(0, 229, 255, 0.18)';
    ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 3;
    ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('LIVE HUD GUIDE', badgeX + badgeW / 2, badgeY + 54);
    ctx.textAlign = 'left';

    // 5. Three Columns
    const colY = 305;
    const colHeight = h - colY - 170;
    const colGap = 44;
    const totalColsWidth = w - 144;
    const colWidth = (totalColsWidth - colGap * 2) / 3;

    const sections = [
      {
        title: 'TIMELINE & PLAYBACK',
        accent: '#00e5ff',
        items: [
          {
            key: 'CTRL + T',
            desc: 'Toggle Timeline Panel',
            highlight: true,
            highlightColor: '#ffb703',
            tag: 'CORE TOGGLE'
          },
          {
            key: 'SPACE',
            desc: 'Play / Pause Timeline',
            highlight: true,
            highlightColor: '#00e5ff',
            tag: 'PLAYBACK'
          },
          { key: 'B', desc: 'Tap Beat / Sync Marker' },
          { key: 'CTRL + S', desc: 'Direct Save Script' },
          { key: 'CTRL + Z / Y', desc: 'Undo / Redo Action' },
          { key: '[  /  ]', desc: 'Seek Prev / Next Beat' },
          { key: 'SHIFT + 0', desc: 'Cycle Timeline Zoom' },
          { key: 'CTRL + ALT + N', desc: 'Create New Script' }
        ]
      },
      {
        title: 'SELECTION & EDITING',
        accent: '#38ef7d',
        items: [
          {
            key: 'CTRL + DRAG',
            desc: 'Marquee Multi-Select',
            highlight: true,
            highlightColor: '#38ef7d',
            tag: 'MULTI-BOX'
          },
          { key: 'CLICK + DRAG', desc: 'Move Selected Blocks' },
          { key: 'CTRL + CLICK', desc: 'Toggle Select Block' },
          { key: 'CTRL + G', desc: 'Group Selected Blocks' },
          { key: 'CTRL + G', desc: 'Ungroup Blocks' },
          { key: 'CTRL + C / V', desc: 'Copy / Paste Blocks' },
          { key: 'DELETE', desc: 'Remove Selected Blocks' },
          { key: 'RIGHT CLICK', desc: 'Context Menu & Presets' }
        ]
      },
      {
        title: '3D CAMERA & SCENE',
        accent: '#ff9f1c',
        items: [
          {
            key: 'ESC',
            desc: 'Unlock Mouse / Exit Menu',
            highlight: true,
            highlightColor: '#ff3366',
            tag: 'RELEASE MOUSE'
          },
          {
            key: 'SHIFT + Y',
            desc: 'Toggle Diagnostics HUD',
            highlight: true,
            highlightColor: '#ff9f1c',
            tag: 'CORE STATS'
          },
          {
            key: 'H',
            desc: 'Toggle Look At Guide',
            highlight: true,
            highlightColor: '#00f5d4',
            tag: 'QUICK VIEW'
          },
          { key: 'LEFT CLICK', desc: 'Lock Mouse & Turn View' },
          { key: 'W A S D', desc: 'Fly Camera in 3D' },
          { key: 'SHIFT + W / S', desc: 'Ascend / Descend Fly' },
          { key: 'SHIFT + R', desc: 'Reset Camera Center' },
          { key: '1 / 2 / 3', desc: 'Free / Boat / Aerial Cam' }
        ]
      }
    ];

    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i];
      const cx = 72 + i * (colWidth + colGap);

      // Section Background Card
      const cardGrad = ctx.createLinearGradient(0, colY, 0, colY + colHeight);
      cardGrad.addColorStop(0, 'rgba(12, 22, 42, 0.90)');
      cardGrad.addColorStop(1, 'rgba(5, 10, 22, 0.96)');
      ctx.fillStyle = cardGrad;
      ctx.fillRect(cx, colY, colWidth, colHeight);

      // Border and Accent Line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(cx, colY, colWidth, colHeight);

      ctx.fillStyle = sec.accent;
      ctx.fillRect(cx, colY, colWidth, 10);

      // Section Header Banner
      ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
      ctx.fillRect(cx, colY + 10, colWidth, 90);

      ctx.fillStyle = sec.accent;
      ctx.font = 'bold 42px "Segoe UI", Roboto, monospace';
      ctx.fillText(sec.title, cx + 32, colY + 70);

      // Items List (8 items with 175px row step)
      let itemY = colY + 165;
      const rowStep = 168;

      for (const item of sec.items) {
        const isHighlight = Boolean(item.highlight);
        const accentCol = item.highlightColor || sec.accent;

        // Keycap Pill Badge
        const keyW = 390;
        const keyH = 86;
        const keyX = cx + 28;
        const keyRadius = 12;

        if (isHighlight) {
          // Highlighted Keycap with Glow
          ctx.save();
          ctx.shadowColor = accentCol;
          ctx.shadowBlur = 32;

          ctx.fillStyle = 'rgba(10, 22, 44, 0.98)';
          ctx.beginPath();
          ctx.roundRect
            ? ctx.roundRect(keyX, itemY - 60, keyW, keyH, keyRadius)
            : ctx.rect(keyX, itemY - 60, keyW, keyH);
          ctx.fill();

          ctx.strokeStyle = accentCol;
          ctx.lineWidth = 4.5;
          ctx.stroke();
          ctx.restore();

          // High Contrast White Monospace Keycap Text
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 36px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(item.key, keyX + keyW / 2, itemY - 5);
          ctx.textAlign = 'left';

          // Description in Giant Pure White Bold Text
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 42px "Segoe UI", Roboto, sans-serif';
          ctx.fillText(item.desc, keyX + keyW + 36, itemY - 5);

          // Mini Tag Pill
          if (item.tag) {
            const tagW = 210;
            const tagH = 40;
            const tagX = cx + colWidth - tagW - 28;
            const tagY = itemY - 55;

            ctx.fillStyle = accentCol;
            ctx.fillRect(tagX, tagY, tagW, tagH);

            ctx.fillStyle = '#040812';
            ctx.font = 'bold 22px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(item.tag, tagX + tagW / 2, tagY + 28);
            ctx.textAlign = 'left';
          }
        } else {
          // Standard Keycap Badge
          ctx.fillStyle = '#111c30';
          ctx.beginPath();
          ctx.roundRect
            ? ctx.roundRect(keyX, itemY - 60, keyW, keyH, keyRadius)
            : ctx.rect(keyX, itemY - 60, keyW, keyH);
          ctx.fill();

          ctx.strokeStyle = 'rgba(0, 229, 255, 0.45)';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 34px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(item.key, keyX + keyW / 2, itemY - 5);
          ctx.textAlign = 'left';

          // Giant Crisp White Description
          ctx.fillStyle = '#f0f6ff';
          ctx.font = 'bold 38px "Segoe UI", Roboto, sans-serif';
          ctx.fillText(item.desc, keyX + keyW + 36, itemY - 5);
        }

        // Row Separator Line
        ctx.strokeStyle = isHighlight
          ? 'rgba(255, 255, 255, 0.18)'
          : 'rgba(255, 255, 255, 0.06)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx + 24, itemY + 42);
        ctx.lineTo(cx + colWidth - 24, itemY + 42);
        ctx.stroke();

        itemY += rowStep;
      }
    }

    // 6. Bottom Banner / Quick Tip
    const footerY = h - 130;
    const footerH = 80;

    ctx.fillStyle = 'rgba(0, 229, 255, 0.14)';
    ctx.fillRect(72, footerY, w - 144, footerH);

    ctx.strokeStyle = 'rgba(0, 229, 255, 0.6)';
    ctx.lineWidth = 3;
    ctx.strokeRect(72, footerY, w - 144, footerH);

    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 36px "Segoe UI", Roboto, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      'QUICK TIP: PRESS [ESC] TO UNLOCK MOUSE CURSOR | TURN 180 DEG OR PRESS [H] TO TOGGLE VIEW',
      w / 2,
      footerY + 52
    );
    ctx.textAlign = 'left';
  }

  _createStructure() {
    // 1. Display Screen with Canvas Texture
    const boardGeo = new THREE.PlaneGeometry(this.width, this.height);
    const boardMat = this.canvasTexture
      ? new THREE.MeshBasicMaterial({
        map: this.canvasTexture,
        toneMapped: false,
        side: THREE.DoubleSide
      })
      : new THREE.MeshStandardMaterial({
        color: 0x070f22,
        roughness: 0.4
      });

    this.boardMesh = new THREE.Mesh(boardGeo, boardMat);
    this.boardMesh.name = 'ControlsBillboardScreen';
    // Rotate 180 degrees around Y so normal faces -Z (toward spectator at Z=420)
    this.boardMesh.rotation.y = Math.PI;
    this.boardMesh.position.set(0, 0, 0);
    this.boardMesh.layers.set(LAYER_DEFAULT);
    this.boardMesh.layers.enable(LAYER_REFLECTION);
    this.group.add(this.boardMesh);

    // 2. Heavy Industrial Backing Chassis
    const backGeo = new THREE.BoxGeometry(
      this.width + 1.0,
      this.height + 1.0,
      0.6
    );
    const backMat = new THREE.MeshStandardMaterial({
      color: 0x080e1a,
      metalness: 0.9,
      roughness: 0.25
    });
    this.backMesh = new THREE.Mesh(backGeo, backMat);
    this.backMesh.name = 'ControlsBillboardBackChassis';
    // Placed slightly behind screen (+Z direction)
    this.backMesh.position.set(0, 0, 0.35);
    this.backMesh.layers.set(LAYER_DEFAULT);
    this.group.add(this.backMesh);

    // 3. Glowing Outer Frame Trim (Clean rectangular border using EdgesGeometry)
    const frameBox = new THREE.BoxGeometry(
      this.width + 1.4,
      this.height + 1.4,
      0.3
    );
    const frameGeo = new THREE.EdgesGeometry(frameBox);
    frameBox.dispose();
    const frameMat = new THREE.LineBasicMaterial({
      color: 0x00e5ff,
      linewidth: 3
    });
    this.frameMesh = new THREE.LineSegments(
      frameGeo,
      frameMat
    );
    this.frameMesh.name = 'ControlsBillboardFrame';
    this.frameMesh.position.set(0, 0, 0.15);
    this.frameMesh.layers.set(LAYER_DEFAULT);
    this.group.add(this.frameMesh);

    // 4. Support Pillars anchoring into the water (Y = 0, placed at Z = 1.4 well behind screen)
    const pillarHeight = this.height + 12;
    const pillarGeo = new THREE.CylinderGeometry(0.5, 0.5, pillarHeight, 16);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x121826,
      metalness: 0.92,
      roughness: 0.22
    });

    const pillarXOffsets = [-this.width * 0.48, this.width * 0.48];
    for (const px of pillarXOffsets) {
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.name = `ControlsBillboardPillar_${px > 0 ? 'Right' : 'Left'}`;
      pillar.position.set(px, -2, 1.4);
      pillar.layers.set(LAYER_DEFAULT);
      pillar.layers.enable(LAYER_REFLECTION);
      this.group.add(pillar);
      this.pillars.push(pillar);
    }

    // 5. Horizontal Crossbeams behind chassis (Z = 1.4)
    const crossBeamGeo = new THREE.CylinderGeometry(
      0.3,
      0.3,
      this.width * 0.96,
      12
    );
    const crossBeamMat = new THREE.MeshStandardMaterial({
      color: 0x0e1422,
      metalness: 0.85,
      roughness: 0.3
    });

    const crossBeam1 = new THREE.Mesh(crossBeamGeo, crossBeamMat);
    crossBeam1.rotation.z = Math.PI / 2;
    crossBeam1.position.set(0, this.height * 0.3, 1.4);
    crossBeam1.layers.set(LAYER_DEFAULT);
    this.group.add(crossBeam1);
    this.crossBeams.push(crossBeam1);

    const crossBeam2 = new THREE.Mesh(crossBeamGeo, crossBeamMat);
    crossBeam2.rotation.z = Math.PI / 2;
    crossBeam2.position.set(0, -this.height * 0.3, 1.4);
    crossBeam2.layers.set(LAYER_DEFAULT);
    this.group.add(crossBeam2);
    this.crossBeams.push(crossBeam2);
  }

  update(deltaTime) {
    // Static billboard - no expensive calculations per frame
  }

  dispose() {
    if (this.canvasTexture) {
      this.canvasTexture.dispose();
      this.canvasTexture = null;
    }

    if (this.boardMesh) {
      if (this.boardMesh.geometry) {
        this.boardMesh.geometry.dispose();
      }
      if (this.boardMesh.material) {
        this.boardMesh.material.dispose();
      }
    }

    if (this.backMesh) {
      if (this.backMesh.geometry) {
        this.backMesh.geometry.dispose();
      }
      if (this.backMesh.material) {
        this.backMesh.material.dispose();
      }
    }

    if (this.frameMesh) {
      if (this.frameMesh.geometry) {
        this.frameMesh.geometry.dispose();
      }
      if (this.frameMesh.material) {
        this.frameMesh.material.dispose();
      }
    }

    for (const pillar of this.pillars) {
      if (pillar.geometry) {
        pillar.geometry.dispose();
      }
      if (pillar.material) {
        pillar.material.dispose();
      }
    }
    this.pillars = [];

    for (const beam of this.crossBeams) {
      if (beam.geometry) {
        beam.geometry.dispose();
      }
      if (beam.material) {
        beam.material.dispose();
      }
    }
    this.crossBeams = [];

    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      if (child.geometry) {
        child.geometry.dispose();
      }
      if (child.material) {
        child.material.dispose();
      }
      this.group.remove(child);
    }
  }
}
