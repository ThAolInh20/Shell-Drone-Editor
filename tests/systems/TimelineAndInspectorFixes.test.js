import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

global.localStorage = {
  getItem: () => null,
  setItem: () => {}
};

describe('Timeline and Property Inspector Bug Fixes', () => {
  let TimelineEditor;
  let PropertyInspector;
  let WaveformGenerator;
  let CustomSelect;
  let mockShowDirector;
  let mockHotkeyManager;

  beforeAll(async () => {
    const editorMod = await import('../../src/ui/TimelineEditor.js');
    TimelineEditor = editorMod.TimelineEditor;

    const inspectorMod = await import('../../src/ui/PropertyInspector.js');
    PropertyInspector = inspectorMod.PropertyInspector;

    const waveMod = await import('../../src/utils/WaveformGenerator.js');
    WaveformGenerator = waveMod.WaveformGenerator;

    const selectMod = await import('../../src/ui/CustomSelect.js');
    CustomSelect = selectMod.CustomSelect;
  });

  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', vi.fn());

    const createMockElement = () => ({
      style: {},
      dataset: {},
      appendChild: vi.fn(),
      removeChild: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      getContext: vi.fn().mockReturnValue({
        save: vi.fn(),
        scale: vi.fn(),
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        restore: vi.fn()
      }),
      getBoundingClientRect: vi.fn().mockReturnValue({
        left: 0,
        top: 0,
        width: 800,
        height: 600
      }),
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
        contains: vi.fn().mockReturnValue(false)
      },
      querySelectorAll: vi.fn().mockReturnValue([]),
      querySelector: vi.fn().mockReturnValue(null),
      contains: vi.fn().mockReturnValue(false),
      blur: vi.fn(),
      click: vi.fn(),
      value: '',
      title: ''
    });

    vi.stubGlobal('document', {
      createElement: vi.fn().mockImplementation(() => createMockElement()),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn()
      },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      activeElement: null
    });

    vi.stubGlobal('window', {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    });

    mockShowDirector = {
      elapsedTime: 12.5,
      isPlaying: false,
      loadScript: vi.fn().mockImplementation(() => {
        mockShowDirector.elapsedTime = 0;
      }),
      seek: vi.fn().mockImplementation((t) => {
        mockShowDirector.elapsedTime = t;
      })
    };

    mockHotkeyManager = {
      register: vi.fn(),
      setActiveContext: vi.fn()
    };
  });

  describe('Bug 5 & Bug 1: Timeline playhead and viewport retention', () => {
    it('groupSelected should restore currentTime via seek and keep playhead at current time', () => {
      const editor = new TimelineEditor(mockShowDirector, mockHotkeyManager);
      mockShowDirector.elapsedTime = 15.0;

      const eventA = { time: 10.0, duration: 2.0, type: 'sequence' };
      const eventB = { time: 14.0, duration: 3.0, type: 'sequence' };
      editor.sequences = [eventA, eventB];
      editor.selectedEvents = [eventA, eventB];

      editor.groupSelected();

      expect(mockShowDirector.loadScript).toHaveBeenCalled();
      expect(mockShowDirector.seek).toHaveBeenCalledWith(15.0);
      expect(editor.playhead.style.left).toBe(`${15.0 * editor.pixelsPerSecond}px`);
    });

    it('ungroupSelected should restore currentTime via seek and keep playhead at current time', () => {
      const editor = new TimelineEditor(mockShowDirector, mockHotkeyManager);
      mockShowDirector.elapsedTime = 22.0;

      const groupBlock = {
        time: 10.0,
        type: 'group',
        children: [
          { timeOffset: 0.0, type: 'sequence' },
          { timeOffset: 2.0, type: 'sequence' }
        ]
      };
      editor.sequences = [groupBlock];
      editor.selectedEvents = [groupBlock];

      editor.ungroupSelected();

      expect(mockShowDirector.loadScript).toHaveBeenCalled();
      expect(mockShowDirector.seek).toHaveBeenCalledWith(22.0);
      expect(editor.playhead.style.left).toBe(`${22.0 * editor.pixelsPerSecond}px`);
    });

    it('updatePlayhead should not auto-scroll when isPlaying is false', () => {
      const editor = new TimelineEditor(mockShowDirector, mockHotkeyManager);
      editor.trackContainer.scrollLeft = 500;
      mockShowDirector.elapsedTime = 0;
      mockShowDirector.isPlaying = false;
      editor.autoScrollEnabled = true;

      editor.updatePlayhead();

      expect(editor.trackContainer.scrollLeft).toBe(500);
    });
  });

  describe('Bug 3: Resetting old composition effects when changing preset', () => {
    it('should delete old effect tags and clear boolean effect flags on preset switch', () => {
      const mockContainer = {
        style: {},
        innerHTML: '',
        appendChild: vi.fn(),
        querySelectorAll: vi.fn().mockReturnValue([])
      };
      const onUpdate = vi.fn();
      const inspector = new PropertyInspector(mockContainer, onUpdate);

      const event = {
        time: 5.0,
        type: 'sequence',
        preset: 'strobe_white',
        strobe: true,
        crackle: true,
        ghost: true,
        'white-strobe': true,
        effects: ['strobe', 'white-strobe']
      };

      inspector.show(event);

      let capturedSelect = null;
      const originalBuildUI = CustomSelect.prototype._buildUI;
      CustomSelect.prototype._buildUI = function () {
        capturedSelect = this;
        return originalBuildUI.apply(this, arguments);
      };

      try {
        const dummyParent = { appendChild: vi.fn() };
        inspector.renderStandardInput(dummyParent, {
          name: 'preset',
          labelKey: 'preset',
          type: 'select',
          options: ['crysanthemum', 'random']
        });

        expect(capturedSelect).not.toBeNull();
        capturedSelect.setValue('crysanthemum', true);

        expect(event.preset).toBe('crysanthemum');
        expect(event.strobe).toBeUndefined();
        expect(event.crackle).toBeUndefined();
        expect(event.ghost).toBeUndefined();
        expect(event['white-strobe']).toBeUndefined();
      } finally {
        CustomSelect.prototype._buildUI = originalBuildUI;
      }
    });
  });

  describe('Bug 4: Waveform preservation across Undo and Redo', () => {
    it('should preserve Float32Array waveform peaks across undo and redo cycles', () => {
      const editor = new TimelineEditor(mockShowDirector, mockHotkeyManager);
      const testPeaks = new Float32Array([0.1, 0.5, 0.9, 0.3]);

      const audioSeq = {
        time: 0.0,
        type: 'audio',
        name: 'song.mp3',
        url: 'song.mp3',
        _blobUrl: 'blob:test-url',
        _waveformPeaks: testPeaks
      };

      editor.sequences = [audioSeq];
      editor.saveHistoryState();

      // Simulate a mutation after history snapshot
      editor.sequences = [{
        ...audioSeq,
        time: 5.0
      }];

      // Perform undo
      editor.undo();
      const restoredSeq = editor.sequences[0];
      expect(restoredSeq.time).toBe(0.0);
      expect(restoredSeq._waveformPeaks).toBeDefined();
      expect(restoredSeq._waveformPeaks instanceof Float32Array).toBe(true);
      expect(restoredSeq._waveformPeaks.length).toBe(4);
      expect(restoredSeq._waveformPeaks[1]).toBeCloseTo(0.5);

      // Perform redo
      editor.redo();
      expect(editor.sequences[0].time).toBe(5.0);
      expect(editor.sequences[0]._waveformPeaks instanceof Float32Array).toBe(true);
      expect(editor.sequences[0]._waveformPeaks[1]).toBeCloseTo(0.5);
    });

    it('WaveformGenerator.renderWaveform should safely handle plain object peaks without errors', () => {
      const mockCanvas = {
        getContext: vi.fn().mockReturnValue({
          save: vi.fn(),
          scale: vi.fn(),
          clearRect: vi.fn(),
          fillRect: vi.fn(),
          restore: vi.fn()
        }),
        clientWidth: 300,
        clientHeight: 40
      };

      const plainObjPeaks = { '0': 0.2, '1': 0.8, '2': 0.4 };
      expect(() => {
        WaveformGenerator.renderWaveform(mockCanvas, plainObjPeaks);
      }).not.toThrow();
    });
  });

  describe('Bug 2: Property Inspector focus race condition', () => {
    it('show(newEvent) should clear debounceTimeout and reset isEditing', () => {
      const mockContainer = {
        style: {},
        innerHTML: '',
        appendChild: vi.fn(),
        querySelectorAll: vi.fn().mockReturnValue([]),
        contains: vi.fn().mockReturnValue(false)
      };
      const onUpdate = vi.fn();
      const inspector = new PropertyInspector(mockContainer, onUpdate);

      const eventA = { time: 1.0, count: 5 };
      inspector.show(eventA);
      inspector.debounceTimeout = setTimeout(() => {}, 1000);
      inspector.isEditing = true;

      const eventB = { time: 10.0, count: 10 };
      inspector.show(eventB);

      expect(inspector.debounceTimeout).toBeNull();
      expect(inspector.isEditing).toBe(false);
      expect(inspector.selectedEvent).toBe(eventB);
    });
  });
});
