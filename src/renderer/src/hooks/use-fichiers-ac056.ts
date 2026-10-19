import { useEffect, useRef } from 'react';
import type { FichierListeAc056 } from '@shared/types';

import { listerFichiersAc056 } from '@/services/ac056';

import { useChargementStockage, type EtatChargement } from './use-chargement-stockage';

export interface FichiersAc056 {
  in: FichierListeAc056[];
  out: FichierListeAc056[];
}

async function charger() {
  const liste = await listerFichiersAc056();
  return liste.ok ? { ok: true as const, valeur: { in: liste.in, out: liste.out } } : liste;
}

/**
 * Fichiers de `IN` et de `OUT`, relus à chaque montage. `actif` vaut `false` tant que l'écran est
 * masqué (il reste monté) : la liste est relue au retour sur l'écran. `recharger` la relit à la
 * demande.
 */
export function useFichiersAc056(actif = true): EtatChargement<FichiersAc056> {
  const etat = useChargementStockage<FichiersAc056>('ac056-liste', charger);
  const { recharger } = etat;
  const etaitActif = useRef(actif);

  useEffect(() => {
    if (actif && !etaitActif.current) recharger();
    etaitActif.current = actif;
  }, [actif, recharger]);

  return etat;
}
