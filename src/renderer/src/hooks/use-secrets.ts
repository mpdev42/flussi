import { useCallback, useEffect, useRef, useState } from 'react';
import { DESIGNATIONS_SECRET, SECRETS_TECHNIQUES } from '@shared/schemas/parametres';
import type {
  DemandeEnregistrementSecrets,
  EtatSecrets,
  MotDePasseTechnique,
  SecretTechnique,
} from '@shared/types';

import {
  abandonnerCle,
  enregistrerSecrets,
  lireEtatSecrets,
  preparerCle,
} from '@/services/parametres';

export type RetourSecrets = { ton: 'succes' | 'info' | 'erreur'; message: string };

export interface Secrets {
  /** `null` pendant le chargement. */
  etat: EtatSecrets | null;
  /** Message de l'échec de lecture de l'état, ou `null`. */
  erreurChargement: string | null;
  /** Vrai quand les champs de saisie sont ouverts (« Modifier les secrets » cliqué). */
  deverrouille: boolean;
  /** Libellé du format de la clé préparée (« PPK version 2 »), ou `null`. */
  clePrete: string | null;
  /** Motif du dernier refus de clé, ou `null`. */
  refusCle: string | null;
  /** Action en cours : une seule à la fois. */
  enCours: 'cle' | 'enregistrement' | null;
  retour: RetourSecrets | null;
  deverrouiller: () => void;
  /** Reverrouille sans rien enregistrer ; oublie la clé préparée côté main. */
  annuler: () => void;
  choisirCle: () => void;
  /** Résout `true` si enregistré (le formulaire vide alors ses champs). Ne garde jamais les valeurs. */
  enregistrer: (motsDePasse: Partial<Record<MotDePasseTechnique, string>>) => Promise<boolean>;
}

export const MESSAGE_ECHEC_CLE = "La clé n'a pas pu être contrôlée.";
export const MESSAGE_ECHEC_ENREGISTREMENT = "Les secrets n'ont pas pu être enregistrés.";
export const MESSAGE_ENREGISTREMENT_ANNULE =
  'Enregistrement annulé : la fenêtre Windows a été fermée sans validation.';

/**
 * Secrets techniques : statuts et enregistrement groupé. La valeur d'un mot de passe ne fait que
 * passer (paramètre de `enregistrer`) : elle n'est jamais mise dans l'état du hook, et le message
 * d'un rejet IPC, qui pourrait la citer, n'est jamais affiché.
 */
export function useSecrets(): Secrets {
  const [etat, setEtat] = useState<EtatSecrets | null>(null);
  const [erreurChargement, setErreurChargement] = useState<string | null>(null);
  const [deverrouille, setDeverrouille] = useState(false);
  const [clePrete, setClePrete] = useState<string | null>(null);
  const [refusCle, setRefusCle] = useState<string | null>(null);
  const [enCours, setEnCours] = useState<'cle' | 'enregistrement' | null>(null);
  const [retour, setRetour] = useState<RetourSecrets | null>(null);
  // Verrou synchrone : deux actions dans le même rendu ne doivent pas partir ensemble
  const occupe = useRef(false);
  const monte = useRef(true);

  useEffect(() => {
    monte.current = true;
    lireEtatSecrets()
      .then((lu) => {
        if (monte.current) setEtat(lu);
      })
      .catch((cause: unknown) => {
        if (monte.current) {
          setErreurChargement(cause instanceof Error ? cause.message : String(cause));
        }
      });
    return () => {
      monte.current = false;
    };
  }, []);

  const deverrouiller = useCallback(() => {
    if (occupe.current) return;
    setDeverrouille(true);
    setRetour(null);
  }, []);

  const annuler = useCallback(() => {
    if (occupe.current) return;
    // Aucun résultat utile : une erreur d'oubli côté main est sans conséquence pour l'écran
    abandonnerCle().catch(() => undefined);
    setDeverrouille(false);
    setClePrete(null);
    setRefusCle(null);
    setRetour(null);
  }, []);

  const choisirCle = useCallback(() => {
    if (occupe.current) return;
    occupe.current = true;
    setEnCours('cle');

    void (async () => {
      let format: string | null = null;
      let refus: string | null = null;
      let rejet = false;
      try {
        const resultat = await preparerCle();
        if (resultat.statut === 'preparee') format = resultat.format;
        else if (resultat.statut === 'refuse') refus = resultat.message;
      } catch {
        // Message générique : celui du rejet pourrait citer le fichier
        rejet = true;
      }

      occupe.current = false;
      if (!monte.current) return;
      setEnCours(null);
      if (format !== null) {
        setClePrete(format);
        setRefusCle(null);
      } else if (refus !== null) {
        setRefusCle(refus);
      } else if (rejet) {
        setRefusCle(MESSAGE_ECHEC_CLE);
      }
    })();
  }, []);

  const enregistrer = useCallback(
    async (motsDePasse: Partial<Record<MotDePasseTechnique, string>>): Promise<boolean> => {
      if (occupe.current) return false;

      const retenus: Partial<Record<MotDePasseTechnique, string>> = {};
      for (const [cle, valeur] of Object.entries(motsDePasse) as [MotDePasseTechnique, string][]) {
        if (valeur !== '') retenus[cle] = valeur;
      }
      const demande: DemandeEnregistrementSecrets = {
        motsDePasse: retenus,
        cle: clePrete !== null,
      };
      if (!demande.cle && Object.keys(retenus).length === 0) return false;
      const modifies: SecretTechnique[] = SECRETS_TECHNIQUES.filter((secret) =>
        secret === 'msp-sftp-cle-privee' ? demande.cle : retenus[secret] !== undefined,
      );

      occupe.current = true;
      setEnCours('enregistrement');
      setRetour(null);

      let nouvelEtat: EtatSecrets | null = null;
      let nouveauRetour: RetourSecrets;
      try {
        const resultat = await enregistrerSecrets(demande);
        if (resultat.statut === 'enregistre') {
          nouvelEtat = resultat.etat;
          nouveauRetour = {
            ton: 'succes',
            message: `Secrets enregistrés : ${modifies.map((s) => DESIGNATIONS_SECRET[s]).join(', ')}.`,
          };
        } else if (resultat.statut === 'annule') {
          nouveauRetour = { ton: 'info', message: MESSAGE_ENREGISTREMENT_ANNULE };
        } else {
          nouveauRetour = { ton: 'erreur', message: resultat.message };
        }
      } catch {
        // Message générique : celui du rejet pourrait citer une valeur
        nouveauRetour = { ton: 'erreur', message: MESSAGE_ECHEC_ENREGISTREMENT };
      }

      occupe.current = false;
      if (monte.current) {
        setEnCours(null);
        setRetour(nouveauRetour);
        if (nouvelEtat) {
          setEtat(nouvelEtat);
          setDeverrouille(false);
          setClePrete(null);
          setRefusCle(null);
        }
      }
      return nouvelEtat !== null;
    },
    [clePrete],
  );

  return {
    etat,
    erreurChargement,
    deverrouille,
    clePrete,
    refusCle,
    enCours,
    retour,
    deverrouiller,
    annuler,
    choisirCle,
    enregistrer,
  };
}
