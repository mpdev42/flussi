// Modèle d'un fichier AC056 lu : lignes dans l'ordre d'origine, hiérarchie par indices
// (noms calqués sur `utypes.pas`), anomalies relevées à la lecture.
import type { CodeEntite } from './entites';
import type { Octets } from './octets';

export type FinDeLigne = '\r\n' | '\n' | '\r' | '';

interface LigneCommune {
  /** Numéro de ligne d'origine, base 1, lignes vides comptées (comme Lazarus et Notepad++). */
  readonly numero: number;
  /** Octets lus, sans fin de ligne, jamais modifiés. */
  readonly origine: Octets;
  readonly finDeLigne: FinDeLigne;
}

/** Ligne de 700 octets d'une entité non brute, découpée en champs. */
export interface LigneDecrite extends LigneCommune {
  readonly nature: 'decrite';
  readonly code: CodeEntite;
  /** Clé = DescriptionChamp.nom. Copy puis trimFpc si `trim`. */
  readonly valeurs: Readonly<Record<string, Octets>>;
  /**
   * Noms des champs réécrits par `modifierChamp`, sans doublon. Absent tant que rien n'a été
   * modifié. Le contrôle juge alors la valeur saisie et non plus les octets d'origine.
   */
  readonly champsModifies?: readonly string[];
}

/**
 * Ligne conservée telle quelle : 000, 001, 990, 995 ou 999, ou ligne en anomalie (longueur ≠ 700
 * ou code inconnu), réécrite à l'identique.
 */
export interface LigneBrute extends LigneCommune {
  readonly nature: 'brute';
  /** null : code inconnu ou ligne de moins de 25 octets. */
  readonly code: CodeEntite | null;
}

export type LigneAc056 = LigneDecrite | LigneBrute;

// Hiérarchie : indices dans `FichierAc056.lignes` (pas les numéros d'origine).

export interface BeneficiaireAc056 {
  readonly e400: number;
  readonly e405: number | null;
  readonly e410: number | null;
  readonly e411: number | null;
  readonly e800: number | null;
  readonly e485: readonly number[];
  readonly e490: readonly number[];
  readonly e700: readonly number[];
}

export interface EvenementAc056 {
  readonly e100: number;
  readonly e110: number | null;
  readonly e115: number | null;
  readonly e120: number | null;
  readonly e130: number | null;
  readonly e135: number | null;
  readonly e155: number | null;
  readonly e180: number | null;
  readonly e125: readonly number[];
  readonly beneficiaires: readonly BeneficiaireAc056[];
  readonly e990: number | null;
}

export interface DossierAc056 {
  readonly e001: number;
  readonly evenements: readonly EvenementAc056[];
  readonly e995: number | null;
}

export interface FichierAc056 {
  readonly bom: boolean;
  /** Ordre d'origine, sans les lignes vides. Seule source de l'écrivain. */
  readonly lignes: readonly LigneAc056[];
  readonly e000: number | null;
  readonly dossiers: readonly DossierAc056[];
  readonly e999: number | null;
}

export type CodeAnomalie =
  | 'bom'
  | 'fin-de-ligne-lf'
  | 'fin-de-ligne-cr'
  | 'ligne-vide'
  | 'fichier-vide'
  | 'longueur-ligne'
  | 'entite-inconnue'
  | 'entite-mal-placee'
  | 'entite-en-double'
  | 'entite-absente'
  | 'caractere-non-autorise'
  | 'caractere-interdit'
  | 'code-postal-longueur'
  | 'rang-incoherent'
  | 'rang-non-numerique'
  | 'valeur-imposee';

export interface AnomalieAc056 {
  readonly code: CodeAnomalie;
  /** Numéro de ligne d'origine ; null = niveau fichier. */
  readonly ligne: number | null;
  readonly message: string;
  readonly bloquante: boolean;
  /** Nom Flussi du champ en cause (anomalies de contrôle uniquement). */
  readonly champ?: string;
}

export interface LectureAc056 {
  readonly fichier: FichierAc056;
  readonly anomalies: readonly AnomalieAc056[];
}
