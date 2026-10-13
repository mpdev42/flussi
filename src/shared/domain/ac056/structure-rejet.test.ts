// Structure et hiérarchie d'un fichier de rejet MSP (`controlerStructure` et `construireHierarchie`
// avec la provenance `rejet`, via `lireAc056`). Fichiers synthétiques uniquement.
// Notation des lignes : `'100'` (dossier 1), `'405/2'` (dossier 2), `'inconnu'` (code inconnu).
// La 000 et la 999 sont toujours du dossier 0 : leurs 17 premiers octets sont ceux de MSP.
// Numérotation : la première ligne du fichier est la ligne 1.
import { describe, expect, it } from 'vitest';
import {
  fichierSynthetique,
  ligneRejet,
  ligneRejetSynthetique,
  lignesCompletes,
  lignesRejet,
} from '@shared/test/ac056-synthetique';
import { compterRattachements } from '@shared/test/rattachements-ac056';
import type { CodeEntite } from './entites';
import { CODES_ENTITE } from './entites';
import { construireHierarchie } from './hierarchie';
import { lireAc056 } from './lecteur';
import type { FichierAc056, LectureAc056, LigneAc056 } from './modele';
import type { Octets } from './octets';
import { controlerStructure } from './structure';

type Code = CodeEntite | null;

function ligneDe(spec: string): string {
  if (spec === 'inconnu') return ligneRejet(' '.repeat(700));
  const [code, dossier] = spec.split('/') as [CodeEntite, string | undefined];
  const parDefaut = code === '000' || code === '999' ? 0 : 1;
  return ligneRejetSynthetique(code, dossier === undefined ? parDefaut : Number(dossier));
}

/** Lecture en provenance rejet d'un fichier de lignes décrites par leur notation. */
const lire = (...specs: string[]): LectureAc056 =>
  lireAc056(fichierSynthetique(specs.map(ligneDe)), 'rejet');

/** Couples [code, ligne] des anomalies, toutes bloquantes en structure. */
const couples = (lecture: LectureAc056) => lecture.anomalies.map((a) => [a.code, a.ligne]);
const messages = (lecture: LectureAc056) => lecture.anomalies.map((a) => a.message);

const HORS_DOSSIER = "hors d'un dossier (entre une 001 et sa 995)";
const HORS_BENEFICIAIRE = "hors d'un bénéficiaire (après une 400 et avant la 990)";

const messageMalPlacee = (numero: number, code: string, detail: string) =>
  `Ligne ${numero} : entité ${code} mal placée, ${detail}.`;
const messageEnDouble = (numero: number, code: string, premiere: number) =>
  `Ligne ${numero} : entité ${code} en double (déjà ligne ${premiere}).`;
const messageSansDossierFin = (numero: number) =>
  `Ligne ${numero} : dossier sans entité 995 de fin.`;
const messageSansEvenementFin = (numero: number) =>
  `Ligne ${numero} : évènement sans entité 990 de fin.`;

/** Squelette d'un dossier dans l'ordre de MSP, suivi de la 000 et de la 999. */
const MSP = ['100', '990', '995', '001', '000', '999'] as const;

describe('structure et hiérarchie d un rejet MSP', () => {
  describe('ordre réel de MSP', () => {
    it('ne produit aucune anomalie pour un rejet complet (2 dossiers de 2 évènements)', () => {
      expect(lireAc056(fichierSynthetique(lignesRejet()), 'rejet').anomalies).toEqual([]);
    });

    it('regroupe les lignes en 2 dossiers de 2 évènements', () => {
      const { fichier } = lireAc056(fichierSynthetique(lignesRejet()), 'rejet');
      expect(fichier.dossiers).toHaveLength(2);
      expect(fichier.dossiers.map((dossier) => dossier.evenements.length)).toEqual([2, 2]);
    });

    it('renseigne e001 (après la 995), e995, e000 et e999', () => {
      const { fichier } = lireAc056(fichierSynthetique(lignesRejet()), 'rejet');
      expect(fichier.dossiers.map((dossier) => [dossier.e995, dossier.e001])).toEqual([
        [66, 67],
        [134, 135],
      ]);
      expect(fichier.e000).toBe(136);
      expect(fichier.e999).toBe(137);
    });

    it('rattache chaque ligne exactement une fois', () => {
      const { fichier } = lireAc056(fichierSynthetique(lignesRejet()), 'rejet');
      expect(compterRattachements(fichier).every((compte) => compte === 1)).toBe(true);
    });

    it('accepte le squelette 100 990 995 001 000 999', () => {
      const lecture = lire(...MSP);
      expect(lecture.anomalies).toEqual([]);
      expect(lecture.fichier.dossiers[0]?.e001).toBe(3);
    });

    it('accepte un dossier sans évènement : 995 puis 001', () => {
      expect(lire('995', '001').anomalies).toEqual([]);
    });

    it('accepte deux évènements dans un même dossier', () => {
      const lecture = lire('100', '990', '100', '990', '995', '001');
      expect(lecture.anomalies).toEqual([]);
      expect(lecture.fichier.dossiers).toHaveLength(1);
      expect(lecture.fichier.dossiers[0]?.evenements).toHaveLength(2);
    });

    it('accepte plusieurs dossiers, séparés par un changement de clé', () => {
      const lecture = lire(
        '100',
        '990',
        '995',
        '001',
        '100/2',
        '990/2',
        '995/2',
        '001/2',
        '000',
        '999',
      );
      expect(lecture.anomalies).toEqual([]);
      expect(lecture.fichier.dossiers).toHaveLength(2);
    });

    it('rattache les filles de l évènement et du bénéficiaire', () => {
      const lecture = lire('100', '110', '400', '405', '410', '990', '995', '001');
      expect(lecture.anomalies).toEqual([]);
      const evenement = lecture.fichier.dossiers[0]?.evenements[0];
      expect(evenement?.e110).toBe(1);
      expect(evenement?.beneficiaires[0]?.e405).toBe(3);
      expect(compterRattachements(lecture.fichier).every((compte) => compte === 1)).toBe(true);
    });

    it('accepte une 001 entre deux évènements : elle ne ferme ni n ouvre rien', () => {
      const lecture = lire('100', '990', '001', '100', '990', '995');
      expect(lecture.anomalies).toEqual([]);
      expect(lecture.fichier.dossiers).toHaveLength(1);
      expect(lecture.fichier.dossiers[0]?.e001).toBe(2);
      expect(lecture.fichier.dossiers[0]?.evenements).toHaveLength(2);
    });

    it('ouvre un nouveau dossier quand une clé revient après un autre dossier', () => {
      const lecture = lire('100', '990', '995', '100/2', '990/2', '995/2', '100', '990', '995');
      expect(lecture.anomalies).toEqual([]);
      expect(lecture.fichier.dossiers).toHaveLength(3);
    });

    it('lit aussi l ordre canonique de VEOS (001 avant les évènements, 000 en tête)', () => {
      const canonique = lignesCompletes().map((ligne) => ligneRejet(ligne));
      const { fichier, anomalies } = lireAc056(fichierSynthetique(canonique), 'rejet');
      expect(anomalies).toEqual([]);
      expect(fichier.e000).toBe(0);
      expect(fichier.e999).toBe(137);
      expect(fichier.dossiers.map((dossier) => dossier.e001)).toEqual([1, 69]);
      expect(compterRattachements(fichier).every((compte) => compte === 1)).toBe(true);
    });
  });

  describe('absence de 001, 000 et 999 : normale en rejet', () => {
    it('accepte un dossier sans 001 : e001 vaut null', () => {
      const lecture = lire('100', '990', '995', '000', '999');
      expect(lecture.anomalies).toEqual([]);
      expect(lecture.fichier.dossiers[0]?.e001).toBeNull();
    });

    it('accepte l absence de 000 et de 999', () => {
      expect(lire('100', '990', '995', '001').anomalies).toEqual([]);
    });

    it('accepte l absence de 000 seule, puis de 999 seule', () => {
      expect(lire('100', '990', '995', '001', '999').anomalies).toEqual([]);
      expect(lire('100', '990', '995', '001', '000').anomalies).toEqual([]);
    });

    it('accepte l absence de 000, de 001 et de 999', () => {
      const lecture = lire('100', '990', '995');
      expect(lecture.anomalies).toEqual([]);
      expect(lecture.fichier.e000).toBeNull();
      expect(lecture.fichier.e999).toBeNull();
    });

    it('accepte un rejet réduit à la 000 et à la 999', () => {
      const lecture = lire('000', '999');
      expect(lecture.anomalies).toEqual([]);
      expect(lecture.fichier.dossiers).toEqual([]);
    });

    it('signale en VEOS l absence de 000 et de 999 que le rejet tolère', () => {
      const lignes = ['100', '990', '995', '001'].map(ligneDe);
      const veos = controlerStructure(
        lireAc056(fichierSynthetique(lignes.map((ligne) => ligne.slice(0, 700)))).fichier.lignes,
      );
      expect(veos.map((a) => [a.code, a.ligne])).toContainEqual(['entite-absente', null]);
    });
  });

  describe('placement non contrôlé de la 000 et de la 999', () => {
    it('accepte la 000 et la 999 au milieu des lignes d un dossier', () => {
      const lecture = lire('999', '100', '000', '990', '995', '001');
      expect(lecture.anomalies).toEqual([]);
      expect(lecture.fichier.e000).toBe(2);
      expect(lecture.fichier.e999).toBe(0);
    });

    it('ne ferme ni n ouvre un dossier : la 000 entre deux lignes d un évènement', () => {
      const lecture = lire('100', '000', '990', '999', '995', '001');
      expect(lecture.anomalies).toEqual([]);
      expect(lecture.fichier.dossiers).toHaveLength(1);
      expect(lecture.fichier.dossiers[0]?.evenements[0]?.e990).toBe(2);
    });
  });

  describe('entite-en-double', () => {
    it('signale une 000 en double, avec la ligne de la première', () => {
      const lecture = lire('100', '990', '995', '001', '000', '000', '999');
      expect(couples(lecture)).toEqual([['entite-en-double', 6]]);
      expect(messages(lecture)).toEqual([messageEnDouble(6, '000', 5)]);
    });

    it('signale une 999 en double, avec la ligne de la première', () => {
      const lecture = lire('100', '990', '995', '001', '000', '999', '999');
      expect(couples(lecture)).toEqual([['entite-en-double', 7]]);
      expect(messages(lecture)).toEqual([messageEnDouble(7, '999', 6)]);
    });

    it('signale deux anomalies pour une 000 en triple', () => {
      const lecture = lire('000', '000', '000', '100', '990', '995');
      expect(couples(lecture)).toEqual([
        ['entite-en-double', 2],
        ['entite-en-double', 3],
      ]);
    });

    it('signale une 001 en double dans un dossier, avec la ligne de la première', () => {
      const lecture = lire('100', '990', '995', '001', '001', '000', '999');
      expect(couples(lecture)).toEqual([['entite-en-double', 5]]);
      expect(messages(lecture)).toEqual([messageEnDouble(5, '001', 4)]);
    });

    it('signale une 001 en double séparée par un évènement', () => {
      const lecture = lire('001', '100', '990', '001', '995');
      expect(couples(lecture)).toEqual([['entite-en-double', 4]]);
    });

    it('ne signale pas une 001 par dossier', () => {
      const lecture = lire('100', '990', '995', '001', '100/2', '990/2', '995/2', '001/2');
      expect(lecture.anomalies).toEqual([]);
    });

    it('signale une 995 en double', () => {
      const lecture = lire('100', '990', '995', '995', '001');
      expect(couples(lecture)).toEqual([['entite-en-double', 4]]);
      expect(messages(lecture)).toEqual([messageEnDouble(4, '995', 3)]);
    });
  });

  describe('entite-absente', () => {
    it('signale une 990 absente sur la 100 de l évènement', () => {
      const lecture = lire('100', '110', '995', '001', '000', '999');
      expect(couples(lecture)).toEqual([['entite-absente', 1]]);
      expect(messages(lecture)).toEqual([messageSansEvenementFin(1)]);
    });

    it('signale une 990 absente avant la 100 suivante', () => {
      const lecture = lire('100', '100', '990', '995', '001');
      expect(couples(lecture)).toEqual([['entite-absente', 1]]);
    });

    it('signale une 995 absente sur la première ligne du dossier', () => {
      const lecture = lire('100', '990', '001', '000', '999');
      expect(couples(lecture)).toEqual([['entite-absente', 1]]);
      expect(messages(lecture)).toEqual([messageSansDossierFin(1)]);
    });

    it('signale une 995 absente quand le dossier suivant la ferme par changement de clé', () => {
      const lecture = lire('100', '990', '100/2', '990/2', '995/2', '001/2');
      expect(couples(lecture)).toEqual([['entite-absente', 1]]);
      expect(messages(lecture)).toEqual([messageSansDossierFin(1)]);
    });

    it('signale la 995 absente sur la première ligne du dossier, quelle qu elle soit', () => {
      const lecture = lire('110', '001', '000', '999');
      expect(couples(lecture)).toContainEqual(['entite-absente', 1]);
    });

    it('signale la 990 et la 995 absentes toutes deux sur la première ligne', () => {
      const lecture = lire('100', '001', '000', '999');
      expect(couples(lecture)).toEqual([
        ['entite-absente', 1],
        ['entite-absente', 1],
      ]);
      expect(messages(lecture)).toEqual([messageSansEvenementFin(1), messageSansDossierFin(1)]);
    });

    it('signale une 995 absente sur un dossier réduit à sa 001', () => {
      const lecture = lire('001', '000', '999');
      expect(couples(lecture)).toEqual([['entite-absente', 1]]);
    });
  });

  describe('entite-mal-placee', () => {
    it('signale une 100 après la 995 de son dossier (même clé)', () => {
      const lecture = lire('100', '990', '995', '100', '990', '001', '000', '999');
      expect(couples(lecture)).toEqual([['entite-mal-placee', 4]]);
      expect(messages(lecture)).toEqual([messageMalPlacee(4, '100', HORS_DOSSIER)]);
    });

    it('ne signale pas une 100 après la 995 d un autre dossier (clé différente)', () => {
      expect(lire('100', '990', '995', '001', '100/2', '990/2', '995/2').anomalies).toEqual([]);
    });

    it('ouvre un nouveau dossier pour une fille dont la clé diffère, sans la rattacher', () => {
      const lecture = lire('100', '990', '995', '001', '405/2', '000', '999');
      expect(couples(lecture)).toEqual([
        ['entite-mal-placee', 5],
        ['entite-absente', 5],
      ]);
      expect(messages(lecture)).toEqual([
        messageMalPlacee(5, '405', HORS_BENEFICIAIRE),
        messageSansDossierFin(5),
      ]);
      expect(lecture.fichier.dossiers).toHaveLength(2);
      expect(lecture.fichier.dossiers[1]).toEqual({ e001: null, evenements: [], e995: null });
      expect(compterRattachements(lecture.fichier)[4]).toBe(0);
    });

    it('signale une fille sans bénéficiaire (405 sans 400)', () => {
      const lecture = lire('100', '405', '990', '995', '001');
      expect(couples(lecture)).toEqual([['entite-mal-placee', 2]]);
      expect(messages(lecture)).toEqual([messageMalPlacee(2, '405', HORS_BENEFICIAIRE)]);
    });
  });

  describe('autres anomalies', () => {
    it('signale une ligne de code inconnu sans rien changer à la suite', () => {
      const lecture = lire('100', 'inconnu', '990', '995', '001');
      expect(couples(lecture)).toEqual([['entite-inconnue', 2]]);
    });

    it('signale un rejet vide', () => {
      expect(couples(lireAc056(new Uint8Array(), 'rejet'))).toEqual([['fichier-vide', null]]);
    });

    it('marque bloquantes toutes les anomalies de structure du rejet', () => {
      const lecture = lire('100', '110', '110', '405', '995', '995', '000', '000');
      expect(lecture.anomalies.length).toBeGreaterThan(3);
      expect(lecture.anomalies.every((a) => a.bloquante)).toBe(true);
    });

    it('gèle les anomalies et leur liste', () => {
      const lecture = lire('100', '110', '110', '405', '995', '995', '000', '000');
      expect(Object.isFrozen(lecture.anomalies)).toBe(true);
      expect(lecture.anomalies.every((a) => Object.isFrozen(a))).toBe(true);
    });
  });

  describe('hiérarchie directe', () => {
    it('rend le même résultat que la lecture complète', () => {
      const { fichier } = lireAc056(fichierSynthetique(lignesRejet()), 'rejet');
      const direct = construireHierarchie(fichier.lignes, 'rejet');
      expect(direct).toEqual({
        e000: fichier.e000,
        dossiers: fichier.dossiers,
        e999: fichier.e999,
      });
    });

    it('garde par défaut le comportement VEOS : la 001 ouvre le dossier', () => {
      const { fichier } = lireAc056(fichierSynthetique(lignesCompletes()));
      expect(construireHierarchie(fichier.lignes).dossiers.map((d) => d.e001)).toEqual([1, 69]);
    });

    it('le dernier gagne pour la 001 en double', () => {
      const lecture = lire('100', '990', '995', '001', '001');
      expect(lecture.fichier.dossiers[0]?.e001).toBe(4);
    });
  });
});

// ---------------------------------------------------------------------------------------------
// Garantie : un rejet sans anomalie bloquante rattache chaque ligne exactement une fois. Vérifiée
// sur des lignes `LigneAc056` construites directement (718 octets, clé de dossier variable), puis
// `controlerStructure` et `construireHierarchie` avec la provenance `rejet`.
// ---------------------------------------------------------------------------------------------

/** Code de la ligne et clé de son dossier (0 pour la 000 et la 999). */
type Symbole = readonly [Code, number];

const ORIGINES: readonly Octets[] = Array.from(
  { length: 4 },
  (_, cle) => `TEST     0000000${cle}${' '.repeat(701)}` as Octets,
);
const LIGNES = new Map<string, LigneAc056>();

/** Ligne brute portant le code et la clé voulus (mémorisée : elle est immuable). */
function ligneAvecCle([code, cle]: Symbole, numero: number): LigneAc056 {
  const cleMemo = `${code ?? 'null'}|${cle}|${numero}`;
  let ligne = LIGNES.get(cleMemo);
  if (ligne === undefined) {
    ligne = Object.freeze({
      nature: 'brute' as const,
      code,
      numero,
      origine: ORIGINES[cle] as Octets,
      finDeLigne: '\r\n' as const,
    });
    LIGNES.set(cleMemo, ligne);
  }
  return ligne;
}

function verifierGarantie(suite: readonly Symbole[]): {
  sansAnomalie: boolean;
  violation: string | null;
} {
  const lignes = suite.map((symbole, i) => ligneAvecCle(symbole, i + 1));
  if (controlerStructure(lignes, 'rejet').length > 0)
    return { sansAnomalie: false, violation: null };

  const fichier: FichierAc056 = {
    provenance: 'rejet',
    bom: false,
    lignes,
    ...construireHierarchie(lignes, 'rejet'),
  };
  const defauts: string[] = [];
  compterRattachements(fichier).forEach((compte, i) => {
    if (compte !== 1) defauts.push(`ligne ${i + 1} rattachée ${compte} fois`);
  });
  return {
    sansAnomalie: true,
    violation:
      defauts.length === 0
        ? null
        : `${suite.map(([code, cle]) => `${code ?? 'inconnu'}/${cle}`).join(' ')} : ${defauts.join(', ')}`,
  };
}

/** Accumule les violations et compte les suites sans anomalie (pour exclure un test vide). */
class Compteur {
  suites = 0;
  sansAnomalie = 0;
  readonly violations: string[] = [];

  verifier(suite: readonly Symbole[]): void {
    const bilan = verifierGarantie(suite);
    this.suites++;
    if (bilan.sansAnomalie) this.sansAnomalie++;
    if (bilan.violation !== null && this.violations.length < 10)
      this.violations.push(bilan.violation);
  }
}

/** Toutes les suites non vides de longueur ≤ `longueurMax` sur `alphabet`. */
function pourToutesLesSuites(
  alphabet: readonly Symbole[],
  longueurMax: number,
  visiter: (suite: readonly Symbole[]) => void,
): void {
  const suite: Symbole[] = [];
  const parcourir = (): void => {
    if (suite.length > 0) visiter(suite);
    if (suite.length === longueurMax) return;
    for (const symbole of alphabet) {
      suite.push(symbole);
      parcourir();
      suite.pop();
    }
  };
  parcourir();
}

describe('garantie en rejet : sans anomalie bloquante, chaque ligne est rattachée exactement une fois', () => {
  const COMMUNS: readonly Code[] = ['001', '100', '110', '400', '405', '990', '995'];
  const ALPHABET: readonly Symbole[] = [
    ['000', 0],
    ['999', 0],
    ...COMMUNS.flatMap((code) => [1, 2].map((cle): Symbole => [code, cle])),
  ];
  const LONGUEUR_EXHAUSTIVE = 4;

  /** Lignes du rejet fictif complet (2 dossiers) sous forme de symboles. */
  const BASE: readonly Symbole[] = lignesRejet().map((ligne) => [
    ligne.slice(22, 25) as CodeEntite,
    Number(ligne.slice(9, 17)),
  ]);

  it(`vaut pour toutes les suites jusqu à ${LONGUEUR_EXHAUSTIVE} lignes sur ${ALPHABET.length} symboles (code, clé)`, () => {
    const compteur = new Compteur();
    pourToutesLesSuites(ALPHABET, LONGUEUR_EXHAUSTIVE, (suite) => compteur.verifier(suite));
    expect(compteur.suites).toBe(
      Array.from({ length: LONGUEUR_EXHAUSTIVE }, (_, i) => ALPHABET.length ** (i + 1)).reduce(
        (somme, n) => somme + n,
        0,
      ),
    );
    expect(compteur.sansAnomalie).toBeGreaterThan(200);
    expect(compteur.violations).toEqual([]);
  });

  it('vaut pour toutes les suites jusqu à 5 lignes sur 12 symboles (alphabet réduit)', () => {
    const reduit: readonly Symbole[] = [
      ['000', 0],
      ['999', 0],
      ...(['001', '100', '990', '995'] as const).flatMap((code) =>
        [1, 2].map((cle): Symbole => [code, cle]),
      ),
      ['400', 1],
      ['405', 1],
    ];
    const compteur = new Compteur();
    pourToutesLesSuites(reduit, 5, (suite) => compteur.verifier(suite));
    expect(compteur.suites).toBe(12 + 12 ** 2 + 12 ** 3 + 12 ** 4 + 12 ** 5);
    expect(compteur.sansAnomalie).toBeGreaterThan(500);
    expect(compteur.violations).toEqual([]);
  });

  it('vaut pour des suites aléatoires à graine fixe : dossiers, clés répétées, mutations', () => {
    let graine = 20261013;
    const tirer = (borne: number): number => {
      graine = (Math.imul(graine, 1103515245) + 12345) & 0x7fffffff;
      return (graine >>> 8) % borne;
    };
    const alphabet: readonly Code[] = [...CODES_ENTITE, null];
    const FILLES: readonly Code[] = ['110', '115', '125', '400', '405', '410', '485', '700', '800'];

    const suiteAleatoire = (): Symbole[] => {
      const suite: Symbole[] = [];
      for (let dossier = 1 + tirer(3); dossier > 0; dossier--) {
        const cle = 1 + tirer(3);
        for (let evenement = tirer(3); evenement > 0; evenement--) {
          suite.push(['100', cle]);
          for (let fille = tirer(4); fille > 0; fille--) {
            suite.push([FILLES[tirer(FILLES.length)] ?? null, cle]);
          }
          suite.push(['990', cle]);
        }
        suite.push(['995', cle]);
        if (tirer(2) === 0) suite.push(['001', cle]);
      }
      if (tirer(3) > 0) suite.push(['000', 0], ['999', 0]);
      // Mutations (la moitié des suites reste intacte) : suppression, duplication, remplacement.
      for (let mutations = tirer(3) === 0 ? 1 + tirer(2) : 0; mutations > 0; mutations--) {
        const i = tirer(suite.length);
        const choix = tirer(3);
        if (choix === 0) suite.splice(i, 1);
        else if (choix === 1) suite.splice(i, 0, suite[i] ?? ['100', 1]);
        else suite[i] = [alphabet[tirer(alphabet.length)] ?? null, 1 + tirer(3)];
      }
      return suite;
    };

    const compteur = new Compteur();
    for (let essai = 0; essai < 6000; essai++) {
      const suite = suiteAleatoire();
      if (suite.length > 0) compteur.verifier(suite);
    }
    expect(compteur.suites).toBeGreaterThan(5500);
    expect(compteur.sansAnomalie).toBeGreaterThan(1000);
    expect(compteur.violations).toEqual([]);
  });

  it('vaut pour des suites purement aléatoires sur les 22 codes et le code inconnu', () => {
    let graine = 424242;
    const tirer = (borne: number): number => {
      graine = (Math.imul(graine, 1103515245) + 12345) & 0x7fffffff;
      return (graine >>> 8) % borne;
    };
    const alphabet: readonly Code[] = [...CODES_ENTITE, null];
    const compteur = new Compteur();
    for (let essai = 0; essai < 5000; essai++) {
      const suite = Array.from({ length: 1 + tirer(12) }, (): Symbole => {
        const code = alphabet[tirer(alphabet.length)] ?? null;
        return [code, code === '000' || code === '999' ? 0 : 1 + tirer(2)];
      });
      compteur.verifier(suite);
    }
    expect(compteur.suites).toBe(5000);
    expect(compteur.sansAnomalie).toBeGreaterThan(0);
    expect(compteur.violations).toEqual([]);
  });

  it('vaut pour les mutations du rejet fictif complet : suppression, duplication, déplacement, insertion', () => {
    expect(BASE).toHaveLength(138);
    const compteur = new Compteur();
    compteur.verifier(BASE);
    expect(compteur.sansAnomalie).toBe(1);

    const insertions: readonly Symbole[] = [
      ['000', 0],
      ['999', 0],
      ['001', 1],
      ['001', 2],
      ['100', 1],
      ['100', 2],
      ['110', 1],
      ['400', 2],
      ['405', 3],
      ['990', 1],
      ['995', 2],
      [null, 1],
    ];
    for (let i = 0; i < BASE.length; i++) {
      compteur.verifier(BASE.filter((_, j) => j !== i));
      compteur.verifier(BASE.flatMap((symbole, j) => (j === i ? [symbole, symbole] : [symbole])));
      // Un déplacement sur trois : la couverture reste large pour un temps d'exécution borné.
      if (i % 3 !== 0) continue;
      for (let j = 0; j < BASE.length; j++) {
        if (j === i) continue;
        const sans = BASE.filter((_, k) => k !== i);
        compteur.verifier([...sans.slice(0, j), BASE[i] as Symbole, ...sans.slice(j)]);
      }
    }
    for (let position = 0; position <= BASE.length; position++) {
      for (const symbole of insertions) {
        compteur.verifier([...BASE.slice(0, position), symbole, ...BASE.slice(position)]);
      }
    }

    // 138 suppressions, 138 duplications, 46 x 137 déplacements, 139 x 12 insertions, 1 base.
    expect(compteur.suites).toBe(1 + 138 + 138 + 46 * 137 + 139 * 12);
    expect(compteur.sansAnomalie).toBeGreaterThan(1);
    expect(compteur.violations).toEqual([]);
  });
});
