import { test, expect } from '@playwright/test';
import path from 'node:path';
import { launchApp, lireVersionProjet } from '../fixtures/electron';

test("smoke — l'app démarre et ouvre une fenêtre", async () => {
  const { app, page, racineTravail, cwd, fermer } = await launchApp();

  try {
    // Titre de la fenêtre (page.title() lit la balise <title>, pas la fenêtre)
    const titreFenetre = await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0]?.getTitle(),
    );
    expect(titreFenetre).toBe('Flussi — Recette');

    // Le pont IPC est exposé : window.api est défini côté renderer
    const apiExposed = await page.evaluate(() => typeof window.api !== 'undefined');
    expect(apiExposed).toBe(true);

    // Le handler IPC `app:ping` répond `pong`
    const pong = await page.evaluate(() => window.api.ping());
    expect(pong).toBe('pong');

    // Le canal `config:lire` renvoie la configuration résolue non secrète
    const configuration = await page.evaluate(() => window.api.config.lire());
    expect(configuration).toEqual({
      mode: 'recette',
      dossiers: {
        travail: racineTravail,
        in: path.win32.join(racineTravail, 'IN'),
        out: path.win32.join(racineTravail, 'OUT'),
        journal: path.win32.join(racineTravail, 'Journal'),
      },
      version: lireVersionProjet(),
      origines: { fichier: path.join(cwd, '.env'), mode: 'env', travail: 'env' },
    });
  } finally {
    await fermer();
  }
});
