import { describe, expect, it } from 'vitest';
import {
  analyserContenu,
  cheminFichierSession,
  encoderLignes,
  formaterEntete,
  formaterHeure,
  formaterLigne,
  nettoyerComptePourNom,
  nomFichierSession,
} from './format';

// Heure locale : le Date est construit avec les composants locaux, jamais en UTC.
const DEBUT = new Date(2026, 9, 4, 9, 5, 7); // 04/10/2026 09:05:07

describe('nettoyerComptePourNom', () => {
  it.each([
    ['c.mathevon', 'c.mathevon'],
    ['Jean Dupont', 'Jean Dupont'],
    ['jean-pierre', 'jean-pierre'],
    ['é-ç', 'é-ç'],
  ])('garde %j tel quel', (compte, attendu) => {
    expect(nettoyerComptePourNom(compte)).toBe(attendu);
  });

  it.each([
    ['DOMAINE\\compte', 'DOMAINE_compte'],
    ['a/b', 'a_b'],
    ['a<b>c', 'a_b_c'],
    ['a:b', 'a_b'],
    ['a"b', 'a_b'],
    ['a|b', 'a_b'],
    ['a?b*c', 'a_b_c'],
    ['a\tb', 'a_b'],
    ['a\nb\rc', 'a_b_c'],
    ['a\0b', 'a_b'],
    ['a\u001fb', 'a_b'],
  ])('remplace les caractères interdits de %j par _', (compte, attendu) => {
    expect(nettoyerComptePourNom(compte)).toBe(attendu);
  });

  it.each([
    ['compte.', 'compte'],
    ['compte...', 'compte'],
    ['compte  ', 'compte'],
    ['compte. .', 'compte'],
  ])('retire les points et espaces de fin de %j', (compte, attendu) => {
    expect(nettoyerComptePourNom(compte)).toBe(attendu);
  });

  it('garde les points et espaces du milieu', () => {
    expect(nettoyerComptePourNom('a. b')).toBe('a. b');
  });

  it.each(['', '   ', '...', '. .'])('renvoie inconnu pour %j', (compte) => {
    expect(nettoyerComptePourNom(compte)).toBe('inconnu');
  });
});

describe('nomFichierSession et cheminFichierSession', () => {
  it('construit le nom avec des zéros à gauche et l’heure locale', () => {
    expect(nomFichierSession(DEBUT, 'c.mathevon')).toBe('20261004-090507-c.mathevon.txt');
  });

  it('utilise le compte nettoyé dans le nom', () => {
    expect(nomFichierSession(DEBUT, 'DOM\\jean.')).toBe('20261004-090507-DOM_jean.txt');
    expect(nomFichierSession(DEBUT, '')).toBe('20261004-090507-inconnu.txt');
  });

  it('construit le chemin AAAA/MM/nom', () => {
    expect(cheminFichierSession(DEBUT, 'c.mathevon')).toBe(
      '2026/10/20261004-090507-c.mathevon.txt',
    );
  });

  it('met un zéro au mois et au jour de janvier', () => {
    const debut = new Date(2027, 0, 2, 0, 0, 0);
    expect(cheminFichierSession(debut, 'a')).toBe('2027/01/20270102-000000-a.txt');
  });
});

describe('formaterHeure', () => {
  it('formate HH:MM:SS avec des zéros', () => {
    expect(formaterHeure(DEBUT)).toBe('09:05:07');
    expect(formaterHeure(new Date(2026, 0, 1, 23, 59, 59))).toBe('23:59:59');
    expect(formaterHeure(new Date(2026, 0, 1, 0, 0, 0))).toBe('00:00:00');
  });
});

describe('formaterLigne', () => {
  it('formate HH:MM:SS, tabulation, niveau, tabulation, message, CRLF', () => {
    expect(formaterLigne(DEBUT, 'INFO', 'Fichier chargé')).toBe(
      '09:05:07\tINFO\tFichier chargé\r\n',
    );
  });

  it.each(['TITRE', 'INFO', 'SUCCES', 'ERREUR'] as const)('écrit le niveau %s', (niveau) => {
    expect(formaterLigne(DEBUT, niveau, 'x')).toBe(`09:05:07\t${niveau}\tx\r\n`);
  });

  it('remplace \\r, \\n et \\t du message par une espace', () => {
    expect(formaterLigne(DEBUT, 'ERREUR', 'a\rb\nc\td')).toBe('09:05:07\tERREUR\ta b c d\r\n');
  });

  it('remplace aussi un CRLF par deux espaces et garde une seule fin de ligne', () => {
    const ligne = formaterLigne(DEBUT, 'INFO', 'a\r\nb');
    expect(ligne).toBe('09:05:07\tINFO\ta  b\r\n');
    expect(ligne.match(/\n/g)).toHaveLength(1);
  });

  it('accepte un message vide', () => {
    expect(formaterLigne(DEBUT, 'INFO', '')).toBe('09:05:07\tINFO\t\r\n');
  });
});

describe('formaterEntete', () => {
  it('produit exactement les 5 lignes attendues', () => {
    const entete = formaterEntete({
      debut: DEBUT,
      compte: 'c.mathevon',
      poste: 'PC042',
      mode: 'recette',
      version: '0.2.0',
    });
    expect(entete).toEqual([
      '09:05:07\tTITRE\tDébut de session le 04/10/2026 à 09:05:07\r\n',
      '09:05:07\tINFO\tCompte Windows : c.mathevon\r\n',
      '09:05:07\tINFO\tPoste : PC042\r\n',
      '09:05:07\tINFO\tMode : recette\r\n',
      '09:05:07\tINFO\tVersion de Flussi : 0.2.0\r\n',
    ]);
  });

  it('garde le compte brut (non nettoyé) mais sans saut de ligne', () => {
    const entete = formaterEntete({
      debut: DEBUT,
      compte: 'DOM\\jean.',
      poste: 'p\nq',
      mode: 'prod',
      version: '1.0.0',
    });
    expect(entete[1]).toBe('09:05:07\tINFO\tCompte Windows : DOM\\jean.\r\n');
    expect(entete[2]).toBe('09:05:07\tINFO\tPoste : p q\r\n');
    expect(entete[3]).toBe('09:05:07\tINFO\tMode : prod\r\n');
  });
});

describe('encoderLignes', () => {
  it('n’écrit pas de BOM', () => {
    const octets = encoderLignes(['09:05:07\tINFO\tx\r\n']);
    expect(Array.from(octets.slice(0, 3))).not.toEqual([0xef, 0xbb, 0xbf]);
    expect(Array.from(octets.slice(0, 2))).toEqual([0x30, 0x39]);
  });

  it('écrit des fins de ligne CRLF (0x0D 0x0A)', () => {
    const octets = encoderLignes([formaterLigne(DEBUT, 'INFO', 'x')]);
    expect(Array.from(octets.slice(-2))).toEqual([0x0d, 0x0a]);
  });

  it('encode les accents en UTF-8', () => {
    const octets = encoderLignes(['é']);
    expect(Array.from(octets)).toEqual([0xc3, 0xa9]);
  });

  it('concatène les lignes sans séparateur ajouté', () => {
    const texte = new TextDecoder().decode(encoderLignes(['a\r\n', 'b\r\n']));
    expect(texte).toBe('a\r\nb\r\n');
  });

  it('renvoie un tableau vide pour aucune ligne', () => {
    expect(encoderLignes([]).length).toBe(0);
  });
});

describe('analyserContenu', () => {
  const octets = (texte: string): Uint8Array => new TextEncoder().encode(texte);

  it('analyse des lignes conformes', () => {
    const lignes = analyserContenu(
      octets('09:05:07\tTITRE\tDébut\r\n09:05:08\tSUCCES\tOK\r\n09:05:09\tERREUR\tÉchec\r\n'),
    );
    expect(lignes).toEqual([
      { heure: '09:05:07', niveau: 'TITRE', message: 'Début' },
      { heure: '09:05:08', niveau: 'SUCCES', message: 'OK' },
      { heure: '09:05:09', niveau: 'ERREUR', message: 'Échec' },
    ]);
  });

  it('garde une ligne non conforme en brut, avec heure et niveau à null', () => {
    const lignes = analyserContenu(octets('texte libre\r\n09:05:07\tINFO\tok\r\n'));
    expect(lignes).toEqual([
      { heure: null, niveau: null, message: 'texte libre' },
      { heure: '09:05:07', niveau: 'INFO', message: 'ok' },
    ]);
  });

  it.each([
    ['niveau inconnu', '09:05:07\tDEBUG\tx'],
    ['heure mal formée', '9:05:07\tINFO\tx'],
    ['séparateur absent', '09:05:07 INFO x'],
    ['niveau en minuscules', '09:05:07\tinfo\tx'],
  ])('traite comme non conforme : %s', (_cas, ligne) => {
    expect(analyserContenu(octets(`${ligne}\r\n`))).toEqual([
      { heure: null, niveau: null, message: ligne },
    ]);
  });

  it('accepte le LF seul', () => {
    const lignes = analyserContenu(octets('09:05:07\tINFO\ta\n09:05:08\tINFO\tb\n'));
    expect(lignes.map((l) => l.message)).toEqual(['a', 'b']);
    expect(lignes.every((l) => l.niveau === 'INFO')).toBe(true);
  });

  it('ignore la dernière ligne vide', () => {
    expect(analyserContenu(octets('09:05:07\tINFO\ta\r\n'))).toHaveLength(1);
  });

  it('accepte un fichier sans fin de ligne finale', () => {
    expect(analyserContenu(octets('09:05:07\tINFO\ta'))).toHaveLength(1);
  });

  it('renvoie un tableau vide pour un fichier vide', () => {
    expect(analyserContenu(new Uint8Array())).toEqual([]);
  });

  it('garde une ligne vide du milieu comme ligne non conforme', () => {
    const lignes = analyserContenu(octets('09:05:07\tINFO\ta\r\n\r\n09:05:08\tINFO\tb\r\n'));
    expect(lignes).toHaveLength(3);
    expect(lignes[1]).toEqual({ heure: null, niveau: null, message: '' });
  });

  it('garde un message vide d’une ligne conforme', () => {
    expect(analyserContenu(octets('09:05:07\tINFO\t\r\n'))).toEqual([
      { heure: '09:05:07', niveau: 'INFO', message: '' },
    ]);
  });

  it('ne lève pas sur des octets UTF-8 invalides', () => {
    const contenu = new Uint8Array([...octets('09:05:07\tINFO\ta'), 0xff, 0xfe, 0x0d, 0x0a]);
    const lignes = analyserContenu(contenu);
    expect(lignes).toHaveLength(1);
    expect(lignes[0]?.niveau).toBe('INFO');
    expect(lignes[0]?.message.startsWith('a')).toBe(true);
  });

  it('relit ce que formaterLigne a écrit (aller-retour)', () => {
    const lignes = analyserContenu(
      encoderLignes([formaterLigne(DEBUT, 'SUCCES', 'Dépôt effectué : été.txt')]),
    );
    expect(lignes).toEqual([
      { heure: '09:05:07', niveau: 'SUCCES', message: 'Dépôt effectué : été.txt' },
    ]);
  });
});
