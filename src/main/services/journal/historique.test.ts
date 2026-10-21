import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Stockage } from '../../adapters/stockage';
import type { ElementStockage, ErreurStockage, ResultatStockage } from '@shared/types/stockage';
import { creerHistoriqueJournal } from './historique';

// Faux Stockage en lecture : le contenu de chaque dossier est fourni par le test.

const fichier = (nom: string): ElementStockage => ({
  nom,
  type: 'fichier',
  copieConflitProbable: false,
  taille: 100,
  modification: '2026-10-14T09:15:00.000Z',
});
const dossier = (nom: string): ElementStockage => ({
  nom,
  type: 'dossier',
  copieConflitProbable: false,
  taille: null,
  modification: null,
});

const erreur = (code: ErreurStockage['code']): ErreurStockage => ({
  code,
  emplacement: 'journal',
  chemin: 'P:\\Journal',
  message: 'cause',
});

type Listage = ResultatStockage<ElementStockage[]>;

let listages: Map<string, Listage>;
let fichiers: Map<string, ResultatStockage<Uint8Array>>;
let lister: ReturnType<typeof vi.fn<Stockage['lister']>>;
let lire: ReturnType<typeof vi.fn<Stockage['lire']>>;

function creerHistorique(cheminEnCours = '') {
  const stockage: Stockage = {
    verifierAcces: () => Promise.reject(new Error('non utilisé')),
    ajouter: () => Promise.reject(new Error('non utilisé')),
    ecrire: () => Promise.reject(new Error('non utilisé')),
    lister,
    lire,
  };
  return creerHistoriqueJournal(stockage, cheminEnCours);
}

/** Déclare le contenu d'un dossier du journal (`''` pour la racine). */
function dossierContient(sousDossier: string, elements: ElementStockage[]): void {
  listages.set(sousDossier, { ok: true, valeur: elements });
}

beforeEach(() => {
  listages = new Map();
  fichiers = new Map();
  lister = vi.fn<Stockage['lister']>(async (_emplacement, sousDossier = '') => {
    return (
      listages.get(sousDossier) ?? {
        ok: false,
        erreur: erreur('introuvable'),
      }
    );
  });
  lire = vi.fn<Stockage['lire']>(async (_emplacement, chemin) => {
    return fichiers.get(chemin) ?? { ok: false, erreur: erreur('introuvable') };
  });
});

describe('creerHistoriqueJournal — annees', () => {
  it('garde seulement les dossiers de 4 chiffres, triés par ordre croissant', async () => {
    dossierContient('', [
      dossier('2027'),
      dossier('2025'),
      dossier('2026'),
      dossier('archives'),
      dossier('202'),
      dossier('20266'),
      dossier('abcd'),
    ]);

    const resultat = await creerHistorique().annees();

    expect(resultat).toEqual({ ok: true, valeur: ['2025', '2026', '2027'] });
    expect(lister).toHaveBeenCalledWith('journal');
  });

  it('ignore les fichiers, y compris l’index Lazarus et un fichier nommé comme une année', async () => {
    dossierContient('', [
      fichier('journal.idx'),
      fichier('index.txt'),
      fichier('2024'),
      dossier('2026'),
    ]);

    expect(await creerHistorique().annees()).toEqual({ ok: true, valeur: ['2026'] });
  });

  it('renvoie une liste vide quand le journal est vide', async () => {
    dossierContient('', []);
    expect(await creerHistorique().annees()).toEqual({ ok: true, valeur: [] });
  });

  it('propage l’erreur typée du stockage', async () => {
    listages.set('', { ok: false, erreur: erreur('lecteur-indisponible') });
    expect(await creerHistorique().annees()).toEqual({
      ok: false,
      erreur: erreur('lecteur-indisponible'),
    });
  });
});

describe('creerHistoriqueJournal — sessions', () => {
  it('liste le dossier AAAA/MM du journal', async () => {
    dossierContient('2026/10', []);
    await creerHistorique().sessions('2026', '10');
    expect(lister).toHaveBeenCalledWith('journal', '2026/10');
  });

  it('renvoie une liste vide quand le dossier du mois est absent', async () => {
    // Aucun listage déclaré : le faux stockage répond « introuvable »
    expect(await creerHistorique().sessions('2026', '10')).toEqual({ ok: true, valeur: [] });
  });

  it.each([
    'dossier-absent',
    'lecteur-indisponible',
    'acces-refuse',
    'verrou',
    'erreur-systeme',
  ] as const)('propage l’erreur typée %s', async (code) => {
    listages.set('2026/10', { ok: false, erreur: erreur(code) });
    expect(await creerHistorique().sessions('2026', '10')).toEqual({
      ok: false,
      erreur: erreur(code),
    });
  });

  it('ignore les journaux Lazarus, les fichiers divers et les dossiers', async () => {
    dossierContient('2026/10', [
      fichier('20261014-091500.txt'),
      fichier('20261014-091500.rtf'),
      fichier('notes.txt'),
      fichier('20261014-091500-c.mathevon.TXT'),
      fichier('20261314-091500-c.mathevon.txt'),
      dossier('20261014-091600-dossier.txt'),
      fichier('20261014-091700-c.mathevon.txt'),
    ]);

    const resultat = await creerHistorique().sessions('2026', '10');

    expect(resultat.ok && resultat.valeur.map((s) => s.chemin)).toEqual([
      '2026/10/20261014-091700-c.mathevon.txt',
    ]);
  });

  it('remplit chemin, date, heure, compte, enCours et copieConflitProbable', async () => {
    dossierContient('2026/10', [fichier('20261014-091507-c.mathevon.txt')]);

    const resultat = await creerHistorique().sessions('2026', '10');

    expect(resultat).toEqual({
      ok: true,
      valeur: [
        {
          chemin: '2026/10/20261014-091507-c.mathevon.txt',
          date: '2026-10-14',
          heure: '09:15:07',
          compte: 'c.mathevon',
          enCours: false,
          copieConflitProbable: false,
        },
      ],
    });
  });

  it('ne marque PAS le journal Flussi comme copie du journal Lazarus voisin', async () => {
    dossierContient('2026/10', [
      fichier('20261014-091500.txt'),
      fichier('20261014-091500-cmathevon.txt'),
    ]);

    const resultat = await creerHistorique().sessions('2026', '10');

    expect(resultat).toMatchObject({
      ok: true,
      valeur: [{ compte: 'cmathevon', copieConflitProbable: false }],
    });
  });

  it('ne marque pas non plus un compte avec point à côté du journal Lazarus', async () => {
    dossierContient('2026/10', [
      fichier('20261014-091500.txt'),
      fichier('20261014-091500-c.mathevon.txt'),
    ]);

    const resultat = await creerHistorique().sessions('2026', '10');

    expect(resultat).toMatchObject({ ok: true, valeur: [{ copieConflitProbable: false }] });
  });

  it('marque la vraie copie de conflit à côté de la session d’origine', async () => {
    dossierContient('2026/10', [
      fichier('20261014-091500-c.mathevon.txt'),
      fichier('20261014-091500-c.mathevon-PC123.txt'),
    ]);

    const resultat = await creerHistorique().sessions('2026', '10');

    if (!resultat.ok) throw new Error('échec inattendu');
    const parNom = Object.fromEntries(
      resultat.valeur.map((s) => [s.chemin, s.copieConflitProbable]),
    );
    expect(parNom).toEqual({
      '2026/10/20261014-091500-c.mathevon.txt': false,
      '2026/10/20261014-091500-c.mathevon-PC123.txt': true,
    });
  });

  it('ne marque pas une copie probable sans le fichier d’origine', async () => {
    dossierContient('2026/10', [fichier('20261014-091500-c.mathevon-PC123.txt')]);

    const resultat = await creerHistorique().sessions('2026', '10');

    expect(resultat).toMatchObject({ ok: true, valeur: [{ copieConflitProbable: false }] });
  });

  it('trie de la plus récente à la plus ancienne : date puis heure', async () => {
    dossierContient('2026/10', [
      fichier('20261003-180000-a.txt'),
      fichier('20261014-091500-a.txt'),
      fichier('20261014-170000-a.txt'),
      fichier('20261003-080000-a.txt'),
    ]);

    const resultat = await creerHistorique().sessions('2026', '10');

    expect(resultat.ok && resultat.valeur.map((s) => `${s.date} ${s.heure}`)).toEqual([
      '2026-10-14 17:00:00',
      '2026-10-14 09:15:00',
      '2026-10-03 18:00:00',
      '2026-10-03 08:00:00',
    ]);
  });

  it('trie à date et heure égales par compte alphabétique', async () => {
    dossierContient('2026/10', [
      fichier('20261014-091500-zoe.txt'),
      fichier('20261014-091500-alice.txt'),
    ]);

    const resultat = await creerHistorique().sessions('2026', '10');

    expect(resultat.ok && resultat.valeur.map((s) => s.compte)).toEqual(['alice', 'zoe']);
  });

  it('place la session en cours en tête, même si une autre est plus récente', async () => {
    dossierContient('2026/10', [
      fichier('20261020-100000-autre.txt'),
      fichier('20261014-091500-c.mathevon.txt'),
      fichier('20261015-100000-autre.txt'),
    ]);

    const resultat = await creerHistorique('2026/10/20261014-091500-c.mathevon.txt').sessions(
      '2026',
      '10',
    );

    if (!resultat.ok) throw new Error('échec inattendu');
    expect(resultat.valeur.map((s) => [s.chemin, s.enCours])).toEqual([
      ['2026/10/20261014-091500-c.mathevon.txt', true],
      ['2026/10/20261020-100000-autre.txt', false],
      ['2026/10/20261015-100000-autre.txt', false],
    ]);
  });

  it('ne marque aucune session en cours si elle est dans un autre mois', async () => {
    dossierContient('2026/10', [fichier('20261014-091500-c.mathevon.txt')]);

    const resultat = await creerHistorique('2026/11/20261114-091500-c.mathevon.txt').sessions(
      '2026',
      '10',
    );

    expect(resultat).toMatchObject({ ok: true, valeur: [{ enCours: false }] });
  });
});

describe('creerHistoriqueJournal — lire', () => {
  const CHEMIN = '2026/10/20261014-091500-c.mathevon.txt';

  it('renvoie les lignes analysées du fichier', async () => {
    fichiers.set(CHEMIN, {
      ok: true,
      valeur: new TextEncoder().encode(
        '09:15:00\tTITRE\tDébut de session\r\nligne libre\r\n09:15:01\tERREUR\tÉchec\r\n',
      ),
    });

    const resultat = await creerHistorique().lire(CHEMIN);

    expect(resultat).toEqual({
      ok: true,
      valeur: [
        { heure: '09:15:00', niveau: 'TITRE', message: 'Début de session' },
        { heure: null, niveau: null, message: 'ligne libre' },
        { heure: '09:15:01', niveau: 'ERREUR', message: 'Échec' },
      ],
    });
    expect(lire).toHaveBeenCalledWith('journal', CHEMIN);
  });

  it('propage l’erreur typée du stockage', async () => {
    fichiers.set(CHEMIN, { ok: false, erreur: erreur('acces-refuse') });
    expect(await creerHistorique().lire(CHEMIN)).toEqual({
      ok: false,
      erreur: erreur('acces-refuse'),
    });
  });

  it('propage introuvable pour un fichier absent', async () => {
    const resultat = await creerHistorique().lire(CHEMIN);
    expect(resultat.ok).toBe(false);
    expect(!resultat.ok && resultat.erreur.code).toBe('introuvable');
  });
});
