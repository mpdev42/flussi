import { ipcMain } from 'electron';
import type { ConfigurationPublique } from '@shared/types';

/** Canal `config:lire` : configuration résolue non secrète. Pas d'entrée à valider. */
export function enregistrerHandlersParametres(configuration: ConfigurationPublique): void {
  ipcMain.handle('config:lire', () => configuration);
}
