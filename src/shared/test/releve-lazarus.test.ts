// Tests de `lireReleveLazarus` sur des relevés RTF et texte synthétiques (numéros fictifs).
import { describe, expect, it } from 'vitest';
import { lireReleveLazarus } from './releve-lazarus';

const octets = (texte: string): Uint8Array => new TextEncoder().encode(texte);
const lire = (texte: string) => lireReleveLazarus(octets(texte));

const ENTETE_RTF = String.raw`{\rtf1\ansi\ansicpg1252\deff0\nouicompat\deflang1036{\fonttbl{\f0\fnil Segoe UI;}{\f1\fnil\fcharset0 Segoe UI;}}
{\colortbl ;\red0\green0\blue255;\red0\green0\blue0;\red255\green0\blue0;\red0\green128\blue0;}
{\*\generator Riched20 10.0.26100}\viewkind4\uc1
\pard\f0\fs18\par
`;

/** Relevé WordPad type : deux erreurs entourées des lignes de titre et de fin. */
const RELEVE_RTF =
  ENTETE_RTF +
  String.raw`\cf1 ********************\par
Charger Le 13/10/2026 \f1\'e0 14:24:54\par
\cf2 Contr\f1\'f4le des donn\'e9es du dossier/\'e9v\'e8nement 12345678/001\par
\cf3\f0 Dossier/Ev\f1\'e8nement 12345678/001 : Entit\'e9 405 : caract\'e8re non autoris\'e9 dans le nom\par
\par
\f0\par
Dossier/Ev\f1\'e8nement 12345678/002 : Entit\'e9 120 : le code postal doit \'eatre compos\'e9 de 5 chiffres\par
\cf2 Fin des contr\'f4les\par
\cf4\f0 Le fichier P:\\Siege\\TEST\\MATH_12345678_000001.txt a \f1\'e9t\'e9 correctement charg\'e9.\par
}`;

describe('lireReleveLazarus : RTF de WordPad', () => {
  it('retient les lignes d erreur et ignore titres, fin des contrôles et chemin du fichier', () => {
    expect(lire(RELEVE_RTF)).toEqual([
      {
        dossier: '12345678',
        evenement: '001',
        message: 'Entité 405 : caractère non autorisé dans le nom',
      },
      {
        dossier: '12345678',
        evenement: '002',
        message: 'Entité 120 : le code postal doit être composé de 5 chiffres',
      },
    ]);
  });

  it('renvoie une liste vide pour un relevé sans erreur', () => {
    const sansErreur =
      ENTETE_RTF +
      String.raw`\cf1 ********************\par
Charger Le 13/10/2026 \f1\'e0 14:24:54\par
\cf2 Contr\f1\'f4le des donn\'e9es du dossier/\'e9v\'e8nement 12345678/001\par
Fin des contr\'f4les\par
}`;
    expect(lire(sansErreur)).toEqual([]);
  });

  it("décode \\'xx en Windows-1252 (euro en 0x80, guillemets en 0x93 et 0x94)", () => {
    const rtf = String.raw`{\rtf1\ansi Dossier/Ev\'e8nement 12345678/001 : Entit\'e9 405 : \'80 \'93a\'94\par}`;
    expect(lire(rtf)[0]!.message).toBe('Entité 405 : € “a”');
  });

  it('décode \\uN et saute le caractère de repli (\\uc1 par défaut)', () => {
    const rtf = String.raw`{\rtf1\ansi Dossier/Ev\u232?nement 12345678/001 : Entit\u233? 405 : x\u8364?y\par}`;
    expect(lire(rtf)).toEqual([
      { dossier: '12345678', evenement: '001', message: 'Entité 405 : x€y' },
    ]);
  });

  it('décode un \\uN négatif (16 bits signé)', () => {
    const rtf = String.raw`{\rtf1\ansi Dossier/Ev\u232?nement 12345678/001 : Entit\u233? 405 : \u-3999?\par}`;
    expect(lire(rtf)[0]!.message).toBe('Entité 405 : \uF061');
  });

  it("respecte \\ucN : aucun repli à 0, deux replis (dont un \\'xx) à 2", () => {
    const rtf0 = String.raw`{\rtf1\ansi\uc0 Dossier/Ev\u232nement 12345678/001 : Entit\u233  405 : ab\par}`;
    expect(lire(rtf0)[0]!.message).toBe('Entité 405 : ab');

    const rtf2 = String.raw`{\rtf1\ansi\uc2 Dossier/Ev\u232\'e8?nement 12345678/001 : Entit\u233?\'e9 405 : ab\par}`;
    expect(lire(rtf2)[0]!.message).toBe('Entité 405 : ab');
  });

  it('limite \\ucN à son groupe', () => {
    const rtf = String.raw`{\rtf1\ansi {\uc0 sans repli}\par Dossier/Ev\u232?nement 12345678/001 : Entit\u233? 405 : ab\par}`;
    expect(lire(rtf)[0]!.message).toBe('Entité 405 : ab');
  });

  it('transforme \\par et \\line en sauts de ligne', () => {
    const rtf = String.raw`{\rtf1\ansi Dossier/Ev\'e8nement 12345678/001 : Entit\'e9 405 : a\line Dossier/Ev\'e8nement 12345678/002 : Entit\'e9 120 : b\par}`;
    expect(lire(rtf).map((e) => [e.evenement, e.message])).toEqual([
      ['001', 'Entité 405 : a'],
      ['002', 'Entité 120 : b'],
    ]);
  });

  it('décode les échappements \\\\, \\{ et \\}', () => {
    const rtf = String.raw`{\rtf1\ansi Dossier/Ev\'e8nement 12345678/001 : Entit\'e9 405 : a\{b\}c\\d\par}`;
    expect(lire(rtf)[0]!.message).toBe('Entité 405 : a{b}c\\d');
  });

  it('ignore les groupes {\\fonttbl}, {\\colortbl} et {\\*…}, même avec une ligne d erreur', () => {
    const faux = String.raw`Dossier/Ev\'e8nement 99999999/999 : Entit\'e9 000 : ignore\par`;
    const rtf = String.raw`{\rtf1\ansi{\fonttbl ${faux}}{\colortbl ${faux}}{\*\generator ${faux}}Dossier/Ev\'e8nement 12345678/001 : Entit\'e9 405 : garde\par}`;
    expect(lire(rtf).map((e) => e.dossier)).toEqual(['12345678']);
  });

  it('ignore les mots de contrôle et les accolades inconnus, et les fins de ligne du source', () => {
    const rtf =
      "{\\rtf1\\ansi\\b\\fs20 {\\i Dossier/Ev\\'e8nement} 12345678/001\r\n : Entit\\'e9 405 : \\tab x\\par}";
    // Le saut de ligne du source RTF n'est pas du texte : la ligne reste d'un seul tenant.
    expect(lire(rtf)).toEqual([
      { dossier: '12345678', evenement: '001', message: 'Entité 405 : x' },
    ]);
  });

  it('retire les espaces de fin du message et garde ceux de l intérieur', () => {
    const rtf = String.raw`{\rtf1\ansi Dossier/Ev\'e8nement 12345678/001 : Entit\'e9 405 : a  b   \par}`;
    expect(lire(rtf)[0]!.message).toBe('Entité 405 : a  b');
  });
});

describe('lireReleveLazarus : texte UTF-8', () => {
  const TEXTE = [
    '********************',
    'Charger Le 13/10/2026 à 14:24:54',
    'Contrôle des données du dossier/évènement 12345678/001',
    'Dossier/Evènement 12345678/001 : Entité 405 : caractère non autorisé dans le nom',
    '',
    'Dossier/Evènement 87654321/002 : Entité 400 : rang de bénéficiaire incohérent   ',
    'Fin des contrôles',
    'Le fichier P:\\Siege\\TEST\\MATH_12345678_000001.txt a été correctement chargé.',
  ];
  const ATTENDU = [
    {
      dossier: '12345678',
      evenement: '001',
      message: 'Entité 405 : caractère non autorisé dans le nom',
    },
    {
      dossier: '87654321',
      evenement: '002',
      message: 'Entité 400 : rang de bénéficiaire incohérent',
    },
  ];

  it('lit un relevé en CRLF', () => {
    expect(lire(TEXTE.join('\r\n'))).toEqual(ATTENDU);
  });

  it('lit un relevé en LF', () => {
    expect(lire(TEXTE.join('\n'))).toEqual(ATTENDU);
  });

  it('lit un relevé avec BOM UTF-8', () => {
    const avecBom = new Uint8Array([0xef, 0xbb, 0xbf, ...octets(TEXTE.join('\r\n'))]);
    expect(lireReleveLazarus(avecBom)).toEqual(ATTENDU);
  });

  it('renvoie une liste vide pour un relevé sans erreur', () => {
    expect(lire(TEXTE.filter((l) => !l.startsWith('Dossier/')).join('\r\n'))).toEqual([]);
  });

  it('renvoie une liste vide pour un contenu vide', () => {
    expect(lireReleveLazarus(new Uint8Array())).toEqual([]);
  });

  it('ignore une ligne « Dossier/Evènement » dont le message ne commence pas par Entité', () => {
    expect(lire('Dossier/Evènement 12345678/001 : autre chose')).toEqual([]);
  });

  it('garde dossier et évènement tels quels, sans les convertir', () => {
    const [erreur] = lire('Dossier/Evènement 0000A123/0B1 : Entité 405 : x');
    expect(erreur).toEqual({ dossier: '0000A123', evenement: '0B1', message: 'Entité 405 : x' });
  });

  it('ignore une ligne de dossier ou d évènement trop court', () => {
    expect(lire('Dossier/Evènement 1234567/001 : Entité 405 : x')).toEqual([]);
  });
});
