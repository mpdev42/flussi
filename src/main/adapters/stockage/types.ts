// Types de l'adapter `stockage`. Aucun chemin Windows ici : les services ne passent qu'un
// emplacement logique et un nom relatif. Une implémentation Microsoft Graph pourra remplacer
// l'implémentation disque (après la v1.0) sans toucher aux services.

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

export type ResultatVerification = { ok: true } | { ok: false; erreurs: ErreurStockage[] };

export interface Stockage {
  /**
   * Pour `in`, `out` puis `journal` : la racine existe, est un dossier et s'ouvre en lecture.
   * Aucun fichier écrit, aucun dossier créé. Les trois emplacements sont vérifiés
   * indépendamment : toutes les erreurs sont remontées d'un coup.
   */
  verifierAcces(): Promise<ResultatVerification>;

  /** Contenu d'un dossier. `sousDossier` absent ou vide : racine de l'emplacement. */
  lister(
    emplacement: Emplacement,
    sousDossier?: string,
  ): Promise<ResultatStockage<ElementStockage[]>>;

  /** Octets bruts, jamais décodés (le décodage reste au domaine). */
  lire(emplacement: Emplacement, chemin: string): Promise<ResultatStockage<Uint8Array>>;

  /**
   * Ajout seul : crée le fichier s'il n'existe pas, n'écrase jamais. Les sous-dossiers
   * intermédiaires sont créés, mais jamais la racine de l'emplacement.
   */
  ajouter(
    emplacement: Emplacement,
    chemin: string,
    octets: Uint8Array,
  ): Promise<ResultatStockage<void>>;
}

/** Résultat de `stat`, réduit à ce que l'adapter utilise. */
export interface InfosFichier {
  isFile(): boolean;
  isDirectory(): boolean;
}

/** Entrée de `readdir` avec types (compatible `fs.Dirent`). */
export interface EntreeDossier extends InfosFichier {
  name: string;
}

/**
 * Système de fichiers minimal utilisé par l'implémentation disque. Interface propre au projet,
 * facile à simuler dans les tests (nouvelles tentatives, lecteur absent…).
 */
export interface SystemeFichiers {
  stat(chemin: string): Promise<InfosFichier>;
  readdir(chemin: string): Promise<EntreeDossier[]>;
  opendir(chemin: string): Promise<{ close(): Promise<void> }>;
  readFile(chemin: string): Promise<Uint8Array>;
  appendFile(chemin: string, octets: Uint8Array): Promise<void>;
  /** Non récursif : un parent manquant donne `ENOENT`, un dossier existant `EEXIST`. */
  mkdir(chemin: string): Promise<void>;
}

export interface OptionsStockageDisque {
  /** Système de fichiers (défaut : `node:fs/promises`). */
  fs?: SystemeFichiers;
  /** Attente entre deux tentatives, en millisecondes (défaut : `setTimeout` de `node:timers/promises`). */
  attendre?: (ms: number) => Promise<void>;
}
