// Règles de `ControlerEvenement` de Lazarus portées par `controlerAc056` : jeux de caractères,
// code postal, présence, rangs (et divergence 4), codes imposés des 485 et 490, rattachement,
// lignes brutes de code connu. Fichiers synthétiques uniquement.
// Les octets interdits (divergence 5), l'ordre, `champsModifies` et `controlerChamp` sont dans
// `controle-octets.test.ts`.
import { describe, expect, it } from 'vitest';
import {
  lignesCompletes,
  ligneSynthetique,
  fichierSynthetique,
} from '@shared/test/ac056-synthetique';
import {
  avecChamp,
  controle,
  dansBeneficiaire,
  dansEvenement,
  INTERDIT,
  ligne,
  lire,
  NON_AUTORISE,
  numerosDe,
  quadruplets,
  sansNumDossier,
  triplets,
} from '@shared/test/controle-ac056';
import { controlerAc056 } from './controle';
import { ENTITES, type CodeEntite } from './entites';
import { lireAc056 } from './lecteur';

describe('controlerAc056 : fichier conforme', () => {
  it('ne produit aucune anomalie pour lignesCompletes()', () => {
    expect(controle(lignesCompletes())).toEqual([]);
  });

  it('ne produit aucune anomalie pour un fichier sans ligne', () => {
    expect(controle([])).toEqual([]);
  });

  it('ne produit aucune anomalie pour un évènement sans bénéficiaire', () => {
    expect(controle(dansEvenement())).toEqual([]);
  });

  it('accepte une adresse électronique en minuscules dans la 125 (LISTE_2)', () => {
    const lignes = dansEvenement(
      ligne('125', { valeurCoordonneeCommunication: 'jean_dupont@example.invalid' }),
    );
    expect(controle(lignes)).toEqual([]);
  });

  it('accepte apostrophe, tiret, point et barre oblique dans le nom (LISTE_1)', () => {
    const lignes = dansBeneficiaire('AUTRE', ligne('405', { nom: "D'ART-GAN J./B" }));
    expect(controle(lignes)).toEqual([]);
  });

  it('gèle chaque anomalie et la marque bloquante, avec son champ', () => {
    const anomalies = controle(dansEvenement(ligne('115', { nom: '#', prenom1: '#' })));
    expect(anomalies).toHaveLength(2);
    for (const anomalie of anomalies) {
      expect(Object.isFrozen(anomalie)).toBe(true);
      expect(anomalie.bloquante).toBe(true);
      expect(anomalie.champ).toBeDefined();
    }
  });

  it('ne modifie pas le fichier', () => {
    const fichier = lire(dansEvenement(ligne('115', { nom: '#' })));
    const avant = JSON.stringify(fichier);
    controlerAc056(fichier);
    expect(JSON.stringify(fichier)).toBe(avant);
  });

  it('ne cite jamais la valeur lue dans un message', () => {
    const lignes = dansBeneficiaire(
      'ASSPRI',
      ligne('405', { nom: 'Secretzz', prenom1: 'Cache', rang: 'Zz' }),
      ligne('485', { code: 'Conf', valeur: 'Prive' }),
    );
    const messages = controle(lignes).map((a) => a.message);
    expect(messages.length).toBeGreaterThanOrEqual(4);
    for (const message of messages) {
      expect(message).not.toMatch(/Secret|Cache|Zz|Conf|Prive/);
    }
  });
});

describe('controlerAc056 : jeux de caractères (parité Lazarus)', () => {
  // [entité, champ, message attendu]. La valeur invalide est « # » : hors de tous les jeux.
  const REGLES_EVENEMENT: readonly [CodeEntite, string, string][] = [
    ['115', 'nom', 'Entité 115 : caractère non autorisé dans le nom'],
    ['115', 'prenom1', 'Entité 115 : caractère non autorisé dans le prénom'],
    ['115', 'numInsee', 'Entité 115 : caractère non autorisé dans le numéro INSEE'],
    [
      '120',
      'complementGeographique',
      'Entité 120 : caractère non autorisé dans le complément géographique',
    ],
    ['120', 'numeroVoie', 'Entité 120 : caractère non autorisé dans le numéro de voie'],
    ['120', 'libelleVoie', 'Entité 120 : caractère non autorisé dans le libellé de la voie'],
    ['120', 'lieuDit', 'Entité 120 : caractère non autorisé dans le lieu-dit'],
    ['120', 'codePostalLocalite', 'Entité 120 : caractère non autorisé dans le code postal'],
    [
      '120',
      'libelleLocalite',
      'Entité 120 : caractère non autorisé dans le libellé de la localité',
    ],
    ['125', 'valeurCoordonneeCommunication', 'Entité 125 : caractère non autorisé dans la valeur'],
  ];

  it.each(REGLES_EVENEMENT)('%s %s : signale un octet hors du jeu', (code, champ, message) => {
    // Code postal : 5 octets, pour ne tester que le jeu de caractères.
    const valeur = champ === 'codePostalLocalite' ? '1234#' : '#';
    const anomalies = controle(dansEvenement(ligne(code, { [champ]: valeur })));
    expect(quadruplets(anomalies)).toEqual([[4, champ, NON_AUTORISE, message]]);
  });

  const REGLES_405: readonly [string, string][] = [
    ['nom', 'Entité 405 : caractère non autorisé dans le nom'],
    ['prenom1', 'Entité 405 : caractère non autorisé dans le prénom'],
    ['numInsee', 'Entité 405 : caractère non autorisé dans le numéro INSEE'],
    ['nomJeuneFille', 'Entité 405 : caractère non autorisé dans le nom de jeune fille'],
  ];

  it.each(REGLES_405)('405 %s : signale un octet hors du jeu', (champ, message) => {
    const anomalies = controle(dansBeneficiaire('AUTRE', ligne('405', { [champ]: '#' })));
    expect(quadruplets(anomalies)).toEqual([[5, champ, NON_AUTORISE, message]]);
  });

  it.each([
    ['la minuscule en 115 nom (LISTE_1)', '115', 'nom', 'Dupont'],
    ['la minuscule en 405 prenom1 (LISTE_1)', '405', 'prenom1', 'Jean'],
    ['la minuscule en 115 numInsee (LISTE_3)', '115', 'numInsee', '1a'],
    ['une espace en 115 numInsee (LISTE_3)', '115', 'numInsee', '1 2'],
    ['une lettre en 120 codePostal (NUMERIQUE)', '120', 'codePostalLocalite', '1234A'],
    ['un tiret bas en 120 libelleVoie (LISTE_1)', '120', 'libelleVoie', 'RUE_X'],
    ['une arobase en 405 nom (LISTE_1)', '405', 'nom', 'A@B'],
    ['un « É » encodé en UTF-8 en 405 nom', '405', 'nom', '\xC3\x89'],
  ] as const)('signale %s', (_nom, code, champ, valeur) => {
    const l = ligne(code, { [champ]: valeur });
    const lignes = code === '405' ? dansBeneficiaire('AUTRE', l) : dansEvenement(l);
    const resultat = controle(lignes).filter((a) => a.champ === champ);
    expect(resultat.map((a) => a.code)).toEqual([NON_AUTORISE]);
  });

  it('accepte une valeur vide (valeur vide = valide)', () => {
    expect(controle(dansBeneficiaire('AUTRE', ligne('405'), ligne('115')))).toEqual([]);
  });

  it('contrôle chaque 125 et indique sa ligne', () => {
    const lignes = dansEvenement(
      ligne('125', { valeurCoordonneeCommunication: '#' }),
      ligne('125', { valeurCoordonneeCommunication: 'ok' }),
      ligne('125', { valeurCoordonneeCommunication: 'a#' }),
    );
    expect(triplets(controle(lignes))).toEqual([
      [4, 'valeurCoordonneeCommunication', NON_AUTORISE],
      [6, 'valeurCoordonneeCommunication', NON_AUTORISE],
    ]);
  });
});

describe('controlerAc056 : code postal de la 120', () => {
  const MESSAGE_LONGUEUR = 'Entité 120 : le code postal doit être composé de 5 chiffres';
  const MESSAGE_JEU = 'Entité 120 : caractère non autorisé dans le code postal';

  const codePostal = (valeur: string) =>
    quadruplets(controle(dansEvenement(ligne('120', { codePostalLocalite: valeur }))));

  it('accepte 5 chiffres', () => {
    expect(codePostal('12345')).toEqual([]);
  });

  it.each(['1234', '123456', '1', '1234567890', ''])(
    'refuse %j : longueur différente de 5',
    (valeur) => {
      expect(codePostal(valeur)).toEqual([
        [4, 'codePostalLocalite', 'code-postal-longueur', MESSAGE_LONGUEUR],
      ]);
    },
  );

  it('signale le jeu puis la longueur quand les deux échouent, dans cet ordre', () => {
    expect(codePostal('AB')).toEqual([
      [4, 'codePostalLocalite', NON_AUTORISE, MESSAGE_JEU],
      [4, 'codePostalLocalite', 'code-postal-longueur', MESSAGE_LONGUEUR],
    ]);
  });

  it('ne signale que le jeu pour 5 octets dont une lettre', () => {
    expect(codePostal('1234A')).toEqual([[4, 'codePostalLocalite', NON_AUTORISE, MESSAGE_JEU]]);
  });

  it('compte la longueur en octets : « é » en UTF-8 et 3 chiffres font 5 octets', () => {
    expect(codePostal('\xC3\xA9123')).toEqual([
      [4, 'codePostalLocalite', NON_AUTORISE, MESSAGE_JEU],
    ]);
  });

  it('compte la longueur en octets : « é » en UTF-8 et 4 chiffres font 6 octets', () => {
    expect(codePostal('\xC3\xA91234').map((a) => a[2])).toEqual([
      NON_AUTORISE,
      'code-postal-longueur',
    ]);
  });

  it('juge la valeur rognée : les espaces autour de 5 chiffres sont ignorés', () => {
    expect(codePostal('  12345')).toEqual([]);
    expect(codePostal('12345     ')).toEqual([]);
  });
});

describe('controlerAc056 : présence conditionnelle (numDossier vide)', () => {
  // Une ligne de 700 octets a toujours un numDossier de 8 octets : le cas se construit à la main.
  const CONDITIONNELLES: readonly [string, string[], number][] = [
    ['115', dansEvenement(ligne('115', { nom: '#' })), 4],
    ['120', dansEvenement(ligne('120', { libelleVoie: '#' })), 4],
    ['405', dansBeneficiaire('AUTRE', ligne('405', { nom: '#' })), 5],
    ['410', dansBeneficiaire('ASSPRI', ligne('410', { rang: '99' })), 5],
    ['800', dansBeneficiaire('ASSPRI', ligne('800', { rang: '99' })), 5],
  ];

  it.each(CONDITIONNELLES)('%s : contrôlée si numDossier est renseigné', (_code, lignes) => {
    expect(controle(lignes)).toHaveLength(1);
  });

  it.each(CONDITIONNELLES)('%s : non contrôlée si numDossier est vide', (_code, lignes, numero) => {
    expect(controlerAc056(sansNumDossier(lire(lignes), numero))).toEqual([]);
  });

  const TOUJOURS: readonly [string, string[], number][] = [
    ['125', dansEvenement(ligne('125', { valeurCoordonneeCommunication: '#' })), 4],
    ['400', dansEvenement(ligneSynthetique('400', { typeAssure: 'ASSPRI', rang: '99' })), 4],
    ['485', dansBeneficiaire('AUTRE', ligne('485', { code: 'X' })), 5],
    ['490', dansBeneficiaire('AUTRE', ligne('490', { code: 'X' })), 5],
    ['700', dansBeneficiaire('ASSPRI', ligne('700', { rang: '99' })), 5],
  ];

  it.each(TOUJOURS)('%s : toujours contrôlée', (_code, lignes, numero) => {
    expect(controlerAc056(sansNumDossier(lire(lignes), numero))).toHaveLength(1);
  });

  it('un numDossier vide ne désactive pas la divergence 5', () => {
    const fichier = sansNumDossier(lire(dansEvenement(ligne('115', { prenom2: '\x7F' }))), 4);
    expect(triplets(controlerAc056(fichier))).toEqual([[4, 'prenom2', INTERDIT]]);
  });
});

describe('controlerAc056 : rangs', () => {
  const BENEFICIAIRE = (code: string) => `Entité ${code} : rang de bénéficiaire incohérent`;
  const PERSONNE = (code: string) => `Entité ${code} : rang de personne incohérent`;
  const NON_NUMERIQUE = (code: string) => `Entité ${code} : rang non numérique`;

  /** Anomalies d'une 400 de type et de rangs donnés (ligne 4). */
  const sur400 = (typeAssure: string, rang: string, rangPersonne = '01') =>
    quadruplets(
      controle(dansEvenement(ligneSynthetique('400', { typeAssure, rang, rangPersonne }))),
    );

  describe('400', () => {
    it.each([
      ['ASSPRI', '20', false],
      ['ASSPRI', '21', true],
      ['ASSPRI', '99', true],
      ['ASSPRI', '00', false],
      ['ASSPRI', '-1', false],
      ['CONJOI', '20', false],
      ['CONJOI', '21', true],
      ['ENFANT', '39', false],
      ['ENFANT', '40', true],
      ['ENFANT', '99', true],
      ['ENFANT', '-9', false],
    ] as const)('rang : type %s rang %s, incohérent : %s', (type, rang, incoherent) => {
      expect(sur400(type, rang)).toEqual(
        incoherent ? [[4, 'rang', 'rang-incoherent', BENEFICIAIRE('400')]] : [],
      );
    });

    it.each([
      ['ASSPRI', '20', false],
      ['ASSPRI', '21', true],
      ['CONJOI', '21', true],
      ['ENFANT', '39', false],
      ['ENFANT', '40', true],
    ] as const)('rangPersonne : type %s rang %s, incohérent : %s', (type, rang, incoherent) => {
      expect(sur400(type, '01', rang)).toEqual(
        incoherent ? [[4, 'rangPersonne', 'rang-incoherent', PERSONNE('400')]] : [],
      );
    });

    it('signale le rang puis le rang de personne', () => {
      expect(
        triplets(
          controle(
            dansEvenement(
              ligneSynthetique('400', { typeAssure: 'ASSPRI', rang: '30', rangPersonne: '30' }),
            ),
          ),
        ),
      ).toEqual([
        [4, 'rang', 'rang-incoherent'],
        [4, 'rangPersonne', 'rang-incoherent'],
      ]);
    });

    it.each(['ASCEND', 'AUTRE', '', 'ASSPR', 'ENFAN', 'assp'])(
      'ne contrôle aucun rang pour le type %j, même 99',
      (type) => {
        expect(sur400(type, '99', '99')).toEqual([]);
      },
    );

    it.each(['ASCEND', 'AUTRE', ''])(
      'ne contrôle pas un rang non numérique pour le type %j (évaluation courte)',
      (type) => {
        expect(sur400(type, 'AB', 'ZZ')).toEqual([]);
      },
    );

    it.each([
      ['ASSPRI', 'AB'],
      ['CONJOI', 'AB'],
      ['ENFANT', 'AB'],
      ['ASSPRI', '5 '],
      ['ASSPRI', '1A'],
      ['ENFANT', 'Z9'],
    ])('divergence 4 : type %s, rang %j non numérique', (type, rang) => {
      expect(sur400(type, rang)).toEqual([[4, 'rang', 'rang-non-numerique', NON_NUMERIQUE('400')]]);
    });

    it('divergence 4 : un rang de personne non numérique est signalé sur son champ', () => {
      expect(sur400('ENFANT', '01', 'XX')).toEqual([
        [4, 'rangPersonne', 'rang-non-numerique', NON_NUMERIQUE('400')],
      ]);
    });

    it('divergence 4 : un rang de personne blanc n est pas rogné, il reste non numérique', () => {
      expect(sur400('ASSPRI', '01', '  ').map((a) => a[2])).toEqual(['rang-non-numerique']);
    });

    it('lit le rang comme StrToInt : espace de tête, signe plus, hexadécimal', () => {
      for (const rang of [' 5', '+9', '$A', 'xF']) expect(sur400('ASSPRI', rang)).toEqual([]);
    });
  });

  describe('405, 410, 485, 490, 700 et 800 : rang jugé avec le type de la 400', () => {
    const AUTRES: readonly CodeEntite[] = ['405', '410', '485', '490', '700', '800'];

    it.each(AUTRES)('%s : rang 21 incohérent pour ASSPRI et CONJOI, rang 20 cohérent', (code) => {
      for (const type of ['ASSPRI', 'CONJOI']) {
        expect(quadruplets(controle(dansBeneficiaire(type, ligne(code, { rang: '21' }))))).toEqual([
          [5, 'rang', 'rang-incoherent', BENEFICIAIRE(code)],
        ]);
        expect(controle(dansBeneficiaire(type, ligne(code, { rang: '20' })))).toEqual([]);
      }
    });

    it.each(AUTRES)('%s : rang 40 incohérent pour ENFANT, rang 39 cohérent', (code) => {
      expect(
        quadruplets(controle(dansBeneficiaire('ENFANT', ligne(code, { rang: '40' })))),
      ).toEqual([[5, 'rang', 'rang-incoherent', BENEFICIAIRE(code)]]);
      expect(controle(dansBeneficiaire('ENFANT', ligne(code, { rang: '39' })))).toEqual([]);
      expect(controle(dansBeneficiaire('ENFANT', ligne(code, { rang: '21' })))).toEqual([]);
    });

    it.each(AUTRES)('%s : aucun contrôle de rang pour un autre type', (code) => {
      expect(controle(dansBeneficiaire('AUTRE', ligne(code, { rang: '99' })))).toEqual([]);
      expect(controle(dansBeneficiaire('', ligne(code, { rang: 'ZZ' })))).toEqual([]);
    });

    it.each(AUTRES)('%s : rang non numérique avec un type concerné (divergence 4)', (code) => {
      expect(
        quadruplets(controle(dansBeneficiaire('ASSPRI', ligne(code, { rang: 'AB' })))),
      ).toEqual([[5, 'rang', 'rang-non-numerique', NON_NUMERIQUE(code)]]);
    });

    it('aucune de ces entités n a de champ typeAssure : seule la 400 donne le type', () => {
      for (const code of AUTRES) {
        expect(ENTITES[code].champs.some((c) => c.nom === 'typeAssure')).toBe(false);
      }
    });

    it('chaque bénéficiaire est jugé avec sa propre 400', () => {
      const lignes = dansEvenement(
        ligneSynthetique('400', { typeAssure: 'ASSPRI' }),
        ligne('405', { rang: '30' }),
        ligneSynthetique('400', { typeAssure: 'ENFANT' }),
        ligne('405', { rang: '30' }),
        ligne('700', { rang: '45' }),
      );
      expect(triplets(controle(lignes))).toEqual([
        [5, 'rang', 'rang-incoherent'],
        [8, 'rang', 'rang-incoherent'],
      ]);
    });

    it('contrôle chaque 485, 490 et 700', () => {
      const lignes = dansBeneficiaire(
        'ASSPRI',
        ligne('485', { rang: '25' }),
        ligne('485', { rang: '05' }),
        ligne('485', { rang: '26' }),
        ligne('490', { rang: '27' }),
        ligne('700', { rang: '28' }),
        ligne('700', { rang: '29' }),
      );
      expect(triplets(controle(lignes))).toEqual([
        [5, 'rang', 'rang-incoherent'],
        [7, 'rang', 'rang-incoherent'],
        [8, 'rang', 'rang-incoherent'],
        [9, 'rang', 'rang-incoherent'],
        [10, 'rang', 'rang-incoherent'],
      ]);
    });

    it('800 : contrôle le rang de personne avec le type de la 400', () => {
      const sur800 = (type: string, rangPersonne: string) =>
        quadruplets(controle(dansBeneficiaire(type, ligne('800', { rangPersonne }))));
      expect(sur800('CONJOI', '21')).toEqual([
        [5, 'rangPersonne', 'rang-incoherent', PERSONNE('800')],
      ]);
      expect(sur800('ENFANT', '40')).toEqual([
        [5, 'rangPersonne', 'rang-incoherent', PERSONNE('800')],
      ]);
      expect(sur800('ENFANT', '39')).toEqual([]);
      expect(sur800('AUTRE', '99')).toEqual([]);
    });

    it('800 : signale le rang puis le rang de personne', () => {
      const lignes = dansBeneficiaire('ASSPRI', ligne('800', { rang: '22', rangPersonne: '23' }));
      expect(triplets(controle(lignes))).toEqual([
        [5, 'rang', 'rang-incoherent'],
        [5, 'rangPersonne', 'rang-incoherent'],
      ]);
    });

    it('800 : un rang de personne blanc est rogné en vide, donc non numérique si le type est concerné', () => {
      const blanc = ligne('800', { rangPersonne: '  ' });
      expect(quadruplets(controle(dansBeneficiaire('ASSPRI', blanc)))).toEqual([
        [5, 'rangPersonne', 'rang-non-numerique', NON_NUMERIQUE('800')],
      ]);
      expect(controle(dansBeneficiaire('AUTRE', blanc))).toEqual([]);
    });
  });
});

describe('controlerAc056 : codes et valeurs imposés des 485 et 490', () => {
  const sur = (...lignes: string[]) => quadruplets(controle(dansBeneficiaire('AUTRE', ...lignes)));
  const surTriplets = (...lignes: string[]) =>
    triplets(controle(dansBeneficiaire('AUTRE', ...lignes)));
  const l485 = (code: string, valeur: string) => ligneSynthetique('485', { code, valeur });
  const l490 = (code: string, valeur: string) => ligneSynthetique('490', { code, valeur });
  const CODE_485 = 'Entité 485 : le code doit être égal à COEFCO';
  const CODE_490 = 'Entité 490 : le code doit être égal à COEFCO ou REDAN';

  it('accepte COEFCO / COUPLE en 485', () => {
    expect(sur(l485('COEFCO', 'COUPLE'))).toEqual([]);
  });

  it.each(['REDAN', 'coefco', ''])('refuse le code %j en 485', (code) => {
    expect(sur(l485(code, 'COUPLE'))).toEqual([[5, 'code', 'valeur-imposee', CODE_485]]);
  });

  it.each(['SEUL', 'couple', ''])('refuse la valeur %j en 485', (valeur) => {
    expect(sur(l485('COEFCO', valeur))).toEqual([
      [5, 'valeur', 'valeur-imposee', 'Entité 485 : la valeur doit être égale à COUPLE'],
    ]);
  });

  it('signale le code puis la valeur en 485', () => {
    expect(surTriplets(l485('X', 'Y'))).toEqual([
      [5, 'code', 'valeur-imposee'],
      [5, 'valeur', 'valeur-imposee'],
    ]);
  });

  it('contrôle chaque 485', () => {
    const bonne = l485('COEFCO', 'COUPLE');
    const mauvaise = l485('COEFCO', 'X');
    expect(surTriplets(mauvaise, bonne, mauvaise)).toEqual([
      [5, 'valeur', 'valeur-imposee'],
      [7, 'valeur', 'valeur-imposee'],
    ]);
  });

  it.each(['COEFCO', 'REDAN', 'REDAN '])('accepte le code %j en 490', (code) => {
    expect(sur(l490(code, 'NON'))).toEqual([]);
  });

  it.each(['redan', 'REDAN1', 'COEF', 'COUPLE', ''])('refuse le code %j en 490', (code) => {
    expect(sur(l490(code, 'NON'))).toEqual([[5, 'code', 'valeur-imposee', CODE_490]]);
  });

  it.each(['OUI', 'non', ''])('refuse la valeur %j en 490', (valeur) => {
    expect(sur(l490('COEFCO', valeur))).toEqual([
      [5, 'valeur', 'valeur-imposee', 'Entité 490 : la valeur doit être égale à NON'],
    ]);
  });

  it('contrôle chaque 490', () => {
    const bonne = l490('REDAN', 'NON');
    const mauvaise = l490('REDAN', 'OUI');
    expect(surTriplets(bonne, mauvaise, mauvaise)).toEqual([
      [6, 'valeur', 'valeur-imposee'],
      [7, 'valeur', 'valeur-imposee'],
    ]);
  });
});

describe('controlerAc056 : seules les lignes rattachées suivent les règles de Lazarus', () => {
  it('ne contrôle pas une 405 en double non rattachée (le dernier gagne)', () => {
    const lignes = dansBeneficiaire(
      'AUTRE',
      ligne('405', { nom: '#' }),
      ligne('405', { nom: 'DUPONT' }),
    );
    expect(controle(lignes)).toEqual([]);
  });

  it('contrôle la dernière 405 d un bénéficiaire', () => {
    const lignes = dansBeneficiaire(
      'AUTRE',
      ligne('405', { nom: 'DUPONT' }),
      ligne('405', { nom: '#' }),
    );
    expect(triplets(controle(lignes))).toEqual([[6, 'nom', NON_AUTORISE]]);
  });

  it('ne contrôle pas une 115 en double non rattachée, mais la divergence 5 la couvre', () => {
    const lignes = dansEvenement(
      ligne('115', { nom: '#', prenom2: '\x01' }),
      ligne('115', { nom: 'DUPONT' }),
    );
    expect(triplets(controle(lignes))).toEqual([[4, 'prenom2', INTERDIT]]);
  });

  it('ne contrôle pas une 405 placée avant toute 400', () => {
    expect(controle(dansEvenement(ligne('405', { nom: '#' })))).toEqual([]);
  });

  it('ne contrôle pas une 125 placée avant toute 100', () => {
    const lignes = [
      ligneSynthetique('000'),
      ligneSynthetique('001'),
      ligne('125', { valeurCoordonneeCommunication: '#' }),
      ligneSynthetique('100'),
      ligneSynthetique('990'),
      ligneSynthetique('995'),
      ligneSynthetique('999'),
    ];
    expect(controle(lignes)).toEqual([]);
  });

  it('parcourt tous les dossiers, évènements et bénéficiaires', () => {
    const lignes = lignesCompletes().map((texte) =>
      texte.slice(22, 25) === '405' ? avecChamp(texte, '405', 'nom', '#') : texte,
    );
    const numeros = numerosDe(lignes, '405');
    expect(numeros).toHaveLength(8);
    expect(triplets(controle(lignes))).toEqual(numeros.map((n) => [n, 'nom', NON_AUTORISE]));
  });

  it('juge chaque bénéficiaire de lignesCompletes() avec le type de sa 400', () => {
    const lignes = lignesCompletes().map((texte) =>
      texte.slice(22, 25) === '700' ? avecChamp(texte, '700', 'rang', '30') : texte,
    );
    // Les 700 du rang 01 sont ASSPRI (incohérent à 30), celles du rang 02 sont CONJOI (idem).
    expect(controle(lignes)).toHaveLength(numerosDe(lignes, '700').length);
    const enfants = lignes.map((texte) =>
      texte.slice(22, 25) === '400' ? avecChamp(texte, '400', 'typeAssure', 'ENFANT') : texte,
    );
    expect(controle(enfants)).toEqual([]);
  });
});

describe('controlerAc056 : lignes brutes de code connu et non brut', () => {
  it('applique les règles aux positions en octets pour une 115 de 701 octets', () => {
    const l115 = avecChamp(ligneSynthetique('115'), '115', 'nom', '#') + ' ';
    const lecture = lireAc056(fichierSynthetique(dansEvenement(l115)));
    expect(lecture.anomalies.map((a) => a.code)).toContain('longueur-ligne');
    expect(quadruplets(controlerAc056(lecture.fichier))).toEqual([
      [4, 'nom', NON_AUTORISE, 'Entité 115 : caractère non autorisé dans le nom'],
    ]);
  });

  it('applique les règles à une 115 de 699 octets', () => {
    const l115 = avecChamp(ligneSynthetique('115'), '115', 'prenom1', '#').slice(0, 699);
    expect(triplets(controle(dansEvenement(l115)))).toEqual([[4, 'prenom1', NON_AUTORISE]]);
  });

  it('lit le type d assuré d une 400 brute de 699 octets', () => {
    const l400 = ligneSynthetique('400', { typeAssure: 'ASSPRI', rang: '99' }).slice(0, 699);
    const lignes = dansEvenement(l400, ligne('405', { rang: '99' }));
    expect(triplets(controle(lignes))).toEqual([
      [4, 'rang', 'rang-incoherent'],
      [5, 'rang', 'rang-incoherent'],
    ]);
  });

  it('applique les règles d une 120 de 701 octets, code postal compris', () => {
    const l120 = ligne('120', { codePostalLocalite: '123' }) + ' ';
    expect(triplets(controle(dansEvenement(l120)))).toEqual([
      [4, 'codePostalLocalite', 'code-postal-longueur'],
    ]);
  });

  it('rattache les octets au-delà de 700 au dernier champ', () => {
    const l115 = ligneSynthetique('115') + '\x01';
    expect(quadruplets(controle(dansEvenement(l115)))).toEqual([
      [
        4,
        'zoneNonDecrite',
        INTERDIT,
        'Entité 115 : caractère non autorisé dans le champ zoneNonDecrite (octets 271 à 700)',
      ],
    ]);
  });

  it('rattache les octets au-delà de 700 au dernier champ d une 000', () => {
    const l000 = ligneSynthetique('000') + ' \x7F';
    expect(triplets(controle([l000]))).toEqual([[1, 'donnees', INTERDIT]]);
  });
});
