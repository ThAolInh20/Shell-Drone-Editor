export class PerformanceMonitor {
  constructor() {
    this.fps = 0;
    this.frameTime = 0;
    this.memory = null;
    this.deltaAccumulator = 0;
    this.frameCount = 0;
    this.createOverlay();
  }

  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.style.position = 'absolute';
    this.overlay.style.top = '12px';
    this.overlay.style.right = '12px';
    this.overlay.style.padding = '8px 12px';
    this.overlay.style.background = 'rgba(0, 0, 0, 0.55)';
    this.overlay.style.color = '#fff';
    this.overlay.style.fontFamily = 'monospace';
    this.overlay.style.fontSize = '12px';
    this.overlay.style.lineHeight = '1.4';
    this.overlay.style.borderRadius = '8px';
    this.overlay.style.zIndex = '999';
    this.overlay.style.pointerEvents = 'none';
    this.overlay.innerHTML = 'FPS: --<br>Frame: -- ms<br>Memory: --';
    document.body.appendChild(this.overlay);
  }

  update(deltaTime) {
    this.frameCount += 1;
    this.deltaAccumulator += deltaTime;
    this.frameTime = Math.round(deltaTime * 1000);

    if (performance && performance.memory) {
      const memory = performance.memory;
      this.memory = Math.round((memory.usedJSHeapSize / 1024 / 1024) * 100) / 100;
    }

    if (this.deltaAccumulator >= 1.0) {
      this.fps = Math.round((this.frameCount / this.deltaAccumulator) * 10) / 10;
      this.deltaAccumulator = 0;
      this.frameCount = 0;
      this.renderStats();
    }
  }

  renderStats() {
    this.overlay.innerHTML = `FPS: ${this.getFPS()}<br>Frame: ${this.getFrameTime()} ms<br>Memory: ${this.getMemoryUsage()}`;
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
