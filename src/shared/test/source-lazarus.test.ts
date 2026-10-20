import { describe, expect, it } from 'vitest';
import {
  analyserLfm,
  lireLfm,
  lireSourceLazarus,
  messagesControleLazarus,
  nomFlussi,
  proprieteChaine,
  proprieteChaines,
  proprieteNombre,
  trouverObjet,
  valeurLitteral,
} from './source-lazarus';

const LFM = [
  'object frmTest: TfrmTest',
  '  Left = 10',
  "  Caption = 'Fiche d''essai'",
  '  Options = [goFixedVertLine, goRowSelect]',
  '  object pcOnglets: TPageControl',
  '    object tsUn: TTabSheet',
  "      Caption = 'Un'#233't' + 'é'",
  '      object lblLong: TLabel',
  "        Caption = 'début '",
  "          + 'suite'#13#10",
  "          + 'fin'",
  '      end',
  '      object cbbListe: TComboBox',
  '        Items.Strings = (',
  "          ''",
  "          'A - Ah'",
  "          'B - L''abbé (bis)'",
  '        )',
  '      end',
  '      object sgGrille: TStringGrid',
  '        ColWidths = (',
  '          19',
  '          64)',
  '      end',
  '    end',
  '  end',
  '  object ilImages: TImageList',
  '    Bitmap = {',
  '      4C7A0300',
  '      00100000',
  '    }',
  '  end',
  'end',
  '',
].join('\r\n');

describe('valeurLitteral et nomFlussi', () => {
  it('lit un littéral Pascal', () => {
    expect(valeurLitteral("'l''assuré'")).toBe("l'assuré");
    expect(valeurLitteral("''")).toBe('');
  });

  it('nomme mécaniquement une variable Pascal', () => {
    expect(nomFlussi('s_num_dossier_n')).toBe('numDossier');
    expect(nomFlussi('s_prenom_1')).toBe('prenom1');
    expect(nomFlussi('s_date_effet_d')).toBe('dateEffet');
    expect(nomFlussi('s_e_service')).toBe('eService');
  });
});

describe('lireSourceLazarus', () => {
  it('lit une source UTF-8 et une source latin1', () => {
    expect(lireSourceLazarus('ucontrole.pas')).toContain('ajouter_controle_erreur');
    expect(lireSourceLazarus('uac056.pas', 'latin1')).toContain('AjouterEntite100');
  });

  it('lève pour un fichier absent', () => {
    expect(() => lireSourceLazarus('absent.pas')).toThrow();
  });

  it('extrait les 28 messages distincts de ucontrole.pas', () => {
    const messages = messagesControleLazarus();
    expect(messages.size).toBe(28);
    expect(messages).toContain('Entité 120 : le code postal doit être composé de 5 chiffres');
  });
});

describe('analyserLfm', () => {
  const racine = analyserLfm(LFM);

  it('lit les objets imbriqués, leur nom et leur type', () => {
    expect(racine).toMatchObject({ nom: 'frmTest', type: 'TfrmTest' });
    expect(racine.enfants.map((o) => o.nom)).toEqual(['pcOnglets', 'ilImages']);
    expect(trouverObjet(racine, 'cbbListe').type).toBe('TComboBox');
    expect(trouverObjet(racine, 'frmTest')).toBe(racine);
  });

  it('lève pour un objet absent', () => {
    expect(() => trouverObjet(racine, 'inconnu')).toThrow(/absent/);
  });

  it('lit nombres, ensembles et chaînes à apostrophe doublée', () => {
    expect(proprieteNombre(racine, 'Left')).toBe(10);
    expect(racine.proprietes.get('Options')).toEqual({
      nature: 'symbole',
      valeur: '[goFixedVertLine, goRowSelect]',
    });
    expect(proprieteChaine(racine, 'Caption')).toBe("Fiche d'essai");
    expect(proprieteChaine(racine, 'Absente')).toBeUndefined();
  });

  it('lit les codes #nnn et les concaténations, sur une ou plusieurs lignes', () => {
    expect(proprieteChaine(trouverObjet(racine, 'tsUn'), 'Caption')).toBe('Unété');
    expect(proprieteChaine(trouverObjet(racine, 'lblLong'), 'Caption')).toBe('début suite\r\nfin');
  });

  it('lit les listes de chaînes et de nombres, parenthèse collée comprise', () => {
    expect(proprieteChaines(trouverObjet(racine, 'cbbListe'), 'Items.Strings')).toEqual([
      '',
      'A - Ah',
      "B - L'abbé (bis)",
    ]);
    expect(trouverObjet(racine, 'sgGrille').proprietes.get('ColWidths')).toEqual({
      nature: 'liste',
      elements: [
        { nature: 'symbole', valeur: '19' },
        { nature: 'symbole', valeur: '64' },
      ],
    });
  });

  it('lit un binaire {…} sur plusieurs lignes comme un symbole', () => {
    expect(trouverObjet(racine, 'ilImages').proprietes.get('Bitmap')).toEqual({
      nature: 'symbole',
      valeur: '{4C7A030000100000}',
    });
  });

  it('lève sur une propriété de mauvaise nature', () => {
    expect(() => proprieteNombre(racine, 'Caption')).toThrow(/nombre/);
    expect(() => proprieteChaine(racine, 'Left')).toThrow(/chaîne/);
  });

  it('lève sur un objet non terminé', () => {
    expect(() => analyserLfm('object a: TA\n  Left = 1\n')).toThrow(/non terminé/);
  });
});

describe('lireLfm', () => {
  it('lit fmain.lfm en entier, de frmMain à timerMain', () => {
    const racine = lireLfm();
    expect(racine).toMatchObject({ nom: 'frmMain', type: 'TfrmMain' });
    expect(racine.enfants.at(-1)?.nom).toBe('timerMain');
    expect(proprieteChaine(trouverObjet(racine, 'lbl100CodeOffre'), 'Caption')).toBe(
      "Code l'offre :",
    );
  });
});
