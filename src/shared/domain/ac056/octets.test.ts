import { describe, expect, it } from 'vitest';
import {
  estUtf8Valide,
  octetsDepuisTableau,
  octetsDepuisTexte,
  repeterOctet,
  tableauDepuisOctets,
  texteDepuisOctets,
  texteWindows1252,
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

describe('repeterOctet', () => {
  it('répète le caractère le nombre de fois demandé', () => {
    expect(repeterOctet(' ', 5)).toBe('     ');
    expect(repeterOctet('0', 3)).toBe('000');
  });

  it('renvoie une chaîne vide pour nombre = 0', () => {
    expect(repeterOctet('A', 0)).toBe('');
  });

  it('produit un octet par répétition, sur une grande longueur', () => {
    expect(repeterOctet('x', 100_000)).toHaveLength(100_000);
  });

  it('accepte le caractère U+00FF et le caractère U+0000', () => {
    expect(repeterOctet('ÿ', 3)).toBe('ÿÿÿ');
    expect(repeterOctet('\x00', 2)).toBe('\x00\x00');
  });

  it.each(['', 'ab'])('lève pour une longueur différente de 1 (%j)', (caractere) => {
    expect(() => repeterOctet(caractere, 2)).toThrow(/Octet invalide/);
  });

  it('lève pour un caractère au-delà de 0xFF', () => {
    expect(() => repeterOctet('€', 2)).toThrow(/Octet invalide/);
  });

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'lève pour un nombre négatif ou non entier (%s)',
    (nombre) => {
      expect(() => repeterOctet(' ', nombre)).toThrow(/Nombre de répétitions invalide/);
    },
  );
});

describe('texteWindows1252', () => {
  it('décode 0xE9 en « é »', () => {
    expect(texteWindows1252(binaire('caf\xE9'))).toBe('café');
  });

  it('décode 0x80 en « € »', () => {
    expect(texteWindows1252(binaire('\x80'))).toBe('€');
  });

  it('décode 0x92 en « ’ »', () => {
    expect(texteWindows1252(binaire('l\x92\xE9t\xE9'))).toBe('l’été');
  });

  it('décode 0x81, non défini en Windows-1252, en contrôle C1 U+0081 et non en U+FFFD', () => {
    expect(texteWindows1252(binaire('\x81'))).toBe('\u0081');
  });

  it.each([0x81, 0x8d, 0x8f, 0x90, 0x9d])(
    'ne produit jamais U+FFFD pour l octet non défini 0x%s',
    (octet) => {
      const texte = texteWindows1252(binaire(String.fromCharCode(octet)));
      expect(texte).toBe(String.fromCharCode(octet));
    },
  );

  it('laisse l ASCII inchangé', () => {
    expect(texteWindows1252(binaire('DUPONT 123 /-.'))).toBe('DUPONT 123 /-.');
  });

  it('décode un octet UTF-8 multi-octets comme deux caractères Windows-1252', () => {
    expect(texteWindows1252(binaire('\xC3\xA9'))).toBe('Ã©');
  });

  it('ne produit aucun U+FFFD sur les 256 valeurs d octet', () => {
    const tous = octetsDepuisTableau(Uint8Array.from({ length: 256 }, (_, i) => i));
    const texte = texteWindows1252(tous);
    expect(texte).toHaveLength(256);
    expect(texte.includes('�')).toBe(false);
  });

  it('renvoie une chaîne vide pour une chaîne vide', () => {
    expect(texteWindows1252(binaire(''))).toBe('');
  });
});

describe('estUtf8Valide', () => {
  it('accepte l ASCII', () => {
    expect(estUtf8Valide(new Uint8Array([0x44, 0x55, 0x50, 0x4f, 0x4e, 0x54]))).toBe(true);
  });

  it('accepte de l UTF-8 multi-octets valide (2, 3 et 4 octets)', () => {
    const octets = tableauDepuisOctets(octetsDepuisTexte('é € \u{1F600}'));
    expect(estUtf8Valide(octets)).toBe(true);
  });

  it('refuse un octet 0xE9 isolé', () => {
    expect(estUtf8Valide(new Uint8Array([0x63, 0x61, 0x66, 0xe9]))).toBe(false);
  });

  it('refuse un 0xE9 isolé suivi d un caractère ASCII', () => {
    expect(estUtf8Valide(new Uint8Array([0xe9, 0x20, 0x41]))).toBe(false);
  });

  it('refuse une séquence tronquée en fin de fichier', () => {
    expect(estUtf8Valide(new Uint8Array([0x41, 0xe2, 0x82]))).toBe(false);
  });

  it('accepte le BOM UTF-8 seul', () => {
    expect(estUtf8Valide(new Uint8Array([0xef, 0xbb, 0xbf]))).toBe(true);
  });

  it('accepte un tableau vide', () => {
    expect(estUtf8Valide(new Uint8Array())).toBe(true);
  });

  it('refuse l octet 0xFF', () => {
    expect(estUtf8Valide(new Uint8Array([0xff]))).toBe(false);
  });

  it('lit une vue (subarray) sans sortir de ses bornes', () => {
    const tampon = new Uint8Array([0xe9, 0x41, 0x42, 0xe9]);
    expect(estUtf8Valide(tampon.subarray(1, 3))).toBe(true);
  });
});
