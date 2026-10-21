// Types partagés entre main et renderer

import type { Configuration } from '../schemas/config';
import type { OriginesConfiguration } from './parametres';

export type {
  CodeErreurEnregistrementAc056,
  EmplacementAc056,
  EnregistrementAc056,
  ErreurAc056,
  ErreurEnregistrementAc056,
  FichierListeAc056,
  ListeAc056,
  OuvertureAc056,
} from './ac056';
export type { EtatJournal, LigneJournal, LigneJournalSession, SessionJournal } from './journal';
export type {
  DemandeEnregistrementSecrets,
  DossierTravail,
  EtatSecrets,
  MotDePasseTechnique,
  OrigineValeur,
  OriginesConfiguration,
  ResultatOuvertureDossier,
  ResultatPreparationCle,
  ResultatSecret,
  SecretTechnique,
  StatutSecret,
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
