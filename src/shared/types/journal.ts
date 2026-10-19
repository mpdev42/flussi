// Types du module Journal qui traversent l'IPC.

import type { NiveauJournal } from '../schemas/journal';

export interface SessionJournal {
  /** `AAAA/MM/nom.txt` : identifiant opaque pour l'écran, repassé tel quel à `journal:lire`. */
  chemin: string;
  /** `AAAA-MM-JJ` */
  date: string;
  /** `HH:MM:SS` */
  heure: string;
  compte: string;
  /** Session de ce lancement de Flussi. */
  enCours: boolean;
  /** Copie de conflit OneDrive probable. */
  copieConflitProbable: boolean;
}

export interface LigneJournal {
  /** `null` : ligne non conforme au format. */
  heure: string | null;
  /** `null` : ligne non conforme au format. */
  niveau: NiveauJournal | null;
  /** Ligne brute entière si elle n'est pas conforme. */
  message: string;
}

/** Ligne de la session en cours, telle qu'affichée dans le panneau du journal. */
export interface LigneJournalSession {
  /** Rang dans la session, à partir de 1 : sert à fusionner la lecture initiale et les lignes poussées. */
  rang: number;
  /** `HH:MM:SS`, la même heure que celle écrite dans le fichier. */
  heure: string;
  niveau: NiveauJournal;
  message: string;
}

export interface EtatJournal {
  /** `false` tant que des lignes restent en mémoire faute d'avoir pu être écrites. */
  enregistre: boolean;
  lignesEnAttente: number;
}
