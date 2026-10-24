import { renderingConfig } from '../config/rendering.js';

export class PerformanceMonitor {
  constructor() {
    this.fps = 0;
    this.frameTime = 0;
    this.memory = null;
    this.deltaAccumulator = 0;
    this.frameCount = 0;
    this.totalFrames = 0;
    this.fpsDropCount = 0;
    this.createOverlay();
  }

  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'system-perf-overlay';
    this.overlay.style.position = 'fixed';
    this.overlay.style.top = '12px';
    this.overlay.style.left = '12px';
    this.overlay.style.width = '240px';
    this.overlay.style.boxSizing = 'border-box';
    this.overlay.style.padding = '8px 12px';
    this.overlay.style.background = 'rgba(12, 16, 24, 0.85)';
    this.overlay.style.backdropFilter = 'blur(10px)';
    this.overlay.style.border = '1px solid rgba(255, 255, 255, 0.12)';
    this.overlay.style.color = '#fff';
    this.overlay.style.fontFamily = 'monospace';
    this.overlay.style.fontSize = '12px';
    this.overlay.style.lineHeight = '1.4';
    this.overlay.style.borderRadius = '8px';
    this.overlay.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.35)';
    this.overlay.style.zIndex = '999';
    this.overlay.style.pointerEvents = 'none';
    this.overlay.innerHTML = 'FPS: --<br>Frame: -- ms<br>Memory: --<br>FPS Drops: 0';
    document.body.appendChild(this.overlay);
  }

  update(deltaTime) {
    this.frameCount += 1;
    this.totalFrames += 1;
    this.deltaAccumulator += deltaTime;
    this.frameTime = Math.round(deltaTime * 1000);

    if (performance && performance.memory) {
      const memory = performance.memory;
      this.memory = Math.round((memory.usedJSHeapSize / 1024 / 1024) * 100) / 100;
    }

    if (this.deltaAccumulator >= 1.0) {
      this.fps = Math.round((this.frameCount / this.deltaAccumulator) * 10) / 10;
      
      const perfConfig = renderingConfig.performance || {
        fpsThreshold: 70,
        minFrameCount: 40
      };
      
      if (this.totalFrames > perfConfig.minFrameCount) {
        if (this.fps < perfConfig.fpsThreshold) {
          this.fpsDropCount += 1;
        }
      }

      this.deltaAccumulator = 0;
      this.frameCount = 0;
      this.renderStats();
    }
  }

  renderStats() {
    this.overlay.innerHTML = `FPS: ${this.getFPS()}<br>Frame: ${this.getFrameTime()} ms<br>Memory: ${this.getMemoryUsage()}<br>FPS Drops: ${this.fpsDropCount}`;
  }

  getFPS() {
    return this.fps.toFixed ? this.fps.toFixed(1) : this.fps;
  }

  getFrameTime() {
    return this.frameTime;
  }

  getMemoryUsage() {
    return this.memory !== null ? `${this.memory} MB` : 'n/a';
  }
}
