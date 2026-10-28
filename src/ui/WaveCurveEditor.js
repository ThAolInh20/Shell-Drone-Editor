/**
 * WaveCurveEditor.js
 * Interactive canvas widget for visually editing 2D wave trajectories,
 * apex heights, and launch angles for sweep firework patterns.
 */

import {
  DEFAULT_WAVE_POINTS,
  evaluateWaveCurve,
  sanitizeWavePoints
} from '../utils/SplineMath.js';
import { t } from '../config/lang/i18n.js';

export class WaveCurveEditor {
  /**
   * @param {Object} options
   * @param {Array} [options.points] Initial control points
   * @param {number} [options.shellCount=12] Number of shells to preview along curve
   * @param {Function} [options.onChange] Callback on curve change: (points) => {}
   */
  constructor(options = {}) {
    this.points = sanitizeWavePoints(options.points || DEFAULT_WAVE_POINTS);
    this.shellCount = Math.max(2, options.shellCount || 12);
    this.onChange = typeof options.onChange === 'function' ? options.onChange : () => {};

    this.dragTarget = null; // { type: 'vertex' | 'angle', index: number }
    this.hoverTarget = null;
    this.selectedIndex = 1; // default to first interior point if available

    this.container = document.createElement('div');
    this.container.className = 'wave-curve-editor-container';

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'wave-curve-canvas';
    this.ctx = this.canvas.getContext('2d');

    this.padding = 16;
    this.width = 280;
    this.height = 160;

    this.setupUI();
    this.bindEvents();
    this.render();
  }

  setupUI() {
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.container.style.gap = '8px';
    this.container.style.width = '100%';
    this.container.style.boxSizing = 'border-box';

    // Canvas styling
    this.canvas.tabIndex = 0;
    this.canvas.style.width = '100%';
    this.canvas.style.height = `${this.height}px`;
    this.canvas.style.background = '#0d1117';
    this.canvas.style.borderRadius = '6px';
    this.canvas.style.border = '1px solid #30363d';
    this.canvas.style.cursor = 'crosshair';
    this.canvas.style.touchAction = 'none';
    this.canvas.style.outline = 'none';

    this.container.appendChild(this.canvas);

    // Primary action buttons (Add / Delete Point)
    const actionsRow = document.createElement('div');
    actionsRow.style.display = 'flex';
    actionsRow.style.alignItems = 'center';
    actionsRow.style.gap = '6px';

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.textContent = t('editor.inspector.waveCurve.addPoint') || '+ Add Peak';
    addBtn.style.padding = '4px 10px';
    addBtn.style.fontSize = '11px';
    addBtn.style.fontWeight = '500';
    addBtn.style.background = '#238636';
    addBtn.style.color = '#ffffff';
    addBtn.style.border = '1px solid rgba(240, 246, 252, 0.1)';
    addBtn.style.borderRadius = '4px';
    addBtn.style.cursor = 'pointer';
    addBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.addPoint();
    });

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = t('editor.inspector.waveCurve.deletePoint') || '- Delete Peak';
    removeBtn.style.padding = '4px 10px';
    removeBtn.style.fontSize = '11px';
    removeBtn.style.fontWeight = '500';
    removeBtn.style.background = '#21262d';
    removeBtn.style.color = '#f85149';
    removeBtn.style.border = '1px solid #30363d';
    removeBtn.style.borderRadius = '4px';
    removeBtn.style.cursor = 'pointer';
    removeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.removePoint();
    });

    actionsRow.appendChild(addBtn);
    actionsRow.appendChild(removeBtn);
    this.container.appendChild(actionsRow);

    // Preset buttons toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'wave-curve-toolbar';
    toolbar.style.display = 'flex';
    toolbar.style.flexWrap = 'wrap';
    toolbar.style.gap = '4px';

    const presets = [
      {
        label: t('editor.inspector.waveCurve.arch') || 'Arch',
        points: [
          { x: 0.0, y: 0.35, angle: 0.28 },
          { x: 0.5, y: 0.88, angle: 0.0 },
          { x: 1.0, y: 0.35, angle: -0.28 }
        ]
      },
      {
        label: t('editor.inspector.waveCurve.doublePeak') || 'Double Peak',
        points: [
          { x: 0.0, y: 0.40, angle: 0.25 },
          { x: 0.28, y: 0.85, angle: 0.0 },
          { x: 0.50, y: 0.35, angle: 0.0 },
          { x: 0.72, y: 0.85, angle: 0.0 },
          { x: 1.0, y: 0.40, angle: -0.25 }
        ]
      },
      {
        label: t('editor.inspector.waveCurve.wave') || 'Wave',
        points: [
          { x: 0.0, y: 0.30, angle: 0.20 },
          { x: 0.25, y: 0.85, angle: 0.10 },
          { x: 0.50, y: 0.50, angle: -0.10 },
          { x: 0.75, y: 0.20, angle: -0.20 },
          { x: 1.0, y: 0.75, angle: 0.15 }
        ]
      },
      {
        label: t('editor.inspector.waveCurve.slope') || 'Slope',
        points: [
          { x: 0.0, y: 0.25, angle: 0.15 },
          { x: 0.5, y: 0.55, angle: 0.0 },
          { x: 1.0, y: 0.90, angle: -0.15 }
        ]
      }
    ];

    presets.forEach(p => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = p.label;
      btn.style.padding = '3px 8px';
      btn.style.fontSize = '11px';
      btn.style.background = '#21262d';
      btn.style.color = '#c9d1d9';
      btn.style.border = '1px solid #30363d';
      btn.style.borderRadius = '4px';
      btn.style.cursor = 'pointer';
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.setPoints(p.points);
      });
      toolbar.appendChild(btn);
    });

    this.container.appendChild(toolbar);

    // Hint label
    const hint = document.createElement('div');
    hint.style.fontSize = '10px';
    hint.style.color = '#8b949e';
    hint.style.lineHeight = '1.4';
    hint.textContent = t('editor.inspector.waveCurve.hint') ||
      'Drag point to adjust position and height, drag handle to set angle. Click point to select, use buttons to add or delete.';
    this.container.appendChild(hint);
  }

  addPoint() {
    if (this.points.length >= 16) return;

    // Find the largest gap in X between consecutive points
    let maxGap = -1;
    let bestIdx = 0;
    for (let i = 0; i < this.points.length - 1; i++) {
      const gap = this.points[i + 1].x - this.points[i].x;
      if (gap > maxGap) {
        maxGap = gap;
        bestIdx = i;
      }
    }

    const newX = Number(((this.points[bestIdx].x + this.points[bestIdx + 1].x) / 2).toFixed(3));
    const evaluated = evaluateWaveCurve(this.points, newX);
    const newPoint = {
      x: newX,
      y: Number(evaluated.y.toFixed(3)),
      angle: Number(evaluated.angle.toFixed(3))
    };

    this.points.splice(bestIdx + 1, 0, newPoint);
    this.selectedIndex = bestIdx + 1;
    this.render();
    this.onChange(this.getCleanPoints());
  }

  removePoint() {
    if (this.points.length <= 2) return;

    let idxToRemove = this.selectedIndex;
    // Boundary points (index 0 and length - 1) cannot be removed
    if (idxToRemove <= 0 || idxToRemove >= this.points.length - 1) {
      let closestDist = Infinity;
      for (let i = 1; i < this.points.length - 1; i++) {
        const dist = Math.abs(this.points[i].x - 0.5);
        if (dist < closestDist) {
          closestDist = dist;
          idxToRemove = i;
        }
      }
    }

    if (idxToRemove > 0 && idxToRemove < this.points.length - 1) {
      this.points.splice(idxToRemove, 1);
      this.selectedIndex = Math.min(idxToRemove, this.points.length - 2);
      this.render();
      this.onChange(this.getCleanPoints());
    }
  }

  setPoints(newPoints) {
    this.points = sanitizeWavePoints(newPoints);
    this.selectedIndex = Math.min(this.selectedIndex, this.points.length - 1);
    this.render();
    this.onChange(this.getCleanPoints());
  }

  setShellCount(count) {
    this.shellCount = Math.max(2, count || 12);
    this.render();
  }

  getCleanPoints() {
    return this.points.map(p => ({
      x: Number(p.x.toFixed(3)),
      y: Number(p.y.toFixed(3)),
      angle: Number(p.angle.toFixed(3))
    }));
  }

  toPixel(normX, normY) {
    const drawW = this.canvas.width - this.padding * 2;
    const drawH = this.canvas.height - this.padding * 2;
    const px = this.padding + normX * drawW;
    const py = this.canvas.height - this.padding - normY * drawH;
    return { px, py };
  }

  toNormalized(pixelX, pixelY) {
    const drawW = this.canvas.width - this.padding * 2;
    const drawH = this.canvas.height - this.padding * 2;
    const normX = Math.max(0.0, Math.min(1.0, (pixelX - this.padding) / drawW));
    const normY = Math.max(0.05, Math.min(1.0, (this.canvas.height - this.padding - pixelY) / drawH));
    return { normX, normY };
  }

  bindEvents() {
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    };

    const findHit = (pos) => {
      const handleLen = 26;
      for (let i = 0; i < this.points.length; i++) {
        const pt = this.points[i];
        const { px, py } = this.toPixel(pt.x, pt.y);

        // Check angle handle
        const handleX = px + Math.sin(pt.angle) * handleLen;
        const handleY = py - Math.cos(pt.angle) * handleLen;
        const distHandle = Math.hypot(pos.x - handleX, pos.y - handleY);
        if (distHandle <= 9) {
          return { type: 'angle', index: i };
        }

        // Check vertex
        const distVertex = Math.hypot(pos.x - px, pos.y - py);
        if (distVertex <= 10) {
          return { type: 'vertex', index: i };
        }
      }
      return null;
    };

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 2) return; // handled in contextmenu
      const pos = getPos(e);
      const hit = findHit(pos);
      if (hit) {
        this.dragTarget = hit;
        this.selectedIndex = hit.index;
        this.render();
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.dragTarget) {
        const pos = getPos(e);
        const hit = findHit(pos);
        if (hit) {
          this.canvas.style.cursor = hit.type === 'angle' ? 'grab' : 'move';
        } else {
          this.canvas.style.cursor = 'crosshair';
        }
        return;
      }

      const pos = getPos(e);
      const idx = this.dragTarget.index;
      const pt = this.points[idx];

      if (this.dragTarget.type === 'vertex') {
        const { normX, normY } = this.toNormalized(pos.x, pos.y);
        // First point fixed at x=0, last at x=1
        if (idx === 0) {
          pt.x = 0.0;
        } else if (idx === this.points.length - 1) {
          pt.x = 1.0;
        } else {
          const minX = this.points[idx - 1].x + 0.02;
          const maxX = this.points[idx + 1].x - 0.02;
          pt.x = Math.max(minX, Math.min(maxX, normX));
        }
        pt.y = normY;
      } else if (this.dragTarget.type === 'angle') {
        const { px, py } = this.toPixel(pt.x, pt.y);
        const dx = pos.x - px;
        const dy = -(pos.y - py);
        let computedAngle = Math.atan2(dx, dy);
        if (dy < 0) {
          computedAngle = dx >= 0 ? (Math.PI / 2) : (-Math.PI / 2);
        } else {
          computedAngle = Math.max(
            -Math.PI / 2,
            Math.min(Math.PI / 2, computedAngle)
          );
        }
        pt.angle = computedAngle;
      }

      this.render();
      this.onChange(this.getCleanPoints());
    });

    window.addEventListener('mouseup', () => {
      if (this.dragTarget) {
        this.dragTarget = null;
        this.onChange(this.getCleanPoints());
      }
    });

    // Keyboard support: Delete or Backspace to delete selected vertex
    this.canvas.addEventListener('keydown', (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        this.removePoint();
      }
    });

    // Double click to insert a point
    this.canvas.addEventListener('dblclick', (e) => {
      const pos = getPos(e);
      const { normX, normY } = this.toNormalized(pos.x, pos.y);

      if (normX < 0.05 || normX > 0.95) return;
      for (const p of this.points) {
        if (Math.abs(p.x - normX) < 0.04) return;
      }

      const evaluated = evaluateWaveCurve(this.points, normX);
      this.points.push({
        x: normX,
        y: normY,
        angle: evaluated.angle
      });
      this.points.sort((a, b) => a.x - b.x);
      this.selectedIndex = this.points.findIndex(p => Math.abs(p.x - normX) < 0.001);
      this.render();
      this.onChange(this.getCleanPoints());
    });

    // Right click to delete a point
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const pos = getPos(e);
      const hit = findHit(pos);
      if (hit && hit.type === 'vertex') {
        if (hit.index > 0 && hit.index < this.points.length - 1 && this.points.length > 2) {
          this.points.splice(hit.index, 1);
          this.selectedIndex = Math.min(hit.index, this.points.length - 2);
          this.render();
          this.onChange(this.getCleanPoints());
        }
      }
    });
  }

  render() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    const w = (rect.width || this.width);
    const h = (rect.height || this.height);

    if (this.canvas.width !== Math.round(w * dpr) || this.canvas.height !== Math.round(h * dpr)) {
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
    }

    const ctx = this.ctx;
    ctx.save();
    ctx.scale(dpr, dpr);

    const canvasW = w;
    const canvasH = h;
    const pad = this.padding;
    const drawW = canvasW - pad * 2;
    const drawH = canvasH - pad * 2;

    // Background
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Horizontal Grid Lines
    const gridSteps = [0.25, 0.5, 0.75, 1.0];
    ctx.strokeStyle = '#21262d';
    ctx.lineWidth = 1;
    gridSteps.forEach(ratio => {
      const y = canvasH - pad - ratio * drawH;
      ctx.beginPath();
      ctx.moveTo(pad, y);
      ctx.lineTo(canvasW - pad, y);
      ctx.stroke();

      // Labels
      ctx.fillStyle = '#484f58';
      ctx.font = '9px sans-serif';
      ctx.fillText(`${Math.round(ratio * 100)}%`, pad + 2, y - 2);
    });

    // Ground line (0%)
    const groundY = canvasH - pad;
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pad, groundY);
    ctx.lineTo(canvasW - pad, groundY);
    ctx.stroke();

    // Draw Smooth Wave Curve
    const steps = 70;
    ctx.beginPath();
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const res = evaluateWaveCurve(this.points, t);
      const px = pad + res.x * drawW;
      const py = canvasH - pad - res.y * drawH;
      if (s === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }

    // Gradient stroke for curve
    const grad = ctx.createLinearGradient(pad, 0, canvasW - pad, 0);
    grad.addColorStop(0, '#58a6ff');
    grad.addColorStop(0.5, '#79c0ff');
    grad.addColorStop(1, '#a5d6ff');

    ctx.strokeStyle = grad;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#58a6ff';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0; // reset

    // Draw Shell Preview Dots along the curve
    if (this.shellCount > 1) {
      for (let sc = 0; sc < this.shellCount; sc++) {
        const progress = sc / (this.shellCount - 1);
        const evalPt = evaluateWaveCurve(this.points, progress);
        const px = pad + evalPt.x * drawW;
        const py = canvasH - pad - evalPt.y * drawH;

        ctx.fillStyle = '#ff7b72';
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw Selected Point Info at top-right
    if (this.selectedIndex !== null && this.points[this.selectedIndex]) {
      const selPt = this.points[this.selectedIndex];
      const deg = Math.round(selPt.angle * 180 / Math.PI);
      ctx.fillStyle = '#79c0ff';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(
        `#${this.selectedIndex + 1} X:${Math.round(selPt.x * 100)}% Y:${Math.round(selPt.y * 100)}% ${deg}°`,
        canvasW - pad,
        pad - 4
      );
      ctx.textAlign = 'left';
    }

    // Draw Control Points & Angle Handles
    const handleLen = 22;
    for (let i = 0; i < this.points.length; i++) {
      const pt = this.points[i];
      const px = pad + pt.x * drawW;
      const py = canvasH - pad - pt.y * drawH;
      const isSelected = i === this.selectedIndex;

      // Angle vector lever
      const handleX = px + Math.sin(pt.angle) * handleLen;
      const handleY = py - Math.cos(pt.angle) * handleLen;

      // Lever line
      ctx.strokeStyle = isSelected ? '#fbbf24' : '#e3b341';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(handleX, handleY);
      ctx.stroke();

      // Lever handle knob
      ctx.fillStyle = isSelected ? '#fde68a' : '#f2cc60';
      ctx.beginPath();
      ctx.arc(handleX, handleY, isSelected ? 4.5 : 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Vertex point halo / selection ring
      if (isSelected) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, 9.5, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.beginPath();
        ctx.arc(px, py, 8, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(88, 166, 255, 0.25)';
        ctx.beginPath();
        ctx.arc(px, py, 7, 0, Math.PI * 2);
        ctx.fill();
      }

      // Vertex point core
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = isSelected ? '#0284c7' : '#1f6feb';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  getElement() {
    return this.container;
  }

  destroy() {
    this.container.remove();
  }
}
