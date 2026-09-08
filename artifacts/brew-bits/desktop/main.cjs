const { app, BrowserWindow, dialog } = require('electron');
const fs = require('node:fs');
const path = require('path');
const { startLocalServer, stopLocalServer } = require('./server.cjs');

app.setName('The Brew Bits');

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.loadFile(path.join(__dirname, '..', 'dist', 'public', 'index.html'));
}

app.whenReady().then(async () => {
  // The UI is not opened until the offline API and SQLite file are ready.
  await startLocalServer(app);
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
}).catch((error) => {
  console.error('The local SQLite backend could not start:', error);
  try {
    fs.writeFileSync(path.join(app.getPath('userData'), 'startup-error.log'), String(error?.stack ?? error));
  } catch {}
  dialog.showErrorBox('The Brew Bits could not start', error instanceof Error ? error.message : String(error));
  app.quit();
});

app.on('before-quit', () => stopLocalServer());
