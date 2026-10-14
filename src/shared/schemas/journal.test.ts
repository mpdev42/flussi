import { describe, expect, it } from 'vitest';
import {
  analyserNomSession,
  anneeMoisSchema,
  cheminSessionSchema,
  NOM_SESSION_JOURNAL,
} from './journal';

describe('NOM_SESSION_JOURNAL', () => {
  it.each([
    '20261014-091500-c.mathevon.txt',
    '20261014-091500-jean-dupont.txt',
    '20261014-091500-Jean Dupont.txt',
    '20261014-091500-inconnu.txt',
    '20260101-000000-a.txt',
    '20261231-235959-a.txt',
  ])('accepte %j', (nom) => {
    expect(NOM_SESSION_JOURNAL.test(nom)).toBe(true);
  });

  it.each([
    ['mois 00', '20260014-091500-a.txt'],
    ['mois 13', '20261314-091500-a.txt'],
    ['jour 00', '20261000-091500-a.txt'],
    ['jour 32', '20261032-091500-a.txt'],
    ['heure 24', '20261014-240000-a.txt'],
    ['minute 60', '20261014-096000-a.txt'],
    ['seconde 60', '20261014-091560-a.txt'],
  ])('refuse une date ou une heure hors bornes (%s)', (_cas, nom) => {
    expect(NOM_SESSION_JOURNAL.test(nom)).toBe(false);
  });

  it('refuse le journal Lazarus sans compte', () => {
    expect(NOM_SESSION_JOURNAL.test('20261014-091500.txt')).toBe(false);
  });

  it('refuse l’extension en majuscules', () => {
    expect(NOM_SESSION_JOURNAL.test('20261014-091500-c.mathevon.TXT')).toBe(false);
  });

  it('refuse un compte vide', () => {
    expect(NOM_SESSION_JOURNAL.test('20261014-091500-.txt')).toBe(false);
  });

  it.each(['20261014-091500-a/b.txt', '20261014-091500-a\\b.txt'])(
    'refuse un compte contenant une barre oblique (%j)',
    (nom) => {
      expect(NOM_SESSION_JOURNAL.test(nom)).toBe(false);
    },
  );
});

describe('analyserNomSession', () => {
  it('extrait la date, l’heure et le compte', () => {
    expect(analyserNomSession('20261014-091507-c.mathevon.txt')).toEqual({
      date: '2026-10-14',
      heure: '09:15:07',
      compte: 'c.mathevon',
    });
  });

  it('garde le tiret et l’espace du compte', () => {
    expect(analyserNomSession('20260102-030405-Jean-Pierre Dupont.txt')).toEqual({
      date: '2026-01-02',
      heure: '03:04:05',
      compte: 'Jean-Pierre Dupont',
    });
  });

  it.each(['20261014-091500.txt', '20261314-091500-a.txt', 'notes.txt', ''])(
    'renvoie null pour %j',
    (nom) => {
      expect(analyserNomSession(nom)).toBeNull();
    },
  );
});

describe('anneeMoisSchema', () => {
  it('accepte une année et un mois valides', () => {
    expect(anneeMoisSchema.parse({ annee: '2026', mois: '10' })).toEqual({
      annee: '2026',
      mois: '10',
    });
  });

  it.each(['01', '12'])('accepte le mois %s', (mois) => {
    expect(anneeMoisSchema.safeParse({ annee: '2026', mois }).success).toBe(true);
  });

  it.each(['13', '00', '1', '001', 'ab', ''])('refuse le mois %j', (mois) => {
    expect(anneeMoisSchema.safeParse({ annee: '2026', mois }).success).toBe(false);
  });

  it.each(['26', '20266', 'abcd', ''])('refuse l’année %j', (annee) => {
    expect(anneeMoisSchema.safeParse({ annee, mois: '10' }).success).toBe(false);
  });

  it('refuse une clé en trop', () => {
    expect(anneeMoisSchema.safeParse({ annee: '2026', mois: '10', chemin: '..' }).success).toBe(
      false,
    );
  });

  it('refuse une clé manquante ou une valeur qui n’est pas un objet', () => {
    expect(anneeMoisSchema.safeParse({ annee: '2026' }).success).toBe(false);
    expect(anneeMoisSchema.safeParse('2026/10').success).toBe(false);
    expect(anneeMoisSchema.safeParse(undefined).success).toBe(false);
  });
});

describe('cheminSessionSchema', () => {
  it.each(['2026/10/20261014-091500-c.mathevon.txt', '2026/01/20260101-000000-Jean Dupont.txt'])(
    'accepte %j',
    (chemin) => {
      expect(cheminSessionSchema.safeParse(chemin).success).toBe(true);
    },
  );

  it.each([
    ['segment ..', '../x'],
    ['segment .. au milieu', '2026/../20261014-091500-a.txt'],
    ['chemin absolu Windows', 'C:\\Windows\\20261014-091500-a.txt'],
    ['chemin absolu avec barre oblique', '/2026/10/20261014-091500-a.txt'],
    ['barres obliques inverses', '2026\\10\\20261014-091500-a.txt'],
    ['nom hors format', '2026/10/notes.txt'],
    ['journal Lazarus', '2026/10/20261014-091500.txt'],
    ['mois 13', '2026/13/20261014-091500-a.txt'],
    ['mois 00', '2026/00/20261014-091500-a.txt'],
    ['mois sur un chiffre', '2026/1/20261014-091500-a.txt'],
    ['sous-dossier en trop', '2026/10/sous/20261014-091500-a.txt'],
    ['compte avec barre oblique', '2026/10/20261014-091500-a/b.txt'],
    ['chaîne vide', ''],
  ])('refuse %s', (_cas, chemin) => {
    expect(cheminSessionSchema.safeParse(chemin).success).toBe(false);
  });

  it('refuse une valeur qui n’est pas une chaîne', () => {
    expect(cheminSessionSchema.safeParse(42).success).toBe(false);
    expect(cheminSessionSchema.safeParse(null).success).toBe(false);
  });
});
