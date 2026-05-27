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
    icon: path.join(__dirname, '../../public/icon.ico'),
  });

  // Setup Application Menu with navigation links
  const menuTemplate = [
    {
      label: 'File',
      submenu: [
        { role: 'quit', label: 'Thoát' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo', label: 'Hoàn tác (Undo)' },
        { role: 'redo', label: 'Làm lại (Redo)' },
        { type: 'separator' },
        { role: 'cut', label: 'Cắt (Cut)' },
        { role: 'copy', label: 'Sao chép (Copy)' },
        { role: 'paste', label: 'Dán (Paste)' },
        { role: 'delete', label: 'Xóa (Delete)' },
        { type: 'separator' },
        { role: 'selectAll', label: 'Chọn tất cả' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload', label: 'Tải lại trang' },
        { role: 'forceReload', label: 'Ép tải lại' },
        { role: 'toggleDevTools', label: 'Bật/Tắt DevTools' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Kích thước chuẩn' },
        { role: 'zoomIn', label: 'Phóng to' },
        { role: 'zoomOut', label: 'Thu nhỏ' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Toàn màn hình' }
      ]
    },
    {
      label: 'Màn hình biên tập',
      submenu: [
        {
          label: '1. Trình diễn Pháo hoa (Timeline Editor)',
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
          label: '2. Biên tập Drone động (Animated Editor)',
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
          label: '3. Thiết kế đội hình tĩnh (Static Editor)',
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
        { role: 'minimize', label: 'Thu nhỏ' },
        { role: 'zoom', label: 'Phóng to cửa sổ' },
        ...(process.platform === 'darwin' ? [
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'window' }
        ] : [
          { role: 'close', label: 'Đóng' }
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
