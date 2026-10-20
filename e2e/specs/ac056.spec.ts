import { test, expect, type ElectronApplication, type Locator, type Page } from '@playwright/test';
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

/**
 * Fichier VEOS dont les deux 405 ont un nom court au caractère refusé (`DU#PONT`, corrigé en
 * `DUPONT`). Le nom s'affiche dans la liste des bénéficiaires et dans l'en-tête de la fiche : un
 * nom corrigé qui change de nombre de lignes à l'écran déplacerait la mise en page. Les tests de
 * clic après saisie partent donc d'un nom de longueur réaliste, la valeur repérable est trop longue.
 */
const NOM_COURT_ERREUR = 'DU#PONT';

/** Nom fictif de 44 caractères, au caractère refusé (`#`) : passe à la ligne s'il n'est pas tronqué. */
const NOM_LONG_ERREUR = 'ZZ#NOMREPERABLE-FICTIF-TRES-LONG-POUR-RETOUR';

/** Fichier VEOS dont `nombre` lignes 405 ont le nom `nom` (au caractère refusé). */
function lignesAvecNomEnErreur(nom: string, nombre = NB_ERREURS): string[] {
  let restantes = nombre;
  return lignesCompletes({ dossiers: 1 }).map((ligne) => {
    if (ligne.slice(22, 25) !== '405' || restantes === 0) return ligne;
    restantes -= 1;
    return avecChamp(ligne, '405', 'nom', nom);
  });
}

const lignesAvecErreursNomCourt = (): string[] => lignesAvecNomEnErreur(NOM_COURT_ERREUR);
const lignesAvecErreursNomLong = (): string[] => lignesAvecNomEnErreur(NOM_LONG_ERREUR);
const lignesAvecUneErreurNomCourt = (): string[] => lignesAvecNomEnErreur(NOM_COURT_ERREUR, 1);

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

/** Barre du fichier ouvert (nom en h1, dossier, type et compteur d'erreurs). */
function compteurBarre(page: Page, nom: string): Locator {
  return page.getByRole('heading', { level: 1, name: nom, exact: true }).locator('xpath=..');
}

function colonneEvenements(page: Page): Locator {
  return page.getByRole('region', { name: 'Évènements', exact: true });
}

function detailEvenement(page: Page): Locator {
  return page.getByRole('region', { name: 'Détail de l’évènement', exact: true });
}

/** Boutons des évènements (premier niveau de la liste, pas les bénéficiaires). */
function evenements(page: Page): Locator {
  return colonneEvenements(page).locator('ul:not([aria-labelledby]) > li > button');
}

/** Boutons des bénéficiaires de l'évènement sélectionné. */
function beneficiaires(page: Page): Locator {
  return colonneEvenements(page).locator('ul[aria-labelledby] button');
}

function ongletEvenement(page: Page, nom: string | RegExp): Locator {
  return page
    .getByRole('tablist', { name: 'Entités de l’évènement' })
    .getByRole('tab', { name: nom });
}

function ongletBeneficiaire(page: Page, nom: string | RegExp): Locator {
  return page
    .getByRole('tablist', { name: 'Entités du bénéficiaire' })
    .getByRole('tab', { name: nom });
}

/** Champ de la fiche par son libellé exact (« Nom » n'est pas « Nom de jeune fille »). */
function champFiche(page: Page, libelle: string): Locator {
  return detailEvenement(page).getByLabel(libelle, { exact: true });
}

/** Remplace le texte d'un champ par une vraie frappe au clavier, puis quitte le champ par Tab. */
async function corrigerPuisTab(page: Page, champ: Locator, texte: string): Promise<void> {
  await champ.focus();
  await page.keyboard.press('Control+a');
  await page.keyboard.type(texte);
  await page.keyboard.press('Tab');
}

/** Alerte du fichier VEOS lisible (`role="status"`), toujours présente, avec ou sans erreur. */
function alerteFichier(page: Page): Locator {
  return page.getByRole('status').filter({ hasText: /^Le fichier / });
}

/** Lignes d'un fichier VEOS conforme sans la 155 du premier évènement du dossier 1. */
function lignesSans155DuPremierEvenement(): string[] {
  return lignesValides().filter(
    (l) =>
      !(l.slice(22, 25) === '155' && l.slice(9, 17) === '00000001' && l.slice(17, 20) === '001'),
  );
}

/** Dépose un seul fichier dans `IN`. */
function deposerDansIn(nom: string, lignes: string[]): (racine: string) => void {
  return (racine) => {
    ecrire(path.join(racine, 'IN'), nom, fichierSynthetique(lignes), DATE_VALIDE);
  };
}

async function fixerFenetre(
  app: ElectronApplication,
  page: Page,
  largeur: number,
  hauteur: number,
) {
  await app.evaluate(
    ({ BrowserWindow }, [l, h]) => {
      const fenetre = BrowserWindow.getAllWindows()[0];
      if (!fenetre) return;
      if (fenetre.isMaximized()) fenetre.unmaximize();
      fenetre.setContentSize(l as number, h as number);
    },
    [largeur, hauteur],
  );
  await expect.poll(() => page.evaluate(() => window.innerWidth)).toBe(largeur);
  await expect.poll(() => page.evaluate(() => window.innerHeight)).toBe(hauteur);
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
    await expect(compteurBarre(page, ERREURS)).toContainText(`${NB_ERREURS} erreurs`);
    await expect(page.getByRole('status').filter({ hasText: 'aucune erreur' })).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 2, name: /mal formé/ })).toHaveCount(0);
    await changerDeFichier(page);

    // VEOS mal formé (structure)
    await ouvrir(page, 'IN', MAL_FORME);
    await expect(
      page.getByRole('alert').getByRole('heading', { level: 2, name: /mal formé/ }),
    ).toBeVisible();
    await expect(page.getByRole('alert').filter({ hasText: 'mal formé' })).toContainText(
      "Relancez l'export dans VEOS",
    );
    // La 999 manquante est une erreur hors des évènements (décision 8), signalée sans détail
    await expect(
      page.getByRole('alert').getByRole('heading', { level: 2, name: /hors des évènements/ }),
    ).toBeVisible();
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
    await expect(compteurBarre(page, ERREURS)).toContainText(`${NB_ERREURS} erreurs`);

    await allerA(page, 'Accueil');
    await expect(page.getByRole('heading', { level: 1, name: 'Accueil' })).toBeVisible();
    // L'écran AC056 reste dans le DOM mais n'est plus visible
    await expect(page.getByRole('heading', { level: 1, name: ERREURS, exact: true })).toBeHidden();

    await allerA(page, 'Fichier AC056');
    await expect(page.getByRole('heading', { level: 1, name: ERREURS, exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Changer de fichier' })).toBeVisible();
    await expect(compteurBarre(page, ERREURS)).toContainText(`${NB_ERREURS} erreurs`);

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

// ---------------------------------------------------------------------------------------------
// Item 2 de la v0.3.0 : navigation, contrôle à la sortie d'un champ, marquage des erreurs
// ---------------------------------------------------------------------------------------------

test('fichier AC056 — navigation : évènements, onglets, bénéficiaires et entité absente désactivée', async () => {
  const { page, fermer } = await launchApp({
    preparerTravail: deposerDansIn(VALIDE, lignesSans155DuPremierEvenement()),
  });
  try {
    await allerAuFichierAc056(page);
    await ouvrir(page, 'IN', VALIDE);

    // Colonne « Évènements » : un bouton par évènement, le premier sélectionné
    await expect(
      colonneEvenements(page).getByRole('heading', { level: 2, name: 'Évènements' }),
    ).toBeVisible();
    await expect(colonneEvenements(page)).toContainText('2 évènements');
    await expect(evenements(page)).toHaveCount(2);
    await expect(evenements(page).first()).toHaveAttribute('aria-current', 'true');
    await expect(evenements(page).first()).toContainText('CTR1');
    await expect(evenements(page).last()).not.toHaveAttribute('aria-current', 'true');

    // Fiche 100 du premier évènement, avec son titre, en lecture seule
    const detail = detailEvenement(page);
    await expect(
      detail.getByRole('heading', { level: 2, name: '100 · Identification de l’évènement' }),
    ).toBeVisible();
    await expect(detail).toContainText('Ligne 3');
    await expect(ongletEvenement(page, /^100$/)).toHaveAttribute('aria-selected', 'true');
    await expect(champFiche(page, 'N° contrat')).toHaveValue('CTR1');
    await expect(champFiche(page, 'N° contrat')).not.toBeEditable();
    await expect(
      page.getByRole('tablist', { name: 'Entités de l’évènement' }).getByRole('tab'),
    ).toHaveCount(10);

    // Entité absente : onglet visible mais désactivé (155 absente du premier évènement)
    await expect(ongletEvenement(page, /^155/)).toBeDisabled();
    await expect(ongletEvenement(page, /^155/)).toContainText('155');
    await expect(ongletEvenement(page, /^130$/)).toBeEnabled();
    // La mention fait partie du nom accessible ; l'infobulle n'est pas sur le bouton (sinon elle
    // serait lue comme sa description) mais sur son enveloppe, que le survol atteint
    const ongletAbsent = ongletEvenement(page, /^155/);
    await expect(ongletAbsent).toHaveAccessibleName(/^155\s+\(entité absente\)$/);
    await expect(ongletAbsent).not.toHaveAttribute('title', /.+/);
    await expect(ongletAbsent).toHaveAccessibleDescription('');
    await ongletAbsent.hover({ force: true });
    await expect(ongletAbsent.locator('xpath=..')).toHaveAttribute(
      'title',
      'Entité absente de cet évènement',
    );
    // L'enveloppe n'ajoute rien à l'arbre d'accessibilité : la tablist garde ses 10 onglets
    await expect(
      page.getByRole('tablist', { name: 'Entités de l’évènement' }).getByRole('tab'),
    ).toHaveCount(10);

    // Autre évènement : l'onglet courant (100) est gardé, la 155 existe ici
    await evenements(page).nth(1).click();
    await expect(evenements(page).nth(1)).toHaveAttribute('aria-current', 'true');
    await expect(evenements(page).first()).not.toHaveAttribute('aria-current', 'true');
    await expect(detail).toContainText(/Évènement\s*002/);
    await expect(ongletEvenement(page, /^100$/)).toHaveAttribute('aria-selected', 'true');
    await expect(ongletEvenement(page, /^155$/)).toBeEnabled();
    await ongletEvenement(page, /^120$/).click();
    await expect(detail.getByRole('heading', { level: 2, name: /^120 · / })).toBeVisible();

    // Bénéficiaires : sous-liste sous l'évènement et onglets du bénéficiaire
    await ongletEvenement(page, 'Bénéficiaires').click();
    await expect(
      colonneEvenements(page).getByRole('heading', { level: 3, name: 'Bénéficiaires' }),
    ).toBeVisible();
    await expect(beneficiaires(page)).toHaveCount(2);
    await expect(beneficiaires(page).nth(0)).toContainText('ASSPRI');
    await expect(beneficiaires(page).nth(1)).toContainText('CONJOI');
    await expect(beneficiaires(page).nth(0)).toHaveAttribute('aria-current', 'true');
    await expect(
      page.getByRole('tablist', { name: 'Entités du bénéficiaire' }).getByRole('tab'),
    ).toHaveCount(8);
    await expect(ongletBeneficiaire(page, /^400$/)).toHaveAttribute('aria-selected', 'true');
    await expect(champFiche(page, 'Type assuré')).toHaveValue('ASSPRI - Assuré principal');

    await beneficiaires(page).nth(1).click();
    await expect(beneficiaires(page).nth(1)).toHaveAttribute('aria-current', 'true');
    await expect(champFiche(page, 'Type assuré')).toHaveValue('CONJOI - Conjoint');

    await ongletBeneficiaire(page, /^405$/).click();
    await expect(
      detail.getByRole('heading', { level: 2, name: '405 · Nom de l’assuré' }),
    ).toBeVisible();
    await expect(champFiche(page, 'Nom')).toHaveValue('DUPONT');

    await ongletBeneficiaire(page, /^411$/).click();
    await expect(detail).toContainText('Aucun champ affiché pour cette entité.');

    // Liste des garanties : un clic change la fiche
    await ongletBeneficiaire(page, 'Garanties').click();
    const garanties = detail.getByRole('list', { name: 'Garanties' }).getByRole('button');
    await expect(garanties).toHaveCount(2);
    await expect(garanties.first()).toHaveAttribute('aria-current', 'true');
    await expect(champFiche(page, 'Code produit')).toHaveValue('PRODUIT1');
    await garanties.nth(1).click();
    await expect(champFiche(page, 'Code produit')).toHaveValue('PRODUIT2');

    await sansDefilementHorizontal(page);
  } finally {
    await fermer();
  }
});

test('fichier AC056 — correction : la fiche en erreur s’ouvre seule et les compteurs baissent jusqu’à « Aucune erreur »', async () => {
  const { page, fermer } = await launchApp({ preparerTravail: preparerJeuComplet });
  try {
    await allerAuFichierAc056(page);
    await ouvrir(page, 'IN', ERREURS);
    const barre = compteurBarre(page, ERREURS);
    const detail = detailEvenement(page);

    // L'évènement en erreur ouvre directement la fiche en erreur : 405 du premier bénéficiaire
    await expect(evenements(page).first()).toHaveAttribute('aria-current', 'true');
    await expect(evenements(page).first()).toContainText('2 erreurs');
    await expect(ongletEvenement(page, /^Bénéficiaires/)).toHaveAttribute('aria-selected', 'true');
    await expect(ongletEvenement(page, /^Bénéficiaires/)).toContainText('2 erreurs');
    await expect(ongletBeneficiaire(page, /^405/)).toHaveAttribute('aria-selected', 'true');
    await expect(ongletBeneficiaire(page, /^405/)).toContainText('1 erreur');
    await expect(beneficiaires(page).nth(0)).toHaveAttribute('aria-current', 'true');
    await expect(beneficiaires(page).nth(0)).toContainText('1 erreur');
    await expect(beneficiaires(page).nth(1)).toContainText('1 erreur');
    await expect(
      detail.getByRole('heading', { level: 2, name: '405 · Nom de l’assuré' }),
    ).toBeVisible();

    // Champ en erreur : valeur, marquage et message sous le champ
    const nom = champFiche(page, 'Nom');
    await expect(nom).toHaveValue(VALEUR_REPERABLE_ERREUR);
    await expect(nom).toHaveAttribute('aria-invalid', 'true');
    await expect(nom).toBeEditable();
    await expect(nom).toHaveAccessibleDescription(/Caractère non autorisé/);
    await expect(detail.locator('[aria-invalid="true"]')).toHaveCount(1);
    await expect(barre).toContainText('2 erreurs');
    await expect(alerteFichier(page)).toHaveText(
      `Le fichier contient ${NB_ERREURS} erreurs à corriger.`,
    );

    // Première correction : vraie frappe, puis Tab. Le focus passe au champ suivant (Prénom)
    await corrigerPuisTab(page, nom, 'DUPONT');
    await expect(champFiche(page, 'Prénom')).toBeFocused();
    await expect(nom).toHaveValue('DUPONT');
    await expect(nom).not.toHaveAttribute('aria-invalid', 'true');
    await expect(nom).toBeEditable();
    await expect(detail.locator('[aria-invalid="true"]')).toHaveCount(0);
    await expect(ongletBeneficiaire(page, /^405/)).not.toContainText('erreur');
    await expect(beneficiaires(page).nth(0)).not.toContainText('erreur');
    await expect(beneficiaires(page).nth(1)).toContainText('1 erreur');
    await expect(ongletEvenement(page, /^Bénéficiaires/)).toContainText('1 erreur');
    await expect(evenements(page).first()).toContainText('1 erreur');
    await expect(evenements(page).first()).not.toContainText('2 erreurs');
    await expect(barre).toContainText('1 erreur');
    await expect(barre).not.toContainText('2 erreurs');
    await expect(page.getByRole('status').filter({ hasText: 'aucune erreur' })).toHaveCount(0);
    // Alerte du fichier : même forme avec des erreurs (ton erreur) et sans (succès), au singulier à 1
    await expect(alerteFichier(page)).toHaveText('Le fichier contient 1 erreur à corriger.');

    // Seconde erreur : l'autre bénéficiaire. Sa fiche 405 s'ouvre sur l'erreur
    await beneficiaires(page).nth(1).click();
    await expect(beneficiaires(page).nth(1)).toHaveAttribute('aria-current', 'true');
    await expect(ongletBeneficiaire(page, /^405/)).toHaveAttribute('aria-selected', 'true');
    await expect(nom).toHaveValue(VALEUR_REPERABLE_ERREUR);
    await expect(nom).toHaveAttribute('aria-invalid', 'true');
    await corrigerPuisTab(page, nom, 'DURAND');
    await expect(champFiche(page, 'Prénom')).toBeFocused();

    // Plus aucune erreur : compteurs à zéro partout et alerte de succès, sans saut de sélection
    await expect(barre).toContainText('Aucune erreur');
    await expect(
      page.getByRole('status').filter({ hasText: 'Le fichier ne contient aucune erreur.' }),
    ).toBeVisible();
    await expect(evenements(page).first()).not.toContainText('erreur');
    await expect(ongletEvenement(page, /^Bénéficiaires/)).not.toContainText('erreur');
    await expect(beneficiaires(page).nth(1)).not.toContainText('erreur');
    await expect(detail.locator('[aria-invalid="true"]')).toHaveCount(0);
    await expect(beneficiaires(page).nth(1)).toHaveAttribute('aria-current', 'true');
    await expect(ongletBeneficiaire(page, /^405$/)).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('alert')).toHaveCount(0);

    // Les corrections en mémoire ne sont pas tracées au journal
    await expect(panneauJournal(page)).toContainText(`Fichier ${ERREURS} chargé`);
    await expect(panneauJournal(page)).not.toContainText('DUPONT');
    await expect(panneauJournal(page)).not.toContainText('DURAND');
  } finally {
    await fermer();
  }
});

/** Clic souris réel au centre de l'élément, sans l'attente de stabilité de `locator.click()`. */
async function cliquerALaSouris(page: Page, cible: Locator): Promise<void> {
  const boite = await cible.boundingBox();
  expect(boite, 'cible du clic visible').not.toBeNull();
  const { x, y, width, height } = boite as NonNullable<typeof boite>;
  await page.mouse.click(x + width / 2, y + height / 2);
}

/** Remplace le texte d'un champ par une vraie frappe, SANS quitter le champ. */
async function taper(page: Page, champ: Locator, texte: string): Promise<void> {
  await champ.focus();
  await page.keyboard.press('Control+a');
  await page.keyboard.type(texte);
}

/**
 * Positions verticales (px) de ce qui se trouve autour de la zone de saisie : colonne des
 * évènements, ses deux boutons et les onglets de la fiche (pas les champs : le panneau défile et
 * suit le focus). Rien ne doit bouger entre la saisie et le clic qui la suit.
 */
async function positionsEcran(page: Page): Promise<number[]> {
  const boites = await Promise.all([
    colonneEvenements(page).boundingBox(),
    evenements(page).first().boundingBox(),
    evenements(page).nth(1).boundingBox(),
    page.getByRole('tablist', { name: 'Entités de l’évènement' }).boundingBox(),
    page.getByRole('tablist', { name: 'Entités du bénéficiaire' }).boundingBox(),
  ]);
  return boites.map((boite) => {
    expect(boite).not.toBeNull();
    return (boite as NonNullable<typeof boite>).y;
  });
}

test('fichier AC056 — dernière correction puis clic souris : la mise en page ne bouge pas et le clic aboutit', async () => {
  const { page, fermer } = await launchApp({
    preparerTravail: deposerDansIn(ERREURS, lignesAvecErreursNomCourt()),
  });
  try {
    await allerAuFichierAc056(page);
    await ouvrir(page, 'IN', ERREURS);
    const barre = compteurBarre(page, ERREURS);
    const detail = detailEvenement(page);
    const nom = champFiche(page, 'Nom');
    await expect(alerteFichier(page)).toHaveText(
      `Le fichier contient ${NB_ERREURS} erreurs à corriger.`,
    );
    const avant = await positionsEcran(page);

    // Première correction au clavier
    await corrigerPuisTab(page, nom, 'DUPONT');
    await expect(barre).toContainText('1 erreur');
    expect(await positionsEcran(page), 'colonne après la 1re correction').toEqual(avant);

    // Dernière correction (au clavier) puis erreur qui revient : rien ne se déplace
    await beneficiaires(page).nth(1).click();
    await expect(nom).toHaveValue(NOM_COURT_ERREUR);
    const avantDerniere = await positionsEcran(page);
    await corrigerPuisTab(page, nom, 'DUPONT');
    await expect(barre).toContainText('Aucune erreur');
    await expect(alerteFichier(page)).toHaveText('Le fichier ne contient aucune erreur.');
    expect(await positionsEcran(page), 'après la dernière correction').toEqual(avantDerniere);
    await corrigerPuisTab(page, nom, NOM_COURT_ERREUR);
    await expect(barre).toContainText('1 erreur');
    await expect(alerteFichier(page)).toHaveText('Le fichier contient 1 erreur à corriger.');
    expect(await positionsEcran(page), 'après le retour d’une erreur').toEqual(avantDerniere);

    // Dernière correction : saisie sans quitter le champ, puis clic souris sur l'autre évènement
    await taper(page, nom, 'DUPONT');
    await expect(nom).toBeFocused();
    await cliquerALaSouris(page, evenements(page).nth(1));

    await expect(evenements(page).nth(1)).toHaveAttribute('aria-current', 'true');
    await expect(evenements(page).first()).not.toHaveAttribute('aria-current', 'true');
    await expect(detail).toContainText(/Évènement\s*002/);
    await expect(barre).toContainText('Aucune erreur');
    await expect(alerteFichier(page)).toHaveText('Le fichier ne contient aucune erreur.');
    await expect(evenements(page).first()).not.toContainText('erreur');

    // Retour sur le premier évènement : la correction est bien appliquée
    await evenements(page).first().click();
    await ongletEvenement(page, /^Bénéficiaires/).click();
    await beneficiaires(page).nth(1).click();
    await expect(nom).toHaveValue('DUPONT');
    await expect(nom).not.toHaveAttribute('aria-invalid', 'true');

    // Sens inverse : une saisie qui ramène une erreur, puis clic souris sur l'autre évènement
    await taper(page, nom, NOM_COURT_ERREUR);
    await expect(nom).toBeFocused();
    await cliquerALaSouris(page, evenements(page).nth(1));

    await expect(evenements(page).nth(1)).toHaveAttribute('aria-current', 'true');
    await expect(detail).toContainText(/Évènement\s*002/);
    await expect(barre).toContainText('1 erreur');
    await expect(alerteFichier(page)).toHaveText('Le fichier contient 1 erreur à corriger.');
    await expect(evenements(page).first()).toContainText('1 erreur');
  } finally {
    await fermer();
  }
});

test('fichier AC056 — nom long corrigé en nom court : la mise en page ne bouge pas et le clic aboutit', async () => {
  const { page, fermer } = await launchApp({
    preparerTravail: deposerDansIn(ERREURS, lignesAvecErreursNomLong()),
  });
  try {
    await allerAuFichierAc056(page);
    await ouvrir(page, 'IN', ERREURS);
    const barre = compteurBarre(page, ERREURS);
    const detail = detailEvenement(page);
    const nom = champFiche(page, 'Nom');
    await expect(alerteFichier(page)).toHaveText(
      `Le fichier contient ${NB_ERREURS} erreurs à corriger.`,
    );
    const avant = await positionsEcran(page);

    // Le nom long reste sur une seule ligne dans la liste, texte complet au survol
    await expect(nom).toHaveValue(NOM_LONG_ERREUR);
    await expect(beneficiaires(page).nth(1).locator('[title]')).toHaveAttribute(
      'title',
      new RegExp(echapper(NOM_LONG_ERREUR)),
    );

    // Première correction au clavier : nom long remplacé par un nom court
    await corrigerPuisTab(page, nom, 'DUPONT');
    await expect(barre).toContainText('1 erreur');
    expect(await positionsEcran(page), 'après la 1re correction').toEqual(avant);

    // Dernière correction : saisie sans quitter le champ, rien ne se déplace avant le clic
    await beneficiaires(page).nth(1).click();
    await expect(nom).toHaveValue(NOM_LONG_ERREUR);
    const avantDerniere = await positionsEcran(page);
    await taper(page, nom, 'DUPONT');
    await expect(nom).toBeFocused();
    expect(await positionsEcran(page), 'après la saisie, avant le clic').toEqual(avantDerniere);

    // Clic souris réel sur l'autre évènement
    await cliquerALaSouris(page, evenements(page).nth(1));
    await expect(evenements(page).nth(1)).toHaveAttribute('aria-current', 'true');
    await expect(evenements(page).first()).not.toHaveAttribute('aria-current', 'true');
    await expect(detail).toContainText(/Évènement\s*002/);
    await expect(barre).toContainText('Aucune erreur');
    await expect(alerteFichier(page)).toHaveText('Le fichier ne contient aucune erreur.');

    // Retour sur le premier évènement : la correction est bien appliquée
    await evenements(page).first().click();
    await ongletEvenement(page, /^Bénéficiaires/).click();
    await beneficiaires(page).nth(1).click();
    await expect(nom).toHaveValue('DUPONT');
    await expect(nom).not.toHaveAttribute('aria-invalid', 'true');
  } finally {
    await fermer();
  }
});

test('fichier AC056 — dernière correction puis clic souris sur un onglet', async () => {
  const { page, fermer } = await launchApp({
    preparerTravail: deposerDansIn(ERREURS, lignesAvecErreursNomCourt()),
  });
  try {
    await allerAuFichierAc056(page);
    await ouvrir(page, 'IN', ERREURS);
    const barre = compteurBarre(page, ERREURS);
    const nom = champFiche(page, 'Nom');

    await corrigerPuisTab(page, nom, 'DUPONT');
    await beneficiaires(page).nth(1).click();
    await taper(page, nom, 'DUPONT');
    await expect(nom).toBeFocused();
    await cliquerALaSouris(page, ongletBeneficiaire(page, /^400$/));

    await expect(ongletBeneficiaire(page, /^400$/)).toHaveAttribute('aria-selected', 'true');
    await expect(
      detailEvenement(page).getByRole('heading', { level: 2, name: /^400 · / }),
    ).toBeVisible();
    await expect(barre).toContainText('Aucune erreur');
    await expect(alerteFichier(page)).toHaveText('Le fichier ne contient aucune erreur.');
  } finally {
    await fermer();
  }
});

// Le `blur` part à l'appui de la souris : la saisie ne doit être appliquée qu'au relâchement, sinon
// la mise en page bouge entre l'appui et le relâchement et le clic de navigation est perdu.
test('fichier AC056 — seule erreur de la 405 corrigée puis clic souris sur l’onglet 410 : la navigation aboutit', async () => {
  const { page, fermer } = await launchApp({
    preparerTravail: deposerDansIn(ERREURS, lignesAvecUneErreurNomCourt()),
  });
  try {
    await allerAuFichierAc056(page);
    await ouvrir(page, 'IN', ERREURS);
    const barre = compteurBarre(page, ERREURS);
    const nom = champFiche(page, 'Nom');
    await expect(ongletBeneficiaire(page, /^405/)).toContainText('1 erreur');
    await expect(barre).toContainText('1 erreur');

    // Position de l'onglet relevée avant la saisie : c'est là que la souris appuie
    await taper(page, nom, 'DUPONT');
    await expect(nom).toBeFocused();
    await cliquerALaSouris(page, ongletBeneficiaire(page, /^410/));

    await expect(ongletBeneficiaire(page, /^410$/)).toHaveAttribute('aria-selected', 'true');
    await expect(
      detailEvenement(page).getByRole('heading', { level: 2, name: /^410 · / }),
    ).toBeVisible();
    // La saisie a bien été appliquée avant le clic : compteurs à jour partout
    await expect(barre).toContainText('Aucune erreur');
    await expect(alerteFichier(page)).toHaveText('Le fichier ne contient aucune erreur.');
    await expect(ongletBeneficiaire(page, /^405$/)).not.toContainText('erreur');
    await expect(beneficiaires(page).first()).not.toContainText('erreur');
    await expect(evenements(page).first()).not.toContainText('erreur');

    // La correction est conservée sur la fiche 405
    await ongletBeneficiaire(page, /^405$/).click();
    await expect(nom).toHaveValue('DUPONT');
    await expect(nom).not.toHaveAttribute('aria-invalid', 'true');
  } finally {
    await fermer();
  }
});

test('fichier AC056 — dernière erreur des bénéficiaires corrigée puis clic souris sur l’onglet 100 : la fiche 100 s’affiche', async () => {
  const { page, fermer } = await launchApp({
    preparerTravail: deposerDansIn(ERREURS, lignesAvecErreursNomCourt()),
  });
  try {
    await allerAuFichierAc056(page);
    await ouvrir(page, 'IN', ERREURS);
    const barre = compteurBarre(page, ERREURS);
    const nom = champFiche(page, 'Nom');

    await corrigerPuisTab(page, nom, 'DUPONT');
    await expect(barre).toContainText('1 erreur');
    await beneficiaires(page).nth(1).click();
    await expect(nom).toHaveValue(NOM_COURT_ERREUR);
    await expect(ongletEvenement(page, /^Bénéficiaires/)).toContainText('1 erreur');

    await taper(page, nom, 'DUPONT');
    await expect(nom).toBeFocused();
    await cliquerALaSouris(page, ongletEvenement(page, /^100$/));

    await expect(ongletEvenement(page, /^100$/)).toHaveAttribute('aria-selected', 'true');
    await expect(
      detailEvenement(page).getByRole('heading', { level: 2, name: /^100 · / }),
    ).toBeVisible();
    await expect(barre).toContainText('Aucune erreur');
    await expect(alerteFichier(page)).toHaveText('Le fichier ne contient aucune erreur.');
    await expect(ongletEvenement(page, /^Bénéficiaires/)).not.toContainText('erreur');
    await expect(evenements(page).first()).not.toContainText('erreur');
  } finally {
    await fermer();
  }
});

test('fichier AC056 — correction puis clic souris sur « Changer de fichier » : la confirmation s’ouvre', async () => {
  const { page, fermer } = await launchApp({
    preparerTravail: deposerDansIn(ERREURS, lignesAvecErreursNomCourt()),
  });
  try {
    await allerAuFichierAc056(page);
    await ouvrir(page, 'IN', ERREURS);

    // Le `click` voit l'état à jour : la saisie est appliquée au relâchement, avant lui
    await taper(page, champFiche(page, 'Nom'), 'DUPONT');
    await cliquerALaSouris(page, page.getByRole('button', { name: 'Changer de fichier' }));

    const dialogue = page.getByRole('alertdialog', { name: /Abandonner les modifications/ });
    await expect(dialogue).toBeVisible();

    // Le reste de l'écran est inerte tant que la boîte est ouverte : on la ferme avant de lire le compteur
    await dialogue.getByRole('button', { name: 'Annuler' }).click();
    await expect(compteurBarre(page, ERREURS)).toContainText('1 erreur');
  } finally {
    await fermer();
  }
});

test('fichier AC056 — confirmation « Abandonner les modifications ? » après une correction seulement', async () => {
  const { page, racineTravail, fermer } = await launchApp({ preparerTravail: preparerJeuComplet });
  try {
    await allerAuFichierAc056(page);

    // Sans modification : retour direct à la liste, pas de boîte
    await ouvrir(page, 'IN', ERREURS);
    await changerDeFichier(page);
    await expect(page.getByRole('alertdialog')).toHaveCount(0);

    // Après une correction : la boîte s'ouvre, focus sur « Annuler »
    await ouvrir(page, 'IN', ERREURS);
    await corrigerPuisTab(page, champFiche(page, 'Nom'), 'DUPONT');
    await expect(compteurBarre(page, ERREURS)).toContainText('1 erreur');
    await page.getByRole('button', { name: 'Changer de fichier' }).click();
    const dialogue = page.getByRole('alertdialog', { name: /Abandonner les modifications/ });
    await expect(dialogue).toBeVisible();
    await expect(dialogue).toContainText('Elles seront perdues.');
    await expect(dialogue.getByRole('button', { name: 'Annuler' })).toBeFocused();

    // Annuler garde le fichier et la correction
    await dialogue.getByRole('button', { name: 'Annuler' }).click();
    await expect(dialogue).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1, name: ERREURS, exact: true })).toBeVisible();
    await expect(champFiche(page, 'Nom')).toHaveValue('DUPONT');
    await expect(compteurBarre(page, ERREURS)).toContainText('1 erreur');

    // Confirmer revient au choix du fichier, focus sur le h1
    await page.getByRole('button', { name: 'Changer de fichier' }).click();
    await dialogue.getByRole('button', { name: 'Abandonner les modifications' }).click();
    const titre = page.getByRole('heading', { level: 1, name: 'Fichier AC056' });
    await expect(titre).toBeVisible();
    await expect(titre).toBeFocused();
    await expect(dialogue).toHaveCount(0);
    await expect(carte(page, 'IN')).toBeVisible();
    await expect(page.locator('[role="group"][aria-busy="true"]')).toHaveCount(0);

    // Rien n'a été écrit : le fichier se recharge avec ses deux erreurs, identique sur le disque
    await ouvrir(page, 'IN', ERREURS);
    await expect(compteurBarre(page, ERREURS)).toContainText(`${NB_ERREURS} erreurs`);
    const surDisque = readFileSync(path.join(racineTravail, 'IN', ERREURS));
    expect(Buffer.compare(surDisque, Buffer.from(fichierSynthetique(lignesAvecErreurs())))).toBe(0);
  } finally {
    await fermer();
  }
});

/** Mesures de l'écran, à 1280×800 : débordements de la page, de `<main>` et de chaque colonne. */
async function mesurerEcran(page: Page) {
  return page.evaluate(() => {
    const defile = (element: Element | null) =>
      element === null
        ? null
        : {
            overflowY: getComputedStyle(element).overflowY,
            hauteur: element.scrollHeight,
            hauteurVisible: element.clientHeight,
            largeur: element.scrollWidth,
            largeurVisible: element.clientWidth,
          };
    const colonne = Array.from(document.querySelectorAll('section')).find(
      (s) => s.querySelector('h2')?.textContent === 'Évènements',
    );
    const detail = document.querySelector('section[aria-label="Détail de l’évènement"]');
    const champs = Array.from(detail?.querySelectorAll('input') ?? [], (input) =>
      Math.round(input.getBoundingClientRect().left),
    );
    return {
      main: defile(document.querySelector('main')),
      evenements: defile(colonne?.querySelector('.overflow-y-auto') ?? null),
      detail: defile(detail?.querySelector('.overflow-y-auto') ?? null),
      gaucheDesChamps: Array.from(new Set(champs)),
    };
  });
}

test('fichier AC056 — 1280×800 : fiches 120 et 400 sans défilement horizontal, chaque colonne défile seule', async () => {
  const { app, page, fermer } = await launchApp({
    preparerTravail: deposerDansIn('AC056_LARGE.txt', lignesCompletes({ dossiers: 30 })),
  });
  try {
    await fixerFenetre(app, page, 1280, 800);
    await allerAuFichierAc056(page);
    await ouvrir(page, 'IN', 'AC056_LARGE.txt');
    await expect(evenements(page).first()).toHaveAttribute('aria-current', 'true');

    for (const fiche of ['120', '400']) {
      if (fiche === '120') await ongletEvenement(page, /^120$/).click();
      else {
        await ongletEvenement(page, 'Bénéficiaires').click();
        await ongletBeneficiaire(page, /^400$/).click();
      }
      await expect(
        detailEvenement(page).getByRole('heading', { level: 2, name: new RegExp(`^${fiche} · `) }),
      ).toBeVisible();
      await sansDefilementHorizontal(page);

      const m = await mesurerEcran(page);
      const contexte = `fiche ${fiche}`;
      // <main> ne défile pas, ni en hauteur ni en largeur
      expect(m.main?.hauteur, `${contexte} : hauteur de <main>`).toBe(m.main?.hauteurVisible);
      expect(m.main?.largeur, `${contexte} : largeur de <main>`).toBeLessThanOrEqual(
        m.main?.largeurVisible ?? 0,
      );
      // Chaque colonne a son propre défilement vertical, jamais horizontal
      expect(m.evenements?.overflowY, `${contexte} : colonne des évènements`).toBe('auto');
      expect(m.detail?.overflowY, `${contexte} : colonne du détail`).toBe('auto');
      expect(m.evenements?.hauteur, `${contexte} : 60 évènements dans la colonne`).toBeGreaterThan(
        m.evenements?.hauteurVisible ?? 0,
      );
      expect(m.evenements?.largeur).toBeLessThanOrEqual(m.evenements?.largeurVisible ?? 0);
      expect(m.detail?.largeur, `${contexte} : largeur du détail`).toBeLessThanOrEqual(
        m.detail?.largeurVisible ?? 0,
      );
      // Formulaire sur une colonne à cette largeur
      expect(m.gaucheDesChamps, `${contexte} : un seul alignement des champs`).toHaveLength(1);
      test.info().annotations.push({
        type: `colonnes ${contexte}`,
        description: JSON.stringify({ evenements: m.evenements, detail: m.detail }),
      });
    }

    // La fiche 400 (12 champs sur une colonne) dépasse la hauteur du détail : il défile seul
    const m400 = await mesurerEcran(page);
    expect(m400.detail?.hauteur).toBeGreaterThan(m400.detail?.hauteurVisible ?? 0);
    expect(m400.main?.hauteur).toBe(m400.main?.hauteurVisible);
  } finally {
    await fermer();
  }
});

interface Sonde {
  debut: number | null;
  fin: number | null;
}

/**
 * Arme une mesure dans la page : `debut` à la première occurrence de `evenement` (phase de
 * capture), `fin` à la première mutation du DOM qui suit et après laquelle un élément `selecteur`
 * contient `texte`. Mesure la latence de l'écran sans le délai des allers-retours Playwright.
 */
async function armerSonde(
  page: Page,
  evenement: 'click' | 'focusout',
  cible: { selecteur: string; texte: string },
): Promise<void> {
  await page.evaluate(
    ({ evenement: type, cible: attendu }) => {
      const sonde: Sonde = { debut: null, fin: null };
      (window as unknown as { __sonde: Sonde }).__sonde = sonde;
      document.addEventListener(
        type,
        () => {
          sonde.debut = performance.now();
        },
        { capture: true, once: true },
      );
      const observateur = new MutationObserver(() => {
        if (sonde.debut === null || sonde.fin !== null) return;
        const present = Array.from(document.querySelectorAll(attendu.selecteur)).some((element) =>
          (element.textContent ?? '').includes(attendu.texte),
        );
        if (!present) return;
        sonde.fin = performance.now();
        observateur.disconnect();
      });
      observateur.observe(document.body, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
      });
    },
    { evenement, cible },
  );
}

/** Durée mesurée par la sonde, en ms (attend la fin de la mesure). */
async function lireSonde(page: Page): Promise<number> {
  await page.waitForFunction(
    () => (window as unknown as { __sonde: Sonde }).__sonde.fin !== null,
    undefined,
    { timeout: 30_000 },
  );
  return page.evaluate(() => {
    const sonde = (window as unknown as { __sonde: Sonde }).__sonde;
    return (sonde.fin ?? 0) - (sonde.debut ?? 0);
  });
}

function noterMesure(nom: string, duree: number, seuil: number, details = ''): void {
  const texte = `${duree.toFixed(0)} ms (seuil ${seuil} ms)${details === '' ? '' : ` — ${details}`}`;
  test.info().annotations.push({ type: nom, description: texte });
  console.log(`[mesure] ${nom} : ${texte}`);
}

test('fichier AC056 — mesure sur un fichier d’environ 4 Mo : ouverture, sortie de champ, changement d’évènement', async () => {
  test.setTimeout(180_000);
  const lignes = lignesCompletes({ dossiers: 81 });
  // Une erreur dans le premier évènement : sélectionné à l'ouverture, corrigée par la mesure
  const premiere405 = lignes.findIndex((l) => l.slice(22, 25) === '405');
  lignes[premiere405] = avecChamp(lignes[premiere405] as string, '405', 'nom', 'DUP#ONT');
  const octets = fichierSynthetique(lignes);
  const { page, fermer } = await launchApp({
    preparerTravail: (racine) => {
      ecrire(path.join(racine, 'IN'), 'AC056_4MO.txt', octets, DATE_VALIDE);
    },
  });
  try {
    await allerAuFichierAc056(page);
    const details = `${lignes.length} lignes, ${(octets.length / 1024 / 1024).toFixed(1)} Mo`;
    expect(octets.length).toBeGreaterThan(3.5 * 1024 * 1024);

    // Du clic sur le fichier au premier évènement affiché
    await expect(ligne(page, 'IN', 'AC056_4MO.txt')).toBeVisible();
    await armerSonde(page, 'click', {
      selecteur: 'section[aria-labelledby] ul > li > button[aria-current="true"]',
      texte: '00000001',
    });
    await ligne(page, 'IN', 'AC056_4MO.txt').click();
    const ouverture = await lireSonde(page);
    noterMesure('ouverture du fichier', ouverture, 5000, details);
    expect(ouverture).toBeLessThan(5000);
    await expect(compteurBarre(page, 'AC056_4MO.txt')).toContainText('1 erreur');

    // De la sortie du champ corrigé à la mise à jour du compteur de la barre
    const nom = champFiche(page, 'Nom');
    await expect(nom).toHaveAttribute('aria-invalid', 'true');
    await nom.focus();
    await page.keyboard.press('Control+a');
    await page.keyboard.type('DUPONT');
    await armerSonde(page, 'focusout', { selecteur: 'span', texte: 'Aucune erreur' });
    await page.keyboard.press('Tab');
    const sortie = await lireSonde(page);
    noterMesure('sortie du champ corrigé', sortie, 300, details);
    await expect(compteurBarre(page, 'AC056_4MO.txt')).toContainText('Aucune erreur');
    await expect(champFiche(page, 'Prénom')).toBeFocused();
    expect(sortie).toBeLessThan(300);

    // Clic sur un évènement du milieu de la liste (dossier 25)
    await armerSonde(page, 'click', {
      selecteur: 'section[aria-label="Détail de l’évènement"]',
      texte: '00000025',
    });
    await evenements(page).nth(48).click();
    const navigation = await lireSonde(page);
    noterMesure('clic sur un évènement', navigation, 300, details);
    expect(navigation).toBeLessThan(300);
  } finally {
    await fermer();
  }
});
