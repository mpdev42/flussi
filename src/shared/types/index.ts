// Types partagés entre main et renderer

import type { Configuration } from '../schemas/config';

export type { EtatJournal, LigneJournal, SessionJournal } from './journal';
export type {
  CodeErreurStockage,
  ElementStockage,
  Emplacement,
  ErreurStockage,
  ResultatStockage,
} from './stockage';

/** Configuration résolue non secrète, renvoyée par le canal IPC `config:lire`. */
export type ConfigurationPublique = Configuration & { version: string };
