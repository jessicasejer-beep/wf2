const { app, BrowserWindow, ipcMain, Menu, shell, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

// Les données sont dans %APPDATA%\Kanban Projets\ (ex. C:\Users\<nom>\AppData\Roaming\Kanban Projets).
const dataDir = () => app.getPath('userData');
const dataFile = () => path.join(dataDir(), 'kanban-data.json');
const backupDir = () => path.join(dataDir(), 'sauvegardes');
const KEEP_BACKUPS = 14;

// Une copie du fichier par jour d'utilisation, on garde les 14 dernières.
function dailyBackup() {
  try {
    if (!fs.existsSync(dataFile())) return;
    fs.mkdirSync(backupDir(), { recursive: true });
    const day = new Date().toISOString().slice(0, 10);
    const target = path.join(backupDir(), `kanban-data-${day}.json`);
    if (!fs.existsSync(target)) fs.copyFileSync(dataFile(), target);
    const files = fs.readdirSync(backupDir()).filter(f => /^kanban-data-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
    for (const f of files.slice(0, Math.max(0, files.length - KEEP_BACKUPS))) fs.unlinkSync(path.join(backupDir(), f));
  } catch (e) {
    console.error('Sauvegarde quotidienne impossible :', e);
  }
}

ipcMain.on('store:load', (event) => {
  try {
    event.returnValue = fs.existsSync(dataFile()) ? fs.readFileSync(dataFile(), 'utf8') : null;
  } catch (e) {
    event.returnValue = null;
  }
});

// Écriture atomique : fichier temporaire puis renommage, pour ne jamais laisser un fichier à moitié écrit.
ipcMain.on('store:save', (_event, json) => {
  try {
    if (typeof json !== 'string') return;
    JSON.parse(json);
    fs.mkdirSync(dataDir(), { recursive: true });
    const tmp = dataFile() + '.tmp';
    fs.writeFileSync(tmp, json, 'utf8');
    fs.renameSync(tmp, dataFile());
  } catch (e) {
    dialog.showErrorBox('Enregistrement impossible', `Les modifications n'ont pas pu être enregistrées.\n\n${e.message}`);
  }
});

ipcMain.on('store:folder', (event) => { event.returnValue = dataDir(); });

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'Kanban Projets',
    backgroundColor: '#f6f7f9',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.loadFile(path.join(__dirname, 'app', 'index.html'));

  // Les liens externes s'ouvrent dans le navigateur, pas dans l'application.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file:')) { e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url); }
  });
}

function buildMenu() {
  const template = [
    {
      label: 'Fichier',
      submenu: [
        { label: 'Ouvrir le dossier des données', click: () => { fs.mkdirSync(dataDir(), { recursive: true }); shell.openPath(dataDir()); } },
        { type: 'separator' },
        { role: 'quit', label: 'Quitter' },
      ],
    },
    {
      label: 'Affichage',
      submenu: [
        { role: 'reload', label: 'Recharger' },
        { role: 'zoomIn', label: 'Zoom avant' },
        { role: 'zoomOut', label: 'Zoom arrière' },
        { role: 'resetZoom', label: 'Taille réelle' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Plein écran' },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
  });
  app.whenReady().then(() => {
    dailyBackup();
    buildMenu();
    createWindow();
  });
  app.on('window-all-closed', () => app.quit());
}
