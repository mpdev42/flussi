// Modèle d'un fichier AC056 lu : lignes dans l'ordre d'origine, hiérarchie par indices
// (noms calqués sur `utypes.pas`), anomalies relevées à la lecture.
import type { CodeRejet } from './codes-rejet';
import type { CodeEntite } from './entites';
import type { Octets } from './octets';

/**
 * Origine du fichier, fournie par l'appelant (d'après le préfixe du nom, jamais lue par le
 * domaine) : `veos` (UTF-8, lignes de 700 octets) ou `rejet` (Windows-1252, lecture seule).
 */
export type Provenance = 'veos' | 'rejet';

export type FinDeLigne = '\r\n' | '\n' | '\r' | '';

/** Message MSP d'une ligne de rejet (octets 719 et suivants), avec son code `ERRxxx`. */
export interface MessageRejet {
  /** Texte décodé (Windows-1252), espaces de fin retirés, espaces de tête conservés. Jamais vide. */
  readonly message: string;
  /** null : message non reconnu (divergence 10). */
  readonly code: CodeRejet | null;
  /**
   * Explication du code (`DescriptionRejet.explication`), rédigée pour Flussi (divergence 12) ; null
   * pour un code sans explication (`ERR030`). Message non reconnu : `MESSAGE_REJET_INCONNU`
   * (divergence 10).
   */
  readonly explication: string | null;
}

interface LigneCommune {
  /** Numéro de ligne d'origine, base 1, lignes vides comptées (comme Lazarus et Notepad++). */
  readonly numero: number;
  /** Octets lus, sans fin de ligne, jamais modifiés. */
  readonly origine: Octets;
  readonly finDeLigne: FinDeLigne;
  /**
   * Message MSP : présent seulement sur une ligne de rejet qui en porte un non vide, quelle que
   * soit sa nature (une 990, une 995 ou une 411 garde le sien, que Lazarus perd : divergence 11).
   */
  readonly rejet?: MessageRejet;
}

/**
 * Ligne d'une entité non brute, découpée en champs. 700 octets pour un fichier VEOS ; dans un
 * rejet, 718 octets ou plus, valeurs lues sur les octets 1 à 700.
 */
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
 * Ligne conservée telle quelle : 000, 001, 990, 995 ou 999, ou ligne en anomalie (longueur ≠ 700,
 * ou < 718 dans un rejet, ou code inconnu), réécrite à l'identique.
 */
export interface LigneBrute extends LigneCommune {
  readonly nature: 'brute';
  /** null : code inconnu ou ligne de moins de 25 octets. */
  readonly code: CodeEntite | null;
}

export type LigneAc056 = LigneDecrite | LigneBrute;

// Hiérarchie : indices dans `FichierAc056.lignes` (pas les numéros d'origine).

export interface BeneficiaireAc056 {
  /**
   * null : bénéficiaire implicite d'un rejet, ouvert par une 700 sans 400 dans son évènement (MSP
   * n'a pas renvoyé la 400). Lazarus fabrique une ligne 400 (`AjouterEntite700`,
   * `uac056.pas:736-757`) ; Flussi ne fabrique aucune ligne (divergence 7) : le bénéficiaire existe
   * sans 400, et ses filles qui suivent s'y rattachent comme dans Lazarus.
   */
  readonly e400: number | null;
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
  /** null : dossier d'un rejet sans 001 (MSP la place après la 995, ou l'omet). */
  readonly e001: number | null;
  readonly evenements: readonly EvenementAc056[];
  readonly e995: number | null;
}

export interface FichierAc056 {
  readonly provenance: Provenance;
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
  | 'ctrl-z-final'
  | 'encodage-incoherent'
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
  /**
   * Texte affiché sous le champ (`DESIGN.md` §9.2) : ce qui ne va pas et ce qui est attendu, en
   * une ou deux phrases, sans valeur lue. Anomalies de contrôle uniquement, toujours présent sur
   * celles-ci. Le `message` garde le texte de Lazarus (journal, relevé, liste des erreurs).
   */
  readonly consigne?: string;
}

export interface LectureAc056 {
  readonly fichier: FichierAc056;
  readonly anomalies: readonly AnomalieAc056[];
}
