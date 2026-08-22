import * as THREE from 'three';
import { PropertyInspector } from './PropertyInspector.js';
import demoShow from '../config/sequences/demoShow.json';
import { t } from '../config/lang/i18n.js';
import { globalEventBus } from '../core/EventBus.js';
import { fileStorage } from '../core/FileStorageAdapter.js';
import { customChoicePrompt } from '../editor/ui/utils/Modal.js';


export class TimelineEditor {
  constructor(showDirector, hotkeyManager = null) {
    this.showDirector = showDirector;
    this.hotkeyManager = hotkeyManager;
    this.sequences = JSON.parse(JSON.stringify(demoShow)); // Deep clone to edit safely
    this.pixelsPerSecond = 50;
    this.rowHeight = 30;
    this.minBlockWidth = 20;
    this.visible = false;
    this.dragOffsetX = 0;
    this.isResizing = false;
    this.resizedEvent = null;
    this.resizeOffsetX = 0;
    this.initialDuration = 0;
    this.filename = 'demoShow.json';
    this.anchorTime = 0;
    this.lastBPressTime = 0;
    this.autoScrollEnabled = true;
    this.currentFilePath = null;
    this.undoStack = [];
    this.redoStack = [];
    this.selectedEvents = [];
    this.clipboardEvents = [];

    this.initDOM();
    this.renderTracks();

    // Update playhead on animation frame
    this.updateLoop = this.updatePlayhead.bind(this);
    requestAnimationFrame(this.updateLoop);

    window.addEventListener(
      'timeline:tap-beat',
      () => {
        this.tapBeat();
      }
    );
  }

  initDOM() {
    this.container = document.createElement('div');
    this.container.style.position = 'fixed';
    this.container.style.bottom = '0';
    this.container.style.left = '0';
    this.container.style.width = '100%';
    this.container.style.height = '35%';
    this.container.style.background = 'rgba(10, 15, 20, 0.85)';
    this.container.style.backdropFilter = 'blur(10px)';
    this.container.style.borderTop = '1px solid #444';
    this.container.style.display = 'none';
    this.container.style.flexDirection = 'row';
    this.container.style.zIndex = '1000';
    this.container.style.color = 'white';
    this.container.style.fontFamily = 'sans-serif';

    // Block orbit controls when hovering
    this.container.addEventListener('mouseenter', () => globalEventBus.emit('timeline:hover', true));
    this.container.addEventListener('mouseleave', () => globalEventBus.emit('timeline:hover', false));

    // Resizer handle for adjusting height
    this.resizer = document.createElement('div');
    this.resizer.style.position = 'absolute';
    this.resizer.style.top = '-4px';
    this.resizer.style.left = '0';
    this.resizer.style.width = 'calc(100% - 320px)'; // Tránh đè lên phần Property Inspector bên phải
    this.resizer.style.height = '8px';
    this.resizer.style.cursor = 'ns-resize';
    this.resizer.style.zIndex = '1002';

    let isResizing = false;
    this.resizer.addEventListener('mousedown', (e) => {
      isResizing = true;
      document.body.style.cursor = 'ns-resize';
    });

    window.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      const newHeight = window.innerHeight - e.clientY;
      const boundedHeight = Math.max(100, Math.min(newHeight, window.innerHeight * 0.9));
      this.container.style.height = boundedHeight + 'px';
    });

    window.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        document.body.style.cursor = '';
      }
    });

    this.container.appendChild(this.resizer);

    // Left side: Toolbar & Tracks
    const leftPanel = document.createElement('div');
    leftPanel.style.width = 'calc(100% - 320px)';
    leftPanel.style.display = 'flex';
    leftPanel.style.flexDirection = 'column';
    leftPanel.style.overflow = 'hidden';

    // Toolbar
    const toolbar = document.createElement('div');
    toolbar.style.padding = '10px';
    toolbar.style.background = '#222';
    toolbar.style.borderBottom = '1px solid #444';
    toolbar.style.display = 'flex';
    toolbar.style.gap = '10px';
    toolbar.style.alignItems = 'center';

    const playBtn = document.createElement('button');
    playBtn.textContent = t('editor.timelinePanel.playBtn');
    playBtn.addEventListener('click', () => this.togglePlay());

    this.followBtn = document.createElement('button');
    this.followBtn.textContent = t('editor.timelinePanel.followOn');
    this.followBtn.style.background = '#4CAF50';
    this.followBtn.style.color = 'white';
    this.followBtn.addEventListener('click', () => {
      this.autoScrollEnabled = !this.autoScrollEnabled;
      this.followBtn.textContent = this.autoScrollEnabled ? t('editor.timelinePanel.followOn') : t('editor.timelinePanel.followOff');
      this.followBtn.style.background = this.autoScrollEnabled ? '#4CAF50' : '#f44336';
    });


    const addBtn = document.createElement('button');
    addBtn.textContent = t('editor.timelinePanel.addSequence');
    addBtn.addEventListener('click', () => this.addSequence(this.anchorTime));

    const saveBtn = document.createElement('button');
    saveBtn.textContent = t('editor.timelinePanel.saveBtn');
    saveBtn.style.background = '#2e7d32';
    saveBtn.style.color = 'white';
    saveBtn.addEventListener('click', () => this.saveSequence());

    const exportContainer = document.createElement('div');
    exportContainer.style.position = 'relative';
    exportContainer.style.display = 'inline-block';

    const exportBtn = document.createElement('button');
    exportBtn.textContent = t('editor.timelinePanel.exportBtn');
    exportBtn.style.background = '#00897b';
    exportBtn.style.color = 'white';
    exportContainer.appendChild(exportBtn);

    let exportDropdown = null;

    const closeExportDropdown = () => {
      if (exportDropdown) {
        exportDropdown.remove();
        exportDropdown = null;
        document.removeEventListener('click', closeExportDropdown);
      }
    };

    exportBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (exportDropdown) {
        closeExportDropdown();
        return;
      }

      exportDropdown = document.createElement('div');
      exportDropdown.style.position = 'absolute';
      exportDropdown.style.top = '100%';
      exportDropdown.style.left = '0';
      exportDropdown.style.background = '#1e1e1e';
      exportDropdown.style.border = '1px solid #444';
      exportDropdown.style.borderRadius = '4px';
      exportDropdown.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
      exportDropdown.style.zIndex = '2000';
      exportDropdown.style.minWidth = '220px';
      exportDropdown.style.display = 'flex';
      exportDropdown.style.flexDirection = 'column';
      exportDropdown.style.padding = '4px 0';
      exportDropdown.style.marginTop = '4px';

      // Item 1: Export all
      const itemAll = document.createElement('div');
      itemAll.textContent = t('editor.timelinePanel.exportAll') || 'Export all blocks';
      itemAll.style.padding = '8px 12px';
      itemAll.style.cursor = 'pointer';
      itemAll.style.color = '#fff';
      itemAll.style.fontSize = '12px';
      itemAll.style.transition = 'background 0.2s';
      itemAll.addEventListener('mouseover', () => itemAll.style.background = '#333');
      itemAll.addEventListener('mouseout', () => itemAll.style.background = '');
      itemAll.addEventListener('click', () => {
        this.exportSequence(false);
        closeExportDropdown();
      });
      exportDropdown.appendChild(itemAll);

      // Item 2: Export selected
      const hasSelection = this.selectedEvents && this.selectedEvents.length > 0;
      const itemSelected = document.createElement('div');
      itemSelected.textContent = (t('editor.timelinePanel.exportSelected') || 'Export selected blocks') + ` (${this.selectedEvents ? this.selectedEvents.length : 0})`;
      itemSelected.style.padding = '8px 12px';
      itemSelected.style.fontSize = '12px';
      itemSelected.style.transition = 'background 0.2s';

      if (hasSelection) {
        itemSelected.style.cursor = 'pointer';
        itemSelected.style.color = '#fff';
        itemSelected.addEventListener('mouseover', () => itemSelected.style.background = '#333');
        itemSelected.addEventListener('mouseout', () => itemSelected.style.background = '');
        itemSelected.addEventListener('click', () => {
          this.exportSequence(true);
          closeExportDropdown();
        });
      } else {
        itemSelected.style.cursor = 'not-allowed';
        itemSelected.style.color = '#666';
      }
      exportDropdown.appendChild(itemSelected);

      exportContainer.appendChild(exportDropdown);

      setTimeout(() => {
        document.addEventListener('click', closeExportDropdown);
      }, 50);
    });

    const importBtn = document.createElement('button');
    importBtn.textContent = t('editor.timelinePanel.importBtn');

    importBtn.style.background = '#1976d2';
    importBtn.style.color = 'white';
    importBtn.addEventListener('click', () => {
      if (fileStorage.isElectron) {
        this.openNativeFile();
      } else {
        this.fileInput.click();
      }
    });

    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = '.json';
    this.fileInput.style.display = 'none';
    this.fileInput.addEventListener('change', (e) => this.importSequence(e));

    this.mediaFileInput = document.createElement('input');
    this.mediaFileInput.type = 'file';
    this.mediaFileInput.accept = '.json, .mp3, .wav';
    this.mediaFileInput.style.display = 'none';
    this.mediaFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.name.endsWith('.json')) {
        this.processJsonFile(this.anchorTime, file);
      } else if (file.type.startsWith('audio/') || file.name.endsWith('.mp3') || file.name.endsWith('.wav')) {
        this.addAudioSequence(this.anchorTime, file);
      } else {
        alert(t('editor.timelinePanel.audioOnlyAlert'));
      }
      this.mediaFileInput.value = '';
    });

    // Dropdown container for Add Drone/Audio
    const addFileDropdownContainer = document.createElement('div');
    addFileDropdownContainer.style.position = 'relative';
    addFileDropdownContainer.style.display = 'inline-block';

    const addFileBtn = document.createElement('button');
    addFileBtn.textContent = t('editor.timelinePanel.addDroneAudio') + ' ▾';
    addFileBtn.style.background = '#e65100';
    addFileBtn.style.color = 'white';

    const dropdownMenu = document.createElement('div');
    dropdownMenu.style.position = 'absolute';
    dropdownMenu.style.top = '100%'; // Show below the button
    dropdownMenu.style.left = '0';
    dropdownMenu.style.background = '#2a2a2a';
    dropdownMenu.style.border = '1px solid #555';
    dropdownMenu.style.borderRadius = '4px';
    dropdownMenu.style.boxShadow = '0 2px 10px rgba(0,0,0,0.5)';
    dropdownMenu.style.display = 'none';
    dropdownMenu.style.flexDirection = 'column';
    dropdownMenu.style.zIndex = '1005';
    dropdownMenu.style.minWidth = '180px';
    dropdownMenu.style.marginTop = '5px';

    const addDroneOpt = document.createElement('div');
    addDroneOpt.textContent = t('editor.timelinePanel.addDroneOpt');
    addDroneOpt.style.padding = '10px 14px';
    addDroneOpt.style.cursor = 'pointer';
    addDroneOpt.style.fontSize = '12px';
    addDroneOpt.style.borderBottom = '1px solid #444';
    addDroneOpt.addEventListener('mouseenter', () => addDroneOpt.style.background = '#3e3e3e');
    addDroneOpt.addEventListener('mouseleave', () => addDroneOpt.style.background = '');
    addDroneOpt.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdownMenu.style.display = 'none';
      this.mediaFileInput.accept = '.json';
      this.mediaFileInput.click();
    });

    const addAudioOpt = document.createElement('div');
    addAudioOpt.textContent = t('editor.timelinePanel.addAudioOpt');
    addAudioOpt.style.padding = '10px 14px';
    addAudioOpt.style.cursor = 'pointer';
    addAudioOpt.style.fontSize = '12px';
    addAudioOpt.addEventListener('mouseenter', () => addAudioOpt.style.background = '#3e3e3e');
    addAudioOpt.addEventListener('mouseleave', () => addAudioOpt.style.background = '');
    addAudioOpt.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdownMenu.style.display = 'none';
      this.mediaFileInput.accept = '.mp3, .wav, audio/*';
      this.mediaFileInput.click();
    });

    dropdownMenu.appendChild(addDroneOpt);
    dropdownMenu.appendChild(addAudioOpt);

    addFileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = dropdownMenu.style.display === 'flex';
      dropdownMenu.style.display = isVisible ? 'none' : 'flex';
    });

    document.addEventListener('click', () => {
      dropdownMenu.style.display = 'none';
    });

    addFileDropdownContainer.appendChild(addFileBtn);
    addFileDropdownContainer.appendChild(dropdownMenu);

    this.fileIndicator = document.createElement('span');
    this.fileIndicator.style.color = '#00ffcc';
    this.fileIndicator.style.fontSize = '12px';
    this.fileIndicator.style.fontFamily = 'monospace';
    this.fileIndicator.style.marginLeft = '10px';
    this.updateFileIndicator();

    const groupBtn = document.createElement('button');
    groupBtn.textContent = t('editor.timelinePanel.groupBtn') || 'Group';
    groupBtn.addEventListener(
      'click',
      () => {
        this.groupSelected();
      }
    );

    const ungroupBtn = document.createElement('button');
    ungroupBtn.textContent = t('editor.timelinePanel.ungroupBtn') || 'Ungroup';
    ungroupBtn.addEventListener(
      'click',
      () => {
        this.ungroupSelected();
      }
    );

    toolbar.appendChild(playBtn);
    toolbar.appendChild(this.followBtn);
    toolbar.appendChild(addBtn);
    toolbar.appendChild(addFileDropdownContainer);
    toolbar.appendChild(groupBtn);
    toolbar.appendChild(ungroupBtn);
    toolbar.appendChild(this.fileIndicator);
    toolbar.appendChild(importBtn);
    toolbar.appendChild(saveBtn);
    toolbar.appendChild(exportContainer);
    toolbar.appendChild(this.fileInput);
    toolbar.appendChild(this.mediaFileInput);

    leftPanel.appendChild(toolbar);

    // Track Container
    this.trackContainer = document.createElement('div');
    this.trackContainer.style.flex = '1';
    this.trackContainer.style.position = 'relative';
    this.trackContainer.style.overflowX = 'auto';
    this.trackContainer.style.overflowY = 'auto';

    this.trackContainer.addEventListener('wheel', () => {
      if (this.autoScrollEnabled) {
        this.autoScrollEnabled = false;
        this.followBtn.textContent = 'Follow: OFF';
        this.followBtn.style.background = '#f44336';
      }
    });

    let scrollTimeout;
    this.trackContainer.addEventListener('scroll', () => {
      if (scrollTimeout) cancelAnimationFrame(scrollTimeout);
      scrollTimeout = requestAnimationFrame(() => {
        this.updateRulerTicks();
      });
    });

    this.anchorHead = document.createElement('div');
    this.anchorHead.style.position = 'absolute';
    this.anchorHead.style.top = '0';
    this.anchorHead.style.bottom = '0';
    this.anchorHead.style.width = '2px';
    this.anchorHead.style.background = '#03a9f4';
    this.anchorHead.style.zIndex = '40';
    this.anchorHead.style.pointerEvents = 'none';
    this.anchorHead.style.left = '0px';
    this.trackContainer.appendChild(this.anchorHead);

    // Playhead
    this.playhead = document.createElement('div');
    this.playhead.style.position = 'absolute';
    this.playhead.style.top = '0';
    this.playhead.style.bottom = '0';
    this.playhead.style.width = '2px';
    this.playhead.style.background = 'red';
    this.playhead.style.zIndex = '50';
    this.playhead.style.pointerEvents = 'none';
    this.trackContainer.appendChild(this.playhead);

    // Time ruler
    this.ruler = document.createElement('div');
    this.ruler.style.position = 'absolute';
    this.ruler.style.top = '0';
    this.ruler.style.left = '0';
    this.ruler.style.height = '20px';
    this.ruler.style.width = '10000px';
    this.ruler.style.borderBottom = '1px solid #555';
    this.ruler.style.cursor = 'text'; // Indicate it's clickable
    this.ruler.addEventListener('mousedown', (e) => {
      const rect = this.ruler.getBoundingClientRect();
      const time = Math.max(0, (e.clientX - rect.left) / this.pixelsPerSecond);
      this.anchorTime = time;
      this.anchorHead.style.left = (time * this.pixelsPerSecond) + 'px';
      this.seek(time);
    });
    this.trackContainer.appendChild(this.ruler);

    // Tracks area
    this.tracksArea = document.createElement('div');
    this.tracksArea.style.position = 'absolute';
    this.tracksArea.style.top = '20px';
    this.tracksArea.style.left = '0';
    this.tracksArea.style.width = '10000px';
    this.tracksArea.style.height = '1000px';

    // Drag events
    window.addEventListener('mousemove', (e) => this.onDrag(e));
    window.addEventListener('mouseup', (e) => this.onDragEnd(e));
    // Click on empty space to deselect
    this.tracksArea.addEventListener('mousedown', (e) => {
      if (e.target === this.tracksArea) {
        this.selectedEvents = [];
        this.inspector.hide();
        this.renderTracks();
      }
    });

    // Click on empty space to add
    this.tracksArea.addEventListener('dblclick', (e) => {
      if (e.target === this.tracksArea) {
        const rect = this.tracksArea.getBoundingClientRect();
        const time = (e.clientX - rect.left) / this.pixelsPerSecond;
        this.addSequence(time);
      }
    });

    // Drag & Drop for MP3 files
    this.tracksArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      this.tracksArea.style.background = 'rgba(255, 255, 255, 0.05)';
    });
    this.tracksArea.addEventListener('dragleave', (e) => {
      e.preventDefault();
      this.tracksArea.style.background = '';
    });
    this.tracksArea.addEventListener('drop', (e) => {
      e.preventDefault();
      this.tracksArea.style.background = '';
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.type.startsWith('audio/') || file.name.endsWith('.mp3')) {
          const rect = this.tracksArea.getBoundingClientRect();
          const time = Math.max(0, (e.clientX - rect.left) / this.pixelsPerSecond);
          this.addAudioSequence(time, file);
        } else if (file.name.endsWith('.json')) {
          const rect = this.tracksArea.getBoundingClientRect();
          const time = Math.max(0, (e.clientX - rect.left) / this.pixelsPerSecond);
          this.processJsonFile(time, file);
        } else {
          alert('Chỉ hỗ trợ file âm thanh (.mp3, .wav) hoặc file Drone Show (.json)');
        }
      }
    });

    this.trackContainer.appendChild(this.tracksArea);

    // Draw ruler ticks
    this.renderRuler();

    leftPanel.appendChild(this.trackContainer);
    this.container.appendChild(leftPanel);

    // Right side: Property Inspector
    const inspectorContainer = document.createElement('div');
    this.container.appendChild(inspectorContainer);

    let presetOptions = ['random'];
    if (this.showDirector && this.showDirector.fireworkSystem && this.showDirector.fireworkSystem.shellPresetFactory) {
      presetOptions = this.showDirector.fireworkSystem.shellPresetFactory.getPresetMenuEntries().map(e => e.key);
    }
    this.inspector = new PropertyInspector(
      inspectorContainer,
      (action) => {
        if (action === 'beforeChange') {
          this.saveHistoryState();
        } else {
          this.renderTracks();
        }
      },
      presetOptions
    );

    document.body.appendChild(this.container);

    // Global Hotkeys
    if (this.hotkeyManager) {
      this.hotkeyManager.register(
        'global',
        'ctrl+t',
        () => {
          this.toggle();
        }
      );

      this.hotkeyManager.register(
        'timeline',
        'ctrl+s',
        () => {
          this.saveDirectly();
        }
      );

      this.hotkeyManager.register(
        'timeline',
        'ctrl+t',
        () => {
          this.toggle();
        }
      );

      this.hotkeyManager.register(
        'timeline',
        ')',
        () => {
          this.changeZoom();
        }
      );

      this.hotkeyManager.register(
        'timeline',
        'shift+0',
        () => {
          this.changeZoom();
        }
      );

      this.hotkeyManager.register(
        'timeline',
        'space',
        () => {
          this.togglePlay();
        }
      );

      this.hotkeyManager.register(
        'timeline',
        'ctrl+z',
        () => {
          this.undo();
        }
      );

      this.hotkeyManager.register(
        'timeline',
        'ctrl+y',
        () => {
          this.redo();
        }
      );

      this.hotkeyManager.register(
        'timeline',
        'ctrl+shift+z',
        () => {
          this.redo();
        }
      );

      this.hotkeyManager.register(
        'timeline',
        'ctrl+c',
        () => {
          this.copySelected();
        }
      );

      this.hotkeyManager.register(
        'timeline',
        'ctrl+v',
        () => {
          this.pasteSelected();
        }
      );

      this.hotkeyManager.register(
        'timeline',
        'delete',
        () => {
          this.deleteSelected();
        }
      );

      this.hotkeyManager.register(
        'timeline',
        'backspace',
        () => {
          this.deleteSelected();
        }
      );

      this.hotkeyManager.register(
        'timeline',
        'b',
        () => {
          this.tapBeat();
        }
      );

      this.hotkeyManager.register(
        'timeline',
        'g',
        () => {
          this.groupSelected();
        }
      );

      this.hotkeyManager.register(
        'timeline',
        'shift+g',
        () => {
          this.ungroupSelected();
        }
      );

      this.hotkeyManager.register(
        'timeline',
        '[',
        () => {
          this.seekToPreviousBeat();
        }
      );

      this.hotkeyManager.register(
        'timeline',
        ']',
        () => {
          this.seekToNextBeat();
        }
      );

      this.hotkeyManager.register(
        'timeline',
        'alt+arrowleft',
        () => {
          this.seekToPreviousBeat();
        }
      );

      this.hotkeyManager.register(
        'timeline',
        'alt+arrowright',
        () => {
          this.seekToNextBeat();
        }
      );
    }

    // Auto-hide when entering Move Mode (pointer lock), show only if it was visible
    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement) {
        this.container.style.display = 'none';
        if (this.hotkeyManager) {
          this.hotkeyManager.setActiveContext('global');
        }
      } else {
        this.container.style.display = this.visible ? 'flex' : 'none';
        if (
          this.hotkeyManager &&
          this.visible
        ) {
          this.hotkeyManager.setActiveContext('timeline');
        }
      }
    });
  }

  groupSelected() {
    if (
      !this.selectedEvents ||
      this.selectedEvents.length < 2
    ) {
      return;
    }

    this.saveHistoryState();

    const minTime = Math.min(
      ...this.selectedEvents.map((s) => {
        return s.time;
      })
    );

    const maxEndTime = Math.max(
      ...this.selectedEvents.map((s) => {
        const visualDurationVal = s.uiDuration !== undefined
          ? s.uiDuration
          : (s.duration || 0);
        return s.time + visualDurationVal;
      })
    );

    const duration = maxEndTime - minTime;

    const groupBlock = {
      time: Math.round(minTime * 10) / 10,
      type: 'group',
      name: t('editor.timelinePanel.groupBlockName') || 'Event Group',
      duration: Math.round(duration * 10) / 10,
      uiDuration: Math.round(duration * 10) / 10,
      children: this.selectedEvents.map((s) => {
        const clone = JSON.parse(
          JSON.stringify(s)
        );
        clone.timeOffset = Math.round((s.time - minTime) * 10) / 10;
        return clone;
      })
    };

    // Remove selected events from sequences and push the new group block
    this.sequences = this.sequences.filter((s) => {
      return !this.selectedEvents.includes(s);
    });
    this.sequences.push(groupBlock);
    this.selectedEvents = [groupBlock];

    this.renderTracks();
    this.inspector.show(groupBlock);

    this.showDirector.loadScript(this.getFlattenedSequences());
  }

  ungroupSelected() {
    if (
      !this.selectedEvents ||
      this.selectedEvents.length === 0
    ) {
      return;
    }

    const groups = this.selectedEvents.filter((s) => {
      return s.type === 'group';
    });

    if (groups.length === 0) {
      return;
    }

    this.saveHistoryState();
    const newSelected = [];

    groups.forEach((group) => {
      if (group.children) {
        group.children.forEach((child) => {
          const restoredChild = JSON.parse(
            JSON.stringify(child)
          );
          restoredChild.time = Math.round(
            (group.time + (child.timeOffset || 0)) * 10
          ) / 10;
          delete restoredChild.timeOffset;
          this.sequences.push(restoredChild);
          newSelected.push(restoredChild);
        });
      }
      this.sequences = this.sequences.filter((s) => {
        return s !== group;
      });
    });

    this.selectedEvents = newSelected;
    this.renderTracks();

    if (this.selectedEvents.length > 0) {
      this.inspector.show(
        this.selectedEvents[this.selectedEvents.length - 1]
      );
    } else {
      this.inspector.hide();
    }

    this.showDirector.loadScript(this.getFlattenedSequences());
  }

  changeZoom() {
    const zoomLevels = [
      25,
      50,
      100,
      200
    ];
    let idx = zoomLevels.indexOf(
      this.pixelsPerSecond
    );
    idx = (idx + 1) % zoomLevels.length;
    this.pixelsPerSecond = zoomLevels[idx];
    this.renderRuler();
    this.renderTracks();
    this.anchorHead.style.left = (this.anchorTime * this.pixelsPerSecond) + 'px';
  }

  copySelected() {
    if (
      this.selectedEvents &&
      this.selectedEvents.length > 0
    ) {
      const minTime = Math.min(
        ...this.selectedEvents.map((s) => {
          return s.time;
        })
      );
      this.clipboardEvents = this.selectedEvents.map((s) => {
        const clone = JSON.parse(
          JSON.stringify(s)
        );
        delete clone._trackRow;
        delete clone._deleted;
        return {
          event: clone,
          offset: s.time - minTime
        };
      });
    }
  }

  pasteSelected() {
    if (
      this.clipboardEvents &&
      this.clipboardEvents.length > 0
    ) {
      this.saveHistoryState();

      const newPastedEvents = [];
      this.clipboardEvents.forEach((item) => {
        const newEvent = JSON.parse(
          JSON.stringify(item.event)
        );
        newEvent.time = Math.round(
          (this.anchorTime + item.offset) * 10
        ) / 10;
        this.sequences.push(newEvent);
        newPastedEvents.push(newEvent);
      });

      this.selectedEvents = newPastedEvents;

      if (newPastedEvents.length > 0) {
        const primary = newPastedEvents[
          newPastedEvents.length - 1
        ];
        this.inspector.show(primary);
      }

      this.renderTracks();
    }
  }

  deleteSelected() {
    if (
      this.selectedEvents &&
      this.selectedEvents.length > 0
    ) {
      this.saveHistoryState();
      this.selectedEvents.forEach((s) => {
        s._deleted = true;
      });
      this.selectedEvents = [];
      this.inspector.hide();
      this.renderTracks();
    }
  }

  updateFileIndicator() {
    if (this.fileIndicator) {
      this.fileIndicator.textContent = this.filename ? `Active: ${this.filename}` : 'Active: demoShow.json';
    }
  }

  renderRuler() {
    const maxSeconds = 600; // 10 minutes limit
    const totalWidth = maxSeconds * this.pixelsPerSecond;
    if (this.ruler) this.ruler.style.width = totalWidth + 'px';
    if (this.tracksArea) this.tracksArea.style.width = totalWidth + 'px';

    this.updateRulerTicks();
  }

  updateRulerTicks() {
    if (!this.ruler) return;
    this.ruler.innerHTML = '';

    const scrollLeft = this.trackContainer.scrollLeft;
    const viewportWidth = this.trackContainer.clientWidth || window.innerWidth;

    // Thêm biên (margin) 2 giây trước và sau viewport để cuộn mượt
    const startTime = Math.max(0, Math.floor(scrollLeft / this.pixelsPerSecond) - 2);
    const endTime = Math.min(600, Math.ceil((scrollLeft + viewportWidth) / this.pixelsPerSecond) + 2);

    const step = this.pixelsPerSecond < 50 ? 0.5 : 0.1;
    const labelInterval = this.pixelsPerSecond < 50 ? 1.0 : 0.5;

    for (let time = startTime; time <= endTime; time += step) {
      const roundedTime = Math.round(time * 10) / 10;
      const tick = document.createElement('div');
      tick.style.position = 'absolute';
      tick.style.left = (roundedTime * this.pixelsPerSecond) + 'px';
      tick.style.bottom = '0';
      tick.style.height = '4px';
      tick.style.borderLeft = '1px solid #555';
      tick.style.pointerEvents = 'none';

      const timeMs = Math.round(roundedTime * 10);
      const labelIntervalMs = Math.round(labelInterval * 10);
      const isLabelTick = (timeMs % labelIntervalMs === 0);
      const isHalfSecond = (timeMs % 5 === 0);

      if (isHalfSecond || isLabelTick) {
        tick.style.height = (timeMs % 10 === 0) ? '12px' : '7px';
        tick.style.borderLeft = (timeMs % 10 === 0) ? '1px solid #999' : '1px solid #777';

        if (isLabelTick) {
          const label = document.createElement('span');
          label.textContent = roundedTime + 's';
          label.style.position = 'absolute';
          label.style.left = '2px';
          label.style.bottom = '2px';
          label.style.fontSize = '9px';
          label.style.color = (timeMs % 10 === 0) ? '#ddd' : '#888';
          tick.appendChild(label);
        }
      }
      this.ruler.appendChild(tick);
    }
  }

  toggle() {
    this.visible = !this.visible;
    this.container.style.display = this.visible ? 'flex' : 'none';
    if (this.visible && document.pointerLockElement) {
      document.exitPointerLock();
    }
    if (this.hotkeyManager) {
      this.hotkeyManager.setActiveContext(
        this.visible ? 'timeline' : 'global'
      );
    }
    globalEventBus.emit('timeline:toggle', this.visible);
  }

  togglePlay() {
    if (this.showDirector.isPlaying) {
      this.showDirector.pause();
      if (this.showDirector.fireworkSystem && this.showDirector.fireworkSystem.burstAll) {
        this.showDirector.fireworkSystem.burstAll();
      }
    } else {
      this.seek(this.anchorTime);
      this.showDirector.play();
    }
  }

  getFlattenedSequences() {
    const result = [];
    this.sequences.forEach((seq) => {
      if (seq._deleted) {
        return;
      }
      if (
        seq.type === 'group' &&
        seq.children
      ) {
        seq.children.forEach((child) => {
          if (child._deleted) {
            return;
          }
          const childTime = seq.time + (child.timeOffset || 0);
          result.push({
            ...child,
            time: Math.round(childTime * 10) / 10
          });
        });
      } else {
        result.push(seq);
      }
    });
    return result;
  }

  seek(time) {
    this.autoScrollEnabled = true;
    if (this.followBtn) {
      this.followBtn.textContent = t('editor.timelinePanel.followOn');
      this.followBtn.style.background = '#4CAF50';
    }

    this.sequences = this.sequences.filter(s => !s._deleted);
    this.showDirector.loadScript(this.getFlattenedSequences());
    this.showDirector.seek(time);
    this.playhead.style.left = (time * this.pixelsPerSecond) + 'px';
  }

  addSequence(time = this.anchorTime) {
    this.saveHistoryState();
    const newSeq = {
      time: Math.round(time * 10) / 10,
      type: 'sequence',
      pattern: 'sweep-left',
      count: 5,
      duration: 0.1,
      preset: 'crysanthemum'
    };
    this.sequences.push(newSeq);
    this.selectedEvents = [newSeq];
    this.renderTracks();
    this.inspector.show(newSeq);

    // Auto-scroll track container to show the new event
    const scrollPos = time * this.pixelsPerSecond;
    this.trackContainer.scrollLeft = Math.max(0, scrollPos - 100);
  }

  addAudioSequence(time, file) {
    const blobUrl = URL.createObjectURL(file);
    const audio = new Audio(blobUrl);

    audio.addEventListener('loadedmetadata', () => {
      this.saveHistoryState();
      const duration = audio.duration;
      const newSeq = {
        time: Math.round(time * 10) / 10,
        type: 'audio',
        name: file.name,
        duration: duration,
        uiDuration: duration, // start visual duration exactly same as true duration
        url: file.name,
        _blobUrl: blobUrl,
        _file: file,
        beats: [],
        volume: 1.0
      };
      this.sequences.push(newSeq);
      this.selectedEvents = [newSeq];
      this.renderTracks();
      this.inspector.show(newSeq);

      // Auto-scroll track container to show the new event
      const scrollPos = time * this.pixelsPerSecond;
      this.trackContainer.scrollLeft = Math.max(0, scrollPos - 100);

      // Let showDirector know we loaded a new audio file so it can prep playback if needed
      const currentTime = this.showDirector.elapsedTime;
      this.showDirector.loadScript(this.getFlattenedSequences());
      this.showDirector.seek(currentTime);
    });

    audio.addEventListener('error', () => {
      alert(t('editor.timelinePanel.audioError'));
    });
  }

  addDroneSequence(time, file) {
    this.processJsonFile(time, file);
  }

  processJsonFile(time, file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (Array.isArray(data)) {
          this.appendSequenceArray(time, data, file.name);
        } else if (data.droneCount && data.steps) {
          this.processDroneShowData(time, data, file.name);
        } else {
          alert(t('editor.timelinePanel.invalidShowJson'));
        }
      } catch (err) {
        alert(t('editor.timelinePanel.readJsonError', { error: err.message }));
      }
    };
    reader.readAsText(file);
  }

  processDroneShowData(time, data, fileName) {
    this.saveHistoryState();
    let maxTime = 0;
    data.steps.forEach(step => {
      if (step.time > maxTime) maxTime = step.time;
    });
    const duration = (maxTime / 1000) + 2.0; // 2 seconds buffer

    const parsedSteps = data.steps.map(step => ({
      ...step,
      positions: step.positions.map(p => new THREE.Vector3(p.x, p.y, p.z))
    }));

    const newSeq = {
      time: Math.round(time * 10) / 10,
      type: 'droneshow',
      name: data.name || fileName,
      duration: duration,
      uiDuration: duration,
      droneCount: data.droneCount,
      steps: parsedSteps
    };
    this.sequences.push(newSeq);
    this.selectedEvents = [newSeq];
    this.renderTracks();
    this.inspector.show(newSeq);

    // Auto-scroll track container to show the new event
    const scrollPos = time * this.pixelsPerSecond;
    this.trackContainer.scrollLeft = Math.max(0, scrollPos - 100);

    const currentTime = this.showDirector.elapsedTime;
    this.showDirector.loadScript(this.getFlattenedSequences());
    this.showDirector.seek(currentTime);
  }

  appendSequenceArray(time, data, fileName) {
    this.saveHistoryState();
    if (data.length === 0) return;

    // Tìm thời gian nhỏ nhất trong kịch bản import để làm mốc offset
    const minTime = Math.min(...data.map(s => s.time || 0));

    // Thêm các sự kiện mới với thời gian dịch chuyển tương đối
    const newEvents = data.map(s => {
      const clone = JSON.parse(JSON.stringify(s));
      clone.time = Math.round((time + ((clone.time || 0) - minTime)) * 10) / 10;
      return clone;
    });

    this.sequences.push(...newEvents);
    this.selectedEvents = newEvents;
    this.renderTracks();

    if (newEvents.length > 0) {
      this.inspector.show(newEvents[newEvents.length - 1]);
    }

    // Auto-scroll track container to show the newly imported events
    const scrollPos = time * this.pixelsPerSecond;
    this.trackContainer.scrollLeft = Math.max(0, scrollPos - 100);

    const currentTime = this.showDirector.elapsedTime;
    this.showDirector.loadScript(this.getFlattenedSequences());
    this.showDirector.seek(currentTime);
    alert(`Đã chèn nối tiếp kịch bản "${fileName}" thành công tại ${time.toFixed(1)}s!`);
  }

  assignTracks() {
    const audioSequences = [...this.sequences].filter(s => !s._deleted && s.type === 'audio').sort((a, b) => a.time - b.time);
    const otherSequences = [...this.sequences].filter(s => !s._deleted && s.type !== 'audio').sort((a, b) => a.time - b.time);

    let audioRows = [];
    audioSequences.forEach(seq => {
      const start = seq.time;
      const visualDurationVal = seq.uiDuration !== undefined ? seq.uiDuration : (seq.duration || 0);
      const visualDuration = Math.max(visualDurationVal, this.minBlockWidth / this.pixelsPerSecond);
      const end = start + visualDuration + 0.1;

      let placed = false;
      for (let i = 0; i < audioRows.length; i++) {
        if (audioRows[i] <= start) {
          seq._trackRow = i;
          audioRows[i] = end;
          placed = true;
          break;
        }
      }
      if (!placed) {
        seq._trackRow = audioRows.length;
        audioRows.push(end);
      }
    });

    const reservedAudioRows = Math.max(1, audioRows.length);

    let otherRows = [];
    otherSequences.forEach(seq => {
      const start = seq.time;
      const visualDurationVal = seq.uiDuration !== undefined ? seq.uiDuration : (seq.duration || 0);
      const visualDuration = Math.max(visualDurationVal, this.minBlockWidth / this.pixelsPerSecond);
      const end = start + visualDuration + 0.1;

      let placed = false;
      for (let i = 0; i < otherRows.length; i++) {
        if (otherRows[i] <= start) {
          seq._trackRow = reservedAudioRows + i;
          otherRows[i] = end;
          placed = true;
          break;
        }
      }
      if (!placed) {
        seq._trackRow = reservedAudioRows + otherRows.length;
        otherRows.push(end);
      }
    });
  }

  renderTracks() {
    this.tracksArea.innerHTML = '';
    this.assignTracks();

    // Clean up selectedEvents to remove any deleted or missing sequences
    this.selectedEvents = this.selectedEvents.filter(s => !s._deleted && this.sequences.includes(s));

    this.sequences.filter(s => !s._deleted).forEach(seq => {
      const block = document.createElement('div');
      const startX = seq.time * this.pixelsPerSecond;
      const visualDurationVal = seq.uiDuration !== undefined ? seq.uiDuration : (seq.duration || 0);
      const width = Math.max(visualDurationVal * this.pixelsPerSecond, this.minBlockWidth);
      const row = seq._trackRow || 0;

      block.style.position = 'absolute';
      block.style.left = startX + 'px';
      block.style.top = (row * (this.rowHeight + 5) + 5) + 'px';
      block.style.width = width + 'px';
      block.style.height = this.rowHeight + 'px';
      block.style.borderRadius = '4px';
      block.style.cursor = 'grab';
      block.style.boxSizing = 'border-box';
      block.style.border = this.inspector.selectedEvent === seq ? '2px solid white' : (this.selectedEvents.includes(seq) ? '2px solid #00ffcc' : '1px solid rgba(0,0,0,0.5)');
      block.style.display = 'flex';
      block.style.alignItems = 'center';
      block.style.padding = '0 5px';
      block.style.fontSize = '11px';
      block.style.overflow = 'hidden';
      block.style.whiteSpace = 'nowrap';
      block.style.userSelect = 'none';

      if (seq.type === 'group') {
        const getBlockColor = (type) => {
          if (type === 'cometsequence') {
            return '#d84315';
          }
          if (type === 'finale') {
            return '#c2185b';
          }
          if (type === 'audio') {
            return '#673ab7';
          }
          if (type === 'droneshow') {
            return '#00b4db';
          }
          return '#1565c0';
        };
        const childColors = (seq.children || []).map((child) => {
          return getBlockColor(child.type);
        });
        const uniqueColors = [...new Set(childColors)];
        if (uniqueColors.length > 1) {
          block.style.background = `linear-gradient(90deg, ${uniqueColors.join(', ')})`;
        } else if (uniqueColors.length === 1) {
          block.style.background = `linear-gradient(90deg, ${uniqueColors[0]}, ${uniqueColors[0]})`;
        } else {
          block.style.background = 'linear-gradient(90deg, #555, #777)';
        }
      } else if (seq.type === 'cometsequence') {
        block.style.background = 'linear-gradient(90deg, #d84315, #ff9800)';
      } else if (seq.type === 'finale') {
        block.style.background = 'linear-gradient(90deg, #c2185b, #e91e63)';
      } else if (seq.type === 'audio') {
        block.style.background = 'linear-gradient(90deg, #673ab7, #9c27b0)';
      } else if (seq.type === 'droneshow') {
        block.style.background = 'linear-gradient(90deg, #00b4db, #0083b0)';
      } else {
        block.style.background = 'linear-gradient(90deg, #1565c0, #03a9f4)';
      }

      const textSpan = document.createElement('span');
      textSpan.style.pointerEvents = 'none';

      if (seq.type === 'group') {
        textSpan.textContent = seq.name || t('editor.timelinePanel.groupBlockName') || 'Event Group';
      } else if (seq.type === 'audio') {
        textSpan.textContent = t(
          'editor.timelinePanel.audioBlock',
          {
            name: seq.name || seq.url || 'Audio'
          }
        );
      } else if (seq.type === 'droneshow') {
        textSpan.textContent = t(
          'editor.timelinePanel.droneBlock',
          {
            name: seq.name || 'Drone Show',
            count: seq.droneCount
          }
        );
      } else {
        textSpan.textContent = t(
          'editor.timelinePanel.eventBlock',
          {
            preset: seq.preset || seq.pattern,
            count: seq.count || 1
          }
        );
      }
      block.appendChild(textSpan);

      // Render yellow dots for beats if it's an audio block
      if (seq.type === 'audio' && seq.beats) {
        seq.beats.forEach((beatTime) => {
          const beatX = beatTime * this.pixelsPerSecond;
          if (beatX <= width) {
            const dot = document.createElement('div');
            dot.style.position = 'absolute';
            dot.style.left = beatX + 'px';
            dot.style.top = '50%';
            dot.style.transform = 'translate(-50%, -50%)';
            dot.style.width = '8px';
            dot.style.height = '8px';
            dot.style.borderRadius = '50%';
            dot.style.backgroundColor = '#ffd700';
            dot.style.border = '1px solid rgba(0,0,0,0.5)';
            dot.style.cursor = 'pointer';
            dot.title = `Beat: ${beatTime.toFixed(2)}s (Double click to delete)`;

            dot.addEventListener(
              'dblclick',
              (e) => {
                e.stopPropagation();
                this.saveHistoryState();
                seq.beats = seq.beats.filter(
                  (b) => {
                    return b !== beatTime;
                  }
                );
                this.renderTracks();
                this.inspector.render();
              }
            );

            dot.addEventListener(
              'mousedown',
              (e) => {
                e.stopPropagation();
                this.selectedEvents = [seq];
                this.inspector.show(seq);
                this.renderTracks();
              }
            );

            block.appendChild(dot);
          }
        });
      }


      block.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        this.saveHistoryState();

        const isCtrlOrShift = e.ctrlKey || e.shiftKey;

        if (isCtrlOrShift) {
          if (this.selectedEvents.includes(seq)) {
            // Remove from selected list
            this.selectedEvents = this.selectedEvents.filter(s => s !== seq);
            if (this.inspector.selectedEvent === seq) {
              if (this.selectedEvents.length > 0) {
                const newPrimary = this.selectedEvents[this.selectedEvents.length - 1];
                this.inspector.show(newPrimary);
              } else {
                this.inspector.hide();
              }
            }
          } else {
            // Add to selected list
            this.selectedEvents.push(seq);
            this.inspector.show(seq);
          }
        } else {
          // If clicked event is not already selected, clear select list and select this one.
          // If it IS already selected, keep selection (so we can drag them together).
          if (!this.selectedEvents.includes(seq)) {
            this.selectedEvents = [seq];
          }
          this.inspector.show(seq);
        }

        this.isDragging = true;
        this.draggedEvent = seq;

        // Save initial positions of all currently selected events so we can drag them together
        this.selectedEvents.forEach(s => {
          s.initialTime = s.time;
        });

        this.dragOffsetX = e.clientX - block.getBoundingClientRect().left;
        this.renderTracks(); // to update border
        block.style.cursor = 'grabbing';
      });

      const resizeHandle = document.createElement('div');
      resizeHandle.style.position = 'absolute';
      resizeHandle.style.right = '0';
      resizeHandle.style.top = '0';
      resizeHandle.style.bottom = '0';
      resizeHandle.style.width = '8px';
      resizeHandle.style.cursor = 'ew-resize';
      resizeHandle.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
      resizeHandle.style.zIndex = '10';

      resizeHandle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        this.inspector.show(seq);
        this.saveHistoryState();
        this.renderTracks();
        this.isResizing = true;
        this.resizedEvent = seq;
        this.resizeOffsetX = e.clientX;
        this.initialDuration = seq.uiDuration !== undefined ? seq.uiDuration : (seq.duration || 0);
      });

      resizeHandle.addEventListener('mouseenter', () => {
        resizeHandle.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
      });
      resizeHandle.addEventListener('mouseleave', () => {
        resizeHandle.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
      });

      block.appendChild(resizeHandle);

      this.tracksArea.appendChild(block);
    });
  }

  onDrag(e) {
    if (this.isResizing && this.resizedEvent) {
      const dx = e.clientX - this.resizeOffsetX;
      const dTime = dx / this.pixelsPerSecond;
      let newDuration = Math.max(0.1, this.initialDuration + dTime);
      newDuration = Math.round(newDuration * 10) / 10; // Snap to 0.1s

      if (this.resizedEvent.uiDuration !== newDuration) {
        this.resizedEvent.uiDuration = newDuration;
        this.renderTracks();
      }
      return;
    }

    if (!this.isDragging || !this.draggedEvent) return;
    const newX =
      e.clientX -
      this.tracksArea.getBoundingClientRect().left -
      this.dragOffsetX;
    let newTime = Math.max(
      0,
      newX / this.pixelsPerSecond
    );

    // Snap to beat points if close, otherwise fallback to 0.1s grid
    const absoluteBeatTimes = [];
    this.sequences.forEach((s) => {
      if (
        !s._deleted &&
        s.type === 'audio' &&
        s !== this.draggedEvent &&
        s.beats
      ) {
        s.beats.forEach((beatOffset) => {
          absoluteBeatTimes.push(
            s.time + beatOffset
          );
        });
      }
    });

    const snapThresholdSec = 0.15;
    let closestBeat = null;
    let minDiff = Infinity;

    absoluteBeatTimes.forEach((beatTime) => {
      const diff = Math.abs(newTime - beatTime);
      if (
        diff < minDiff &&
        diff <= snapThresholdSec
      ) {
        minDiff = diff;
        closestBeat = beatTime;
      }
    });

    if (closestBeat !== null) {
      newTime = closestBeat;
    } else {
      newTime = Math.round(newTime * 10) / 10;
    }

    let dTime =
      newTime -
      (this.draggedEvent.initialTime !== undefined
        ? this.draggedEvent.initialTime
        : this.draggedEvent.time);

    // Clamp dTime so no selected event goes below time 0
    if (this.selectedEvents && this.selectedEvents.length > 0) {
      const minInitialTime = Math.min(...this.selectedEvents.map(s => s.initialTime !== undefined ? s.initialTime : s.time));
      if (minInitialTime + dTime < 0) {
        dTime = -minInitialTime;
      }
    }

    let changed = false;
    this.selectedEvents.forEach(s => {
      const initT = s.initialTime !== undefined ? s.initialTime : s.time;
      const targetTime = Math.round((initT + dTime) * 10) / 10;
      if (s.time !== targetTime) {
        s.time = targetTime;
        changed = true;
      }
    });

    if (changed) {
      this.renderTracks();
      if (this.inspector.selectedEvent && this.selectedEvents.includes(this.inspector.selectedEvent)) {
        this.inspector.updateValues();
      }
    }
  }

  onDragEnd(e) {
    this.isDragging = false;
    this.draggedEvent = null;
    this.isResizing = false;
    this.resizedEvent = null;
    if (this.selectedEvents) {
      this.selectedEvents.forEach(s => {
        delete s.initialTime;
      });
    }
  }

  updatePlayhead() {
    if (this.visible && this.showDirector) {
      const time = this.showDirector.elapsedTime;
      const x = time * this.pixelsPerSecond;
      this.playhead.style.left = x + 'px';

      // Auto-scroll
      if (this.autoScrollEnabled) {
        const containerRect = this.trackContainer.getBoundingClientRect();
        const scrollLeft = this.trackContainer.scrollLeft;
        if (x > scrollLeft + containerRect.width - 100) {
          this.trackContainer.scrollLeft = x - containerRect.width + 100;
        } else if (x < scrollLeft) {
          this.trackContainer.scrollLeft = Math.max(0, x - 100);
        }
      }
    }
    requestAnimationFrame(this.updateLoop);
  }

  async openNativeFile() {
    try {
      const fileData = await fileStorage.openFileDialog();
      if (fileData) {
        const { filePath, content, filename } = fileData;
        const data = JSON.parse(content);
        if (!Array.isArray(data)) throw new Error(t('editor.filePanel.alertInvalidJson'));

        if (this.sequences.length > 0 && !confirm(t('editor.timelinePanel.importConfirm'))) {
          return;
        }

        this.sequences = data;
        this.filename = filename;
        this.currentFilePath = filePath;
        this.updateFileIndicator();
        this.renderTracks();
        this.showDirector.loadScript(this.getFlattenedSequences());
        alert(t('editor.timelinePanel.importSuccess', { filename }));
      }

    } catch (err) {
      alert("Lỗi khi đọc file qua Electron: " + err.message);
    }
  }

  async saveDirectly() {
    await this.saveSequence();
  }

  importSequence(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (this.sequences.length > 0 && !confirm("Tiến hành import sẽ ghi đè lên các thay đổi chưa được lưu. Bạn có chắc chắn muốn tiếp tục?")) {
      this.fileInput.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (!Array.isArray(data)) throw new Error("File JSON không hợp lệ (cần là một mảng).");

        this.sequences = data;
        this.filename = file.name;
        this.updateFileIndicator();
        this.renderTracks();
        this.showDirector.loadScript(this.getFlattenedSequences());
        alert("Import thành công!");
      } catch (err) {
        alert("Lỗi khi đọc file JSON: " + err.message);
      }
      this.fileInput.value = '';
    };
    reader.readAsText(file);
  }

  cleanSequence(s) {
    const { _trackRow, _deleted, _blobUrl, initialTime, ...cleanObj } = s;
    if (cleanObj.type === 'group' && cleanObj.children) {
      cleanObj.children = cleanObj.children.map((child) => {
        return this.cleanSequence(child);
      });
    }
    return cleanObj;
  }

  async saveSequence() {
    // Cleanup temporary variables
    const cleanSeqs = this.sequences.filter(s => !s._deleted).map(s => {
      return this.cleanSequence(s);
    });

    const content = JSON.stringify(cleanSeqs, null, 2);

    if (fileStorage.isElectron) {
      if (this.currentFilePath) {
        try {
          await fileStorage.saveFileAbsolute(
            this.currentFilePath,
            content
          );
          alert(t('editor.timelinePanel.saveSuccess', { filename: this.filename }));
        } catch (err) {
          alert(t('editor.timelinePanel.saveError', { error: err.message }));
        }
      } else {
        // Save As
        try {
          const res = await fileStorage.saveFileDialog(
            content,
            this.filename || 'demoShow.json'
          );
          if (res) {
            this.currentFilePath = res.filePath;
            this.filename = res.filename;
            this.updateFileIndicator();
            alert(`Đã lưu kịch bản mới thành công vào: ${res.filename}`);
          }
        } catch (err) {
          alert('Lỗi khi lưu mới file: ' + err.message);
        }
      }
      return;
    }

    // Web Fallback
    // Cách 1: Copy vào Clipboard
    try {
      await navigator.clipboard.writeText(content);
      console.log('Đã copy nội dung vào Clipboard!');
    } catch (e) {
      console.warn("Không thể copy vào clipboard", e);
    }

    // Cách 2: Tự động tải file về máy
    try {
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = this.filename || 'demoShow.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert(`Đã tải xuống file ${this.filename || 'demoShow.json'}!\n\nNội dung cũng đã được copy vào Clipboard.\nHãy chép file này vào thư mục: src/config/sequences/`);
    } catch (err) {
      alert('Lỗi khi lưu file: ' + err.message);
    }
  }

  async exportSequence(onlySelected = false) {
    const sourceEvents = onlySelected ? this.selectedEvents : this.sequences;
    if (onlySelected && (!sourceEvents || sourceEvents.length === 0)) {
      alert(t('editor.timelinePanel.noSelectionExport') || 'No blocks selected to export!');
      return;
    }

    // Cleanup temporary variables
    const cleanSeqs = sourceEvents.filter(s => !s._deleted).map(s => {
      return this.cleanSequence(s);
    });

    const content = JSON.stringify(cleanSeqs, null, 2);

    if (fileStorage.isElectron) {
      try {
        const res = await fileStorage.saveFileDialog(
          content,
          this.filename || 'demoShow.json'
        );
        if (res) {
          this.currentFilePath = res.filePath;
          this.filename = res.filename;
          this.updateFileIndicator();
          alert(t('editor.timelinePanel.exportSuccess', { filename: res.filename }));
        }
      } catch (err) {
        alert(t('editor.timelinePanel.exportError', { error: err.message }));
      }
      return;
    }

    // Web Fallback
    try {
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = this.filename || 'demoShow.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert(t('editor.timelinePanel.exportSuccess', { filename: this.filename || 'demoShow.json' }));
    } catch (err) {
      alert(t('editor.timelinePanel.exportError', { error: err.message }));
    }
  }

  saveHistoryState() {
    if (this.undoStack.length >= 50) {
      this.undoStack.shift();
    }
    this.undoStack.push(JSON.parse(JSON.stringify(this.sequences)));
    this.redoStack = [];
  }

  undo() {
    if (!this.undoStack || this.undoStack.length === 0) return;

    this.redoStack.push(JSON.parse(JSON.stringify(this.sequences)));
    this.sequences = this.undoStack.pop();

    const currentTime = this.showDirector.elapsedTime;
    this.renderTracks();
    this.showDirector.loadScript(this.getFlattenedSequences());
    this.showDirector.seek(currentTime);
    this.playhead.style.left = (currentTime * this.pixelsPerSecond) + 'px';

    if (this.inspector && this.inspector.selectedEvent) {
      const currentSelected = this.inspector.selectedEvent;
      const found = this.sequences.find(s => s.time === currentSelected.time && s.type === currentSelected.type);
      if (found && !found._deleted) {
        this.inspector.show(found);
      } else {
        this.inspector.hide();
      }
    }
  }

  redo() {
    if (!this.redoStack || this.redoStack.length === 0) return;

    this.undoStack.push(JSON.parse(JSON.stringify(this.sequences)));
    this.sequences = this.redoStack.pop();

    const currentTime = this.showDirector.elapsedTime;
    this.renderTracks();
    this.showDirector.loadScript(this.getFlattenedSequences());
    this.showDirector.seek(currentTime);
    this.playhead.style.left = (currentTime * this.pixelsPerSecond) + 'px';

    if (this.inspector && this.inspector.selectedEvent) {
      const currentSelected = this.inspector.selectedEvent;
      const found = this.sequences.find(s => s.time === currentSelected.time && s.type === currentSelected.type);
      if (found && !found._deleted) {
        this.inspector.show(found);
      } else {
        this.inspector.hide();
      }
    }
  }

  tapBeat() {
    let audioSeq = this.selectedEvents.find(
      (s) => {
        return !s._deleted && s.type === 'audio';
      }
    );

    if (!audioSeq) {
      const currentTime = this.showDirector.elapsedTime;
      audioSeq = this.sequences.find(
        (s) => {
          return (
            !s._deleted &&
            s.type === 'audio' &&
            currentTime >= s.time &&
            currentTime <= s.time + (s.duration || 999)
          );
        }
      );
    }

    if (!audioSeq) {
      audioSeq = this.sequences.find(
        (s) => {
          return !s._deleted && s.type === 'audio';
        }
      );
    }

    if (!audioSeq) return;

    const currentTime = this.showDirector.elapsedTime;
    const relativeTime = currentTime - audioSeq.time;

    if (
      relativeTime >= 0 &&
      relativeTime <= (audioSeq.duration || 9999)
    ) {
      const now = Date.now();
      const isDoublePress = now - (this.lastBPressTime || 0) < 400;
      this.lastBPressTime = now;

      if (isDoublePress) {
        // Tìm beat gần nhất trong khoảng 0.4s để xóa
        let closestBeat = null;
        let minDiff = 0.4;
        if (audioSeq.beats) {
          audioSeq.beats.forEach((b) => {
            const diff = Math.abs(b - relativeTime);
            if (diff < minDiff) {
              minDiff = diff;
              closestBeat = b;
            }
          });
        }

        if (closestBeat !== null) {
          this.saveHistoryState();
          audioSeq.beats = audioSeq.beats.filter(
            (b) => {
              return b !== closestBeat;
            }
          );
          this.renderTracks();
          if (
            this.inspector.selectedEvent === audioSeq
          ) {
            this.inspector.render();
          }
        }
      } else {
        // Single press: Thêm beat
        this.saveHistoryState();
        if (!audioSeq.beats) {
          audioSeq.beats = [];
        }

        const roundedTime =
          Math.round(relativeTime * 100) / 100;
        const isDuplicate = audioSeq.beats.some(
          (b) => {
            return Math.abs(b - roundedTime) < 0.1;
          }
        );

        if (!isDuplicate) {
          audioSeq.beats.push(roundedTime);
          audioSeq.beats.sort(
            (a, b) => {
              return a - b;
            }
          );
          this.renderTracks();
          if (
            this.inspector.selectedEvent === audioSeq
          ) {
            this.inspector.render();
          }
        }
      }
    }
  }

  getSortedAbsoluteBeats() {
    const absoluteBeats = [];
    this.sequences.forEach((s) => {
      if (
        !s._deleted &&
        s.type === 'audio' &&
        s.beats
      ) {
        s.beats.forEach((beatOffset) => {
          absoluteBeats.push(
            s.time + beatOffset
          );
        });
      }
    });
    const uniqueBeats = [
      ...new Set(absoluteBeats)
    ];
    return uniqueBeats.sort(
      (a, b) => {
        return a - b;
      }
    );
  }

  seekToNextBeat() {
    const beats = this.getSortedAbsoluteBeats();
    if (beats.length === 0) return;

    const currentTime = this.anchorTime;
    const nextBeat = beats.find(
      (b) => {
        return b > currentTime + 0.05;
      }
    );

    if (nextBeat !== undefined) {
      this.anchorTime = nextBeat;
      this.anchorHead.style.left =
        (nextBeat * this.pixelsPerSecond) + 'px';
      this.seek(nextBeat);
    }
  }

  seekToPreviousBeat() {
    const beats = this.getSortedAbsoluteBeats();
    if (beats.length === 0) return;

    const currentTime = this.anchorTime;
    const prevBeats = beats.filter(
      (b) => {
        return b < currentTime - 0.05;
      }
    );

    if (prevBeats.length > 0) {
      const prevBeat =
        prevBeats[prevBeats.length - 1];
      this.anchorTime = prevBeat;
      this.anchorHead.style.left =
        (prevBeat * this.pixelsPerSecond) + 'px';
      this.seek(prevBeat);
    }
  }
}
