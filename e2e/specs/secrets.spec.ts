import { test, expect, type ElectronApplication, type Page } from '@playwright/test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { launchApp } from '../fixtures/electron';

// En développement (app.isPackaged faux), il n'y a pas de coffre : les secrets viennent du .env, la
// section est en lecture seule et aucun canal d'écriture n'aboutit, donc aucune élévation de droits
// (invite de contrôle de compte) ne peut se déclencher. Le cas « application installée » n'est pas
// couvert en e2e (pas de contexte installé) : il l'est en unitaire et à la main.

const TEMOIN = 'TEMOIN-E2E-7f3a9';
const TEMOIN_REFUSE = 'AUTRE-TEMOIN-E2E-2d8e1';
const LIGNES_ENV = [
  `IGA_FTP_PASSWORD=${TEMOIN}`,
  'MSP_SFTP_PASSWORD=',
  'MSP_SFTP_CLE_PRIVEE_CHEMIN=C:\\fictif\\cle.ppk',
];

const MESSAGE_DEV =
  'Les secrets ne sont pas modifiables en développement : ils sont lus dans le fichier .env.';

type GlobalSelecteur = { __selecteurs?: number };

/**
 * Remplace `dialog.showOpenDialog` dans le main AVANT tout appel : aucun sélecteur réel ne
 * s'ouvre, et chaque ouverture est comptée dans `globalThis.__selecteurs`.
 */
async function remplacerSelecteurFichier(app: ElectronApplication): Promise<void> {
  await app.evaluate(({ dialog }) => {
    const global = globalThis as unknown as GlobalSelecteur;
    global.__selecteurs = 0;
    dialog.showOpenDialog = (async () => {
      global.__selecteurs = (global.__selecteurs ?? 0) + 1;
      return { canceled: true, filePaths: [] };
    }) as unknown as typeof dialog.showOpenDialog;
  });
}

function compterSelecteurs(app: ElectronApplication): Promise<number | undefined> {
  return app.evaluate(() => (globalThis as unknown as GlobalSelecteur).__selecteurs);
}

async function ouvrirParametres(page: Page): Promise<void> {
  await page
    .getByRole('navigation', { name: 'Navigation principale' })
    .getByRole('button', { name: 'Paramètres' })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'Paramètres' })).toBeVisible();
}

/** Contenu de tous les fichiers d'un dossier, sous-dossiers compris. */
function lireArborescence(dossier: string): string[] {
  const contenus: string[] = [];
  for (const entree of readdirSync(dossier)) {
    const chemin = path.join(dossier, entree);
    if (statSync(chemin).isDirectory()) contenus.push(...lireArborescence(chemin));
    else contenus.push(readFileSync(chemin, 'utf8'));
  }
  return contenus;
}

test('secrets — la section est en lecture seule avec les statuts du .env', async () => {
  const { page, fermer } = await launchApp({ lignesEnv: LIGNES_ENV });

  try {
    await ouvrirParametres(page);

    await expect(page.getByRole('heading', { level: 2, name: 'Secrets techniques' })).toBeVisible();
    await expect(
      page.getByText('Mode développement\u00A0: valeurs lues dans le fichier .env.', {
        exact: true,
      }),
    ).toBeVisible();

    // Statuts : FTP IGA et clé dans le .env, SFTP MSP non renseigné
    await expect(page.getByText('Renseigné dans le .env', { exact: true })).toHaveCount(2);
    await expect(page.getByText('Non renseigné', { exact: true })).toHaveCount(1);
    const statuts: Array<[string, string]> = [
      ['Mot de passe FTP IGA', 'Renseigné dans le .env'],
      ['Mot de passe SFTP MSP', 'Non renseigné'],
      ['Clé privée SFTP MSP', 'Renseigné dans le .env'],
    ];
    for (const [secret, statut] of statuts) {
      await expect(page.getByRole('listitem', { name: secret })).toContainText(statut);
    }

    // Aucune modification possible : ni bouton de déverrouillage, ni champ, ni formulaire
    await expect(page.getByRole('button', { name: 'Modifier les secrets' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Choisir la clé…' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Enregistrer' })).toHaveCount(0);
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
    await expect(page.getByRole('form', { name: 'Modifier les secrets techniques' })).toHaveCount(
      0,
    );

    // Aucune alerte
    await expect(page.getByRole('alert')).toHaveCount(0);
  } finally {
    await fermer();
  }
});

test('secrets — la valeur du .env n’apparaît ni dans l’écran, ni dans l’IPC, ni dans le journal', async () => {
  const { page, racineTravail, fermer } = await launchApp({ lignesEnv: LIGNES_ENV });

  try {
    await ouvrirParametres(page);
    await expect(page.getByText('Renseigné dans le .env', { exact: true })).toHaveCount(2);

    expect(await page.content()).not.toContain(TEMOIN);

    const etat = await page.evaluate(() => window.api.secrets.etat());
    expect(JSON.stringify(etat)).not.toContain(TEMOIN);
    expect(etat.source).toBe('env');
    expect(etat.modifiable).toBe(false);
    expect(etat.anomalie).toBeNull();
    expect(etat.secrets).toEqual({
      'iga-ftp-mot-de-passe': { etat: 'env' },
      'msp-sftp-mot-de-passe': { etat: 'non-renseigne' },
      'msp-sftp-cle-privee': { etat: 'env' },
    });

    const configuration = await page.evaluate(() => window.api.config.lire());
    expect(JSON.stringify(configuration)).not.toContain(TEMOIN);

    // Fichier de session du journal : lu avant fermer(), qui supprime le dossier temporaire
    const journaux = lireArborescence(path.join(racineTravail, 'Journal'));
    expect(journaux.length).toBeGreaterThan(0);
    for (const contenu of journaux) expect(contenu).not.toContain(TEMOIN);
  } finally {
    await fermer();
  }
});

test('secrets — les canaux appelés directement sont refusés en développement, sans sélecteur', async () => {
  const { app, page, racineTravail, fermer } = await launchApp({ lignesEnv: LIGNES_ENV });

  try {
    await remplacerSelecteurFichier(app);
    await ouvrirParametres(page);
    const etatAvant = await page.evaluate(() => window.api.secrets.etat());

    const preparation = await page.evaluate(() => window.api.secrets.preparerCle());
    expect(preparation).toEqual({ statut: 'refuse', message: MESSAGE_DEV });

    const motDePasse = await page.evaluate(
      (valeur) =>
        window.api.secrets.enregistrer({
          motsDePasse: { 'iga-ftp-mot-de-passe': valeur },
          cle: false,
        }),
      TEMOIN_REFUSE,
    );
    expect(motDePasse).toEqual({ statut: 'refuse', message: MESSAGE_DEV });

    // Clé demandée sans clé préparée : le refus de développement passe avant tout autre contrôle
    const cle = await page.evaluate(() =>
      window.api.secrets.enregistrer({ motsDePasse: {}, cle: true }),
    );
    expect(cle).toEqual({ statut: 'refuse', message: MESSAGE_DEV });

    // Oublier une clé qui n'existe pas ne lève rien
    const abandon = await page.evaluate(async () => {
      try {
        await window.api.secrets.abandonnerCle();
        return { leve: false };
      } catch {
        return { leve: true };
      }
    });
    expect(abandon).toEqual({ leve: false });

    // Le sélecteur de fichier n'a jamais été ouvert
    expect(await compterSelecteurs(app)).toBe(0);

    // L'état n'a pas bougé et aucune valeur n'a fuité
    const etatApres = await page.evaluate(() => window.api.secrets.etat());
    expect(etatApres).toEqual(etatAvant);
    expect(etatApres.secrets['iga-ftp-mot-de-passe']).toEqual({ etat: 'env' });
    expect(JSON.stringify([preparation, motDePasse, cle, etatApres])).not.toContain(TEMOIN_REFUSE);
    expect(JSON.stringify([preparation, motDePasse, cle, etatApres])).not.toContain(TEMOIN);
    expect(await page.content()).not.toContain(TEMOIN_REFUSE);
    for (const contenu of lireArborescence(path.join(racineTravail, 'Journal'))) {
      expect(contenu).not.toContain(TEMOIN_REFUSE);
      expect(contenu).not.toContain(TEMOIN);
    }

    // Aucune alerte à l'écran : un refus appelé hors interface n'en crée pas
    await expect(page.getByRole('alert')).toHaveCount(0);
  } finally {
    await fermer();
  }
});

test('secrets — une entrée invalide est rejetée sans citer la valeur', async () => {
  const { app, page, fermer } = await launchApp({ lignesEnv: LIGNES_ENV });

  try {
    await remplacerSelecteurFichier(app);
    await ouvrirParametres(page);

    const rejeter = (demande: unknown) =>
      page.evaluate(async (entree) => {
        try {
          await window.api.secrets.enregistrer(entree as never);
          return { rejete: false, message: '' };
        } catch (erreur) {
          return {
            rejete: true,
            message: erreur instanceof Error ? erreur.message : String(erreur),
          };
        }
      }, demande);

    const invalides: Array<[string, unknown]> = [
      // La clé privée n'est pas un mot de passe : le schéma zod la refuse
      [
        'clé privée parmi les mots de passe',
        { motsDePasse: { 'msp-sftp-cle-privee': TEMOIN }, cle: false },
      ],
      // Caractère de contrôle dans la valeur
      [
        'caractère de contrôle',
        { motsDePasse: { 'iga-ftp-mot-de-passe': `${TEMOIN}\u0000` }, cle: false },
      ],
      // Valeur trop longue
      [
        'valeur trop longue',
        { motsDePasse: { 'iga-ftp-mot-de-passe': TEMOIN.padEnd(300, 'x') }, cle: false },
      ],
      // Clé inconnue de plus, avec la valeur
      [
        'propriété inconnue',
        { motsDePasse: { 'iga-ftp-mot-de-passe': TEMOIN }, cle: false, extra: TEMOIN },
      ],
      // Aucun changement demandé
      ['aucun changement', { motsDePasse: {}, cle: false }],
      // Mauvais type
      ['mot de passe numérique', { motsDePasse: { 'iga-ftp-mot-de-passe': 12345 }, cle: false }],
    ];

    for (const [nom, demande] of invalides) {
      const rejet = await rejeter(demande);
      expect(rejet.rejete, nom).toBe(true);
      expect(rejet.message, nom).not.toBe('');
      expect(rejet.message, nom).not.toContain(TEMOIN);
    }

    expect(await compterSelecteurs(app)).toBe(0);
  } finally {
    await fermer();
  }
});
