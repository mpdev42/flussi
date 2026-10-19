import { describe, expect, it } from 'vitest';
import { emplacementAc056Schema, EMPLACEMENTS_AC056, fichierAc056Schema } from './ac056';

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
