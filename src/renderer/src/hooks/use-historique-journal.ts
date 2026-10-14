import { useCallback, useState } from 'react';
import type { SessionJournal } from '@shared/types';

import { useChargementStockage } from '@/hooks/use-chargement-stockage';
import { lireAnnees, lireSessions } from '@/services/journal';

export interface PeriodeJournal {
  /** `AAAA` */
  annee: string;
  /** `01` à `12` */
  mois: string;
}

/** Année et mois en cours, à l'horloge locale. */
export function periodeCourante(maintenant: Date = new Date()): PeriodeJournal {
  return {
    annee: String(maintenant.getFullYear()),
    mois: String(maintenant.getMonth() + 1).padStart(2, '0'),
  };
}

/** Années du journal et année en cours, sans doublon, de la plus ancienne à la plus récente. */
export function fusionnerAnnees(anneesJournal: string[], anneeCourante: string): string[] {
  return [...new Set([...anneesJournal, anneeCourante])].sort();
}

export interface HistoriqueJournal {
  /** Années proposées : dossiers du journal et année en cours. */
  annees: string[];
  annee: string;
  mois: string;
  /** `null` tant que le mois n'est pas chargé ou en cas d'erreur. */
  sessions: SessionJournal[] | null;
  chargement: boolean;
  /** Cause lisible de l'échec de lecture des années ou du mois. */
  erreur: string | null;
  choisirAnnee: (annee: string) => void;
  choisirMois: (mois: string) => void;
  recharger: () => void;
}

/** Historique du journal : mois sélectionné (le mois en cours au départ) et ses sessions. */
export function useHistoriqueJournal(): HistoriqueJournal {
  const [courante] = useState(() => periodeCourante());
  const [periode, setPeriode] = useState<PeriodeJournal>(courante);
  const anneesJournal = useChargementStockage('annees', lireAnnees);
  const sessions = useChargementStockage(`${periode.annee}/${periode.mois}`, () =>
    lireSessions(periode.annee, periode.mois),
  );
  const rechargerAnnees = anneesJournal.recharger;
  const rechargerSessions = sessions.recharger;

  const choisirAnnee = useCallback((annee: string) => setPeriode((p) => ({ ...p, annee })), []);
  const choisirMois = useCallback((mois: string) => setPeriode((p) => ({ ...p, mois })), []);
  const recharger = useCallback(() => {
    rechargerAnnees();
    rechargerSessions();
  }, [rechargerAnnees, rechargerSessions]);

  return {
    annees: fusionnerAnnees(anneesJournal.valeur ?? [], courante.annee),
    annee: periode.annee,
    mois: periode.mois,
    sessions: sessions.valeur,
    chargement: sessions.chargement,
    erreur: sessions.erreur ?? anneesJournal.erreur,
    choisirAnnee,
    choisirMois,
    recharger,
  };
}
