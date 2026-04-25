import { PropertyInspector } from './PropertyInspector.js';
import { demoShow } from '../config/sequences/demoShow.js';

export class TimelineEditor {
  constructor(showDirector) {
    this.showDirector = showDirector;
    this.sequences = JSON.parse(JSON.stringify(demoShow)); // Deep clone to edit safely
    this.pixelsPerSecond = 50;
    this.rowHeight = 30;
    this.minBlockWidth = 20;
    this.visible = true;
    this.dragOffsetX = 0;
    this.isResizing = false;
    this.resizedEvent = null;
    this.resizeOffsetX = 0;
    this.initialDuration = 0;
    this.filename = 'demoShow.js';
    this.anchorTime = 0;
    
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
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'row';
    this.container.style.zIndex = '1000';
    this.container.style.color = 'white';
    this.container.style.fontFamily = 'sans-serif';
    
    // Block orbit controls when hovering
    this.container.addEventListener('mouseenter', () => window.dispatchEvent(new CustomEvent('timeline:hover', { detail: true })));
    this.container.addEventListener('mouseleave', () => window.dispatchEvent(new CustomEvent('timeline:hover', { detail: false })));

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
    playBtn.textContent = 'Play/Pause (Space)';
    playBtn.addEventListener('click', () => this.togglePlay());
    
    const addBtn = document.createElement('button');
    addBtn.textContent = '+ Add Sequence';
    addBtn.addEventListener('click', () => this.addSequence());

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
    saveBtn.style.background = '#2e7d32';
    saveBtn.style.color = 'white';
    saveBtn.addEventListener('click', () => this.saveSequence());

    this.fileSelect = document.createElement('select');
    this.fetchFileList();

    toolbar.appendChild(playBtn);
    toolbar.appendChild(addBtn);
    toolbar.appendChild(this.fileSelect);
    toolbar.appendChild(saveBtn);

    leftPanel.appendChild(toolbar);

    // Track Container
    this.trackContainer = document.createElement('div');
    this.trackContainer.style.flex = '1';
    this.trackContainer.style.position = 'relative';
    this.trackContainer.style.overflowX = 'auto';
    this.trackContainer.style.overflowY = 'auto';
    
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
      const time = Math.max(0, e.offsetX / this.pixelsPerSecond);
      this.anchorTime = time;
      this.anchorHead.style.left = (time * this.pixelsPerSecond) + 'px';
      this.seek(time);
    });
    this.trackContainer.appendChild(this.ruler);

    // Draw ruler ticks
    for (let i = 0; i < 1000; i++) {
      const tick = document.createElement('div');
      tick.style.position = 'absolute';
      tick.style.left = (i * this.pixelsPerSecond) + 'px';
      tick.style.bottom = '0';
      tick.style.height = '5px';
      tick.style.borderLeft = '1px solid #777';
      if (i % 5 === 0) {
        tick.style.height = '10px';
        const label = document.createElement('span');
        label.textContent = i + 's';
        label.style.position = 'absolute';
        label.style.left = '2px';
        label.style.bottom = '2px';
        label.style.fontSize = '10px';
        label.style.color = '#aaa';
        tick.appendChild(label);
      }
      this.ruler.appendChild(tick);
    }

    // Tracks area
    this.tracksArea = document.createElement('div');
    this.tracksArea.style.position = 'absolute';
    this.tracksArea.style.top = '20px';
    this.tracksArea.style.left = '0';
    this.tracksArea.style.width = '10000px';
    this.tracksArea.style.height = '1000px';
    
    // Drag events
    this.tracksArea.addEventListener('mousemove', (e) => this.onDrag(e));
    this.tracksArea.addEventListener('mouseup', (e) => this.onDragEnd(e));
    this.tracksArea.addEventListener('mouseleave', (e) => this.onDragEnd(e));
    // Click on empty space to add
    this.tracksArea.addEventListener('dblclick', (e) => {
      if (e.target === this.tracksArea) {
        const time = e.offsetX / this.pixelsPerSecond;
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
          const time = Math.max(0, e.offsetX / this.pixelsPerSecond);
          this.addAudioSequence(time, file);
        } else {
          alert('Chỉ hỗ trợ file âm thanh (vd: .mp3, .wav)');
        }
      }
    });

    this.trackContainer.appendChild(this.tracksArea);
    leftPanel.appendChild(this.trackContainer);
    this.container.appendChild(leftPanel);

    // Right side: Property Inspector
    const inspectorContainer = document.createElement('div');
    this.container.appendChild(inspectorContainer);
    
    let presetOptions = ['random'];
    if (this.showDirector && this.showDirector.fireworkSystem && this.showDirector.fireworkSystem.shellPresetFactory) {
      presetOptions = this.showDirector.fireworkSystem.shellPresetFactory.getPresetMenuEntries().map(e => e.key);
    }
    this.inspector = new PropertyInspector(inspectorContainer, () => this.renderTracks(), presetOptions);

    document.body.appendChild(this.container);

    // Global Hotkeys
    window.addEventListener('keydown', (e) => {
      if (e.key === 't' && e.ctrlKey) {
        e.preventDefault();
        this.toggle();
      }
      if (e.code === 'Space' && this.visible) {
        if (e.target.tagName !== 'INPUT') {
          e.preventDefault();
          this.togglePlay();
        }
      }
    });

    // Auto-hide when entering Move Mode (pointer lock), show when exiting Move Mode
    document.addEventListener('pointerlockchange', () => {
      this.visible = !document.pointerLockElement;
      this.container.style.display = this.visible ? 'flex' : 'none';
    });
  }

  async fetchFileList() {
    try {
      const res = await fetch('/api/list-sequences');
      const data = await res.json();
      if (data.success) {
        this.fileSelect.innerHTML = '';
        data.files.forEach(f => {
          const opt = document.createElement('option');
          opt.value = f;
          opt.textContent = f;
          if (f === this.filename) opt.selected = true;
          this.fileSelect.appendChild(opt);
        });
      }
    } catch (e) {
      console.warn("Could not fetch file list. Fallback to demoShow.js");
      const opt = document.createElement('option');
      opt.value = 'demoShow.js';
      opt.textContent = 'demoShow.js';
      this.fileSelect.appendChild(opt);
    }
  }

  toggle() {
    this.visible = !this.visible;
    this.container.style.display = this.visible ? 'flex' : 'none';
    if (this.visible && document.pointerLockElement) {
      document.exitPointerLock();
    }
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
    this.sequences = this.sequences.filter(s => !s._deleted);
    this.showDirector.loadScript(this.sequences);
    this.showDirector.seek(time);
    this.playhead.style.left = (time * this.pixelsPerSecond) + 'px';
  }

  addSequence(time = 0) {
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
      this.showDirector.loadScript(this.sequences.filter(s => !s._deleted));
    });
    
    audio.addEventListener('error', () => {
      alert("Lỗi khi đọc thông tin file âm thanh.");
    });
  }

  assignTracks() {
    // Sort events by time
    const sorted = [...this.sequences].filter(s => !s._deleted).sort((a, b) => a.time - b.time);
    const rows = []; // array of end-times for each row

    sorted.forEach(seq => {
      const start = seq.time;
      const visualDurationVal = seq.uiDuration !== undefined ? seq.uiDuration : (seq.duration || 0);
      // visual duration needs a minimum so we don't overlap zero-duration blocks
      const visualDuration = Math.max(visualDurationVal, this.minBlockWidth / this.pixelsPerSecond);
      const end = start + visualDuration + 0.1; // 0.1 padding

      let placed = false;
      for (let i = 0; i < rows.length; i++) {
        if (rows[i] <= start) {
          seq._trackRow = i;
          rows[i] = end;
          placed = true;
          break;
        }
      }
      if (!placed) {
        seq._trackRow = rows.length;
        rows.push(end);
      }
    });
  }

  renderTracks() {
    this.tracksArea.innerHTML = '';
    this.assignTracks();

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
      block.style.border = this.inspector.selectedEvent === seq ? '2px solid white' : '1px solid rgba(0,0,0,0.5)';
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
      } else {
        block.style.background = 'linear-gradient(90deg, #1565c0, #03a9f4)';
      }

      if (seq.type === 'audio') {
        block.textContent = `🎵 ${seq.name || seq.url || 'Audio'}`;
      } else {
        block.textContent = `${seq.preset || seq.pattern} (${seq.count || 1})`;
      }

      block.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        this.inspector.show(seq);
        this.renderTracks(); // to update border
        this.isDragging = true;
        this.draggedEvent = seq;
        this.dragOffsetX = e.offsetX;
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
    
    if (this.draggedEvent.time !== newTime) {
      this.draggedEvent.time = newTime;
      this.renderTracks();
      if (this.inspector.selectedEvent === this.draggedEvent) {
        this.inspector.render();
      }
    }
  }

  onDragEnd(e) {
    this.isDragging = false;
    this.draggedEvent = null;
    this.isResizing = false;
    this.resizedEvent = null;
  }

  updatePlayhead() {
    if (this.visible && this.showDirector) {
      const time = this.showDirector.elapsedTime;
      const x = time * this.pixelsPerSecond;
      this.playhead.style.left = x + 'px';
      
      // Auto-scroll
      const containerRect = this.trackContainer.getBoundingClientRect();
      const scrollLeft = this.trackContainer.scrollLeft;
      if (x > scrollLeft + containerRect.width - 100) {
        this.trackContainer.scrollLeft = x - containerRect.width + 100;
      }
    }
    requestAnimationFrame(this.updateLoop);
  }

  async saveSequence() {
    this.filename = this.fileSelect.value || 'demoShow.js';
    
    // Cleanup temporary variables
    const cleanSeqs = this.sequences.filter(s => !s._deleted).map(s => {
      const { _trackRow, _deleted, ...cleanObj } = s;
      return cleanObj;
    });

    const content = `export const ${this.filename.replace('.js', '')} = ${JSON.stringify(cleanSeqs, null, 2)};\n`;

    // Cách 1: Copy vào Clipboard
    try {
      await navigator.clipboard.writeText(content);
      console.log('Đã copy nội dung vào Clipboard!');
    } catch (e) {
      console.warn("Không thể copy vào clipboard", e);
    }

    // Cách 2: Tự động tải file về máy
    try {
      const blob = new Blob([content], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = this.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert(`Đã tải xuống file ${this.filename}!\n\nNội dung cũng đã được copy vào Clipboard.\nHãy chép file này vào thư mục: src/config/sequences/`);
    } catch (err) {
      alert('Lỗi khi lưu file: ' + err.message);
    }
  }
}
