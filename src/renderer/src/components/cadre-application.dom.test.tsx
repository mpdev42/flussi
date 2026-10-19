// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cliquer, monter, monterHook, type Monture } from '@/test/dom';
import { CadreApplication, type CadreApplicationProps } from './cadre-application';
import { useVerrouNavigation } from './verrou-navigation';

const NAVIGATION = [
  { id: 'accueil', libelle: 'Accueil' },
  { id: 'journal', libelle: 'Journal' },
];

let monture: Monture | null = null;

afterEach(async () => {
  await monture?.demonter();
  monture = null;
});

function cadre(children: ReactNode, props: Partial<CadreApplicationProps> = {}) {
  return (
    <CadreApplication
      environnement="recette"
      version="1.2.3"
      navigation={NAVIGATION}
      actif="accueil"
      onNaviguer={() => {}}
      {...props}
    >
      {children}
    </CadreApplication>
  );
}

function boutons(): HTMLButtonElement[] {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('nav button'));
}

function zonePrincipale(): HTMLElement {
  const main = document.querySelector('main');
  if (!main) throw new Error('<main> introuvable');
  return main;
}

/** jsdom ne fait pas défiler : `scrollTop` devient une simple valeur lue et écrite. */
function simulerDefilement(element: HTMLElement): void {
  let valeur = 0;
  Object.defineProperty(element, 'scrollTop', {
    configurable: true,
    get: () => valeur,
    set: (suivante: number) => {
      valeur = suivante;
    },
  });
}

/** Écran de test qui demande le verrou de navigation. */
function EcranVerrou({ actif, children }: { actif: boolean; children?: ReactNode }) {
  useVerrouNavigation(actif);
  return <>{children}</>;
}

describe('CadreApplication — verrou de navigation', () => {
  it('désactive les boutons tant qu’un écran garde le verrou', async () => {
    monture = await monter(cadre(<EcranVerrou actif />));
    expect(boutons()).toHaveLength(2);
    for (const bouton of boutons()) expect(bouton.disabled).toBe(true);

    await monture.rerendre(cadre(<EcranVerrou actif={false} />));
    for (const bouton of boutons()) expect(bouton.disabled).toBe(false);
  });

  it('n’appelle pas onNaviguer sur un bouton désactivé', async () => {
    const onNaviguer = vi.fn();
    monture = await monter(cadre(<EcranVerrou actif />, { onNaviguer }));
    await cliquer(boutons()[1]);
    expect(onNaviguer).not.toHaveBeenCalled();
  });

  it('reste désactivé tant qu’un des demandeurs garde le verrou', async () => {
    monture = await monter(
      cadre(
        <>
          <EcranVerrou actif />
          <EcranVerrou actif />
        </>,
      ),
    );
    await monture.rerendre(
      cadre(
        <>
          <EcranVerrou actif />
          <EcranVerrou actif={false} />
        </>,
      ),
    );
    expect(boutons()[0].disabled).toBe(true);

    await monture.rerendre(cadre(<EcranVerrou actif={false} />));
    expect(boutons()[0].disabled).toBe(false);
  });

  it('retire le verrou au démontage de l’écran', async () => {
    monture = await monter(cadre(<EcranVerrou actif />));
    await monture.rerendre(cadre(<p>Autre écran</p>));
    for (const bouton of boutons()) expect(bouton.disabled).toBe(false);
  });

  it('garde le style désactivé lisible sur le fond marine', async () => {
    monture = await monter(cadre(<EcranVerrou actif />));
    for (const bouton of boutons()) {
      expect(bouton.className).toContain('disabled:text-navy-300');
      expect(bouton.className).toContain('disabled:cursor-not-allowed');
    }
    // Le survol ne s'applique qu'aux boutons actifs
    expect(boutons()[1].className).toContain('enabled:hover:bg-navy-800');
    expect(boutons()[1].className).not.toMatch(/(^| )hover:bg-navy-800/);
  });

  it('est sans effet hors du cadre (écran testé seul)', async () => {
    const sonde = await monterHook(() => useVerrouNavigation(true));
    monture = sonde;
    expect(sonde.lire()).toBeUndefined();
  });
});

describe('CadreApplication — changement d’écran', () => {
  it('ne déplace pas le focus au premier rendu', async () => {
    monture = await monter(cadre(<h1>Accueil</h1>));
    expect(document.activeElement).toBe(document.body);
  });

  it('place le focus sur le h1 du nouvel écran, sans le faire défiler', async () => {
    monture = await monter(cadre(<h1>Accueil</h1>));
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    await monture.rerendre(cadre(<h1>Journal</h1>, { actif: 'journal' }));

    const titre = zonePrincipale().querySelector('h1');
    expect(document.activeElement).toBe(titre);
    expect(titre?.getAttribute('tabindex')).toBe('-1');
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    focus.mockRestore();
  });

  it('garde un tabindex déjà posé sur le h1', async () => {
    monture = await monter(cadre(<h1>Accueil</h1>));
    await monture.rerendre(
      cadre(<h1 tabIndex={0}>Journal</h1>, {
        actif: 'journal',
      }),
    );
    expect(zonePrincipale().querySelector('h1')?.getAttribute('tabindex')).toBe('0');
  });

  it('ignore le h1 d’un écran resté monté mais masqué par hidden', async () => {
    const ecrans = (actif: string) => (
      <>
        <section hidden={actif !== 'accueil'}>
          <h1>Accueil</h1>
        </section>
        <section hidden={actif !== 'journal'}>
          <div>
            <h1>Journal</h1>
          </div>
        </section>
      </>
    );
    monture = await monter(cadre(ecrans('accueil')));
    await monture.rerendre(cadre(ecrans('journal'), { actif: 'journal' }));
    expect(document.activeElement?.textContent).toBe('Journal');
  });

  it('place le focus sur <main> si l’écran n’a pas de h1', async () => {
    monture = await monter(cadre(<h1>Accueil</h1>));
    await monture.rerendre(cadre(<p>Sans titre</p>, { actif: 'journal' }));
    const main = zonePrincipale();
    expect(document.activeElement).toBe(main);
    expect(main.getAttribute('tabindex')).toBe('-1');
    expect(main.className).toContain('focus:outline-none');
  });

  it('remet le défilement de <main> en haut', async () => {
    monture = await monter(cadre(<h1>Accueil</h1>));
    const main = zonePrincipale();
    simulerDefilement(main);
    main.scrollTop = 240;
    await monture.rerendre(cadre(<h1>Journal</h1>, { actif: 'journal' }));
    expect(main.scrollTop).toBe(0);
  });

  it('ne touche ni au focus ni au défilement si l’écran actif ne change pas', async () => {
    monture = await monter(cadre(<h1>Accueil</h1>));
    const main = zonePrincipale();
    simulerDefilement(main);
    main.scrollTop = 240;
    await monture.rerendre(cadre(<h1>Accueil modifié</h1>));
    expect(main.scrollTop).toBe(240);
    expect(document.activeElement).toBe(document.body);
  });
});
