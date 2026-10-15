// Types partagés entre main et renderer

import type { Configuration } from '../schemas/config';
import type { OriginesConfiguration } from './parametres';

export type { EtatJournal, LigneJournal, SessionJournal } from './journal';
export type {
  DossierTravail,
  OrigineValeur,
  OriginesConfiguration,
  ResultatOuvertureDossier,
} from './parametres';
export type {
  CodeErreurStockage,
  ElementStockage,
  Emplacement,
  ErreurStockage,
  ResultatStockage,
} from './stockage';

/** Configuration résolue non secrète, avec ses origines, renvoyée par le canal IPC `config:lire`. */
export type ConfigurationPublique = Configuration & {
  version: string;
  origines: OriginesConfiguration;
};
