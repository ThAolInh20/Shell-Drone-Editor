import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import isDev from 'electron-is-dev';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  });

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
