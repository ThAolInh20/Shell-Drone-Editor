export class HotkeyManager {
  constructor() {
    this.bindings = new Map();
    this.activeContext = 'global';
    this.globalKeyListener = (event) => {
      this.handleKeyDown(event);
    };
    window.addEventListener(
      'keydown',
      this.globalKeyListener
    );
    window.hotkeyManager = this;
  }

  setActiveContext(context) {
    this.activeContext = context;
  }

  register(
    context,
    combo,
    callback
  ) {
    if (!this.bindings.has(context)) {
      this.bindings.set(
        context,
        new Map()
      );
    }
    const normalizedCombo = this.normalizeCombo(combo);
    this.bindings.get(context).set(
      normalizedCombo,
      callback
    );
  }

  unregisterContext(context) {
    this.bindings.delete(context);
  }

  destroy() {
    window.removeEventListener(
      'keydown',
      this.globalKeyListener
    );
  }

  normalizeCombo(combo) {
    return combo
      .toLowerCase()
      .split('+')
      .map((k) => {
        return k.trim();
      })
      .sort()
      .join('+');
  }

  handleKeyDown(event) {
    const target = event.target;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'SELECT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return;
    }

    const parts = [];
    if (event.ctrlKey || event.metaKey) {
      parts.push('ctrl');
    }
    if (event.shiftKey) {
      parts.push('shift');
    }
    if (event.altKey) {
      parts.push('alt');
    }

    const key = event.key.toLowerCase();
    
    if (
      key !== 'control' &&
      key !== 'meta' &&
      key !== 'shift' &&
      key !== 'alt'
    ) {
      let normalizedKey = key;
      if (
        key === ' ' ||
        key === 'spacebar'
      ) {
        normalizedKey = 'space';
      }
      parts.push(normalizedKey);
    } else {
      return;
    }

    const combo = parts.sort().join('+');

    let callback = this.findCallback(
      this.activeContext,
      combo
    );
    if (!callback) {
      callback = this.findCallback(
        'global',
        combo
      );
    }

    if (!callback && event.code) {
      const codeParts = [];
      if (event.ctrlKey || event.metaKey) {
        codeParts.push('ctrl');
      }
      if (event.shiftKey) {
        codeParts.push('shift');
      }
      if (event.altKey) {
        codeParts.push('alt');
      }

      let codeKey = event.code.toLowerCase();
      if (codeKey.startsWith('key')) {
        codeKey = codeKey.slice(3);
      } else if (codeKey.startsWith('digit')) {
        codeKey = codeKey.slice(5);
      } else if (codeKey === 'space') {
        codeKey = 'space';
      }
      
      if (
        codeKey !== 'controlleft' &&
        codeKey !== 'controlright' &&
        codeKey !== 'shiftleft' &&
        codeKey !== 'shiftright' &&
        codeKey !== 'altleft' &&
        codeKey !== 'altright' &&
        codeKey !== 'metaleft' &&
        codeKey !== 'metaright'
      ) {
        codeParts.push(codeKey);
        const codeCombo = codeParts.sort().join('+');
        callback = this.findCallback(
          this.activeContext,
          codeCombo
        );
        if (!callback) {
          callback = this.findCallback(
            'global',
            codeCombo
          );
        }
      }
    }

    if (callback) {
      event.preventDefault();
      callback(event);
    }
  }

  findCallback(
    context,
    combo
  ) {
    const contextMap = this.bindings.get(context);
    if (!contextMap) {
      return null;
    }
    return contextMap.get(combo);
  }
}
