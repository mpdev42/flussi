import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  correctionsAc056,
  indexerLignes,
  saisirChamp,
  type AnalyseAc056,
  type CibleChamp,
  type CodeErreurSaisie,
  type IndexLignesAc056,
} from '@shared/domain/ac056';
import type { CibleFichierAc056 } from '@shared/schemas/ac056';
import type { ErreurAc056, OuvertureAc056 } from '@shared/types';

import {
  enregistrerFichierAc056,
  ouvrirFichierAc056,
  signalerModificationsAc056,
} from '@/services/ac056';

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
      /**
       * Analyse du fichier tel qu'ouvert ou tel que dernièrement enregistré : base du nombre de
       * champs modifiés depuis (`FichierAc056.champsModifies`).
       */
      reference: AnalyseAc056;
    } & Omit<OuvertureReussie, 'ok'>)
  | { etat: 'echec'; cible: CibleFichierAc056; erreur: ErreurAc056 };

/**
 * Refus d'une saisie : erreur du domaine, ou `erreur-inattendue` quand le contrôle lui-même a levé une
 * exception (message générique : le texte de l'exception pourrait citer une valeur du fichier).
 */
export interface ErreurSaisie {
  readonly code: CodeErreurSaisie | 'erreur-inattendue' | 'enregistrement-en-cours';
  readonly message: string;
}

/**
 * Résultat du dernier enregistrement. Une réussite (`enregistre`, `enregistre-avec-erreurs`,
 * `a-jour`) s'affiche jusqu'à la saisie suivante, au prochain enregistrement ou au changement de
 * fichier. Un échec (`echec` : refus du main, fichier inchangé ; `interrompu` : l'appel a échoué, on
 * ignore si le fichier a été écrit) reste affiché jusqu'au prochain enregistrement ou au changement
 * de fichier seulement : une saisie ne doit pas faire disparaître « Réessayer » sous le pointeur.
 */
export type RetourEnregistrement =
  | { type: 'enregistre' }
  | { type: 'enregistre-avec-erreurs'; erreurs: number }
  | { type: 'a-jour' }
  | { type: 'echec'; message: string }
  | { type: 'interrompu'; message: string };

function estEchec(retour: RetourEnregistrement | null): boolean {
  return retour?.type === 'echec' || retour?.type === 'interrompu';
}

export interface FichierAc056 {
  fichier: EtatFichierAc056;
  /** Charge le fichier ; sans effet pendant un chargement ou un enregistrement. */
  ouvrir: (cible: CibleFichierAc056) => void;
  /** Revient au choix du fichier ; sans effet pendant un chargement ou un enregistrement. */
  fermer: () => void;
  /** Recharge le fichier dont le chargement a échoué. */
  reessayer: () => void;
  /**
   * Applique la saisie d'un champ du fichier ouvert (sortie du champ), en mémoire. Renvoie l'erreur
   * si la saisie est refusée ou échoue (le fichier reste alors inchangé), `null` sinon. `index` est
   * celui du fichier d'où part la saisie : si ce n'est plus celui du fichier ouvert (la saisie
   * arrive après un changement de fichier), elle est ignorée, jamais appliquée à un autre fichier.
   * Pendant un enregistrement, la saisie est refusée (`enregistrement-en-cours`) : l'écran est alors
   * inactif, mais une frappe en cours ne doit pas disparaître sans un mot.
   */
  saisir: (cible: CibleChamp, texte: string, index: IndexLignesAc056) => ErreurSaisie | null;
  /**
   * Enregistre les corrections du fichier ouvert. Lit l'état courant au moment de l'appel (une
   * correction appliquée juste avant, au relâchement du pointeur, est incluse). Sans effet si le
   * fichier n'est pas ouvert, si c'est un rejet, si sa structure est incorrecte ou si une opération
   * est en cours. Un échec laisse l'état inchangé (`retour` en rend compte).
   */
  enregistrer: () => Promise<void>;
  /** Enregistrement en cours. */
  enregistrement: boolean;
  /** Résultat du dernier enregistrement ; `null` quand il n'y a rien à afficher. */
  retour: RetourEnregistrement | null;
  /**
   * Nombre de champs modifiés depuis l'ouverture ou le dernier enregistrement ; 0 si le fichier
   * n'est pas modifié.
   */
  champsModifies: number;
}

/**
 * Message affiché quand l'appel IPC lui-même échoue. Générique : le texte de l'exception pourrait
 * citer un chemin ou un extrait du fichier.
 */
export const MESSAGE_ECHEC_OUVERTURE = 'erreur inattendue à la lecture du fichier';

/** Même principe pour l'enregistrement. */
export const MESSAGE_ECHEC_ENREGISTREMENT = "erreur inattendue à l'enregistrement du fichier";

/** Affiché sous le champ quand le contrôle de la saisie lève une exception. */
export const MESSAGE_SAISIE_INATTENDUE = 'Saisie non appliquée : erreur inattendue.';

/** Affiché sous le champ quand une saisie arrive pendant l'enregistrement. */
export const MESSAGE_SAISIE_PENDANT_ENREGISTREMENT =
  'Saisie non appliquée : enregistrement en cours.';

const ERREUR_SAISIE_INATTENDUE: ErreurSaisie = Object.freeze({
  code: 'erreur-inattendue',
  message: MESSAGE_SAISIE_INATTENDUE,
});

const ERREUR_SAISIE_PENDANT_ENREGISTREMENT: ErreurSaisie = Object.freeze({
  code: 'enregistrement-en-cours',
  message: MESSAGE_SAISIE_PENDANT_ENREGISTREMENT,
});

const AUCUN: EtatFichierAc056 = Object.freeze({ etat: 'aucun' });

/**
 * Nombre de corrections de `analyse` absentes de `reference` ou de texte différent : les saisies
 * non enregistrées depuis cette référence (le `compterChampsModifies` du domaine compte, lui, tous les
 * champs corrigés d'un fichier).
 */
function compterSaisiesNonEnregistrees(analyse: AnalyseAc056, reference: AnalyseAc056): number {
  const connues = new Map<string, string>();
  for (const c of correctionsAc056(reference.fichier))
    connues.set(`${c.ligne}:${c.champ}`, c.texte);
  let nombre = 0;
  for (const c of correctionsAc056(analyse.fichier)) {
    if (connues.get(`${c.ligne}:${c.champ}`) !== c.texte) nombre += 1;
  }
  return nombre;
}

/**
 * Fichier ouvert dans l'écran AC056. L'analyse reçue (fichier, anomalies, compteurs) est gardée en
 * mémoire pour la navigation et le contrôle, avec l'index des lignes (hiérarchie, rattachements),
 * construit à la réception puis à chaque enregistrement (les numéros de ligne changent quand des
 * lignes vides sont supprimées) : la hiérarchie ne change pas quand un champ est modifié.
 * Le main trace le chargement et l'enregistrement au journal : le hook n'écrit rien. Il signale au
 * main le fichier aux corrections non enregistrées (confirmation à la fermeture de la fenêtre).
 */
export function useFichierAc056(): FichierAc056 {
  const [fichier, setFichier] = useState<EtatFichierAc056>({ etat: 'aucun' });
  const [enregistrement, setEnregistrement] = useState(false);
  const [retour, setRetour] = useState<RetourEnregistrement | null>(null);
  // Verrou synchrone (chargement ou enregistrement) : deux clics dans le même rendu ne doivent pas
  // lancer deux opérations, et rien ne change le fichier pendant que le main l'écrit.
  const occupe = useRef(false);
  const monte = useRef(true);
  // Dernier état demandé, lu tout de suite par `saisir`, `reessayer` et `enregistrer` : plusieurs
  // appels dans le même rendu partent de l'état à jour. Toute modification passe par `appliquer`,
  // qui met à jour la référence et l'état React ensemble : elles ne divergent jamais.
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

  // Fichier aux corrections non enregistrées, signalé au main ; `null` au démontage.
  const emplacementModifie =
    fichier.etat === 'ouvert' && fichier.modifie ? fichier.emplacement : null;
  const nomModifie = fichier.etat === 'ouvert' && fichier.modifie ? fichier.nom : null;
  useEffect(() => {
    signalerModificationsAc056(
      emplacementModifie !== null && nomModifie !== null
        ? { emplacement: emplacementModifie, nom: nomModifie }
        : null,
    );
  }, [emplacementModifie, nomModifie]);
  useEffect(() => () => signalerModificationsAc056(null), []);

  const ouvrir = useCallback(
    (cible: CibleFichierAc056) => {
      if (occupe.current) return;
      occupe.current = true;
      const demande = { emplacement: cible.emplacement, nom: cible.nom };
      setRetour(null);
      appliquer({ etat: 'chargement', cible: demande });

      void (async () => {
        let suivant: EtatFichierAc056;
        try {
          const resultat = await ouvrirFichierAc056(demande);
          if (resultat.ok) {
            const { emplacement, nom, provenance, analyse, empreinte } = resultat;
            const index = indexerLignes(analyse.fichier);
            suivant = {
              etat: 'ouvert',
              emplacement,
              nom,
              provenance,
              analyse,
              empreinte,
              index,
              modifie: false,
              reference: analyse,
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
    setRetour(null);
    appliquer(AUCUN);
  }, [appliquer]);

  const reessayer = useCallback(() => {
    const actuel = courant.current;
    if (actuel.etat === 'echec') ouvrir(actuel.cible);
  }, [ouvrir]);

  const saisir = useCallback(
    (cible: CibleChamp, texte: string, index: IndexLignesAc056): ErreurSaisie | null => {
      const actuel = courant.current;
      if (actuel.etat !== 'ouvert') return null;
      if (index !== actuel.index) return null;
      // Fichier ouvert et verrou pris : c'est un enregistrement (le chargement n'a pas de fichier ouvert)
      if (occupe.current) return ERREUR_SAISIE_PENDANT_ENREGISTREMENT;
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
        // Lu tout de suite : deux sorties de champ dans le même rendu partent de l'analyse à jour
        // Un échec d'enregistrement reste affiché (« Réessayer » ne doit pas disparaître sous le pointeur)
        setRetour((precedent) => (estEchec(precedent) ? precedent : null));
        appliquer({ ...actuel, analyse: resultat.analyse, modifie: true });
      }
      return null;
    },
    [appliquer],
  );

  const enregistrer = useCallback(async () => {
    const actuel = courant.current;
    if (actuel.etat !== 'ouvert' || actuel.provenance !== 'veos') return;
    if (actuel.analyse.structure > 0 || occupe.current) return;
    occupe.current = true;
    setRetour(null);
    setEnregistrement(true);

    let suivantRetour: RetourEnregistrement;
    let suivant: EtatFichierAc056 | null = null;
    let resultat: Awaited<ReturnType<typeof enregistrerFichierAc056>> | null = null;
    try {
      resultat = await enregistrerFichierAc056({
        emplacement: actuel.emplacement,
        nom: actuel.nom,
        empreinte: actuel.empreinte,
        corrections: correctionsAc056(actuel.analyse.fichier),
      });
    } catch {
      // Jamais le texte de l'exception. On ignore si le main a écrit le fichier avant l'échec.
      resultat = null;
    }

    if (resultat === null) {
      suivantRetour = { type: 'interrompu', message: MESSAGE_ECHEC_ENREGISTREMENT };
    } else if (!resultat.ok) {
      suivantRetour = { type: 'echec', message: resultat.erreur.message };
    } else {
      const { analyse, empreinte, ecrit } = resultat;
      // Hors du `try` de l'appel : une exception locale ici ne dit pas que le fichier est intact
      // (le main a écrit), elle est rendue comme un enregistrement interrompu.
      let index: IndexLignesAc056 | null = null;
      try {
        index = indexerLignes(analyse.fichier);
      } catch {
        index = null;
      }
      if (index === null) {
        suivantRetour = { type: 'interrompu', message: MESSAGE_ECHEC_ENREGISTREMENT };
      } else {
        suivant = { ...actuel, analyse, empreinte, index, modifie: false, reference: analyse };
        if (!ecrit) suivantRetour = { type: 'a-jour' };
        else if (analyse.erreurs > 0) {
          suivantRetour = { type: 'enregistre-avec-erreurs', erreurs: analyse.erreurs };
        } else suivantRetour = { type: 'enregistre' };
      }
    }
    occupe.current = false;
    if (!monte.current) return;
    setEnregistrement(false);
    setRetour(suivantRetour);
    if (suivant) appliquer(suivant);
  }, [appliquer]);

  const modifie = fichier.etat === 'ouvert' && fichier.modifie;
  const analyseOuverte = fichier.etat === 'ouvert' ? fichier.analyse : null;
  const referenceOuverte = fichier.etat === 'ouvert' ? fichier.reference : null;
  const champsModifies = useMemo(
    () =>
      modifie && analyseOuverte && referenceOuverte
        ? compterSaisiesNonEnregistrees(analyseOuverte, referenceOuverte)
        : 0,
    [modifie, analyseOuverte, referenceOuverte],
  );

  return {
    fichier,
    ouvrir,
    fermer,
    reessayer,
    saisir,
    enregistrer,
    enregistrement,
    retour,
    champsModifies,
  };
}
