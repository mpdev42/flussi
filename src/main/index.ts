import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { join } from 'path';
import { chargerConfiguration, formaterErreurs } from './adapters/config';
import { creerStockageDisque, formaterErreursStockage } from './adapters/stockage';
import { enregistrerHandlersParametres } from './ipc/parametres';
import type { Mode } from '@shared/schemas/config';

let fenetrePrincipale: BrowserWindow | null = null;

function creerFenetrePrincipale(mode: Mode): BrowserWindow {
  const fenetre = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    title: mode === 'recette' ? 'Flussi — Recette' : 'Flussi',
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Sans cela, la balise <title> de index.html écrase le titre qui porte le mode
  fenetre.on('page-title-updated', (event) => event.preventDefault());

  fenetre.on('ready-to-show', () => fenetre.show());

  // Serveur de dev electron-vite en développement, build file:// sinon
  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    void fenetre.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void fenetre.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return fenetre;
}

/**
 * Séquence de démarrage : verrou d'instance (au niveau du module), configuration, stockage
 * (accès aux dossiers de travail), journal (item 4), fenêtre.
 */
async function demarrer(): Promise<void> {
  const resultat = chargerConfiguration({
    estInstallee: app.isPackaged,
    dossierProgramData: process.env.ProgramData ?? 'C:\\ProgramData',
    dossierCourant: process.cwd(),
  });

  if (!resultat.ok) {
    dialog.showErrorBox('Flussi ne peut pas démarrer', formaterErreurs(resultat.erreurs));
    app.exit(1);
    return;
  }
  const { configuration } = resultat;

  // Stockage : IN, OUT et Journal doivent exister et se lire. « Réessayer » sert quand P: se monte
  // quelques secondes après l'ouverture de session. Pendant la boîte, il n'y a pas de fenêtre.
  // L'instance reste ici : le service journal (item 4) la recevra.
  const stockage = creerStockageDisque(configuration.dossiers);
  for (;;) {
    const verification = await stockage.verifierAcces();
    if (verification.ok) break;

    const { response } = await dialog.showMessageBox({
      type: 'error',
      title: 'Flussi ne peut pas démarrer',
      message: 'Un dossier de travail est inaccessible.',
      detail: formaterErreursStockage(verification.erreurs),
      buttons: ['Réessayer', 'Quitter'],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    });
    if (response !== 0) {
      app.exit(1);
      return;
    }
  }

  // Smoke-test de la chaîne IPC main + preload + renderer
  ipcMain.handle('app:ping', () => 'pong');
  enregistrerHandlersParametres({ ...configuration, version: app.getVersion() });

  fenetrePrincipale = creerFenetrePrincipale(configuration.mode);
  fenetrePrincipale.on('closed', () => {
    fenetrePrincipale = null;
  });
}

// En dev, profil distinct de Flussi installé : verrou et données séparés, les deux tournent côte à
// côte. FLUSSI_PROFIL_DEV (variable du processus uniquement) donne un profil temporaire aux tests e2e.
if (!app.isPackaged) {
  app.setPath(
    'userData',
    process.env.FLUSSI_PROFIL_DEV || join(app.getPath('appData'), 'Flussi-dev'),
  );
}

// Instance unique : verrou pris en tout premier, avant la configuration
if (!app.requestSingleInstanceLock()) {
  console.info(
    "Flussi est déjà ouvert : ce second lancement s'arrête, la fenêtre existante est remise au premier plan.",
  );
  app.quit();
} else {
  app.on('second-instance', () => {
    // Pas de fenêtre (erreur de démarrage affichée) : rien à faire
    if (!fenetrePrincipale) return;
    if (fenetrePrincipale.isMinimized()) fenetrePrincipale.restore();
    fenetrePrincipale.show();
    fenetrePrincipale.focus();
  });

  app
    .whenReady()
    .then(demarrer)
    .catch((erreur: unknown) => {
      console.error("[main] Erreur d'initialisation :", erreur);
      dialog.showErrorBox(
        'Flussi ne peut pas démarrer',
        `Erreur inattendue au démarrage : ${erreur instanceof Error ? erreur.message : String(erreur)}`,
      );
      app.exit(1);
    });

  app.on('window-all-closed', () => {
    app.quit();
  });
}
