import { describe, expect, it } from 'vitest';
import { trouverCopiesConflit } from './conflits';

const copiesDe = (...noms: string[]): string[] => [...trouverCopiesConflit(noms)].sort();

describe('trouverCopiesConflit — copies marquées', () => {
  it.each(['rapport-PC042.txt', 'rapport-PC042-2.txt'])(
    'marque %s quand rapport.txt existe',
    (copie) => {
      expect(copiesDe('rapport.txt', copie)).toEqual([copie]);
    },
  );

  it('ne marque jamais l’original', () => {
    expect(copiesDe('rapport.txt', 'rapport-PC042.txt')).not.toContain('rapport.txt');
  });

  it('marque une copie dont la base contient des tirets', () => {
    expect(copiesDe('mon-rapport.txt', 'mon-rapport-PC042.txt')).toEqual(['mon-rapport-PC042.txt']);
  });

  it('ignore la casse et garde le nom tel qu’il figure dans la liste', () => {
    expect(copiesDe('rapport.txt', 'RAPPORT-pc042.TXT')).toEqual(['RAPPORT-pc042.TXT']);
  });

  it('marque une copie d’un fichier sans extension', () => {
    expect(copiesDe('notes', 'notes-PC042')).toEqual(['notes-PC042']);
  });

  it('marque une copie dont le radical commence par un tiret', () => {
    expect(copiesDe('-a.txt', '-a-PC042.txt')).toEqual(['-a-PC042.txt']);
  });

  it('marque plusieurs copies du même original', () => {
    expect(copiesDe('rapport.txt', 'rapport-PC042.txt', 'rapport-PC043.txt')).toEqual([
      'rapport-PC042.txt',
      'rapport-PC043.txt',
    ]);
  });
});

describe('trouverCopiesConflit — noms non marqués', () => {
  it('ne marque pas une copie sans original', () => {
    expect(copiesDe('rapport-PC042.txt')).toEqual([]);
  });

  it('ne marque pas un suffixe de date à côté de l’original (poste sans lettre)', () => {
    expect(copiesDe('Rejets.txt', 'Rejets-20261014.txt', 'Rejets-20261014-2.txt')).toEqual([]);
  });

  it('ne marque pas un poste de plus de 15 caractères', () => {
    expect(copiesDe('rapport.txt', 'rapport-ABCDEFGHIJKLMNOP.txt')).toEqual([]);
  });

  it('marque un poste de 15 caractères exactement', () => {
    expect(copiesDe('rapport.txt', 'rapport-ABCDEFGHIJKLMNO.txt')).toEqual([
      'rapport-ABCDEFGHIJKLMNO.txt',
    ]);
  });

  it('ne marque pas un journal Flussi à côté du journal Lazarus (point dans la suite)', () => {
    expect(copiesDe('20261014-091500.txt', '20261014-091500-c.mathevon.txt')).toEqual([]);
  });

  it('ne marque pas une extension différente', () => {
    expect(copiesDe('rapport.txt', 'rapport-PC042.log')).toEqual([]);
  });

  it('renvoie un ensemble vide pour une liste vide', () => {
    expect(copiesDe()).toEqual([]);
  });
});
