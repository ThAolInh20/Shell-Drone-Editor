import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

// Stub localStorage globally before dynamic imports are resolved
global.localStorage = {
  getItem: () => null,
  setItem: () => {}
};

describe('TimelineEditor Grouping Logic', () => {
  let TimelineEditor;
  let mockShowDirector;
  let mockHotkeyManager;

  beforeAll(async () => {
    const mod = await import('../../src/ui/TimelineEditor.js');
    TimelineEditor = mod.TimelineEditor;
  });

  beforeEach(() => {
    // Stub requestAnimationFrame
    vi.stubGlobal('requestAnimationFrame', vi.fn());

    // Stub basic document methods to prevent DOM exceptions during initDOM
    const mockElement = {
      style: {},
      dataset: {},
      appendChild: vi.fn(),
      addEventListener: vi.fn(),
      getBoundingClientRect: vi.fn().mockReturnValue({ left: 0, top: 0, width: 800, height: 600 }),
      classList: { add: vi.fn(), remove: vi.fn() },
      click: vi.fn(),
      title: '',
    };

    vi.stubGlobal('document', {
      createElement: vi.fn().mockReturnValue(mockElement),
      body: {
        appendChild: vi.fn(),
      },
      addEventListener: vi.fn(),
    });

    vi.stubGlobal('window', {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    mockShowDirector = {
      elapsedTime: 0,
      isPlaying: false,
      loadScript: vi.fn(),
      seek: vi.fn(),
    };

    mockHotkeyManager = {
      register: vi.fn(),
    };
  });

  it('should correctly calculate getFlattenedSequences', () => {
    const editor = new TimelineEditor(mockShowDirector, mockHotkeyManager);
    
    editor.sequences = [
      {
        time: 5.0,
        type: 'group',
        name: 'Group A',
        children: [
          { timeOffset: 0.0, type: 'sequence', preset: 'strobe' },
          { timeOffset: 2.5, type: 'audio', url: 'test.mp3' }
        ]
      },
      { time: 10.0, type: 'sequence', preset: 'crackle' }
    ];

    const flat = editor.getFlattenedSequences();
    expect(flat.length).toBe(3);
    
    expect(flat[0].time).toBe(5.0);
    expect(flat[0].preset).toBe('strobe');

    expect(flat[1].time).toBe(7.5);
    expect(flat[1].url).toBe('test.mp3');

    expect(flat[2].time).toBe(10.0);
  });

  it('should group selected items correctly', () => {
    const editor = new TimelineEditor(mockShowDirector, mockHotkeyManager);
    
    const item1 = { time: 4.0, duration: 2.0, type: 'sequence', preset: 'strobe' };
    const item2 = { time: 5.0, duration: 3.0, type: 'sequence', preset: 'crackle' };
    
    editor.sequences = [item1, item2];
    editor.selectedEvents = [item1, item2];

    editor.groupSelected();

    expect(editor.sequences.length).toBe(1);
    const group = editor.sequences[0];
    expect(group.type).toBe('group');
    expect(group.time).toBe(4.0);
    expect(group.duration).toBe(4.0); // maxEndTime (5.0 + 3.0) - minTime (4.0) = 4.0
    expect(group.children.length).toBe(2);
    expect(group.children[0].timeOffset).toBe(0.0);
    expect(group.children[1].timeOffset).toBe(1.0);
  });

  it('should ungroup selected group correctly', () => {
    const editor = new TimelineEditor(mockShowDirector, mockHotkeyManager);
    
    const group = {
      time: 10.0,
      type: 'group',
      duration: 5.0,
      children: [
        { timeOffset: 0.0, type: 'sequence', preset: 'strobe' },
        { timeOffset: 2.0, type: 'sequence', preset: 'crackle' }
      ]
    };

    editor.sequences = [group];
    editor.selectedEvents = [group];

    editor.ungroupSelected();

    expect(editor.sequences.length).toBe(2);
    expect(editor.sequences[0].time).toBe(10.0);
    expect(editor.sequences[1].time).toBe(12.0);
    expect(editor.sequences[0].preset).toBe('strobe');
    expect(editor.sequences[1].preset).toBe('crackle');
  });

  it('should recursively clean group block and children in cleanSequence', () => {
    const editor = new TimelineEditor(mockShowDirector, mockHotkeyManager);
    
    const group = {
      time: 10.0,
      type: 'group',
      _trackRow: 2,
      _deleted: false,
      children: [
        { timeOffset: 0.0, type: 'sequence', _trackRow: 3, _deleted: false }
      ]
    };

    const cleaned = editor.cleanSequence(group);
    expect(cleaned._trackRow).toBeUndefined();
    expect(cleaned._deleted).toBeUndefined();
    expect(cleaned.children[0]._trackRow).toBeUndefined();
    expect(cleaned.children[0]._deleted).toBeUndefined();
  });
});
