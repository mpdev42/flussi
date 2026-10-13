import { describe, expect, it } from 'vitest';
import { addCharR, strToIntFpc, trimFpc } from './fpc';
import { octetsDepuisTexte } from './octets';
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

describe('strToIntFpc', () => {
  it.each([
    ['01', 1],
    [' 5', 5],
    ['\t5', 5],
    ['  \t 12', 12],
    ['+5', 5],
    ['-1', -1],
    ['00', 0],
    ['0', 0],
    ['-0', 0],
    ['99', 99],
    ['5\x00', 5],
    ['5\x00X', 5],
    ['0\x00', 0],
    ['00\x00', 0],
  ])('lit %j comme %j', (texte, attendu) => {
    expect(strToIntFpc(binaire(texte))).toBe(attendu);
  });

  it.each([
    ['$A', 10],
    ['$a', 10],
    ['$1F', 31],
    ['xF', 15],
    ['XF', 15],
    ['0x1F', 31],
    ['0X1F', 31],
    ['%1', 1],
    ['%101', 5],
    ['&7', 7],
    ['&17', 15],
    ['-$A', -10],
  ])('lit le préfixe de base de %j comme %j', (texte, attendu) => {
    expect(strToIntFpc(binaire(texte))).toBe(attendu);
  });

  it.each([
    [''],
    ['  '],
    ['\t'],
    ['5 '],
    ['5\t'],
    ['0x'],
    ['-'],
    ['+'],
    ['$'],
    ['%'],
    ['&'],
    ['\x00\x00'],
    ['\x00'],
    [' \x00'],
    ['-\x00'],
    ['AB'],
    ['1A'],
    ['%2'],
    ['&8'],
    ['$G'],
    ['5X'],
    ['1 2'],
    ['--1'],
    ['+-1'],
    ['- 1'],
    ['1,5'],
    ['1.5'],
    [' ' + '5'],
  ])('refuse %j', (texte) => {
    expect(strToIntFpc(binaire(texte))).toBeNull();
  });

  it('refuse un caractère accentué encodé en UTF-8', () => {
    expect(strToIntFpc(octetsDepuisTexte('é'))).toBeNull();
  });

  it('lit jusqu aux bornes d un entier 32 bits signé', () => {
    expect(strToIntFpc(binaire('2147483647'))).toBe(2147483647);
    expect(strToIntFpc(binaire('-2147483648'))).toBe(-2147483648);
    expect(strToIntFpc(binaire('2147483648'))).toBeNull();
    expect(strToIntFpc(binaire('-2147483649'))).toBeNull();
    expect(strToIntFpc(binaire('99999999999999999999'))).toBeNull();
  });

  it('retire les zéros de tête sans changer la valeur', () => {
    expect(strToIntFpc(binaire('000000000012'))).toBe(12);
    expect(strToIntFpc(binaire('-007'))).toBe(-7);
  });
});
