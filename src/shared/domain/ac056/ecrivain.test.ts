// Écriture : relecture puis réécriture identique à l'octet près, et conséquences de parité Lazarus
// (Trim à la lecture, AddCharR à l'écriture) figées.
import { describe, expect, it } from 'vitest';
import {
  enChaineBinaire,
  fichierSynthetique,
  ligneSynthetique,
  lignesCompletes,
  type OptionsFichierSynthetique,
} from '@shared/test/ac056-synthetique';
import type { CodeEntite } from './entites';
import { contenuLigne, ecrireAc056 } from './ecrivain';
import { lireAc056 } from './lecteur';
import type { LigneAc056, LigneBrute, LigneDecrite } from './modele';
import type { Octets } from './octets';

/** Lit puis réécrit un contenu ; renvoie les octets d'entrée et de sortie en chaînes binaires. */
function relire(octets: Uint8Array): { entree: string; sortie: string } {
  return {
    entree: enChaineBinaire(octets),
    sortie: enChaineBinaire(ecrireAc056(lireAc056(octets).fichier)),
  };
}

function relireLignes(lignes: readonly string[], options?: OptionsFichierSynthetique) {
  return relire(fichierSynthetique(lignes, options));
}

/** Première ligne de la sortie (fichier CRLF). */
const premiereLigne = (sortie: string) => sortie.split('\r\n')[0]!;

function decrite(ligne: LigneAc056 | undefined): LigneDecrite {
  if (ligne?.nature !== 'decrite') throw new Error('ligne décrite attendue');
  return ligne;
}

describe('contenuLigne', () => {
  const octets = (chaine: string) => chaine as Octets;

  it('renvoie l origine telle quelle pour une ligne brute', () => {
    const origine = octets('ABC\xE9 \xFF  fin');
    const ligne: LigneBrute = {
      nature: 'brute',
      code: null,
      numero: 1,
      origine,
      finDeLigne: '\r\n',
    };
    expect(contenuLigne(ligne)).toBe(origine);
  });

  it('renvoie l origine d une brute de 699 octets sans la compléter', () => {
    const origine = octets(ligneSynthetique('400').slice(0, 699));
    const ligne: LigneBrute = { nature: 'brute', code: '400', numero: 1, origine, finDeLigne: '' };
    expect(contenuLigne(ligne)).toHaveLength(699);
  });

  it('reconstitue la ligne décrite à partir des valeurs', () => {
    const origine = ligneSynthetique('405', { nom: 'DUPONT', prenom1: 'TEST', rang: '01' });
    const ligne = decrite(lireAc056(fichierSynthetique([origine])).fichier.lignes[0]);
    expect(contenuLigne(ligne)).toBe(origine);
  });

  it('écrit les valeurs, pas l origine', () => {
    const origine = ligneSynthetique('405', { nom: 'DUPONT' });
    const lue = decrite(lireAc056(fichierSynthetique([origine])).fichier.lignes[0]);
    const modifiee: LigneDecrite = { ...lue, valeurs: { ...lue.valeurs, nom: octets('MARTIN') } };
    expect(contenuLigne(modifiee)).toBe(ligneSynthetique('405', { nom: 'MARTIN' }));
    expect(modifiee.origine).toBe(origine);
  });

  it('bourre à droite avec des zéros un champ numérique', () => {
    const lue = decrite(lireAc056(fichierSynthetique([ligneSynthetique('400')])).fichier.lignes[0]);
    const modifiee: LigneDecrite = {
      ...lue,
      valeurs: { ...lue.valeurs, rangPersonne: octets('1') },
    };
    expect(contenuLigne(modifiee)).toBe(ligneSynthetique('400', { rangPersonne: '10' }));
  });

  it('bourre une valeur vide avec le bourrage du champ', () => {
    const lue = decrite(lireAc056(fichierSynthetique([ligneSynthetique('400')])).fichier.lignes[0]);
    const modifiee: LigneDecrite = {
      ...lue,
      valeurs: { ...lue.valeurs, rangPersonne: octets(''), codePays: octets('') },
    };
    expect(contenuLigne(modifiee)).toBe(ligneSynthetique('400'));
  });

  describe('garde-fou des 700 octets', () => {
    const lue = () =>
      decrite(lireAc056(fichierSynthetique([ligneSynthetique('405')])).fichier.lignes[0]);

    it('lève si une valeur dépasse son champ (jamais de troncature)', () => {
      const modifiee: LigneDecrite = {
        ...lue(),
        valeurs: { ...lue().valeurs, nom: octets('N'.repeat(60)) },
      };
      expect(() => contenuLigne(modifiee)).toThrow();
    });

    it('lève si une valeur dépasse son champ d un seul octet', () => {
      const modifiee: LigneDecrite = {
        ...lue(),
        valeurs: { ...lue().valeurs, nom: octets('N'.repeat(51)) },
      };
      expect(() => contenuLigne(modifiee)).toThrow();
    });

    it('lève si une valeur est absente', () => {
      const sansNom: Record<string, Octets> = { ...lue().valeurs };
      delete sansNom.nom;
      const modifiee: LigneDecrite = { ...lue(), valeurs: sansNom };
      expect(() => contenuLigne(modifiee)).toThrow();
    });

    it('lève si toutes les valeurs sont absentes', () => {
      const modifiee: LigneDecrite = { ...lue(), valeurs: {} };
      expect(() => contenuLigne(modifiee)).toThrow();
    });

    it('fait lever ecrireAc056 si une valeur dépasse son champ', () => {
      const fichier = lireAc056(fichierSynthetique([ligneSynthetique('405')])).fichier;
      const modifiee: LigneDecrite = {
        ...lue(),
        valeurs: { ...lue().valeurs, nom: octets('N'.repeat(60)) },
      };
      expect(() => ecrireAc056({ ...fichier, lignes: [modifiee] })).toThrow();
    });

    it('fait lever ecrireAc056 si une valeur est absente', () => {
      const fichier = lireAc056(fichierSynthetique([ligneSynthetique('405')])).fichier;
      const sansNom: Record<string, Octets> = { ...lue().valeurs };
      delete sansNom.nom;
      const modifiee: LigneDecrite = { ...lue(), valeurs: sansNom };
      expect(() => ecrireAc056({ ...fichier, lignes: [modifiee] })).toThrow();
    });
  });
});

describe('ecrireAc056', () => {
  describe('réécriture identique', () => {
    it('renvoie un Uint8Array', () => {
      const fichier = lireAc056(fichierSynthetique([ligneSynthetique('400')])).fichier;
      expect(ecrireAc056(fichier)).toBeInstanceOf(Uint8Array);
    });

    it('réécrit un fichier vide en fichier vide', () => {
      expect(ecrireAc056(lireAc056(new Uint8Array()).fichier)).toHaveLength(0);
    });

    it('réécrit un BOM seul en BOM seul', () => {
      const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
      expect(Array.from(ecrireAc056(lireAc056(bom).fichier))).toEqual([0xef, 0xbb, 0xbf]);
    });

    it('réécrit à l identique le fichier synthétique complet sans saut final', () => {
      const { entree, sortie } = relireLignes(lignesCompletes());
      expect(sortie).toBe(entree);
    });

    it('réécrit à l identique le fichier synthétique complet avec saut final', () => {
      const { entree, sortie } = relireLignes(lignesCompletes(), { sautFinal: true });
      expect(sortie).toBe(entree);
    });

    it('conserve le BOM', () => {
      const { entree, sortie } = relireLignes(lignesCompletes(), { bom: true });
      expect(sortie.startsWith('\xEF\xBB\xBF')).toBe(true);
      expect(sortie).toBe(entree);
    });

    it.each([
      ['LF', '\n'],
      ['CR', '\r'],
    ] as const)('conserve des fins de ligne %s', (_nom, fin) => {
      const { entree, sortie } = relireLignes(lignesCompletes(), { fin, sautFinal: true });
      expect(sortie).toBe(entree);
    });

    it('conserve la fin propre à chaque ligne dans un fichier mixte', () => {
      const lignes = lignesCompletes().slice(0, 6);
      const fin = ['\r\n', '\n', '\r', '\r\n', '\n', '\r'] as const;
      const { entree, sortie } = relireLignes(lignes, { fin, sautFinal: true });
      expect(sortie).toBe(entree);
    });

    it('ne rajoute pas de saut final', () => {
      const { sortie } = relireLignes([ligneSynthetique('400')]);
      expect(sortie.endsWith('\r\n')).toBe(false);
    });

    it('conserve le saut final présent', () => {
      const { sortie } = relireLignes([ligneSynthetique('400')], { sautFinal: true });
      expect(sortie.endsWith('\r\n')).toBe(true);
    });

    it('conserve l ordre d origine même non canonique', () => {
      const lignes = [...lignesCompletes()].reverse();
      const { entree, sortie } = relireLignes(lignes);
      expect(sortie).toBe(entree);
    });

    it('conserve des lignes non rattachées à la hiérarchie', () => {
      const lignes = [
        ligneSynthetique('405'),
        ligneSynthetique('110'),
        ligneSynthetique('110'),
        ligneSynthetique('990'),
      ];
      const { entree, sortie } = relireLignes(lignes);
      expect(sortie).toBe(entree);
    });

    it('conserve une ligne brute de longueur quelconque, octets invalides compris', () => {
      const lignes = [ligneSynthetique('400').slice(0, 699), 'ABC\xE9\xFF', ' '.repeat(700), 'X'];
      const { entree, sortie } = relireLignes(lignes);
      expect(sortie).toBe(entree);
    });

    it('réécrit 300 lignes (plus de 200 000 octets) à l identique', () => {
      const lignes = Array.from({ length: 300 }, () => ligneSynthetique('405', { nom: 'DUPONT' }));
      const { entree, sortie } = relireLignes(lignes);
      expect(entree.length).toBeGreaterThan(200_000);
      expect(sortie === entree).toBe(true);
    });

    it('est un point fixe : relire puis réécrire la sortie redonne la sortie', () => {
      const premiere = relireLignes([
        ligneSynthetique('405', { nom: '  DUPONT' }),
        ligneSynthetique('800', { rangPersonne: ' 1' }),
      ]).sortie;
      const seconde = relire(Uint8Array.from(premiere, (c) => c.charCodeAt(0))).sortie;
      expect(seconde).toBe(premiere);
    });
  });

  describe('lignes vides', () => {
    it('supprime une ligne vide au milieu', () => {
      const [a, b] = [ligneSynthetique('400'), ligneSynthetique('405')];
      const { sortie } = relireLignes([a, '', b], { sautFinal: true });
      expect(sortie).toBe(enChaineBinaire(fichierSynthetique([a, b], { sautFinal: true })));
    });

    it('supprime plusieurs lignes vides et une ligne vide finale terminée par un saut', () => {
      const [a, b] = [ligneSynthetique('400'), ligneSynthetique('405')];
      const { sortie } = relireLignes(['', a, '', '', b, ''], { sautFinal: true });
      expect(sortie).toBe(enChaineBinaire(fichierSynthetique([a, b], { sautFinal: true })));
    });

    it('supprime une ligne vide avec sa propre fin de ligne', () => {
      const [a, b] = [ligneSynthetique('400'), ligneSynthetique('405')];
      const { sortie } = relireLignes([a, '', b], { fin: ['\r\n', '\n', '\r\n'], sautFinal: true });
      expect(sortie).toBe(`${a}\r\n${b}\r\n`);
    });
  });

  describe('parité Lazarus : Trim à la lecture, bourrage à l écriture', () => {
    it.each<[string, CodeEntite, string, string, string]>([
      ['800 rangPersonne « ␠1 » devient « 10 »', '800', 'rangPersonne', ' 1', '10'],
      ['800 rangPersonne « 1␠ » devient « 10 »', '800', 'rangPersonne', '1 ', '10'],
      ['800 rangPersonne blanc devient « 00 »', '800', 'rangPersonne', '  ', '00'],
      ['100 echPrinc blanc devient « 0000 »', '100', 'echPrinc', '    ', '0000'],
      ['100 echPrinc « ␠12␠ » devient « 1200 »', '100', 'echPrinc', ' 12 ', '1200'],
      ['405 nom « ␠␠DUPONT » est recalé à gauche', '405', 'nom', '  DUPONT', 'DUPONT'],
      ['405 nom « DUPONT␠␠ » reste cadré à gauche', '405', 'nom', 'DUPONT  ', 'DUPONT'],
      ['405 nom : tabulation de tête remplacée', '405', 'nom', '\tDUPONT', 'DUPONT'],
      ['405 nom : tabulation de fin remplacée', '405', 'nom', 'DUPONT\t', 'DUPONT'],
      ['405 nom : 0x00 et 0x01 en bord retirés', '405', 'nom', '\x00\x01DUPONT\x01\x00', 'DUPONT'],
      ['405 nom : blancs intérieurs conservés', '405', 'nom', ' DU  PONT ', 'DU  PONT'],
    ])('%s', (_titre, code, champ, entree, attendu) => {
      const { sortie } = relireLignes([ligneSynthetique(code, { [champ]: entree })]);
      expect(sortie).toBe(ligneSynthetique(code, { [champ]: attendu }));
    });

    it.each([
      ['0x7F', '\x7F'],
      ['0xA0', '\xA0'],
    ])('conserve %s en bord d un champ Trim', (_nom, octet) => {
      const ligne = ligneSynthetique('405', { nom: `${octet}DUPONT${octet}` });
      const { entree, sortie } = relireLignes([ligne]);
      expect(sortie).toBe(entree);
    });

    it('conserve les espaces de tête d un champ sans Trim', () => {
      const ligne = ligneSynthetique('405', { prenom2: '  X', codeTitre: '  T' });
      const { entree, sortie } = relireLignes([ligne]);
      expect(sortie).toBe(entree);
    });

    it('réécrit une zoneNonDecrite non blanche telle quelle', () => {
      const ligne = ligneSynthetique('405', { zoneNonDecrite: '  RESIDU DE TEST  ' });
      const { entree, sortie } = relireLignes([ligne]);
      expect(sortie).toBe(entree);
    });

    it('réécrit telle quelle une zoneNonDecrite contenant tous les octets sauf CR et LF', () => {
      const tous = Array.from({ length: 256 }, (_, i) => i)
        .filter((i) => i !== 0x0a && i !== 0x0d)
        .map((i) => String.fromCharCode(i))
        .join('');
      const ligne = ligneSynthetique('405', { zoneNonDecrite: tous });
      const { entree, sortie } = relireLignes([ligne]);
      expect(sortie).toBe(entree);
    });

    it('garde les 3 octets de 110 monnaieGestion', () => {
      const ligne = ligneSynthetique('110', { monnaieGestion: 'EUR' });
      const { entree, sortie } = relireLignes([ligne]);
      expect(sortie).toBe(entree);
      expect(sortie).toHaveLength(700);
    });

    it('garde les 3 octets de 135 numEvt', () => {
      const ligne = ligneSynthetique('135', { numEvt: '012' });
      const { entree, sortie } = relireLignes([ligne]);
      expect(sortie).toBe(entree);
      expect(sortie).toHaveLength(700);
    });
  });

  describe('octets invalides en UTF-8', () => {
    it.each([
      ['0xE9 seul', 'CAF\xE9'],
      ['0xC3 seul', 'A\xC3'],
      ['0xFF', '\xFF'],
    ])('conserve %s dans une ligne décrite', (_nom, valeur) => {
      const ligne = ligneSynthetique('405', { nom: valeur, prenom2: valeur });
      const { entree, sortie } = relireLignes([ligne]);
      expect(sortie).toBe(entree);
    });

    it.each([
      ['0xE9 seul', 'CAF\xE9'],
      ['0xC3 seul', 'A\xC3'],
      ['0xFF', '\xFF'],
    ])('conserve %s dans une ligne brute', (_nom, valeur) => {
      const ligne = ligneSynthetique('000', { donnees: valeur });
      const { entree, sortie } = relireLignes([ligne, valeur]);
      expect(sortie).toBe(entree);
    });
  });

  describe('contenu d une ligne décrite', () => {
    it('reconstitue la première ligne de la sortie à partir des valeurs', () => {
      const ligne = ligneSynthetique('405', { nom: 'DUPONT', prenom1: 'TEST' });
      const { sortie } = relireLignes([ligne, ligneSynthetique('400')]);
      expect(premiereLigne(sortie)).toBe(ligne);
    });
  });
});
