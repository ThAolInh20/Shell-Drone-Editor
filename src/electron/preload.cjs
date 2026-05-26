const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  listSequences: () => ipcRenderer.invoke('list-sequences'),
  saveSequence: (filename, content) => ipcRenderer.invoke('save-sequence', { filename, content })
});
