// @vitest-environment jsdom
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cliquer, monter, type Monture } from '@/test/dom';
import { TabBar, type OngletTabBar, type TabBarProps } from './tab-bar';
import { idOngletTabBar } from './tab-bar-ids';

const ONGLETS: OngletTabBar[] = [
  { id: 'liste', libelle: 'Liste', compteur: 3 },
  { id: '100', libelle: '100', mono: true },
  { id: '110', libelle: '110', mono: true, desactive: true },
  { id: '115', libelle: '115', mono: true, compteur: 1 },
  { id: 'fin', libelle: 'Fin', desactive: true },
];

let monture: Monture | null = null;

afterEach(async () => {
  await monture?.demonter();
  monture = null;
});

function barre(props: Partial<TabBarProps> = {}) {
  return (
    <TabBar
      onglets={ONGLETS}
      actif="100"
      onChange={() => {}}
      ariaLabel="Entités"
      idPanneau="panneau"
      {...props}
    />
  );
}

function onglets(): HTMLButtonElement[] {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
}

function onglet(id: string): HTMLButtonElement {
  const trouve = document.getElementById(`panneau-onglet-${id}`);
  if (!(trouve instanceof HTMLButtonElement)) throw new Error(`Onglet ${id} introuvable`);
  return trouve;
}

/** Texte lu par un lecteur d'écran : contenu hors `aria-hidden`. */
function texteLu(element: HTMLElement): string {
  const copie = element.cloneNode(true) as HTMLElement;
  copie.querySelectorAll('[aria-hidden="true"]').forEach((cache) => cache.remove());
  return copie.textContent ?? '';
}

async function appuyer(element: HTMLElement, key: string): Promise<KeyboardEvent> {
  const evenement = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  await act(async () => {
    element.dispatchEvent(evenement);
  });
  return evenement;
}

describe('TabBar — rôles et attributs', () => {
  it('rend une tablist nommée, un onglet role="tab" par entrée', async () => {
    monture = await monter(barre());
    const liste = document.querySelector('[role="tablist"]');
    expect(liste?.getAttribute('aria-label')).toBe('Entités');
    expect(onglets()).toHaveLength(5);
    for (const bouton of onglets()) {
      expect(bouton.type).toBe('button');
      expect(bouton.getAttribute('aria-controls')).toBe('panneau');
    }
  });

  it('pose des id stables {idPanneau}-onglet-{id}', async () => {
    monture = await monter(barre());
    expect(onglets().map((b) => b.id)).toEqual([
      'panneau-onglet-liste',
      'panneau-onglet-100',
      'panneau-onglet-110',
      'panneau-onglet-115',
      'panneau-onglet-fin',
    ]);
  });

  it('sélectionne le seul onglet actif, souligné', async () => {
    monture = await monter(barre());
    expect(onglets().map((b) => b.getAttribute('aria-selected'))).toEqual([
      'false',
      'true',
      'false',
      'false',
      'false',
    ]);
    expect(onglet('100').className).toContain('border-blue-500');
    expect(onglet('100').className).toContain('text-navy-700');
    expect(onglet('liste').className).toContain('border-transparent');
  });

  it('passe à la ligne au lieu de défiler, onglets de 32 px', async () => {
    monture = await monter(barre({ className: 'border-b' }));
    const liste = document.querySelector('[role="tablist"]');
    expect(liste?.className.split(' ')).toEqual(expect.arrayContaining(['flex', 'flex-wrap']));
    expect(liste?.className).toContain('border-b');
    expect(liste?.className).not.toContain('overflow-x');
    expect(onglet('100').className).toContain('h-control-md');
    expect(onglet('100').className).toContain('border-b-2');
  });

  it('fait recouvrir le filet du conteneur par le soulignement (-mb-px)', async () => {
    monture = await monter(barre({ className: 'border-b' }));
    for (const bouton of onglets()) expect(bouton.className.split(' ')).toContain('-mb-px');
  });

  it('construit les id avec idOngletTabBar', async () => {
    monture = await monter(barre());
    expect(onglet('115').id).toBe(idOngletTabBar('panneau', '115'));
    expect(idOngletTabBar('detail', 'benef')).toBe('detail-onglet-benef');
  });

  it('rend une tablist vide sans onglet', async () => {
    monture = await monter(barre({ onglets: [] }));
    expect(document.querySelector('[role="tablist"]')).not.toBeNull();
    expect(onglets()).toHaveLength(0);
  });

  it('affiche les codes en mono', async () => {
    monture = await monter(barre());
    expect(onglet('100').querySelector('span')?.className).toContain('font-mono');
    expect(onglet('liste').querySelector('span')?.className).not.toContain('font-mono');
  });
});

describe('TabBar — onglets en erreur', () => {
  it('annonce le libellé et le nombre d’erreurs : « Liste, 3 erreurs »', async () => {
    monture = await monter(barre());
    expect(texteLu(onglet('liste'))).toBe('Liste, 3 erreurs');
    expect(texteLu(onglet('115'))).toBe('115, 1 erreur');
    expect(texteLu(onglet('100'))).toBe('100');
  });

  it('marque l’onglet : icône, libellé rouge, compteur visible', async () => {
    monture = await monter(barre());
    const enErreur = onglet('liste');
    expect(enErreur.className).toContain('text-error-text');
    expect(enErreur.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(enErreur.querySelector('[aria-hidden="true"]:not(svg)')?.textContent).toBe('3');
    expect(onglet('100').querySelector('svg')).toBeNull();
  });

  it('rend le contenu transparent au pointeur : la cible est toujours le bouton', async () => {
    monture = await monter(barre());
    // Un compteur retiré entre pointerup et click annulerait le clic s'il était la cible
    for (const id of ['liste', '100', '110']) {
      const enfants = Array.from(onglet(id).children);
      expect(enfants.length).toBeGreaterThan(0);
      for (const enfant of enfants) {
        expect(enfant.getAttribute('class')?.split(' ')).toContain('pointer-events-none');
      }
    }
    expect(onglet('liste').querySelector('svg')?.getAttribute('class')).toContain(
      'pointer-events-none',
    );
    const compteur = onglet('liste').querySelector('[aria-hidden="true"]:not(svg)')?.parentElement;
    expect(compteur?.className.split(' ')).toContain('pointer-events-none');
  });

  it('garde le libellé rouge sur l’onglet actif en erreur', async () => {
    monture = await monter(barre({ actif: 'liste' }));
    expect(onglet('liste').className).toContain('text-error-text');
    expect(onglet('liste').className).not.toContain('text-navy-700');
  });

  it('accepte un autre nom de compteur', async () => {
    monture = await monter(barre({ noun: ['ligne rejetée', 'lignes rejetées'] }));
    expect(texteLu(onglet('liste'))).toBe('Liste, 3 lignes rejetées');
  });
});

/** Enveloppe de l'infobulle d'un onglet désactivé, hors arbre d'accessibilité. */
function infobulle(id: string): HTMLElement | null {
  const parent = onglet(id).parentElement;
  return parent?.getAttribute('role') === 'none' ? parent : null;
}

describe('TabBar — onglets désactivés', () => {
  it('désactive l’onglet, avec mention lue « (entité absente) »', async () => {
    monture = await monter(barre());
    const absent = onglet('110');
    expect(absent.disabled).toBe(true);
    expect(texteLu(absent)).toBe('110 (entité absente)');
  });

  it('pose l’infobulle sur une enveloppe sans boîte ni rôle, jamais sur le bouton', async () => {
    monture = await monter(barre());
    // Sur le bouton, le title deviendrait sa description accessible, lue après la mention
    expect(onglet('110').hasAttribute('title')).toBe(false);
    const enveloppe = infobulle('110');
    expect(enveloppe?.title).toBe('Entité absente de cet évènement');
    expect(enveloppe?.className).toBe('contents');
    expect(enveloppe?.parentElement?.getAttribute('role')).toBe('tablist');
  });

  it('n’enveloppe pas les onglets accessibles', async () => {
    monture = await monter(barre());
    expect(onglet('100').hasAttribute('title')).toBe(false);
    expect(infobulle('100')).toBeNull();
    expect(onglet('100').parentElement?.getAttribute('role')).toBe('tablist');
  });

  it('accepte une autre infobulle et une autre mention', async () => {
    monture = await monter(
      barre({ titreDesactive: 'Indisponible', mentionDesactive: '(indisponible)' }),
    );
    expect(infobulle('110')?.title).toBe('Indisponible');
    expect(texteLu(onglet('110'))).toBe('110 (indisponible)');
  });
});

describe('TabBar — souris', () => {
  it('appelle onChange avec l’identifiant de l’onglet cliqué', async () => {
    const onChange = vi.fn();
    monture = await monter(barre({ onChange }));
    await cliquer(onglet('115'));
    expect(onChange).toHaveBeenCalledWith('115');
  });

  it('n’appelle pas onChange sur l’onglet déjà actif ni sur un onglet désactivé', async () => {
    const onChange = vi.fn();
    monture = await monter(barre({ onChange }));
    await cliquer(onglet('100'));
    await cliquer(onglet('110'));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('TabBar — clavier', () => {
  it('ne rend tabulable que l’onglet actif', async () => {
    monture = await monter(barre());
    expect(onglets().map((b) => b.tabIndex)).toEqual([-1, 0, -1, -1, -1]);
  });

  it('rend tabulable le premier onglet accessible si l’actif est désactivé', async () => {
    monture = await monter(barre({ actif: '110' }));
    expect(onglets().map((b) => b.tabIndex)).toEqual([0, -1, -1, -1, -1]);
  });

  it('actif absent de la liste : premier accessible tabulable, aucun onglet sélectionné', async () => {
    monture = await monter(barre({ actif: 'inconnu' }));
    expect(onglets().map((b) => b.tabIndex)).toEqual([0, -1, -1, -1, -1]);
    expect(document.querySelector('[aria-selected="true"]')).toBeNull();
  });

  it('tous les onglets désactivés : aucun tabulable, flèches sans effet', async () => {
    const onChange = vi.fn();
    const desactives = ONGLETS.map((o) => ({ ...o, desactive: true }));
    monture = await monter(barre({ onglets: desactives, onChange }));
    expect(onglets().every((b) => b.tabIndex === -1 && b.disabled)).toBe(true);
    const evenement = await appuyer(onglet('100'), 'ArrowRight');
    expect(evenement.defaultPrevented).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('un seul onglet accessible : les flèches n’appellent pas onChange', async () => {
    const onChange = vi.fn();
    const seul = ONGLETS.map((o) => ({ ...o, desactive: o.id !== '100' }));
    monture = await monter(barre({ onglets: seul, onChange }));
    for (const touche of ['ArrowRight', 'ArrowLeft', 'Home', 'End']) {
      await appuyer(onglet('100'), touche);
    }
    expect(onChange).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(onglet('100'));
  });

  it('flèche droite : onglet suivant accessible, en sautant les désactivés', async () => {
    const onChange = vi.fn();
    monture = await monter(barre({ onChange }));
    const evenement = await appuyer(onglet('100'), 'ArrowRight');
    expect(onChange).toHaveBeenCalledWith('115');
    expect(document.activeElement).toBe(onglet('115'));
    expect(evenement.defaultPrevented).toBe(true);
  });

  it('flèche droite sur le dernier accessible : retour au premier', async () => {
    const onChange = vi.fn();
    monture = await monter(barre({ actif: '115', onChange }));
    await appuyer(onglet('115'), 'ArrowRight');
    expect(onChange).toHaveBeenCalledWith('liste');
  });

  it('flèche gauche : onglet précédent, et du premier au dernier accessible', async () => {
    const onChange = vi.fn();
    monture = await monter(barre({ actif: '115', onChange }));
    await appuyer(onglet('115'), 'ArrowLeft');
    expect(onChange).toHaveBeenLastCalledWith('100');

    await monture.rerendre(barre({ actif: 'liste', onChange }));
    await appuyer(onglet('liste'), 'ArrowLeft');
    expect(onChange).toHaveBeenLastCalledWith('115');
  });

  it('Début et Fin : premier et dernier onglets accessibles', async () => {
    const onChange = vi.fn();
    monture = await monter(barre({ onChange }));
    await appuyer(onglet('100'), 'End');
    expect(onChange).toHaveBeenLastCalledWith('115');
    await appuyer(onglet('100'), 'Home');
    expect(onChange).toHaveBeenLastCalledWith('liste');
    expect(document.activeElement).toBe(onglet('liste'));
  });

  it('ignore les autres touches', async () => {
    const onChange = vi.fn();
    monture = await monter(barre({ onChange }));
    const evenement = await appuyer(onglet('100'), 'ArrowDown');
    expect(onChange).not.toHaveBeenCalled();
    expect(evenement.defaultPrevented).toBe(false);
  });

  it('affiche l’anneau de focus de la charte au clavier', async () => {
    monture = await monter(barre());
    expect(onglet('100').className).toContain('focus-visible:shadow-focus');
  });
});
