// Types du module Parametres qui traversent l'IPC.

import type { DOSSIERS_TRAVAIL } from '../schemas/parametres';

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
