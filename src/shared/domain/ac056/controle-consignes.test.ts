// Consignes des anomalies de contrôle (texte sous le champ, `DESIGN.md` §9.2) : une par règle,
// mention VEOS pour un champ non modifiable, aucune valeur lue, clonage structuré sans perte.
// Les messages de Lazarus sont vérifiés par `controle.test.ts` et `controle.lazarus.test.ts`.
// Fichiers synthétiques uniquement.
import { describe, expect, it } from 'vitest';
import { ligneSynthetique } from '@shared/test/ac056-synthetique';
import {
  avecChamp,
  controle,
  dansBeneficiaire,
  dansEvenement,
  INTERDIT,
  ligne,
  NON_AUTORISE,
} from '@shared/test/controle-ac056';
import { CONSIGNE_VEOS, REGLES } from './controle';
import { ENTITES, type CodeEntite } from './entites';
import {
  JEU_LISTE_1,
  JEU_LISTE_2,
  JEU_LISTE_3,
  JEU_NUMERIQUE,
  type JeuCaracteres,
} from './jeux-caracteres';
import type { AnomalieAc056 } from './modele';

/** [champ, code, consigne] de chaque anomalie. */
const consignes = (anomalies: readonly AnomalieAc056[]) =>
  anomalies.map((a) => [a.champ, a.code, a.consigne]);

const LISTE_1 =
  'Caractère non autorisé : lettres majuscules sans accent, chiffres, espace, tiret, apostrophe, barre oblique et point seulement.';
const LISTE_2 =
  'Caractère non autorisé : lettres sans accent (majuscules ou minuscules), chiffres, espace, tiret, tiret bas, apostrophe, barre oblique, point et arobase seulement.';
const LISTE_3 =
  'Caractère non autorisé : lettres majuscules sans accent et chiffres seulement, sans espace.';
const NUMERIQUE = 'Caractère non autorisé : chiffres seulement.';
const OCTET_INTERDIT =
  'Caractère interdit (lettre accentuée, caractère invisible ou spécial) : seuls les caractères sans accent sont acceptés.';

describe('consignes des jeux de caractères', () => {
  // [entité, champ, consigne attendue] : les 15 règles de jeu de `ucontrole.pas`.
  const JEUX: readonly [CodeEntite, string, string][] = [
    ['115', 'nom', LISTE_1],
    ['115', 'prenom1', LISTE_1],
    ['115', 'numInsee', LISTE_3],
    ['120', 'complementGeographique', LISTE_1],
    ['120', 'numeroVoie', LISTE_1],
    ['120', 'libelleVoie', LISTE_1],
    ['120', 'lieuDit', LISTE_1],
    ['120', 'libelleLocalite', LISTE_1],
    ['125', 'valeurCoordonneeCommunication', LISTE_2],
    ['405', 'nom', LISTE_1],
    ['405', 'prenom1', LISTE_1],
    ['405', 'numInsee', LISTE_3],
    ['405', 'nomJeuneFille', LISTE_1],
  ];

  it.each(JEUX)('%s %s : consigne du jeu, sans mention VEOS', (code, champ, consigne) => {
    const texte = avecChamp(ligne(code), code, champ, '#');
    const lignes = code === '405' ? dansBeneficiaire('AUTRE', texte) : dansEvenement(texte);
    expect(consignes(controle(lignes))).toEqual([[champ, NON_AUTORISE, consigne]]);
  });

  it('120 code postal : chiffres seulement, longueur correcte', () => {
    const lignes = dansEvenement(ligne('120', { codePostalLocalite: '75O01' }));
    expect(consignes(controle(lignes))).toEqual([['codePostalLocalite', NON_AUTORISE, NUMERIQUE]]);
  });

  it('couvre chaque règle de jeu de REGLES', () => {
    const regles = Object.values(REGLES).flatMap((r) => r ?? []);
    const jeux = regles.filter((regle) => {
      const verdict = regle.verifier('#' as never, '');
      return verdict?.code === NON_AUTORISE;
    });
    expect(jeux).toHaveLength(JEUX.length + 1);
  });

  // Chaque consigne décrit exactement son jeu : un mot par caractère ou famille de caractères.
  const MOTS: readonly [string, RegExp][] = [
    ['A', /majuscules/],
    ['a', /minuscules/],
    ['0', /chiffres/],
    [' ', /espace/],
    ['-', /tiret(?! bas)/],
    ['_', /tiret bas/],
    ["'", /apostrophe/],
    ['/', /barre oblique/],
    ['.', /point/],
    ['@', /arobase/],
  ];

  it.each([
    ['LISTE_1', JEU_LISTE_1, LISTE_1],
    ['LISTE_2', JEU_LISTE_2, LISTE_2],
    ['LISTE_3', JEU_LISTE_3, LISTE_3],
    ['NUMERIQUE', JEU_NUMERIQUE, NUMERIQUE],
  ] as [string, JeuCaracteres, string][])(
    '%s : la consigne cite chaque famille du jeu, et seulement elles',
    (_nom, jeu, consigne) => {
      const ecarts = MOTS.flatMap(([caractere, mot]) => {
        const dansJeu = jeu.has(caractere.charCodeAt(0));
        const cite = mot.test(consigne) && !(caractere === ' ' && /sans espace/.test(consigne));
        return dansJeu === cite ? [] : [`${JSON.stringify(caractere)} : jeu ${dansJeu}`];
      });
      expect(ecarts).toEqual([]);
    },
  );
});

describe('consigne du code postal', () => {
  it.each(['7500', '750011', ''])('longueur %j : 5 chiffres attendus', (codePostal) => {
    const lignes = dansEvenement(ligne('120', { codePostalLocalite: codePostal }));
    expect(consignes(controle(lignes))).toEqual([
      [
        'codePostalLocalite',
        'code-postal-longueur',
        'Longueur incorrecte : le code postal doit compter 5 chiffres.',
      ],
    ]);
  });
});

describe('consignes des rangs', () => {
  const ADULTE = '20 au plus pour un assuré principal ou un conjoint';
  const ENFANT = '39 au plus pour un enfant';

  it.each([
    ['ASSPRI', '21', ADULTE],
    ['CONJOI', '99', ADULTE],
    ['ENFANT', '40', ENFANT],
  ])('rang incohérent, type %s : maximum du type', (type, rang, maximum) => {
    const lignes = dansEvenement(ligneSynthetique('400', { typeAssure: type, rang }));
    expect(consignes(controle(lignes))).toEqual([
      ['rang', 'rang-incoherent', `Rang trop élevé : ${maximum}.`],
    ]);
  });

  it.each([
    ['ASSPRI', ADULTE],
    ['ENFANT', ENFANT],
  ])('rang non numérique, type %s : 2 chiffres et maximum du type', (type, maximum) => {
    const lignes = dansEvenement(ligneSynthetique('400', { typeAssure: type, rang: 'AB' }));
    expect(consignes(controle(lignes))).toEqual([
      ['rang', 'rang-non-numerique', `Rang non numérique : saisissez 2 chiffres, ${maximum}.`],
    ]);
  });

  it('dit quel rang est non numérique dans le message (divergence 4)', () => {
    const lignes = dansBeneficiaire('ENFANT', ligne('800', { rang: 'AB', rangPersonne: 'CD' }));
    expect(controle(lignes).map((a) => [a.champ, a.message, a.consigne])).toEqual([
      [
        'rang',
        'Entité 800 : rang de bénéficiaire non numérique',
        `Rang non numérique : saisissez 2 chiffres, ${ENFANT}.`,
      ],
      [
        'rangPersonne',
        'Entité 800 : rang de personne non numérique',
        `Rang non numérique : saisissez 2 chiffres, ${ENFANT}.`,
      ],
    ]);
  });

  it.each(['405', '410', '485', '490', '700', '800'] as const)(
    '%s : même consigne de rang qu en 400',
    (code) => {
      const lignes = dansBeneficiaire('CONJOI', ligne(code, { rang: '25' }));
      expect(consignes(controle(lignes))).toEqual([
        ['rang', 'rang-incoherent', `Rang trop élevé : ${ADULTE}.`],
      ]);
    },
  );
});

describe('consignes des codes et valeurs imposés (champs non modifiables)', () => {
  const sur = (code: '485' | '490', valeurs: Record<string, string>) =>
    consignes(controle(dansBeneficiaire('AUTRE', ligne(code, valeurs))));

  it.each([
    ['485', 'code', 'Code non accepté : COEFCO attendu.'],
    ['485', 'valeur', 'Valeur non acceptée : COUPLE attendue.'],
    ['490', 'code', 'Code non accepté : COEFCO ou REDAN attendu.'],
    ['490', 'valeur', 'Valeur non acceptée : NON attendue.'],
  ] as const)('%s %s : valeur attendue, puis mention VEOS', (code, champ, consigne) => {
    expect(sur(code, { [champ]: 'X' })).toEqual([
      [champ, 'valeur-imposee', `${consigne} ${CONSIGNE_VEOS}`],
    ]);
  });

  it('les champs code et valeur des 485 et 490 ne sont pas modifiables', () => {
    for (const code of ['485', '490'] as const) {
      const champs = ENTITES[code].champs.filter((c) => c.nom === 'code' || c.nom === 'valeur');
      expect(champs.map((c) => c.modifiable)).toEqual([false, false]);
    }
  });
});

describe('consigne de la divergence 5', () => {
  it('champ modifiable : consigne seule', () => {
    const texte = avecChamp(ligne('405'), '405', 'nom', '\tDUPONT');
    expect(consignes(controle(dansBeneficiaire('AUTRE', texte)))).toEqual([
      ['nom', INTERDIT, OCTET_INTERDIT],
    ]);
  });

  it('champ non modifiable : consigne puis mention VEOS', () => {
    const texte = avecChamp(ligne('405'), '405', 'prenom2', 'JOS\xC3\xA9');
    expect(consignes(controle(dansBeneficiaire('AUTRE', texte)))).toEqual([
      ['prenom2', INTERDIT, `${OCTET_INTERDIT} ${CONSIGNE_VEOS}`],
    ]);
  });

  it('message distinct de Lazarus : libellé de l écran et position de l octet fautif', () => {
    const lignes = dansEvenement();
    lignes[2] = avecChamp(ligneSynthetique('100'), '100', 'codeOffre', 'AB\tC');
    const [anomalie, ...autres] = controle(lignes);
    expect(autres).toEqual([]);
    const champ = ENTITES['100'].champs.find((c) => c.nom === 'codeOffre')!;
    expect(anomalie?.message).toBe(
      `Entité 100 : caractère interdit dans le champ « ${champ.libelle} », octet ${champ.position + 2}.`,
    );
    expect(anomalie?.message).not.toContain('non autorisé');
  });
});

describe('consignes : propriétés communes', () => {
  /** Une anomalie de chaque règle, plus la divergence 5 sur un champ non modifiable. */
  const toutes = () =>
    controle(
      dansEvenement(
        ligne('115', { nom: 'Secretzz', prenom1: 'Cache', numInsee: 'zz' }),
        ligne('120', { codePostalLocalite: 'Zz' }),
        ligne('125', { valeurCoordonneeCommunication: 'Prive#' }),
        ligneSynthetique('400', { typeAssure: 'ASSPRI', rang: 'Zz', rangPersonne: '99' }),
        ligne('485', { code: 'Conf', valeur: 'Prive' }),
        ligne('490', { code: 'Conf', valeur: 'Prive' }),
        avecChamp(ligne('405'), '405', 'prenom2', 'Cache\x01'),
      ),
    );

  it('toute anomalie de contrôle a une consigne, phrase complète, sans valeur lue', () => {
    const anomalies = toutes();
    expect(new Set(anomalies.map((a) => a.code)).size).toBeGreaterThanOrEqual(6);
    for (const anomalie of anomalies) {
      expect(anomalie.consigne).toMatch(/^[A-ZÀ-Ý].*\.$/);
      expect(anomalie.consigne).not.toMatch(/Secret|Cache|Zz|Conf|Prive/);
      expect(anomalie.message).not.toMatch(/Secret|Cache|Zz|Conf|Prive/);
    }
  });

  it('la consigne traverse le clonage structuré (IPC) sans perte', () => {
    const anomalies = toutes();
    expect(structuredClone(anomalies)).toStrictEqual(anomalies);
  });
});
