// Parité de la modification avec Lazarus sur le corpus réel (P:, dossier MODIFIES).
//
// Convention de `CORPUS-DEV\MODIFIES\` :
// - `X.txt` : fichier enregistré par Lazarus après la modification ;
// - `X.modification.txt` : note de la modification, en UTF-8 (BOM retiré), lignes séparées par
//   CRLF, LF ou CR, lignes vides ignorées, une clé par ligne sous la forme `clé=valeur` :
//   `original=<nom du fichier dans IN\>`, `ligne=<numéro de ligne d'origine>`,
//   `champ=<nom du champ Flussi exact>`, `valeur=<texte après le premier =, tel quel>`.
//   Les clés `original`, `ligne` et `champ` sont rognées ; `valeur` ne l'est jamais.
//
// Aucune valeur du corpus n'est affichée : seuls fichier, code d'erreur, ligne, octet, entité et
// champ sont rapportés. Les comparaisons se font par SHA-256. Aucune E/S pendant la collecte.
import { describe, expect, it } from 'vitest';
import { decrireEcartAc056, empreinteSha256 } from '@shared/test/comparaison-ac056';
import {
  decrireSousDossierCorpus,
  listerCorpus,
  lireCorpus,
  localiserEcart,
  MINIMUM_FICHIERS_CORPUS,
} from '@shared/test/corpus';
import { ecrireAc056 } from './ecrivain';
import { lireAc056 } from './lecteur';
import { modifierChamp } from './modification';

const SUFFIXE_NOTE = '.modification.txt';
const CLES = ['original', 'ligne', 'champ', 'valeur'] as const;
type Cle = (typeof CLES)[number];

/** Octets CR LF : Lazarus termine toujours le fichier par CRLF (divergence 8 de Flussi). */
const CRLF = new Uint8Array([0x0d, 0x0a]);

interface Modification {
  base: string;
  original: string;
  ligne: number;
  champ: string;
  valeur: string;
}

interface Inventaire {
  /** Modifications dont la note et le .txt existent et sont valides. */
  modifications: Modification[];
  /** Un .txt sans note, ou une note sans .txt. */
  ecartsAppairage: string[];
  /** Note invalide : clé manquante, inconnue ou en double, ligne invalide, original absent. */
  ecartsNotes: string[];
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
): { modification: Modification } | { ecarts: string[] } {
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

/** Parcourt MODIFIES\ (appelé depuis les `it` uniquement). */
function inventorier(): Inventaire {
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

  const modifications: Modification[] = [];
  const ecartsNotes: string[] = [];
  for (const base of basesNotes.filter((b) => basesTxt.includes(b))) {
    const lue = lireNote(base, lireCorpus('MODIFIES', `${base}${SUFFIXE_NOTE}`), fichiersIn);
    if ('modification' in lue) modifications.push(lue.modification);
    else ecartsNotes.push(...lue.ecarts);
  }
  return { modifications, ecartsAppairage, ecartsNotes };
}

function concatener(a: Uint8Array, b: Uint8Array): Uint8Array {
  const resultat = new Uint8Array(a.length + b.length);
  resultat.set(a, 0);
  resultat.set(b, a.length);
  return resultat;
}

decrireSousDossierCorpus('MODIFIES', 'Modification AC056 sur le corpus réel (MODIFIES)', () => {
  describe('inventaire', () => {
    it(`contient au moins ${MINIMUM_FICHIERS_CORPUS.MODIFIES} paires fichier et note`, () => {
      expect(inventorier().modifications.length).toBeGreaterThanOrEqual(
        MINIMUM_FICHIERS_CORPUS.MODIFIES,
      );
    });

    it('associe chaque .txt à une note et chaque note à un .txt', () => {
      expect(inventorier().ecartsAppairage).toEqual([]);
    });

    it('a des notes valides : clés complètes, ligne numérique, original présent dans IN', () => {
      expect(inventorier().ecartsNotes).toEqual([]);
    });
  });

  describe('modification', () => {
    it('reproduit chaque fichier enregistré par Lazarus, octet pour octet (SHA-256)', () => {
      const ecarts: string[] = [];

      for (const m of inventorier().modifications) {
        const nomAttendu = `${m.base}.txt`;
        const attendu = lireCorpus('MODIFIES', nomAttendu);
        const lectureOriginal = lireAc056(lireCorpus('IN', m.original));

        const resultat = modifierChamp(
          lectureOriginal.fichier,
          { ligne: m.ligne, champ: m.champ },
          m.valeur,
        );
        if (!resultat.ok) {
          ecarts.push(`${m.base} : ${resultat.erreur.code}`);
          continue;
        }

        // Divergence 8 : Lazarus termine toujours par CRLF, Flussi conserve l'absence de saut final.
        const sansSautFinal = lectureOriginal.fichier.lignes.at(-1)?.finDeLigne === '';
        const ecrit = ecrireAc056(resultat.fichier);
        const obtenu = sansSautFinal ? concatener(ecrit, CRLF) : ecrit;

        if (empreinteSha256(obtenu) === empreinteSha256(attendu)) continue;
        const ecart = localiserEcart(attendu, obtenu);
        ecarts.push(
          ecart === null
            ? `${nomAttendu} : empreintes différentes`
            : decrireEcartAc056(nomAttendu, ecart, lireAc056(attendu).fichier),
        );
      }

      expect(ecarts).toEqual([]);
    });

    it('relit et réécrit chaque fichier de Lazarus à l identique (point fixe)', () => {
      const ecarts: string[] = [];

      for (const m of inventorier().modifications) {
        const nom = `${m.base}.txt`;
        const octets = lireCorpus('MODIFIES', nom);
        const lecture = lireAc056(octets);
        const sortie = ecrireAc056(lecture.fichier);

        if (empreinteSha256(sortie) === empreinteSha256(octets)) continue;
        const ecart = localiserEcart(octets, sortie);
        ecarts.push(
          ecart === null
            ? `${nom} : empreintes différentes`
            : decrireEcartAc056(nom, ecart, lecture.fichier),
        );
      }

      expect(ecarts).toEqual([]);
    });
  });
});
