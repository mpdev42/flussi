// Modification d'un champ AC056 : parité de `ModifierDonnee` (le texte du contrôle est affecté sans
// bourrage ; le bourrage vient à l'écriture). Les messages ne contiennent jamais la valeur saisie
// (donnée personnelle). Le fichier d'entrée n'est jamais modifié. Chaque champ réécrit est consigné
// dans `champsModifies` de la ligne : le contrôle juge alors la valeur saisie.
// Les messages désignent le champ par son libellé à l'écran (`designationChamp`).
// La valeur gardée est celle qui sera relue : `Trim` (`trimFpc`) pour un champ trimé à la lecture
// (précision B2 de l'item 3 de la v0.3.0 : Lazarus écrivait la saisie telle quelle, relue ensuite
// rognée, si bien qu'un second enregistrement sans saisie réécrivait le champ). Les contrôles de
// longueur et de rang portent sur cette valeur : au plus `maxLength` caractères (`MaxLength` des
// `TEdit` de `fmain.lfm`) et la longueur du champ en octets.
// Divergence (décision 1 et précision B3 de l'item 3 de la v0.3.0) : un champ bourré de zéros (les
// rangs) doit être saisi en chiffres seuls, sur toute sa longueur. Lazarus écrivait « 50 » pour
// « 5 » (`AddCharR`, bourrage à droite) et acceptait « 5␠ » ou « A5 ».
import { designationChamp } from './designation-champ';
import { ENTITES } from './entites';
import { trimFpc } from './fpc';
import type { FichierAc056, LigneDecrite } from './modele';
import { octetsDepuisTexte, texteDepuisOctets } from './octets';

/** `ligne` = numéro de ligne d'origine. */
export interface CibleChamp {
  readonly ligne: number;
  readonly champ: string;
}

export type CodeErreurModification =
  | 'fichier-rejet'
  | 'ligne-introuvable'
  | 'ligne-non-decrite'
  | 'champ-inconnu'
  | 'champ-non-modifiable'
  | 'saut-de-ligne'
  | 'caractere-illisible'
  | 'valeur-trop-longue'
  | 'valeur-trop-courte';

export interface ErreurModification {
  readonly code: CodeErreurModification;
  readonly message: string;
}

export type ResultatModification =
  | { readonly ok: true; readonly fichier: FichierAc056 }
  | { readonly ok: false; readonly erreur: ErreurModification };

/**
 * Demi-paire de substitution UTF-16 isolée (texte mal formé) : `TextEncoder` la remplacerait par
 * U+FFFD (EF BF BD) sans prévenir. Sans le drapeau `u`, l'expression travaille par unité UTF-16.
 */
const DEMI_PAIRE_ISOLEE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

/** Chiffres ASCII seuls, au moins un. */
const CHIFFRES = /^[0-9]+$/;

/** « 05 » pour 2 octets, « 005 » pour 3 : exemple de saisie complète d'un champ numérique. */
function exempleChiffres(longueur: number): string {
  return `${'0'.repeat(Math.max(longueur - 1, 0))}5`;
}

function echec(code: CodeErreurModification, message: string): ResultatModification {
  return Object.freeze({ ok: false as const, erreur: Object.freeze({ code, message }) });
}

export function modifierChamp(
  fichier: FichierAc056,
  cible: CibleChamp,
  valeur: string,
): ResultatModification {
  if (fichier.provenance === 'rejet') {
    return echec('fichier-rejet', 'Un fichier de rejet est en lecture seule.');
  }

  const indice = fichier.lignes.findIndex((ligne) => ligne.numero === cible.ligne);
  const ligne = fichier.lignes[indice];
  if (ligne === undefined) {
    return echec('ligne-introuvable', `Ligne ${cible.ligne} introuvable.`);
  }

  if (ligne.nature === 'brute') {
    return echec(
      'ligne-non-decrite',
      ligne.code !== null && ENTITES[ligne.code].brute
        ? `Ligne ${ligne.numero} : entité ${ligne.code} non modifiable.`
        : `Ligne ${ligne.numero} : ligne non conforme, aucun champ modifiable.`,
    );
  }

  const { code } = ligne;
  const champ = ENTITES[code].champs.find((c) => c.nom === cible.champ);
  if (champ === undefined) {
    return echec('champ-inconnu', `Entité ${code} : champ ${cible.champ} inconnu.`);
  }
  if (!champ.modifiable) {
    return echec(
      'champ-non-modifiable',
      `Entité ${code} : champ ${designationChamp(champ)} non modifiable.`,
    );
  }

  const saisis = octetsDepuisTexte(valeur);
  if (saisis.includes('\r') || saisis.includes('\n')) {
    return echec(
      'saut-de-ligne',
      `Entité ${code} : saut de ligne interdit dans le champ ${designationChamp(champ)}.`,
    );
  }
  // U+FFFD : octets UTF-8 invalides affichés par `texteDepuisOctets` puis retapés. L'écrire
  // remplacerait les octets d'origine par EF BF BD sans que personne l'ait voulu. Une demi-paire
  // de substitution seule (texte UTF-16 mal formé) donnerait EF BF BD elle aussi : même refus.
  if (valeur.includes('\uFFFD') || DEMI_PAIRE_ISOLEE.test(valeur)) {
    return echec(
      'caractere-illisible',
      `Entité ${code} : caractère illisible dans le champ ${designationChamp(champ)}, à remplacer par le bon caractère.`,
    );
  }
  // Valeur telle qu'elle sera relue (`Trim` si le champ est trimé à la lecture). Le décodage rend le
  // texte rogné à l'identique : UTF-8 bien formé (U+FFFD et demi-paires refusés ci-dessus), et
  // `Trim` ne retire que des octets ASCII (<= 0x20), jamais un morceau de caractère.
  const octets = champ.trim ? trimFpc(saisis) : saisis;
  const caracteres = champ.trim ? texteDepuisOctets(octets).length : valeur.length;

  // `MaxLength` du contrôle Lazarus (et `<input maxLength>` de l'écran) : en caractères (unités
  // UTF-16, comme le contrôle d'édition Windows), en plus de la longueur du champ en octets.
  if (champ.maxLength !== undefined && caracteres > champ.maxLength) {
    return echec(
      'valeur-trop-longue',
      `Entité ${code} : valeur trop longue pour le champ ${designationChamp(champ)} (${caracteres} caractères pour ${champ.maxLength}).`,
    );
  }
  if (octets.length > champ.longueur) {
    return echec(
      'valeur-trop-longue',
      `Entité ${code} : valeur trop longue pour le champ ${designationChamp(champ)} (${octets.length} octets pour ${champ.longueur}).`,
    );
  }

  // Champ bourré de zéros (les rangs) : la valeur relue (rognée pour le rang de personne de la 800,
  // trimé) doit être faite de chiffres seuls et occuper tout le champ, sinon le bourrage à droite
  // changerait le nombre (« 5 » écrit « 50 »). Valeur vide comprise.
  if (champ.bourrage === '0' && (octets.length !== champ.longueur || !CHIFFRES.test(octets))) {
    return echec(
      'valeur-trop-courte',
      `Saisissez ${champ.longueur} chiffres, par exemple ${exempleChiffres(champ.longueur)}.`,
    );
  }

  const dejaModifies = ligne.champsModifies ?? [];
  const champsModifies = dejaModifies.includes(champ.nom)
    ? dejaModifies
    : Object.freeze([...dejaModifies, champ.nom]);
  const nouvelle: LigneDecrite = Object.freeze({
    ...ligne,
    valeurs: Object.freeze({ ...ligne.valeurs, [champ.nom]: octets }),
    champsModifies,
  });
  const lignes = Object.freeze(fichier.lignes.map((l, i) => (i === indice ? nouvelle : l)));
  return Object.freeze({ ok: true as const, fichier: Object.freeze({ ...fichier, lignes }) });
}
