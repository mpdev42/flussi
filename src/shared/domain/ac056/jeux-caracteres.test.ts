// Jeux de caractères de `uconstantes.pas` : appartenance vérifiée octet par octet (0x00 à 0xFF)
// contre des listes écrites en clair, indépendantes du code testé.
import { describe, expect, it } from 'vitest';
import {
  estOctetInterdit,
  estTexteValide,
  JEU_LISTE_1,
  JEU_LISTE_2,
  JEU_LISTE_3,
  JEU_NUMERIQUE,
  type JeuCaracteres,
} from './jeux-caracteres';
import type { Octets } from './octets';

const binaire = (chaine: string) => chaine as Octets;

const CHIFFRES = '0123456789';
const MAJUSCULES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const MINUSCULES = 'abcdefghijklmnopqrstuvwxyz';

/** Octets (0 à 255) du jeu, sous forme de chaîne triée. */
function octetsDuJeu(jeu: JeuCaracteres): string {
  let octets = '';
  for (let o = 0; o <= 0xff; o++) if (jeu.has(o)) octets += String.fromCharCode(o);
  return octets;
}

const trier = (caracteres: string) =>
  [...caracteres].sort((a, b) => a.charCodeAt(0) - b.charCodeAt(0)).join('');

describe('jeux de caractères', () => {
  it('NUMERIQUE : les chiffres', () => {
    expect(octetsDuJeu(JEU_NUMERIQUE)).toBe(CHIFFRES);
  });

  it('LISTE_3 : les chiffres et les majuscules', () => {
    expect(octetsDuJeu(JEU_LISTE_3)).toBe(trier(CHIFFRES + MAJUSCULES));
  });

  it('LISTE_1 : LISTE_3, espace, tiret, apostrophe, barre oblique et point', () => {
    expect(octetsDuJeu(JEU_LISTE_1)).toBe(trier(CHIFFRES + MAJUSCULES + " -'/."));
  });

  it('LISTE_2 : LISTE_1, minuscules, tiret bas et arobase', () => {
    expect(octetsDuJeu(JEU_LISTE_2)).toBe(
      trier(CHIFFRES + MAJUSCULES + " -'/." + MINUSCULES + '_@'),
    );
  });

  it.each([
    ['NUMERIQUE', JEU_NUMERIQUE, 10],
    ['LISTE_3', JEU_LISTE_3, 36],
    ['LISTE_1', JEU_LISTE_1, 41],
    ['LISTE_2', JEU_LISTE_2, 69],
  ])('%s contient %i octets', (_nom, jeu, taille) => {
    expect(jeu.size).toBe(taille);
  });

  it('aucun jeu ne contient un octet de 0x80 à 0xFF ni un octet de contrôle', () => {
    for (const jeu of [JEU_NUMERIQUE, JEU_LISTE_1, JEU_LISTE_2, JEU_LISTE_3]) {
      for (let o = 0; o < 0x20; o++) expect(jeu.has(o)).toBe(false);
      for (let o = 0x7f; o <= 0xff; o++) expect(jeu.has(o)).toBe(false);
    }
  });
});

describe('estTexteValide', () => {
  it('accepte une valeur vide', () => {
    expect(estTexteValide(binaire(''), JEU_NUMERIQUE)).toBe(true);
  });

  it('accepte une valeur dont tous les octets sont dans le jeu', () => {
    expect(estTexteValide(binaire("DE L'EST 12-B/3."), JEU_LISTE_1)).toBe(true);
  });

  it.each([
    ['au début', 'A1234'],
    ['au milieu', '12A34'],
    ['à la fin', '1234A'],
  ])('refuse un octet hors du jeu %s', (_nom, valeur) => {
    expect(estTexteValide(binaire(valeur), JEU_NUMERIQUE)).toBe(false);
  });

  it('refuse la minuscule dans LISTE_1 mais l accepte dans LISTE_2', () => {
    expect(estTexteValide(binaire('Dupont'), JEU_LISTE_1)).toBe(false);
    expect(estTexteValide(binaire('Dupont'), JEU_LISTE_2)).toBe(true);
  });

  it('refuse un espace dans LISTE_3 et dans NUMERIQUE', () => {
    expect(estTexteValide(binaire('AB 12'), JEU_LISTE_3)).toBe(false);
    expect(estTexteValide(binaire('12 '), JEU_NUMERIQUE)).toBe(false);
  });

  it('refuse un octet d un caractère UTF-8 multi-octets', () => {
    expect(estTexteValide(binaire('\xC3\xA9'), JEU_LISTE_2)).toBe(false);
  });
});

describe('estOctetInterdit', () => {
  it('interdit exactement 0x00 à 0x1F, 0x7F et 0x80 à 0xFF', () => {
    for (let o = 0; o <= 0xff; o++) {
      const attendu = o < 0x20 || o === 0x7f || o >= 0x80;
      expect([o, estOctetInterdit(o)]).toEqual([o, attendu]);
    }
  });

  it('autorise l espace et les caractères imprimables ASCII', () => {
    for (let o = 0x20; o <= 0x7e; o++) expect(estOctetInterdit(o)).toBe(false);
  });
});
