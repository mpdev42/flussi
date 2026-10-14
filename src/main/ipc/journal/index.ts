import { ipcMain } from 'electron';
import { anneeMoisSchema, cheminSessionSchema } from '@shared/schemas/journal';
import type { HistoriqueJournal, SessionEcriture } from '../../services/journal';

interface DependancesJournal {
  historique: HistoriqueJournal;
  session: Pick<SessionEcriture, 'etat'>;
}

/**
 * Canaux `journal:annees`, `journal:sessions`, `journal:lire` et `journal:etat`. Les entrées sont
 * validées par zod : une entrée invalide rejette l'appel (erreur de programmation). Les erreurs de
 * stockage sont renvoyées typées dans le résultat.
 */
export function enregistrerHandlersJournal({ historique, session }: DependancesJournal): void {
  ipcMain.handle('journal:annees', () => historique.annees());

  ipcMain.handle('journal:sessions', (_event, entree: unknown) => {
    const { annee, mois } = anneeMoisSchema.parse(entree);
    return historique.sessions(annee, mois);
  });

  ipcMain.handle('journal:lire', (_event, chemin: unknown) =>
    historique.lire(cheminSessionSchema.parse(chemin)),
  );

  ipcMain.handle('journal:etat', () => session.etat());
}
