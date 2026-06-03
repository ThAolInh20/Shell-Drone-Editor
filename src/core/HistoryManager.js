export class HistoryManager {
  constructor(maxSize = 50) {
    this.maxSize = maxSize;
    this.stack = [];
    this.index = -1;
  }

  save(snapshot) {
    if (this.index < this.stack.length - 1) {
      this.stack = this.stack.slice(0, this.index + 1);
    }
    this.stack.push(snapshot);
    if (this.stack.length > this.maxSize) {
      this.stack.shift();
    } else {
      this.index++;
    }
  }

  undo() {
    if (this.index > 0) {
      this.index--;
      return this.stack[this.index];
    }
    return null;
  }

  redo() {
    if (this.index < this.stack.length - 1) {
      this.index++;
      return this.stack[this.index];
    }
    return null;
  }

  clear() {
    this.stack = [];
    this.index = -1;
  }
}
