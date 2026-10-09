const { app, BrowserWindow, nativeTheme, ipcMain, dialog } = require('electron');
const path = require('path');
const { openDatabase, setDefaultDb } = require('./db');
const { registerIpc } = require('./ipc');

let mainWindow = null;
let db = null;

function dbPath() {
  return path.join(app.getPath('userData'), 'flashcards.db');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 800,
    minHeight: 560,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1c1c1e' : '#f5f5f7',
    title: 'Flashcards Progression',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'home.html'));

  if (!app.isPackaged && process.env.FLASHCARDS_DEVTOOLS === '1') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

function broadcastTheme() {
  const payload = {
    shouldUseDarkColors: nativeTheme.shouldUseDarkColors,
    themeSource: nativeTheme.themeSource,
  };
  for (const win of BrowserWindow.getAllWindows()) {
    win.setBackgroundColor(payload.shouldUseDarkColors ? '#1c1c1e' : '#f5f5f7');
    win.webContents.send('theme:updated', payload);
  }
}

app.whenReady().then(() => {
  try {
    nativeTheme.themeSource = 'system';
    db = openDatabase(dbPath());
    setDefaultDb(db);
    registerIpc(db);

    ipcMain.handle('theme:get', () => ({
      shouldUseDarkColors: nativeTheme.shouldUseDarkColors,
      themeSource: nativeTheme.themeSource,
    }));

    nativeTheme.on('updated', broadcastTheme);

    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  } catch (err) {
    console.error(err);
    dialog.showErrorBox(
      'Flashcards Progression failed to start',
      err && err.stack ? err.stack : String(err)
    );
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (db) {
    db.close();
    db = null;
  }
});
