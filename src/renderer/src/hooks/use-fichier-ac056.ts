import { useCallback, useEffect, useRef, useState } from 'react';
import {
  indexerLignes,
  saisirChamp,
  type CibleChamp,
  type ErreurModification,
  type IndexLignesAc056,
} from '@shared/domain/ac056';
import type { CibleFichierAc056 } from '@shared/schemas/ac056';
import type { ErreurAc056, OuvertureAc056 } from '@shared/types';

import { ouvrirFichierAc056 } from '@/services/ac056';

type OuvertureReussie = Extract<OuvertureAc056, { ok: true }>;

/** Fichier AC056 de l'écran : aucun, en cours de chargement, ouvert (analysé) ou en échec. */
export type EtatFichierAc056 =
  | { etat: 'aucun' }
  | { etat: 'chargement'; cible: CibleFichierAc056 }
  | ({
      etat: 'ouvert';
      index: IndexLignesAc056;
      /** Vrai dès qu'une saisie a été appliquée : les corrections ne sont pas enregistrées. */
      modifie: boolean;
    } & Omit<OuvertureReussie, 'ok'>)
  | { etat: 'echec'; cible: CibleFichierAc056; erreur: ErreurAc056 };

/**
 * Refus d'une saisie : erreur du domaine, ou `erreur-inattendue` quand le contrôle lui-même a levé une
 * exception (message générique : le texte de l'exception pourrait citer une valeur du fichier).
 */
export interface ErreurSaisie {
  readonly code: ErreurModification['code'] | 'erreur-inattendue';
  readonly message: string;
}

export interface FichierAc056 {
  fichier: EtatFichierAc056;
  /** Charge le fichier ; sans effet tant qu'un chargement est en cours (double clic). */
  ouvrir: (cible: CibleFichierAc056) => void;
  /** Revient au choix du fichier ; sans effet pendant un chargement. */
  fermer: () => void;
  /** Recharge le fichier dont le chargement a échoué. */
  reessayer: () => void;
  /**
   * Applique la saisie d'un champ du fichier ouvert (sortie du champ), en mémoire. Renvoie l'erreur
   * si la saisie est refusée ou échoue (le fichier reste alors inchangé), `null` sinon. `index` est
   * celui du fichier d'où part la saisie : si ce n'est plus celui du fichier ouvert (la saisie
   * arrive après un changement de fichier), elle est ignorée, jamais appliquée à un autre fichier.
   */
  saisir: (cible: CibleChamp, texte: string, index?: IndexLignesAc056) => ErreurSaisie | null;
}

/**
 * Message affiché quand l'appel IPC lui-même échoue. Générique : le texte de l'exception pourrait
 * citer un chemin ou un extrait du fichier.
 */
export const MESSAGE_ECHEC_OUVERTURE = 'erreur inattendue à la lecture du fichier';

/** Affiché sous le champ quand le contrôle de la saisie lève une exception. */
export const MESSAGE_SAISIE_INATTENDUE = 'Saisie non appliquée : erreur inattendue.';

const ERREUR_SAISIE_INATTENDUE: ErreurSaisie = Object.freeze({
  code: 'erreur-inattendue',
  message: MESSAGE_SAISIE_INATTENDUE,
});

const AUCUN: EtatFichierAc056 = Object.freeze({ etat: 'aucun' });

/**
 * Fichier ouvert dans l'écran AC056. L'analyse reçue (fichier, anomalies, compteurs) est gardée en
 * mémoire pour la navigation et le contrôle, avec l'index des lignes (hiérarchie, rattachements),
 * construit une seule fois à la réception : la hiérarchie ne change pas quand un champ est modifié.
 * Le main trace le chargement au journal : le hook n'écrit rien.
 */
export function useFichierAc056(): FichierAc056 {
  const [fichier, setFichier] = useState<EtatFichierAc056>({ etat: 'aucun' });
  // Verrou synchrone : deux clics dans le même rendu ne doivent pas lancer deux chargements
  const occupe = useRef(false);
  const monte = useRef(true);
  // Dernier état demandé, lu tout de suite par `saisir` et `reessayer` : plusieurs appels dans le même
  // rendu partent de l'état à jour. Toute modification passe par `appliquer` ou par `saisir`.
  const courant = useRef(fichier);

  const appliquer = useCallback((suivant: EtatFichierAc056) => {
    courant.current = suivant;
    setFichier(suivant);
  }, []);

  useEffect(() => {
    monte.current = true;
    return () => {
      monte.current = false;
    };
  }, []);

  const ouvrir = useCallback(
    (cible: CibleFichierAc056) => {
      if (occupe.current) return;
      occupe.current = true;
      const demande = { emplacement: cible.emplacement, nom: cible.nom };
      appliquer({ etat: 'chargement', cible: demande });

      void (async () => {
        let suivant: EtatFichierAc056;
        try {
          const resultat = await ouvrirFichierAc056(demande);
          if (resultat.ok) {
            const { emplacement, nom, provenance, analyse } = resultat;
            const index = indexerLignes(analyse.fichier);
            suivant = {
              etat: 'ouvert',
              emplacement,
              nom,
              provenance,
              analyse,
              index,
              modifie: false,
            };
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
        if (monte.current) appliquer(suivant);
      })();
    },
    [appliquer],
  );

  const fermer = useCallback(() => {
    if (occupe.current) return;
    appliquer(AUCUN);
  }, [appliquer]);

  const reessayer = useCallback(() => {
    const actuel = courant.current;
    if (actuel.etat === 'echec') ouvrir(actuel.cible);
  }, [ouvrir]);

  const saisir = useCallback(
    (cible: CibleChamp, texte: string, index?: IndexLignesAc056): ErreurSaisie | null => {
      const actuel = courant.current;
      if (actuel.etat !== 'ouvert') return null;
      if (index !== undefined && index !== actuel.index) return null;
      let resultat: ReturnType<typeof saisirChamp>;
      try {
        resultat = saisirChamp(actuel.analyse, actuel.index, cible, texte);
      } catch {
        // Jamais le texte de l'exception : il pourrait citer une valeur du fichier
        return ERREUR_SAISIE_INATTENDUE;
      }
      if (!resultat.ok) return resultat.erreur;
      // Texte inchangé sur un champ sans erreur : le domaine renvoie la même analyse, rien à mettre à jour
      if (resultat.analyse !== actuel.analyse) {
        const suivant: EtatFichierAc056 = { ...actuel, analyse: resultat.analyse, modifie: true };
        // Lu tout de suite : deux sorties de champ dans le même rendu partent de l'analyse à jour.
        // Garde `precedent === actuel` : d'ordinaire vraie (même deux saisies dans le même rendu se
        // chaînent). Elle ne joue que si un autre état (fermeture, rechargement) s'est glissé dans la
        // file avant cette mise à jour : la saisie ne le remplace alors pas.
        courant.current = suivant;
        setFichier((precedent) => (precedent === actuel ? suivant : precedent));
      }
      return null;
    },
    [],
  );

  return { fichier, ouvrir, fermer, reessayer, saisir };
}
