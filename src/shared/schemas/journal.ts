import { z } from 'zod';

// Schémas du module Journal. Pur TypeScript : aucun import Node (partagé avec le renderer).

export const NIVEAUX_JOURNAL = ['TITRE', 'INFO', 'SUCCES', 'ERREUR'] as const;
export type NiveauJournal = (typeof NIVEAUX_JOURNAL)[number];

/**
 * Nom d'un fichier de session Flussi : `AAAAMMJJ-HHMMSS-{compte}.txt` (mois 01 à 12, jour 01 à 31,
 * heure 00 à 23, minutes et secondes 00 à 59). Le compte n'est pas vide et ne contient ni `/` ni
 * `\`. Un journal Lazarus `AAAAMMJJ-HHMMSS.txt` (sans compte) ne correspond pas.
 * Groupes : année, mois, jour, heure, minutes, secondes, compte.
 * Source unique : le schéma IPC et le service l'utilisent.
 */
const MOTIF_NOM_SESSION =
  '(\\d{4})(0[1-9]|1[0-2])(0[1-9]|[12]\\d|3[01])-([01]\\d|2[0-3])([0-5]\\d)([0-5]\\d)-([^/\\\\]+)\\.txt';

export const NOM_SESSION_JOURNAL = new RegExp(`^${MOTIF_NOM_SESSION}$`);

/** Chemin relatif d'une session : `AAAA/MM/nom` (barres obliques `/`). */
const CHEMIN_SESSION_JOURNAL = new RegExp(`^\\d{4}/(0[1-9]|1[0-2])/${MOTIF_NOM_SESSION}$`);

export interface NomSessionAnalyse {
  /** `AAAA-MM-JJ` */
  date: string;
  /** `HH:MM:SS` */
  heure: string;
  compte: string;
}

/** Analyse un nom de fichier de session Flussi, ou `null` s'il n'en suit pas le nommage. */
export function analyserNomSession(nom: string): NomSessionAnalyse | null {
  const m = NOM_SESSION_JOURNAL.exec(nom);
  if (!m) return null;
  const [, annee, mois, jour, heures, minutes, secondes, compte] = m;
  return {
    date: `${annee}-${mois}-${jour}`,
    heure: `${heures}:${minutes}:${secondes}`,
    compte: compte as string,
  };
}

/** Argument de `journal:sessions` : année et mois du dossier à lister. */
export const anneeMoisSchema = z.strictObject({
  annee: z.string().regex(/^\d{4}$/),
  mois: z.string().regex(/^(0[1-9]|1[0-2])$/),
});
export type AnneeMois = z.infer<typeof anneeMoisSchema>;

/** Argument de `journal:lire` : `AAAA/MM/<nom de session Flussi>`. */
export const cheminSessionSchema = z.string().regex(CHEMIN_SESSION_JOURNAL);
