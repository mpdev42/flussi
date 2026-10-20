// Parité de la description des entités avec la source Lazarus (`uac056.pas`, copie conforme).
// Les lectures (`Copy(ps_ligne, P, L)`) et les écritures (`AddCharR`) de Lazarus sont analysées
// puis comparées champ par champ à `ENTITES`. Le fichier source ne contient aucune donnée
// personnelle.
import { describe, expect, it } from 'vitest';
import { lireSourceLazarus, nomFlussi } from '@shared/test/source-lazarus';
import { ENTITES, type CodeEntite, type TypeChamp } from './index';

/** Entités non brutes, lues et écrites champ par champ par Lazarus. */
const CODES_DECRITS: readonly CodeEntite[] = [
  '100',
  '110',
  '115',
  '120',
  '125',
  '130',
  '135',
  '155',
  '180',
  '400',
  '405',
  '410',
  '411',
  '485',
  '490',
  '700',
  '800',
];

/**
 * Écarts connus et sans effet entre la largeur d'écriture `AddCharR` et la longueur de lecture
 * `Copy` de Lazarus (valeurs toujours plus courtes que la largeur).
 */
const ECARTS_LARGEUR: Partial<Record<CodeEntite, readonly string[]>> = {
  '110': ['monnaieGestion'], // s_monnaie_gestion : W = 1, longueur 3
  '135': ['numEvt'], // s_num_evt_n : W = 2, longueur 3
};

function typeDepuisSuffixe(nomPascal: string): TypeChamp {
  if (/_n$/.test(nomPascal)) return 'numerique';
  if (/_d$/.test(nomPascal)) return 'date';
  return 'alphanumerique';
}

interface LectureLazarus {
  nom: string;
  position: number;
  longueur: number;
  trim: boolean;
  type: TypeChamp;
}

interface EcritureLazarus {
  caractere: string;
  nom: string;
  largeur: number;
}

/** Contenu sans les commentaires `//` de fin de ligne. */
function retirerCommentaires(source: string): string {
  return source
    .split('\n')
    .map((ligne) => ligne.replace(/\/\/.*$/, ''))
    .join('\n');
}

/** Découpe en blocs `procedure` / `function` de premier niveau, chacun commençant par son en-tête. */
function decouperBlocs(source: string): string[] {
  return source.split(/^(?=(?:procedure|function)\s)/m);
}

function extraireLectures(bloc: string): LectureLazarus[] {
  const motif = /^\s*(s_\w+)\s*:=\s*(Trim\()?\s*Copy\(\s*ps_ligne\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/gm;
  return [...bloc.matchAll(motif)]
    .filter((m) => !m[1]!.startsWith('s_ligne'))
    .map((m) => ({
      nom: nomFlussi(m[1]!),
      position: Number(m[3]),
      longueur: Number(m[4]),
      trim: m[2] !== undefined,
      type: typeDepuisSuffixe(m[1]!),
    }));
}

function extraireEcritures(bloc: string): EcritureLazarus[] {
  const motif = /AddCharR\(\s*'(.)'\s*,\s*(s_\w+)\s*,\s*(\d+)\s*\)/g;
  return [...bloc.matchAll(motif)].map((m) => ({
    caractere: m[1]!,
    nom: nomFlussi(m[2]!),
    largeur: Number(m[3]),
  }));
}

function analyserSource(): {
  lectures: Map<string, LectureLazarus[]>;
  ecritures: Map<string, EcritureLazarus[]>;
} {
  const source = retirerCommentaires(lireSourceLazarus('uac056.pas', 'latin1'));
  const lectures = new Map<string, LectureLazarus[]>();
  const ecritures = new Map<string, EcritureLazarus[]>();

  for (const bloc of decouperBlocs(source)) {
    const lecture = /^procedure AjouterEntite(\d{3})\(/.exec(bloc);
    if (lecture) lectures.set(lecture[1]!, extraireLectures(bloc));

    const ecriture = /^function GetEntite(\d{3})Ligne\(/.exec(bloc);
    if (ecriture) {
      // La déclaration (interface) et l'implémentation portent le même en-tête : on garde
      // le bloc qui contient les écritures.
      const code = ecriture[1]!;
      const trouvees = extraireEcritures(bloc);
      if (trouvees.length > (ecritures.get(code)?.length ?? 0)) ecritures.set(code, trouvees);
    }
  }
  return { lectures, ecritures };
}

const { lectures, ecritures } = analyserSource();

function champsDecrits(code: CodeEntite) {
  // Tout sauf la zone non décrite finale
  return ENTITES[code].champs.filter((c) => c.nom !== 'zoneNonDecrite');
}

describe('Parseur de uac056.pas', () => {
  it('nomme mécaniquement les champs Lazarus', () => {
    expect(nomFlussi('s_num_dossier_n')).toBe('numDossier');
    expect(nomFlussi('s_prenom_1')).toBe('prenom1');
    expect(nomFlussi('s_e_service')).toBe('eService');
    expect(nomFlussi('s_date_effet_d')).toBe('dateEffet');
  });

  it('trouve les 17 blocs de lecture des entités non brutes', () => {
    for (const code of CODES_DECRITS) {
      expect(lectures.has(code), `bloc de lecture de l'entité ${code}`).toBe(true);
      expect(lectures.get(code)!.length, `champs lus de l'entité ${code}`).toBeGreaterThanOrEqual(
        5,
      );
    }
    expect(CODES_DECRITS).toHaveLength(17);
  });

  it("trouve les 17 blocs d'écriture des entités non brutes", () => {
    for (const code of CODES_DECRITS) {
      expect(ecritures.has(code), `bloc d'écriture de l'entité ${code}`).toBe(true);
      expect(
        ecritures.get(code)!.length,
        `champs écrits de l'entité ${code}`,
      ).toBeGreaterThanOrEqual(5);
    }
  });
});

describe('Parité de lecture avec Lazarus', () => {
  it.each(CODES_DECRITS)(
    'entité %s : mêmes champs, positions, longueurs, trim et types que Copy()',
    (code) => {
      const attendu = lectures.get(code) ?? [];
      expect(attendu.length).toBeGreaterThan(0);
      const obtenu = champsDecrits(code).map((c) => ({
        nom: c.nom,
        position: c.position,
        longueur: c.longueur,
        trim: c.trim,
        type: c.type,
      }));
      expect(obtenu).toEqual(attendu);
    },
  );

  it.each(CODES_DECRITS)('entité %s : zoneNonDecrite commence après le dernier champ', (code) => {
    const lues = lectures.get(code) ?? [];
    const dernier = lues[lues.length - 1];
    expect(dernier).toBeDefined();
    const zone = ENTITES[code].champs[ENTITES[code].champs.length - 1];
    expect(zone?.nom).toBe('zoneNonDecrite');
    expect(zone?.position).toBe(dernier!.position + dernier!.longueur);
  });

  it('entité 001 : numDossier correspond à Copy(ps_ligne, 10, 8)', () => {
    const lues = lectures.get('001') ?? [];
    expect(lues).toHaveLength(1);
    expect(lues[0]).toMatchObject({ nom: 'numDossier', position: 10, longueur: 8 });
    const champ = ENTITES['001'].champs.find((c) => c.nom === 'numDossier');
    expect(champ).toMatchObject({ position: 10, longueur: 8 });
  });
});

describe("Parité d'écriture avec Lazarus", () => {
  it.each(CODES_DECRITS)('entité %s : mêmes noms, dans le même ordre, que AddCharR', (code) => {
    const attendu = (ecritures.get(code) ?? []).map((e) => e.nom);
    expect(attendu.length).toBeGreaterThan(0);
    expect(champsDecrits(code).map((c) => c.nom)).toEqual(attendu);
  });

  it.each(CODES_DECRITS)('entité %s : bourrage égal au caractère de AddCharR', (code) => {
    const ecrites = ecritures.get(code) ?? [];
    expect(ecrites.length).toBeGreaterThan(0);
    expect(champsDecrits(code).map((c) => c.bourrage)).toEqual(ecrites.map((e) => e.caractere));
  });

  it.each(CODES_DECRITS)(
    'entité %s : largeur de AddCharR égale à la longueur, hors écarts connus',
    (code) => {
      const champs = champsDecrits(code);
      const ecrites = ecritures.get(code) ?? [];
      expect(ecrites.length).toBeGreaterThan(0);
      const ecarts = ecrites.filter((e, i) => e.largeur !== champs[i]?.longueur).map((e) => e.nom);
      expect(ecarts).toEqual(ECARTS_LARGEUR[code] ?? []);
    },
  );
});
