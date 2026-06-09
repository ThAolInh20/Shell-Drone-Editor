import * as THREE from 'three';
import { PropertyInspector } from './PropertyInspector.js';
import demoShow from '../config/sequences/demoShow.json';
import { t } from '../config/lang/i18n.js';
import { globalEventBus } from '../core/EventBus.js';


export class TimelineEditor {
  constructor(showDirector) {
    this.showDirector = showDirector;
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

    const importBtn = document.createElement('button');
    importBtn.textContent = t('editor.timelinePanel.importBtn');

    importBtn.style.background = '#1976d2';
    importBtn.style.color = 'white';
    importBtn.addEventListener('click', () => {
      if (window.electronAPI) {
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
        this.addDroneSequence(this.anchorTime, file);
      } else if (file.type.startsWith('audio/') || file.name.endsWith('.mp3') || file.name.endsWith('.wav')) {
        this.addAudioSequence(this.anchorTime, file);
      } else {
        alert(t('editor.timelinePanel.audioOnlyAlert'));
      }
      this.mediaFileInput.value = '';
    });

    const addFileBtn = document.createElement('button');
    addFileBtn.textContent = t('editor.timelinePanel.addDroneAudio');

    addFileBtn.style.background = '#e65100';
    addFileBtn.style.color = 'white';
    addFileBtn.addEventListener('click', () => this.mediaFileInput.click());

    this.fileIndicator = document.createElement('span');
    this.fileIndicator.style.color = '#00ffcc';
    this.fileIndicator.style.fontSize = '12px';
    this.fileIndicator.style.fontFamily = 'monospace';
    this.fileIndicator.style.marginLeft = '10px';
    this.updateFileIndicator();

    toolbar.appendChild(playBtn);
    toolbar.appendChild(this.followBtn);
    toolbar.appendChild(addBtn);
    toolbar.appendChild(addFileBtn);
    toolbar.appendChild(this.fileIndicator);
    toolbar.appendChild(importBtn);
    toolbar.appendChild(saveBtn);
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
          this.addDroneSequence(time, file);
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
    window.addEventListener('keydown', (e) => {
      // Direct Save (Ctrl + S)
      if (e.code === 'KeyS' && e.ctrlKey && this.visible) {
        if (e.target.tagName !== 'INPUT') {
          e.preventDefault();
          this.saveDirectly();
        }
      }

      // Toggle Timeline (Ctrl + T)
      if (e.code === 'KeyT' && e.ctrlKey) {
        e.preventDefault();
        this.toggle();
      }
      if (e.key === ')' || (e.shiftKey && e.key === '0')) {
        e.preventDefault();
        const zoomLevels = [25, 50, 100, 200];
        let idx = zoomLevels.indexOf(this.pixelsPerSecond);
        idx = (idx + 1) % zoomLevels.length;
        this.pixelsPerSecond = zoomLevels[idx];
        this.renderRuler();
        this.renderTracks();
        this.anchorHead.style.left = (this.anchorTime * this.pixelsPerSecond) + 'px';
      }
      if (e.code === 'Space' && this.visible) {
        if (e.target.tagName !== 'INPUT') {
          e.preventDefault();
          this.togglePlay();
        }
      }

      // Undo (Ctrl + Z)
      if (e.code === 'KeyZ' && e.ctrlKey && this.visible) {
        if (e.target.tagName !== 'INPUT') {
          e.preventDefault();
          this.undo();
        }
      }

      // Redo (Ctrl + Y hoặc Ctrl + Shift + Z)
      if (((e.code === 'KeyY' && e.ctrlKey) || (e.code === 'KeyZ' && e.ctrlKey && e.shiftKey)) && this.visible) {
        if (e.target.tagName !== 'INPUT') {
          e.preventDefault();
          this.redo();
        }
      }

      // Copy (Ctrl + C)
      if (e.code === 'KeyC' && e.ctrlKey && this.visible) {
        if (e.target.tagName !== 'INPUT' && this.selectedEvents && this.selectedEvents.length > 0) {
          const minTime = Math.min(...this.selectedEvents.map(s => s.time));
          this.clipboardEvents = this.selectedEvents.map(s => {
            const clone = JSON.parse(JSON.stringify(s));
            delete clone._trackRow;
            delete clone._deleted;
            return {
              event: clone,
              offset: s.time - minTime
            };
          });
        }
      }

      // Paste (Ctrl + V)
      if (e.code === 'KeyV' && e.ctrlKey && this.visible) {
        if (e.target.tagName !== 'INPUT' && this.clipboardEvents && this.clipboardEvents.length > 0) {
          this.saveHistoryState();

          const newPastedEvents = [];
          this.clipboardEvents.forEach(item => {
            const newEvent = JSON.parse(JSON.stringify(item.event));
            newEvent.time = Math.round((this.anchorTime + item.offset) * 10) / 10;
            this.sequences.push(newEvent);
            newPastedEvents.push(newEvent);
          });

          // Set active selection to the newly pasted events
          this.selectedEvents = newPastedEvents;

          if (newPastedEvents.length > 0) {
            const primary = newPastedEvents[newPastedEvents.length - 1];
            this.inspector.show(primary);
          }

          this.renderTracks();
        }
      }

      // Delete
      if ((e.code === 'Delete' || e.code === 'Backspace') && this.visible) {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT' && this.selectedEvents && this.selectedEvents.length > 0) {
          this.saveHistoryState();
          this.selectedEvents.forEach(s => {
            s._deleted = true;
          });
          this.selectedEvents = [];
          this.inspector.hide();
          this.renderTracks();
        }
      }
    });

    // Auto-hide when entering Move Mode (pointer lock), show only if it was visible
    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement) {
        this.container.style.display = 'none';
      } else {
        this.container.style.display = this.visible ? 'flex' : 'none';
      }
    });
  }

  updateFileIndicator() {
    if (this.fileIndicator) {
      this.fileIndicator.textContent = this.filename ? `Active: ${this.filename}` : 'Active: demoShow.json';
    }
  }

  renderRuler() {
    this.ruler.innerHTML = '';
    const maxSeconds = 600; // 10 minutes limit
    const totalWidth = maxSeconds * this.pixelsPerSecond;
    if (this.ruler) this.ruler.style.width = totalWidth + 'px';
    if (this.tracksArea) this.tracksArea.style.width = totalWidth + 'px';

    const step = this.pixelsPerSecond < 50 ? 0.5 : 0.1;
    const labelInterval = this.pixelsPerSecond < 50 ? 1.0 : 0.5;

    for (let i = 0; i < maxSeconds; i += step) {
      const time = Math.round(i * 10) / 10;
      const tick = document.createElement('div');
      tick.style.position = 'absolute';
      tick.style.left = (time * this.pixelsPerSecond) + 'px';
      tick.style.bottom = '0';
      tick.style.height = '4px';
      tick.style.borderLeft = '1px solid #555';
      tick.style.pointerEvents = 'none';

      const timeMs = Math.round(time * 10);
      const labelIntervalMs = Math.round(labelInterval * 10);
      const isLabelTick = (timeMs % labelIntervalMs === 0);
      const isHalfSecond = (timeMs % 5 === 0);

      if (isHalfSecond || isLabelTick) {
        tick.style.height = (timeMs % 10 === 0) ? '12px' : '7px';
        tick.style.borderLeft = (timeMs % 10 === 0) ? '1px solid #999' : '1px solid #777';

        if (isLabelTick) {
          const label = document.createElement('span');
          label.textContent = time + 's';
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

  seek(time) {
    this.autoScrollEnabled = true;
    if (this.followBtn) {
      this.followBtn.textContent = t('editor.timelinePanel.followOn');
      this.followBtn.style.background = '#4CAF50';
    }

    this.sequences = this.sequences.filter(s => !s._deleted);
    this.showDirector.loadScript(this.sequences);
    this.showDirector.seek(time);
    this.playhead.style.left = (time * this.pixelsPerSecond) + 'px';
  }

  addSequence(time = this.anchorTime) {
    this.saveHistoryState();
    const newSeq = {
      time: Math.round(time * 10) / 10,
      type: 'sequence',
      pattern: 'random',
      count: 10,
      duration: 2.0,
      preset: 'strobe'
    };
    this.sequences.push(newSeq);
    this.renderTracks();
    this.inspector.show(newSeq);
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
        volume: 1.0
      };
      this.sequences.push(newSeq);
      this.renderTracks();
      this.inspector.show(newSeq);
      // Let showDirector know we loaded a new audio file so it can prep playback if needed
      const currentTime = this.showDirector.elapsedTime;
      this.showDirector.loadScript(this.sequences.filter(s => !s._deleted));
      this.showDirector.seek(currentTime);
    });

    audio.addEventListener('error', () => {
      alert(t('editor.timelinePanel.audioError'));
    });
  }

  addDroneSequence(time, file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        this.saveHistoryState();
        const data = JSON.parse(event.target.result);
        if (!data.droneCount || !data.steps) {
          throw new Error(t('editor.timelinePanel.notDroneShowJson'));
        }


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
          name: data.name || file.name,
          duration: duration,
          uiDuration: duration,
          droneCount: data.droneCount,
          steps: parsedSteps
        };
        this.sequences.push(newSeq);
        this.renderTracks();
        this.inspector.show(newSeq);
        const currentTime = this.showDirector.elapsedTime;
        this.showDirector.loadScript(this.sequences.filter(s => !s._deleted));
        this.showDirector.seek(currentTime);
      } catch (err) {
        alert(t('editor.timelinePanel.droneShowImportError', { error: err.message }));
      }
    };

    reader.readAsText(file);
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

      if (seq.type === 'cometsequence') {
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

      if (seq.type === 'audio') {
        block.textContent = t('editor.timelinePanel.audioBlock', { name: seq.name || seq.url || 'Audio' });
      } else if (seq.type === 'droneshow') {
        block.textContent = t('editor.timelinePanel.droneBlock', { name: seq.name || 'Drone Show', count: seq.droneCount });
      } else {
        block.textContent = t('editor.timelinePanel.eventBlock', { preset: seq.preset || seq.pattern, count: seq.count || 1 });
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
    const newX = e.clientX - this.tracksArea.getBoundingClientRect().left - this.dragOffsetX;
    let newTime = Math.max(0, newX / this.pixelsPerSecond);

    // Snap to 0.1s grid
    newTime = Math.round(newTime * 10) / 10;

    let dTime = newTime - (this.draggedEvent.initialTime !== undefined ? this.draggedEvent.initialTime : this.draggedEvent.time);

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
        this.inspector.render();
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
      const fileData = await window.electronAPI.openFileDialog();
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
        this.showDirector.loadScript(this.sequences.filter(s => !s._deleted));
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
        this.showDirector.loadScript(this.sequences.filter(s => !s._deleted));
        alert("Import thành công!");
      } catch (err) {
        alert("Lỗi khi đọc file JSON: " + err.message);
      }
      this.fileInput.value = '';
    };
    reader.readAsText(file);
  }

  async saveSequence() {
    // Cleanup temporary variables
    const cleanSeqs = this.sequences.filter(s => !s._deleted).map(s => {
      const { _trackRow, _deleted, _blobUrl, initialTime, ...cleanObj } = s;
      return cleanObj;
    });

    const content = JSON.stringify(cleanSeqs, null, 2);

    if (window.electronAPI) {
      if (this.currentFilePath) {
        try {
          await window.electronAPI.saveFileAbsolute(this.currentFilePath, content);
          alert(t('editor.timelinePanel.saveSuccess', { filename: this.filename }));
        } catch (err) {
          alert(t('editor.timelinePanel.saveError', { error: err.message }));
        }
      } else {
        // Save As
        try {
          const res = await window.electronAPI.saveFileDialog(content, this.filename || 'demoShow.json');
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
    this.showDirector.loadScript(this.sequences.filter(s => !s._deleted));
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
    this.showDirector.loadScript(this.sequences.filter(s => !s._deleted));
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
}
