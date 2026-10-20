// Aide aux tests de parité sur le corpus AC056 de référence.
// - Le corpus (données personnelles réelles) reste sur P: : jamais copié dans le dépôt.
// - Les tests corpus sont nommés `*.corpus.test.ts` et enveloppés dans `decrireCorpus` :
//   ils sont ignorés par `npm test` si le corpus est indisponible, obligatoires avec
//   `npm run test:corpus`.
// - Pas de `toEqual` / `toBe` ni de snapshot sur un contenu du corpus (Vitest afficherait les
//   valeurs) : comparer par empreinte SHA-256, ou par `localiserEcart` + `decrireEcart`.
// - Convention du dossier PIEGES\ : `NOM.txt` + `NOM.erreurs.txt`.
// L'environnement est lu à l'appel, jamais au chargement du module.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe } from 'vitest';

export type SousDossierCorpus = 'IN' | 'OUT' | 'PIEGES' | 'MODIFIES';

export type ResolutionCorpus = { dossier: string } | { dossier: null; raison: string };

/**
 * Nombre minimal de fichiers attendus dans chaque sous-dossier du corpus : fichiers `.txt` de IN,
 * fichiers de rejet de OUT, paires `NOM.txt` + `NOM.erreurs.txt` de PIEGES, paires `NOM.txt` +
 * `NOM.modification.txt` de MODIFIES. Un corpus amputé (copie partielle, dossier vidé) fait échouer
 * les tests au lieu de les rendre vides. PIEGES passera à 2 quand le second fichier piégé sera livré.
 */
export const MINIMUM_FICHIERS_CORPUS: Readonly<Record<SousDossierCorpus, number>> = Object.freeze({
  IN: 9,
  OUT: 3,
  PIEGES: 1,
  MODIFIES: 3,
});

function estDossier(chemin: string): boolean {
  try {
    return statSync(chemin).isDirectory();
  } catch {
    return false;
  }
}

/** Localise le dossier du corpus ; lève une erreur si indisponible et rendu obligatoire. */
export function resoudreCorpus(env: NodeJS.ProcessEnv = process.env): ResolutionCorpus {
  const dossier = env.AC056_CORPUS_DIR?.trim();
  let raison: string | null = null;

  if (!dossier) {
    raison = 'variable AC056_CORPUS_DIR absente ou vide';
  } else if (!estDossier(join(dossier, 'IN')) || !estDossier(join(dossier, 'OUT'))) {
    raison = `dossier inaccessible ou sans sous-dossiers IN et OUT : ${dossier}`;
  }

  if (raison === null && dossier) return { dossier };

  const motif = raison ?? 'indisponible';
  if (env.AC056_CORPUS_OBLIGATOIRE === '1') {
    throw new Error(`Corpus AC056 obligatoire (npm run test:corpus) mais indisponible : ${motif}`);
  }
  return { dossier: null, raison: motif };
}

/** `describe` ignoré (skip) si le corpus est indisponible. */
export function decrireCorpus(nom: string, fn: () => void): void {
  describe.skipIf(resoudreCorpus().dossier === null)(nom, fn);
}

function contientUnFichier(chemin: string): boolean {
  try {
    return readdirSync(chemin, { withFileTypes: true }).some((entree) => entree.isFile());
  } catch {
    return false;
  }
}

/**
 * Comme `resoudreCorpus`, mais exige en plus que le sous-dossier existe et contienne au moins un
 * fichier (cas de MODIFIES\, absent d'un corpus ancien). `dossier` reste la racine du corpus.
 * Lève une erreur si indisponible et rendu obligatoire.
 */
export function resoudreSousDossierCorpus(
  sousDossier: SousDossierCorpus,
  env: NodeJS.ProcessEnv = process.env,
): ResolutionCorpus {
  const resolution = resoudreCorpus(env);
  if (resolution.dossier === null) return resolution;

  if (contientUnFichier(join(resolution.dossier, sousDossier))) return resolution;

  const raison = `sous-dossier ${sousDossier} absent ou vide`;
  if (env.AC056_CORPUS_OBLIGATOIRE === '1') {
    throw new Error(`Corpus AC056 obligatoire (npm run test:corpus) mais ${raison}`);
  }
  return { dossier: null, raison };
}

/** `describe` ignoré (skip) si le corpus ou le sous-dossier est indisponible. */
export function decrireSousDossierCorpus(
  sousDossier: SousDossierCorpus,
  nom: string,
  fn: () => void,
): void {
  describe.skipIf(resoudreSousDossierCorpus(sousDossier).dossier === null)(nom, fn);
}

function dossierCorpus(sousDossier: SousDossierCorpus): string {
  const resolution = resoudreCorpus();
  if (resolution.dossier === null) {
    throw new Error(`Corpus AC056 indisponible : ${resolution.raison}`);
  }
  return join(resolution.dossier, sousDossier);
}

/** Noms des fichiers (sans sous-dossiers) d'un sous-dossier du corpus, triés. */
export function listerCorpus(sousDossier: SousDossierCorpus): string[] {
  return readdirSync(dossierCorpus(sousDossier), { withFileTypes: true })
    .filter((entree) => entree.isFile())
    .map((entree) => entree.name)
    .sort();
}

/** Octets bruts d'un fichier du corpus, sans décodage. */
export function lireCorpus(sousDossier: SousDossierCorpus, nom: string): Uint8Array {
  return new Uint8Array(readFileSync(join(dossierCorpus(sousDossier), nom)));
}

/**
 * Premier octet différent entre deux contenus, ou null s'ils sont identiques.
 * `ligne` et `octet` sont en base 1 ; une ligne se termine après chaque octet LF (0x0A).
 * Si l'un est un préfixe de l'autre, l'écart est à la position qui suit le plus court.
 */
export function localiserEcart(
  attendu: Uint8Array,
  obtenu: Uint8Array,
): { ligne: number; octet: number } | null {
  const commun = Math.min(attendu.length, obtenu.length);
  let ligne = 1;
  let octet = 1;

  for (let i = 0; i < commun; i++) {
    if (attendu[i] !== obtenu[i]) return { ligne, octet };
    if (attendu[i] === 0x0a) {
      ligne++;
      octet = 1;
    } else {
      octet++;
    }
  }

  return attendu.length === obtenu.length ? null : { ligne, octet };
}

/** Description d'un écart, sans jamais révéler la valeur. */
export function decrireEcart(fichier: string, ecart: { ligne: number; octet: number }): string {
  return `${fichier} : ligne ${ecart.ligne}, octet ${ecart.octet}`;
}
