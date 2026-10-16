// Types du module Parametres qui traversent l'IPC.

import type { DOSSIERS_TRAVAIL, MOTS_DE_PASSE, SECRETS_TECHNIQUES } from '../schemas/parametres';

/** Origine d'une valeur : défaut du code, config.json (application installée) ou .env (dev). */
export type OrigineValeur = 'defaut' | 'config' | 'env';

/** Origines des valeurs de la configuration résolue. */
export interface OriginesConfiguration {
  /** Chemin du fichier lu : config.json (installée) ou .env (dev). */
  fichier: string;
  mode: Exclude<OrigineValeur, 'defaut'>;
  /** IN, OUT et Journal sont toujours dérivés de la racine : pas d'origine propre. */
  travail: OrigineValeur;
}

export type DossierTravail = (typeof DOSSIERS_TRAVAIL)[number];

/** Résultat de `config:ouvrir-dossier` ; `message` est lisible par l'utilisateur. */
export type ResultatOuvertureDossier = { ok: true } | { ok: false; message: string };

export type SecretTechnique = (typeof SECRETS_TECHNIQUES)[number];
export type MotDePasseTechnique = (typeof MOTS_DE_PASSE)[number];

/** Statut d'un secret. Jamais la valeur. `date` : AAAA-MM-JJ, date locale du poste. */
export type StatutSecret =
  { etat: 'renseigne'; date: string } | { etat: 'env' } | { etat: 'non-renseigne' };

/** Résultat de `secrets:etat` : aucune valeur de secret, jamais. */
export interface EtatSecrets {
  /** 'env' en dev (.env), 'secrets-bin' pour l'application installée. */
  source: 'env' | 'secrets-bin';
  /** Vrai seulement : application installée, DPAPI disponible, lecture de secrets.bin sans erreur. */
  modifiable: boolean;
  /** Message lisible (fichier illisible, DPAPI indisponible, erreur de lecture), ou null. */
  anomalie: string | null;
  secrets: Record<SecretTechnique, StatutSecret>;
}

/** Résultat de `secrets:enregistrer` ; `message` est lisible par l'utilisateur. */
export type ResultatSecret =
  | { statut: 'enregistre'; etat: EtatSecrets }
  | { statut: 'annule' }
  | { statut: 'refuse'; message: string };

/**
 * Argument de `secrets:enregistrer` (écriture seule). `motsDePasse` : seulement ceux à changer.
 * `cle` : enregistrer aussi la clé préparée par `secrets:preparer-cle`.
 */
export interface DemandeEnregistrementSecrets {
  motsDePasse: Partial<Record<MotDePasseTechnique, string>>;
  cle: boolean;
}

/**
 * Résultat de `secrets:preparer-cle` : la clé est contrôlée et gardée en mémoire dans le main ;
 * l'écran ne reçoit que le libellé du format, jamais le contenu ni le chemin.
 */
export type ResultatPreparationCle =
  | { statut: 'preparee'; format: string }
  | { statut: 'annule' }
  | { statut: 'refuse'; message: string };
