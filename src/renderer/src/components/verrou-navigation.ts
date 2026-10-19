import { createContext, useContext, useEffect, useMemo, useState } from 'react';

// Verrou de la navigation principale : un écran désactive les boutons de navigation du cadre
// pendant une opération qui ne doit pas être quittée (enregistrement, dépôt…).

export interface VerrouNavigation {
  /** Pose un verrou ; renvoie la fonction qui le retire (sans effet au second appel). */
  verrouiller: () => () => void;
}

/** Fourni par le cadre de l'application. `null` hors du cadre (écran testé seul). */
export const ContexteVerrouNavigation = createContext<VerrouNavigation | null>(null);

/**
 * Désactive la navigation principale tant que `actif` est vrai. Plusieurs écrans ou composants
 * peuvent la demander en même temps : elle reste désactivée tant qu'un demandeur la garde. Le
 * verrou est retiré au démontage. Sans effet hors du cadre de l'application.
 */
export function useVerrouNavigation(actif: boolean): void {
  const contexte = useContext(ContexteVerrouNavigation);
  useEffect(() => {
    if (!actif || contexte === null) return;
    return contexte.verrouiller();
  }, [actif, contexte]);
}

export interface EtatVerrouNavigation {
  /** Vrai tant qu'au moins un verrou est posé. */
  verrouillee: boolean;
  /** Valeur à fournir par `ContexteVerrouNavigation`, stable d'un rendu à l'autre. */
  contexte: VerrouNavigation;
}

/** Pour le cadre de l'application : compte les verrous posés par les écrans. */
export function useEtatVerrouNavigation(): EtatVerrouNavigation {
  const [nombre, setNombre] = useState(0);
  const contexte = useMemo<VerrouNavigation>(
    () => ({
      verrouiller: () => {
        let retire = false;
        setNombre((n) => n + 1);
        return () => {
          if (retire) return;
          retire = true;
          setNombre((n) => n - 1);
        };
      },
    }),
    [],
  );
  return { verrouillee: nombre > 0, contexte };
}
