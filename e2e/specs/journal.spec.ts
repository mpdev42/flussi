import { test, expect } from '@playwright/test';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { launchApp, lireVersionProjet } from '../fixtures/electron';

const MOTIF_SESSION = /^\d{8}-\d{6}-.+\.txt$/;
const NOMS_MOIS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

/** Année `AAAA` et mois `MM` courants, à l'heure locale (comme le journal). */
function periodeCourante(): { annee: string; mois: string; nomMois: string } {
  const maintenant = new Date();
  return {
    annee: String(maintenant.getFullYear()),
    mois: String(maintenant.getMonth() + 1).padStart(2, '0'),
    nomMois: NOMS_MOIS[maintenant.getMonth()] as string,
  };
}

function majuscule(texte: string): string {
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

test('journal — historique, copie de conflit, détail et navigation', async () => {
  const { page, racineTravail, fermer } = await launchApp();
  const version = lireVersionProjet();
  const { annee, mois, nomMois } = periodeCourante();

  try {
    // Journal préparé après le lancement : la session en cours a déjà créé le dossier du mois
    const dossierMois = path.join(racineTravail, 'Journal', annee, mois);
    mkdirSync(dossierMois, { recursive: true });
    const contenuAncienne = `00:00:01\tTITRE\tDébut de session le 01/${mois}/${annee} à 00:00:01\r\n`;
    writeFileSync(
      path.join(dossierMois, `${annee}${mois}01-000001-autre.compte.txt`),
      contenuAncienne,
    );
    writeFileSync(
      path.join(dossierMois, `${annee}${mois}01-000001-autre.compte-PC123.txt`),
      contenuAncienne,
    );
    writeFileSync(path.join(dossierMois, `${annee}${mois}01-000002.txt`), '{\\rtf1 test}');
    mkdirSync(path.join(racineTravail, 'Journal', '2024'));

    await page
      .getByRole('navigation', { name: 'Navigation principale' })
      .getByRole('button', { name: 'Journal' })
      .click();
    await expect(page.getByRole('heading', { level: 1, name: 'Journal' })).toBeVisible();

    // Sélecteurs de période
    const groupeAnnee = page.getByRole('group', { name: 'Année' });
    const groupeMois = page.getByRole('group', { name: 'Mois' });
    await expect(groupeAnnee.getByRole('button', { name: annee, exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(groupeAnnee.getByRole('button', { name: '2024', exact: true })).toBeVisible();
    await expect(
      groupeMois.getByRole('button', { name: majuscule(nomMois), exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(groupeMois.getByRole('button')).toHaveCount(12);

    // Tableau : session en cours, session plus ancienne, copie de conflit ; le journal Lazarus est ignoré
    const lignes = page.locator('tbody tr');
    await expect(lignes).toHaveCount(3);
    await expect(lignes.first()).toContainText('En cours');
    await expect(lignes.filter({ hasText: 'Copie de conflit' })).toHaveCount(1);
    await expect(page.locator('table')).not.toContainText('.txt');
    await expect(page.locator('table')).not.toContainText(`${annee}${mois}01-000002`);
    await expect(page.getByText(/^3 sessions en /)).toBeVisible();

    // Détail de la session plus ancienne, sans « Fin de session »
    await lignes
      .filter({ hasText: 'autre.compte' })
      .filter({ hasNotText: 'Copie de conflit' })
      .click();
    await expect(
      page.getByRole('heading', { level: 1, name: `Session du 01/${mois}/${annee} à 00:00:01` }),
    ).toBeVisible();
    await expect(page.getByText('Pas de ligne « Fin de session »')).toBeVisible();

    // Retour : même année et même mois
    await page.getByRole('button', { name: /Retour à l'historique/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Journal' })).toBeVisible();
    await expect(groupeAnnee.getByRole('button', { name: annee, exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(
      groupeMois.getByRole('button', { name: majuscule(nomMois), exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');

    // Détail de la session en cours : en-tête du journal, pas d'avertissement de fin
    await lignes.first().click();
    await expect(page.getByText('Mode : recette', { exact: true })).toBeVisible();
    await expect(page.getByText(`Version de Flussi : ${version}`, { exact: true })).toBeVisible();
    await expect(page.getByText('Pas de ligne « Fin de session »')).toHaveCount(0);
    await page.getByRole('button', { name: /Retour à l'historique/ }).click();

    // Année sans session : le mois reste sélectionné, état vide
    await groupeAnnee.getByRole('button', { name: '2024', exact: true }).click();
    await expect(
      groupeMois.getByRole('button', { name: majuscule(nomMois), exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(
      page.getByText(`Aucune session en ${nomMois} 2024`, { exact: true }),
    ).toBeVisible();
  } finally {
    await fermer();
  }
});

test('journal — la fermeture écrit « Fin de session » (UTF-8 sans BOM, CRLF)', async () => {
  const { app, racineTravail, fermer } = await launchApp();
  const { annee, mois } = periodeCourante();

  try {
    await expect
      .poll(() =>
        app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.isVisible()),
      )
      .toBe(true);

    // L'application intercepte `close` pour écrire « Fin de session » avant de se fermer
    await app.close();

    const dossierMois = path.join(racineTravail, 'Journal', annee, mois);
    const sessions = readdirSync(dossierMois).filter((nom) => MOTIF_SESSION.test(nom));
    expect(sessions).toHaveLength(1);

    const octets = readFileSync(path.join(dossierMois, sessions[0] as string));
    // Pas de BOM UTF-8
    expect([...octets.subarray(0, 3)]).not.toEqual([0xef, 0xbb, 0xbf]);

    const contenu = octets.toString('utf8');
    // Toutes les fins de ligne sont CRLF : aucun LF seul
    expect(contenu).not.toMatch(/(?<!\r)\n/);
    expect(contenu.endsWith('\r\n')).toBe(true);

    const lignes = contenu.split('\r\n');
    lignes.pop();
    expect(lignes[0]).toMatch(/^\d{2}:\d{2}:\d{2}\tTITRE\tDébut de session le /);
    expect(lignes).toContainEqual(expect.stringMatching(/\tINFO\tMode : recette$/));
    expect(lignes[lignes.length - 1]).toMatch(/^\d{2}:\d{2}:\d{2}\tTITRE\tFin de session$/);
    expect(contenu.endsWith('\tTITRE\tFin de session\r\n')).toBe(true);
  } finally {
    await fermer();
  }
});
