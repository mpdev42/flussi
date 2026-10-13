import { describe, expect, it } from 'vitest';
import {
  enChaineBinaire,
  enOctetsBruts,
  extraireChamp,
  fichierSynthetique,
  ligneSynthetique,
  lignesCompletes,
  type OptionsFichierSynthetique,
} from '@shared/test/ac056-synthetique';
import { CODES_ENTITE, ENTITES } from './entites';
import { codeEntite, lireAc056, lireValeurs } from './lecteur';
import type { LectureAc056, LigneAc056, LigneDecrite } from './modele';
import type { Octets } from './octets';

const binaire = (chaine: string) => chaine as Octets;

/** Lit un fichier synthétique construit à partir de lignes. */
function lire(lignes: readonly string[], options?: OptionsFichierSynthetique) {
  return lireAc056(fichierSynthetique(lignes, options));
}

const CODES_FORMAT: readonly string[] = ['bom', 'fin-de-ligne-lf', 'fin-de-ligne-cr', 'ligne-vide'];

/** Anomalies de format, filtrées par code (et non par `bloquante`, pour détecter une erreur de niveau). */
function anomaliesDeFormat(lecture: LectureAc056) {
  return lecture.anomalies.filter((a) => CODES_FORMAT.includes(a.code));
}

function decrite(ligne: LigneAc056 | undefined): LigneDecrite {
  if (ligne?.nature !== 'decrite') throw new Error('ligne décrite attendue');
  return ligne;
}

const L400 = ligneSynthetique('400');
const L405 = ligneSynthetique('405', { nom: 'DUPONT', prenom1: 'TEST' });

describe('codeEntite', () => {
  it.each(CODES_ENTITE)('lit le code %s en position 23', (code) => {
    expect(codeEntite(binaire(ligneSynthetique(code)))).toBe(code);
  });

  it('lit le code d une ligne de 25 octets exactement', () => {
    expect(codeEntite(binaire(ligneSynthetique('400').slice(0, 25)))).toBe('400');
  });

  it('renvoie null pour une ligne de moins de 25 octets', () => {
    expect(codeEntite(binaire(ligneSynthetique('400').slice(0, 24)))).toBeNull();
  });

  it('renvoie null pour une ligne vide', () => {
    expect(codeEntite(binaire(''))).toBeNull();
  });

  it('renvoie null pour un code inconnu', () => {
    expect(codeEntite(binaire(ligneSynthetique('400', { numEntite: '123' })))).toBeNull();
  });

  it('renvoie null pour un code non numérique', () => {
    expect(codeEntite(binaire(ligneSynthetique('400', { numEntite: 'ABC' })))).toBeNull();
  });

  it('renvoie null pour une ligne d espaces', () => {
    expect(codeEntite(binaire(' '.repeat(700)))).toBeNull();
  });
});

describe('lireValeurs', () => {
  it('contient une valeur par champ de la description, zoneNonDecrite comprise', () => {
    const valeurs = lireValeurs(ENTITES['405'], binaire(L405));
    const attendus = ENTITES['405'].champs.map((c) => c.nom).sort();
    expect(Object.keys(valeurs).sort()).toEqual(attendus);
  });

  it('applique Trim sur un champ trim', () => {
    const origine = binaire(ligneSynthetique('405', { nom: '  DUPONT' }));
    expect(lireValeurs(ENTITES['405'], origine).nom).toBe('DUPONT');
  });

  it('renvoie une chaîne vide pour un champ trim blanc', () => {
    expect(lireValeurs(ENTITES['405'], binaire(L405)).numInsee).toBe('');
  });

  it('ne retire ni 0x7F ni 0xA0 en bord d un champ trim', () => {
    const origine = binaire(ligneSynthetique('405', { nom: '\x7FDUPONT\xA0' }));
    expect(lireValeurs(ENTITES['405'], origine).nom).toBe('\x7FDUPONT\xA0');
  });

  it('retire une tabulation en bord d un champ trim', () => {
    const origine = binaire(ligneSynthetique('405', { nom: '\tDUPONT\t' }));
    expect(lireValeurs(ENTITES['405'], origine).nom).toBe('DUPONT');
  });

  it('conserve les espaces d un champ sans Trim', () => {
    const origine = binaire(ligneSynthetique('405', { prenom2: '  X' }));
    expect(lireValeurs(ENTITES['405'], origine).prenom2).toBe('  X' + ' '.repeat(17));
  });

  it('lit zoneNonDecrite sans Trim', () => {
    const origine = binaire(L405);
    const zone = lireValeurs(ENTITES['405'], origine).zoneNonDecrite;
    expect(zone).toBe(' '.repeat(453));
  });

  it('lit un champ numérique tel quel, zéros compris', () => {
    const valeurs = lireValeurs(ENTITES['400'], binaire(L400));
    expect(valeurs.rangPersonne).toBe('00');
    expect(valeurs.numDossier).toBe('00000000');
  });

  it('lit un champ à la bonne position', () => {
    const origine = binaire(ligneSynthetique('405', { nom: 'DUPONT', prenom1: 'TEST' }));
    const valeurs = lireValeurs(ENTITES['405'], origine);
    expect(valeurs.nom).toBe(extraireChamp(origine, '405', 'nom').trim());
    expect(valeurs.prenom1).toBe('TEST');
  });

  it('conserve les octets invalides en UTF-8', () => {
    const origine = binaire(
      ligneSynthetique('405', { nom: 'CAF\xE9', prenom1: '\xC3', numInsee: '\xFF' }),
    );
    const valeurs = lireValeurs(ENTITES['405'], origine);
    expect([valeurs.nom, valeurs.prenom1, valeurs.numInsee]).toEqual(['CAF\xE9', '\xC3', '\xFF']);
  });
});

describe('lireAc056', () => {
  describe('fichier vide ou minimal', () => {
    it('lit un fichier vide sans ligne, avec la seule anomalie fichier-vide', () => {
      const { fichier, anomalies } = lireAc056(new Uint8Array());
      expect(fichier.bom).toBe(false);
      expect(fichier.lignes).toEqual([]);
      expect(fichier.e000).toBeNull();
      expect(fichier.dossiers).toEqual([]);
      expect(fichier.e999).toBeNull();
      expect(anomalies.map((a) => a.code)).toEqual(['fichier-vide']);
    });

    it('lit un BOM seul : aucune ligne, les anomalies bom et fichier-vide', () => {
      const { fichier, anomalies } = lireAc056(new Uint8Array([0xef, 0xbb, 0xbf]));
      expect(fichier.bom).toBe(true);
      expect(fichier.lignes).toEqual([]);
      expect(anomalies.map((a) => a.code)).toEqual(['bom', 'fichier-vide']);
    });

    it('ne lève jamais, même sur des octets quelconques', () => {
      let graine = 12345;
      const hasard = Uint8Array.from({ length: 5000 }, () => {
        graine = (graine * 1103515245 + 12345) & 0x7fffffff;
        return graine & 0xff;
      });
      expect(() => lireAc056(hasard)).not.toThrow();
    });

    it('ne lève jamais sur les 256 valeurs d octet seules', () => {
      for (let octet = 0; octet < 256; octet++) {
        expect(() => lireAc056(new Uint8Array([octet]))).not.toThrow();
      }
    });
  });

  describe('nature des lignes', () => {
    it('décrit une ligne de 700 octets au code connu et non brut', () => {
      const ligne = decrite(lire([L405]).fichier.lignes[0]);
      expect(ligne.nature).toBe('decrite');
      expect(ligne.code).toBe('405');
      expect(ligne.valeurs.nom).toBe('DUPONT');
      expect(ligne.valeurs.prenom1).toBe('TEST');
    });

    it.each(['000', '001', '990', '995', '999'] as const)(
      'garde brute la ligne %s de 700 octets avec son code',
      (code) => {
        const ligne = lire([ligneSynthetique(code)]).fichier.lignes[0];
        expect(ligne?.nature).toBe('brute');
        expect(ligne?.code).toBe(code);
      },
    );

    it.each([699, 701])('garde brute une ligne de %i octets avec son code', (longueur) => {
      const origine = (L400 + ' ').slice(0, longueur);
      const ligne = lire([origine]).fichier.lignes[0];
      expect(ligne?.nature).toBe('brute');
      expect(ligne?.code).toBe('400');
    });

    it('garde brute une ligne de 700 octets au code inconnu, avec un code null', () => {
      const ligne = lire([ligneSynthetique('400', { numEntite: '123' })]).fichier.lignes[0];
      expect(ligne?.nature).toBe('brute');
      expect(ligne?.code).toBeNull();
    });

    it('garde brute une ligne de moins de 25 octets, avec un code null', () => {
      const ligne = lire(['TEST']).fichier.lignes[0];
      expect(ligne?.nature).toBe('brute');
      expect(ligne?.code).toBeNull();
    });

    it('garde brute une ligne d espaces, avec un code null et sans anomalie de format', () => {
      const lecture = lire([' '.repeat(700), ' '.repeat(10)]);
      expect(lecture.fichier.lignes.map((l) => [l.nature, l.code])).toEqual([
        ['brute', null],
        ['brute', null],
      ]);
      expect(anomaliesDeFormat(lecture)).toEqual([]);
    });

    it('décrit chaque entité non brute avec son code', () => {
      const codes = CODES_ENTITE.filter((code) => !ENTITES[code].brute);
      const { fichier } = lire(codes.map((code) => ligneSynthetique(code)));
      expect(fichier.lignes.map((l) => [l.nature, l.code])).toEqual(
        codes.map((code) => ['decrite', code]),
      );
    });
  });

  describe('contenu des lignes', () => {
    it('conserve l origine sans fin de ligne, octet pour octet', () => {
      const origine = ligneSynthetique('405', { nom: 'CAF\xE9\xFF\xA0\x7F', prenom1: '\xC3' });
      const { fichier } = lire([origine, L400]);
      expect(fichier.lignes[0]?.origine).toBe(origine);
      expect(fichier.lignes[1]?.origine).toBe(L400);
    });

    it('conserve l origine d une ligne brute de longueur quelconque', () => {
      const origine = 'ABC\xE9\xFF  \t';
      expect(lire([origine]).fichier.lignes[0]?.origine).toBe(origine);
    });

    it('numérote les lignes à partir de 1', () => {
      const { fichier } = lire([L400, L405, L400]);
      expect(fichier.lignes.map((l) => l.numero)).toEqual([1, 2, 3]);
    });

    it('conserve la fin de ligne propre à chaque ligne', () => {
      const { fichier } = lire([L400, L405, L400, L405], {
        fin: ['\r\n', '\n', '\r', '\r\n'],
      });
      expect(fichier.lignes.map((l) => l.finDeLigne)).toEqual(['\r\n', '\n', '\r', '']);
    });

    it('lit la fin de ligne finale quand le saut final est présent', () => {
      const { fichier } = lire([L400], { sautFinal: true });
      expect(fichier.lignes[0]?.finDeLigne).toBe('\r\n');
    });

    it('conserve le BOM dans fichier.bom', () => {
      expect(lire([L400], { bom: true }).fichier.bom).toBe(true);
      expect(lire([L400]).fichier.bom).toBe(false);
    });
  });

  describe('lignes vides', () => {
    it('retire la ligne vide de lignes et signale une anomalie', () => {
      const lecture = lire([L400, '', L405]);
      expect(lecture.fichier.lignes).toHaveLength(2);
      expect(anomaliesDeFormat(lecture)).toEqual([
        {
          code: 'ligne-vide',
          ligne: 2,
          message: "Ligne 2 vide : elle sera supprimée à l'enregistrement.",
          bloquante: false,
        },
      ]);
    });

    it('conserve la numérotation d origine après une ligne vide', () => {
      const { fichier } = lire([L400, '', L405]);
      expect(fichier.lignes.map((l) => l.numero)).toEqual([1, 3]);
    });

    it('signale une ligne vide finale terminée par un saut', () => {
      const lecture = lire([L400, ''], { sautFinal: true });
      expect(lecture.fichier.lignes).toHaveLength(1);
      expect(anomaliesDeFormat(lecture).map((a) => [a.code, a.ligne])).toEqual([['ligne-vide', 2]]);
    });

    it('signale une anomalie ligne-vide par ligne vide, triées par numéro', () => {
      // Lignes vides : 2 et 4 (non consécutives), 6 et 7 (consécutives).
      const lecture = lire([L400, '', L405, '', L400, '', '', L405], {
        sautFinal: true,
      });
      expect(lecture.fichier.lignes.map((l) => l.numero)).toEqual([1, 3, 5, 8]);
      expect(anomaliesDeFormat(lecture)).toEqual(
        [2, 4, 6, 7].map((n) => ({
          code: 'ligne-vide',
          ligne: n,
          message: `Ligne ${n} vide : elle sera supprimée à l'enregistrement.`,
          bloquante: false,
        })),
      );
    });
  });

  describe('anomalies de format', () => {
    const formats = (lignes: readonly string[], options?: OptionsFichierSynthetique) =>
      anomaliesDeFormat(lire(lignes, options));

    it('signale le BOM, sans ligne et non bloquant', () => {
      const anomalies = formats([L400], { bom: true });
      expect(anomalies).toEqual([
        {
          code: 'bom',
          ligne: null,
          message: "Le fichier commence par un BOM UTF-8, conservé à l'enregistrement.",
          bloquante: false,
        },
      ]);
    });

    it('signale les fins LF à partir de la première, avec leur nombre', () => {
      const anomalies = formats([L400, L405, L400], { fin: '\n', sautFinal: true });
      expect(anomalies).toEqual([
        {
          code: 'fin-de-ligne-lf',
          ligne: 1,
          message:
            "Fin de ligne LF au lieu de CRLF à partir de la ligne 1 (3 lignes), conservée à l'enregistrement.",
          bloquante: false,
        },
      ]);
    });

    it('n inclut pas la dernière ligne sans fin dans le compte LF', () => {
      const anomalies = formats([L400, L405, L400], { fin: '\n' });
      expect(anomalies).toHaveLength(1);
      expect(anomalies[0]?.message).toContain('à partir de la ligne 1 (2 lignes)');
    });

    it('accorde « ligne » au singulier pour une seule fin LF', () => {
      const anomalies = formats([L400, L405, L400], {
        fin: ['\r\n', '\n', '\r\n'],
      });
      expect(anomalies).toEqual([
        {
          code: 'fin-de-ligne-lf',
          ligne: 2,
          message:
            "Fin de ligne LF au lieu de CRLF à partir de la ligne 2 (1 ligne), conservée à l'enregistrement.",
          bloquante: false,
        },
      ]);
    });

    it('signale la première ligne LF et compte toutes les lignes LF', () => {
      const anomalies = formats([L400, L405, L400, L405], {
        fin: ['\r\n', '\n', '\r\n', '\n'],
        sautFinal: true,
      });
      expect(anomalies).toHaveLength(1);
      expect(anomalies[0]?.ligne).toBe(2);
      expect(anomalies[0]?.message).toContain('à partir de la ligne 2 (2 lignes)');
    });

    it('signale les fins CR avec le mot CR', () => {
      const anomalies = formats([L400, L405, L400], {
        fin: ['\r\n', '\r', '\r'],
        sautFinal: true,
      });
      expect(anomalies).toEqual([
        {
          code: 'fin-de-ligne-cr',
          ligne: 2,
          message:
            "Fin de ligne CR au lieu de CRLF à partir de la ligne 2 (2 lignes), conservée à l'enregistrement.",
          bloquante: false,
        },
      ]);
    });

    it('accorde « ligne » au singulier pour une seule fin CR', () => {
      const anomalies = formats([L400, L405], { fin: ['\r', '\r\n'], sautFinal: true });
      expect(anomalies[0]?.message).toBe(
        "Fin de ligne CR au lieu de CRLF à partir de la ligne 1 (1 ligne), conservée à l'enregistrement.",
      );
    });

    it('ne signale aucune anomalie pour un fichier CRLF sans BOM et sans saut final', () => {
      expect(lire(lignesCompletes()).anomalies).toEqual([]);
    });

    it('ne signale aucune anomalie pour un fichier CRLF sans BOM avec saut final', () => {
      expect(lire(lignesCompletes(), { sautFinal: true }).anomalies).toEqual([]);
    });

    it('ne signale pas l absence de saut final', () => {
      expect(formats([L400])).toEqual([]);
    });

    it('signale une anomalie de format par type, toutes non bloquantes, triées null puis par ligne', () => {
      // ligne 1 CRLF, 2 LF, 3 CRLF, 4 vide (CRLF), 5 CR
      const anomalies = formats([L400, L405, L400, '', L405], {
        bom: true,
        fin: ['\r\n', '\n', '\r\n', '\r\n', '\r'],
        sautFinal: true,
      });
      expect(anomalies.map((a) => [a.code, a.ligne])).toEqual([
        ['bom', null],
        ['fin-de-ligne-lf', 2],
        ['ligne-vide', 4],
        ['fin-de-ligne-cr', 5],
      ]);
      expect(anomalies).toHaveLength(4);
      expect(anomalies.every((a) => a.bloquante === false)).toBe(true);
    });
  });

  describe('fichier complet', () => {
    it('lit les 138 lignes synthétiques sans anomalie, toutes rattachées par la hiérarchie', () => {
      const { fichier, anomalies } = lire(lignesCompletes());
      expect(fichier.lignes).toHaveLength(138);
      expect(anomalies).toEqual([]);
      expect(fichier.e000).toBe(0);
      expect(fichier.e999).toBe(137);
      expect(fichier.dossiers).toHaveLength(2);
    });

    it('lit 200 000 octets sans erreur', () => {
      const lignes = Array.from({ length: 300 }, () => L405);
      const octets = fichierSynthetique(lignes);
      expect(octets.length).toBeGreaterThan(200_000);
      expect(lireAc056(octets).fichier.lignes).toHaveLength(300);
    });

    it('lit les octets reçus sans les modifier', () => {
      const octets = fichierSynthetique([L405]);
      const copie = enChaineBinaire(octets);
      lireAc056(octets);
      expect(enChaineBinaire(octets)).toBe(copie);
    });

    it('lit une vue (subarray) de la même façon que le tableau extrait', () => {
      const octets = fichierSynthetique([L405, L400]);
      const tampon = new Uint8Array(octets.length + 10);
      tampon.set(octets, 5);
      const vue = lireAc056(tampon.subarray(5, 5 + octets.length));
      expect(vue.fichier.lignes.map((l) => l.origine)).toEqual([L405, L400]);
    });

    it('lit un octet de contrôle dans une ligne sans la couper', () => {
      const origine = ligneSynthetique('405', { zoneNonDecrite: '\x00\x01\x1F\x7F\x80' });
      const { fichier } = lireAc056(enOctetsBruts(origine));
      expect(fichier.lignes).toHaveLength(1);
      expect(fichier.lignes[0]?.origine).toBe(origine);
    });
  });
});
