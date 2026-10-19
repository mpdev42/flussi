// Types du module Ac056 qui traversent l'IPC. Aucun chemin Windows ici : l'écran ne connaît qu'un
// emplacement logique et un nom de fichier.

import type { AnalyseAc056, Provenance } from '../domain/ac056';
import type { EmplacementAc056 } from '../schemas/ac056';
import type { CodeErreurStockage } from './stockage';

export type { EmplacementAc056 };

/** Fichier proposé dans la liste de l'écran. */
export interface FichierListeAc056 {
  emplacement: EmplacementAc056;
  /** Nom seul, avec l'extension. */
  nom: string;
  /** Taille en octets ; `null` si elle n'a pas pu être lue. */
  taille: number | null;
  /** Dernière modification, ISO 8601 (UTC) ; `null` si elle n'a pas pu être lue. */
  modification: string | null;
  /** `rejet` d'après le préfixe du nom (`AC056COUR_REJ_`), sinon `veos`. */
  provenance: Provenance;
}

/**
 * Erreur d'accès aux fichiers, sans le chemin absolu de `ErreurStockage` : le message est un texte
 * fixe, fabriqué d'après le code, qui ne cite ni dossier ni lecteur.
 */
export interface ErreurAc056 {
  code: CodeErreurStockage;
  message: string;
}

/** Contenu de `IN` et de `OUT` (fichiers `.txt` seulement), du plus récent au plus ancien. */
export type ListeAc056 =
  | { ok: true; in: FichierListeAc056[]; out: FichierListeAc056[] }
  | { ok: false; erreur: ErreurAc056 };

/** Fichier lu et analysé par le domaine (lecture et contrôle faits dans le main). */
export type OuvertureAc056 =
  | {
      ok: true;
      emplacement: EmplacementAc056;
      nom: string;
      provenance: Provenance;
      analyse: AnalyseAc056;
    }
  | { ok: false; erreur: ErreurAc056 };
