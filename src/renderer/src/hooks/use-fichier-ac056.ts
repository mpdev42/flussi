import { useCallback, useEffect, useRef, useState } from 'react';
import type { CibleFichierAc056 } from '@shared/schemas/ac056';
import type { ErreurAc056, OuvertureAc056 } from '@shared/types';

import { ouvrirFichierAc056 } from '@/services/ac056';

type OuvertureReussie = Extract<OuvertureAc056, { ok: true }>;

/** Fichier AC056 de l'écran : aucun, en cours de chargement, ouvert (analysé) ou en échec. */
export type EtatFichierAc056 =
  | { etat: 'aucun' }
  | { etat: 'chargement'; cible: CibleFichierAc056 }
  | ({ etat: 'ouvert' } & Omit<OuvertureReussie, 'ok'>)
  | { etat: 'echec'; cible: CibleFichierAc056; erreur: ErreurAc056 };

export interface FichierAc056 {
  fichier: EtatFichierAc056;
  /** Charge le fichier ; sans effet tant qu'un chargement est en cours (double clic). */
  ouvrir: (cible: CibleFichierAc056) => void;
  /** Revient au choix du fichier ; sans effet pendant un chargement. */
  fermer: () => void;
  /** Recharge le fichier dont le chargement a échoué. */
  reessayer: () => void;
}

/**
 * Message affiché quand l'appel IPC lui-même échoue. Générique : le texte de l'exception pourrait
 * citer un chemin ou un extrait du fichier.
 */
export const MESSAGE_ECHEC_OUVERTURE = 'erreur inattendue à la lecture du fichier';

/**
 * Fichier ouvert dans l'écran AC056. L'analyse reçue (fichier, anomalies, compteurs) est gardée en
 * mémoire pour la navigation et le contrôle des items suivants. Le main trace le chargement au
 * journal : le hook n'écrit rien.
 */
export function useFichierAc056(): FichierAc056 {
  const [fichier, setFichier] = useState<EtatFichierAc056>({ etat: 'aucun' });
  // Verrou synchrone : deux clics dans le même rendu ne doivent pas lancer deux chargements
  const occupe = useRef(false);
  const monte = useRef(true);
  const courant = useRef(fichier);

  useEffect(() => {
    courant.current = fichier;
  });

  useEffect(() => {
    monte.current = true;
    return () => {
      monte.current = false;
    };
  }, []);

  const ouvrir = useCallback((cible: CibleFichierAc056) => {
    if (occupe.current) return;
    occupe.current = true;
    const demande = { emplacement: cible.emplacement, nom: cible.nom };
    setFichier({ etat: 'chargement', cible: demande });

    void (async () => {
      let suivant: EtatFichierAc056;
      try {
        const resultat = await ouvrirFichierAc056(demande);
        if (resultat.ok) {
          const { emplacement, nom, provenance, analyse } = resultat;
          suivant = { etat: 'ouvert', emplacement, nom, provenance, analyse };
        } else {
          suivant = { etat: 'echec', cible: demande, erreur: resultat.erreur };
        }
      } catch {
        suivant = {
          etat: 'echec',
          cible: demande,
          erreur: { code: 'erreur-systeme', message: MESSAGE_ECHEC_OUVERTURE },
        };
      }
      occupe.current = false;
      if (monte.current) setFichier(suivant);
    })();
  }, []);

  const fermer = useCallback(() => {
    if (occupe.current) return;
    setFichier({ etat: 'aucun' });
  }, []);

  const reessayer = useCallback(() => {
    const actuel = courant.current;
    if (actuel.etat === 'echec') ouvrir(actuel.cible);
  }, [ouvrir]);

  return { fichier, ouvrir, fermer, reessayer };
}
