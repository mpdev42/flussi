// Types de la description déclarative des entités AC056 (lignes de 700 octets, largeur fixe).

/** Longueur d'une ligne AC056, en octets. */
export const LONGUEUR_LIGNE = 700;

/** Position du code d'entité dans la ligne (premier octet, base 1). */
export const POSITION_CODE_ENTITE = 23;

/** Longueur du code d'entité, en octets. */
export const LONGUEUR_CODE_ENTITE = 3;

/** Codes des 22 entités d'un fichier AC056. */
export const CODES_ENTITE = [
  '000',
  '001',
  '100',
  '110',
  '115',
  '120',
  '125',
  '130',
  '135',
  '155',
  '180',
  '400',
  '405',
  '410',
  '411',
  '485',
  '490',
  '700',
  '800',
  '990',
  '995',
  '999',
] as const;

/** Code d'une entité AC056. */
export type CodeEntite = (typeof CODES_ENTITE)[number];

/** Type d'un champ, d'après le suffixe Lazarus (`_n` numérique, `_d` date). */
export type TypeChamp = 'alphanumerique' | 'numerique' | 'date';

/** Caractère de bourrage à droite. */
export type Bourrage = ' ' | '0';

/**
 * Entrée d'une liste de `TComboBox` Lazarus (`CODE - Libellé` découpé au premier « - »).
 * Affichage uniquement, aucun contrôle.
 */
export interface ValeurAutorisee {
  readonly code: string;
  readonly libelle: string;
}

/** Description d'un champ à largeur fixe d'une entité. */
export interface DescriptionChamp {
  /** camelCase dérivé du nom Lazarus (sans `s_`, sans suffixe `_n`/`_d`). */
  readonly nom: string;
  /** Premier octet, base 1. */
  readonly position: number;
  /** Longueur en octets, d'après `Copy()` de `uac056.pas`. */
  readonly longueur: number;
  readonly type: TypeChamp;
  /** Caractère de `AddCharR`, toujours à droite, sans troncature. */
  readonly bourrage: Bourrage;
  /** `Trim` à la lecture dans Lazarus. */
  readonly trim: boolean;
  /** Contrôle de saisie dans l'onglet Lazarus de l'entité. */
  readonly affiche: boolean;
  /**
   * Libellé à l'écran, présent si et seulement si `affiche` : `Caption` du `TLabel` de Lazarus
   * (`fmain.lfm`) sans le « : » final, coquilles corrigées (`fiches.lazarus.test.ts`).
   */
  readonly libelle?: string;
  /** L'un des 23 `TDonneeModifiable`. */
  readonly modifiable: boolean;
  /** `MaxLength` du contrôle Lazarus, conservé même s'il diffère de `longueur`. */
  readonly maxLength?: number;
  readonly valeursAutorisees?: readonly ValeurAutorisee[];
}

/** Description d'une entité AC056. */
export interface DescriptionEntite {
  readonly code: CodeEntite;
  /** Ligne conservée telle quelle (000, 001, 990, 995, 999). */
  readonly brute: boolean;
  readonly champs: readonly DescriptionChamp[];
}
