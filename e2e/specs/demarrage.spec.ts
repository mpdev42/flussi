import { test, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import electron from 'electron';
import { launchApp, lireVersionProjet, RACINE_PROJET } from '../fixtures/electron';

// Côté Node, le paquet `electron` exporte le chemin de l'exécutable (ses types décrivent l'API
// disponible dans Electron, d'où le cast).
const CHEMIN_ELECTRON = electron as unknown as string;

const MOTIF_SESSION = /^\d{8}-\d{6}-.+\.txt$/;

/** Fichiers de session Flussi sous le dossier du journal (parcours récursif). */
function listerSessionsJournal(dossier: string): string[] {
  return readdirSync(dossier, { recursive: true, encoding: 'utf8' }).filter((chemin) =>
    MOTIF_SESSION.test(path.basename(chemin)),
  );
}

test('démarrage — cadre de l’application en recette', async () => {
  const { page, fermer } = await launchApp();
  const version = lireVersionProjet();

  try {
    await expect(page.getByRole('note', { name: 'Environnement de recette' })).toBeVisible();
    await expect(page.getByText('Environnement : Recette', { exact: true })).toBeVisible();
    await expect(page.getByText(`Flussi ${version}`, { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'Accueil' })).toBeVisible();
    await expect(
      page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('button', {
        name: 'Accueil',
      }),
    ).toHaveAttribute('aria-current', 'page');
  } finally {
    await fermer();
  }
});

test('démarrage — instance unique : un second lancement rend la main à la première fenêtre', async () => {
  const { app, env, cwd, racineTravail, fermer } = await launchApp();

  const fenetreReduite = () =>
    app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.isMinimized());
  const nombreFenetres = () =>
    app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length);

  try {
    // La fenêtre n'est affichée qu'à `ready-to-show` : attendre qu'elle soit visible avant de la réduire
    await expect
      .poll(() =>
        app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.isVisible()),
      )
      .toBe(true);
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.minimize());
    await expect.poll(fenetreReduite).toBe(true);

    // Second Electron : même racine, même environnement, donc même profil et même verrou
    let sortie = '';
    const code = await new Promise<number | null>((resolve, reject) => {
      const second = spawn(CHEMIN_ELECTRON, [RACINE_PROJET], {
        cwd,
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      second.stdout.on('data', (morceau: Buffer) => {
        sortie += morceau.toString('utf8');
      });
      // Vidé pour que le tube ne bloque pas le processus
      second.stderr.resume();
      const minuteur = setTimeout(() => {
        second.kill();
        reject(new Error('Le second lancement ne s’est pas arrêté en 15 s'));
      }, 15_000);
      second.on('error', (erreur) => {
        clearTimeout(minuteur);
        reject(erreur);
      });
      second.on('exit', (codeSortie) => {
        clearTimeout(minuteur);
        resolve(codeSortie);
      });
    });
    expect(code).toBe(0);
    expect(sortie).toContain('Flussi est déjà ouvert');

    // La première instance a reçu `second-instance` : fenêtre restaurée, toujours unique
    await expect.poll(fenetreReduite).toBe(false);
    expect(await nombreFenetres()).toBe(1);

    // Le second lancement s'arrête avant le journal : toujours une seule session Flussi
    expect(listerSessionsJournal(path.join(racineTravail, 'Journal'))).toHaveLength(1);
  } finally {
    await fermer();
  }
});
