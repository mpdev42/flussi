import { useCallback, useEffect, useRef, useState } from 'react';
import type { DossierTravail } from '@shared/types';

import { ouvrirDossier } from '@/services/parametres';

export interface OuvertureDossier {
  ouvrir: (dossier: DossierTravail) => void;
  /** Dossier dont l'ouverture est en cours, ou `null`. */
  enCours: DossierTravail | null;
  /** Cause lisible du dernier échec, effacée à l'ouverture suivante. */
  erreur: string | null;
}

/** Ouverture d'un dossier de travail dans l'Explorateur. Un clic pendant une ouverture est ignoré. */
export function useOuvertureDossier(): OuvertureDossier {
  const [enCours, setEnCours] = useState<DossierTravail | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  // Verrou synchrone : deux clics dans le même rendu ne doivent pas lancer deux ouvertures
  const occupe = useRef(false);
  const monte = useRef(true);

  useEffect(() => {
    monte.current = true;
    return () => {
      monte.current = false;
    };
  }, []);

  const ouvrir = useCallback((dossier: DossierTravail) => {
    if (occupe.current) return;
    occupe.current = true;
    setEnCours(dossier);
    setErreur(null);

    ouvrirDossier(dossier)
      .then((resultat) => (resultat.ok ? null : resultat.message))
      .catch((cause: unknown) => (cause instanceof Error ? cause.message : String(cause)))
      .then((message) => {
        occupe.current = false;
        if (!monte.current) return;
        setEnCours(null);
        setErreur(message);
      });
  }, []);

  return { ouvrir, enCours, erreur };
}
