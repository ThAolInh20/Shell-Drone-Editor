const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  listSequences: () => ipcRenderer.invoke('list-sequences'),
  saveSequence: (filename, content) => ipcRenderer.invoke('save-sequence', { filename, content }),
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  saveFileDialog: (content, defaultName) => ipcRenderer.invoke('save-file-dialog', { content, defaultName }),
  saveFileAbsolute: (filePath, content) => ipcRenderer.invoke('save-file-absolute', { filePath, content })
});
