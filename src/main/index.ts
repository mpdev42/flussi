import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { join } from 'path';
import { chargerConfiguration, formaterErreurs } from './adapters/config';
import { creerStockageDisque, formaterErreursStockage } from './adapters/stockage';
import { enregistrerHandlersJournal } from './ipc/journal';
import { enregistrerHandlersParametres } from './ipc/parametres';
import {
  creerHistoriqueJournal,
  creerSessionJournal,
  lireCompteWindows,
  lirePoste,
  type SessionEcriture,
} from './services/journal';
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
 * (accès aux dossiers de travail), journal de session (ouverture), fenêtre.
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

  // Journal de session : nom et heure de début fixés à la création, donc conservés si l'on réessaie.
  // L'écriture de l'en-tête est le test d'écriture du dossier Journal.
  const session = creerSessionJournal({
    stockage,
    maintenant: () => new Date(),
    compte: lireCompteWindows(),
    poste: lirePoste(),
    mode: configuration.mode,
    version: app.getVersion(),
  });
  for (;;) {
    const ouverture = await session.ouvrir();
    if (ouverture.ok) break;

    const { response } = await dialog.showMessageBox({
      type: 'error',
      title: 'Flussi ne peut pas démarrer',
      message: 'Le journal de session ne peut pas être créé.',
      detail: formaterErreursStockage([ouverture.erreur]),
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
  enregistrerHandlersJournal({
    historique: creerHistoriqueJournal(stockage, session.chemin),
    session,
  });

  const fenetre = creerFenetrePrincipale(configuration.mode);
  fenetrePrincipale = fenetre;
  fenetre.on('closed', () => {
    fenetrePrincipale = null;
  });
  brancherFermeture(fenetre, session);
  session.surChangement((etat) => {
    if (!fenetre.isDestroyed()) fenetre.webContents.send('journal:etat-change', etat);
  });
}

/**
 * Boîte « Réessayer » / « Quitter quand même » tant que « Fin de session » ne peut pas être
 * écrite. Les lignes en mémoire seraient perdues : jamais de perte silencieuse.
 */
async function terminerSession(fenetre: BrowserWindow, session: SessionEcriture): Promise<void> {
  for (;;) {
    const fin = await session.terminer();
    if (fin.ok) return;

    const perdues =
      fin.lignesPerdues <= 1
        ? "1 ligne du journal n'a pas pu être enregistrée."
        : `${fin.lignesPerdues} lignes du journal n'ont pas pu être enregistrées.`;
    const { response } = await dialog.showMessageBox(fenetre, {
      type: 'error',
      title: 'Flussi',
      message: "Le journal de session n'a pas pu être enregistré.",
      detail: `${perdues}\n\n${formaterErreursStockage([fin.erreur])}`,
      buttons: ['Réessayer', 'Quitter quand même'],
      defaultId: 0,
      cancelId: 0,
      noLink: true,
    });
    if (response !== 0) return;
  }
}

/**
 * Fermeture de la fenêtre principale : suspendue le temps d'écrire « Fin de session ». Une erreur
 * inattendue est journalisée en console et n'empêche jamais la fermeture.
 */
function brancherFermeture(fenetre: BrowserWindow, session: SessionEcriture): void {
  let fermetureAutorisee = false;
  let fermetureEnCours = false;

  fenetre.on('close', (event) => {
    if (fermetureAutorisee) return;
    event.preventDefault();
    if (fermetureEnCours) return;
    fermetureEnCours = true;

    void (async () => {
      try {
        await terminerSession(fenetre, session);
      } catch (erreur) {
        console.error('[main] Erreur à la fermeture du journal :', erreur);
      }
      fermetureAutorisee = true;
      if (!fenetre.isDestroyed()) fenetre.close();
    })();
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
