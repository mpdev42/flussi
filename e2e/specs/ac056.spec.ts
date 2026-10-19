import { test, expect, type Locator, type Page } from '@playwright/test';
import { readdirSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  enWindows1252,
  fichierSynthetique,
  lignesCompletes,
  lignesRejet,
} from '../../src/shared/test/ac056-synthetique';
import { avecChamp } from '../../src/shared/test/controle-ac056';
import { launchApp } from '../fixtures/electron';

// Écran « Fichier AC056 » (item 1 de la v0.3.0). Fichiers AC056 synthétiques uniquement, fabriqués
// ici : aucune donnée du corpus. Les valeurs « repérables » (préfixe ZZ) servent à vérifier
// qu'aucune valeur AC056 ne parvient au journal.

const MOTIF_SESSION = /^\d{8}-\d{6}-.+\.txt$/;
const VALEUR_REPERABLE_VALIDE = 'ZZPRENOMREPERABLE';
const VALEUR_REPERABLE_ERREUR = 'ZZ#NOMREPERABLE';
const MESSAGE_REJET_REPERABLE = 'ZZMESSAGEREJET';

const VALIDE = 'AC056_VALIDE.txt';
const ERREURS = 'AC056_ERREURS.txt';
const MAL_FORME = 'AC056_MALFORME.txt';
const VIDE = 'AC056_VIDE.txt';
const REJET_DANS_IN = 'AC056COUR_REJ_DEPOSE.txt';
const REJET_OUT = 'AC056COUR_REJ_20261019.txt';
const DISPARU = 'AC056_DISPARU.txt';

/** Nombre de 405 modifiées dans le fichier avec erreurs : une erreur de contrôle par ligne. */
const NB_ERREURS = 2;

/** Date de modification d'un fichier du jeu (heure locale, comme l'affichage de l'écran). */
const dateFichier = (jour: number, heure: number, minute: number): Date =>
  new Date(2026, 9, jour, heure, minute);

/** `10/10/2026 à 08:05`, tel que l'écran affiche une date. */
function texteDate(date: Date): string {
  const d = (n: number): string => String(n).padStart(2, '0');
  return `${d(date.getDate())}/${d(date.getMonth() + 1)}/${date.getFullYear()} à ${d(date.getHours())}:${d(date.getMinutes())}`;
}

const DATE_VALIDE = dateFichier(18, 10, 0);
const DATE_ERREURS = dateFichier(17, 9, 30);
const DATE_MAL_FORME = dateFichier(16, 14, 15);
const DATE_VIDE = dateFichier(15, 8, 5);
const DATE_REJET_DANS_IN = dateFichier(14, 16, 45);
const DATE_REJET_OUT = dateFichier(19, 7, 20);

function ecrire(dossier: string, nom: string, contenu: Uint8Array, modification: Date): void {
  const chemin = path.join(dossier, nom);
  writeFileSync(chemin, contenu);
  utimesSync(chemin, modification, modification);
}

/** Lignes d'un fichier VEOS conforme, avec un prénom repérable sur chaque 405. */
function lignesValides(): string[] {
  return lignesCompletes({ dossiers: 1 }).map((ligne) =>
    ligne.slice(22, 25) === '405'
      ? avecChamp(ligne, '405', 'prenom1', VALEUR_REPERABLE_VALIDE)
      : ligne,
  );
}

/** Fichier VEOS dont `NB_ERREURS` lignes 405 ont un nom au caractère refusé (`#`). */
function lignesAvecErreurs(): string[] {
  let restantes = NB_ERREURS;
  return lignesCompletes({ dossiers: 1 }).map((ligne) => {
    if (ligne.slice(22, 25) !== '405' || restantes === 0) return ligne;
    restantes -= 1;
    return avecChamp(ligne, '405', 'nom', VALEUR_REPERABLE_ERREUR);
  });
}

/** Fichier VEOS mal formé : la ligne 999 manque. */
function lignesMalFormees(): string[] {
  return lignesCompletes({ dossiers: 1 }).slice(0, -1);
}

/** Rejet MSP fictif : un message sur chaque 405, en Windows-1252 (accent compris). */
function lignesDeRejet(): string[] {
  return lignesRejet({
    dossiers: 1,
    message: (code) => (code === '405' ? enWindows1252(`${MESSAGE_REJET_REPERABLE} é`) : undefined),
  });
}

const nbLignesRejetees = (): number => lignesDeRejet().filter((l) => l.length > 718).length;

/** `IN` : quatre fichiers VEOS (dont un mal formé et un vide) et un rejet déposé ; `OUT` : un rejet. */
function preparerJeuComplet(racine: string): void {
  const dossierIn = path.join(racine, 'IN');
  const dossierOut = path.join(racine, 'OUT');
  ecrire(dossierIn, VALIDE, fichierSynthetique(lignesValides()), DATE_VALIDE);
  ecrire(dossierIn, ERREURS, fichierSynthetique(lignesAvecErreurs()), DATE_ERREURS);
  ecrire(dossierIn, MAL_FORME, fichierSynthetique(lignesMalFormees()), DATE_MAL_FORME);
  ecrire(dossierIn, VIDE, new Uint8Array(), DATE_VIDE);
  ecrire(dossierIn, REJET_DANS_IN, fichierSynthetique(lignesDeRejet()), DATE_REJET_DANS_IN);
  ecrire(dossierOut, REJET_OUT, fichierSynthetique(lignesDeRejet()), DATE_REJET_OUT);
}

/** Jeu complet plus un fichier qui disparaîtra avant l'ouverture (échec de lecture). */
function preparerJeuAvecFichierADisparaitre(racine: string): void {
  preparerJeuComplet(racine);
  ecrire(
    path.join(racine, 'IN'),
    DISPARU,
    fichierSynthetique(lignesValides()),
    dateFichier(13, 12, 0),
  );
}

const echapper = (texte: string): string => texte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function navigation(page: Page): Locator {
  return page.getByRole('navigation', { name: 'Navigation principale' });
}

async function allerA(page: Page, libelle: string): Promise<void> {
  await navigation(page).getByRole('button', { name: libelle, exact: true }).click();
}

async function allerAuFichierAc056(page: Page): Promise<void> {
  await allerA(page, 'Fichier AC056');
  await expect(page.getByRole('heading', { level: 1, name: 'Fichier AC056' })).toBeVisible();
}

function carte(page: Page, dossier: 'IN' | 'OUT'): Locator {
  return page.getByRole('group', { name: dossier, exact: true });
}

function ligne(page: Page, dossier: 'IN' | 'OUT', nom: string): Locator {
  return carte(page, dossier).getByRole('button', { name: new RegExp(echapper(nom)) });
}

async function ouvrir(page: Page, dossier: 'IN' | 'OUT', nom: string): Promise<void> {
  await ligne(page, dossier, nom).click();
  await expect(page.getByRole('heading', { level: 1, name: nom, exact: true })).toBeVisible();
}

/**
 * Retour à la liste. L'écran relit les dossiers à chaque retour : on attend la fin de cette
 * relecture (plus aucune carte en cours de chargement) pour ne pas agir sur une liste périmée.
 */
async function changerDeFichier(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Changer de fichier' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Fichier AC056' })).toBeVisible();
  await expect(carte(page, 'IN')).toBeVisible();
  await expect(carte(page, 'OUT')).toBeVisible();
  await expect(page.locator('[role="group"][aria-busy="true"]')).toHaveCount(0);
}

function panneauJournal(page: Page): Locator {
  return page.locator('aside[aria-label="Journal de la session"]');
}

/** Fichier du journal de la session en cours (dossier du mois courant), en lignes. */
function lireJournalSession(racineTravail: string): string[] {
  const maintenant = new Date();
  const dossier = path.join(
    racineTravail,
    'Journal',
    String(maintenant.getFullYear()),
    String(maintenant.getMonth() + 1).padStart(2, '0'),
  );
  const sessions = readdirSync(dossier).filter((nom) => MOTIF_SESSION.test(nom));
  expect(sessions).toHaveLength(1);
  const contenu = readFileSync(path.join(dossier, sessions[0] as string), 'utf8');
  return contenu.split('\r\n').filter((l) => l !== '');
}

/** Pas de défilement horizontal, ni sur le document ni dans la zone principale. */
async function sansDefilementHorizontal(page: Page): Promise<void> {
  const { document, principale } = await page.evaluate(() => {
    const racine = document.documentElement;
    const main = document.querySelector('main');
    return {
      document: racine.scrollWidth - racine.clientWidth,
      principale: main ? main.scrollWidth - main.clientWidth : 0,
    };
  });
  expect(document, 'débordement horizontal du document (px)').toBeLessThanOrEqual(0);
  expect(principale, 'débordement horizontal de la zone principale (px)').toBeLessThanOrEqual(0);
}

test('fichier AC056 — la navigation place « Fichier AC056 » entre « Accueil » et « Journal »', async () => {
  const { page, fermer } = await launchApp();
  try {
    await expect(navigation(page).getByRole('button')).toHaveText([
      'Accueil',
      'Fichier AC056',
      'Journal',
      'Paramètres',
    ]);
  } finally {
    await fermer();
  }
});

test('fichier AC056 — liste : cartes IN et OUT, tri, types, taille et date', async () => {
  const { page, fermer } = await launchApp({ preparerTravail: preparerJeuComplet });
  try {
    await allerAuFichierAc056(page);

    const carteIn = carte(page, 'IN');
    const carteOut = carte(page, 'OUT');
    await expect(carteIn).toBeVisible();
    await expect(carteOut).toBeVisible();

    // IN : du plus récent au plus ancien
    const lignesIn = carteIn.getByRole('button', { name: /\.txt/ });
    await expect(lignesIn).toHaveCount(5);
    const ordreAttendu = [VALIDE, ERREURS, MAL_FORME, VIDE, REJET_DANS_IN];
    for (const [indice, nom] of ordreAttendu.entries()) {
      await expect(lignesIn.nth(indice)).toContainText(nom);
    }

    // Types : VEOS ou Rejet d'après le nom, y compris un rejet déposé dans IN
    await expect(ligne(page, 'IN', VALIDE).getByText('VEOS', { exact: true })).toBeVisible();
    await expect(ligne(page, 'IN', VIDE).getByText('VEOS', { exact: true })).toBeVisible();
    await expect(
      ligne(page, 'IN', REJET_DANS_IN).getByText('Rejet', { exact: true }),
    ).toBeVisible();
    await expect(ligne(page, 'OUT', REJET_OUT).getByText('Rejet', { exact: true })).toBeVisible();

    // Date et taille de chaque ligne
    await expect(ligne(page, 'IN', VALIDE)).toContainText(texteDate(DATE_VALIDE));
    await expect(ligne(page, 'IN', ERREURS)).toContainText(texteDate(DATE_ERREURS));
    await expect(ligne(page, 'IN', REJET_DANS_IN)).toContainText(texteDate(DATE_REJET_DANS_IN));
    await expect(ligne(page, 'OUT', REJET_OUT)).toContainText(texteDate(DATE_REJET_OUT));
    await expect(ligne(page, 'IN', VALIDE)).toContainText(/\d+ Ko/);
    await expect(ligne(page, 'IN', VIDE)).toContainText('0 Ko');

    // Un seul fichier dans OUT
    await expect(carteOut.getByRole('button', { name: /\.txt/ })).toHaveCount(1);
    await expect(carteOut).toContainText('1 fichier');

    await sansDefilementHorizontal(page);
  } finally {
    await fermer();
  }
});

test('fichier AC056 — un dossier OUT vide l’indique', async () => {
  const { page, fermer } = await launchApp({
    preparerTravail: (racine) => {
      ecrire(path.join(racine, 'IN'), VALIDE, fichierSynthetique(lignesValides()), DATE_VALIDE);
    },
  });
  try {
    await allerAuFichierAc056(page);
    await expect(carte(page, 'IN').getByRole('button', { name: /\.txt/ })).toHaveCount(1);
    await expect(carte(page, 'OUT').getByText('Aucun fichier dans OUT')).toBeVisible();
    await expect(carte(page, 'IN').getByText('Aucun fichier dans IN')).toHaveCount(0);
  } finally {
    await fermer();
  }
});

test('fichier AC056 — ouverture : VEOS sans erreur, avec erreurs, mal formé, rejet et fichier vide', async () => {
  const { page, fermer } = await launchApp({ preparerTravail: preparerJeuComplet });
  try {
    await allerAuFichierAc056(page);

    // VEOS sans erreur
    await ouvrir(page, 'IN', VALIDE);
    await expect(page.getByText('Aucune erreur', { exact: true })).toBeVisible();
    await expect(
      page.getByRole('status').filter({ hasText: 'Le fichier ne contient aucune erreur.' }),
    ).toBeVisible();
    await expect(page.getByText('VEOS', { exact: true })).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);

    // « Changer de fichier » revient à la liste
    await changerDeFichier(page);
    await expect(carte(page, 'IN')).toBeVisible();

    // VEOS avec erreurs de contrôle
    await ouvrir(page, 'IN', ERREURS);
    await expect(page.getByText(`${NB_ERREURS} erreurs`, { exact: true })).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'aucune erreur' })).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 2, name: /mal formé/ })).toHaveCount(0);
    await changerDeFichier(page);

    // VEOS mal formé (structure)
    await ouvrir(page, 'IN', MAL_FORME);
    await expect(
      page.getByRole('alert').getByRole('heading', { level: 2, name: /mal formé/ }),
    ).toBeVisible();
    await expect(page.getByRole('alert')).toContainText("Relancez l'export dans VEOS");
    await changerDeFichier(page);

    // Rejet MSP (Windows-1252), depuis OUT puis déposé dans IN
    await ouvrir(page, 'OUT', REJET_OUT);
    const rejetees = nbLignesRejetees();
    expect(rejetees).toBeGreaterThan(0);
    await expect(page.getByText(`${rejetees} lignes rejetées`, { exact: true })).toBeVisible();
    await expect(page.getByText('Rejet', { exact: true })).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await changerDeFichier(page);

    await ouvrir(page, 'IN', REJET_DANS_IN);
    await expect(page.getByText(`${rejetees} lignes rejetées`, { exact: true })).toBeVisible();
    await changerDeFichier(page);

    // Fichier vide
    await ouvrir(page, 'IN', VIDE);
    await expect(
      page
        .getByRole('alert')
        .getByRole('heading', { level: 2, name: /n'est pas un fichier AC056 lisible/ }),
    ).toBeVisible();
    await sansDefilementHorizontal(page);
    await changerDeFichier(page);
  } finally {
    await fermer();
  }
});

test('fichier AC056 — le fichier ouvert est conservé d’un écran à l’autre', async () => {
  const { page, fermer } = await launchApp({ preparerTravail: preparerJeuComplet });
  try {
    await allerAuFichierAc056(page);
    await ouvrir(page, 'IN', ERREURS);
    await expect(page.getByText(`${NB_ERREURS} erreurs`, { exact: true })).toBeVisible();

    await allerA(page, 'Accueil');
    await expect(page.getByRole('heading', { level: 1, name: 'Accueil' })).toBeVisible();
    // L'écran AC056 reste dans le DOM mais n'est plus visible
    await expect(page.getByRole('heading', { level: 1, name: ERREURS, exact: true })).toBeHidden();

    await allerA(page, 'Fichier AC056');
    await expect(page.getByRole('heading', { level: 1, name: ERREURS, exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Changer de fichier' })).toBeVisible();
    await expect(page.getByText(`${NB_ERREURS} erreurs`, { exact: true })).toBeVisible();

    // Même chose après un détour par le Journal
    await allerA(page, 'Journal');
    await expect(page.getByRole('heading', { level: 1, name: 'Journal' })).toBeVisible();
    await allerA(page, 'Fichier AC056');
    await expect(page.getByRole('heading', { level: 1, name: ERREURS, exact: true })).toBeVisible();
  } finally {
    await fermer();
  }
});

test('fichier AC056 — le journal de la session est visible partout et suit les ouvertures', async () => {
  const { page, fermer } = await launchApp({ preparerTravail: preparerJeuComplet });
  try {
    const panneau = panneauJournal(page);

    for (const libelle of ['Accueil', 'Journal', 'Paramètres', 'Fichier AC056']) {
      await allerA(page, libelle);
      await expect(panneau, `panneau du journal sur « ${libelle} »`).toBeVisible();
      await expect(panneau.getByRole('heading', { name: 'Journal de la session' })).toBeVisible();
    }

    // Avant toute ouverture : pas de « Charger »
    await expect(panneau).not.toContainText('Charger');

    await ouvrir(page, 'IN', VALIDE);
    await expect(panneau).toContainText('Charger');
    await expect(panneau).toContainText(`Fichier ${VALIDE} chargé : aucune erreur`);

    // Le panneau suit aussi depuis un autre écran
    await allerA(page, 'Accueil');
    await expect(panneauJournal(page)).toContainText(`Fichier ${VALIDE} chargé : aucune erreur`);

    await allerA(page, 'Fichier AC056');
    await changerDeFichier(page);
    await ouvrir(page, 'IN', ERREURS);
    await expect(panneau).toContainText(`Fichier ${ERREURS} chargé : ${NB_ERREURS} erreurs`);

    await sansDefilementHorizontal(page);
  } finally {
    await fermer();
  }
});

test('fichier AC056 — pas de défilement horizontal à 1280×800 avec la colonne du journal', async () => {
  const { app, page, fermer } = await launchApp({ preparerTravail: preparerJeuComplet });
  try {
    await app.evaluate(({ BrowserWindow }) => {
      const fenetre = BrowserWindow.getAllWindows()[0];
      if (!fenetre) return;
      if (fenetre.isMaximized()) fenetre.unmaximize();
      fenetre.setContentSize(1280, 800);
    });
    await expect.poll(() => page.evaluate(() => window.innerWidth)).toBe(1280);

    await allerAuFichierAc056(page);
    await expect(panneauJournal(page)).toBeVisible();
    await expect(carte(page, 'IN')).toBeVisible();
    await sansDefilementHorizontal(page);

    await ouvrir(page, 'IN', ERREURS);
    await sansDefilementHorizontal(page);
  } finally {
    await fermer();
  }
});

test('fichier AC056 — le journal de session trace les ouvertures sans valeur AC056 ni chemin', async () => {
  const { app, page, racineTravail, fermer } = await launchApp({
    preparerTravail: preparerJeuAvecFichierADisparaitre,
  });
  try {
    await allerAuFichierAc056(page);

    await ouvrir(page, 'IN', VALIDE);
    await changerDeFichier(page);
    await ouvrir(page, 'IN', ERREURS);
    await changerDeFichier(page);
    await ouvrir(page, 'IN', MAL_FORME);
    await changerDeFichier(page);
    await ouvrir(page, 'OUT', REJET_OUT);
    await changerDeFichier(page);
    await ouvrir(page, 'IN', VIDE);
    await changerDeFichier(page);

    // Fichier retiré après la liste : la lecture échoue. La ligne est visible dans la liste relue
    // avant la suppression, sinon la relecture ne la contiendrait plus.
    await expect(ligne(page, 'IN', DISPARU)).toBeVisible();
    rmSync(path.join(racineTravail, 'IN', DISPARU));
    await ligne(page, 'IN', DISPARU).click();
    await expect(
      page.getByRole('alert').getByRole('heading', { level: 2, name: /n'a pas pu être chargé/ }),
    ).toBeVisible();

    // La fermeture écrit « Fin de session » avant de rendre la main
    await app.close();

    const lignes = lireJournalSession(racineTravail);
    const contenu = lignes.join('\n');
    const dernierIndex = lignes.length - 1;

    // Lignes attendues : horodatage, niveau, message
    expect(lignes).toContainEqual(expect.stringMatching(/^\d{2}:\d{2}:\d{2}\tTITRE\tCharger$/));
    expect(lignes).toContainEqual(
      expect.stringMatching(
        new RegExp(
          `^\\d{2}:\\d{2}:\\d{2}\\tSUCCES\\tFichier ${echapper(VALIDE)} chargé : aucune erreur$`,
        ),
      ),
    );
    expect(lignes).toContainEqual(
      expect.stringMatching(
        new RegExp(
          `^\\d{2}:\\d{2}:\\d{2}\\tSUCCES\\tFichier ${echapper(ERREURS)} chargé : ${NB_ERREURS} erreurs$`,
        ),
      ),
    );
    expect(lignes).toContainEqual(
      expect.stringMatching(
        new RegExp(`\\tSUCCES\\tFichier ${echapper(MAL_FORME)} chargé : \\d+ erreurs?`),
      ),
    );
    expect(lignes).toContainEqual(
      expect.stringMatching(
        new RegExp(
          `\\tERREUR\\tFichier ${echapper(MAL_FORME)} mal formé : relancez l'export VEOS$`,
        ),
      ),
    );
    expect(lignes).toContainEqual(
      expect.stringMatching(
        new RegExp(
          `\\tSUCCES\\tFichier ${echapper(REJET_OUT)} chargé : ${nbLignesRejetees()} lignes rejetées$`,
        ),
      ),
    );
    // Fichier vide : une seule ligne ERREUR, ni « chargé » ni « mal formé »
    expect(lignes).toContainEqual(
      expect.stringMatching(
        new RegExp(`\\tERREUR\\tFichier ${echapper(VIDE)} illisible : fichier vide$`),
      ),
    );
    const lignesVide = lignes.filter((l) => l.includes(VIDE));
    expect(lignesVide).toHaveLength(1);
    expect(lignes.filter((l) => l.includes(VIDE) && /chargé|mal formé/.test(l))).toHaveLength(0);
    expect(lignes).toContainEqual(
      expect.stringMatching(
        new RegExp(`\\tERREUR\\tFichier ${echapper(DISPARU)} non chargé : fichier introuvable$`),
      ),
    );
    expect(lignes[dernierIndex]).toMatch(/\tTITRE\tFin de session$/);

    // Jamais de valeur AC056 (valeurs et message de rejet repérables)
    expect(contenu).not.toContain('ZZ');
    expect(contenu).not.toContain('DUPONT');
    expect(contenu).not.toContain('example.invalid');

    // Jamais de chemin Windows ni la racine de travail temporaire
    expect(contenu).not.toContain(racineTravail);
    expect(contenu).not.toContain('flussi-e2e-');
    expect(contenu).not.toMatch(/[A-Za-z]:\\/);
  } finally {
    await fermer();
  }
});
