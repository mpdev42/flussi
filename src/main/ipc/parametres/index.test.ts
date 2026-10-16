import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConfigurationPublique } from '@shared/types';
import type { ServiceParametres, ServiceSecrets } from '../../services/parametres';

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
let etat: ReturnType<typeof vi.fn<ServiceSecrets['etat']>>;
let preparerCle: ReturnType<typeof vi.fn<ServiceSecrets['preparerCle']>>;
let abandonnerCle: ReturnType<typeof vi.fn<ServiceSecrets['abandonnerCle']>>;
let enregistrer: ReturnType<typeof vi.fn<ServiceSecrets['enregistrer']>>;

// Valeur témoin fictive : ne doit jamais apparaître dans une erreur levée
const TEMOIN = 'TEMOIN-MOT-DE-PASSE-42';
const ETAT_SECRETS = {
  source: 'secrets-bin',
  modifiable: true,
  anomalie: null,
  secrets: {
    'iga-ftp-mot-de-passe': { etat: 'renseigne', date: '2026-10-15' },
    'msp-sftp-mot-de-passe': { etat: 'non-renseigne' },
    'msp-sftp-cle-privee': { etat: 'non-renseigne' },
  },
} as const;

function appeler(canal: string, ...args: unknown[]): unknown {
  const handler = handlers.get(canal);
  if (!handler) throw new Error(`canal non enregistré : ${canal}`);
  return handler(EVENT, ...args);
}

beforeEach(() => {
  handlers.clear();
  ouvrirDossier = vi.fn<ServiceParametres['ouvrirDossier']>(async () => ({ ok: true }));
  etat = vi.fn<ServiceSecrets['etat']>(async () => ETAT_SECRETS);
  preparerCle = vi.fn<ServiceSecrets['preparerCle']>(async () => ({
    statut: 'preparee',
    format: 'PPK version 2',
  }));
  abandonnerCle = vi.fn<ServiceSecrets['abandonnerCle']>();
  enregistrer = vi.fn<ServiceSecrets['enregistrer']>(async () => ({
    statut: 'enregistre',
    etat: ETAT_SECRETS,
  }));
  enregistrerHandlersParametres({
    configuration: CONFIGURATION,
    parametres: { ouvrirDossier },
    secrets: { etat, preparerCle, abandonnerCle, enregistrer },
  });
});

describe('enregistrerHandlersParametres — enregistrement', () => {
  it('enregistre exactement les canaux de configuration et de secrets', () => {
    expect([...handlers.keys()].sort()).toEqual([
      'config:lire',
      'config:ouvrir-dossier',
      'secrets:abandonner-cle',
      'secrets:enregistrer',
      'secrets:etat',
      'secrets:preparer-cle',
    ]);
  });

  it('n’expose aucun canal de relecture ni les anciens canaux', () => {
    expect(handlers.has('secrets:enregistrer-mot-de-passe')).toBe(false);
    expect(handlers.has('secrets:importer-cle')).toBe(false);
    expect(handlers.has('secrets:lire')).toBe(false);
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

describe('secrets:etat', () => {
  it('délègue au service et renvoie l’état tel quel', async () => {
    expect(await appeler('secrets:etat')).toEqual(ETAT_SECRETS);
    expect(etat).toHaveBeenCalledTimes(1);
  });

  it('ignore tout argument reçu du renderer', async () => {
    await appeler('secrets:etat', { cle: 'x' });
    expect(etat).toHaveBeenCalledWith();
  });
});

describe('secrets:preparer-cle', () => {
  it('délègue au service sans argument et renvoie son résultat', async () => {
    expect(await appeler('secrets:preparer-cle')).toEqual({
      statut: 'preparee',
      format: 'PPK version 2',
    });
    expect(preparerCle).toHaveBeenCalledTimes(1);
    expect(preparerCle).toHaveBeenCalledWith();
  });

  it('renvoie tel quel un refus du service', async () => {
    preparerCle.mockResolvedValueOnce({ statut: 'refuse', message: 'Clé refusée.' });
    expect(await appeler('secrets:preparer-cle')).toEqual({
      statut: 'refuse',
      message: 'Clé refusée.',
    });
  });

  it('ne transmet jamais un chemin reçu du renderer', async () => {
    await appeler('secrets:preparer-cle', 'C:\\Windows\\cle.ppk');
    expect(preparerCle).toHaveBeenCalledWith();
  });
});

describe('secrets:abandonner-cle', () => {
  it('délègue au service sans argument', () => {
    appeler('secrets:abandonner-cle');
    expect(abandonnerCle).toHaveBeenCalledTimes(1);
    expect(abandonnerCle).toHaveBeenCalledWith();
  });

  it('ne renvoie rien et ignore tout argument reçu du renderer', () => {
    expect(appeler('secrets:abandonner-cle', 'C:\\Windows\\cle.ppk')).toBeUndefined();
    expect(abandonnerCle).toHaveBeenCalledWith();
  });
});

describe('secrets:enregistrer', () => {
  const MESSAGE_INVALIDE = 'secrets:enregistrer : entrée invalide.';
  const IGA = 'iga-ftp-mot-de-passe';
  const MSP = 'msp-sftp-mot-de-passe';

  it.each([
    ['un mot de passe', { motsDePasse: { [IGA]: TEMOIN }, cle: false }],
    ['l’autre mot de passe', { motsDePasse: { [MSP]: TEMOIN }, cle: false }],
    ['deux mots de passe', { motsDePasse: { [IGA]: TEMOIN, [MSP]: 'autre-valeur' }, cle: false }],
    ['la clé seule', { motsDePasse: {}, cle: true }],
    ['un mot de passe et la clé', { motsDePasse: { [IGA]: TEMOIN }, cle: true }],
    ['deux mots de passe et la clé', { motsDePasse: { [IGA]: TEMOIN, [MSP]: 'x' }, cle: true }],
    ['256 caractères', { motsDePasse: { [IGA]: 'a'.repeat(256) }, cle: false }],
    ['1 caractère accentué', { motsDePasse: { [MSP]: 'é' }, cle: false }],
    ['des espaces en bordure', { motsDePasse: { [MSP]: ' mot de passe ' }, cle: false }],
  ])(
    'délègue la demande valide (%s) telle quelle et renvoie le résultat',
    async (_cas, demande) => {
      expect(await appeler('secrets:enregistrer', demande)).toEqual({
        statut: 'enregistre',
        etat: ETAT_SECRETS,
      });
      expect(enregistrer).toHaveBeenCalledTimes(1);
      expect(enregistrer).toHaveBeenCalledWith(demande);
    },
  );

  it('renvoie tel quel un refus ou une annulation du service, sans lever', async () => {
    enregistrer.mockResolvedValueOnce({ statut: 'refuse', message: 'Refusé.' });
    enregistrer.mockResolvedValueOnce({ statut: 'annule' });
    const demande = { motsDePasse: { [IGA]: TEMOIN }, cle: false };

    expect(await appeler('secrets:enregistrer', demande)).toEqual({
      statut: 'refuse',
      message: 'Refusé.',
    });
    expect(await appeler('secrets:enregistrer', demande)).toEqual({ statut: 'annule' });
  });

  it.each([
    ['chaîne', TEMOIN],
    ['nombre', 42],
    ['null', null],
    ['absence d’argument', undefined],
    ['tableau', [TEMOIN]],
    ['objet vide', {}],
    ['motsDePasse absent', { cle: true }],
    ['motsDePasse absent avec valeur', { [IGA]: TEMOIN, cle: true }],
    ['motsDePasse null', { motsDePasse: null, cle: true }],
    ['motsDePasse tableau', { motsDePasse: [TEMOIN], cle: true }],
    ['cle absent', { motsDePasse: { [IGA]: TEMOIN } }],
    ['cle chaîne', { motsDePasse: { [IGA]: TEMOIN }, cle: 'true' }],
    ['cle nombre', { motsDePasse: { [IGA]: TEMOIN }, cle: 1 }],
    ['cle null', { motsDePasse: { [IGA]: TEMOIN }, cle: null }],
    ['aucun changement', { motsDePasse: {}, cle: false }],
    ['mot de passe indéfini seul', { motsDePasse: { [IGA]: undefined }, cle: false }],
    ['clé inconnue', { motsDePasse: { inconnue: TEMOIN }, cle: false }],
    [
      'clé privée dans motsDePasse (importée, jamais saisie)',
      { motsDePasse: { 'msp-sftp-cle-privee': TEMOIN }, cle: false },
    ],
    [
      'clé inconnue en plus d’un mot de passe valide',
      { motsDePasse: { [IGA]: TEMOIN, x: 'y' }, cle: false },
    ],
    ['valeur vide', { motsDePasse: { [IGA]: '' }, cle: true }],
    ['257 caractères', { motsDePasse: { [IGA]: `${TEMOIN}${'a'.repeat(257)}` }, cle: false }],
    ['saut de ligne', { motsDePasse: { [IGA]: `${TEMOIN}\nsuite` }, cle: false }],
    ['caractère nul', { motsDePasse: { [IGA]: `${TEMOIN}\u0000` }, cle: false }],
    ['tabulation', { motsDePasse: { [IGA]: `${TEMOIN}\tsuite` }, cle: false }],
    ['valeur nombre', { motsDePasse: { [IGA]: 123456 }, cle: false }],
    ['valeur objet', { motsDePasse: { [IGA]: { secret: TEMOIN } }, cle: false }],
    ['valeur tableau', { motsDePasse: { [IGA]: [TEMOIN] }, cle: false }],
    ['valeur null', { motsDePasse: { [IGA]: null }, cle: false }],
    [
      'propriété en plus à la racine',
      { motsDePasse: { [IGA]: TEMOIN }, cle: false, chemin: 'C:\\x' },
    ],
    [
      'propriété en plus dans motsDePasse',
      { motsDePasse: { [IGA]: TEMOIN, extra: 1 }, cle: false },
    ],
    ['ancienne forme { cle, valeur }', { cle: IGA, valeur: TEMOIN }],
  ])('refuse l’entrée invalide (%s) sans appeler le service', (_cas, entree) => {
    let erreur: unknown;
    try {
      appeler('secrets:enregistrer', entree);
    } catch (e) {
      erreur = e;
    }

    expect(erreur).toBeInstanceOf(Error);
    expect((erreur as Error).message).toBe(MESSAGE_INVALIDE);
    expect(String(erreur)).not.toContain(TEMOIN);
    expect(enregistrer).not.toHaveBeenCalled();
  });

  it('refuse 257 caractères mais accepte 256 (borne exacte)', () => {
    const entree = (n: number) => ({ motsDePasse: { [IGA]: 'a'.repeat(n) }, cle: false });
    expect(() => appeler('secrets:enregistrer', entree(257))).toThrow(MESSAGE_INVALIDE);
    expect(() => appeler('secrets:enregistrer', entree(256))).not.toThrow();
  });
});
