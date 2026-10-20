import { describe, expect, it } from 'vitest';
import {
  CODES_ENTITE,
  ENTITES,
  LONGUEUR_CODE_ENTITE,
  LONGUEUR_LIGNE,
  POSITION_CODE_ENTITE,
  type CodeEntite,
  type DescriptionChamp,
} from './index';
import { RANG_BENEFICIAIRE, RANG_MODIFIABLE } from './entete';
import { figerProfond } from './gel';
import { CATEGORIES_SOCIALES } from './valeurs/categories-sociales';
import { CIVILITES } from './valeurs/civilites';
import { CONTEXTES } from './valeurs/contextes';
import { DEPARTEMENTS } from './valeurs/departements';
import { NATURES_VOIE } from './valeurs/natures-voie';
import { PAYS } from './valeurs/pays';

const CODES_BRUTS: readonly CodeEntite[] = ['000', '001', '990', '995', '999'];

/** En-tête commun aux 22 entités. */
const ENTETE = [
  { nom: 'numEmetteur', position: 1, longueur: 9, type: 'alphanumerique', bourrage: ' ' },
  { nom: 'numDossier', position: 10, longueur: 8, type: 'numerique', bourrage: '0' },
  { nom: 'numEvt', position: 18, longueur: 3, type: 'numerique', bourrage: '0' },
  { nom: 'rang', position: 21, longueur: 2, type: 'numerique', bourrage: '0' },
  { nom: 'numEntite', position: 23, longueur: 3, type: 'numerique', bourrage: '0' },
] as const;

type Couple = `${CodeEntite} ${string}`;

/** Tous les champs de toutes les entités, avec le code de leur entité. */
const TOUS_LES_CHAMPS: { code: CodeEntite; champ: DescriptionChamp }[] = CODES_ENTITE.flatMap(
  (code) => ENTITES[code].champs.map((champ) => ({ code, champ })),
);

function trouverChamp(code: CodeEntite, nom: string): DescriptionChamp {
  const champ = ENTITES[code].champs.find((c) => c.nom === nom);
  if (!champ) throw new Error(`Champ ${nom} introuvable dans l'entité ${code}`);
  return champ;
}

function couples(filtre: (champ: DescriptionChamp) => boolean): Couple[] {
  return TOUS_LES_CHAMPS.filter(({ champ }) => filtre(champ)).map(
    ({ code, champ }) => `${code} ${champ.nom}` as Couple,
  );
}

describe('Registre ENTITES', () => {
  it('contient exactement les 22 codes de CODES_ENTITE', () => {
    expect(CODES_ENTITE).toHaveLength(22);
    expect(Object.keys(ENTITES).sort()).toEqual([...CODES_ENTITE].sort());
  });

  it.each(CODES_ENTITE)('ENTITES[%s].code vaut le code de sa clé', (code) => {
    expect(ENTITES[code].code).toBe(code);
  });
});

describe('Constantes', () => {
  it('expose les dimensions de la ligne AC056', () => {
    expect(LONGUEUR_LIGNE).toBe(700);
    expect(POSITION_CODE_ENTITE).toBe(23);
    expect(LONGUEUR_CODE_ENTITE).toBe(3);
  });
});

describe('Découpage en champs', () => {
  describe.each(CODES_ENTITE)('entité %s', (code) => {
    const champs = ENTITES[code].champs;

    it('commence en position 1', () => {
      expect(champs[0]?.position).toBe(1);
    });

    it('enchaîne les champs sans trou ni chevauchement', () => {
      const erreurs: string[] = [];
      let attendu = 1;
      for (const champ of champs) {
        if (champ.position !== attendu) {
          erreurs.push(
            `entité ${code}, champ ${champ.nom} : position ${champ.position}, attendue ${attendu}`,
          );
        }
        attendu = champ.position + champ.longueur;
      }
      expect(erreurs).toEqual([]);
    });

    it(`se termine à l'octet ${LONGUEUR_LIGNE}`, () => {
      const dernier = champs[champs.length - 1];
      expect(dernier).toBeDefined();
      expect(dernier!.position + dernier!.longueur - 1).toBe(LONGUEUR_LIGNE);
    });

    it('a des longueurs entières strictement positives', () => {
      const erreurs = champs
        .filter((c) => !Number.isInteger(c.longueur) || c.longueur <= 0)
        .map((c) => `entité ${code}, champ ${c.nom} : longueur ${c.longueur}`);
      expect(erreurs).toEqual([]);
    });

    it('a des noms uniques en camelCase', () => {
      const erreurs: string[] = [];
      const vus = new Set<string>();
      for (const champ of champs) {
        if (!/^[a-z][a-zA-Z0-9]*$/.test(champ.nom)) {
          erreurs.push(`entité ${code}, champ ${champ.nom} : nom non camelCase`);
        }
        if (vus.has(champ.nom)) {
          erreurs.push(`entité ${code}, champ ${champ.nom} : nom en double`);
        }
        vus.add(champ.nom);
      }
      expect(erreurs).toEqual([]);
    });
  });
});

describe('En-tête commun', () => {
  describe.each(CODES_ENTITE)('entité %s', (code) => {
    it('débute par les 5 champs communs', () => {
      const obtenu = ENTITES[code].champs.slice(0, 5).map((c) => ({
        nom: c.nom,
        position: c.position,
        longueur: c.longueur,
        type: c.type,
        bourrage: c.bourrage,
        trim: c.trim,
      }));
      const attendu = ENTETE.map((c) => ({ ...c, trim: false }));
      expect(obtenu).toEqual(attendu);
    });
  });

  it('place numEntite en POSITION_CODE_ENTITE sur LONGUEUR_CODE_ENTITE', () => {
    const erreurs = CODES_ENTITE.filter((code) => {
      const champ = trouverChamp(code, 'numEntite');
      return champ.position !== POSITION_CODE_ENTITE || champ.longueur !== LONGUEUR_CODE_ENTITE;
    }).map((code) => `entité ${code} : numEntite mal placé`);
    expect(erreurs).toEqual([]);
  });
});

describe('Entités brutes', () => {
  it('ont brute à true pour exactement 000, 001, 990, 995 et 999', () => {
    const brutes = CODES_ENTITE.filter((code) => ENTITES[code].brute);
    expect(brutes).toEqual([...CODES_BRUTS].sort());
  });

  describe.each(CODES_BRUTS)('entité %s', (code) => {
    it("se compose de l'en-tête puis du champ donnees (26, 675)", () => {
      const champs = ENTITES[code].champs;
      expect(champs.map((c) => c.nom)).toEqual([...ENTETE.map((c) => c.nom), 'donnees']);
      expect(champs[5]).toMatchObject({ position: 26, longueur: 675 });
    });

    it('ne comporte aucun champ affiché ni modifiable', () => {
      const erreurs = ENTITES[code].champs
        .filter((c) => c.affiche || c.modifiable)
        .map((c) => `entité ${code}, champ ${c.nom}`);
      expect(erreurs).toEqual([]);
    });
  });

  describe.each(CODES_ENTITE.filter((code) => !CODES_BRUTS.includes(code)))(
    'entité non brute %s',
    (code) => {
      it('se termine par zoneNonDecrite', () => {
        const champs = ENTITES[code].champs;
        expect(champs[champs.length - 1]).toMatchObject({
          nom: 'zoneNonDecrite',
          type: 'alphanumerique',
          bourrage: ' ',
          trim: false,
          affiche: false,
        });
      });
    },
  );
});

describe('Cohérence type et bourrage', () => {
  it("a le type numerique si et seulement si le bourrage est '0'", () => {
    const erreurs = TOUS_LES_CHAMPS.filter(
      ({ champ }) => (champ.type === 'numerique') !== (champ.bourrage === '0'),
    ).map(({ code, champ }) => `entité ${code}, champ ${champ.nom}`);
    expect(erreurs).toEqual([]);
  });
});

describe('Champs modifiables', () => {
  const ATTENDUS: Couple[] = [
    '115 nom',
    '115 prenom1',
    '115 numInsee',
    '120 complementGeographique',
    '120 numeroVoie',
    '120 libelleVoie',
    '120 lieuDit',
    '120 codePostalLocalite',
    '120 libelleLocalite',
    '125 valeurCoordonneeCommunication',
    '400 rang',
    '400 rangPersonne',
    '405 rang',
    '405 nom',
    '405 prenom1',
    '405 numInsee',
    '405 nomJeuneFille',
    '410 rang',
    '485 rang',
    '490 rang',
    '700 rang',
    '800 rang',
    '800 rangPersonne',
  ];

  it('sont exactement les 23 champs attendus', () => {
    expect(ATTENDUS).toHaveLength(23);
    expect(couples((c) => c.modifiable).sort()).toEqual([...ATTENDUS].sort());
  });

  it('sont tous affichés', () => {
    const erreurs = TOUS_LES_CHAMPS.filter(({ champ }) => champ.modifiable && !champ.affiche).map(
      ({ code, champ }) => `entité ${code}, champ ${champ.nom}`,
    );
    expect(erreurs).toEqual([]);
  });
});

describe('maxLength', () => {
  /** Écarts conservés de Lazarus : maxLength différent de la longueur. */
  const ECARTS: Record<string, { longueur: number; maxLength: number }> = {
    '120 codePostalLocalite': { longueur: 10, maxLength: 5 },
    '485 valeur': { longueur: 10, maxLength: 9 },
    '490 valeur': { longueur: 20, maxLength: 9 },
    '700 appliquerStageCv': { longueur: 1, maxLength: 2 },
  };

  it('est porté par exactement 59 champs', () => {
    expect(couples((c) => c.maxLength !== undefined)).toHaveLength(59);
  });

  it('est absent (pas de clé) quand non défini', () => {
    const erreurs = TOUS_LES_CHAMPS.filter(
      ({ champ }) => 'maxLength' in champ && champ.maxLength === undefined,
    ).map(({ code, champ }) => `entité ${code}, champ ${champ.nom}`);
    expect(erreurs).toEqual([]);
  });

  it('vaut la longueur du champ, hors 4 écarts conservés', () => {
    const erreurs = TOUS_LES_CHAMPS.filter(
      ({ code, champ }) =>
        champ.maxLength !== undefined &&
        !(`${code} ${champ.nom}` in ECARTS) &&
        champ.maxLength !== champ.longueur,
    ).map(
      ({ code, champ }) =>
        `entité ${code}, champ ${champ.nom} : maxLength ${champ.maxLength}, longueur ${champ.longueur}`,
    );
    expect(erreurs).toEqual([]);
  });

  it.each(Object.entries(ECARTS))("conserve l'écart de %s", (couple, attendu) => {
    const [code, nom] = couple.split(' ') as [CodeEntite, string];
    const champ = trouverChamp(code, nom);
    expect(champ.longueur).toBe(attendu.longueur);
    expect(champ.maxLength).toBe(attendu.maxLength);
  });
});

describe('valeursAutorisees', () => {
  it('sont portées uniquement par des champs affichés et non modifiables', () => {
    const erreurs = TOUS_LES_CHAMPS.filter(
      ({ champ }) => champ.valeursAutorisees !== undefined && (!champ.affiche || champ.modifiable),
    ).map(({ code, champ }) => `entité ${code}, champ ${champ.nom}`);
    expect(erreurs).toEqual([]);
  });

  it('ne laissent pas de clé valeursAutorisees indéfinie', () => {
    const erreurs = TOUS_LES_CHAMPS.filter(
      ({ champ }) => 'valeursAutorisees' in champ && champ.valeursAutorisees === undefined,
    ).map(({ code, champ }) => `entité ${code}, champ ${champ.nom}`);
    expect(erreurs).toEqual([]);
  });

  describe('tailles des listes', () => {
    it.each([
      ['PAYS', PAYS, 239],
      ['DEPARTEMENTS', DEPARTEMENTS, 110],
      ['NATURES_VOIE', NATURES_VOIE, 211],
      ['CONTEXTES', CONTEXTES, 37],
      ['CATEGORIES_SOCIALES', CATEGORIES_SOCIALES, 17],
      ['CIVILITES', CIVILITES, 2],
    ] as const)('%s compte %i entrées', (_nom, liste, taille) => {
      expect(liste).toHaveLength(taille);
    });
  });

  describe('listes partagées par référence', () => {
    it.each([
      ['120', 'codePays', PAYS],
      ['130', 'codePays', PAYS],
      ['400', 'codePays', PAYS],
      ['120', 'codeDepartement', DEPARTEMENTS],
      ['400', 'codeDepartement', DEPARTEMENTS],
      ['115', 'codeCivilite', CIVILITES],
      ['405', 'codeCivilite', CIVILITES],
      ['100', 'codeContexte', CONTEXTES],
      ['120', 'codeNatureVoie', NATURES_VOIE],
      ['400', 'categorieSociale', CATEGORIES_SOCIALES],
    ] as const)('%s %s utilise la liste partagée', (code, nom, liste) => {
      expect(trouverChamp(code, nom).valeursAutorisees).toBe(liste);
    });
  });

  describe('recopie mot pour mot de Lazarus', () => {
    it('conserve les deux entrées DJI de PAYS (Djibouti et Fidji)', () => {
      const dji = PAYS.filter((p) => p.code === 'DJI');
      expect(dji.map((p) => p.libelle)).toEqual(['Djibouti', 'Fidji']);
    });

    it('conserve les deux espaces finaux du libellé de WSM', () => {
      expect(PAYS.find((p) => p.code === 'WSM')?.libelle).toBe('Samoa  ');
    });

    it("conserve le code '71' en double dans DEPARTEMENTS", () => {
      expect(DEPARTEMENTS.filter((d) => d.code === '71')).toHaveLength(2);
    });

    it.each(['CENT', 'CASS', 'OFF'])('conserve le code %s en double dans CONTEXTES', (valeur) => {
      expect(CONTEXTES.filter((c) => c.code === valeur)).toHaveLength(2);
    });

    it("commence la liste de 400 situationFamille par l'entrée vide", () => {
      const liste = trouverChamp('400', 'situationFamille').valeursAutorisees;
      expect(liste?.[0]).toEqual({ code: '', libelle: '' });
    });
  });
});

describe('Libellés', () => {
  it('sont présents si et seulement si le champ est affiché', () => {
    const erreurs = TOUS_LES_CHAMPS.filter(
      ({ champ }) => champ.affiche !== (champ.libelle !== undefined),
    ).map(({ code, champ }) => `entité ${code}, champ ${champ.nom}`);
    expect(erreurs).toEqual([]);
  });

  it('sont portés par exactement 93 champs', () => {
    expect(couples((c) => c.libelle !== undefined)).toHaveLength(93);
  });

  it('ne se terminent ni par « : » ni par une espace, et ne sont pas vides', () => {
    const erreurs = TOUS_LES_CHAMPS.filter(
      ({ champ }) => champ.libelle !== undefined && !/^\S(?:.*[^\s:])?$/.test(champ.libelle),
    ).map(({ code, champ }) => `entité ${code}, champ ${champ.nom}`);
    expect(erreurs).toEqual([]);
  });

  it('ne laissent pas de clé libelle indéfinie', () => {
    const erreurs = TOUS_LES_CHAMPS.filter(
      ({ champ }) => 'libelle' in champ && champ.libelle === undefined,
    ).map(({ code, champ }) => `entité ${code}, champ ${champ.nom}`);
    expect(erreurs).toEqual([]);
  });

  it.each([
    ['100', 'codeOffre', "Code de l'offre"],
    ['115', 'codeCivilite', 'Code civilité'],
    ['485', 'valeur', 'Valeur'],
    ['490', 'valeur', 'Valeur'],
    ['400', 'rang', 'Rang bénéficiaire'],
    ['400', 'rangPersonne', 'Rang personne'],
    ['800', 'rangPersonne', 'Rang personne'],
  ] as const)('%s %s : « %s »', (code, nom, libelle) => {
    expect(trouverChamp(code, nom).libelle).toBe(libelle);
  });
});

/** Chemins des objets et tableaux non gelés de l'arbre de `valeur`. */
function nonGeles(valeur: unknown, chemin: string): string[] {
  if (typeof valeur !== 'object' || valeur === null) return [];
  return [
    ...(Object.isFrozen(valeur) ? [] : [chemin]),
    ...Object.entries(valeur).flatMap(([cle, enfant]) => nonGeles(enfant, `${chemin}.${cle}`)),
  ];
}

describe('Gel en profondeur', () => {
  it.each([
    ['ENTITES', ENTITES],
    ['RANG_MODIFIABLE', RANG_MODIFIABLE],
    ['RANG_BENEFICIAIRE', RANG_BENEFICIAIRE],
    ['PAYS', PAYS],
    ['DEPARTEMENTS', DEPARTEMENTS],
    ['NATURES_VOIE', NATURES_VOIE],
    ['CONTEXTES', CONTEXTES],
    ['CATEGORIES_SOCIALES', CATEGORIES_SOCIALES],
    ['CIVILITES', CIVILITES],
  ] as const)('%s est gelé à tous les niveaux', (nom, table) => {
    expect(nonGeles(table, nom)).toEqual([]);
  });

  it('refuse toute modification, même dans une liste partagée', () => {
    const champ = trouverChamp('120', 'codePays') as { libelle?: string };
    expect(() => {
      champ.libelle = 'autre';
    }).toThrow(TypeError);
    expect(() => {
      (PAYS as unknown as { code: string }[]).push({ code: 'XXX' });
    }).toThrow(TypeError);
    expect(() => {
      (PAYS[0] as { libelle: string }).libelle = 'autre';
    }).toThrow(TypeError);
  });

  it('figerProfond garde les références et gèle un objet déjà gelé en surface', () => {
    const liste = [{ code: 'A' }];
    const table = Object.freeze({ a: liste, b: liste });
    expect(figerProfond(table)).toBe(table);
    expect(table.a).toBe(liste);
    expect(Object.isFrozen(liste[0])).toBe(true);
  });

  it('figerProfond laisse passer les valeurs simples', () => {
    expect(figerProfond(3)).toBe(3);
    expect(figerProfond(null)).toBe(null);
    expect(figerProfond('texte')).toBe('texte');
  });
});
