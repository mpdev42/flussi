// Texte affiché d'un champ : listes à parité de `SetComboIndex` (`fmain.pas:3230-3258`), dates à
// parité de `GetDateFromAc056` (`fmain.pas:3676`), avec les divergences de la décision 6 (code
// inconnu affiché brut, date vide affichée vide, date invalide affichée brute). Valeurs décodées en
// UTF-8 pour un fichier VEOS, en Windows-1252 pour un rejet MSP.
import { describe, expect, it } from 'vitest';
import { entreeListe, texteEntree, texteValeur, valeurAffichee } from './affichage';
import { ENTITES, type CodeEntite, type DescriptionChamp } from './entites';
import { octetsDepuisTexte, type Octets } from './octets';

function champ(code: CodeEntite, nom: string): DescriptionChamp {
  const trouve = ENTITES[code].champs.find((c) => c.nom === nom);
  if (trouve === undefined) throw new Error(`${code} ${nom} inconnu`);
  return trouve;
}

const o = (texte: string): Octets => octetsDepuisTexte(texte);
const brut = (chaine: string) => chaine as Octets;

describe('valeurAffichee, liste', () => {
  const typeAssure = champ('400', 'typeAssure');

  it('affiche « CODE - Libellé » pour un code de la liste', () => {
    expect(valeurAffichee(typeAssure, o('ENFANT'), 'veos')).toEqual({
      texte: 'ENFANT - Enfant',
      etat: 'normal',
    });
  });

  it('ignore la casse ASCII, et affiche l entrée de la liste', () => {
    expect(valeurAffichee(typeAssure, o('asspri'), 'veos')).toEqual({
      texte: 'ASSPRI - Assuré principal',
      etat: 'normal',
    });
  });

  it('ne plie pas la casse des lettres accentuées (SameText de FPC)', () => {
    const categorie = champ('400', 'categorieSociale');
    expect(entreeListe(categorie, o('COMMERCANT'), 'veos')?.libelle).toBe('Commerçant TNS');
    const civilite = { ...categorie, valeursAutorisees: [{ code: 'É', libelle: 'Test' }] };
    expect(entreeListe(civilite, o('é'), 'veos')).toBeNull();
    expect(entreeListe(civilite, o('É'), 'veos')).toEqual({ code: 'É', libelle: 'Test' });
  });

  it('affiche le code brut, état inconnue, pour un code absent', () => {
    expect(valeurAffichee(typeAssure, o('INCONN'), 'veos')).toEqual({
      texte: 'INCONN',
      etat: 'inconnue',
    });
  });

  it('ne trouve pas un code qui n est qu un préfixe d un autre', () => {
    // « C - » n'est pas le début de « CREATEUR ENT - … ».
    const categorie = champ('400', 'categorieSociale');
    expect(entreeListe(categorie, o('CREATEUR'), 'veos')).toBeNull();
    expect(entreeListe(categorie, o('CREATEUR ENT'), 'veos')?.code).toBe('CREATEUR ENT');
  });

  it('prend la première entrée d un code en double', () => {
    expect(entreeListe(champ('400', 'codeDepartement'), o('71'), 'veos')?.libelle).toBe(
      'Saone-et-loire',
    );
    expect(entreeListe(champ('400', 'codePays'), o('DJI'), 'veos')?.libelle).toBe('Djibouti');
  });

  it('affiche vide une valeur vide, sans trouver l entrée vide de situationFamille', () => {
    const situation = champ('400', 'situationFamille');
    expect(situation.valeursAutorisees?.[0]).toEqual({ code: '', libelle: '' });
    expect(entreeListe(situation, o(''), 'veos')).toBeNull();
    expect(valeurAffichee(situation, o(''), 'veos')).toEqual({ texte: '', etat: 'vide' });
    expect(valeurAffichee(situation, o('M'), 'veos')).toEqual({
      texte: 'M - Marié(e)',
      etat: 'normal',
    });
  });

  it('prend la valeur telle que lue : des espaces non rognés empêchent la correspondance', () => {
    expect(entreeListe(typeAssure, o('ENFANT '), 'veos')).toBeNull();
  });

  it('renvoie null pour un champ sans liste', () => {
    expect(entreeListe(champ('405', 'nom'), o('DUPONT'), 'veos')).toBeNull();
  });

  it('reconstitue le texte des entrées de fmain.lfm', () => {
    expect(texteEntree({ code: 'M', libelle: 'Marié(e)' })).toBe('M - Marié(e)');
    expect(texteEntree({ code: '', libelle: '' })).toBe('');
  });
});

describe('valeurAffichee, date', () => {
  const naissance = champ('400', 'dateNaissance');
  const anciennete = champ('400', 'dateAnciennete');

  it('affiche JJ/MM/AAAA', () => {
    expect(valeurAffichee(naissance, o('19800229'), 'veos')).toEqual({
      texte: '29/02/1980',
      etat: 'normal',
    });
  });

  it('rogne la date comme trim(ps_date), même pour un champ non rogné à la lecture', () => {
    expect(anciennete.trim).toBe(false);
    expect(valeurAffichee(anciennete, o('20240131'), 'veos')).toEqual({
      texte: '31/01/2024',
      etat: 'normal',
    });
    expect(valeurAffichee(anciennete, o('        '), 'veos')).toEqual({ texte: '', etat: 'vide' });
  });

  it('affiche vide une date vide (Lazarus : 30/12/1899)', () => {
    expect(valeurAffichee(naissance, o(''), 'veos')).toEqual({ texte: '', etat: 'vide' });
  });

  it.each(['19810229', '20241301', '20240100', '20240431', '00000101', '2024013', '2024-01-'])(
    'affiche brute, état invalide, la date %s',
    (valeur) => {
      expect(valeurAffichee(naissance, o(valeur), 'veos')).toEqual({
        texte: valeur,
        etat: 'invalide',
      });
    },
  );

  it('accepte le 29 février d une année divisible par 400, pas par 100', () => {
    expect(valeurAffichee(naissance, o('20000229'), 'veos').etat).toBe('normal');
    expect(valeurAffichee(naissance, o('19000229'), 'veos').etat).toBe('invalide');
  });
});

describe('valeurAffichee, texte', () => {
  it('décode l UTF-8', () => {
    expect(valeurAffichee(champ('405', 'nom'), brut('B\xC3\xA9GUIN'), 'veos')).toEqual({
      texte: 'BéGUIN',
      etat: 'normal',
    });
  });

  it('affiche vide une valeur vide', () => {
    expect(valeurAffichee(champ('405', 'nom'), o(''), 'veos')).toEqual({ texte: '', etat: 'vide' });
  });

  it('remplace un octet invalide par U+FFFD', () => {
    expect(valeurAffichee(champ('405', 'nom'), brut('A\xE9'), 'veos').texte).toBe('A\uFFFD');
  });

  it('renvoie un résultat figé', () => {
    expect(Object.isFrozen(valeurAffichee(champ('405', 'nom'), o('A'), 'veos'))).toBe(true);
  });
});

describe('texteValeur', () => {
  it('décode en UTF-8 une valeur d un fichier VEOS', () => {
    expect(texteValeur(brut('B\xC3\xA9GUIN'), 'veos')).toBe('BéGUIN');
    expect(texteValeur(brut('B\xC9GUIN'), 'veos')).toBe('B�GUIN');
  });

  it('décode en Windows-1252 une valeur d un rejet, sans U+FFFD', () => {
    expect(texteValeur(brut('B\xC9GUIN'), 'rejet')).toBe('BÉGUIN');
    expect(texteValeur(brut('\x80 l\x92a'), 'rejet')).toBe('€ l’a');
    expect(texteValeur(brut('B\xC3\xA9GUIN'), 'rejet')).toBe('BÃ©GUIN');
  });
});

describe('valeurAffichee, rejet (Windows-1252)', () => {
  it('décode un nom accentué en Windows-1252', () => {
    expect(valeurAffichee(champ('405', 'nom'), brut('B\xC9GUIN'), 'rejet')).toEqual({
      texte: 'BÉGUIN',
      etat: 'normal',
    });
  });

  it('trouve l entrée d une liste, y compris pour un code accentué', () => {
    const typeAssure = champ('400', 'typeAssure');
    expect(valeurAffichee(typeAssure, o('ENFANT'), 'rejet')).toEqual({
      texte: 'ENFANT - Enfant',
      etat: 'normal',
    });
    const civilite = { ...typeAssure, valeursAutorisees: [{ code: 'É', libelle: 'Test' }] };
    expect(entreeListe(civilite, brut('\xC9'), 'rejet')).toEqual({ code: 'É', libelle: 'Test' });
    expect(entreeListe(civilite, brut('\xC9'), 'veos')).toBeNull();
    expect(valeurAffichee(civilite, brut('\xC9'), 'rejet')).toEqual({
      texte: 'É - Test',
      etat: 'normal',
    });
  });

  it('affiche une date JJ/MM/AAAA, et brute une date invalide', () => {
    const naissance = champ('400', 'dateNaissance');
    expect(valeurAffichee(naissance, o('19800229'), 'rejet')).toEqual({
      texte: '29/02/1980',
      etat: 'normal',
    });
    expect(valeurAffichee(naissance, brut('1980022\xC9'), 'rejet')).toEqual({
      texte: '1980022É',
      etat: 'invalide',
    });
  });

  it('affiche le code brut décodé en Windows-1252 pour un code absent de la liste', () => {
    expect(valeurAffichee(champ('400', 'typeAssure'), brut('\xC9L\xC8VE'), 'rejet')).toEqual({
      texte: 'ÉLÈVE',
      etat: 'inconnue',
    });
  });
});
