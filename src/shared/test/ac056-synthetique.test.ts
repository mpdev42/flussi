import { describe, expect, it } from 'vitest';
import { controlerAc056 } from '@shared/domain/ac056/controle';
import { CODES_ENTITE, ENTITES } from '@shared/domain/ac056/entites';
import { lireAc056 } from '@shared/domain/ac056/lecteur';
import {
  IDENTIFICATION_MSP_FICTIVE,
  enChaineBinaire,
  enOctetsBruts,
  enWindows1252,
  extraireChamp,
  fichierSynthetique,
  ligneRejet,
  ligneRejetSynthetique,
  ligneSynthetique,
  lignesCompletes,
  lignesDepuisCodes,
  lignesRejet,
} from './ac056-synthetique';

/** Code d'entité (octets 23 à 25) d'une ligne. */
const codeDe = (ligne: string) => ligne.slice(22, 25);

describe('ligneSynthetique', () => {
  it.each(CODES_ENTITE)('produit 700 caractères pour l entité %s', (code) => {
    expect(ligneSynthetique(code)).toHaveLength(700);
  });

  it.each(CODES_ENTITE)('place le code %s en position 23', (code) => {
    expect(codeDe(ligneSynthetique(code))).toBe(code);
  });

  it('répète le bourrage de chaque champ par défaut', () => {
    const ligne = ligneSynthetique('400');
    expect(extraireChamp(ligne, '400', 'numEmetteur')).toBe(' '.repeat(9));
    expect(extraireChamp(ligne, '400', 'numDossier')).toBe('0'.repeat(8));
    expect(extraireChamp(ligne, '400', 'rangPersonne')).toBe('00');
    expect(extraireChamp(ligne, '400', 'codePays')).toBe('   ');
  });

  it('place une valeur à gauche puis la bourre avec le bourrage du champ', () => {
    const ligne = ligneSynthetique('405', { nom: 'DUPONT', rang: '1' });
    expect(extraireChamp(ligne, '405', 'nom')).toBe('DUPONT' + ' '.repeat(44));
    expect(extraireChamp(ligne, '405', 'rang')).toBe('10');
  });

  it('accepte une valeur de la longueur exacte du champ', () => {
    const ligne = ligneSynthetique('405', { nom: 'A'.repeat(50) });
    expect(extraireChamp(ligne, '405', 'nom')).toBe('A'.repeat(50));
    expect(ligne).toHaveLength(700);
  });

  it('accepte des octets non ASCII jusqu à 0xFF', () => {
    const ligne = ligneSynthetique('405', { nom: '\xE9\xFF\xA0' });
    expect(extraireChamp(ligne, '405', 'nom').slice(0, 3)).toBe('\xE9\xFF\xA0');
  });

  it('lève sur un champ inconnu', () => {
    expect(() => ligneSynthetique('405', { inexistant: 'X' })).toThrow(/inconnu/);
  });

  it('lève si la valeur est plus longue que le champ', () => {
    expect(() => ligneSynthetique('405', { nom: 'A'.repeat(51) })).toThrow(/405.*nom/);
  });

  it('lève si un caractère dépasse 0xFF', () => {
    expect(() => ligneSynthetique('405', { nom: 'Ā' })).toThrow(/0xFF/);
  });

  it('reste stable : chaque champ par défaut vaut son bourrage répété', () => {
    const erreurs = ENTITES['400'].champs
      .filter((champ) => champ.nom !== 'numEntite')
      .filter(
        (champ) =>
          extraireChamp(ligneSynthetique('400'), '400', champ.nom) !==
          champ.bourrage.repeat(champ.longueur),
      )
      .map((champ) => champ.nom);
    expect(erreurs).toEqual([]);
  });
});

describe('extraireChamp', () => {
  it('lève sur un champ inconnu', () => {
    expect(() => extraireChamp(ligneSynthetique('405'), '405', 'inexistant')).toThrow(/inconnu/);
  });
});

describe('enOctetsBruts et enChaineBinaire', () => {
  it('sont réciproques sur les 256 valeurs d octet', () => {
    const tous = Uint8Array.from({ length: 256 }, (_, i) => i);
    expect(enOctetsBruts(enChaineBinaire(tous))).toEqual(tous);
  });

  it('supportent 200 000 octets', () => {
    const gros = new Uint8Array(200_000).fill(0x41);
    expect(enChaineBinaire(gros)).toHaveLength(200_000);
  });

  it('lèvent si un caractère dépasse 0xFF', () => {
    expect(() => enOctetsBruts('Ā')).toThrow(/0xFF/);
  });
});

describe('fichierSynthetique', () => {
  const A = 'A'.repeat(700);
  const B = 'B'.repeat(700);

  it('utilise CRLF, sans BOM et sans saut final par défaut', () => {
    expect(enChaineBinaire(fichierSynthetique([A, B]))).toBe(`${A}\r\n${B}`);
  });

  it('ajoute le saut final avec sautFinal', () => {
    expect(enChaineBinaire(fichierSynthetique([A, B], { sautFinal: true }))).toBe(
      `${A}\r\n${B}\r\n`,
    );
  });

  it('préfixe le BOM UTF-8 avec bom', () => {
    const octets = fichierSynthetique([A], { bom: true });
    expect(Array.from(octets.subarray(0, 4))).toEqual([0xef, 0xbb, 0xbf, 0x41]);
  });

  it.each([
    ['\n', '\n'],
    ['\r', '\r'],
  ] as const)('applique la fin %j à toutes les lignes', (fin, attendu) => {
    expect(enChaineBinaire(fichierSynthetique([A, B], { fin }))).toBe(`${A}${attendu}${B}`);
  });

  it('applique une fin par ligne avec un tableau', () => {
    const octets = fichierSynthetique([A, B, A], { fin: ['\n', '\r', '\r\n'] });
    expect(enChaineBinaire(octets)).toBe(`${A}\n${B}\r${A}`);
  });

  it('écrit la dernière fin du tableau seulement avec sautFinal', () => {
    const octets = fichierSynthetique([A, B], { fin: ['\n', '\r'], sautFinal: true });
    expect(enChaineBinaire(octets)).toBe(`${A}\n${B}\r`);
  });

  it('lève si le tableau de fins n a pas une fin par ligne', () => {
    expect(() => fichierSynthetique([A, B], { fin: ['\n'] })).toThrow(/fins/);
  });

  it('produit un fichier vide sans ligne', () => {
    expect(fichierSynthetique([])).toHaveLength(0);
  });

  it('produit le BOM seul sans ligne avec bom', () => {
    expect(Array.from(fichierSynthetique([], { bom: true }))).toEqual([0xef, 0xbb, 0xbf]);
  });

  it('accepte les lignes vides', () => {
    expect(enChaineBinaire(fichierSynthetique([A, '', B]))).toBe(`${A}\r\n\r\n${B}`);
  });
});

describe('lignesCompletes', () => {
  const lignes = lignesCompletes();
  const codes = lignes.map(codeDe);

  it('compte 138 lignes de 700 caractères', () => {
    expect(lignes).toHaveLength(138);
    expect(lignes.filter((ligne) => ligne.length !== 700)).toEqual([]);
  });

  it('commence par 000 et finit par 999', () => {
    expect(codes[0]).toBe('000');
    expect(codes[137]).toBe('999');
  });

  it('contient 2 dossiers 001 et 2 clôtures 995', () => {
    expect(codes.filter((code) => code === '001')).toHaveLength(2);
    expect(codes.filter((code) => code === '995')).toHaveLength(2);
  });

  it('contient 4 évènements 100 et 4 clôtures 990', () => {
    expect(codes.filter((code) => code === '100')).toHaveLength(4);
    expect(codes.filter((code) => code === '990')).toHaveLength(4);
  });

  it('suit l ordre des entités dans un évènement', () => {
    expect(codes.slice(2, 12)).toEqual([
      '100',
      '110',
      '115',
      '120',
      '125',
      '125',
      '130',
      '135',
      '155',
      '180',
    ]);
  });

  it('suit l ordre des entités dans un bénéficiaire', () => {
    expect(codes.slice(12, 23)).toEqual([
      '400',
      '405',
      '410',
      '411',
      '485',
      '485',
      '490',
      '490',
      '700',
      '700',
      '800',
    ]);
  });

  it('contient 8 bénéficiaires (400)', () => {
    expect(codes.filter((code) => code === '400')).toHaveLength(8);
  });

  it('ne produit aucune anomalie de contrôle', () => {
    const { fichier } = lireAc056(fichierSynthetique(lignes));
    expect(controlerAc056(fichier)).toEqual([]);
  });

  it('n utilise que des données fictives', () => {
    const noms = lignes
      .filter((ligne) => codeDe(ligne) === '405')
      .map((ligne) => extraireChamp(ligne, '405', 'nom').trim());
    expect(new Set(noms)).toEqual(new Set(['DUPONT']));
  });
});

describe('lignesCompletes avec dossiers', () => {
  it('produit le même résultat sans option, avec {} et avec dossiers: 2', () => {
    expect(lignesCompletes({})).toEqual(lignesCompletes());
    expect(lignesCompletes({ dossiers: 2 })).toEqual(lignesCompletes());
  });

  it.each([0, 1, 3, 80])('produit 2 + 68 x %i lignes avec %i dossiers', (dossiers) => {
    expect(lignesCompletes({ dossiers })).toHaveLength(2 + 68 * dossiers);
  });

  it('produit le squelette 000 et 999 sans dossier', () => {
    expect(lignesCompletes({ dossiers: 0 }).map(codeDe)).toEqual(['000', '999']);
  });

  it('numérote les dossiers à partir de 1', () => {
    const lignes = lignesCompletes({ dossiers: 3 });
    const numeros = lignes
      .filter((ligne) => codeDe(ligne) === '001')
      .map((ligne) => extraireChamp(ligne, '001', 'numDossier'));
    expect(numeros).toEqual(['00000001', '00000002', '00000003']);
  });

  it('produit des lignes de 700 caractères avec 80 dossiers', () => {
    const lignes = lignesCompletes({ dossiers: 80 });
    expect(lignes).toHaveLength(5442);
    expect(lignes.every((ligne) => ligne.length === 700)).toBe(true);
  });
});

describe('lignesDepuisCodes', () => {
  it('produit la ligne synthétique de chaque code', () => {
    expect(lignesDepuisCodes(['000', '405'])).toEqual([
      ligneSynthetique('000'),
      ligneSynthetique('405'),
    ]);
  });

  it('produit 700 espaces pour null', () => {
    expect(lignesDepuisCodes([null])).toEqual([' '.repeat(700)]);
  });

  it('produit un tableau vide sans code', () => {
    expect(lignesDepuisCodes([])).toEqual([]);
  });

  it('conserve l ordre des codes', () => {
    expect(lignesDepuisCodes(['999', null, '000']).map(codeDe)).toEqual(['999', '   ', '000']);
  });
});

describe('enWindows1252', () => {
  it('laisse l ASCII inchangé', () => {
    expect(enWindows1252('DUPONT 123')).toBe('DUPONT 123');
  });

  it('donne à un caractère Latin-1 son octet', () => {
    expect(enWindows1252('éàÿ')).toBe('\xE9\xE0\xFF');
  });

  it('donne 0x80 à « € » et 0x92 à « ’ »', () => {
    expect(enWindows1252('€’')).toBe('\x80\x92');
  });

  it('renvoie une chaîne vide pour un texte vide', () => {
    expect(enWindows1252('')).toBe('');
  });

  it.each(['Ā', '\u{1F600}', '\x85'])('lève sur le caractère non géré %j', (caractere) => {
    expect(() => enWindows1252(caractere)).toThrow(/non géré/);
  });
});

describe('ligneRejet', () => {
  const L405 = ligneSynthetique('405');

  it('ajoute l identification MSP de 18 octets à la ligne de 700 caractères', () => {
    const ligne = ligneRejet(L405);
    expect(ligne).toHaveLength(718);
    expect(ligne.slice(0, 700)).toBe(L405);
    expect(ligne.slice(700)).toBe(IDENTIFICATION_MSP_FICTIVE);
  });

  it('place le message à partir de l octet 719, tel quel', () => {
    const ligne = ligneRejet(L405, 'Message \xE9');
    expect(ligne.slice(718)).toBe('Message \xE9');
  });

  it('a une identification de la forme 9 chiffres, espace, 8 alphanumériques', () => {
    expect(IDENTIFICATION_MSP_FICTIVE).toMatch(/^\d{9} [A-Z0-9]{8}$/);
  });

  it('lève si la ligne ne fait pas 700 caractères', () => {
    expect(() => ligneRejet(L405.slice(0, 699))).toThrow(/699/);
  });

  it('lève si un caractère du message dépasse 0xFF', () => {
    expect(() => ligneRejet(L405, 'Ā')).toThrow(/0xFF/);
  });
});

describe('ligneRejetSynthetique', () => {
  it('place l émetteur TEST et le numéro de dossier sur 8 chiffres aux octets 1 à 17', () => {
    expect(ligneRejetSynthetique('100', 12).slice(0, 17)).toBe('TEST     00000012');
  });

  it.each(CODES_ENTITE)('place le code %s en position 23 sur 718 octets', (code) => {
    const ligne = ligneRejetSynthetique(code, 1);
    expect(codeDe(ligne)).toBe(code);
    expect(ligne).toHaveLength(718);
  });

  it('ajoute le message éventuel', () => {
    expect(ligneRejetSynthetique('990', 1, 'MSG')).toHaveLength(721);
  });
});

describe('lignesRejet', () => {
  const lignes = lignesRejet();
  const codes = lignes.map(codeDe);
  const cle = (ligne: string) => ligne.slice(0, 17);

  it('compte 138 lignes de 718 octets sans message', () => {
    expect(lignes).toHaveLength(138);
    expect(lignes.filter((ligne) => ligne.length !== 718)).toEqual([]);
  });

  it('reprend les lignes de lignesCompletes sur les 700 premiers octets, dans un autre ordre', () => {
    const base = lignesCompletes();
    expect(lignes.map((ligne) => ligne.slice(0, 700)).sort()).toEqual([...base].sort());
  });

  it('ajoute l identification MSP fictive à chaque ligne', () => {
    expect(lignes.every((ligne) => ligne.slice(700, 718) === IDENTIFICATION_MSP_FICTIVE)).toBe(
      true,
    );
  });

  it('place la 001 après la 995 de son dossier', () => {
    // Un dossier de 68 lignes : 2 évènements de 33 lignes (100 … 990), puis 995 et 001.
    expect(codes.slice(65, 69)).toEqual(['990', '995', '001', '100']);
    expect(codes.slice(133, 136)).toEqual(['990', '995', '001']);
    expect(codes.slice(0, 66).includes('001')).toBe(false);
  });

  it('ne garde aucune 001 avant la première 100 et finit par 000 puis 999', () => {
    expect(codes[0]).toBe('100');
    expect(codes.slice(-2)).toEqual(['000', '999']);
  });

  it('conserve 2 dossiers, 4 évènements et un seul 000 et 999', () => {
    expect(codes.filter((code) => code === '001')).toHaveLength(2);
    expect(codes.filter((code) => code === '995')).toHaveLength(2);
    expect(codes.filter((code) => code === '100')).toHaveLength(4);
    expect(codes.filter((code) => code === '000')).toHaveLength(1);
    expect(codes.filter((code) => code === '999')).toHaveLength(1);
  });

  it('donne aux 100, 990, 995 et 001 d un dossier les mêmes 17 premiers octets', () => {
    for (const code of ['100', '990', '995', '001']) {
      const cles = new Set(
        lignes
          .slice(0, 68)
          .filter((ligne) => codeDe(ligne) === code)
          .map(cle),
      );
      expect(cles.size, code).toBe(1);
      expect([...cles][0], code).toBe('TEST     00000001');
    }
  });

  it('donne une clé différente à chaque dossier et à la 000 et la 999', () => {
    expect(cle(lignes[0]!)).toBe('TEST     00000001');
    expect(cle(lignes[68]!)).toBe('TEST     00000002');
    expect(cle(lignes[136]!)).toBe('TEST     00000000');
    expect(cle(lignes[137]!)).toBe('TEST     00000000');
  });

  it('accepte une option dossiers', () => {
    expect(lignesRejet({ dossiers: 3 })).toHaveLength(2 + 68 * 3);
    expect(lignesRejet({ dossiers: 0 }).map(codeDe)).toEqual(['000', '999']);
  });

  it('ajoute les messages demandés d après le code et le rang, sans toucher aux autres lignes', () => {
    const avec = lignesRejet({
      message: (code, indice) => (code === '990' || indice === 1 ? `MSG${code}` : undefined),
    });
    expect(avec).toHaveLength(138);
    avec.forEach((ligne, i) => {
      const attendu = codes[i] === '990' ? 'MSG990' : i === 1 ? 'MSG110' : '';
      expect(ligne.slice(718), `rang ${i}`).toBe(attendu);
      expect(ligne.slice(0, 718)).toBe(lignes[i]);
    });
  });

  it('accepte un message en octets Windows-1252', () => {
    const avec = lignesRejet({ message: (code) => (code === '999' ? 'caf\xE9' : undefined) });
    expect(avec.at(-1)?.slice(718)).toBe('caf\xE9');
  });
});
