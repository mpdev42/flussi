// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fenetreActive, monterHook, type MontureHook } from '@/test/dom';

import { useSortieChamp } from './sortie-champ';

type Sortir = ReturnType<typeof useSortieChamp>;

const montures: MontureHook<Sortir>[] = [];

/** Monte un « champ » (le hook seul) ; renvoie sa monture et sa fonction `sortir`. */
async function monterChamp(): Promise<{ monture: MontureHook<Sortir>; sortir: Sortir }> {
  const monture = await monterHook(() => useSortieChamp());
  montures.push(monture);
  return { monture, sortir: (appliquer) => monture.lire()(appliquer) };
}

function surDocument(type: string, init: KeyboardEventInit = {}): void {
  const evenement =
    type === 'keydown'
      ? new KeyboardEvent(type, { bubbles: true, ...init })
      : new Event(type, { bubbles: true });
  document.body.dispatchEvent(evenement);
}

const appuyer = () => surDocument('pointerdown');
const relacher = () => surDocument('pointerup');

beforeEach(() => {
  fenetreActive(true);
});

afterEach(async () => {
  // Remet le module au repos : plus de pointeur enfoncé ni d'attente
  relacher();
  for (const monture of montures.splice(0)) await monture.demonter();
});

describe('useSortieChamp — sortie au clavier ou sans pointeur', () => {
  it('applique la saisie tout de suite et indique qu’elle est prise en compte', async () => {
    const { sortir } = await monterChamp();
    const appliquer = vi.fn();

    expect(sortir(appliquer)).toBe(true);

    expect(appliquer).toHaveBeenCalledTimes(1);
  });
});

describe('useSortieChamp — sortie à la souris', () => {
  it('attend le relâchement du pointeur, puis applique une seule fois', async () => {
    const { sortir } = await monterChamp();
    const appliquer = vi.fn();

    appuyer();
    expect(sortir(appliquer)).toBe(true);
    expect(appliquer).not.toHaveBeenCalled();
    relacher();
    expect(appliquer).toHaveBeenCalledTimes(1);

    relacher();
    expect(appliquer).toHaveBeenCalledTimes(1);
  });

  it('applique aussi à l’annulation du pointeur', async () => {
    const { sortir } = await monterChamp();
    const appliquer = vi.fn();

    appuyer();
    sortir(appliquer);
    surDocument('pointercancel');

    expect(appliquer).toHaveBeenCalledTimes(1);
  });

  it('applique les saisies de plusieurs champs au même relâchement', async () => {
    const premier = await monterChamp();
    const second = await monterChamp();
    const ordre: string[] = [];

    appuyer();
    premier.sortir(() => ordre.push('premier'));
    second.sortir(() => ordre.push('second'));
    expect(ordre).toEqual([]);
    relacher();

    expect(ordre).toEqual(['premier', 'second']);
  });

  it('applique la saisie encore en attente d’un champ avant la suivante', async () => {
    const { sortir } = await monterChamp();
    const ordre: string[] = [];

    appuyer();
    sortir(() => ordre.push('première'));
    sortir(() => ordre.push('seconde'));
    expect(ordre).toEqual(['première']);
    relacher();

    expect(ordre).toEqual(['première', 'seconde']);
  });

  it('applique la saisie en attente quand le champ est démonté avant le relâchement', async () => {
    const { monture, sortir } = await monterChamp();
    const appliquer = vi.fn();

    appuyer();
    sortir(appliquer);
    await monture.demonter();
    expect(appliquer).toHaveBeenCalledTimes(1);

    relacher();
    expect(appliquer).toHaveBeenCalledTimes(1);
  });
});

describe('useSortieChamp — touche pressée pendant que le pointeur est enfoncé', () => {
  it('une touche ordinaire vaut relâchement (relâchement perdu)', async () => {
    const { sortir } = await monterChamp();
    const appliquer = vi.fn();

    appuyer();
    sortir(appliquer);
    expect(appliquer).not.toHaveBeenCalled();
    surDocument('keydown', { key: 'a' });

    expect(appliquer).toHaveBeenCalledTimes(1);
  });

  it('ignore la répétition d’une touche tenue', async () => {
    const { sortir } = await monterChamp();
    const appliquer = vi.fn();

    appuyer();
    sortir(appliquer);
    surDocument('keydown', { key: 'a', repeat: true });

    expect(appliquer).not.toHaveBeenCalled();
  });

  it.each(['Shift', 'Control', 'Alt', 'Meta', 'AltGraph', 'CapsLock'])(
    'ignore la touche de modification %s seule (Maj+clic, Ctrl+clic)',
    async (touche) => {
      const { sortir } = await monterChamp();
      const appliquer = vi.fn();

      appuyer();
      sortir(appliquer);
      surDocument('keydown', { key: touche });

      expect(appliquer).not.toHaveBeenCalled();
      relacher();
      expect(appliquer).toHaveBeenCalledTimes(1);
    },
  );
});

describe('useSortieChamp — perte de focus de la fenêtre', () => {
  it('applique les saisies en attente quand la fenêtre perd le focus (relâchement perdu)', async () => {
    const { sortir } = await monterChamp();
    const appliquer = vi.fn();

    appuyer();
    sortir(appliquer);
    window.dispatchEvent(new Event('blur'));

    expect(appliquer).toHaveBeenCalledTimes(1);
    // Le pointeur n'est plus considéré enfoncé : la sortie suivante est immédiate
    const suivante = vi.fn();
    sortir(suivante);
    expect(suivante).toHaveBeenCalledTimes(1);
  });

  it('n’applique rien et renvoie faux quand le champ perd le focus avec la fenêtre', async () => {
    const { sortir } = await monterChamp();
    const appliquer = vi.fn();

    fenetreActive(false);
    expect(sortir(appliquer)).toBe(false);
    expect(appliquer).not.toHaveBeenCalled();

    // Rien n'est resté en attente : le relâchement suivant n'applique rien
    appuyer();
    relacher();
    expect(appliquer).not.toHaveBeenCalled();
  });

  it('ne laisse pas une saisie en attente d’avant s’échapper quand la fenêtre est inactive', async () => {
    const { sortir } = await monterChamp();
    const attendue = vi.fn();
    const refusee = vi.fn();

    appuyer();
    sortir(attendue);
    fenetreActive(false);
    expect(sortir(refusee)).toBe(false);

    relacher();
    expect(attendue).toHaveBeenCalledTimes(1);
    expect(refusee).not.toHaveBeenCalled();
  });
});

describe('useSortieChamp — exception pendant une saisie', () => {
  /** Écoute les erreurs non interceptées que jsdom signale à la fenêtre. */
  function espionnerErreursFenetre() {
    const erreurs: unknown[] = [];
    const ecouteur = (evenement: ErrorEvent) => {
      evenement.preventDefault();
      erreurs.push(evenement.error);
    };
    window.addEventListener('error', ecouteur);
    return { erreurs, arreter: () => window.removeEventListener('error', ecouteur) };
  }

  it('n’interrompt pas les autres saisies en attente et ne remonte pas dans l’écouteur', async () => {
    const premier = await monterChamp();
    const second = await monterChamp();
    const appliquee = vi.fn();
    const { erreurs, arreter } = espionnerErreursFenetre();

    appuyer();
    premier.sortir(() => {
      throw new Error('saisie en échec');
    });
    second.sortir(appliquee);
    relacher();
    arreter();

    expect(appliquee).toHaveBeenCalledTimes(1);
    expect(erreurs).toEqual([]);
  });

  it('n’empêche pas le démontage du champ', async () => {
    const { monture, sortir } = await monterChamp();

    appuyer();
    sortir(() => {
      throw new Error('saisie en échec');
    });

    await expect(monture.demonter()).resolves.toBeUndefined();
  });

  it('applique tout de suite une saisie qui lève une exception sans la propager', async () => {
    const { sortir } = await monterChamp();

    expect(
      sortir(() => {
        throw new Error('saisie en échec');
      }),
    ).toBe(true);
  });

  it('reste utilisable après une exception', async () => {
    const { sortir } = await monterChamp();
    const appliquer = vi.fn();

    sortir(() => {
      throw new Error('saisie en échec');
    });
    sortir(appliquer);

    expect(appliquer).toHaveBeenCalledTimes(1);
  });
});

describe('useSortieChamp — écouteurs', () => {
  it('installe les écouteurs une seule fois, sans les retirer ni les réinstaller aux démontages', async () => {
    // Module neuf : l'installation initiale n'a pas encore eu lieu
    vi.resetModules();
    const ajout = vi.spyOn(document, 'addEventListener');
    const retrait = vi.spyOn(document, 'removeEventListener');
    const ajoutFenetre = vi.spyOn(window, 'addEventListener');
    const { useSortieChamp: useNeuf } = await import('./sortie-champ');
    const { monterHook: monterNeuf } = await import('@/test/dom');
    const typesSuivis = ['pointerdown', 'pointerup', 'pointercancel', 'keydown'];
    const ajoutsSuivis = () =>
      ajout.mock.calls.filter(([type]) => typesSuivis.includes(type)).map(([type]) => type);

    // Deux champs, puis changement de fiche : démontage et remontage
    const premier = await monterNeuf(() => useNeuf());
    const second = await monterNeuf(() => useNeuf());
    await premier.demonter();
    await second.demonter();
    const troisieme = await monterNeuf(() => useNeuf());
    await troisieme.demonter();

    expect([...ajoutsSuivis()].sort()).toEqual([...typesSuivis].sort());
    // Même sémantique qu'avant : en capture
    const captures = ajout.mock.calls
      .filter(([type]) => typesSuivis.includes(type))
      .map(([, , options]) => options);
    expect(captures).toEqual([true, true, true, true]);
    expect(retrait.mock.calls.filter(([type]) => typesSuivis.includes(type))).toHaveLength(0);
    expect(ajoutFenetre.mock.calls.filter(([type]) => type === 'blur')).toHaveLength(1);

    ajout.mockRestore();
    retrait.mockRestore();
    ajoutFenetre.mockRestore();
  });
});
