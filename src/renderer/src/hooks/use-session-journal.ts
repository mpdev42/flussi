import type { LigneJournal } from '@shared/types';

import { useChargementStockage, type EtatChargement } from '@/hooks/use-chargement-stockage';
import { lireSession } from '@/services/journal';

/** Lignes d'une session du journal (`chemin` renvoyé par la liste des sessions). */
export function useSessionJournal(chemin: string): EtatChargement<LigneJournal[]> {
  return useChargementStockage(chemin, () => lireSession(chemin));
}
