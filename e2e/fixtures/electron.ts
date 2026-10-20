import { _electron, type ElectronApplication, type Page } from '@playwright/test';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
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
  /** Racine de travail temporaire (`STOCKAGE_DOSSIER_TRAVAIL`), avec `IN`, `OUT` et `Journal`. */
  racineTravail: string;
  /** Ferme l'application puis supprime les dossiers temporaires. */
  fermer: () => Promise<void>;
}

export interface OptionsLancement {
  /**
   * Lignes `CLE=valeur` ajoutées à la fin du `.env` écrit par la fixture (secrets de dev, chemin de
   * clé…). Sans effet sur les clés déjà écrites : ne pas redéfinir `FLUSSI_ENV` ni
   * `STOCKAGE_DOSSIER_TRAVAIL`.
   */
  lignesEnv?: string[];
  /**
   * Prépare la racine de travail (fichiers dans `IN` et `OUT`…). Appelée après la création de `IN`,
   * `OUT` et `Journal`, avant le lancement de l'application.
   */
  preparerTravail?: (racine: string) => void | Promise<void>;
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
 * - une racine de travail (`STOCKAGE_DOSSIER_TRAVAIL`), avec ses sous-dossiers `IN`, `OUT` et
 *   `Journal` déjà créés : l'application vérifie leur accès au démarrage et ne les crée jamais.
 * `ELECTRON_RENDERER_URL` et `ELECTRON_RUN_AS_NODE` ne sont pas transmises.
 *
 * `options.lignesEnv` (facultatif) ajoute des lignes `CLE=valeur` à ce `.env` ; sans option, le `.env`
 * reste identique à celui des lancements existants.
 *
 * Toujours appeler `fermer()` en fin de test (dans un `finally`) : il ferme l'application et
 * supprime les dossiers temporaires, sans laisser de processus Electron orphelin.
 *
 * Retour : la propriété `page` est nommée ainsi (et non `window`) pour ne pas masquer le `window`
 * global du renderer dans les callbacks `page.evaluate(() => ...)`.
 */
export async function launchApp(options: OptionsLancement = {}): Promise<AppLancee> {
  const base = mkdtempSync(path.join(tmpdir(), 'flussi-e2e-'));
  const cwd = path.join(base, 'courant');
  const profil = path.join(base, 'profil');
  const racineTravail = path.join(base, 'travail');
  for (const dossier of [cwd, profil, racineTravail]) mkdirSync(dossier);
  // Flussi ne crée jamais IN, OUT ni Journal : sans eux, le démarrage reste bloqué sur la boîte
  // « Réessayer » / « Quitter » de l'adapter `stockage`
  for (const sousDossier of ['IN', 'OUT', 'Journal']) {
    mkdirSync(path.join(racineTravail, sousDossier));
  }

  const env: Record<string, string> = {};
  for (const [cle, valeur] of Object.entries(process.env)) {
    if (valeur !== undefined) env[cle] = valeur;
  }
  delete env.ELECTRON_RENDERER_URL;
  delete env.ELECTRON_RUN_AS_NODE;
  env.FLUSSI_PROFIL_DEV = profil;
  const lignesEnv = [
    'FLUSSI_ENV=recette',
    `STOCKAGE_DOSSIER_TRAVAIL=${racineTravail}`,
    ...(options.lignesEnv ?? []),
  ];
  writeFileSync(path.join(cwd, '.env'), `${lignesEnv.join('\n')}\n`, 'utf8');

  let app: ElectronApplication | undefined;
  const fermer = async (): Promise<void> => {
    try {
      await app?.close();
    } catch {
      // Application déjà fermée ou plantée : seul le nettoyage compte
    }
    await supprimerDossierTemporaire(base);
  };

  try {
    await options.preparerTravail?.(racineTravail);
    app = await _electron.launch({ args: [RACINE_PROJET], cwd, env, timeout: 30_000 });
    const page = await app.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    return { app, page, env, cwd, racineTravail, fermer };
  } catch (erreur) {
    try {
      await fermer();
    } catch {
      // Le nettoyage ne doit jamais masquer l'erreur d'origine du lancement
    }
    throw erreur;
  }
}

/** Codes d'erreur d'un dossier verrouillé par Windows (traités comme un verrou, jamais comme un échec). */
const CODES_VERROU = new Set(['EPERM', 'EBUSY', 'ENOTEMPTY']);

const TENTATIVES_PATIENTES = 20;
const DELAI_PATIENT_MS = 500;

function estVerrou(erreur: unknown): boolean {
  const code = (erreur as NodeJS.ErrnoException | null)?.code;
  return code !== undefined && CODES_VERROU.has(code);
}

/**
 * Supprime le dossier temporaire d'un lancement sans jamais faire échouer un test pour un verrou.
 *
 * Incident observé le 2026-10-20 : sous Windows, l'antivirus / EDR verrouille parfois le profil
 * Electron fraîchement créé plus de 2 s après la fermeture de l'application, et `rmSync` lève
 * `EPERM, Permission denied` alors que les assertions du test sont passées. Première tentative
 * rapide (comportement historique), puis une seconde plus patiente (environ 10 s) ; si le dossier
 * reste verrouillé, un avertissement est écrit et le test continue (le système purgera `%TEMP%`).
 * Toute autre erreur reste levée.
 */
async function supprimerDossierTemporaire(dossier: string): Promise<void> {
  try {
    rmSync(dossier, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
    return;
  } catch (erreur) {
    if (!estVerrou(erreur)) throw erreur;
  }
  // Tentatives espacées de 500 ms (délai fixe, sans les retries intégrés de Node dont le délai croît)
  for (let tentative = 1; tentative <= TENTATIVES_PATIENTES; tentative++) {
    await new Promise((resolve) => setTimeout(resolve, DELAI_PATIENT_MS));
    try {
      await rm(dossier, { recursive: true, force: true });
      return;
    } catch (erreur) {
      if (!estVerrou(erreur)) throw erreur;
    }
  }
  console.warn(`[flussi-e2e] Dossier temporaire verrouillé, non supprimé : ${dossier}`);
}
