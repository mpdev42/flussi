import { describe, expect, it } from 'vitest';
import { addCharR, trimFpc } from './fpc';
import type { Octets } from './octets';

const binaire = (chaine: string) => chaine as Octets;

describe('trimFpc', () => {
  it('retire les espaces en tête et en fin', () => {
    expect(trimFpc(binaire('  DUPONT   '))).toBe('DUPONT');
  });

  it('retire les caractères 0x00 à 0x20 en tête', () => {
    expect(trimFpc(binaire('\x00\x01\x09\x0A\x0D\x1F\x20A'))).toBe('A');
  });

  it('retire les caractères 0x00 à 0x20 en fin', () => {
    expect(trimFpc(binaire('A\x00\x01\x09\x0A\x0D\x1F\x20'))).toBe('A');
  });

  it('retire une tabulation en bord', () => {
    expect(trimFpc(binaire('\tA\t'))).toBe('A');
  });

  it.each([
    ['0x7F', '\x7F'],
    ['0x80', '\x80'],
    ['0xA0', '\xA0'],
    ['0xFF', '\xFF'],
  ])('conserve %s en tête et en fin', (_nom, octet) => {
    expect(trimFpc(binaire(`${octet}A${octet}`))).toBe(`${octet}A${octet}`);
  });

  it('conserve les blancs à l intérieur', () => {
    expect(trimFpc(binaire(' A  B\tC '))).toBe('A  B\tC');
  });

  it('retire les blancs puis s arrête sur un octet à conserver', () => {
    expect(trimFpc(binaire('  \xA0 A \xA0  '))).toBe('\xA0 A \xA0');
  });

  it('renvoie une chaîne vide pour une chaîne vide', () => {
    expect(trimFpc(binaire(''))).toBe('');
  });

  it('renvoie une chaîne vide pour une chaîne uniquement blanche', () => {
    expect(trimFpc(binaire(' \t\x00 \r\n'))).toBe('');
  });

  it('laisse inchangée une valeur sans blanc en bord', () => {
    expect(trimFpc(binaire('DUPONT'))).toBe('DUPONT');
  });
});

describe('addCharR', () => {
  it('bourre à droite avec des espaces', () => {
    expect(addCharR(' ', binaire('AB'), 5)).toBe('AB   ');
  });

  it('bourre à droite avec des zéros', () => {
    expect(addCharR('0', binaire('1'), 2)).toBe('10');
  });

  it('bourre une valeur vide en entier', () => {
    expect(addCharR('0', binaire(''), 4)).toBe('0000');
    expect(addCharR(' ', binaire(''), 3)).toBe('   ');
  });

  it('laisse inchangée une valeur de la longueur demandée', () => {
    expect(addCharR(' ', binaire('ABC'), 3)).toBe('ABC');
  });

  it('ne tronque jamais une valeur plus longue', () => {
    expect(addCharR(' ', binaire('ABCDEF'), 3)).toBe('ABCDEF');
    expect(addCharR('0', binaire('123'), 2)).toBe('123');
  });

  it('ne tronque pas pour une longueur nulle', () => {
    expect(addCharR(' ', binaire('AB'), 0)).toBe('AB');
  });

  it('conserve les blancs et octets de la valeur', () => {
    expect(addCharR(' ', binaire('  A\xFF'), 6)).toBe('  A\xFF  ');
  });
});
