// Fermeture de la fenêtre principale. Le module ne dépend pas d'Electron : la fenêtre est réduite
// à ce qu'il utilise, et toute boîte système (confirmation, journal) est une dépendance obligatoire,
// sans valeur par défaut, branchée seulement dans `src/main/index.ts`.

/** Fenêtre réduite à ce que la fermeture utilise (compatible `BrowserWindow`). */
export interface FenetreFermable {
  on(evenement: 'close', ecouteur: (event: { preventDefault(): void }) => void): unknown;
  isDestroyed(): boolean;
  close(): void;
  /** Fenêtre inactive : plus aucun clic ni touche ne l'atteint. */
  setEnabled(actif: boolean): void;
}

export interface DependancesFermeture {
  /** Résolue quand l'enregistrement du fichier AC056 en cours (s'il y en a un) est terminé. */
  attendreEnregistrement: () => Promise<void>;
  /** Nom du fichier AC056 dont les corrections ne sont pas enregistrées, sinon `null`. */
  fichierModifie: () => string | null;
  /** Boîte « Abandonner les modifications ? » ; `true` si l'utilisateur quitte quand même. */
  confirmerAbandon: (nom: string) => Promise<boolean>;
  /** Écrit « Fin de session » (boîte « Réessayer / Quitter quand même » en cas d'échec). */
  terminerSession: () => Promise<void>;
}

/**
 * Fermeture suspendue le temps de : attendre l'enregistrement en cours, demander confirmation si un
 * fichier a des corrections non enregistrées (« Annuler » garde la fenêtre ouverte), puis écrire
 * « Fin de session ». Une fois la fermeture confirmée, la fenêtre est désactivée : aucun
 * enregistrement ne démarre après « Fin de session ». Un enregistrement déjà parti est attendu
 * juste avant la fermeture réelle. Une seule séquence à la fois. Une erreur inattendue est
 * journalisée en console et n'empêche jamais la fermeture.
 */
export function brancherFermeture(
  fenetre: FenetreFermable,
  {
    attendreEnregistrement,
    fichierModifie,
    confirmerAbandon,
    terminerSession,
  }: DependancesFermeture,
): void {
  let fermetureAutorisee = false;
  let sequenceEnCours = false;

  async function attendreSansEchec(): Promise<void> {
    try {
      await attendreEnregistrement();
    } catch (erreur) {
      console.error("[main] Erreur en attendant l'enregistrement à la fermeture :", erreur);
    }
  }

  /** Appelée avant « Fin de session » puis avant la fermeture : la boîte du journal peut réactiver la fenêtre. */
  function desactiverFenetre(): void {
    try {
      if (!fenetre.isDestroyed()) fenetre.setEnabled(false);
    } catch (erreur) {
      console.error('[main] Erreur à la désactivation de la fenêtre à la fermeture :', erreur);
    }
  }

  async function confirmerFermeture(): Promise<boolean> {
    await attendreSansEchec();

    let nom: string | null = null;
    try {
      nom = fichierModifie();
    } catch (erreur) {
      console.error('[main] Erreur à la lecture des modifications à la fermeture :', erreur);
    }
    if (nom === null) return true;

    try {
      return await confirmerAbandon(nom);
    } catch (erreur) {
      console.error('[main] Erreur à la confirmation de fermeture :', erreur);
      return true;
    }
  }

  fenetre.on('close', (event) => {
    if (fermetureAutorisee) return;
    event.preventDefault();
    if (sequenceEnCours) return;
    sequenceEnCours = true;

    void (async () => {
      if (!(await confirmerFermeture())) {
        // La fenêtre reste ouverte : une fermeture ultérieure redemande
        sequenceEnCours = false;
        return;
      }
      // Fermeture confirmée : plus aucun enregistrement ne doit démarrer après « Fin de session »
      desactiverFenetre();
      try {
        await terminerSession();
      } catch (erreur) {
        console.error('[main] Erreur à la fermeture du journal :', erreur);
      }
      // Une boîte du journal a pu réactiver la fenêtre, un appel déjà parti a pu démarrer entre-temps
      desactiverFenetre();
      await attendreSansEchec();
      fermetureAutorisee = true;
      if (!fenetre.isDestroyed()) fenetre.close();
    })();
  });
}
