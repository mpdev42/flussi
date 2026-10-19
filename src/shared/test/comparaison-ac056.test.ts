import { describe, expect, it } from 'vitest';
import type { LigneBrute, LigneDecrite } from '@shared/domain/ac056/modele';
import type { Octets } from '@shared/domain/ac056/octets';
import { enChaineBinaire, enOctetsBruts, ligneSynthetique } from './ac056-synthetique';
import { decrireEcartAc056, empreinteSha256, sansCtrlZFinal } from './comparaison-ac056';

const origine405 = ligneSynthetique('405') as Octets;

const ligne405: LigneDecrite = {
  nature: 'decrite',
  code: '405',
  valeurs: {},
  numero: 2,
  origine: origine405,
  finDeLigne: '\r\n',
};

const ligneBrute: LigneBrute = {
  nature: 'brute',
  code: null,
  numero: 3,
  origine: '    ' as Octets,
  finDeLigne: '',
};

const ligneBruteCourte: LigneBrute = {
  nature: 'brute',
  code: '400',
  numero: 4,
  origine: ligneSynthetique('400').slice(0, 699) as Octets,
  finDeLigne: '',
};

const fichier = { bom: false, lignes: [ligne405, ligneBrute, ligneBruteCourte] };

describe('empreinteSha256', () => {
  it('calcule l empreinte connue de « abc »', () => {
    expect(empreinteSha256(new Uint8Array([0x61, 0x62, 0x63]))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('distingue deux contenus d un octet', () => {
    expect(empreinteSha256(new Uint8Array([1]))).not.toBe(empreinteSha256(new Uint8Array([2])));
  });
});

describe('decrireEcartAc056', () => {
  it('ajoute l entité et le champ pour une ligne de 700 octets', () => {
    // octet 40 de la 405 : dans le champ nom (38 à 87)
    expect(decrireEcartAc056('F.txt', { ligne: 2, octet: 40 }, fichier)).toBe(
      'F.txt : ligne 2, octet 40, entité 405, champ nom',
    );
  });

  it('retire la longueur du BOM sur la première ligne', () => {
    const avecBom = { bom: true, lignes: [{ ...ligne405, numero: 1 }] };
    expect(decrireEcartAc056('F.txt', { ligne: 1, octet: 43 }, avecBom)).toBe(
      'F.txt : ligne 1, octet 43, entité 405, champ nom',
    );
  });

  it('ne donne que le format de base si la ligne est inconnue', () => {
    expect(decrireEcartAc056('F.txt', { ligne: 9, octet: 1 }, fichier)).toBe(
      'F.txt : ligne 9, octet 1',
    );
  });

  it('ne donne que le format de base pour une ligne sans code', () => {
    expect(decrireEcartAc056('F.txt', { ligne: 3, octet: 1 }, fichier)).toBe(
      'F.txt : ligne 3, octet 1',
    );
  });

  it('ne donne que l entité pour une ligne qui ne fait pas 700 octets', () => {
    expect(decrireEcartAc056('F.txt', { ligne: 4, octet: 40 }, fichier)).toBe(
      'F.txt : ligne 4, octet 40, entité 400',
    );
  });

  it('ne donne que l entité pour un octet au-delà de la ligne (fin de ligne)', () => {
    expect(decrireEcartAc056('F.txt', { ligne: 2, octet: 701 }, fichier)).toBe(
      'F.txt : ligne 2, octet 701, entité 405',
    );
  });

  it('ne donne que l entité pour un octet dans le BOM', () => {
    const avecBom = { bom: true, lignes: [{ ...ligne405, numero: 1 }] };
    expect(decrireEcartAc056('F.txt', { ligne: 1, octet: 2 }, avecBom)).toBe(
      'F.txt : ligne 1, octet 2, entité 405',
    );
  });
});

describe('sansCtrlZFinal', () => {
  const retirer = (chaine: string) => enChaineBinaire(sansCtrlZFinal(enOctetsBruts(chaine)));

  it.each([
    ['sans 0x1A', 'A\r\nB', 'A\r\nB'],
    ['un 0x1A après le CRLF final', 'A\r\n\x1A', 'A\r\n'],
    ['un 0x1A collé à la dernière ligne', 'A\x1A', 'A'],
    ['plusieurs 0x1A finaux', 'A\x1A\x1A\x1A', 'A'],
    ['un 0x1A au milieu, gardé', 'A\x1AB', 'A\x1AB'],
    ['un 0x1A au milieu et un final', 'A\x1AB\x1A', 'A\x1AB'],
    ['seulement des 0x1A', '\x1A\x1A', ''],
    ['vide', '', ''],
  ])('%s', (_cas, entree, attendu) => {
    expect(retirer(entree)).toBe(attendu);
  });
});
