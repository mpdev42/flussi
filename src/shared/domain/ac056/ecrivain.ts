// Écriture d'un fichier AC056. Seuls les octets des champs corrigés changent (décision 4 de l'item 3
// de la v0.3.0, remplacée le 2026-10-21) : une ligne sans correction est recopiée depuis `origine`,
// quelle que soit sa nature ; dans une ligne corrigée, chaque champ de `champsModifies` est écrit
// comme Lazarus l'écrit (`AddCharR` du champ, bourrage à droite, sans troncature :
// `EnregistrerFichierAc056`, `fmain.pas:3449`), le reste de la ligne (autres champs, zone non
// décrite) reste celui de l'origine. BOM et fins de ligne d'origine conservés, lignes vides et 0x1A
// finaux absents (le lecteur ne les garde pas).
// Divergence avec Lazarus, qui régénère chaque ligne décrite avec le `Trim` de la lecture : elle ne
// se voit que là où `Trim` puis `AddCharR` changeraient les octets (un rang « 5␠ » écrit « 50 », une
// tabulation retirée), sans effet sur le corpus (`IN` et `MODIFIES`).
import { ENTITES, LONGUEUR_LIGNE } from './entites';
import { addCharR } from './fpc';
import type { FichierAc056, FinDeLigne, LigneAc056 } from './modele';
import {
  joindreOctets,
  octetsDepuisTexte,
  sousOctets,
  tableauDepuisOctets,
  type Octets,
} from './octets';

const OCTETS_BOM = [0xef, 0xbb, 0xbf];

const FINS_DE_LIGNE: Readonly<Record<FinDeLigne, Octets>> = {
  '\r\n': octetsDepuisTexte('\r\n'),
  '\n': octetsDepuisTexte('\n'),
  '\r': octetsDepuisTexte('\r'),
  '': octetsDepuisTexte(''),
};

/**
 * Cause d'un refus d'écriture : `fichier-rejet` (un rejet MSP est en lecture seule) ou `invariant`
 * (champ corrigé sans valeur ou inconnu de l'entité, ligne corrigée d'une autre longueur que
 * 700 octets : erreur de programmation). Les deux sont des erreurs de programmation : l'écran et
 * `preparerEnregistrement` refusent un rejet avant l'écriture, et `modifierChamp` refuse une valeur
 * trop longue. Le code permet à l'appelant de les distinguer dans ses traces ; le main les traite
 * aujourd'hui toutes deux comme une erreur système, sans jamais afficher le message.
 */
export type CodeErreurEcriture = 'fichier-rejet' | 'invariant';

/** Erreur levée par l'écrivain. Le message ne cite jamais une valeur du fichier. */
export class ErreurEcritureAc056 extends Error {
  readonly code: CodeErreurEcriture;

  constructor(code: CodeErreurEcriture, message: string) {
    super(message);
    this.name = 'ErreurEcritureAc056';
    this.code = code;
  }
}

/**
 * Octets de la ligne, sans fin de ligne : `origine`, où seuls les champs de `champsModifies` sont
 * remplacés par leur valeur bourrée (`AddCharR`). Lève une `ErreurEcritureAc056` `invariant` si un
 * champ corrigé est inconnu ou sans valeur, ou si la ligne corrigée ne fait pas 700 octets (valeur
 * plus longue que son champ : jamais de troncature).
 */
export function contenuLigne(ligne: LigneAc056): Octets {
  if (ligne.nature === 'brute' || ligne.champsModifies === undefined) return ligne.origine;

  let contenu = ligne.origine;
  for (const nom of ligne.champsModifies) {
    const champ = ENTITES[ligne.code].champs.find((c) => c.nom === nom);
    if (champ === undefined) {
      throw new ErreurEcritureAc056(
        'invariant',
        `Ligne ${ligne.numero} (entité ${ligne.code}) : champ ${nom} inconnu.`,
      );
    }
    const valeur: Octets | undefined = ligne.valeurs[nom];
    if (valeur === undefined) {
      throw new ErreurEcritureAc056(
        'invariant',
        `Ligne ${ligne.numero} : valeur du champ ${nom} absente.`,
      );
    }
    const debut = champ.position - 1;
    contenu = joindreOctets([
      sousOctets(contenu, 0, debut),
      addCharR(champ.bourrage, valeur, champ.longueur),
      sousOctets(contenu, debut + champ.longueur),
    ]);
  }
  if (contenu.length !== LONGUEUR_LIGNE) {
    throw new ErreurEcritureAc056(
      'invariant',
      `Ligne ${ligne.numero} (entité ${ligne.code}) : ${contenu.length} octets au lieu de ${LONGUEUR_LIGNE}.`,
    );
  }
  return contenu;
}

/** Octets du fichier écrit. Lève une `ErreurEcritureAc056` (rejet, invariant violé). */
export function ecrireAc056(fichier: FichierAc056): Uint8Array {
  if (fichier.provenance === 'rejet') {
    throw new ErreurEcritureAc056(
      'fichier-rejet',
      'Un fichier de rejet est en lecture seule : il ne se réécrit jamais.',
    );
  }
  const corps = tableauDepuisOctets(
    joindreOctets(
      fichier.lignes.flatMap((ligne) => [contenuLigne(ligne), FINS_DE_LIGNE[ligne.finDeLigne]]),
    ),
  );
  if (!fichier.bom) return corps;

  const resultat = new Uint8Array(OCTETS_BOM.length + corps.length);
  resultat.set(OCTETS_BOM, 0);
  resultat.set(corps, OCTETS_BOM.length);
  return resultat;
}
