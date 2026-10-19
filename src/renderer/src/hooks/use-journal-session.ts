import { useEffect, useState } from 'react';
import type { LigneJournalSession } from '@shared/types';

import { lireLignesSession, surLigneJournal } from '@/services/journal';

/** Fusionne des lignes par rang, sans doublon (la première rencontrée gagne), triées par rang. */
export function fusionnerLignesSession(
  actuelles: readonly LigneJournalSession[],
  nouvelles: readonly LigneJournalSession[],
): readonly LigneJournalSession[] {
  const parRang = new Map<number, LigneJournalSession>();
  for (const ligne of [...actuelles, ...nouvelles]) {
    if (!parRang.has(ligne.rang)) parRang.set(ligne.rang, ligne);
  }
  return [...parRang.values()].sort((a, b) => a.rang - b.rang);
}

/**
 * Lignes du journal de la session en cours, pour le panneau affiché en direct. Abonnement aux
 * lignes poussées d'abord, puis lecture de ce qui existe déjà : les deux sont fusionnés par rang.
 * Une lecture initiale en échec laisse les lignes poussées. À appeler une seule fois, au niveau de
 * `App`.
 */
export function useJournalSession(): readonly LigneJournalSession[] {
  const [lignes, setLignes] = useState<readonly LigneJournalSession[]>([]);

  useEffect(() => {
    let annule = false;
    const desabonner = surLigneJournal((ligne) => {
      if (!annule) setLignes((actuelles) => fusionnerLignesSession(actuelles, [ligne]));
    });
    lireLignesSession()
      .then((initiales) => {
        if (!annule) setLignes((actuelles) => fusionnerLignesSession(actuelles, initiales));
      })
      .catch(() => {
        // Lecture initiale impossible : les lignes poussées suffisent.
      });
    return () => {
      annule = true;
      desabonner();
    };
  }, []);

  return lignes;
}
