import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { fileStorage } from '../../src/core/FileStorageAdapter.js';

global.localStorage = {
  getItem: () => null,
  setItem: () => {}
};

describe('TimelineEditor Export Sequence Context Preservation', () => {
  let TimelineEditor;
  let mockShowDirector;
  let mockHotkeyManager;

  beforeAll(async () => {
    const mod = await import('../../src/ui/TimelineEditor.js');
    TimelineEditor = mod.TimelineEditor;
  });

  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', vi.fn());
    vi.stubGlobal('alert', vi.fn());

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
        appendChild: vi.fn(),
        removeChild: vi.fn()
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
      clear: vi.fn(),
      seek: vi.fn(),
      fireworkSequencer: {
        events: []
      },
      droneSequencer: {
        events: []
      }
    };

    mockHotkeyManager = {
      register: vi.fn(),
      unregister: vi.fn()
    };
  });

  it('should not mutate currentFilePath or filename when exporting selected blocks in Electron', async () => {
    const editor = new TimelineEditor(
      mockShowDirector,
      mockHotkeyManager
    );

    editor.currentFilePath = 'E:/projects/original_show.json';
    editor.filename = 'original_show.json';
    editor.updateFileIndicator = vi.fn();

    const selectedEvent = {
      id: 'event-1',
      name: 'Grand Finale Strobe',
      type: 'firework',
      preset: 'strobe_white',
      time: 5.0
    };
    editor.selectedEvents = [selectedEvent];

    fileStorage.isElectron = true;
    const saveFileDialogSpy = vi
      .spyOn(fileStorage, 'saveFileDialog')
      .mockResolvedValue({
        filePath: 'E:/exports/export_grand_finale_strobe.json',
        filename: 'export_grand_finale_strobe.json'
      });

    await editor.exportSequence(true);

    expect(saveFileDialogSpy).toHaveBeenCalledWith(
      expect.any(String),
      'export_grand_finale_strobe.json'
    );
    expect(editor.currentFilePath).toBe('E:/projects/original_show.json');
    expect(editor.filename).toBe('original_show.json');
    expect(editor.updateFileIndicator).not.toHaveBeenCalled();

    saveFileDialogSpy.mockRestore();
  });

  it('should not mutate currentFilePath or filename when exporting entire sequence in Electron', async () => {
    const editor = new TimelineEditor(
      mockShowDirector,
      mockHotkeyManager
    );

    editor.currentFilePath = 'E:/projects/original_show.json';
    editor.filename = 'original_show.json';
    editor.sequences = [
      {
        id: 'event-1',
        time: 1.0,
        type: 'firework'
      }
    ];
    editor.updateFileIndicator = vi.fn();

    fileStorage.isElectron = true;
    const saveFileDialogSpy = vi
      .spyOn(fileStorage, 'saveFileDialog')
      .mockResolvedValue({
        filePath: 'E:/exports/another_export.json',
        filename: 'another_export.json'
      });

    await editor.exportSequence(false);

    expect(saveFileDialogSpy).toHaveBeenCalledWith(
      expect.any(String),
      'original_show.json'
    );
    expect(editor.currentFilePath).toBe('E:/projects/original_show.json');
    expect(editor.filename).toBe('original_show.json');
    expect(editor.updateFileIndicator).not.toHaveBeenCalled();

    saveFileDialogSpy.mockRestore();
  });

  it('should use export_selected_blocks.json when multiple blocks are selected', async () => {
    const editor = new TimelineEditor(
      mockShowDirector,
      mockHotkeyManager
    );

    editor.currentFilePath = 'E:/projects/original_show.json';
    editor.filename = 'original_show.json';
    editor.selectedEvents = [
      {
        id: '1',
        time: 1.0,
        type: 'firework'
      },
      {
        id: '2',
        time: 2.0,
        type: 'comet'
      }
    ];

    fileStorage.isElectron = true;
    const saveFileDialogSpy = vi
      .spyOn(fileStorage, 'saveFileDialog')
      .mockResolvedValue({
        filePath: 'E:/exports/export_selected_blocks.json',
        filename: 'export_selected_blocks.json'
      });

    await editor.exportSequence(true);

    expect(saveFileDialogSpy).toHaveBeenCalledWith(
      expect.any(String),
      'export_selected_blocks.json'
    );
    expect(editor.currentFilePath).toBe('E:/projects/original_show.json');
    expect(editor.filename).toBe('original_show.json');

    saveFileDialogSpy.mockRestore();
  });
});

