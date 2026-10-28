import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

global.localStorage = {
  getItem: () => null,
  setItem: () => {}
};

describe('TimelineEditor Marquee Selection', () => {
  let TimelineEditor;
  let mockShowDirector;
  let mockHotkeyManager;

  beforeAll(async () => {
    const mod = await import('../../src/ui/TimelineEditor.js');
    TimelineEditor = mod.TimelineEditor;
  });

  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', vi.fn());

    const createMockElement = () => ({
      style: {},
      dataset: {},
      appendChild: vi.fn(),
      addEventListener: vi.fn(),
      getBoundingClientRect: vi.fn().mockReturnValue({
        left: 0,
        top: 20,
        width: 10000,
        height: 1000
      }),
      classList: {
        add: vi.fn(),
        remove: vi.fn()
      },
      click: vi.fn(),
      title: '',
      innerHTML: '',
      textContent: ''
    });

    vi.stubGlobal('document', {
      createElement: vi.fn().mockImplementation(() => createMockElement()),
      getElementById: vi.fn().mockReturnValue(null),
      body: {
        appendChild: vi.fn(),
        style: {}
      },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    });

    vi.stubGlobal('window', {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    });

    mockShowDirector = {
      elapsedTime: 0,
      isPlaying: false,
      loadScript: vi.fn(),
      seek: vi.fn(),
      pause: vi.fn()
    };

    mockHotkeyManager = {
      register: vi.fn(),
      setActiveContext: vi.fn()
    };
  });

  it('should initialize marqueeBox element with proper default styles', () => {
    const editor = new TimelineEditor(mockShowDirector, mockHotkeyManager);
    expect(editor.marqueeBox).toBeDefined();
    expect(editor.marqueeBox.style.display).toBe('none');
    expect(editor.marqueeBox.style.position).toBe('absolute');
    expect(editor.marqueeBox.style.pointerEvents).toBe('none');
  });

  it('should start potential marquee selection on tracksArea mousedown', () => {
    const editor = new TimelineEditor(mockShowDirector, mockHotkeyManager);
    const mousedownHandler = editor.tracksArea.addEventListener.mock.calls.find(
      (call) => call[0] === 'mousedown'
    )?.[1];

    expect(mousedownHandler).toBeDefined();

    const mockEvent = {
      button: 0,
      target: editor.tracksArea,
      clientX: 100,
      clientY: 80,
      ctrlKey: true,
      shiftKey: false
    };

    mousedownHandler(mockEvent);

    expect(editor.isPotentialMarquee).toBe(true);
    expect(editor.isMarqueeSelecting).toBe(false);
    expect(editor.marqueeIsAdditive).toBe(true);
    expect(editor.marqueeStartX).toBe(100);
    expect(editor.marqueeStartY).toBe(60); // 80 - 20 (top offset)
  });

  it('should activate marquee box and calculate AABB intersection during drag', () => {
    const editor = new TimelineEditor(mockShowDirector, mockHotkeyManager);
    editor.pixelsPerSecond = 100;
    editor.rowHeight = 30;

    const seq1 = {
      time: 1.0, // starts at 100px
      duration: 2.0, // width = 200px (100px to 300px)
      type: 'sequence'
    };
    const seq2 = {
      time: 5.0, // starts at 500px (500px to 600px)
      duration: 1.0,
      type: 'sequence'
    };

    editor.sequences = [seq1, seq2];
    editor.renderTracks();

    // Setup potential marquee
    editor.isPotentialMarquee = true;
    editor.marqueeStartClientX = 50;
    editor.marqueeStartClientY = 25;
    editor.marqueeStartX = 50;
    editor.marqueeStartY = 5;
    editor.marqueeIsAdditive = false;
    editor.marqueeInitialSelected = [];

    // Drag to 250px horizontally, 100px vertically (enclosing seq1 which is on row 1, top=40px, bottom=70px)
    const moveEvent = {
      clientX: 250,
      clientY: 100
    };

    editor.onDrag(moveEvent);

    expect(editor.isMarqueeSelecting).toBe(true);
    expect(editor.marqueeBox.style.display).toBe('block');
    expect(editor.marqueeBox.style.left).toBe('50px');
    expect(editor.marqueeBox.style.top).toBe('5px');
    expect(editor.marqueeBox.style.width).toBe('200px');
    expect(editor.marqueeBox.style.height).toBe('75px'); // 100 - 20 - 5

    // seq1 should be selected, seq2 should not
    expect(editor.selectedEvents).toContain(seq1);
    expect(editor.selectedEvents).not.toContain(seq2);
  });

  it('should support additive selection when Ctrl is held', () => {
    const editor = new TimelineEditor(mockShowDirector, mockHotkeyManager);
    editor.pixelsPerSecond = 100;
    editor.rowHeight = 30;

    const seq1 = {
      time: 1.0,
      duration: 1.0,
      type: 'sequence'
    };
    const seq2 = {
      time: 3.0,
      duration: 1.0,
      type: 'sequence'
    };

    editor.sequences = [seq1, seq2];
    editor.selectedEvents = [seq1]; // seq1 already selected
    editor.renderTracks();

    // Start additive marquee
    editor.isPotentialMarquee = true;
    editor.marqueeStartClientX = 250;
    editor.marqueeStartClientY = 25;
    editor.marqueeStartX = 250;
    editor.marqueeStartY = 5;
    editor.marqueeIsAdditive = true;
    editor.marqueeInitialSelected = [seq1];

    // Drag over seq2 (starts at 300px, ends at 400px, top=40px, bottom=70px)
    editor.onDrag({
      clientX: 450,
      clientY: 100
    });

    expect(editor.isMarqueeSelecting).toBe(true);
    // Both seq1 (initial) and seq2 (newly enclosed) should be selected
    expect(editor.selectedEvents).toContain(seq1);
    expect(editor.selectedEvents).toContain(seq2);
    expect(editor.selectedEvents.length).toBe(2);
  });

  it('should finalize selection and hide marqueeBox on onDragEnd', () => {
    const editor = new TimelineEditor(mockShowDirector, mockHotkeyManager);
    const seq = { time: 1.0, duration: 1.0, type: 'sequence' };
    editor.sequences = [seq];
    editor.isMarqueeSelecting = true;
    editor.isPotentialMarquee = true;
    editor.selectedEvents = [seq];

    editor.onDragEnd({});

    expect(editor.isMarqueeSelecting).toBe(false);
    expect(editor.isPotentialMarquee).toBe(false);
    expect(editor.marqueeBox.style.display).toBe('none');
    expect(editor.selectedEvents).toContain(seq);
  });

  it('should deselect all when clicking empty space without moving mouse and without Ctrl', () => {
    const editor = new TimelineEditor(mockShowDirector, mockHotkeyManager);
    const seq = { time: 1.0, duration: 1.0, type: 'sequence' };
    editor.sequences = [seq];
    editor.selectedEvents = [seq];

    // Mousedown on empty space without Ctrl
    editor.isPotentialMarquee = true;
    editor.isMarqueeSelecting = false;
    editor.marqueeIsAdditive = false;

    // Mouseup without dragging
    editor.onDragEnd({});

    expect(editor.selectedEvents).toEqual([]);
  });
});
