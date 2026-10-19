// Découpage en lignes : parité avec ReadLn de Lazarus (LF, CRLF, CR seul, lignes vides comprises).
import { describe, expect, it } from 'vitest';
import { enOctetsBruts } from '@shared/test/ac056-synthetique';
import { decouperLignes } from './decoupage';

/** Découpe une chaîne binaire de test et résume les lignes en `[octets, fin]`. */
function decouper(chaine: string) {
  const resultat = decouperLignes(enOctetsBruts(chaine));
  return {
    bom: resultat.bom,
    lignes: resultat.lignes.map((l) => [l.octets as string, l.finDeLigne] as const),
    numeros: resultat.lignes.map((l) => l.numero),
  };
}

describe('decouperLignes', () => {
  describe('fichier vide ou réduit au BOM', () => {
    it('renvoie 0 ligne et pas de BOM pour un fichier vide', () => {
      expect(decouper('')).toEqual({ bom: false, lignes: [], numeros: [] });
    });

    it('renvoie 0 ligne et un BOM pour un fichier réduit au BOM', () => {
      expect(decouper('\xEF\xBB\xBF')).toEqual({ bom: true, lignes: [], numeros: [] });
    });
  });

  describe('BOM UTF-8', () => {
    it('retire le BOM en tête', () => {
      const resultat = decouper('\xEF\xBB\xBFABC');
      expect(resultat.bom).toBe(true);
      expect(resultat.lignes).toEqual([['ABC', '']]);
    });

    it('ne retire qu un seul BOM', () => {
      const resultat = decouper('\xEF\xBB\xBF\xEF\xBB\xBFA');
      expect(resultat.bom).toBe(true);
      expect(resultat.lignes).toEqual([['\xEF\xBB\xBFA', '']]);
    });

    it('traite un BOM après la première ligne comme des octets ordinaires', () => {
      const resultat = decouper('A\r\n\xEF\xBB\xBFB');
      expect(resultat.bom).toBe(false);
      expect(resultat.lignes).toEqual([
        ['A', '\r\n'],
        ['\xEF\xBB\xBFB', ''],
      ]);
    });

    it('ne reconnaît pas un BOM incomplet', () => {
      const resultat = decouper('\xEF\xBBA');
      expect(resultat.bom).toBe(false);
      expect(resultat.lignes).toEqual([['\xEF\xBBA', '']]);
    });

    it('ne reconnaît pas un BOM dont le dernier octet diffère', () => {
      expect(decouper('\xEF\xBB\xBEA').bom).toBe(false);
    });
  });

  describe('fins de ligne', () => {
    it('reconnaît LF', () => {
      expect(decouper('A\nB\n').lignes).toEqual([
        ['A', '\n'],
        ['B', '\n'],
      ]);
    });

    it('reconnaît CRLF', () => {
      expect(decouper('A\r\nB\r\n').lignes).toEqual([
        ['A', '\r\n'],
        ['B', '\r\n'],
      ]);
    });

    it('reconnaît CR seul', () => {
      expect(decouper('A\rB\r').lignes).toEqual([
        ['A', '\r'],
        ['B', '\r'],
      ]);
    });

    it('conserve la fin propre à chaque ligne dans un fichier mixte', () => {
      expect(decouper('A\r\nB\nC\rD').lignes).toEqual([
        ['A', '\r\n'],
        ['B', '\n'],
        ['C', '\r'],
        ['D', ''],
      ]);
    });
  });

  describe('dernière ligne', () => {
    it('produit une dernière ligne sans fin pour les octets restants', () => {
      expect(decouper('A\r\nB').lignes).toEqual([
        ['A', '\r\n'],
        ['B', ''],
      ]);
    });

    it('ne produit pas de ligne fantôme après le saut final', () => {
      expect(decouper('A\r\n').lignes).toEqual([['A', '\r\n']]);
      expect(decouper('A\n').lignes).toEqual([['A', '\n']]);
      expect(decouper('A\r').lignes).toEqual([['A', '\r']]);
    });

    it('produit une ligne sans fin pour un contenu sans saut', () => {
      expect(decouper('ABC').lignes).toEqual([['ABC', '']]);
    });
  });

  describe('lignes vides', () => {
    it('produit une ligne vide pour chaque fin consécutive', () => {
      expect(decouper('A\n\nB').lignes).toEqual([
        ['A', '\n'],
        ['', '\n'],
        ['B', ''],
      ]);
    });

    it('produit une ligne vide pour un fichier réduit à un saut', () => {
      expect(decouper('\r\n').lignes).toEqual([['', '\r\n']]);
    });

    it('lit « \\n\\r » comme une ligne vide LF puis une ligne vide CR', () => {
      expect(decouper('\n\r').lignes).toEqual([
        ['', '\n'],
        ['', '\r'],
      ]);
    });

    it('lit « \\r\\r\\n » comme une ligne vide CR puis une ligne vide CRLF', () => {
      expect(decouper('\r\r\n').lignes).toEqual([
        ['', '\r'],
        ['', '\r\n'],
      ]);
    });

    it('lit « \\r\\n\\n » comme une ligne vide CRLF puis une ligne vide LF', () => {
      expect(decouper('\r\n\n').lignes).toEqual([
        ['', '\r\n'],
        ['', '\n'],
      ]);
    });

    it('produit une ligne vide finale pour deux sauts finaux', () => {
      expect(decouper('A\r\n\r\n').lignes).toEqual([
        ['A', '\r\n'],
        ['', '\r\n'],
      ]);
    });
  });

  describe('numérotation', () => {
    it('numérote les lignes à partir de 1', () => {
      expect(decouper('A\nB\nC').numeros).toEqual([1, 2, 3]);
    });

    it('compte les lignes vides dans la numérotation', () => {
      expect(decouper('A\n\n\nB').numeros).toEqual([1, 2, 3, 4]);
    });

    it('numérote à partir de 1 après le BOM', () => {
      expect(decouper('\xEF\xBB\xBFA\nB').numeros).toEqual([1, 2]);
    });
  });

  describe('octets', () => {
    it('conserve tels quels les octets non ASCII et de contrôle', () => {
      const resultat = decouper('\xE9\xFF\x00\x7F\xA0 \t\n');
      expect(resultat.lignes).toEqual([['\xE9\xFF\x00\x7F\xA0 \t', '\n']]);
    });

    it('lit une ligne de 700 octets sans la modifier', () => {
      const ligne = 'X'.repeat(700);
      expect(decouper(`${ligne}\r\n`).lignes).toEqual([[ligne, '\r\n']]);
    });

    it('découpe 200 000 octets sans erreur', () => {
      const lignes = Array.from({ length: 300 }, () => 'X'.repeat(700));
      const resultat = decouperLignes(enOctetsBruts(lignes.join('\r\n')));
      expect(resultat.lignes).toHaveLength(300);
      expect(resultat.lignes.every((l) => l.octets.length === 700)).toBe(true);
    });

    it('ne lit que la vue d un tableau (subarray), pas le tampon entier', () => {
      const tampon = enOctetsBruts('XXA\r\nBYY');
      const resultat = decouperLignes(tampon.subarray(2, 5));
      expect(resultat.lignes.map((l) => [l.octets, l.finDeLigne])).toEqual([['A', '\r\n']]);
    });
  });

  // Parité `CtrlZMarksEOF` de FPC sous Windows : la lecture s'arrête au premier 0x1A. Seuls les
  // 0x1A de la toute fin du fichier sont retirés ; un 0x1A suivi d'autres octets reste en place.
  describe('Ctrl-Z (0x1A)', () => {
    const ctrlZ = (chaine: string) => decouperLignes(enOctetsBruts(chaine)).ctrlZFinal;

    it('ne signale rien sans 0x1A', () => {
      expect(ctrlZ('A\r\nB')).toBe(false);
      expect(ctrlZ('')).toBe(false);
    });

    it('retire un 0x1A après la dernière fin de ligne', () => {
      expect(decouper('A\r\nB\r\n\x1A').lignes).toEqual([
        ['A', '\r\n'],
        ['B', '\r\n'],
      ]);
      expect(ctrlZ('A\r\nB\r\n\x1A')).toBe(true);
    });

    it('retire un 0x1A collé au contenu de la dernière ligne, sans fin de ligne finale', () => {
      expect(decouper('A\r\nB\x1A').lignes).toEqual([
        ['A', '\r\n'],
        ['B', ''],
      ]);
      expect(ctrlZ('A\r\nB\x1A')).toBe(true);
    });

    it('retire plusieurs 0x1A finaux', () => {
      expect(decouper('A\r\n\x1A\x1A\x1A').lignes).toEqual([['A', '\r\n']]);
      expect(ctrlZ('A\r\n\x1A\x1A\x1A')).toBe(true);
    });

    it('garde un CR seul suivi d un 0x1A final comme fin de ligne CR', () => {
      expect(decouper('A\r\x1A').lignes).toEqual([['A', '\r']]);
    });

    it('laisse en place un 0x1A suivi d autres octets', () => {
      expect(decouper('A\x1AB\r\nC').lignes).toEqual([
        ['A\x1AB', '\r\n'],
        ['C', ''],
      ]);
      expect(decouper('A\r\n\x1A\r\nB').lignes).toEqual([
        ['A', '\r\n'],
        ['\x1A', '\r\n'],
        ['B', ''],
      ]);
      expect(ctrlZ('A\x1AB')).toBe(false);
    });

    it('ne retire que les 0x1A finaux quand il y en a aussi au milieu', () => {
      expect(decouper('A\x1AB\x1A').lignes).toEqual([['A\x1AB', '']]);
      expect(ctrlZ('A\x1AB\x1A')).toBe(true);
    });

    it('renvoie 0 ligne pour un fichier fait seulement de 0x1A', () => {
      expect(decouper('\x1A\x1A')).toEqual({ bom: false, lignes: [], numeros: [] });
      expect(ctrlZ('\x1A\x1A')).toBe(true);
    });

    it('reconnaît le BOM d un fichier réduit au BOM suivi de 0x1A', () => {
      expect(decouper('\xEF\xBB\xBF\x1A')).toEqual({ bom: true, lignes: [], numeros: [] });
    });

    it('ne lit pas au-delà de la vue d un tableau (subarray)', () => {
      const tampon = enOctetsBruts('XA\r\n\x1AB');
      const resultat = decouperLignes(tampon.subarray(1, 5));
      expect(resultat.lignes.map((l) => [l.octets, l.finDeLigne])).toEqual([['A', '\r\n']]);
      expect(resultat.ctrlZFinal).toBe(true);
    });
  });
});
