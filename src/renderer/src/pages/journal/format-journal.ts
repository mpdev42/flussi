import type { LigneJournal, SessionJournal } from '@shared/types';

import { formaterDate } from '@/lib/dates';

export interface MoisJournal {
  /** `01` à `12`, comme le dossier du journal. */
  valeur: string;
  /** Libellé du bouton. */
  court: string;
  /** Nom en toutes lettres, en minuscules. */
  long: string;
}

export const MOIS_JOURNAL: MoisJournal[] = [
  { valeur: '01', court: 'Janv.', long: 'janvier' },
  { valeur: '02', court: 'Févr.', long: 'février' },
  { valeur: '03', court: 'Mars', long: 'mars' },
  { valeur: '04', court: 'Avr.', long: 'avril' },
  { valeur: '05', court: 'Mai', long: 'mai' },
  { valeur: '06', court: 'Juin', long: 'juin' },
  { valeur: '07', court: 'Juil.', long: 'juillet' },
  { valeur: '08', court: 'Août', long: 'août' },
  { valeur: '09', court: 'Sept.', long: 'septembre' },
  { valeur: '10', court: 'Oct.', long: 'octobre' },
  { valeur: '11', court: 'Nov.', long: 'novembre' },
  { valeur: '12', court: 'Déc.', long: 'décembre' },
];

/** Nom du mois en toutes lettres et en minuscules (`10` → `octobre`) ; le code reçu si inconnu. */
export function nomMois(mois: string): string {
  return MOIS_JOURNAL.find((m) => m.valeur === mois)?.long ?? mois;
}

/** `('2026', '10')` → `octobre 2026`. */
export function periodeEnLettres(annee: string, mois: string): string {
  return `${nomMois(mois)} ${annee}`;
}

/** `octobre` → `Octobre` (nom accessible des boutons de mois). */
export function mettreMajuscule(texte: string): string {
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

/** `Session du 14/10/2026 à 09:15:00` */
export function titreSession(session: SessionJournal): string {
  return `Session du ${formaterDate(session.date)} à ${session.heure}`;
}

export const MESSAGE_FIN_DE_SESSION = 'Fin de session';

/** `true` si une ligne conforme porte le message « Fin de session ». */
export function contientFinDeSession(lignes: LigneJournal[]): boolean {
  return lignes.some((ligne) => ligne.niveau !== null && ligne.message === MESSAGE_FIN_DE_SESSION);
}
