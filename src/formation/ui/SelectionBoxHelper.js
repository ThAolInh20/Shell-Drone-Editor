export class SelectionBoxHelper {
  constructor() {
    this.el = document.createElement('div');
    this.el.style.position = 'absolute';
    this.el.style.border = '1.5px dashed #3a86ff';
    this.el.style.backgroundColor = 'rgba(58, 134, 255, 0.15)';
    this.el.style.borderRadius = '2px';
    this.el.style.boxShadow = '0 0 8px rgba(58, 134, 255, 0.4)';
    this.el.style.pointerEvents = 'none';
    this.el.style.zIndex = '99999';
    this.el.style.display = 'none';
    document.body.appendChild(this.el);
  }

  show(
    x,
    y
  ) {
    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;
    this.el.style.width = '0px';
    this.el.style.height = '0px';
    this.el.style.display = 'block';
  }

  update(
    startX,
    startY,
    currentX,
    currentY
  ) {
    const left = Math.min(
      startX,
      currentX
    );
    const top = Math.min(
      startY,
      currentY
    );
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    this.el.style.left = `${left}px`;
    this.el.style.top = `${top}px`;
    this.el.style.width = `${width}px`;
    this.el.style.height = `${height}px`;
  }

  hide() {
    this.el.style.display = 'none';
  }

  destroy() {
    if (this.el && this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
  }
}
