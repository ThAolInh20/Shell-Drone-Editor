import { t } from '../config/lang/i18n.js';

export class TimelineContextMenu {
  constructor(timelineEditor) {
    this.timelineEditor = timelineEditor;
    this.menuElement = null;
    this.isVisible = false;
    this.actions = [];
    this.currentContext = null;

    this.onDocumentClick = this.onDocumentClick.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onWindowScroll = this.onWindowScroll.bind(this);

    this.initDOM();
    this.registerDefaultActions();
    this.bindEvents();
  }

  initDOM() {
    this.menuElement = document.createElement('div');
    this.menuElement.className = 'timeline-context-menu';
    this.menuElement.style.position = 'fixed';
    this.menuElement.style.display = 'none';
    this.menuElement.style.zIndex = '2000';
    this.menuElement.style.background = 'rgba(25, 30, 38, 0.96)';
    this.menuElement.style.border = '1px solid #4a5568';
    this.menuElement.style.borderRadius = '6px';
    this.menuElement.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.5)';
    this.menuElement.style.backdropFilter = 'blur(8px)';
    this.menuElement.style.padding = '4px 0';
    this.menuElement.style.minWidth = '200px';
    this.menuElement.style.userSelect = 'none';
    this.menuElement.style.fontFamily = 'sans-serif';
    this.menuElement.style.fontSize = '12px';
    this.menuElement.style.color = '#ffffff';

    document.body.appendChild(this.menuElement);
  }

  bindEvents() {
    window.addEventListener(
      'pointerdown',
      this.onDocumentClick,
      true
    );
    window.addEventListener(
      'keydown',
      this.onKeyDown
    );
    window.addEventListener(
      'wheel',
      this.onWindowScroll,
      {
        passive: true
      }
    );
  }

  onDocumentClick(e) {
    if (
      this.isVisible &&
      this.menuElement &&
      !this.menuElement.contains(e.target)
    ) {
      this.hide();
    }
  }

  onKeyDown(e) {
    if (this.isVisible && e.key === 'Escape') {
      this.hide();
    }
  }

  onWindowScroll() {
    if (this.isVisible) {
      this.hide();
    }
  }

  registerAction(action) {
    this.actions.push(action);
  }

  registerDefaultActions() {
    this.registerAction({
      id: 'group',
      label: () => {
        return t('editor.timelinePanel.groupBtn') || 'Group';
      },
      shortcut: 'Ctrl+G',
      isVisible: (context) => {
        return Boolean(
          context &&
          context.selectedEvents &&
          context.selectedEvents.length >= 2
        );
      },
      isEnabled: (context) => {
        return Boolean(
          context &&
          context.selectedEvents &&
          context.selectedEvents.length >= 2
        );
      },
      execute: (context) => {
        if (context.timelineEditor) {
          context.timelineEditor.groupSelected();
        }
      }
    });

    this.registerAction({
      id: 'ungroup',
      label: () => {
        return t('editor.timelinePanel.ungroupBtn') || 'Ungroup';
      },
      shortcut: 'Ctrl+Shift+G',
      isVisible: (context) => {
        return Boolean(
          context &&
          context.selectedEvents &&
          context.selectedEvents.some((s) => s.type === 'group')
        );
      },
      isEnabled: (context) => {
        return Boolean(
          context &&
          context.selectedEvents &&
          context.selectedEvents.some((s) => s.type === 'group')
        );
      },
      execute: (context) => {
        if (context.timelineEditor) {
          context.timelineEditor.ungroupSelected();
        }
      }
    });

    this.registerAction({
      isSeparator: true,
      isVisible: (context) => {
        return Boolean(
          context &&
          context.selectedEvents &&
          (
            context.selectedEvents.length >= 2 ||
            context.selectedEvents.some((s) => s.type === 'group')
          )
        );
      }
    });

    this.registerAction({
      id: 'export-selected',
      label: () => {
        return t('editor.timelinePanel.exportSelected') ||
          'Export selected blocks';
      },
      shortcut: '',
      isVisible: (context) => {
        return Boolean(
          context &&
          context.selectedEvents &&
          context.selectedEvents.length > 0
        );
      },
      isEnabled: (context) => {
        return Boolean(
          context &&
          context.selectedEvents &&
          context.selectedEvents.length > 0
        );
      },
      execute: (context) => {
        if (context.timelineEditor) {
          context.timelineEditor.exportSequence(true);
        }
      }
    });
  }

  show(x, y, context) {
    this.currentContext = context;
    this.menuElement.innerHTML = '';

    const visibleActions = this.actions.filter(
      (action) => {
        if (typeof action.isVisible === 'function') {
          return action.isVisible(context);
        }
        return true;
      }
    );

    if (visibleActions.length === 0) {
      this.hide();
      return;
    }

    visibleActions.forEach(
      (action) => {
        if (action.isSeparator) {
          const sep = document.createElement('div');
          sep.style.height = '1px';
          sep.style.background = '#374151';
          sep.style.margin = '4px 0';
          this.menuElement.appendChild(sep);
          return;
        }

        const item = document.createElement('div');
        item.className = 'timeline-context-menu-item';
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.justifyContent = 'space-between';
        item.style.padding = '8px 14px';
        item.style.cursor = 'pointer';
        item.style.transition = 'background 0.15s ease';

        const isEnabled = typeof action.isEnabled === 'function'
          ? action.isEnabled(context)
          : true;

        if (!isEnabled) {
          item.style.opacity = '0.45';
          item.style.cursor = 'not-allowed';
        } else {
          item.addEventListener(
            'mouseenter',
            () => {
              item.style.background = '#2563eb';
            }
          );
          item.addEventListener(
            'mouseleave',
            () => {
              item.style.background = 'transparent';
            }
          );
          item.addEventListener(
            'click',
            (e) => {
              e.stopPropagation();
              this.hide();
              action.execute(context);
            }
          );
        }

        const labelText = typeof action.label === 'function'
          ? action.label()
          : action.label;
        const labelSpan = document.createElement('span');
        labelSpan.textContent = labelText;
        item.appendChild(labelSpan);

        if (action.shortcut) {
          const shortcutSpan = document.createElement('span');
          shortcutSpan.textContent = action.shortcut;
          shortcutSpan.style.opacity = '0.6';
          shortcutSpan.style.fontSize = '11px';
          shortcutSpan.style.marginLeft = '16px';
          shortcutSpan.style.fontFamily = 'monospace';
          item.appendChild(shortcutSpan);
        }

        this.menuElement.appendChild(item);
      }
    );

    this.menuElement.style.display = 'block';
    this.isVisible = true;

    // Viewport bounds checking and clamping
    const rect = this.menuElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let posX = x;
    let posY = y;

    if (posX + rect.width > viewportWidth) {
      posX = Math.max(10, viewportWidth - rect.width - 10);
    }
    if (posY + rect.height > viewportHeight) {
      posY = Math.max(10, viewportHeight - rect.height - 10);
    }

    this.menuElement.style.left = `${posX}px`;
    this.menuElement.style.top = `${posY}px`;
  }

  hide() {
    if (!this.isVisible) return;
    this.menuElement.style.display = 'none';
    this.isVisible = false;
    this.currentContext = null;
  }

  destroy() {
    window.removeEventListener(
      'pointerdown',
      this.onDocumentClick,
      true
    );
    window.removeEventListener(
      'keydown',
      this.onKeyDown
    );
    window.removeEventListener(
      'wheel',
      this.onWindowScroll
    );
    if (this.menuElement && this.menuElement.parentNode) {
      this.menuElement.parentNode.removeChild(this.menuElement);
    }
  }
}
