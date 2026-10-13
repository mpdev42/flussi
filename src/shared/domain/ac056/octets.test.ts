import { describe, expect, it } from 'vitest';
import {
  octetsDepuisTableau,
  octetsDepuisTexte,
  tableauDepuisOctets,
  texteDepuisOctets,
  type Octets,
} from './octets';

/** Chaîne binaire de test : 1 caractère par octet. */
const binaire = (chaine: string) => chaine as Octets;

describe('octetsDepuisTableau', () => {
  it('produit un caractère par octet, de U+0000 à U+00FF', () => {
    const octets = octetsDepuisTableau(new Uint8Array([0x41, 0xe9, 0xff, 0x00]));
    expect(octets).toBe('A\xE9\xFF\x00');
    expect(octets).toHaveLength(4);
  });

  it('renvoie une chaîne vide pour un tableau vide', () => {
    expect(octetsDepuisTableau(new Uint8Array())).toBe('');
  });

  it('conserve les 256 valeurs d octet', () => {
    const tous = Uint8Array.from({ length: 256 }, (_, i) => i);
    const octets = octetsDepuisTableau(tous);
    const codes = Array.from(octets, (c) => c.charCodeAt(0));
    expect(codes).toEqual(Array.from(tous));
  });

  it('supporte 200 000 octets sans RangeError', () => {
    const gros = Uint8Array.from({ length: 200_000 }, (_, i) => i % 256);
    const octets = octetsDepuisTableau(gros);
    expect(octets).toHaveLength(200_000);
  });

  it('conserve les octets autour des frontières de tranche de 8 192', () => {
    const gros = Uint8Array.from({ length: 20_000 }, (_, i) => i % 251);
    const octets = octetsDepuisTableau(gros);
    for (const i of [0, 8191, 8192, 8193, 16_383, 16_384, 19_999]) {
      expect(octets.charCodeAt(i)).toBe(gros[i]);
    }
  });

  it('lit une vue (subarray) sans sortir de ses bornes', () => {
    const tampon = new Uint8Array([0x41, 0x42, 0x43, 0x44]);
    expect(octetsDepuisTableau(tampon.subarray(1, 3))).toBe('BC');
  });
});

describe('tableauDepuisOctets', () => {
  it('est réciproque de octetsDepuisTableau sur les 256 valeurs', () => {
    const tous = Uint8Array.from({ length: 256 }, (_, i) => i);
    expect(tableauDepuisOctets(octetsDepuisTableau(tous))).toEqual(tous);
  });

  it('renvoie un tableau vide pour une chaîne vide', () => {
    expect(tableauDepuisOctets(binaire(''))).toHaveLength(0);
  });

  it('est réciproque sur 200 000 octets', () => {
    const gros = Uint8Array.from({ length: 200_000 }, (_, i) => (i * 7) % 256);
    expect(tableauDepuisOctets(octetsDepuisTableau(gros))).toEqual(gros);
  });

  it('lève si un caractère dépasse 0xFF', () => {
    expect(() => tableauDepuisOctets(binaire('AĀ'))).toThrow();
  });

  it('lève pour un caractère hors du plan de base', () => {
    expect(() => tableauDepuisOctets(binaire('\u{1F600}'))).toThrow();
  });
});

describe('octetsDepuisTexte', () => {
  it('laisse l ASCII inchangé', () => {
    expect(octetsDepuisTexte('DUPONT 123')).toBe('DUPONT 123');
  });

  it('encode « é » en UTF-8 sur 2 octets', () => {
    expect(octetsDepuisTexte('é')).toBe('\xC3\xA9');
  });

  it('encode « € » en UTF-8 sur 3 octets', () => {
    expect(octetsDepuisTexte('€')).toBe('\xE2\x82\xAC');
  });

  it('encode un caractère hors du plan de base sur 4 octets', () => {
    expect(octetsDepuisTexte('\u{1F600}')).toBe('\xF0\x9F\x98\x80');
  });

  it('renvoie une chaîne vide pour un texte vide', () => {
    expect(octetsDepuisTexte('')).toBe('');
  });
});

describe('texteDepuisOctets', () => {
  it('décode l UTF-8 valide', () => {
    expect(texteDepuisOctets(binaire('\xC3\xA9\xE2\x82\xAC'))).toBe('é€');
  });

  it('est réciproque de octetsDepuisTexte', () => {
    const texte = 'Éloïse DUPONT-ÀÔ € \u{1F600}';
    expect(texteDepuisOctets(octetsDepuisTexte(texte))).toBe(texte);
  });

  it('remplace un octet 0xE9 isolé par U+FFFD sans lever', () => {
    expect(texteDepuisOctets(binaire('CAF\xE9'))).toBe('CAF�');
  });

  it('remplace un 0xC3 final isolé par U+FFFD sans lever', () => {
    expect(texteDepuisOctets(binaire('A\xC3'))).toBe('A�');
  });

  it('remplace 0xFF par U+FFFD sans lever', () => {
    expect(texteDepuisOctets(binaire('\xFF'))).toBe('�');
  });

  it('renvoie une chaîne vide pour une chaîne vide', () => {
    expect(texteDepuisOctets(binaire(''))).toBe('');
  });
});
