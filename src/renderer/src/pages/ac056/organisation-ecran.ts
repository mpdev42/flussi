// Organisation de l'écran AC056 d'après les onglets de Lazarus (`pcEvenements`, `pcBeneficiaires`
// de `fmain.lfm`, décision 1 de l'item 2 de la v0.3.0) : onglets de l'évènement et du
// bénéficiaire, entités concernées, colonnes des listes, présence et compteurs d'erreurs de chaque
// onglet. Pas d'onglet 001 (jamais affiché par Lazarus). Un onglet d'entité absente reste visible
// et désactivé (divergence : Lazarus le masque).
import type {
  BeneficiaireAc056,
  CodeEntiteBeneficiaire,
  CodeEntiteEvenement,
  CompteursAc056,
  EvenementAc056,
} from '@shared/domain/ac056';

export type IdOngletEvenement =
  'beneficiaires' | '100' | '110' | '115' | '120' | 'coordonnees' | '130' | '135' | '155' | '180';

export type IdOngletBeneficiaire =
  'garanties' | '400' | '405' | '410' | '411' | 'criteres' | 'variables' | '800';

/** Listes d'éléments : mêmes noms que le modèle (`EvenementAc056.e125`, `BeneficiaireAc056.e700`…). */
export type CleListe = 'e125' | 'e485' | 'e490' | 'e700';

/** Colonne d'une liste : champ de la ligne (nom Flussi) et en-tête affiché. */
export interface ColonneListe {
  readonly champ: string;
  readonly libelle: string;
}

/** Liste d'éléments d'un onglet (Coordonnées, Garanties, Critères, Variables souscription). */
export interface DefListe {
  readonly cle: CleListe;
  /** Entité des éléments, pour retrouver la description des champs affichés. */
  readonly code: '125' | '485' | '490' | '700';
  /** Nom accessible de la liste. */
  readonly nom: string;
  readonly colonnes: readonly ColonneListe[];
}

export interface DefOngletEvenement {
  readonly id: IdOngletEvenement;
  readonly libelle: string;
  /** Libellé en police à chasse fixe (code d'entité). */
  readonly mono: boolean;
  /** Entité comptée par l'onglet ; null pour Bénéficiaires (somme des bénéficiaires). */
  readonly code: CodeEntiteEvenement | null;
  readonly liste?: DefListe;
}

export interface DefOngletBeneficiaire {
  readonly id: IdOngletBeneficiaire;
  readonly libelle: string;
  readonly mono: boolean;
  readonly code: CodeEntiteBeneficiaire;
  readonly liste?: DefListe;
}

const LISTE_COORDONNEES: DefListe = {
  cle: 'e125',
  code: '125',
  nom: 'Coordonnées',
  colonnes: [
    { champ: 'codeTypeCoordonnee', libelle: 'Type' },
    { champ: 'codeNatureCommunication', libelle: 'Nature' },
    { champ: 'valeurCoordonneeCommunication', libelle: 'Valeur' },
  ],
};

const LISTE_GARANTIES: DefListe = {
  cle: 'e700',
  code: '700',
  nom: 'Garanties',
  colonnes: [
    { champ: 'codeAssureur', libelle: 'Assureur' },
    { champ: 'codeProduit', libelle: 'Produit' },
    { champ: 'codeGarantie', libelle: 'Garantie' },
  ],
};

const LISTE_CRITERES: DefListe = {
  cle: 'e485',
  code: '485',
  nom: 'Critères',
  colonnes: [
    { champ: 'code', libelle: 'Critère' },
    { champ: 'valeur', libelle: 'Valeur' },
  ],
};

const LISTE_VARIABLES: DefListe = {
  cle: 'e490',
  code: '490',
  nom: 'Variables souscription',
  colonnes: [
    { champ: 'code', libelle: 'Code' },
    { champ: 'valeur', libelle: 'Valeur' },
  ],
};

/** Onglets de l'évènement, dans l'ordre de Lazarus. */
export const ONGLETS_EVENEMENT: readonly DefOngletEvenement[] = [
  { id: 'beneficiaires', libelle: 'Bénéficiaires', mono: false, code: null },
  { id: '100', libelle: '100', mono: true, code: '100' },
  { id: '110', libelle: '110', mono: true, code: '110' },
  { id: '115', libelle: '115', mono: true, code: '115' },
  { id: '120', libelle: '120', mono: true, code: '120' },
  { id: 'coordonnees', libelle: 'Coordonnées', mono: false, code: '125', liste: LISTE_COORDONNEES },
  { id: '130', libelle: '130', mono: true, code: '130' },
  { id: '135', libelle: '135', mono: true, code: '135' },
  { id: '155', libelle: '155', mono: true, code: '155' },
  { id: '180', libelle: '180', mono: true, code: '180' },
];

/** Onglets du bénéficiaire, dans l'ordre de Lazarus. */
export const ONGLETS_BENEFICIAIRE: readonly DefOngletBeneficiaire[] = [
  { id: 'garanties', libelle: 'Garanties', mono: false, code: '700', liste: LISTE_GARANTIES },
  { id: '400', libelle: '400', mono: true, code: '400' },
  { id: '405', libelle: '405', mono: true, code: '405' },
  { id: '410', libelle: '410', mono: true, code: '410' },
  { id: '411', libelle: '411', mono: true, code: '411' },
  { id: 'criteres', libelle: 'Critères', mono: false, code: '485', liste: LISTE_CRITERES },
  {
    id: 'variables',
    libelle: 'Variables souscription',
    mono: false,
    code: '490',
    liste: LISTE_VARIABLES,
  },
  { id: '800', libelle: '800', mono: true, code: '800' },
];

/** Onglet d'après son identifiant. */
export function definitionOngletEvenement(id: IdOngletEvenement): DefOngletEvenement {
  return ONGLETS_EVENEMENT.find((onglet) => onglet.id === id)!;
}

export function definitionOngletBeneficiaire(id: IdOngletBeneficiaire): DefOngletBeneficiaire {
  return ONGLETS_BENEFICIAIRE.find((onglet) => onglet.id === id)!;
}

/** L'évènement a-t-il des lignes pour cet onglet (Bénéficiaires : au moins un bénéficiaire) ? */
export function ongletEvenementPresent(noeud: EvenementAc056, id: IdOngletEvenement): boolean {
  switch (id) {
    case 'beneficiaires':
      return noeud.beneficiaires.length > 0;
    case 'coordonnees':
      return noeud.e125.length > 0;
    default:
      return noeud[`e${id}`] !== null;
  }
}

export function ongletBeneficiairePresent(
  beneficiaire: BeneficiaireAc056,
  id: IdOngletBeneficiaire,
): boolean {
  switch (id) {
    case 'garanties':
      return beneficiaire.e700.length > 0;
    case 'criteres':
      return beneficiaire.e485.length > 0;
    case 'variables':
      return beneficiaire.e490.length > 0;
    default:
      return beneficiaire[`e${id}`] !== null;
  }
}

/** Erreurs bloquantes de l'onglet de l'évènement `evenement` (Bénéficiaires : tous ses bénéficiaires). */
export function compteurOngletEvenement(
  compteurs: CompteursAc056,
  evenement: number,
  onglet: DefOngletEvenement,
): number {
  if (onglet.code === null) {
    return (compteurs.parBeneficiaire[evenement] ?? []).reduce((somme, n) => somme + n, 0);
  }
  return compteurs.parEntiteEvenement[evenement]?.[onglet.code] ?? 0;
}

export function compteurOngletBeneficiaire(
  compteurs: CompteursAc056,
  evenement: number,
  beneficiaire: number,
  onglet: DefOngletBeneficiaire,
): number {
  return compteurs.parEntiteBeneficiaire[evenement]?.[beneficiaire]?.[onglet.code] ?? 0;
}
