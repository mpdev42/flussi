import { expect, type ElectronApplication, type Locator, type Page } from '@playwright/test';
import { readdirSync, readFileSync, utimesSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fichierSynthetique, lignesCompletes } from '../../src/shared/test/ac056-synthetique';
import { avecChamp } from '../../src/shared/test/controle-ac056';

// Aides communes aux specs de l'écran « Fichier AC056 » (`ac056.spec.ts`, `ac056-enregistrement.spec.ts`).
// Fichiers AC056 synthétiques uniquement : aucune donnée du corpus.

const MOTIF_SESSION = /^\d{8}-\d{6}-.+\.txt$/;

/** Prénom « repérable » des 405 d'un fichier valide : sert à vérifier qu'aucune valeur ne parvient au journal. */
export const VALEUR_REPERABLE_VALIDE = 'ZZPRENOMREPERABLE';

/** Nombre de 405 modifiées dans le fichier avec erreurs : une erreur de contrôle par ligne. */
export const NB_ERREURS = 2;

/** Date de modification d'un fichier du jeu (heure locale, comme l'affichage de l'écran). */
export const dateFichier = (jour: number, heure: number, minute: number): Date =>
  new Date(2026, 9, jour, heure, minute);

export const DATE_VALIDE = dateFichier(18, 10, 0);

export function ecrire(
  dossier: string,
  nom: string,
  contenu: Uint8Array,
  modification: Date,
): void {
  const chemin = path.join(dossier, nom);
  writeFileSync(chemin, contenu);
  utimesSync(chemin, modification, modification);
}

/** Lignes d'un fichier VEOS conforme, avec un prénom repérable sur chaque 405. */
export function lignesValides(): string[] {
  return lignesCompletes({ dossiers: 1 }).map((ligne) =>
    ligne.slice(22, 25) === '405'
      ? avecChamp(ligne, '405', 'prenom1', VALEUR_REPERABLE_VALIDE)
      : ligne,
  );
}

/**
 * Nom court au caractère refusé (`DU#PONT`, corrigé en `DUPONT`). Le nom s'affiche dans la liste des
 * bénéficiaires et dans l'en-tête de la fiche : un nom corrigé qui change de nombre de lignes à
 * l'écran déplacerait la mise en page. Les tests de clic après saisie partent donc d'un nom de
 * longueur réaliste.
 */
export const NOM_COURT_ERREUR = 'DU#PONT';

/** Fichier VEOS dont `nombre` lignes 405 ont le nom `nom` (au caractère refusé). */
export function lignesAvecNomEnErreur(nom: string, nombre = NB_ERREURS): string[] {
  let restantes = nombre;
  return lignesCompletes({ dossiers: 1 }).map((ligne) => {
    if (ligne.slice(22, 25) !== '405' || restantes === 0) return ligne;
    restantes -= 1;
    return avecChamp(ligne, '405', 'nom', nom);
  });
}

export const echapper = (texte: string): string => texte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function navigation(page: Page): Locator {
  return page.getByRole('navigation', { name: 'Navigation principale' });
}

export async function allerA(page: Page, libelle: string): Promise<void> {
  await navigation(page).getByRole('button', { name: libelle, exact: true }).click();
}

export async function allerAuFichierAc056(page: Page): Promise<void> {
  await allerA(page, 'Fichier AC056');
  await expect(page.getByRole('heading', { level: 1, name: 'Fichier AC056' })).toBeVisible();
}

export function carte(page: Page, dossier: 'IN' | 'OUT'): Locator {
  return page.getByRole('group', { name: dossier, exact: true });
}

export function ligne(page: Page, dossier: 'IN' | 'OUT', nom: string): Locator {
  return carte(page, dossier).getByRole('button', { name: new RegExp(echapper(nom)) });
}

export async function ouvrir(page: Page, dossier: 'IN' | 'OUT', nom: string): Promise<void> {
  await ligne(page, dossier, nom).click();
  await expect(page.getByRole('heading', { level: 1, name: nom, exact: true })).toBeVisible();
}

/**
 * Retour à la liste. L'écran relit les dossiers à chaque retour : on attend la fin de cette
 * relecture (plus aucune carte en cours de chargement) pour ne pas agir sur une liste périmée.
 */
export async function changerDeFichier(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Changer de fichier' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Fichier AC056' })).toBeVisible();
  await expect(carte(page, 'IN')).toBeVisible();
  await expect(carte(page, 'OUT')).toBeVisible();
  await expect(page.locator('[role="group"][aria-busy="true"]')).toHaveCount(0);
}

export function panneauJournal(page: Page): Locator {
  return page.locator('aside[aria-label="Journal de la session"]');
}

/** Fichier du journal de la session en cours (dossier du mois courant), en lignes. */
export function lireJournalSession(racineTravail: string): string[] {
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
export async function sansDefilementHorizontal(page: Page): Promise<void> {
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
export function compteurBarre(page: Page, nom: string): Locator {
  return page.getByRole('heading', { level: 1, name: nom, exact: true }).locator('xpath=..');
}

export function colonneEvenements(page: Page): Locator {
  return page.getByRole('region', { name: 'Évènements', exact: true });
}

export function detailEvenement(page: Page): Locator {
  return page.getByRole('region', { name: 'Détail de l’évènement', exact: true });
}

/** Boutons des évènements (premier niveau de la liste, pas les bénéficiaires). */
export function evenements(page: Page): Locator {
  return colonneEvenements(page).locator('ul:not([aria-labelledby]) > li > button');
}

/** Boutons des bénéficiaires de l'évènement sélectionné. */
export function beneficiaires(page: Page): Locator {
  return colonneEvenements(page).locator('ul[aria-labelledby] button');
}

export function ongletEvenement(page: Page, nom: string | RegExp): Locator {
  return page
    .getByRole('tablist', { name: 'Entités de l’évènement' })
    .getByRole('tab', { name: nom });
}

export function ongletBeneficiaire(page: Page, nom: string | RegExp): Locator {
  return page
    .getByRole('tablist', { name: 'Entités du bénéficiaire' })
    .getByRole('tab', { name: nom });
}

/** Champ de la fiche par son libellé exact (« Nom » n'est pas « Nom de jeune fille »). */
export function champFiche(page: Page, libelle: string): Locator {
  return detailEvenement(page).getByLabel(libelle, { exact: true });
}

/** Remplace le texte d'un champ par une vraie frappe au clavier, puis quitte le champ par Tab. */
export async function corrigerPuisTab(page: Page, champ: Locator, texte: string): Promise<void> {
  await champ.focus();
  await page.keyboard.press('Control+a');
  await page.keyboard.type(texte);
  await page.keyboard.press('Tab');
}

/** Alerte du fichier VEOS lisible (`role="status"`), toujours présente, avec ou sans erreur. */
export function alerteFichier(page: Page): Locator {
  return page.getByRole('status').filter({ hasText: /^Le fichier / });
}

/** Texte de l'alerte d'un fichier corrigé en mémoire qui n'a plus d'erreur (pas encore enregistré). */
export const PLUS_D_ERREUR = "Le fichier ne contient plus d'erreur : vous pouvez l'enregistrer.";

/** Dépose un seul fichier dans `IN`. */
export function deposerDansIn(nom: string, lignes: string[]): (racine: string) => void {
  return (racine) => {
    ecrire(path.join(racine, 'IN'), nom, fichierSynthetique(lignes), DATE_VALIDE);
  };
}

export async function fixerFenetre(
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

/** Clic souris réel au centre de l'élément, sans l'attente de stabilité de `locator.click()`. */
export async function cliquerALaSouris(page: Page, cible: Locator): Promise<void> {
  const boite = await cible.boundingBox();
  expect(boite, 'cible du clic visible').not.toBeNull();
  const { x, y, width, height } = boite as NonNullable<typeof boite>;
  await page.mouse.click(x + width / 2, y + height / 2);
}

/** Remplace le texte d'un champ par une vraie frappe, SANS quitter le champ. */
export async function taper(page: Page, champ: Locator, texte: string): Promise<void> {
  await champ.focus();
  await page.keyboard.press('Control+a');
  await page.keyboard.type(texte);
}
