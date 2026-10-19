import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ServiceAc056 } from '../../services/ac056';

const handlers = new Map<string, (...args: unknown[]) => unknown>();

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((canal: string, handler: (...args: unknown[]) => unknown) => {
      handlers.set(canal, handler);
    }),
  },
}));

const { enregistrerHandlersAc056 } = await import('./index');

const EVENT = {};

let service: {
  [K in keyof ServiceAc056]: ReturnType<typeof vi.fn<ServiceAc056[K]>>;
};

function appeler(canal: string, ...args: unknown[]): unknown {
  const handler = handlers.get(canal);
  if (!handler) throw new Error(`canal non enregistré : ${canal}`);
  return handler(EVENT, ...args);
}

beforeEach(() => {
  handlers.clear();
  service = {
    lister: vi.fn<ServiceAc056['lister']>(async () => ({ ok: true, in: [], out: [] })),
    ouvrir: vi.fn<ServiceAc056['ouvrir']>(async (emplacement, nom) => ({
      ok: false,
      erreur: { code: 'introuvable', message: `${emplacement}/${nom}` },
    })),
  };
  enregistrerHandlersAc056({ service });
});

describe('enregistrerHandlersAc056 — enregistrement', () => {
  it('enregistre les deux canaux ac056:*', () => {
    expect([...handlers.keys()].sort()).toEqual(['ac056:lister', 'ac056:ouvrir']);
  });
});

describe('ac056:lister', () => {
  it('renvoie le résultat du service, sans entrée', async () => {
    expect(await appeler('ac056:lister')).toEqual({ ok: true, in: [], out: [] });
    expect(service.lister).toHaveBeenCalledTimes(1);
  });
});

describe('ac056:ouvrir', () => {
  it.each([
    ['in', 'AC056COUR_20261014.txt'],
    ['out', 'AC056COUR_REJ_20261014.TXT'],
  ])('transmet %s et %s au service', async (emplacement, nom) => {
    const resultat = await appeler('ac056:ouvrir', { emplacement, nom });

    expect(service.ouvrir).toHaveBeenCalledWith(emplacement, nom);
    expect(resultat).toMatchObject({ ok: false, erreur: { message: `${emplacement}/${nom}` } });
  });

  it.each([
    ['emplacement journal', { emplacement: 'journal', nom: 'a.txt' }],
    ['emplacement manquant', { nom: 'a.txt' }],
    ['nom manquant', { emplacement: 'in' }],
    ['nom vide', { emplacement: 'in', nom: '' }],
    ['nom avec barre oblique', { emplacement: 'in', nom: 'sous/a.txt' }],
    ['nom avec barre oblique inverse', { emplacement: 'in', nom: 'sous\\a.txt' }],
    ['chemin absolu', { emplacement: 'in', nom: 'C:\\Windows\\win.ini' }],
    ['remontée', { emplacement: 'in', nom: '..\\a.txt' }],
    ['mauvaise extension', { emplacement: 'in', nom: 'a.csv' }],
    ['nom numérique', { emplacement: 'in', nom: 42 }],
    ['clé en trop', { emplacement: 'in', nom: 'a.txt', chemin: 'C:\\x' }],
    ['chaîne', 'in/a.txt'],
    ['null', null],
    ['absence d’argument', undefined],
  ])('rejette une entrée invalide (%s) sans appeler le service', (_cas, entree) => {
    expect(() => appeler('ac056:ouvrir', entree)).toThrow();
    expect(service.ouvrir).not.toHaveBeenCalled();
  });
});
