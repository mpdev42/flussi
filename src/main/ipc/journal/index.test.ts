import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LigneJournalSession } from '@shared/types/journal';
import type { HistoriqueJournal } from '../../services/journal';

const handlers = new Map<string, (...args: unknown[]) => unknown>();

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((canal: string, handler: (...args: unknown[]) => unknown) => {
      handlers.set(canal, handler);
    }),
  },
}));

const { enregistrerHandlersJournal } = await import('./index');

const EVENT = {};

let historique: {
  [K in keyof HistoriqueJournal]: ReturnType<typeof vi.fn<HistoriqueJournal[K]>>;
};
let etat: ReturnType<typeof vi.fn<() => { enregistre: boolean; lignesEnAttente: number }>>;
let lignes: ReturnType<typeof vi.fn<() => readonly LigneJournalSession[]>>;

function appeler(canal: string, ...args: unknown[]): unknown {
  const handler = handlers.get(canal);
  if (!handler) throw new Error(`canal non enregistré : ${canal}`);
  return handler(EVENT, ...args);
}

beforeEach(() => {
  handlers.clear();
  historique = {
    annees: vi.fn<HistoriqueJournal['annees']>(async () => ({ ok: true, valeur: ['2026'] })),
    sessions: vi.fn<HistoriqueJournal['sessions']>(async () => ({ ok: true, valeur: [] })),
    lire: vi.fn<HistoriqueJournal['lire']>(async () => ({ ok: true, valeur: [] })),
  };
  etat = vi.fn(() => ({ enregistre: true, lignesEnAttente: 0 }));
  lignes = vi.fn(() => []);
  enregistrerHandlersJournal({ historique, session: { etat, lignes } });
});

describe('enregistrerHandlersJournal — enregistrement', () => {
  it('enregistre les cinq canaux journal:*', () => {
    expect([...handlers.keys()].sort()).toEqual([
      'journal:annees',
      'journal:etat',
      'journal:lignes-session',
      'journal:lire',
      'journal:sessions',
    ]);
  });
});

describe('journal:annees', () => {
  it('renvoie le résultat de l’historique', async () => {
    expect(await appeler('journal:annees')).toEqual({ ok: true, valeur: ['2026'] });
    expect(historique.annees).toHaveBeenCalledTimes(1);
  });
});

describe('journal:sessions', () => {
  it('transmet l’année et le mois valides au service', async () => {
    const resultat = await appeler('journal:sessions', { annee: '2026', mois: '10' });
    expect(resultat).toEqual({ ok: true, valeur: [] });
    expect(historique.sessions).toHaveBeenCalledWith('2026', '10');
  });

  it.each([
    ['mois 13', { annee: '2026', mois: '13' }],
    ['mois sur un chiffre', { annee: '2026', mois: '1' }],
    ['année sur deux chiffres', { annee: '26', mois: '10' }],
    ['clé en trop', { annee: '2026', mois: '10', chemin: '../x' }],
    ['clé manquante', { annee: '2026' }],
    ['chaîne', '2026/10'],
    ['absence d’argument', undefined],
    ['null', null],
  ])('rejette une entrée invalide (%s) sans appeler le service', (_cas, entree) => {
    expect(() => appeler('journal:sessions', entree)).toThrow();
    expect(historique.sessions).not.toHaveBeenCalled();
  });
});

describe('journal:lire', () => {
  it('transmet un chemin de session valide au service', async () => {
    const chemin = '2026/10/20261014-091500-c.mathevon.txt';
    const resultat = await appeler('journal:lire', chemin);
    expect(resultat).toEqual({ ok: true, valeur: [] });
    expect(historique.lire).toHaveBeenCalledWith(chemin);
  });

  it.each([
    ['segment ..', '../x'],
    ['chemin absolu', 'C:\\Windows\\win.ini'],
    ['barres obliques inverses', '2026\\10\\20261014-091500-a.txt'],
    ['nom hors format', '2026/10/notes.txt'],
    ['mois 13', '2026/13/20261014-091500-a.txt'],
    ['objet', { chemin: '2026/10/20261014-091500-a.txt' }],
    ['absence d’argument', undefined],
  ])('rejette une entrée invalide (%s) sans appeler le service', (_cas, entree) => {
    expect(() => appeler('journal:lire', entree)).toThrow();
    expect(historique.lire).not.toHaveBeenCalled();
  });

  it('renvoie une erreur de stockage typée dans le résultat sans lever', async () => {
    const erreur = {
      code: 'introuvable',
      emplacement: 'journal',
      chemin: 'P:\\Journal\\x',
      message: 'cause',
    } as const;
    historique.lire.mockResolvedValueOnce({ ok: false, erreur });

    const resultat = await appeler('journal:lire', '2026/10/20261014-091500-a.txt');

    expect(resultat).toEqual({ ok: false, erreur });
  });
});

describe('journal:lignes-session', () => {
  it('renvoie les lignes de la session en cours', () => {
    const attendues: LigneJournalSession[] = [
      { rang: 1, heure: '09:15:00', niveau: 'INFO', message: 'premier' },
      { rang: 2, heure: '09:15:02', niveau: 'SUCCES', message: 'second' },
    ];
    lignes.mockReturnValue(attendues);

    expect(appeler('journal:lignes-session')).toEqual(attendues);
  });

  it('renvoie une liste vide au démarrage', () => {
    expect(appeler('journal:lignes-session')).toEqual([]);
  });
});

describe('journal:etat', () => {
  it('renvoie l’état de la session', () => {
    expect(appeler('journal:etat')).toEqual({ enregistre: true, lignesEnAttente: 0 });
  });

  it('reflète un état en échec', () => {
    etat.mockReturnValue({ enregistre: false, lignesEnAttente: 3 });
    expect(appeler('journal:etat')).toEqual({ enregistre: false, lignesEnAttente: 3 });
  });
});
