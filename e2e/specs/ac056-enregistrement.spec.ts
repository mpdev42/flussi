import { test, expect, type ElectronApplication, type Locator, type Page } from '@playwright/test';
import { existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { analyserAc056 } from '../../src/shared/domain/ac056';
import {
  enWindows1252,
  fichierSynthetique,
  lignesCompletes,
  lignesRejet,
} from '../../src/shared/test/ac056-synthetique';
import { avecChamp } from '../../src/shared/test/controle-ac056';
import {
  allerAuFichierAc056,
  beneficiaires,
  champFiche,
  cliquerALaSouris,
  compteurBarre,
  corrigerPuisTab,
  DATE_VALIDE,
  deposerDansIn,
  ecrire,
  evenements,
  fixerFenetre,
  lignesValides,
  lireJournalSession,
  NOM_COURT_ERREUR,
  ongletBeneficiaire,
  ongletEvenement,
  ouvrir,
  sansDefilementHorizontal,
  taper,
} from '../aides/ac056';
import { launchApp } from '../fixtures/electron';

// Enregistrement du fichier AC056 corrigé (item 3 de la v0.3.0). Fichiers AC056 synthétiques
// uniquement. Les lectures du disque se font avant `fermer()`, qui supprime le dossier temporaire.

const NOM = 'AC056_ENREGISTRE.txt';
const CORRIGE = 'DUPONT';

/** Fichier VEOS dont les deux 405 portent les noms donnés (`undefined` : le nom d'origine). */
function lignesAvecNoms(noms: readonly (string | undefined)[]): string[] {
  let rang = 0;
  return lignesCompletes({ dossiers: 1 }).map((ligne) => {
    if (ligne.slice(22, 25) !== '405') return ligne;
    const nom = noms[rang++];
    return nom === undefined ? ligne : avecChamp(ligne, '405', 'nom', nom);
  });
}

const octetsDe = (lignes: string[]): Buffer => Buffer.from(fichierSynthetique(lignes));

/** Deux erreurs (un nom refusé sur chacun des deux 405). */
const lignesDeuxErreurs = (): string[] => lignesAvecNoms([NOM_COURT_ERREUR, NOM_COURT_ERREUR]);
/** Une seule erreur : le premier 405. */
const lignesUneErreur = (): string[] => lignesAvecNoms([NOM_COURT_ERREUR]);

const boutonEnregistrer = (page: Page): Locator =>
  page.getByRole('button', { name: 'Enregistrer', exact: true });

/** Alerte du fichier dont le texte correspond (`role="status"`). */
const alerte = (page: Page, texte: RegExp): Locator =>
  page.getByRole('status').filter({ hasText: texte });

const ALERTE_ENREGISTRE = /^Fichier enregistré$/;

const badgeModifie = (page: Page, nom: string): Locator =>
  compteurBarre(page, nom).getByText('Modifié', { exact: true });

/** Lignes du journal de la session sans l'heure : `NIVEAU<TAB>message`. */
function journal(racine: string): string[] {
  return lireJournalSession(racine).map((l) => l.replace(/^\d{2}:\d{2}:\d{2}\t/, ''));
}

/** Attend qu'une ligne du journal (écrit au fil de l'eau) soit sur le disque. */
async function attendreJournal(racine: string, ligne: string): Promise<void> {
  await expect.poll(() => journal(racine), { message: `journal : ${ligne}` }).toContain(ligne);
}

const lireIn = (racine: string, nom = NOM): Buffer => readFileSync(path.join(racine, 'IN', nom));

/** Aucun fichier temporaire d'écriture ne reste dans `IN` ni dans `IN\Originaux`. */
function sansTemporaire(racine: string): void {
  for (const dossier of [path.join(racine, 'IN'), path.join(racine, 'IN', 'Originaux')]) {
    if (!existsSync(dossier) || !statSync(dossier).isDirectory()) continue;
    expect(readdirSync(dossier).filter((nom) => nom.endsWith('.tmp'))).toEqual([]);
  }
}

/** Le fichier écrit se relit par le domaine avec ce nombre d'erreurs. */
function erreursRelues(octets: Buffer): number {
  return analyserAc056(octets, 'veos').erreurs;
}

// ---------------------------------------------------------------------------------------------

test('enregistrement — clic souris juste après la saisie : la correction est incluse, l’original est copié', async () => {
  const initiales = lignesUneErreur();
  const { page, racineTravail, fermer } = await launchApp({
    preparerTravail: deposerDansIn(NOM, initiales),
  });
  try {
    await allerAuFichierAc056(page);
    await ouvrir(page, 'IN', NOM);
    await expect(compteurBarre(page, NOM)).toContainText('1 erreur');
    await expect(boutonEnregistrer(page)).toBeEnabled();

    // Saisie sans quitter le champ, puis clic souris réel sur « Enregistrer »
    await taper(page, champFiche(page, 'Nom'), CORRIGE);
    await cliquerALaSouris(page, boutonEnregistrer(page));

    await expect(alerte(page, ALERTE_ENREGISTRE)).toBeVisible();
    await expect(badgeModifie(page, NOM)).toHaveCount(0);
    await expect(compteurBarre(page, NOM)).toContainText('Aucune erreur');
    await expect(champFiche(page, 'Nom')).toHaveValue(CORRIGE);

    // Disque : l'original est copié tel quel, le fichier est corrigé octet par octet
    const attendu = octetsDe(lignesAvecNoms([CORRIGE]));
    expect(Buffer.compare(lireIn(racineTravail), attendu)).toBe(0);
    expect(erreursRelues(lireIn(racineTravail))).toBe(0);
    const copie = path.join(racineTravail, 'IN', 'Originaux', NOM);
    expect(Buffer.compare(readFileSync(copie), octetsDe(initiales))).toBe(0);
    expect(erreursRelues(readFileSync(copie))).toBe(1);
    sansTemporaire(racineTravail);

    // Journal : lignes dans l'ordre, sans valeur AC056
    const attenduJournal = [
      'TITRE\tCharger',
      `SUCCES\tFichier ${NOM} chargé : 1 erreur`,
      'TITRE\tEnregistrer',
      'INFO\tOriginal de AC056_ENREGISTRE.txt copié dans IN\\Originaux',
      `SUCCES\tFichier ${NOM} enregistré : 1 champ modifié`,
    ];
    await attendreJournal(racineTravail, attenduJournal[4] as string);
    const lignes = journal(racineTravail);
    expect(lignes.slice(lignes.indexOf('TITRE\tCharger'))).toEqual(attenduJournal);
    const contenu = lignes.join('\n');
    expect(contenu).not.toContain('DUPONT');
    expect(contenu).not.toContain('DU#PONT');
  } finally {
    await fermer();
  }
});

test('enregistrement — second enregistrement : la copie de l’original n’est pas écrasée', async () => {
  const initiales = lignesDeuxErreurs();
  const { page, racineTravail, fermer } = await launchApp({
    preparerTravail: deposerDansIn(NOM, initiales),
  });
  try {
    await allerAuFichierAc056(page);
    await ouvrir(page, 'IN', NOM);
    const nom = champFiche(page, 'Nom');

    // Premier enregistrement : première erreur corrigée, l'autre reste
    await corrigerPuisTab(page, nom, CORRIGE);
    await boutonEnregistrer(page).click();
    await expect(alerte(page, /^Fichier enregistré avec 1 erreur/)).toBeVisible();
    const copie = path.join(racineTravail, 'IN', 'Originaux', NOM);
    expect(Buffer.compare(readFileSync(copie), octetsDe(initiales))).toBe(0);
    const miseAJour = statSync(copie).mtimeMs;

    // Seconde correction (autre bénéficiaire) puis second enregistrement
    await beneficiaires(page).nth(1).click();
    await expect(nom).toHaveValue(NOM_COURT_ERREUR);
    await corrigerPuisTab(page, nom, CORRIGE);
    await expect(alerte(page, /^Le fichier ne contient plus d'erreur/)).toBeVisible();
    await boutonEnregistrer(page).click();
    await expect(alerte(page, ALERTE_ENREGISTRE)).toBeVisible();

    expect(
      Buffer.compare(lireIn(racineTravail), octetsDe(lignesAvecNoms([CORRIGE, CORRIGE]))),
    ).toBe(0);
    expect(Buffer.compare(readFileSync(copie), octetsDe(initiales))).toBe(0);
    expect(statSync(copie).mtimeMs).toBe(miseAJour);
    sansTemporaire(racineTravail);

    await attendreJournal(racineTravail, `SUCCES\tFichier ${NOM} enregistré : 1 champ modifié`);
    const lignes = journal(racineTravail);
    // La copie n'est tracée qu'une fois
    expect(lignes.filter((l) => l.startsWith('INFO\tOriginal de'))).toHaveLength(1);
    expect(lignes.filter((l) => l.startsWith('TITRE\tEnregistrer'))).toHaveLength(2);
    expect(lignes).toContain(
      `SUCCES\tFichier ${NOM} enregistré : 1 champ modifié, 1 erreur restante`,
    );
  } finally {
    await fermer();
  }
});

test('enregistrement — avec des erreurs restantes : avertissement avec le nombre et journal', async () => {
  const { page, racineTravail, fermer } = await launchApp({
    preparerTravail: deposerDansIn(NOM, lignesDeuxErreurs()),
  });
  try {
    await allerAuFichierAc056(page);
    await ouvrir(page, 'IN', NOM);
    await corrigerPuisTab(page, champFiche(page, 'Nom'), CORRIGE);
    await expect(compteurBarre(page, NOM)).toContainText('1 erreur');
    await boutonEnregistrer(page).click();

    const avertissement = alerte(
      page,
      /^Fichier enregistré avec 1 erreur\s*: il ne pourra pas être déposé chez MSP tant qu'elle n'est pas corrigée\.$/,
    );
    await expect(avertissement).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: /^Fichier enregistré/ })).toHaveCount(
      1,
    );
    await expect(compteurBarre(page, NOM)).toContainText('1 erreur');
    await expect(badgeModifie(page, NOM)).toHaveCount(0);

    // Le fichier écrit garde la seconde erreur, que le domaine relit
    const ecrit = lireIn(racineTravail);
    expect(Buffer.compare(ecrit, octetsDe(lignesAvecNoms([CORRIGE, NOM_COURT_ERREUR])))).toBe(0);
    expect(erreursRelues(ecrit)).toBe(1);

    await attendreJournal(
      racineTravail,
      `SUCCES\tFichier ${NOM} enregistré : 1 champ modifié, 1 erreur restante`,
    );
  } finally {
    await fermer();
  }
});

test('enregistrement — fichier sans correction ni défaut : « déjà à jour », rien n’est écrit', async () => {
  const { page, racineTravail, fermer } = await launchApp({
    preparerTravail: deposerDansIn(NOM, lignesValides()),
  });
  try {
    const avant = lireIn(racineTravail);
    const dateAvant = statSync(path.join(racineTravail, 'IN', NOM)).mtimeMs;

    await allerAuFichierAc056(page);
    await ouvrir(page, 'IN', NOM);
    await boutonEnregistrer(page).click();

    await expect(alerte(page, /^Le fichier est déjà à jour\s*: rien à enregistrer$/)).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);

    await attendreJournal(racineTravail, `INFO\tFichier ${NOM} déjà à jour : rien à enregistrer`);
    expect(Buffer.compare(lireIn(racineTravail), avant)).toBe(0);
    expect(statSync(path.join(racineTravail, 'IN', NOM)).mtimeMs).toBe(dateAvant);
    expect(existsSync(path.join(racineTravail, 'IN', 'Originaux'))).toBe(false);
    sansTemporaire(racineTravail);
    const lignes = journal(racineTravail);
    expect(lignes.filter((l) => /enregistré :|Original de/.test(l))).toEqual([]);
  } finally {
    await fermer();
  }
});

test('enregistrement — lignes vides supprimées, navigation conservée, correction suivante sur le bon champ', async () => {
  // Trois lignes vides : deux avant le premier 405, une plus loin
  const base = lignesDeuxErreurs();
  const avecVides = [...base.slice(0, 3), '', '', ...base.slice(3, 40), '', ...base.slice(40)];
  const { page, racineTravail, fermer } = await launchApp({
    preparerTravail: deposerDansIn(NOM, avecVides),
  });
  try {
    await allerAuFichierAc056(page);
    await ouvrir(page, 'IN', NOM);
    await expect(compteurBarre(page, NOM)).toContainText('2 erreurs');

    // Sélection à conserver : deuxième évènement, onglet 120
    await evenements(page).nth(1).click();
    await ongletEvenement(page, /^120$/).click();
    await expect(ongletEvenement(page, /^120$/)).toHaveAttribute('aria-selected', 'true');

    // Aucune correction : les lignes vides suffisent à réécrire le fichier
    await boutonEnregistrer(page).click();
    await expect(alerte(page, /^Fichier enregistré avec 2 erreurs/)).toBeVisible();
    await expect(evenements(page).nth(1)).toHaveAttribute('aria-current', 'true');
    await expect(evenements(page).first()).not.toHaveAttribute('aria-current', 'true');
    await expect(ongletEvenement(page, /^120$/)).toHaveAttribute('aria-selected', 'true');

    const premiere = lireIn(racineTravail);
    expect(Buffer.compare(premiere, octetsDe(base))).toBe(0);
    expect(
      Buffer.compare(
        readFileSync(path.join(racineTravail, 'IN', 'Originaux', NOM)),
        octetsDe(avecVides),
      ),
    ).toBe(0);
    await attendreJournal(racineTravail, `INFO\tFichier ${NOM} : 3 lignes vides supprimées`);
    await attendreJournal(
      racineTravail,
      `SUCCES\tFichier ${NOM} enregistré : aucun champ modifié, 2 erreurs restantes`,
    );

    // Une correction après l'enregistrement : les numéros de ligne ont changé, le bon champ est écrit
    await evenements(page).first().click();
    await ongletEvenement(page, /^Bénéficiaires/).click();
    await beneficiaires(page).nth(1).click();
    await ongletBeneficiaire(page, /^405/).click();
    const nom = champFiche(page, 'Nom');
    await expect(nom).toHaveValue(NOM_COURT_ERREUR);
    await corrigerPuisTab(page, nom, CORRIGE);
    await boutonEnregistrer(page).click();
    await expect(alerte(page, /^Fichier enregistré avec 1 erreur/)).toBeVisible();

    expect(
      Buffer.compare(lireIn(racineTravail), octetsDe(lignesAvecNoms([NOM_COURT_ERREUR, CORRIGE]))),
    ).toBe(0);
    await attendreJournal(
      racineTravail,
      `SUCCES\tFichier ${NOM} enregistré : 1 champ modifié, 1 erreur restante`,
    );
    sansTemporaire(racineTravail);
  } finally {
    await fermer();
  }
});

test('enregistrement — fichier mal formé : bouton désactivé avec sa raison ; rejet : pas de bouton', async () => {
  const REJET = 'AC056COUR_REJ_20261021.txt';
  const { page, fermer } = await launchApp({
    preparerTravail: (racine) => {
      ecrire(
        path.join(racine, 'IN'),
        NOM,
        fichierSynthetique(lignesCompletes({ dossiers: 1 }).slice(0, -1)),
        DATE_VALIDE,
      );
      ecrire(
        path.join(racine, 'OUT'),
        REJET,
        fichierSynthetique(
          lignesRejet({
            dossiers: 1,
            message: (code) =>
              code === '405' ? enWindows1252('Message de rejet fictif') : undefined,
          }),
        ),
        DATE_VALIDE,
      );
    },
  });
  try {
    await allerAuFichierAc056(page);

    await ouvrir(page, 'IN', NOM);
    await expect(boutonEnregistrer(page)).toBeDisabled();
    await expect(page.getByText('Fichier mal formé', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Changer de fichier' }).click();
    await ouvrir(page, 'OUT', REJET);
    await expect(compteurBarre(page, REJET)).toContainText('lignes rejetées');
    await expect(page.getByRole('button', { name: /Enregistrer/ })).toHaveCount(0);
  } finally {
    await fermer();
  }
});

test('enregistrement — échec puis « Réessayer » : fichier intact, modifications conservées, puis réussite', async () => {
  const initiales = lignesUneErreur();
  const { page, racineTravail, fermer } = await launchApp({
    preparerTravail: deposerDansIn(NOM, initiales),
  });
  try {
    await allerAuFichierAc056(page);
    await ouvrir(page, 'IN', NOM);
    await corrigerPuisTab(page, champFiche(page, 'Nom'), CORRIGE);
    await expect(badgeModifie(page, NOM)).toBeVisible();

    // Un fichier nommé « Originaux » fait échouer la copie de l'original
    const obstacle = path.join(racineTravail, 'IN', 'Originaux');
    writeFileSync(obstacle, 'obstacle');
    await boutonEnregistrer(page).click();

    const echec = page.getByRole('alert').filter({ hasText: 'Enregistrement impossible' });
    await expect(echec).toBeVisible();
    await expect(echec.getByRole('heading', { level: 2 })).toHaveText(
      /^Enregistrement impossible\s*: le fichier n'a pas été modifié$/,
    );
    await expect(badgeModifie(page, NOM)).toBeVisible();
    await expect(champFiche(page, 'Nom')).toHaveValue(CORRIGE);
    expect(Buffer.compare(lireIn(racineTravail), octetsDe(initiales))).toBe(0);
    sansTemporaire(racineTravail);
    await expect
      .poll(() => journal(racineTravail).filter((l) => l.startsWith('ERREUR\t')))
      .toEqual([expect.stringMatching(new RegExp(`^ERREUR\\tFichier ${NOM} non enregistré : .+`))]);
    expect(
      journal(racineTravail).filter((l) => l.startsWith('SUCCES	') && l.includes(' enregistré : ')),
    ).toHaveLength(0);

    // Obstacle retiré : « Réessayer » réussit
    rmSync(obstacle);
    await echec.getByRole('button', { name: 'Réessayer' }).click();
    await expect(alerte(page, ALERTE_ENREGISTRE)).toBeVisible();
    await expect(echec).toHaveCount(0);
    await expect(badgeModifie(page, NOM)).toHaveCount(0);
    expect(Buffer.compare(lireIn(racineTravail), octetsDe(lignesAvecNoms([CORRIGE])))).toBe(0);
    expect(Buffer.compare(readFileSync(path.join(obstacle, NOM)), octetsDe(initiales))).toBe(0);
    sansTemporaire(racineTravail);
    await attendreJournal(racineTravail, `SUCCES\tFichier ${NOM} enregistré : 1 champ modifié`);
  } finally {
    await fermer();
  }
});

test('enregistrement — rang sur un chiffre refusé, sur deux chiffres accepté', async () => {
  // 400 du premier bénéficiaire (assuré principal) : rang 25, au-dessus du maximum de 20
  const avecRang400 = (rang: string): string[] => {
    let faite = false;
    return lignesCompletes({ dossiers: 1 }).map((ligne) => {
      if (faite || ligne.slice(22, 25) !== '400') return ligne;
      faite = true;
      return avecChamp(ligne, '400', 'rang', rang);
    });
  };
  const lignes = avecRang400('25');
  const { page, racineTravail, fermer } = await launchApp({
    preparerTravail: deposerDansIn(NOM, lignes),
  });
  try {
    await allerAuFichierAc056(page);
    await ouvrir(page, 'IN', NOM);
    await expect(compteurBarre(page, NOM)).toContainText('1 erreur');

    const rang = champFiche(page, 'Rang bénéficiaire');
    await expect(rang).toHaveAttribute('aria-invalid', 'true');
    await expect(rang).toBeEditable();

    // Un seul chiffre : refusé avec le message, rien n'est appliqué
    await corrigerPuisTab(page, rang, '5');
    await expect(rang).toHaveAccessibleDescription(/Saisissez 2 chiffres, par exemple 05\./);
    await expect(rang).toHaveAttribute('aria-invalid', 'true');
    await expect(rang).toHaveValue('5');
    await expect(badgeModifie(page, NOM)).toHaveCount(0);
    await expect(compteurBarre(page, NOM)).toContainText('1 erreur');

    // Deux chiffres : accepté, le message disparaît
    await corrigerPuisTab(page, rang, '05');
    await expect(rang).not.toHaveAccessibleDescription(/Saisissez 2 chiffres/);
    await expect(rang).not.toHaveAttribute('aria-invalid', 'true');
    await expect(badgeModifie(page, NOM)).toBeVisible();
    await expect(compteurBarre(page, NOM)).toContainText('Aucune erreur');

    await boutonEnregistrer(page).click();
    await expect(alerte(page, ALERTE_ENREGISTRE)).toBeVisible();
    const ecrit = lireIn(racineTravail);
    expect(erreursRelues(ecrit)).toBe(0);
    expect(Buffer.compare(ecrit, octetsDe(avecRang400('05')))).toBe(0);
  } finally {
    await fermer();
  }
});

// ---------------------------------------------------------------------------------------------
// Fermeture de la fenêtre avec des corrections non enregistrées
// ---------------------------------------------------------------------------------------------

/** Options d'une boîte native demandée au main (celles que le test vérifie). */
interface OptionsBoite {
  message?: string;
  buttons?: string[];
  defaultId?: number;
  cancelId?: number;
}

interface BoitesNatives {
  __boitesDemandees?: OptionsBoite[];
  __boitesRepondues?: number;
  __boiteOrigine?: (...args: unknown[]) => Promise<unknown>;
}

const MESSAGE_ABANDON = 'Abandonner les modifications ?';

/**
 * Remplace la boîte native `dialog.showMessageBox` du main : « Abandonner les modifications ? »
 * reçoit une réponse fixe (0 : « Annuler », 1 : « Quitter sans enregistrer »), ses options sont
 * mémorisées ; toute autre boîte est mémorisée puis confiée à la vraie fonction (elle reste sans
 * réponse, le test échoue). Jamais de vraie boîte attendue pendant un test.
 */
async function remplacerBoiteNative(app: ElectronApplication, reponse: number): Promise<void> {
  await app.evaluate(
    ({ dialog }, [r, messageAbandon]) => {
      const etat = globalThis as unknown as BoitesNatives;
      etat.__boitesDemandees = [];
      etat.__boitesRepondues = 0;
      // La vraie fonction n'est gardée qu'une fois : un second remplacement ne s'empile pas
      etat.__boiteOrigine ??= dialog.showMessageBox.bind(dialog) as (
        ...args: unknown[]
      ) => Promise<unknown>;
      const origine = etat.__boiteOrigine;
      dialog.showMessageBox = ((...args: unknown[]) => {
        const options = (args[args.length - 1] ?? {}) as OptionsBoite;
        etat.__boitesDemandees?.push({
          message: options.message,
          buttons: options.buttons,
          defaultId: options.defaultId,
          cancelId: options.cancelId,
        });
        if (options.message !== messageAbandon) return origine(...args);
        return Promise.resolve({ response: r, checkboxChecked: false }).then((valeur) => {
          etat.__boitesRepondues = (etat.__boitesRepondues ?? 0) + 1;
          return valeur;
        });
      }) as typeof dialog.showMessageBox;
    },
    [reponse, MESSAGE_ABANDON] as const,
  );
}

const boitesDemandees = (app: ElectronApplication): Promise<OptionsBoite[]> =>
  app.evaluate(() => (globalThis as unknown as BoitesNatives).__boitesDemandees ?? []);

/** Nombre de réponses déjà données à « Abandonner les modifications ? » (séquence de fermeture reprise). */
const boitesRepondues = (app: ElectronApplication): Promise<number> =>
  app.evaluate(() => (globalThis as unknown as BoitesNatives).__boitesRepondues ?? 0);

/**
 * Demande la fermeture et attend qu'elle aboutisse sans aucune boîte. Si une boîte est demandée, le
 * test échoue tout de suite en la nommant (au lieu d'attendre le délai de la fermeture).
 */
async function fermerSansBoite(app: ElectronApplication): Promise<void> {
  const fermee = app.waitForEvent('close', { timeout: 15_000 });
  const boiteInattendue = (async (): Promise<never> => {
    for (;;) {
      let boites: OptionsBoite[];
      try {
        boites = await boitesDemandees(app);
      } catch {
        // Application fermée : la fermeture a abouti, cette surveillance n'a plus d'objet
        return new Promise<never>(() => undefined);
      }
      if (boites.length > 0) {
        throw new Error(`Boîte inattendue à la fermeture : « ${boites[0]?.message ?? '?'} »`);
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  })();
  await demanderFermeture(app);
  await Promise.race([fermee, boiteInattendue]);
}

/** Demande la fermeture de la fenêtre, comme la croix ou Alt+F4 : sans attendre la séquence. */
const demanderFermeture = (app: ElectronApplication): Promise<void> =>
  app.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0]?.close();
  });

test('enregistrement — fermeture avec corrections : « Annuler » garde la fenêtre, « Quitter sans enregistrer » ferme après « Fin de session »', async () => {
  const initiales = lignesUneErreur();
  const { app, page, racineTravail, fermer } = await launchApp({
    preparerTravail: deposerDansIn(NOM, initiales),
  });
  try {
    await allerAuFichierAc056(page);
    await ouvrir(page, 'IN', NOM);
    await corrigerPuisTab(page, champFiche(page, 'Nom'), CORRIGE);
    await expect(badgeModifie(page, NOM)).toBeVisible();

    // Réponse 0 : la boîte est demandée une fois, la fenêtre reste, « Fin de session » n'est pas écrite
    await remplacerBoiteNative(app, 0);
    await demanderFermeture(app);
    // Condition attendue : la réponse « Annuler » a été donnée et la séquence de fermeture reprise
    await expect.poll(() => boitesRepondues(app)).toBe(1);
    const boites = await boitesDemandees(app);
    expect(boites).toHaveLength(1);
    expect(boites[0]).toEqual({
      message: 'Abandonner les modifications ?',
      buttons: ['Annuler', 'Quitter sans enregistrer'],
      defaultId: 0,
      cancelId: 0,
    });
    expect(page.isClosed()).toBe(false);
    await expect(page.getByRole('heading', { level: 1, name: NOM, exact: true })).toBeVisible();
    await expect(badgeModifie(page, NOM)).toBeVisible();
    expect(journal(racineTravail).filter((l) => l.endsWith('Fin de session'))).toEqual([]);

    // Une seconde demande redemande la confirmation, cette fois on quitte
    await remplacerBoiteNative(app, 1);
    const fermee = app.waitForEvent('close');
    await demanderFermeture(app);
    await fermee;

    const lignes = journal(racineTravail);
    expect(lignes[lignes.length - 1]).toBe('TITRE\tFin de session');
    expect(lignes.filter((l) => l.endsWith('Fin de session'))).toHaveLength(1);
    // Rien n'a été enregistré
    expect(Buffer.compare(lireIn(racineTravail), octetsDe(initiales))).toBe(0);
    expect(existsSync(path.join(racineTravail, 'IN', 'Originaux'))).toBe(false);
  } finally {
    await fermer();
  }
});

for (const cas of ['sans modification', 'après enregistrement'] as const) {
  test(`enregistrement — fermeture ${cas} : aucune boîte`, async () => {
    const initiales = lignesUneErreur();
    const { app, page, racineTravail, fermer } = await launchApp({
      preparerTravail: deposerDansIn(NOM, initiales),
    });
    try {
      await allerAuFichierAc056(page);
      await ouvrir(page, 'IN', NOM);
      // Une boîte demandée fait échouer le test tout de suite (voir `fermerSansBoite`)
      await remplacerBoiteNative(app, 0);

      if (cas === 'après enregistrement') {
        await corrigerPuisTab(page, champFiche(page, 'Nom'), CORRIGE);
        await boutonEnregistrer(page).click();
        await expect(alerte(page, ALERTE_ENREGISTRE)).toBeVisible();
      }
      await expect(badgeModifie(page, NOM)).toHaveCount(0);

      await fermerSansBoite(app);

      const lignes = journal(racineTravail);
      expect(lignes[lignes.length - 1]).toBe('TITRE\tFin de session');
      // Sans correction, rien n'a été écrit ; après enregistrement, le fichier est corrigé
      const attendu = cas === 'sans modification' ? initiales : lignesAvecNoms([CORRIGE]);
      expect(Buffer.compare(lireIn(racineTravail), octetsDe(attendu))).toBe(0);
    } finally {
      await fermer();
    }
  });
}

test('enregistrement — fermeture d’un fichier jamais corrigé : aucune boîte', async () => {
  const { app, page, racineTravail, fermer } = await launchApp({
    preparerTravail: deposerDansIn(NOM, lignesValides()),
  });
  try {
    await allerAuFichierAc056(page);
    await ouvrir(page, 'IN', NOM);
    await remplacerBoiteNative(app, 0);

    await fermerSansBoite(app);
    const lignes = journal(racineTravail);
    expect(lignes[lignes.length - 1]).toBe('TITRE\tFin de session');
  } finally {
    await fermer();
  }
});

// ---------------------------------------------------------------------------------------------
// Clics et mise en page après un enregistrement
// ---------------------------------------------------------------------------------------------

test('enregistrement — un clic souris juste après l’enregistrement n’est pas perdu', async () => {
  const { page, fermer } = await launchApp({
    preparerTravail: deposerDansIn(NOM, lignesDeuxErreurs()),
  });
  try {
    await allerAuFichierAc056(page);
    await ouvrir(page, 'IN', NOM);
    await corrigerPuisTab(page, champFiche(page, 'Nom'), CORRIGE);
    await beneficiaires(page).nth(1).click();
    await taper(page, champFiche(page, 'Nom'), CORRIGE);
    await cliquerALaSouris(page, boutonEnregistrer(page));
    await expect(alerte(page, ALERTE_ENREGISTRE)).toBeVisible();

    // Clic sur un autre évènement, puis sur un onglet, sans attente entre les deux
    await cliquerALaSouris(page, evenements(page).nth(1));
    await expect(evenements(page).nth(1)).toHaveAttribute('aria-current', 'true');
    await cliquerALaSouris(page, ongletEvenement(page, /^120$/));
    await expect(ongletEvenement(page, /^120$/)).toHaveAttribute('aria-selected', 'true');
    await expect(
      page.getByRole('region', { name: 'Détail de l’évènement', exact: true }),
    ).toContainText(/Évènement\s*002/);

    // L'alerte d'enregistrement est restée : la navigation ne l'efface pas
    await expect(alerte(page, ALERTE_ENREGISTRE)).toBeVisible();
  } finally {
    await fermer();
  }
});

test('enregistrement — pas de défilement horizontal à 1280×800 avec le badge « Modifié » et les alertes', async () => {
  const { app, page, fermer } = await launchApp({
    preparerTravail: deposerDansIn(NOM, lignesDeuxErreurs()),
  });
  try {
    await fixerFenetre(app, page, 1280, 800);
    await allerAuFichierAc056(page);
    await ouvrir(page, 'IN', NOM);
    await sansDefilementHorizontal(page);

    await corrigerPuisTab(page, champFiche(page, 'Nom'), CORRIGE);
    await expect(badgeModifie(page, NOM)).toBeVisible();
    await sansDefilementHorizontal(page);

    // Avertissement le plus long : fichier enregistré avec des erreurs restantes
    await boutonEnregistrer(page).click();
    await expect(alerte(page, /^Fichier enregistré avec 1 erreur/)).toBeVisible();
    await sansDefilementHorizontal(page);

    // Plus d'erreur, puis « Fichier enregistré »
    await beneficiaires(page).nth(1).click();
    await corrigerPuisTab(page, champFiche(page, 'Nom'), CORRIGE);
    await expect(badgeModifie(page, NOM)).toBeVisible();
    await sansDefilementHorizontal(page);
    await boutonEnregistrer(page).click();
    await expect(alerte(page, ALERTE_ENREGISTRE)).toBeVisible();
    await sansDefilementHorizontal(page);

    // Nouvelle correction après l'enregistrement : le badge « Modifié » revient
    await corrigerPuisTab(page, champFiche(page, 'Nom'), 'DURAND');
    await sansDefilementHorizontal(page);
  } finally {
    await fermer();
  }
});
