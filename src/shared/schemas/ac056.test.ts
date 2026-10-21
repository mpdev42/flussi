import { describe, expect, it } from 'vitest';
import {
  correctionAc056Schema,
  emplacementAc056Schema,
  EMPLACEMENTS_AC056,
  enregistrementAc056Schema,
  fichierAc056Schema,
  modificationsAc056Schema,
} from './ac056';

describe('emplacementAc056Schema', () => {
  it('accepte in et out seulement', () => {
    expect(EMPLACEMENTS_AC056).toEqual(['in', 'out']);
    expect(emplacementAc056Schema.safeParse('in').success).toBe(true);
    expect(emplacementAc056Schema.safeParse('out').success).toBe(true);
  });

  it.each(['journal', 'IN', '', 'travail', 1, null, undefined])('refuse %j', (valeur) => {
    expect(emplacementAc056Schema.safeParse(valeur).success).toBe(false);
  });
});

describe('fichierAc056Schema', () => {
  it.each([
    'AC056COUR_20261014.txt',
    'AC056COUR_REJ_20261014.TXT',
    'fichier.Txt',
    'avec espace et accent é.txt',
    'a.b.txt',
    '.txt',
    'a..txt',
    'AC056COUR_20261014..txt',
  ])('accepte le nom %j', (nom) => {
    expect(fichierAc056Schema.parse({ emplacement: 'in', nom })).toEqual({
      emplacement: 'in',
      nom,
    });
  });

  it.each([
    ['nom vide', ''],
    ['barre oblique', 'sous/fichier.txt'],
    ['barre oblique inverse', 'sous\\fichier.txt'],
    ['deux-points', 'C:fichier.txt'],
    ['chemin absolu', 'C:\\Windows\\fichier.txt'],
    ['chemin réseau', '\\\\serveur\\partage\\fichier.txt'],
    ['remontée (refusée par le séparateur)', '..\\x.txt'],
    ['remontée avec barre oblique', '../x.txt'],
    ['caractère de contrôle (NUL)', 'fichier\u0000.txt'],
    ['caractère de contrôle (retour chariot)', 'fichier\r.txt'],
    ['caractère de contrôle (DEL)', 'fichier\u007f.txt'],
    ['caractère interdit sous Windows', 'fich*ier.txt'],
    ['mauvaise extension', 'fichier.csv'],
    ['sans extension', 'fichier'],
    ['extension suivie d’un espace', 'fichier.txt '],
    ['trop long', 'a'.repeat(252) + '.txt'],
  ])('refuse %s', (_cas, nom) => {
    expect(fichierAc056Schema.safeParse({ emplacement: 'in', nom }).success).toBe(false);
  });

  it('accepte la longueur maximale', () => {
    const nom = 'a'.repeat(251) + '.txt';
    expect(fichierAc056Schema.safeParse({ emplacement: 'out', nom }).success).toBe(true);
  });

  it.each([
    ['emplacement journal', { emplacement: 'journal', nom: 'a.txt' }],
    ['emplacement manquant', { nom: 'a.txt' }],
    ['nom manquant', { emplacement: 'in' }],
    ['clé en trop', { emplacement: 'in', nom: 'a.txt', chemin: 'C:\\x' }],
    ['chaîne', 'in/a.txt'],
    ['null', null],
    ['absence d’argument', undefined],
  ])('refuse %s', (_cas, entree) => {
    expect(fichierAc056Schema.safeParse(entree).success).toBe(false);
  });
});

describe('correctionAc056Schema', () => {
  const correction = { ligne: 3, champ: 'Nom', texte: 'DUPONT' };

  it('accepte une correction valide, texte vide compris', () => {
    expect(correctionAc056Schema.parse(correction)).toEqual(correction);
    expect(correctionAc056Schema.safeParse({ ...correction, texte: '' }).success).toBe(true);
  });

  it.each([
    ['ligne 0', { ligne: 0 }],
    ['ligne décimale', { ligne: 1.5 }],
    ['ligne trop grande', { ligne: 1_000_001 }],
    ['ligne texte', { ligne: '3' }],
    ['champ vide', { champ: '' }],
    ['champ commençant par un chiffre', { champ: '1Nom' }],
    ['champ avec un tiret', { champ: 'Nom-x' }],
    ['champ trop long', { champ: 'A'.repeat(65) }],
    ['texte trop long', { texte: 'x'.repeat(701) }],
    ['texte non chaîne', { texte: 12 }],
    ['clé en trop', { valeur: 'x' }],
  ])('refuse %s', (_cas, ecart) => {
    expect(correctionAc056Schema.safeParse({ ...correction, ...ecart }).success).toBe(false);
  });

  it('accepte les bornes', () => {
    expect(
      correctionAc056Schema.safeParse({ ligne: 1, champ: 'A', texte: 'x'.repeat(700) }).success,
    ).toBe(true);
    expect(
      correctionAc056Schema.safeParse({ ligne: 1_000_000, champ: 'A'.repeat(64), texte: '' })
        .success,
    ).toBe(true);
  });
});

describe('enregistrementAc056Schema', () => {
  const empreinte = 'a'.repeat(64);
  const demande = {
    emplacement: 'in',
    nom: 'AC056COUR_20261014.txt',
    empreinte,
    corrections: [{ ligne: 2, champ: 'Nom', texte: 'DUPONT' }],
  };

  it('accepte une demande valide, sans correction comprise', () => {
    expect(enregistrementAc056Schema.parse(demande)).toEqual(demande);
    expect(enregistrementAc056Schema.safeParse({ ...demande, corrections: [] }).success).toBe(true);
  });

  it('accepte le même champ sur deux lignes et deux champs sur la même ligne', () => {
    const corrections = [
      { ligne: 2, champ: 'Nom', texte: 'A' },
      { ligne: 3, champ: 'Nom', texte: 'B' },
      { ligne: 2, champ: 'Prenom', texte: 'C' },
    ];
    expect(enregistrementAc056Schema.safeParse({ ...demande, corrections }).success).toBe(true);
  });

  it('accepte 10 000 corrections et refuse 10 001', () => {
    const faire = (n: number) =>
      Array.from({ length: n }, (_v, i) => ({ ligne: i + 1, champ: 'Nom', texte: 'x' }));
    expect(
      enregistrementAc056Schema.safeParse({ ...demande, corrections: faire(10_000) }).success,
    ).toBe(true);
    expect(
      enregistrementAc056Schema.safeParse({ ...demande, corrections: faire(10_001) }).success,
    ).toBe(false);
  });

  it('refuse un couple (ligne, champ) en double', () => {
    const corrections = [
      { ligne: 2, champ: 'Nom', texte: 'A' },
      { ligne: 2, champ: 'Nom', texte: 'B' },
    ];
    expect(enregistrementAc056Schema.safeParse({ ...demande, corrections }).success).toBe(false);
  });

  it.each([
    ['empreinte trop courte', { empreinte: 'a'.repeat(63) }],
    ['empreinte trop longue', { empreinte: 'a'.repeat(65) }],
    ['empreinte en majuscules', { empreinte: 'A'.repeat(64) }],
    ['empreinte non hexadécimale', { empreinte: 'g'.repeat(64) }],
    ['emplacement journal', { emplacement: 'journal' }],
    ['nom avec chemin', { nom: '../x.txt' }],
    ['nom sans extension .txt', { nom: 'fichier.csv' }],
    ['clé en trop', { chemin: 'C:/x' }],
    ['corrections absentes', { corrections: undefined }],
    ['corrections avec clé en trop', { corrections: [{ ligne: 1, champ: 'A', texte: '', x: 1 }] }],
  ])('refuse %s', (_cas, ecart) => {
    expect(enregistrementAc056Schema.safeParse({ ...demande, ...ecart }).success).toBe(false);
  });

  it.each([null, undefined, 'texte'])('refuse %j', (entree) => {
    expect(enregistrementAc056Schema.safeParse(entree).success).toBe(false);
  });
});

describe('modificationsAc056Schema', () => {
  it('accepte un fichier ou null', () => {
    expect(modificationsAc056Schema.parse({ fichier: null })).toEqual({ fichier: null });
    const fichier = { emplacement: 'out', nom: 'AC056COUR_REJ_20261014.txt' };
    expect(modificationsAc056Schema.parse({ fichier })).toEqual({ fichier });
  });

  it.each([
    ['fichier absent', {}],
    ['clé en trop', { fichier: null, autre: 1 }],
    ['nom refusé', { fichier: { emplacement: 'in', nom: '../x.txt' } }],
    ['emplacement refusé', { fichier: { emplacement: 'journal', nom: 'a.txt' } }],
    ['chaîne', 'a.txt'],
    ['undefined', undefined],
  ])('refuse %s', (_cas, entree) => {
    expect(modificationsAc056Schema.safeParse(entree).success).toBe(false);
  });
});
