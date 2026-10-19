import type {
  EtatJournal,
  LigneJournal,
  LigneJournalSession,
  ResultatStockage,
  SessionJournal,
} from '@shared/types';

/** Années pour lesquelles le journal contient un dossier `AAAA`. */
export function lireAnnees(): Promise<ResultatStockage<string[]>> {
  return window.api.journal.annees();
}

/** Sessions d'un mois (`annee` sur 4 chiffres, `mois` de `01` à `12`), dans l'ordre d'affichage. */
export function lireSessions(
  annee: string,
  mois: string,
): Promise<ResultatStockage<SessionJournal[]>> {
  return window.api.journal.sessions(annee, mois);
}

/** Lignes d'une session, à partir du `chemin` renvoyé par `lireSessions`. */
export function lireSession(chemin: string): Promise<ResultatStockage<LigneJournal[]>> {
  return window.api.journal.lire(chemin);
}

/** État d'écriture du journal de la session en cours. */
export function lireEtatJournal(): Promise<EtatJournal> {
  return window.api.journal.etat();
}

/** Abonnement aux changements d'état du journal ; renvoie la fonction de désabonnement. */
export function surEtatJournal(rappel: (etat: EtatJournal) => void): () => void {
  return window.api.journal.surEtat(rappel);
}

/** Lignes de la session en cours, depuis son début. */
export function lireLignesSession(): Promise<LigneJournalSession[]> {
  return window.api.journal.lignesSession();
}

/** Abonnement aux nouvelles lignes de la session ; renvoie la fonction de désabonnement. */
export function surLigneJournal(rappel: (ligne: LigneJournalSession) => void): () => void {
  return window.api.journal.surLigne(rappel);
}
