import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !app.isPackaged;

let mainWindow = null;

// Resolve the sequences directory path safely
const sequencesDir = isDev
  ? path.resolve(__dirname, '../../src/config/sequences')
  : path.join(app.getPath('userData'), 'sequences');

// Ensure sequences directory exists
if (!fs.existsSync(sequencesDir)) {
  fs.mkdirSync(sequencesDir, { recursive: true });
}

// Seed default sequences in production if userData folder is empty
if (!isDev) {
  try {
    // In prod, main.js is at src/electron/main.js in ASAR, but resources are in resources/app/
    const defaultSequencesDir = path.resolve(__dirname, '../config/sequences');
    if (fs.existsSync(defaultSequencesDir)) {
      const files = fs.readdirSync(defaultSequencesDir);
      for (const file of files) {
        const destPath = path.join(sequencesDir, file);
        if (!fs.existsSync(destPath)) {
          fs.copyFileSync(path.join(defaultSequencesDir, file), destPath);
        }
      }
    }
  } catch (err) {
    console.error('Failed to seed default sequences in production:', err);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'Shell Drone Animation Editor',
    backgroundColor: '#1a1a1a',
    icon: path.join(__dirname, '../../public/icon2.ico'),
  });

  const menuTemplate = [
    {
      label: 'File',
      submenu: [
        { role: 'quit', label: 'Quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo', label: 'Undo' },
        { role: 'redo', label: 'Redo' },
        { type: 'separator' },
        { role: 'cut', label: 'Cut' },
        { role: 'copy', label: 'Copy' },
        { role: 'paste', label: 'Paste' },
        { role: 'delete', label: 'Delete' },
        { type: 'separator' },
        { role: 'selectAll', label: 'Select All' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload', label: 'Reload' },
        { role: 'forceReload', label: 'Force Reload' },
        { role: 'toggleDevTools', label: 'Toggle Developer Tools' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Actual Size' },
        { role: 'zoomIn', label: 'Zoom In' },
        { role: 'zoomOut', label: 'Zoom Out' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Toggle Full Screen' },
        { type: 'separator' },
        {
          label: 'Language / Ngôn ngữ',
          submenu: [
            {
              label: 'Tiếng Việt',
              type: 'radio',
              click: () => {
                if (mainWindow) mainWindow.webContents.send('change-language', 'vi');
              }
            },
            {
              label: 'English',
              type: 'radio',
              click: () => {
                if (mainWindow) mainWindow.webContents.send('change-language', 'en');
              }
            },
            {
              label: '简体中文 (Chinese)',
              type: 'radio',
              click: () => {
                if (mainWindow) mainWindow.webContents.send('change-language', 'zh');
              }
            },
            {
              label: '日本語 (Japanese)',
              type: 'radio',
              click: () => {
                if (mainWindow) mainWindow.webContents.send('change-language', 'ja');
              }
            }
          ]
        }
      ]
    },
    {
      label: 'Editor Screens',
      submenu: [
        {
          label: '1. Fireworks Display (Timeline Editor)',
          accelerator: 'CmdOrCtrl+1',
          click: () => {
            if (mainWindow) {
              const currentUrl = mainWindow.webContents.getURL();
              if (isDev && currentUrl.startsWith('http')) {
                const base = new URL(currentUrl).origin;
                mainWindow.loadURL(`${base}/index.html`);
              } else {
                mainWindow.loadURL(`file://${path.join(__dirname, '../../dist/index.html')}`);
              }
            }
          }
        },
        {
          label: '2. Advanced Drone Editor (Animated)',
          accelerator: 'CmdOrCtrl+2',
          click: () => {
            if (mainWindow) {
              const currentUrl = mainWindow.webContents.getURL();
              if (isDev && currentUrl.startsWith('http')) {
                const base = new URL(currentUrl).origin;
                mainWindow.loadURL(`${base}/editor.html`);
              } else {
                mainWindow.loadURL(`file://${path.join(__dirname, '../../dist/editor.html')}`);
              }
            }
          }
        },
        {
          label: '3. Static Formation Designer',
          accelerator: 'CmdOrCtrl+3',
          click: () => {
            if (mainWindow) {
              const currentUrl = mainWindow.webContents.getURL();
              if (isDev && currentUrl.startsWith('http')) {
                const base = new URL(currentUrl).origin;
                mainWindow.loadURL(`${base}/formation.html`);
              } else {
                mainWindow.loadURL(`file://${path.join(__dirname, '../../dist/formation.html')}`);
              }
            }
          }
        }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize', label: 'Minimize' },
        { role: 'zoom', label: 'Zoom' },
        ...(process.platform === 'darwin' ? [
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'window' }
        ] : [
          { role: 'close', label: 'Close' }
        ])
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  // URL configuration depending on environment
  const startUrl = isDev
    ? 'http://localhost:5173'
    : `file://${path.join(__dirname, '../../dist/index.html')}`;

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}


// IPC Handlers for sequences management
ipcMain.handle('list-sequences', async () => {
  try {
    if (!fs.existsSync(sequencesDir)) {
      return [];
    }
    const files = fs.readdirSync(sequencesDir)
      .filter(file => file.endsWith('.json'));
    return files;
  } catch (err) {
    console.error('Error listing sequences:', err);
    throw err;
  }
});

ipcMain.handle('save-sequence', async (event, { filename, content }) => {
  try {
    const safeFilename = filename.replace(/[^a-zA-Z0-9.\-_]/g, '');
    if (!safeFilename.endsWith('.json')) {
      throw new Error('Filename must end with .json');
    }
    const filePath = path.join(sequencesDir, safeFilename);
    fs.writeFileSync(filePath, content, 'utf8');
    return { success: true, path: filePath };
  } catch (err) {
    console.error('Error saving sequence:', err);
    throw err;
  }
});

// IPC Handlers for native OS Dialogs (Notepad-style Direct Save)
ipcMain.handle('open-file-dialog', async (event) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{ name: 'JSON Files', extensions: ['json'] }]
    });
    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      const content = fs.readFileSync(filePath, 'utf8');
      const filename = path.basename(filePath);
      return { filePath, content, filename };
    }
    return null;
  } catch (err) {
    console.error('Error opening file dialog:', err);
    throw err;
  }
});

ipcMain.handle('save-file-dialog', async (event, { content, defaultName }) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: defaultName || 'untitled.json',
      filters: [{ name: 'JSON Files', extensions: ['json'] }]
    });
    if (!result.canceled && result.filePath) {
      const filePath = result.filePath;
      fs.writeFileSync(filePath, content, 'utf8');
      const filename = path.basename(filePath);
      return { filePath, filename };
    }
    return null;
  } catch (err) {
    console.error('Error saving file dialog:', err);
    throw err;
  }
});

ipcMain.handle('save-file-absolute', async (event, { filePath, content }) => {
  try {
    fs.writeFileSync(filePath, content, 'utf8');
    return { success: true };
  } catch (err) {
    console.error('Error writing absolute file path:', err);
    throw err;
  }
});


app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
