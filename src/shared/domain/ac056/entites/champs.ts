// Aides de construction des champs : une ligne par champ, calquée sur la ligne `Copy` de Lazarus.
import {
  LONGUEUR_LIGNE,
  type Bourrage,
  type DescriptionChamp,
  type TypeChamp,
  type ValeurAutorisee,
} from './types';

/** Options d'un champ ; `trim`, `affiche` et `modifiable` valent `false` par défaut. */
export interface OptionsChamp {
  readonly trim?: boolean;
  readonly affiche?: boolean;
  readonly modifiable?: boolean;
  readonly maxLength?: number;
  readonly valeursAutorisees?: readonly ValeurAutorisee[];
  /** Surcharge du bourrage déduit du type. */
  readonly bourrage?: Bourrage;
}

function champ(
  type: TypeChamp,
  bourrageParDefaut: Bourrage,
  nom: string,
  position: number,
  longueur: number,
  options: OptionsChamp,
): DescriptionChamp {
  return {
    nom,
    position,
    longueur,
    type,
    bourrage: options.bourrage ?? bourrageParDefaut,
    trim: options.trim ?? false,
    affiche: options.affiche ?? false,
    modifiable: options.modifiable ?? false,
    ...(options.maxLength !== undefined && { maxLength: options.maxLength }),
    ...(options.valeursAutorisees !== undefined && {
      valeursAutorisees: options.valeursAutorisees,
    }),
  };
}

/** Champ alphanumérique, bourré d'espaces à droite. */
export function alpha(
  nom: string,
  position: number,
  longueur: number,
  options: OptionsChamp = {},
): DescriptionChamp {
  return champ('alphanumerique', ' ', nom, position, longueur, options);
}

/** Champ numérique, bourré de zéros à droite. */
export function num(
  nom: string,
  position: number,
  longueur: number,
  options: OptionsChamp = {},
): DescriptionChamp {
  return champ('numerique', '0', nom, position, longueur, options);
}

/** Champ date, bourré d'espaces à droite. */
export function date(
  nom: string,
  position: number,
  longueur: number,
  options: OptionsChamp = {},
): DescriptionChamp {
  return champ('date', ' ', nom, position, longueur, options);
}

/**
 * Fin de ligne non lue par Lazarus (après son dernier champ, jusqu'à l'octet 700).
 * Lazarus la réécrit en espaces.
 */
export function zoneNonDecrite(position: number): DescriptionChamp {
  return alpha('zoneNonDecrite', position, LONGUEUR_LIGNE - position + 1);
}
