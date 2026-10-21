import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { brancherFermeture, type DependancesFermeture, type FenetreFermable } from './fermeture';

// Faux BrowserWindow minimal : aucun Electron réel, aucune boîte système.

function creerFenetre() {
  let ecouteur: ((event: { preventDefault(): void }) => void) | null = null;
  let detruite = false;
  let active = true;
  const activations: boolean[] = [];
  const fenetre: FenetreFermable = {
    on: (_evenement, fn) => {
      ecouteur = fn;
    },
    isDestroyed: () => detruite,
    setEnabled: vi.fn((actif: boolean) => {
      active = actif;
      activations.push(actif);
    }),
    close: vi.fn(() => {
      // Comme Electron : `close` émet l'évènement, qui laisse passer si la fermeture est autorisée
      const empeche = emettreClose();
      if (!empeche) detruite = true;
    }),
  };

  function emettreClose(): boolean {
    let empeche = false;
    ecouteur?.({
      preventDefault: () => {
        empeche = true;
      },
    });
    return empeche;
  }

  return {
    fenetre,
    /** Action de l'utilisateur : `true` si la fermeture a été suspendue. */
    demanderFermeture: emettreClose,
    estDetruite: () => detruite,
    estActive: () => active,
    /** Appels successifs de `setEnabled`. */
    activations,
    /** La boîte du journal réactive la fenêtre dont elle est l'enfant (modale, puis fermée). */
    reactiver: () => {
      active = true;
    },
  };
}

/** Laisse les promesses en attente se résoudre. */
const vider = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

let ordre: string[];

function creerDependances(surcharges: Partial<DependancesFermeture> = {}): DependancesFermeture {
  return {
    attendreEnregistrement: async () => {
      ordre.push('attente');
    },
    fichierModifie: () => null,
    confirmerAbandon: async (nom) => {
      ordre.push(`confirmation ${nom}`);
      return true;
    },
    terminerSession: async () => {
      ordre.push('terminerSession');
    },
    ...surcharges,
  };
}

beforeEach(() => {
  ordre = [];
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('brancherFermeture', () => {
  it('sans fichier modifié : aucune boîte, journal terminé puis fermeture', async () => {
    const { fenetre, demanderFermeture, estDetruite } = creerFenetre();
    const confirmerAbandon = vi.fn(async () => true);
    brancherFermeture(fenetre, creerDependances({ confirmerAbandon }));

    expect(demanderFermeture()).toBe(true);
    await vider();

    expect(confirmerAbandon).not.toHaveBeenCalled();
    // Dernière attente juste avant la fermeture réelle
    expect(ordre).toEqual(['attente', 'terminerSession', 'attente']);
    expect(estDetruite()).toBe(true);
  });

  it('demande la confirmation avant terminerSession quand un fichier est modifié', async () => {
    const { fenetre, demanderFermeture, estDetruite } = creerFenetre();
    brancherFermeture(fenetre, creerDependances({ fichierModifie: () => 'AC056COUR.txt' }));

    demanderFermeture();
    await vider();

    expect(ordre).toEqual(['attente', 'confirmation AC056COUR.txt', 'terminerSession', 'attente']);
    expect(estDetruite()).toBe(true);
  });

  it('désactive la fenêtre dès la fermeture confirmée, avant « Fin de session »', async () => {
    const { fenetre, demanderFermeture, estActive } = creerFenetre();
    brancherFermeture(
      fenetre,
      creerDependances({
        fichierModifie: () => 'AC056COUR.txt',
        confirmerAbandon: async () => {
          ordre.push(`confirmation (fenêtre ${estActive() ? 'active' : 'inactive'})`);
          return true;
        },
        terminerSession: async () => {
          ordre.push(`terminerSession (fenêtre ${estActive() ? 'active' : 'inactive'})`);
        },
      }),
    );

    demanderFermeture();
    await vider();

    // Active pendant la question (elle est modale), inactive ensuite
    expect(ordre).toEqual([
      'attente',
      'confirmation (fenêtre active)',
      'terminerSession (fenêtre inactive)',
      'attente',
    ]);
  });

  it('« Annuler » laisse la fenêtre active', async () => {
    const { fenetre, demanderFermeture, activations, estActive } = creerFenetre();
    brancherFermeture(
      fenetre,
      creerDependances({
        fichierModifie: () => 'AC056COUR.txt',
        confirmerAbandon: async () => false,
      }),
    );

    demanderFermeture();
    await vider();

    expect(activations).toEqual([]);
    expect(estActive()).toBe(true);
  });

  it('désactive de nouveau la fenêtre et rattend l’enregistrement juste avant la fermeture réelle', async () => {
    const { fenetre, demanderFermeture, estActive, estDetruite, reactiver, activations } =
      creerFenetre();
    let attentes = 0;
    let finirEnregistrement: () => void = () => undefined;
    brancherFermeture(
      fenetre,
      creerDependances({
        attendreEnregistrement: () => {
          attentes += 1;
          // Seconde attente : un enregistrement parti avant la désactivation est encore en cours
          if (attentes < 2) return Promise.resolve();
          return new Promise<void>((resolve) => {
            finirEnregistrement = resolve;
          });
        },
        terminerSession: async () => {
          // Boîte « Réessayer / Quitter quand même » : fermée, elle réactive la fenêtre
          reactiver();
        },
      }),
    );

    demanderFermeture();
    await vider();

    expect(activations).toEqual([false, false]);
    expect(estActive()).toBe(false);
    // En attente de l'enregistrement : la fenêtre n'est pas encore détruite
    expect(estDetruite()).toBe(false);

    finirEnregistrement();
    await vider();
    expect(estDetruite()).toBe(true);
  });

  it('une exception de setEnabled ne bloque pas la fermeture', async () => {
    const { fenetre, demanderFermeture, estDetruite } = creerFenetre();
    vi.mocked(fenetre.setEnabled).mockImplementation(() => {
      throw new Error('panne');
    });
    brancherFermeture(fenetre, creerDependances());

    demanderFermeture();
    await vider();

    expect(estDetruite()).toBe(true);
    expect(console.error).toHaveBeenCalled();
  });

  it('« Annuler » garde la fenêtre ouverte, sans terminer la session ; une seconde fermeture redemande', async () => {
    const { fenetre, demanderFermeture, estDetruite } = creerFenetre();
    const reponses = [false, true];
    const confirmerAbandon = vi.fn(async (nom: string) => {
      ordre.push(`confirmation ${nom}`);
      return reponses.shift() ?? true;
    });
    brancherFermeture(
      fenetre,
      creerDependances({ fichierModifie: () => 'AC056COUR.txt', confirmerAbandon }),
    );

    demanderFermeture();
    await vider();
    expect(estDetruite()).toBe(false);
    expect(ordre).not.toContain('terminerSession');
    expect(confirmerAbandon).toHaveBeenCalledTimes(1);

    demanderFermeture();
    await vider();
    expect(confirmerAbandon).toHaveBeenCalledTimes(2);
    expect(ordre.at(-2)).toBe('terminerSession');
    expect(estDetruite()).toBe(true);
  });

  it("attend l'enregistrement en cours avant de poser la question", async () => {
    const { fenetre, demanderFermeture } = creerFenetre();
    let terminer: () => void = () => undefined;
    const enregistrement = new Promise<void>((resolve) => {
      terminer = resolve;
    });
    let modifie: string | null = 'AC056COUR.txt';
    brancherFermeture(
      fenetre,
      creerDependances({
        attendreEnregistrement: () => enregistrement,
        // L'enregistrement réussi a effacé les modifications : aucune question à poser
        fichierModifie: () => modifie,
      }),
    );

    demanderFermeture();
    await vider();
    expect(ordre).toEqual([]);

    modifie = null;
    terminer();
    await vider();
    expect(ordre).toEqual(['terminerSession']);
  });

  it("pose la question si l'enregistrement a échoué (fichier encore modifié après l'attente)", async () => {
    const { fenetre, demanderFermeture } = creerFenetre();
    let terminer: () => void = () => undefined;
    const enregistrement = new Promise<void>((resolve) => {
      terminer = resolve;
    });
    brancherFermeture(
      fenetre,
      creerDependances({
        attendreEnregistrement: () => enregistrement,
        fichierModifie: () => 'AC056COUR.txt',
      }),
    );

    demanderFermeture();
    await vider();
    expect(ordre).toEqual([]);

    terminer();
    await vider();
    expect(ordre).toEqual(['confirmation AC056COUR.txt', 'terminerSession']);
  });

  it.each([
    [
      'attendreEnregistrement',
      {
        attendreEnregistrement: () => Promise.reject(new Error('panne')),
      },
    ],
    [
      'fichierModifie',
      {
        fichierModifie: (): string | null => {
          throw new Error('panne');
        },
      },
    ],
    [
      'confirmerAbandon',
      {
        fichierModifie: () => 'AC056COUR.txt',
        confirmerAbandon: () => Promise.reject(new Error('panne')),
      },
    ],
    [
      'terminerSession',
      {
        terminerSession: () => Promise.reject(new Error('panne')),
      },
    ],
  ] as [string, Partial<DependancesFermeture>][])(
    'une exception dans %s ne bloque jamais la fermeture',
    async (_nom, surcharges) => {
      const { fenetre, demanderFermeture, estDetruite } = creerFenetre();
      const terminerSession = vi.fn(surcharges.terminerSession ?? (async () => undefined));
      brancherFermeture(fenetre, creerDependances({ ...surcharges, terminerSession }));

      demanderFermeture();
      await vider();

      expect(terminerSession).toHaveBeenCalledTimes(1);
      expect(estDetruite()).toBe(true);
      expect(console.error).toHaveBeenCalled();
    },
  );

  it('une seule séquence en cas de double fermeture', async () => {
    const { fenetre, demanderFermeture, estDetruite } = creerFenetre();
    let repondre: (valeur: boolean) => void = () => undefined;
    const confirmerAbandon = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          repondre = resolve;
        }),
    );
    const terminerSession = vi.fn(async () => undefined);
    brancherFermeture(
      fenetre,
      creerDependances({
        fichierModifie: () => 'AC056COUR.txt',
        confirmerAbandon,
        terminerSession,
      }),
    );

    expect(demanderFermeture()).toBe(true);
    await vider();
    expect(demanderFermeture()).toBe(true);
    await vider();
    expect(confirmerAbandon).toHaveBeenCalledTimes(1);

    repondre(true);
    await vider();
    expect(terminerSession).toHaveBeenCalledTimes(1);
    expect(estDetruite()).toBe(true);
  });
});
