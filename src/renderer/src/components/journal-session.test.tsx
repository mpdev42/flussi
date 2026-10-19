// @vitest-environment jsdom
import { act } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import type { NiveauJournal } from '@shared/schemas/journal';
import type { LigneJournalSession } from '@shared/types/journal';
import { monter, type Monture } from '@/test/dom';
import { JournalSession } from './journal-session';

let monture: Monture | null = null;

afterEach(async () => {
  await monture?.demonter();
  monture = null;
});

function ligne(rang: number, niveau: NiveauJournal = 'INFO', message = `Message ${rang}`) {
  const secondes = String(rang % 60).padStart(2, '0');
  return { rang, heure: `09:15:${secondes}`, niveau, message } satisfies LigneJournalSession;
}

function lignes(nombre: number): LigneJournalSession[] {
  return Array.from({ length: nombre }, (_, i) => ligne(i + 1));
}

function journal(): HTMLElement {
  const zone = document.querySelector<HTMLElement>('[role="log"]');
  if (!zone) throw new Error('Zone role="log" introuvable');
  return zone;
}

function entrees(): HTMLLIElement[] {
  return Array.from(journal().querySelectorAll('li'));
}

/** jsdom n'a pas de mise en page : hauteurs et défilement simulés sur la zone du journal. */
function simulerDefilement(zone: HTMLElement, hauteurVisible = 100) {
  const etat = { haut: 0, hauteurTotale: 0 };
  Object.defineProperty(zone, 'clientHeight', { configurable: true, get: () => hauteurVisible });
  Object.defineProperty(zone, 'scrollHeight', {
    configurable: true,
    get: () => etat.hauteurTotale,
  });
  Object.defineProperty(zone, 'scrollTop', {
    configurable: true,
    get: () => etat.haut,
    set: (valeur: number) => {
      etat.haut = Math.max(0, Math.min(valeur, etat.hauteurTotale - hauteurVisible));
    },
  });
  return etat;
}

/** L'utilisateur fait défiler la zone jusqu'à `haut`. */
async function defiler(zone: HTMLElement, haut: number) {
  await act(async () => {
    zone.scrollTop = haut;
    zone.dispatchEvent(new Event('scroll'));
  });
}

describe('JournalSession — en-tête', () => {
  it('titre le panneau « Journal de la session » en h2', async () => {
    monture = await monter(<JournalSession lignes={[]} />);
    const titre = document.querySelector('h2');
    expect(titre?.textContent).toBe('Journal de la session');
  });

  it.each([
    [0, '0 ligne'],
    [1, '1 ligne'],
    [12, '12 lignes'],
  ])('compte %i ligne(s) : « %s »', async (nombre, attendu) => {
    monture = await monter(<JournalSession lignes={lignes(nombre)} />);
    expect(monture.conteneur.textContent).toContain(`Journal de la session${attendu}`);
  });
});

describe('JournalSession — liste', () => {
  it('est une zone role="log", annoncée poliment et nommée par le titre', async () => {
    monture = await monter(<JournalSession lignes={[]} />);
    const zone = journal();
    expect(zone.getAttribute('aria-live')).toBe('polite');
    const titre = document.getElementById(zone.getAttribute('aria-labelledby') ?? '');
    expect(titre?.tagName).toBe('H2');
    expect(zone.tabIndex).toBe(0);
  });

  it('affiche « Aucun évènement pour le moment. » sans ligne', async () => {
    monture = await monter(<JournalSession lignes={[]} />);
    expect(journal().textContent).toBe('Aucun évènement pour le moment.');
    expect(journal().querySelector('ol')).toBeNull();
  });

  it('rend une entrée par ligne, la plus récente en bas', async () => {
    monture = await monter(<JournalSession lignes={lignes(3)} />);
    expect(entrees().map((li) => li.querySelector('p')?.textContent)).toEqual([
      'Message 1',
      'Message 2',
      'Message 3',
    ]);
    expect(journal().textContent).not.toContain('Aucun évènement');
  });

  it('affiche l’heure en mono, le niveau avec icône et mot, puis le message', async () => {
    monture = await monter(<JournalSession lignes={[ligne(5, 'SUCCES', 'Fichier chargé')]} />);
    const [entree] = entrees();
    const [heure, niveau] = Array.from(entree.querySelectorAll('span'));
    expect(heure.textContent).toBe('09:15:05');
    expect(heure.className).toContain('font-mono');
    expect(niveau.textContent).toBe('Succès');
    expect(niveau.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(niveau.className).toContain('text-success-text');
    expect(entree.querySelector('p')?.textContent).toBe('Fichier chargé');
  });

  it.each([
    ['TITRE', 'Titre', ['font-semibold', 'text-navy-700']],
    ['INFO', 'Info', ['text-neutral-600']],
    ['SUCCES', 'Succès', ['text-success-text']],
    ['ERREUR', 'Erreur', ['text-error-text']],
  ] as const)('présente le niveau %s (« %s »)', async (niveau, libelle, classesMessage) => {
    monture = await monter(<JournalSession lignes={[ligne(1, niveau)]} />);
    const [entree] = entrees();
    expect(entree.querySelectorAll('span')[1].textContent).toBe(libelle);
    expect(entree.querySelectorAll('span')[1].querySelector('svg')).not.toBeNull();
    const message = entree.querySelector('p');
    for (const classe of classesMessage) expect(message?.className).toContain(classe);
  });

  it('laisse le message passer à la ligne (colonne étroite)', async () => {
    monture = await monter(<JournalSession lignes={[ligne(1)]} />);
    const message = entrees()[0].querySelector('p');
    expect(message?.className).toContain('whitespace-pre-wrap');
    expect(message?.className).toContain('[overflow-wrap:anywhere]');
  });
});

describe('JournalSession — défilement automatique', () => {
  it('suit les nouvelles lignes tant que l’utilisateur est en bas', async () => {
    monture = await monter(<JournalSession lignes={lignes(2)} />);
    const etat = simulerDefilement(journal());

    etat.hauteurTotale = 500;
    await monture.rerendre(<JournalSession lignes={lignes(20)} />);
    expect(journal().scrollTop).toBe(400);

    etat.hauteurTotale = 800;
    await monture.rerendre(<JournalSession lignes={lignes(30)} />);
    expect(journal().scrollTop).toBe(700);
  });

  it('ne bouge pas si l’utilisateur est remonté, et reprend quand il revient en bas', async () => {
    monture = await monter(<JournalSession lignes={lignes(2)} />);
    const zone = journal();
    const etat = simulerDefilement(zone);
    etat.hauteurTotale = 500;
    await monture.rerendre(<JournalSession lignes={lignes(20)} />);

    await defiler(zone, 120);
    etat.hauteurTotale = 600;
    await monture.rerendre(<JournalSession lignes={lignes(25)} />);
    expect(zone.scrollTop).toBe(120);

    await defiler(zone, 500);
    etat.hauteurTotale = 700;
    await monture.rerendre(<JournalSession lignes={lignes(30)} />);
    expect(zone.scrollTop).toBe(600);
  });

  it('considère l’utilisateur en bas à quelques pixels près', async () => {
    monture = await monter(<JournalSession lignes={lignes(2)} />);
    const zone = journal();
    const etat = simulerDefilement(zone);
    etat.hauteurTotale = 500;
    await monture.rerendre(<JournalSession lignes={lignes(20)} />);

    await defiler(zone, 395);
    etat.hauteurTotale = 600;
    await monture.rerendre(<JournalSession lignes={lignes(25)} />);
    expect(zone.scrollTop).toBe(500);
  });
});

describe('JournalSession — longue session', () => {
  it('rend plusieurs centaines de lignes', async () => {
    monture = await monter(<JournalSession lignes={lignes(600)} />);
    expect(entrees()).toHaveLength(600);
    expect(monture.conteneur.textContent).toContain('600 lignes');
  });
});
