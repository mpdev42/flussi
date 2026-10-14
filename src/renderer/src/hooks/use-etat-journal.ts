import { useEffect, useState } from 'react';
import type { EtatJournal } from '@shared/types';

import { lireEtatJournal, surEtatJournal } from '@/services/journal';

/**
 * État d'écriture du journal de la session : lecture au montage puis abonnement aux changements.
 * `null` tant que l'état n'est pas connu (ou si l'IPC échoue : pas de bandeau dans ce cas).
 */
export function useEtatJournal(): EtatJournal | null {
  const [etat, setEtat] = useState<EtatJournal | null>(null);

  useEffect(() => {
    let annule = false;
    let evenementRecu = false;
    const desabonner = surEtatJournal((nouvelEtat) => {
      evenementRecu = true;
      if (!annule) setEtat(nouvelEtat);
    });
    lireEtatJournal()
      .then((initial) => {
        // Un évènement reçu entre-temps est plus récent que la lecture initiale.
        if (!annule && !evenementRecu) setEtat(initial);
      })
      .catch(() => {
        // État inconnu : le bandeau reste masqué.
      });
    return () => {
      annule = true;
      desabonner();
    };
  }, []);

  return etat;
}
