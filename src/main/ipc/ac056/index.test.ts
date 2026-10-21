import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ServiceAc056 } from '../../services/ac056';

const handlers = new Map<string, (...args: unknown[]) => unknown>();
const ecouteurs = new Map<string, (...args: unknown[]) => unknown>();

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((canal: string, handler: (...args: unknown[]) => unknown) => {
      handlers.set(canal, handler);
    }),
    on: vi.fn((canal: string, ecouteur: (...args: unknown[]) => unknown) => {
      ecouteurs.set(canal, ecouteur);
    }),
  },
}));

const { enregistrerHandlersAc056 } = await import('./index');

const PRINCIPALE = { id: 'principale' };
const AUTRE = { id: 'autre' };
const EVENT = { sender: PRINCIPALE };
const HASH = 'a'.repeat(64);

let service: {
  [K in keyof ServiceAc056]: ReturnType<typeof vi.fn<ServiceAc056[K]>>;
};

function appeler(canal: string, ...args: unknown[]): unknown {
  const handler = handlers.get(canal);
  if (!handler) throw new Error(`canal non enregistré : ${canal}`);
  return handler(EVENT, ...args);
}

function envoyer(canal: string, emetteur: unknown, ...args: unknown[]): void {
  const ecouteur = ecouteurs.get(canal);
  if (!ecouteur) throw new Error(`canal non enregistré : ${canal}`);
  ecouteur({ sender: emetteur }, ...args);
}

beforeEach(() => {
  handlers.clear();
  ecouteurs.clear();
  service = {
    lister: vi.fn<ServiceAc056['lister']>(async () => ({ ok: true, in: [], out: [] })),
    ouvrir: vi.fn<ServiceAc056['ouvrir']>(async (emplacement, nom) => ({
      ok: false,
      erreur: { code: 'introuvable', message: `${emplacement}/${nom}` },
    })),
    enregistrer: vi.fn<ServiceAc056['enregistrer']>(async () => ({
      ok: false,
      erreur: { code: 'fichier-modifie', message: 'modifié' },
    })),
    attendreEnregistrement: vi.fn<ServiceAc056['attendreEnregistrement']>(async () => undefined),
    signalerModifications: vi.fn<ServiceAc056['signalerModifications']>(),
    fichierModifie: vi.fn<ServiceAc056['fichierModifie']>(() => null),
  };
  enregistrerHandlersAc056({
    service,
    estEmetteurAutorise: (emetteur) => (emetteur as unknown) === PRINCIPALE,
  });
});

describe('enregistrerHandlersAc056 — enregistrement', () => {
  it('enregistre les canaux ac056:*', () => {
    expect([...handlers.keys()].sort()).toEqual([
      'ac056:enregistrer',
      'ac056:lister',
      'ac056:ouvrir',
    ]);
    expect([...ecouteurs.keys()]).toEqual(['ac056:modifications']);
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

describe('ac056:enregistrer', () => {
  const demande = {
    emplacement: 'in',
    nom: 'AC056COUR_20261014.txt',
    empreinte: HASH,
    corrections: [{ ligne: 12, champ: 'nom', texte: 'X' }],
  };

  it('transmet la demande validée au service et renvoie son résultat', async () => {
    const resultat = await appeler('ac056:enregistrer', demande);

    expect(service.enregistrer).toHaveBeenCalledWith(demande);
    expect(resultat).toMatchObject({ ok: false, erreur: { code: 'fichier-modifie' } });
  });

  it('accepte une liste de corrections vide', async () => {
    await appeler('ac056:enregistrer', { ...demande, corrections: [] });

    expect(service.enregistrer).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['une autre page', { sender: AUTRE }],
    ['un émetteur absent', { sender: undefined }],
  ])('refuse %s : erreur générique, ni validation ni service', async (_cas, evenement) => {
    const handler = handlers.get('ac056:enregistrer');
    if (!handler) throw new Error('canal non enregistré');

    // Même une demande invalide reçoit l'erreur générique : l'émetteur est contrôlé en premier
    for (const entree of [demande, 'invalide']) {
      expect(await handler(evenement, entree)).toEqual({
        ok: false,
        erreur: { code: 'erreur-systeme', message: 'erreur système inattendue' },
      });
    }
    expect(service.enregistrer).not.toHaveBeenCalled();
  });

  it.each([
    ['emplacement journal', { ...demande, emplacement: 'journal' }],
    ['nom avec barre oblique', { ...demande, nom: 'sous/a.txt' }],
    ['empreinte trop courte', { ...demande, empreinte: 'abc' }],
    ['empreinte en majuscules', { ...demande, empreinte: 'A'.repeat(64) }],
    ['empreinte manquante', { emplacement: 'in', nom: 'a.txt', corrections: [] }],
    ['corrections manquantes', { emplacement: 'in', nom: 'a.txt', empreinte: HASH }],
    [
      'correction à la ligne 0',
      { ...demande, corrections: [{ ligne: 0, champ: 'nom', texte: '' }] },
    ],
    ['champ invalide', { ...demande, corrections: [{ ligne: 1, champ: '../x', texte: '' }] }],
    [
      'texte trop long',
      { ...demande, corrections: [{ ligne: 1, champ: 'nom', texte: 'a'.repeat(701) }] },
    ],
    [
      'correction en double',
      {
        ...demande,
        corrections: [
          { ligne: 1, champ: 'nom', texte: 'a' },
          { ligne: 1, champ: 'nom', texte: 'b' },
        ],
      },
    ],
    ['clé en trop', { ...demande, chemin: 'C:\\x' }],
    ['chaîne', 'in/a.txt'],
    ['null', null],
    ['absence d’argument', undefined],
  ])('rejette une entrée invalide (%s) sans appeler le service', (_cas, entree) => {
    expect(() => appeler('ac056:enregistrer', entree)).toThrow();
    expect(service.enregistrer).not.toHaveBeenCalled();
  });
});

describe('ac056:modifications', () => {
  it.each([
    ['in', 'a.txt'],
    ['out', 'b.TXT'],
  ])('transmet le fichier %s/%s signalé par la fenêtre principale', (emplacement, nom) => {
    envoyer('ac056:modifications', PRINCIPALE, { fichier: { emplacement, nom } });

    expect(service.signalerModifications).toHaveBeenCalledWith({ emplacement, nom });
  });

  it('transmet null : plus aucune correction non enregistrée', () => {
    envoyer('ac056:modifications', PRINCIPALE, { fichier: null });

    expect(service.signalerModifications).toHaveBeenCalledWith(null);
  });

  it('ignore un émetteur autre que la fenêtre principale', () => {
    envoyer('ac056:modifications', AUTRE, { fichier: { emplacement: 'in', nom: 'a.txt' } });
    envoyer('ac056:modifications', undefined, { fichier: null });

    expect(service.signalerModifications).not.toHaveBeenCalled();
  });

  it.each([
    ['fichier manquant', {}],
    ['emplacement journal', { fichier: { emplacement: 'journal', nom: 'a.txt' } }],
    ['nom avec barre oblique inverse', { fichier: { emplacement: 'in', nom: 'x\\a.txt' } }],
    ['mauvaise extension', { fichier: { emplacement: 'in', nom: 'a.csv' } }],
    ['clé en trop', { fichier: null, chemin: 'C:\\x' }],
    ['chaîne', 'a.txt'],
    ['null', null],
    ['absence d’argument', undefined],
  ])('ignore une entrée invalide (%s) sans lever ni appeler le service', (_cas, entree) => {
    expect(() => envoyer('ac056:modifications', PRINCIPALE, entree)).not.toThrow();
    expect(service.signalerModifications).not.toHaveBeenCalled();
  });
});
