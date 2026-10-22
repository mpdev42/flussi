// Sélection dans un fichier AC056 ouvert : réducteur pur (testable sans écran) des règles de
// la décision 2 de l'item 2 de la v0.3.0. Tout se sélectionne par position (évènement dans
// `IndexLignesAc056.evenements`, bénéficiaire dans `noeud.beneficiaires`, élément dans sa liste) :
// Lazarus cherche par contenu et retombe toujours sur le premier homonyme.
import type { CodeFiche, CompteursAc056, IndexLignesAc056 } from '@shared/domain/ac056';

import {
  ONGLETS_BENEFICIAIRE,
  ONGLETS_EVENEMENT,
  compteurOngletBeneficiaire,
  compteurOngletEvenement,
  ongletBeneficiairePresent,
  ongletEvenementPresent,
  type CleListe,
  type IdOngletBeneficiaire,
  type IdOngletEvenement,
} from './organisation-ecran';

/** Position de l'élément sélectionné dans chacune des quatre listes (125, 485, 490, 700). */
export type ElementsSelectionnes = Readonly<Record<CleListe, number>>;

export interface SelectionAc056 {
  /** Position dans `IndexLignesAc056.evenements`. */
  readonly evenement: number;
  readonly onglet: IdOngletEvenement;
  /** Position dans `noeud.beneficiaires` du bénéficiaire sélectionné. */
  readonly beneficiaire: number;
  readonly ongletBeneficiaire: IdOngletBeneficiaire;
  readonly elements: ElementsSelectionnes;
}

/** Index et compteurs d'erreurs du fichier ouvert : tout ce que les règles consultent. */
export interface ContexteNavigation {
  readonly index: IndexLignesAc056;
  readonly compteurs: CompteursAc056;
}

const ELEMENTS_AU_DEBUT: ElementsSelectionnes = { e125: 0, e485: 0, e490: 0, e700: 0 };

const SELECTION_PAR_DEFAUT: SelectionAc056 = {
  evenement: 0,
  onglet: '100',
  beneficiaire: 0,
  ongletBeneficiaire: '400',
  elements: ELEMENTS_AU_DEBUT,
};

/** Position du premier compteur non nul, ou -1. */
function premierEnErreur(compteurs: readonly number[] | undefined): number {
  return compteurs?.findIndex((n) => n > 0) ?? -1;
}

/** Listes : premier élément en erreur, sinon le premier. */
function premierElement(compteurs: readonly number[] | undefined): number {
  return Math.max(0, premierEnErreur(compteurs));
}

/** Éléments à sélectionner pour les listes de l'évènement et de son bénéficiaire `beneficiaire`. */
function elementsParDefaut(
  { compteurs }: ContexteNavigation,
  evenement: number,
  beneficiaire: number,
): ElementsSelectionnes {
  const listes = compteurs.parElement[evenement];
  const listesBeneficiaire = listes?.beneficiaires[beneficiaire];
  return {
    e125: premierElement(listes?.e125),
    e485: premierElement(listesBeneficiaire?.e485),
    e490: premierElement(listesBeneficiaire?.e490),
    e700: premierElement(listesBeneficiaire?.e700),
  };
}

/**
 * Sous-onglet à ouvrir pour le bénéficiaire : le premier en erreur, sinon `courant` s'il existe
 * chez ce bénéficiaire, sinon 400 si elle existe, sinon le premier sous-onglet présent (Garanties
 * pour le bénéficiaire implicite d'un rejet, qui n'a pas de 400).
 */
function ongletBeneficiaireChoisi(
  contexte: ContexteNavigation,
  evenement: number,
  beneficiaire: number,
  courant: IdOngletBeneficiaire,
): IdOngletBeneficiaire {
  const enErreur = ONGLETS_BENEFICIAIRE.find(
    (onglet) => compteurOngletBeneficiaire(contexte.compteurs, evenement, beneficiaire, onglet) > 0,
  );
  if (enErreur) return enErreur.id;
  const noeud = contexte.index.evenements[evenement]?.noeud.beneficiaires[beneficiaire];
  if (!noeud) return '400';
  if (ongletBeneficiairePresent(noeud, courant)) return courant;
  if (ongletBeneficiairePresent(noeud, '400')) return '400';
  return (
    ONGLETS_BENEFICIAIRE.find((onglet) => ongletBeneficiairePresent(noeud, onglet.id))?.id ?? '400'
  );
}

/**
 * Applique les règles d'ouverture d'un évènement (voir `choisirEvenement`), même s'il est déjà
 * l'évènement de `selection` : sert aussi à l'ouverture du fichier.
 */
function ouvrirEvenement(
  contexte: ContexteNavigation,
  selection: SelectionAc056,
  evenement: number,
): SelectionAc056 {
  const noeud = contexte.index.evenements[evenement]?.noeud;
  if (!noeud) return selection;

  const enErreur = ONGLETS_EVENEMENT.find(
    (onglet) => compteurOngletEvenement(contexte.compteurs, evenement, onglet) > 0,
  );
  let onglet: IdOngletEvenement;
  if (enErreur) onglet = enErreur.id;
  else onglet = ongletEvenementPresent(noeud, selection.onglet) ? selection.onglet : '100';

  const beneficiaire = premierElement(contexte.compteurs.parBeneficiaire[evenement]);
  return {
    evenement,
    onglet,
    beneficiaire,
    ongletBeneficiaire: ongletBeneficiaireChoisi(
      contexte,
      evenement,
      beneficiaire,
      selection.ongletBeneficiaire,
    ),
    elements: elementsParDefaut(contexte, evenement, beneficiaire),
  };
}

/**
 * Ouvre l'évènement `evenement` : la première fiche en erreur dans l'ordre des onglets (dans
 * Bénéficiaires : premier bénéficiaire en erreur, premier sous-onglet en erreur, premier élément
 * de liste en erreur) ; sans erreur d'onglet, l'onglet courant s'il existe dans cet évènement,
 * sinon 100. Un clic sur l'évènement déjà sélectionné ne fait rien : la sélection est rendue
 * telle quelle (sinon la règle ci-dessus ferait sauter de l'onglet que l'utilisateur a choisi).
 */
export function choisirEvenement(
  contexte: ContexteNavigation,
  selection: SelectionAc056,
  evenement: number,
): SelectionAc056 {
  return evenement === selection.evenement
    ? selection
    : ouvrirEvenement(contexte, selection, evenement);
}

/** Sélection à l'ouverture du fichier : le premier évènement, avec les règles d'ouverture d'un évènement. */
export function selectionInitiale(contexte: ContexteNavigation): SelectionAc056 {
  return ouvrirEvenement(contexte, SELECTION_PAR_DEFAUT, 0);
}

export function choisirOnglet(
  selection: SelectionAc056,
  onglet: IdOngletEvenement,
): SelectionAc056 {
  return onglet === selection.onglet ? selection : { ...selection, onglet };
}

/**
 * Change de bénéficiaire : le premier sous-onglet en erreur, sinon le sous-onglet courant s'il
 * existe chez ce bénéficiaire, sinon 400, sinon le premier présent ; listes : premier élément en
 * erreur, sinon le premier. Un clic sur le bénéficiaire déjà sélectionné ne fait rien (même règle
 * que `choisirEvenement`).
 */
export function choisirBeneficiaire(
  contexte: ContexteNavigation,
  selection: SelectionAc056,
  beneficiaire: number,
): SelectionAc056 {
  const { evenement } = selection;
  if (beneficiaire === selection.beneficiaire) return selection;
  if (!contexte.index.evenements[evenement]?.noeud.beneficiaires[beneficiaire]) return selection;
  const { e485, e490, e700 } = elementsParDefaut(contexte, evenement, beneficiaire);
  return {
    ...selection,
    beneficiaire,
    ongletBeneficiaire: ongletBeneficiaireChoisi(
      contexte,
      evenement,
      beneficiaire,
      selection.ongletBeneficiaire,
    ),
    elements: { ...selection.elements, e485, e490, e700 },
  };
}

export function choisirOngletBeneficiaire(
  selection: SelectionAc056,
  ongletBeneficiaire: IdOngletBeneficiaire,
): SelectionAc056 {
  return ongletBeneficiaire === selection.ongletBeneficiaire
    ? selection
    : { ...selection, ongletBeneficiaire };
}

export function choisirElement(
  selection: SelectionAc056,
  liste: CleListe,
  rang: number,
): SelectionAc056 {
  return rang === selection.elements[liste]
    ? selection
    : { ...selection, elements: { ...selection.elements, [liste]: rang } };
}

/** Fiche affichée : entité et indice de sa ligne dans `FichierAc056.lignes`. */
export interface FicheCourante {
  readonly code: CodeFiche;
  readonly indice: number;
}

function fiche(code: CodeFiche, indice: number | null | undefined): FicheCourante | null {
  return indice === null || indice === undefined ? null : { code, indice };
}

/** Ligne de la fiche à afficher pour la sélection, ou null si l'entité n'existe pas. */
export function ficheCourante(
  index: IndexLignesAc056,
  selection: SelectionAc056,
): FicheCourante | null {
  const noeud = index.evenements[selection.evenement]?.noeud;
  if (!noeud) return null;
  const { onglet, ongletBeneficiaire, elements } = selection;

  if (onglet === 'beneficiaires') {
    const beneficiaire = noeud.beneficiaires[selection.beneficiaire];
    if (!beneficiaire) return null;
    switch (ongletBeneficiaire) {
      case 'garanties':
        return fiche('700', beneficiaire.e700[elements.e700]);
      case 'criteres':
        return fiche('485', beneficiaire.e485[elements.e485]);
      case 'variables':
        return fiche('490', beneficiaire.e490[elements.e490]);
      default:
        return fiche(ongletBeneficiaire, beneficiaire[`e${ongletBeneficiaire}`]);
    }
  }
  if (onglet === 'coordonnees') return fiche('125', noeud.e125[elements.e125]);
  return fiche(onglet, noeud[`e${onglet}`]);
}
