// Modification d'un champ AC056 : parité de `ModifierDonnee` (le texte du contrôle est affecté tel
// quel, sans Trim ni bourrage ; le bourrage vient à l'écriture). Les messages ne contiennent jamais
// la valeur saisie (donnée personnelle). Le fichier d'entrée n'est jamais modifié. Chaque champ
// réécrit est consigné dans `champsModifies` de la ligne : le contrôle juge alors la valeur saisie.
// Les messages désignent le champ par son libellé à l'écran (`designationChamp`).
// La valeur est limitée à `maxLength` caractères (`MaxLength` des `TEdit` de `fmain.lfm`) et à la
// longueur du champ en octets.
import { designationChamp } from './designation-champ';
import { ENTITES } from './entites';
import type { FichierAc056, LigneDecrite } from './modele';
import { octetsDepuisTexte } from './octets';

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
  | 'valeur-trop-longue';

export interface ErreurModification {
  readonly code: CodeErreurModification;
  readonly message: string;
}

export type ResultatModification =
  | { readonly ok: true; readonly fichier: FichierAc056 }
  | { readonly ok: false; readonly erreur: ErreurModification };

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

  const octets = octetsDepuisTexte(valeur);
  if (octets.includes('\r') || octets.includes('\n')) {
    return echec(
      'saut-de-ligne',
      `Entité ${code} : saut de ligne interdit dans le champ ${designationChamp(champ)}.`,
    );
  }
  // U+FFFD : octets UTF-8 invalides affichés par `texteDepuisOctets` puis retapés. L'écrire
  // remplacerait les octets d'origine par EF BF BD sans que personne l'ait voulu.
  if (valeur.includes('\uFFFD')) {
    return echec(
      'caractere-illisible',
      `Entité ${code} : caractère illisible dans le champ ${designationChamp(champ)}, à remplacer par le bon caractère.`,
    );
  }
  // `MaxLength` du contrôle Lazarus (et `<input maxLength>` de l'écran) : en caractères (unités
  // UTF-16, comme le contrôle d'édition Windows), en plus de la longueur du champ en octets.
  if (champ.maxLength !== undefined && valeur.length > champ.maxLength) {
    return echec(
      'valeur-trop-longue',
      `Entité ${code} : valeur trop longue pour le champ ${designationChamp(champ)} (${valeur.length} caractères pour ${champ.maxLength}).`,
    );
  }
  if (octets.length > champ.longueur) {
    return echec(
      'valeur-trop-longue',
      `Entité ${code} : valeur trop longue pour le champ ${designationChamp(champ)} (${octets.length} octets pour ${champ.longueur}).`,
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
