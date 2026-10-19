// Types de l'adapter `stockage` qui traversent l'IPC (résultats de l'historique du journal).
// Aucun chemin Windows ici : les services ne passent qu'un emplacement logique et un nom relatif.

/** Emplacement logique d'un dossier de travail. */
export type Emplacement = 'in' | 'out' | 'journal';

export interface ElementStockage {
  /** Nom seul, sans le dossier parent. */
  nom: string;
  type: 'fichier' | 'dossier';
  /**
   * Copie de conflit OneDrive probable (`nom-NOMPOSTE.ext`, `nom-NOMPOSTE-2.ext` à côté de
   * `nom.ext`). Toujours `false` pour un dossier. Rien n'est supprimé ni fusionné : le service
   * puis l'écran décident.
   */
  copieConflitProbable: boolean;
  /**
   * Taille en octets. `null` pour un dossier, pour un fichier dont le `stat` a échoué (une
   * information manquante ne fait pas échouer toute la liste), et quand `lister` n'a pas reçu
   * l'option `avecInfos`.
   */
  taille: number | null;
  /** Dernière modification, ISO 8601 (UTC). `null` dans les mêmes cas que `taille`. */
  modification: string | null;
}

export type CodeErreurStockage =
  | 'lecteur-indisponible'
  | 'dossier-absent'
  | 'acces-refuse'
  | 'verrou'
  | 'introuvable'
  | 'chemin-refuse'
  | 'erreur-systeme';

/** Jamais le contenu d'un fichier, ni dans le message ni ailleurs. */
export interface ErreurStockage {
  code: CodeErreurStockage;
  emplacement: Emplacement;
  /**
   * Chemin absolu visé quand il est construit. Racine de l'emplacement pour `dossier-absent`,
   * `lecteur-indisponible` et `chemin-refuse`.
   */
  chemin: string;
  /** Cause probable, en français, lisible par l'utilisateur. */
  message: string;
}

export type ResultatStockage<T> = { ok: true; valeur: T } | { ok: false; erreur: ErreurStockage };
