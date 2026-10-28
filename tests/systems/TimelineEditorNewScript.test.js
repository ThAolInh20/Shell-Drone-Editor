import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

global.localStorage = {
  getItem: () => null,
  setItem: () => {}
};

describe('TimelineEditor New Script', () => {
  let TimelineEditor;
  let mockShowDirector;
  let mockHotkeyManager;

  beforeAll(async () => {
    const mod = await import('../../src/ui/TimelineEditor.js');
    TimelineEditor = mod.TimelineEditor;
  });

  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', vi.fn());

    const mockElement = {
      style: {},
      dataset: {},
      appendChild: vi.fn(),
      addEventListener: vi.fn(),
      getBoundingClientRect: vi.fn().mockReturnValue({
        left: 0,
        top: 0,
        width: 800,
        height: 600
      }),
      classList: {
        add: vi.fn(),
        remove: vi.fn()
      },
      click: vi.fn(),
      title: '',
      innerHTML: '',
      textContent: ''
    };

    vi.stubGlobal('document', {
      createElement: vi.fn().mockReturnValue(mockElement),
      getElementById: vi.fn().mockReturnValue(null),
      body: {
        appendChild: vi.fn()
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

  it('should register ctrl+alt+n in timeline and global contexts', () => {
    new TimelineEditor(mockShowDirector, mockHotkeyManager);

    const registeredCombos = mockHotkeyManager.register.mock.calls.map(
      (call) => `${call[0]}:${call[1]}`
    );

    expect(registeredCombos).toContain('timeline:ctrl+alt+n');
    expect(registeredCombos).toContain('global:ctrl+alt+n');
  });

  it('should reset timeline and allow undo when createNewScript is invoked', async () => {
    const editor = new TimelineEditor(mockShowDirector, mockHotkeyManager);

    editor.sequences = [
      {
        time: 1.0,
        type: 'sequence',
        preset: 'crysanthemum',
        count: 5
      },
      {
        time: 5.0,
        type: 'audio',
        name: 'music.mp3'
      }
    ];

    expect(editor.sequences.length).toBe(2);

    // Call createNewScript without confirmation prompt if sequences are already set
    // Mock customConfirm to resolve true
    const modalMod = await import('../../src/editor/ui/utils/Modal.js');
    vi.spyOn(modalMod, 'customConfirm').mockResolvedValue(true);

    await editor.createNewScript();

    expect(editor.sequences).toEqual([]);
    expect(editor.selectedEvents).toEqual([]);
    expect(editor.filename).toBe('untitled.json');
    expect(mockShowDirector.loadScript).toHaveBeenCalledWith([]);
    expect(mockShowDirector.seek).toHaveBeenCalledWith(0);

    // Test Undo restores the sequences!
    editor.undo();
    expect(editor.sequences.length).toBe(2);
    expect(editor.sequences[0].preset).toBe('crysanthemum');
  });
});
