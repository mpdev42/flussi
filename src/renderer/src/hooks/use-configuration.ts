import { useEffect, useState } from 'react';
import type { ConfigurationPublique } from '@shared/types';

import { lireConfiguration } from '@/services/parametres';

interface EtatConfiguration {
  configuration: ConfigurationPublique | null;
  erreur: string | null;
}

/** Charge la configuration une seule fois, au montage. */
export function useConfiguration(): EtatConfiguration {
  const [etat, setEtat] = useState<EtatConfiguration>({ configuration: null, erreur: null });

  useEffect(() => {
    let annule = false;
    lireConfiguration()
      .then((configuration) => {
        if (!annule) setEtat({ configuration, erreur: null });
      })
      .catch((erreur: unknown) => {
        if (annule) return;
        const detail = erreur instanceof Error ? erreur.message : String(erreur);
        setEtat({ configuration: null, erreur: detail });
      });
    return () => {
      annule = true;
    };
  }, []);

  return etat;
}
