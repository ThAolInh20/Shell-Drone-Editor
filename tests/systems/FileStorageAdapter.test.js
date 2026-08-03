import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FileStorageAdapter } from '../../src/core/FileStorageAdapter.js';

describe('FileStorageAdapter', () => {
  let mockElectronAPI;

  beforeEach(() => {
    mockElectronAPI = {
      listSequences: vi.fn().mockResolvedValue(['seq1.json']),
      saveSequence: vi.fn().mockResolvedValue(true),
      openFileDialog: vi.fn().mockResolvedValue({
        content: '{}',
        filename: 'seq1.json',
        filePath: '/path/seq1.json'
      }),
      saveFileDialog: vi.fn().mockResolvedValue({
        filePath: '/path/seq2.json',
        filename: 'seq2.json'
      }),
      saveFileAbsolute: vi.fn().mockResolvedValue(true),
      onChangeLanguage: vi.fn()
    };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Running in Electron', () => {
    beforeEach(() => {
      vi.stubGlobal(
        'window',
        {
          electronAPI: mockElectronAPI
        }
      );
    });

    it('should delegate listSequences to electronAPI', async () => {
      const adapter = new FileStorageAdapter();
      const files = await adapter.listSequences();
      expect(mockElectronAPI.listSequences).toHaveBeenCalled();
      expect(files).toEqual(['seq1.json']);
    });

    it('should delegate saveSequence to electronAPI', async () => {
      const adapter = new FileStorageAdapter();
      const result = await adapter.saveSequence(
        'test.json',
        'content'
      );
      expect(mockElectronAPI.saveSequence).toHaveBeenCalledWith(
        'test.json',
        'content'
      );
      expect(result).toBe(true);
    });

    it('should delegate openFileDialog to electronAPI', async () => {
      const adapter = new FileStorageAdapter();
      const fileData = await adapter.openFileDialog();
      expect(mockElectronAPI.openFileDialog).toHaveBeenCalled();
      expect(fileData.filename).toBe('seq1.json');
    });

    it('should delegate saveFileDialog to electronAPI', async () => {
      const adapter = new FileStorageAdapter();
      const res = await adapter.saveFileDialog(
        'content',
        'default.json'
      );
      expect(mockElectronAPI.saveFileDialog).toHaveBeenCalledWith(
        'content',
        'default.json'
      );
      expect(res.filename).toBe('seq2.json');
    });

    it('should delegate saveFileAbsolute to electronAPI', async () => {
      const adapter = new FileStorageAdapter();
      const res = await adapter.saveFileAbsolute(
        '/abs/path',
        'content'
      );
      expect(mockElectronAPI.saveFileAbsolute).toHaveBeenCalledWith(
        '/abs/path',
        'content'
      );
      expect(res).toBe(true);
    });

    it('should register onChangeLanguage listener', () => {
      const adapter = new FileStorageAdapter();
      const cb = () => {};
      adapter.onChangeLanguage(cb);
      expect(mockElectronAPI.onChangeLanguage).toHaveBeenCalledWith(cb);
    });
  });

  describe('Running in Web Browser', () => {
    beforeEach(() => {
      vi.stubGlobal(
        'window',
        {}
      );
      vi.stubGlobal(
        'fetch',
        vi.fn()
      );
      vi.stubGlobal(
        'localStorage',
        {
          length: 0,
          key: vi.fn(),
          setItem: vi.fn(),
          getItem: vi.fn()
        }
      );
      vi.stubGlobal(
        'document',
        {
          createElement: vi.fn().mockReturnValue({
            style: {},
            click: vi.fn(),
            addEventListener: vi.fn()
          }),
          body: {
            appendChild: vi.fn(),
            removeChild: vi.fn()
          }
        }
      );
      vi.stubGlobal(
        'URL',
        {
          createObjectURL: vi.fn().mockReturnValue('blob:url'),
          revokeObjectURL: vi.fn()
        }
      );
    });

    it('should fetch from API in listSequences', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          files: ['web1.json']
        })
      });

      const adapter = new FileStorageAdapter();
      const files = await adapter.listSequences();
      expect(fetch).toHaveBeenCalledWith('./api/list-sequences');
      expect(files).toEqual(['web1.json']);
    });

    it('should fetch API in saveSequence', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true
        })
      });

      const adapter = new FileStorageAdapter();
      const res = await adapter.saveSequence(
        'test.json',
        'content'
      );
      expect(fetch).toHaveBeenCalledWith(
        './api/save-sequence',
        expect.objectContaining({
          method: 'POST'
        })
      );
      expect(res).toBe(true);
    });

    it('should fallback to localStorage in saveFileAbsolute', async () => {
      const adapter = new FileStorageAdapter();
      const res = await adapter.saveFileAbsolute(
        'mySeq',
        'content'
      );
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'seq:mySeq',
        'content'
      );
      expect(res).toBe(true);
    });
  });
});
