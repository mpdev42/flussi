import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConfigurationPublique } from '@shared/types';
import type { ServiceParametres } from '../../services/parametres';

const handlers = new Map<string, (...args: unknown[]) => unknown>();

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((canal: string, handler: (...args: unknown[]) => unknown) => {
      handlers.set(canal, handler);
    }),
  },
}));

const { enregistrerHandlersParametres } = await import('./index');

const EVENT = {};

// Valeurs fictives
const CONFIGURATION: ConfigurationPublique = {
  mode: 'recette',
  dossiers: {
    travail: 'D:\\Travail\\Flussi',
    in: 'D:\\Travail\\Flussi\\IN',
    out: 'D:\\Travail\\Flussi\\OUT',
    journal: 'D:\\Travail\\Flussi\\Journal',
  },
  version: '0.0.0-test',
  origines: { fichier: 'C:\\Dev\\flussi\\.env', mode: 'env', travail: 'env' },
};

let ouvrirDossier: ReturnType<typeof vi.fn<ServiceParametres['ouvrirDossier']>>;

function appeler(canal: string, ...args: unknown[]): unknown {
  const handler = handlers.get(canal);
  if (!handler) throw new Error(`canal non enregistré : ${canal}`);
  return handler(EVENT, ...args);
}

beforeEach(() => {
  handlers.clear();
  ouvrirDossier = vi.fn<ServiceParametres['ouvrirDossier']>(async () => ({ ok: true }));
  enregistrerHandlersParametres({ configuration: CONFIGURATION, parametres: { ouvrirDossier } });
});

describe('enregistrerHandlersParametres — enregistrement', () => {
  it('enregistre exactement config:lire et config:ouvrir-dossier', () => {
    expect([...handlers.keys()].sort()).toEqual(['config:lire', 'config:ouvrir-dossier']);
  });
});

describe('config:lire', () => {
  it('renvoie la configuration', () => {
    expect(appeler('config:lire')).toEqual(CONFIGURATION);
  });
});

describe('config:ouvrir-dossier', () => {
  it.each(['travail', 'in', 'out', 'journal'] as const)(
    'délègue le dossier %s au service et renvoie son résultat',
    async (dossier) => {
      expect(await appeler('config:ouvrir-dossier', dossier)).toEqual({ ok: true });
      expect(ouvrirDossier).toHaveBeenCalledTimes(1);
      expect(ouvrirDossier).toHaveBeenCalledWith(dossier);
    },
  );

  it.each([
    ['majuscules', 'IN'],
    ['segment ..', '..'],
    ['chemin absolu', 'C:\\Windows'],
    ['chaîne vide', ''],
    ['nombre', 1],
    ['null', null],
    ['absence d’argument', undefined],
    ['objet', {}],
    ['tableau', ['in']],
  ])('rejette une entrée invalide (%s) sans appeler le service', (_cas, entree) => {
    expect(() => appeler('config:ouvrir-dossier', entree)).toThrow();
    expect(ouvrirDossier).not.toHaveBeenCalled();
  });

  it('renvoie tel quel un échec d’ouverture typé, sans lever', async () => {
    const echec = { ok: false, message: 'Le dossier IN (D:\\x) n’a pas pu être ouvert' } as const;
    ouvrirDossier.mockResolvedValueOnce(echec);

    const resultat = await appeler('config:ouvrir-dossier', 'in');

    expect(resultat).toEqual(echec);
  });
});
