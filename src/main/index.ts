import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';

function creerFenetrePrincipale(): void {
  const fenetre = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  fenetre.on('ready-to-show', () => fenetre.show());

  // Serveur de dev electron-vite en développement, build file:// sinon
  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    void fenetre.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void fenetre.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

void app.whenReady().then(() => {
  // Smoke-test de la chaîne IPC main + preload + renderer
  ipcMain.handle('app:ping', () => 'pong');

  creerFenetrePrincipale();
});

app.on('window-all-closed', () => {
  app.quit();
});
