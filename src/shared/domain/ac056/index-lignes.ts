// Index des lignes d'un fichier AC056 lu : évènements dans l'ordre du fichier, rattachement de
// chaque ligne à son évènement, son bénéficiaire et son entité, numéro d'origine → indice.
// Construit une fois au chargement : la hiérarchie ne change pas à la modification d'un champ
// (`modifierChamp` ne touche ni au code d'entité ni à l'ordre des lignes).
//
// Ne sont rattachées à aucun évènement : 000, 001, 995, 999, les lignes perdues par « le dernier
// gagne » de `AjouterEntite` (`uac056.pas`), les filles d'un bénéficiaire sans 400, les lignes
// hors d'un dossier et les lignes de code inconnu.
import type { CodeEntite } from './entites';
import type { BeneficiaireAc056, EvenementAc056, FichierAc056 } from './modele';

/** Place d'une ligne dans la hiérarchie. */
export interface Rattachement {
  /** Position de l'évènement dans `IndexLignesAc056.evenements`. */
  readonly evenement: number;
  /** Position du bénéficiaire dans `noeud.beneficiaires` ; null pour une ligne de l'évènement. */
  readonly beneficiaire: number | null;
  /** Entité d'après la place dans la hiérarchie (la 990 est rattachée à l'évènement). */
  readonly entite: CodeEntite;
  /** Position dans une liste 125, 485, 490 ou 700 ; 0 pour une entité unique. */
  readonly rang: number;
}

export interface EvenementIndexe {
  /** Position du dossier dans `FichierAc056.dossiers`. */
  readonly dossier: number;
  readonly noeud: EvenementAc056;
}

export interface IndexLignesAc056 {
  /** Évènements de tous les dossiers, dans l'ordre du fichier. */
  readonly evenements: readonly EvenementIndexe[];
  /** Par indice de `FichierAc056.lignes` : rattachement, ou null hors évènement. */
  readonly rattachements: readonly (Rattachement | null)[];
  /** Numéro de ligne d'origine → indice dans `FichierAc056.lignes`. */
  readonly indices: ReadonlyMap<number, number>;
}

/** Entités uniques d'un évènement, dans l'ordre du modèle. */
const UNIQUES_EVENEMENT = ['110', '115', '120', '130', '135', '155', '180'] as const;
const UNIQUES_BENEFICIAIRE = ['405', '410', '411', '800'] as const;
const LISTES_BENEFICIAIRE = ['485', '490', '700'] as const;

export function indexerLignes(fichier: FichierAc056): IndexLignesAc056 {
  const rattachements = new Array<Rattachement | null>(fichier.lignes.length).fill(null);
  const evenements: EvenementIndexe[] = [];

  const rattacher = (
    indice: number | null,
    evenement: number,
    beneficiaire: number | null,
    entite: CodeEntite,
    rang = 0,
  ): void => {
    if (indice === null) return;
    rattachements[indice] = Object.freeze({ evenement, beneficiaire, entite, rang });
  };

  const indexerBeneficiaire = (b: BeneficiaireAc056, evenement: number, position: number) => {
    rattacher(b.e400, evenement, position, '400');
    for (const code of UNIQUES_BENEFICIAIRE) rattacher(b[`e${code}`], evenement, position, code);
    for (const code of LISTES_BENEFICIAIRE) {
      b[`e${code}`].forEach((indice, rang) => rattacher(indice, evenement, position, code, rang));
    }
  };

  fichier.dossiers.forEach((dossier, positionDossier) => {
    for (const noeud of dossier.evenements) {
      const evenement = evenements.length;
      evenements.push(Object.freeze({ dossier: positionDossier, noeud }));
      rattacher(noeud.e100, evenement, null, '100');
      for (const code of UNIQUES_EVENEMENT) rattacher(noeud[`e${code}`], evenement, null, code);
      noeud.e125.forEach((indice, rang) => rattacher(indice, evenement, null, '125', rang));
      noeud.beneficiaires.forEach((b, position) => indexerBeneficiaire(b, evenement, position));
      rattacher(noeud.e990, evenement, null, '990');
    }
  });

  const indices = new Map<number, number>();
  fichier.lignes.forEach((ligne, indice) => indices.set(ligne.numero, indice));

  return Object.freeze({
    evenements: Object.freeze(evenements),
    rattachements: Object.freeze(rattachements),
    indices,
  });
}
