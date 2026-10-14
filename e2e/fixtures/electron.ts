import { _electron, type ElectronApplication, type Page } from '@playwright/test';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/** Racine du projet : `package.json` y déclare `main: out/main/index.cjs`. */
export const RACINE_PROJET = process.cwd();

export interface AppLancee {
  app: ElectronApplication;
  page: Page;
  /** Environnement complet de l'application, à réutiliser pour un second lancement. */
  env: Record<string, string>;
  /** Répertoire courant de l'application (temporaire, il contient le `.env` écrit par la fixture). */
  cwd: string;
  /** Racine de travail temporaire (`STOCKAGE_DOSSIER_TRAVAIL`). */
  racineTravail: string;
  /** Ferme l'application puis supprime les dossiers temporaires. */
  fermer: () => Promise<void>;
}

/** Version déclarée dans `package.json`, celle que doit renvoyer `app.getVersion()`. */
export function lireVersionProjet(): string {
  const contenu = readFileSync(path.join(RACINE_PROJET, 'package.json'), 'utf8');
  return (JSON.parse(contenu) as { version: string }).version;
}

/**
 * Lance l'application Electron buildée, de façon hermétique, et retourne l'app + sa première fenêtre.
 *
 * Pré-requis :
 * - Le wrapper `scripts/e2e.mjs` rebuild l'app dans `out/` et neutralise ELECTRON_RUN_AS_NODE
 *   avant de lancer Playwright.
 * - Playwright est lancé depuis la racine du projet (cas garanti par `npm run test:e2e`), donc
 *   `process.cwd()` est la racine. `process.cwd()` est préféré à `__dirname`, instable sous le
 *   transformer Playwright.
 *
 * Hermétique : l'application est lancée par la racine du projet (et non par `out/main/index.cjs`),
 * sinon Electron ne lit pas `package.json` et `app.getVersion()` renvoie la version d'Electron.
 * Elle reçoit trois dossiers temporaires :
 * - un répertoire courant qui contient un `.env` écrit par la fixture (`FLUSSI_ENV=recette` et
 *   `STOCKAGE_DOSSIER_TRAVAIL`) : en développement, seul le `.env` du répertoire courant porte la
 *   configuration, donc le `.env` du développeur n'est jamais lu et les variables du processus de
 *   test n'ont aucun effet sur elle ;
 * - un profil (`FLUSSI_PROFIL_DEV`, variable du processus lue avant la configuration) : verrou
 *   d'instance distinct de `npm run dev` ;
 * - une racine de travail (`STOCKAGE_DOSSIER_TRAVAIL`).
 * `ELECTRON_RENDERER_URL` et `ELECTRON_RUN_AS_NODE` ne sont pas transmises.
 *
 * Toujours appeler `fermer()` en fin de test (dans un `finally`) : il ferme l'application et
 * supprime les dossiers temporaires, sans laisser de processus Electron orphelin.
 *
 * Retour : la propriété `page` est nommée ainsi (et non `window`) pour ne pas masquer le `window`
 * global du renderer dans les callbacks `page.evaluate(() => ...)`.
 */
export async function launchApp(): Promise<AppLancee> {
  const base = mkdtempSync(path.join(tmpdir(), 'flussi-e2e-'));
  const cwd = path.join(base, 'courant');
  const profil = path.join(base, 'profil');
  const racineTravail = path.join(base, 'travail');
  for (const dossier of [cwd, profil, racineTravail]) mkdirSync(dossier);

  const env: Record<string, string> = {};
  for (const [cle, valeur] of Object.entries(process.env)) {
    if (valeur !== undefined) env[cle] = valeur;
  }
  delete env.ELECTRON_RENDERER_URL;
  delete env.ELECTRON_RUN_AS_NODE;
  env.FLUSSI_PROFIL_DEV = profil;
  writeFileSync(
    path.join(cwd, '.env'),
    `FLUSSI_ENV=recette\nSTOCKAGE_DOSSIER_TRAVAIL=${racineTravail}\n`,
    'utf8',
  );

  let app: ElectronApplication | undefined;
  const fermer = async (): Promise<void> => {
    try {
      await app?.close();
    } catch {
      // Application déjà fermée ou plantée : seul le nettoyage compte
    }
    rmSync(base, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  };

  try {
    app = await _electron.launch({ args: [RACINE_PROJET], cwd, env, timeout: 30_000 });
    const page = await app.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    return { app, page, env, cwd, racineTravail, fermer };
  } catch (erreur) {
    await fermer();
    throw erreur;
  }
}
