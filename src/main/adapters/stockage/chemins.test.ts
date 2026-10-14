import { describe, expect, it } from 'vitest';
import { decouperCheminRelatif } from './chemins';

function raisonDe(nom: string): string {
  const resultat = decouperCheminRelatif(nom);
  if (resultat.ok) throw new Error(`acceptation inattendue de ${JSON.stringify(nom)}`);
  return resultat.raison;
}

describe('decouperCheminRelatif — noms acceptés', () => {
  it.each([
    ['a.txt', ['a.txt']],
    ['2026/10/x.txt', ['2026', '10', 'x.txt']],
    ['2026\\10\\x.txt', ['2026', '10', 'x.txt']],
    ['2026/10\\x.txt', ['2026', '10', 'x.txt']],
    ['CONSOLE.txt', ['CONSOLE.txt']],
    ['NULLE.txt', ['NULLE.txt']],
    ['COM10.txt', ['COM10.txt']],
    ['.gitkeep', ['.gitkeep']],
    ['a b.txt', ['a b.txt']],
  ])('accepte %j', (nom, segments) => {
    expect(decouperCheminRelatif(nom)).toEqual({ ok: true, segments });
  });
});

describe('decouperCheminRelatif — noms refusés', () => {
  it('refuse le nom vide', () => {
    expect(raisonDe('')).toBe('nom vide interdit');
  });

  it.each(['C:\\x', 'C:x', 'c:/x', '\\\\serveur\\partage\\x', '/x', '\\x'])(
    'refuse le chemin absolu %j',
    (nom) => {
      expect(raisonDe(nom)).toBe('chemin absolu interdit');
    },
  );

  it.each(['a//b', 'a/', 'a\\\\b', 'a/b/'])('refuse le segment vide de %j', (nom) => {
    expect(raisonDe(nom)).toBe('segment vide interdit');
  });

  it.each([
    ['a/../b', '..'],
    ['..', '..'],
    ['a/..', '..'],
    ['./a', '.'],
    ['a/./b', '.'],
    ['.', '.'],
  ])('refuse le segment « . » ou « .. » de %j', (nom, segment) => {
    expect(raisonDe(nom)).toBe(`segment « ${segment} » interdit`);
  });

  it.each(['fichier:flux', 'a<b', 'a>b', 'a"b', 'a|b', 'a?b', 'a*b', 'dossier/fichier:flux'])(
    'refuse le caractère interdit de %j',
    (nom) => {
      expect(raisonDe(nom)).toContain('caractère interdit');
    },
  );

  it.each(['a\nb', '\t', '\0', 'a\rb', 'a\u001fb', 'dossier/\nx'])(
    'refuse le caractère de contrôle de %j',
    (nom) => {
      expect(raisonDe(nom)).toContain('caractère interdit');
    },
  );

  it.each(['a.', 'a ', 'dossier./x', 'dossier /x', 'a.txt.'])(
    'refuse le point ou l’espace final de %j',
    (nom) => {
      expect(raisonDe(nom)).toBe('un nom ne peut pas se terminer par un point ou une espace');
    },
  );

  it.each([
    'CON',
    'con',
    'Prn',
    'AUX',
    'nul.txt',
    'NUL.TXT',
    'COM1',
    'com9.txt',
    'lpt9.log',
    'LPT1',
    'NUL .txt',
    'dossier/CON',
    'CON/fichier.txt',
    'a.b/nul.tar.gz',
  ])('refuse le nom réservé %j', (nom) => {
    expect(raisonDe(nom)).toBe('nom réservé par Windows');
  });
});
