import { ipcMain } from 'electron';
import { fichierAc056Schema } from '@shared/schemas/ac056';
import type { ServiceAc056 } from '../../services/ac056';

interface DependancesAc056 {
  service: ServiceAc056;
}

/**
 * Canaux `ac056:lister` (sans entrée) et `ac056:ouvrir` (un seul argument `{ emplacement, nom }`,
 * validé par zod : une entrée invalide rejette l'appel sans appeler le service). Les erreurs
 * d'accès aux fichiers sont renvoyées typées dans le résultat, sans chemin Windows.
 */
export function enregistrerHandlersAc056({ service }: DependancesAc056): void {
  ipcMain.handle('ac056:lister', () => service.lister());

  ipcMain.handle('ac056:ouvrir', (_event, entree: unknown) => {
    const { emplacement, nom } = fichierAc056Schema.parse(entree);
    return service.ouvrir(emplacement, nom);
  });
}
