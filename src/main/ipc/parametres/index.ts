import { ipcMain } from 'electron';
import { dossierTravailSchema } from '@shared/schemas/parametres';
import type { ConfigurationPublique } from '@shared/types';
import type { ServiceParametres } from '../../services/parametres';

interface DependancesParametres {
  configuration: ConfigurationPublique;
  parametres: ServiceParametres;
}

/**
 * Canal `config:lire` : configuration résolue non secrète, avec ses origines (pas d'entrée).
 * Canal `config:ouvrir-dossier` : le renderer envoie un nom de dossier (`travail`, `in`, `out`,
 * `journal`), jamais un chemin ; un nom invalide rejette l'appel (erreur de programmation). L'échec
 * d'ouverture est renvoyé typé dans le résultat.
 */
export function enregistrerHandlersParametres({
  configuration,
  parametres,
}: DependancesParametres): void {
  ipcMain.handle('config:lire', () => configuration);

  ipcMain.handle('config:ouvrir-dossier', (_event, dossier: unknown) =>
    parametres.ouvrirDossier(dossierTravailSchema.parse(dossier)),
  );
}
