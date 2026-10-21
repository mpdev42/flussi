// Aides des tests corpus du dossier MODIFIES (`modification.corpus.test.ts`,
// `enregistrement.corpus.test.ts`) : lecture des notes de modification, cas attendus en refus,
// saut final de Lazarus. Aucune valeur du corpus dans un message : fichier, clé, code seulement.
//
// Convention de `MODIFIES\` :
// - `X.txt` : fichier enregistré par Lazarus après la modification ;
// - `X.modification.txt` : note de la modification, en UTF-8 (BOM retiré), lignes séparées par
//   CRLF, LF ou CR, lignes vides ignorées, une clé par ligne sous la forme `clé=valeur` :
//   `original=<nom du fichier dans IN\>`, `ligne=<numéro de ligne d'origine>`,
//   `champ=<nom du champ Flussi exact>`, `valeur=<texte après le premier =, tel quel>`.
//   Les clés `original`, `ligne` et `champ` sont rognées ; `valeur` ne l'est jamais.
import type { FichierAc056 } from '@shared/domain/ac056/modele';
import { listerCorpus, lireCorpus } from './corpus';

export const SUFFIXE_NOTE = '.modification.txt';
const CLES = ['original', 'ligne', 'champ', 'valeur'] as const;
type Cle = (typeof CLES)[number];

/** Octets CR LF : Lazarus termine toujours le fichier par CRLF (divergence 8 de Flussi). */
const CRLF = new Uint8Array([0x0d, 0x0a]);

export interface ModificationCorpus {
  readonly base: string;
  readonly original: string;
  readonly ligne: number;
  readonly champ: string;
  readonly valeur: string;
}

export interface InventaireModifies {
  /** Modifications dont la note et le .txt existent et sont valides. */
  readonly modifications: ModificationCorpus[];
  /** Un .txt sans note, ou une note sans .txt. */
  readonly ecartsAppairage: string[];
  /** Note invalide : clé manquante, inconnue ou en double, ligne invalide, original absent. */
  readonly ecartsNotes: string[];
}

/** Lignes de la note : UTF-8, BOM retiré, découpage CRLF / LF / CR, lignes vides ignorées. */
function lignesDeNote(octets: Uint8Array): string[] {
  const sansBom =
    octets[0] === 0xef && octets[1] === 0xbb && octets[2] === 0xbf ? octets.subarray(3) : octets;
  const texte = new TextDecoder('utf-8', { ignoreBOM: true }).decode(sansBom);
  return texte.split(/\r\n|\n|\r/).filter((ligne) => ligne !== '');
}

/** Lit une note ; renvoie la modification ou la liste des écarts (sans jamais citer une valeur). */
function lireNote(
  base: string,
  octets: Uint8Array,
  fichiersIn: readonly string[],
): { modification: ModificationCorpus } | { ecarts: string[] } {
  const ecarts: string[] = [];
  const valeurs = new Map<Cle, string>();

  lignesDeNote(octets).forEach((ligne, index) => {
    const egal = ligne.indexOf('=');
    if (egal < 0) {
      ecarts.push(`${base} : ligne ${index + 1} de la note sans « = »`);
      return;
    }
    const cle = ligne.slice(0, egal).trim();
    if (!(CLES as readonly string[]).includes(cle)) {
      // Clé tapée à la main : jamais recopiée (texte libre).
      ecarts.push(`${base} : ligne ${index + 1} de la note, clé inconnue`);
      return;
    }
    if (valeurs.has(cle as Cle)) {
      ecarts.push(`${base} : clé ${cle} en double`);
      return;
    }
    valeurs.set(cle as Cle, ligne.slice(egal + 1));
  });

  for (const cle of CLES) {
    if (!valeurs.has(cle)) ecarts.push(`${base} : clé ${cle} manquante`);
  }

  const original = valeurs.get('original')?.trim() ?? '';
  const champ = valeurs.get('champ')?.trim() ?? '';
  const ligneTexte = valeurs.get('ligne')?.trim() ?? '';
  const ligne = /^\d+$/.test(ligneTexte) ? Number(ligneTexte) : 0;

  if (valeurs.has('ligne') && ligne < 1) ecarts.push(`${base} : clé ligne invalide`);
  if (valeurs.has('original') && !fichiersIn.includes(original)) {
    ecarts.push(`${base} : original absent de IN`);
  }

  if (ecarts.length > 0) return { ecarts };
  return { modification: { base, original, ligne, champ, valeur: valeurs.get('valeur') ?? '' } };
}

/** Parcourt MODIFIES\ (à appeler depuis les `it` uniquement). */
export function inventorierModifies(): InventaireModifies {
  const fichiers = listerCorpus('MODIFIES');
  const fichiersIn = listerCorpus('IN');
  const notes = fichiers.filter((nom) => nom.endsWith(SUFFIXE_NOTE));
  const txt = fichiers.filter((nom) => nom.endsWith('.txt') && !nom.endsWith(SUFFIXE_NOTE));

  const basesNotes = notes.map((nom) => nom.slice(0, -SUFFIXE_NOTE.length));
  const basesTxt = txt.map((nom) => nom.slice(0, -'.txt'.length));

  const ecartsAppairage = [
    ...basesTxt.filter((base) => !basesNotes.includes(base)).map((b) => `${b}.txt : note absente`),
    ...basesNotes
      .filter((base) => !basesTxt.includes(base))
      .map((b) => `${b}${SUFFIXE_NOTE} : fichier .txt absent`),
  ];

  const modifications: ModificationCorpus[] = [];
  const ecartsNotes: string[] = [];
  for (const base of basesNotes.filter((b) => basesTxt.includes(b))) {
    const lue = lireNote(base, lireCorpus('MODIFIES', `${base}${SUFFIXE_NOTE}`), fichiersIn);
    if ('modification' in lue) modifications.push(lue.modification);
    else ecartsNotes.push(...lue.ecarts);
  }
  return { modifications, ecartsAppairage, ecartsNotes };
}

/**
 * Cas de MODIFIES (nom de base de la note) où Lazarus a enregistré un rang saisi sur un seul
 * chiffre (400 `rangPersonne`, écrit « X0 ») : Flussi refuse cette saisie (`valeur-trop-courte`,
 * décision 1 de l'item 3 de la v0.3.0, cas cité dans `docs/version-0.3.0.md`). Liste fermée et
 * explicite : un autre cas refusé est un écart, et chacun de ceux-ci doit être constaté.
 */
export const CAS_REFUS_RANG_INCOMPLET: readonly string[] = Object.freeze(['MATH_20260923_054813']);

/**
 * Sortie de Flussi complétée comme Lazarus l'aurait écrite : Lazarus termine toujours par CRLF
 * (divergence 8), Flussi conserve l'absence de saut final de l'original.
 */
export function avecSautFinalLazarus(sortie: Uint8Array, original: FichierAc056): Uint8Array {
  if (original.lignes.at(-1)?.finDeLigne !== '') return sortie;
  const resultat = new Uint8Array(sortie.length + CRLF.length);
  resultat.set(sortie, 0);
  resultat.set(CRLF, sortie.length);
  return resultat;
}
