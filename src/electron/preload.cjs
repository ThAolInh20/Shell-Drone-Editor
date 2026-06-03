const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  listSequences: () => ipcRenderer.invoke('list-sequences'),
  saveSequence: (filename, content) => ipcRenderer.invoke('save-sequence', { filename, content }),
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  saveFileDialog: (content, defaultName) => ipcRenderer.invoke('save-file-dialog', { content, defaultName }),
  saveFileAbsolute: (filePath, content) => ipcRenderer.invoke('save-file-absolute', { filePath, content }),
  onChangeLanguage: (callback) => ipcRenderer.on('change-language', (event, lang) => callback(lang))
});

// Prevent mouse side buttons (back/forward) from triggering navigation in the browser
window.addEventListener('mouseup', (e) => {
  if (e.button === 3 || e.button === 4) {
    e.preventDefault();
    e.stopPropagation();
  }
}, true);

window.addEventListener('mousedown', (e) => {
  if (e.button === 3 || e.button === 4) {
    e.preventDefault();
    e.stopPropagation();
  }
}, true);
