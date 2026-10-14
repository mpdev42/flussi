import { useCallback, useEffect, useRef, useState } from 'react';
import type { ResultatStockage } from '@shared/types';

export interface EtatChargement<T> {
  /** `true` tant que la réponse à la demande courante n'est pas arrivée. */
  chargement: boolean;
  /** Cause lisible (`ErreurStockage.message`), ou texte de l'exception si l'IPC échoue. */
  erreur: string | null;
  valeur: T | null;
  recharger: () => void;
}

type Reponse<T> = { ok: true; valeur: T } | { ok: false; message: string };

async function resoudre<T>(charger: () => Promise<ResultatStockage<T>>): Promise<Reponse<T>> {
  try {
    const resultat = await charger();
    return resultat.ok
      ? { ok: true, valeur: resultat.valeur }
      : { ok: false, message: resultat.erreur.message };
  } catch (erreur: unknown) {
    return { ok: false, message: erreur instanceof Error ? erreur.message : String(erreur) };
  }
}

/**
 * Charge une ressource du stockage. `cle` identifie la demande : quand elle change, la ressource
 * est rechargée et la réponse d'une demande périmée est ignorée (annulation au démontage comprise).
 */
export function useChargementStockage<T>(
  cle: string,
  charger: () => Promise<ResultatStockage<T>>,
): EtatChargement<T> {
  const [version, setVersion] = useState(0);
  const [reponse, setReponse] = useState<{ cle: string; contenu: Reponse<T> } | null>(null);
  const chargerRef = useRef(charger);
  const cleComplete = `${cle}#${version}`;

  useEffect(() => {
    chargerRef.current = charger;
  });

  useEffect(() => {
    let annule = false;
    void resoudre(() => chargerRef.current()).then((contenu) => {
      if (!annule) setReponse({ cle: cleComplete, contenu });
    });
    return () => {
      annule = true;
    };
  }, [cleComplete]);

  const recharger = useCallback(() => setVersion((v) => v + 1), []);

  const courante = reponse?.cle === cleComplete ? reponse.contenu : null;
  return {
    chargement: courante === null,
    erreur: courante && !courante.ok ? courante.message : null,
    valeur: courante?.ok ? courante.valeur : null,
    recharger,
  };
}
