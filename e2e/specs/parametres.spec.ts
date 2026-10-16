import { test, expect, type ElectronApplication, type Page } from '@playwright/test';
import path from 'node:path';
import { launchApp, lireVersionProjet } from '../fixtures/electron';

type GlobalOuvertures = { __ouvertures?: string[] };

/**
 * Remplace `shell.openPath` dans le main AVANT tout clic : aucun Explorateur réel ne s'ouvre.
 * Les chemins reçus sont consignés dans `globalThis.__ouvertures`, `retour` est la valeur renvoyée
 * (chaîne vide = succès, sinon message d'erreur).
 */
async function remplacerOuvertureChemin(app: ElectronApplication, retour: string): Promise<void> {
  await app.evaluate(({ shell }, valeur) => {
    const appels: string[] = [];
    (globalThis as unknown as GlobalOuvertures).__ouvertures = appels;
    shell.openPath = async (chemin: string) => {
      appels.push(chemin);
      return valeur;
    };
  }, retour);
}

async function ouvrirParametres(page: Page): Promise<void> {
  await page
    .getByRole('navigation', { name: 'Navigation principale' })
    .getByRole('button', { name: 'Paramètres' })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'Paramètres' })).toBeVisible();
}

test('paramètres — affiche le mode, les dossiers, leur source et la version', async () => {
  const { page, racineTravail, cwd, fermer } = await launchApp();

  try {
    const entree = page
      .getByRole('navigation', { name: 'Navigation principale' })
      .getByRole('button', { name: 'Paramètres' });
    await ouvrirParametres(page);
    await expect(entree).toHaveAttribute('aria-current', 'page');

    const liste = page.locator('dl');

    // Mode : badge Recette et source .env
    const ligneMode = liste.locator('dd').nth(0);
    await expect(ligneMode.getByText('Recette', { exact: true })).toBeVisible();

    // Chemins des quatre dossiers
    await expect(liste.getByText(racineTravail, { exact: true })).toBeVisible();
    for (const sousDossier of ['IN', 'OUT', 'Journal']) {
      await expect(
        liste.getByText(path.win32.join(racineTravail, sousDossier), { exact: true }),
      ).toBeVisible();
    }

    // Légende de source : le .env du répertoire courant (mode et dossier de travail)
    const fichierEnv = path.join(cwd, '.env');
    await expect(liste.getByText(/^Source\s: fichier \.env \(développement\) · /)).toHaveCount(2);
    await expect(liste.getByText(fichierEnv, { exact: true })).toHaveCount(2);
    await expect(liste.getByText('Sous-dossier du dossier de travail')).toHaveCount(3);

    // Version
    await expect(liste.getByText(lireVersionProjet(), { exact: true })).toBeVisible();

    // Pas d'alerte avant toute ouverture
    await expect(page.getByRole('alert')).toHaveCount(0);
  } finally {
    await fermer();
  }
});

test('paramètres — « Ouvrir dans l’Explorateur » ouvre le chemin du dossier IN', async () => {
  const { app, page, racineTravail, fermer } = await launchApp();

  try {
    await remplacerOuvertureChemin(app, '');
    await ouvrirParametres(page);

    await page.getByRole('button', { name: "Ouvrir dans l'Explorateur le dossier IN" }).click();

    await expect
      .poll(() => app.evaluate(() => (globalThis as unknown as GlobalOuvertures).__ouvertures))
      .toEqual([path.win32.join(racineTravail, 'IN')]);
    await expect(page.getByRole('alert')).toHaveCount(0);
  } finally {
    await fermer();
  }
});

test('paramètres — un échec d’ouverture affiche une alerte et réactive les boutons', async () => {
  const { app, page, racineTravail, fermer } = await launchApp();

  try {
    await remplacerOuvertureChemin(app, 'Accès refusé (simulé)');
    await ouvrirParametres(page);

    const boutonJournal = page.getByRole('button', {
      name: "Ouvrir dans l'Explorateur le dossier Journal",
    });
    await boutonJournal.click();

    const alerte = page.getByRole('alert');
    await expect(alerte).toBeVisible();
    await expect(alerte).toContainText("Le dossier n'a pas pu être ouvert");
    await expect(alerte).toContainText('Accès refusé (simulé)');
    await expect(alerte).toContainText(path.win32.join(racineTravail, 'Journal'));
    await expect(boutonJournal).toBeEnabled();

    await expect
      .poll(() => app.evaluate(() => (globalThis as unknown as GlobalOuvertures).__ouvertures))
      .toEqual([path.win32.join(racineTravail, 'Journal')]);
  } finally {
    await fermer();
  }
});
