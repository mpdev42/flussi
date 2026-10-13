// Contrôle de structure d'un fichier AC056 (`controlerStructure`, appelé par `lireAc056`).
// Fichiers synthétiques uniquement. Un code `null` donne une ligne de 700 espaces (code inconnu).
// Numérotation : `dansEvt(...)` place le premier code en ligne 4 (000, 001, 100 avant) et
// `dansBenef(...)` en ligne 5 (une 400 en ligne 4).
import { describe, expect, it } from 'vitest';
import {
  fichierSynthetique,
  ligneSynthetique,
  lignesCompletes,
  lignesDepuisCodes,
  type OptionsFichierSynthetique,
} from '@shared/test/ac056-synthetique';
import { empreinteSha256 } from '@shared/test/comparaison-ac056';
import { compterRattachements } from '@shared/test/rattachements-ac056';
import { CODES_ENTITE, type CodeEntite } from './entites';
import { ecrireAc056 } from './ecrivain';
import { construireHierarchie } from './hierarchie';
import { lireAc056 } from './lecteur';
import type { FichierAc056, LectureAc056, LigneAc056 } from './modele';
import { repeterOctet } from './octets';
import { controlerStructure } from './structure';

type Code = CodeEntite | null;

const SQUELETTE: readonly Code[] = ['000', '001', '100', '990', '995', '999'];

/** Squelette dont l'évènement contient `codes` (premier code en ligne 4). */
const dansEvt = (...codes: Code[]): Code[] => ['000', '001', '100', ...codes, '990', '995', '999'];

/** Squelette dont le bénéficiaire (400 en ligne 4) contient `codes` (premier code en ligne 5). */
const dansBenef = (...codes: Code[]): Code[] => dansEvt('400', ...codes);

const HORS_DOSSIER = "hors d'un dossier (entre une 001 et sa 995)";
const HORS_EVENEMENT = "hors d'un évènement (entre une 100 et sa 990)";
const HORS_BENEFICIAIRE = "hors d'un bénéficiaire (après une 400 et avant la 990)";

const messageMalPlacee = (numero: number, code: string, detail: string) =>
  `Ligne ${numero} : entité ${code} mal placée, ${detail}.`;
const messageEnDouble = (numero: number, code: string, premiere: number) =>
  `Ligne ${numero} : entité ${code} en double (déjà ligne ${premiere}).`;
const messageLongueur = (numero: number, longueur: number) =>
  `Ligne ${numero} : ${longueur} octets au lieu de 700.`;
const messageInconnue = (numero: number) =>
  `Ligne ${numero} : code d'entité inconnu (octets 23 à 25).`;
const messageSansDossierFin = (numero: number) =>
  `Ligne ${numero} : dossier sans entité 995 de fin.`;
const messageSansEvenementFin = (numero: number) =>
  `Ligne ${numero} : évènement sans entité 990 de fin.`;
const MESSAGE_000_ABSENTE = 'Entité 000 absente : le fichier doit commencer par une 000.';
const MESSAGE_999_ABSENTE = 'Entité 999 absente : le fichier doit se terminer par une 999.';
const MESSAGE_FICHIER_VIDE = 'Le fichier est vide : aucune ligne AC056.';

const CODES_FORMAT: readonly string[] = ['bom', 'fin-de-ligne-lf', 'fin-de-ligne-cr', 'ligne-vide'];

function lireLignes(lignes: readonly string[], options?: OptionsFichierSynthetique): LectureAc056 {
  return lireAc056(fichierSynthetique(lignes, options));
}

function lireCodes(codes: readonly Code[], options?: OptionsFichierSynthetique): LectureAc056 {
  return lireLignes(lignesDepuisCodes(codes), options);
}

const bloquantes = (lecture: LectureAc056) => lecture.anomalies.filter((a) => a.bloquante);

const couples = (lecture: LectureAc056) => bloquantes(lecture).map((a) => [a.code, a.ligne]);

/** Couples [code, ligne] des anomalies bloquantes d'un fichier de lignes synthétiques par code. */
const structure = (...codes: Code[]) => couples(lireCodes(codes));

/** Messages des anomalies bloquantes d'un fichier de lignes synthétiques par code. */
const messages = (...codes: Code[]) => bloquantes(lireCodes(codes)).map((a) => a.message);

/** Lignes synthétiques par code, dont la ligne `indice` est remplacée par `ligne`. */
function lignesAvec(codes: readonly Code[], indice: number, ligne: string): string[] {
  const lignes = lignesDepuisCodes(codes);
  lignes[indice] = ligne;
  return lignes;
}

describe('controlerStructure via lireAc056', () => {
  describe('fichier nominal', () => {
    it('ne produit aucune anomalie pour le squelette 000 001 100 990 995 999', () => {
      expect(lireCodes(SQUELETTE).anomalies).toEqual([]);
    });

    it('ne produit aucune anomalie pour lignesCompletes()', () => {
      expect(lireLignes(lignesCompletes()).anomalies).toEqual([]);
    });

    it('ne produit aucune anomalie bloquante avec des lignes vides avant la 000 et après la 999', () => {
      const lignes = ['', '', ...lignesDepuisCodes(SQUELETTE), '', ''];
      const lecture = lireLignes(lignes);
      expect(bloquantes(lecture)).toEqual([]);
      // Deux lignes vides avant, puis une seule après : le dernier '' est la fin du fichier.
      expect(lecture.anomalies.map((a) => [a.code, a.ligne])).toEqual([
        ['ligne-vide', 1],
        ['ligne-vide', 2],
        ['ligne-vide', 9],
      ]);
    });

    it('accepte 000 999 sans dossier', () => {
      expect(lireCodes(['000', '999']).anomalies).toEqual([]);
    });

    it('accepte un dossier vide : 000 001 995 999', () => {
      expect(lireCodes(['000', '001', '995', '999']).anomalies).toEqual([]);
    });

    it('accepte un évènement sans bénéficiaire : 000 001 100 990 995 999', () => {
      expect(lireCodes(['000', '001', '100', '990', '995', '999']).anomalies).toEqual([]);
    });

    it.each([
      ['130 avant 110', dansEvt('130', '110')],
      ['110 après une 400', dansEvt('400', '405', '110')],
      ['125 après une 400', dansEvt('400', '405', '125')],
      ['125 entre deux bénéficiaires', dansEvt('400', '405', '125', '400', '405')],
      ['700 avant 405', dansBenef('700', '405')],
      ['800 avant 405', dansBenef('800', '405')],
    ] as const)('accepte les sœurs permutées : %s', (_nom, codes) => {
      expect(lireCodes(codes).anomalies).toEqual([]);
    });

    it('accepte plusieurs dossiers, évènements et bénéficiaires', () => {
      const codes: Code[] = [
        '000',
        ...['001', '100', '400', '405', '400', '405', '990', '100', '990', '995'].map(
          (c) => c as CodeEntite,
        ),
        ...['001', '100', '990', '995'].map((c) => c as CodeEntite),
        '999',
      ];
      expect(lireCodes(codes).anomalies).toEqual([]);
    });
  });

  describe('fichier-vide', () => {
    it.each([
      ['0 octet', new Uint8Array()],
      ['un BOM seul', fichierSynthetique([], { bom: true })],
      ['une ligne vide', fichierSynthetique([''])],
      ['des lignes vides', fichierSynthetique(['', '', ''])],
      ['des lignes vides avec saut final', fichierSynthetique(['', ''], { sautFinal: true })],
    ])('produit la seule anomalie de structure fichier-vide pour %s', (_nom, octets) => {
      const lecture = lireAc056(octets);
      expect(couples(lecture)).toEqual([['fichier-vide', null]]);
      expect(bloquantes(lecture)[0]?.message).toBe(MESSAGE_FICHIER_VIDE);
    });

    it('ne produit pas fichier-vide quand une ligne non vide existe', () => {
      expect(lireCodes(['000']).anomalies.map((a) => a.code)).not.toContain('fichier-vide');
    });
  });

  describe('longueur-ligne', () => {
    const cas = (['405', '000', '999'] as const).flatMap((code) =>
      [699, 701].map((longueur) => [code, longueur] as const),
    );

    it.each(cas)('signale la ligne %s de %i octets, seule', (code, longueur) => {
      const codes = dansBenef('405');
      const indice = codes.indexOf(code);
      const ligne = ligneSynthetique(code);
      const modifiee =
        longueur < 700 ? ligne.slice(0, longueur) : ligne + ' '.repeat(longueur - 700);
      const lecture = lireLignes(lignesAvec(codes, indice, modifiee));
      expect(couples(lecture)).toEqual([['longueur-ligne', indice + 1]]);
      expect(bloquantes(lecture)[0]?.message).toBe(messageLongueur(indice + 1, longueur));
    });

    it('signale une 100 de 699 octets une seule fois et rattache ses filles', () => {
      const codes = dansEvt('110', '400', '405');
      const lecture = lireLignes(lignesAvec(codes, 2, ligneSynthetique('100').slice(0, 699)));
      expect(couples(lecture)).toEqual([['longueur-ligne', 3]]);
      expect(compterRattachements(lecture.fichier).every((compte) => compte === 1)).toBe(true);
      const evenement = lecture.fichier.dossiers[0]?.evenements[0];
      expect(evenement?.e100).toBe(2);
      expect(evenement?.e110).toBe(3);
      expect(evenement?.beneficiaires[0]?.e405).toBe(5);
    });

    it('signale une ligne de 10 octets sous la longueur seule, sans code inconnu', () => {
      const codes = dansEvt('110', '115', '120');
      const lecture = lireLignes(lignesAvec(codes, 4, 'ABCDEFGHIJ'));
      expect(couples(lecture)).toEqual([['longueur-ligne', 5]]);
      expect(bloquantes(lecture)[0]?.message).toBe(messageLongueur(5, 10));
      const evenement = lecture.fichier.dossiers[0]?.evenements[0];
      expect(evenement?.e110).toBe(3);
      expect(evenement?.e115).toBeNull();
      expect(evenement?.e120).toBe(5);
    });

    it('signale une ligne de 1400 octets formée d une 999 et d une 000 collées', () => {
      const collee = ligneSynthetique('999') + ligneSynthetique('000');
      const lignes = [...lignesDepuisCodes(['000', '001', '100', '990', '995']), collee];
      const lecture = lireLignes(lignes);
      expect(couples(lecture)).toEqual([['longueur-ligne', 6]]);
      expect(bloquantes(lecture)[0]?.message).toBe(messageLongueur(6, 1400));
      expect(lecture.fichier.e999).toBe(5);
    });

    it('signale la longueur d une ligne brute de code inconnu et assez longue', () => {
      const lecture = lireLignes(lignesAvec(dansEvt('110'), 3, ' '.repeat(701)));
      expect(couples(lecture)).toEqual([
        ['longueur-ligne', 4],
        ['entite-inconnue', 4],
      ]);
    });
  });

  describe('entite-inconnue', () => {
    it.each(['123', 'ABC'])('signale le code %s sans le citer dans le message', (valeur) => {
      const ligne = ligneSynthetique('400', { numEntite: valeur });
      const lecture = lireLignes(lignesAvec(dansEvt('110', '400', '115'), 4, ligne));
      expect(couples(lecture)).toEqual([['entite-inconnue', 5]]);
      const message = bloquantes(lecture)[0]?.message;
      expect(message).toBe(messageInconnue(5));
      expect(message).not.toContain(valeur);
    });

    it('signale une ligne de 700 espaces', () => {
      expect(structure(...dansEvt('110', null, '115'))).toEqual([['entite-inconnue', 5]]);
      expect(messages(...dansEvt('110', null, '115'))).toEqual([messageInconnue(5)]);
    });

    it('ne touche pas aux sœurs d une ligne inconnue au milieu d un évènement', () => {
      const lecture = lireCodes(dansEvt('110', null, '115'));
      expect(couples(lecture)).toEqual([['entite-inconnue', 5]]);
      const evenement = lecture.fichier.dossiers[0]?.evenements[0];
      expect(evenement?.e110).toBe(3);
      expect(evenement?.e115).toBe(5);
    });

    it('reste sans effet sur l automate : le doublon qui suit est signalé', () => {
      const codes = dansEvt('110', null, '110');
      expect(structure(...codes)).toEqual([
        ['entite-inconnue', 5],
        ['entite-en-double', 6],
      ]);
      expect(messages(...codes)[1]).toBe(messageEnDouble(6, '110', 4));
    });

    it('reste sans effet dans un bénéficiaire', () => {
      expect(structure(...dansBenef('405', null, '410'))).toEqual([['entite-inconnue', 6]]);
    });

    it.each([
      [24, [['longueur-ligne', 5]]],
      [
        25,
        [
          ['longueur-ligne', 5],
          ['entite-inconnue', 5],
        ],
      ],
    ] as const)('traite une ligne inconnue de %i octets', (longueur, attendu) => {
      const ligne = (' '.repeat(22) + '123').slice(0, longueur);
      const lecture = lireLignes(lignesAvec(dansEvt('110', '115'), 4, ligne));
      expect(couples(lecture)).toEqual(attendu);
    });
  });

  describe('entité 000', () => {
    it('signale une 000 absente au niveau fichier', () => {
      const codes: Code[] = ['001', '100', '990', '995', '999'];
      expect(structure(...codes)).toEqual([['entite-absente', null]]);
      expect(messages(...codes)).toEqual([MESSAGE_000_ABSENTE]);
    });

    it('signale une 000 en 2e ligne comme mal placée', () => {
      const codes: Code[] = ['001', '000', '100', '990', '995', '999'];
      expect(structure(...codes)).toEqual([['entite-mal-placee', 2]]);
      expect(messages(...codes)).toEqual([
        'Ligne 2 : entité 000 mal placée, attendue en première ligne.',
      ]);
    });

    it('signale seulement la seconde de deux 000', () => {
      const codes: Code[] = ['000', '000', '001', '100', '990', '995', '999'];
      expect(structure(...codes)).toEqual([['entite-mal-placee', 2]]);
    });

    it('accepte une 000 précédée d une ligne vide', () => {
      const lecture = lireLignes(['', ...lignesDepuisCodes(SQUELETTE)]);
      expect(bloquantes(lecture)).toEqual([]);
      expect(lecture.fichier.e000).toBe(0);
    });

    it('accepte une 000 précédée d une ligne inconnue : seule la ligne inconnue est signalée', () => {
      expect(structure(null, ...SQUELETTE)).toEqual([['entite-inconnue', 1]]);
    });
  });

  describe('entité 999', () => {
    it('signale une 999 absente au niveau fichier', () => {
      const codes: Code[] = ['000', '001', '100', '990', '995'];
      expect(structure(...codes)).toEqual([['entite-absente', null]]);
      expect(messages(...codes)).toEqual([MESSAGE_999_ABSENTE]);
    });

    it('signale une seule anomalie pour une 999 au milieu d un évènement', () => {
      const codes: Code[] = ['000', '001', '100', '999', '990', '995'];
      expect(structure(...codes)).toEqual([['entite-mal-placee', 4]]);
      expect(messages(...codes)).toEqual([
        'Ligne 4 : entité 999 mal placée, attendue en dernière ligne.',
      ]);
    });

    it('signale une 999 entre deux dossiers', () => {
      const codes: Code[] = ['000', '001', '100', '990', '995', '999', '001', '100', '990', '995'];
      expect(structure(...codes)).toEqual([['entite-mal-placee', 6]]);
    });

    it('signale seulement la première de deux 999 en fin de fichier', () => {
      expect(structure(...SQUELETTE, '999')).toEqual([['entite-mal-placee', 6]]);
    });

    it('signale une 999 suivie d une 001, dont le dossier n est pas fermé', () => {
      const codes: Code[] = [...SQUELETTE, '001'];
      expect(structure(...codes)).toEqual([
        ['entite-mal-placee', 6],
        ['entite-absente', 7],
      ]);
      expect(messages(...codes)[1]).toBe(messageSansDossierFin(7));
    });

    it('accepte une 999 suivie de lignes vides', () => {
      const lecture = lireLignes([...lignesDepuisCodes(SQUELETTE), '', '']);
      expect(bloquantes(lecture)).toEqual([]);
    });

    it('accepte une 999 suivie d une ligne inconnue : seule la ligne inconnue est signalée', () => {
      expect(structure(...SQUELETTE, null)).toEqual([['entite-inconnue', 7]]);
    });

    it('ne ferme rien : la 990 et la 995 qui suivent une 999 au milieu sont acceptées', () => {
      const codes: Code[] = ['000', '001', '100', '999', '990', '995'];
      expect(structure(...codes).map(([code]) => code)).toEqual(['entite-mal-placee']);
    });
  });

  describe('entités 001 et 995', () => {
    it('signale une 995 absente avant une 001, sur le numéro de la 001', () => {
      const codes: Code[] = ['000', '001', '100', '990', '001', '100', '990', '995', '999'];
      expect(structure(...codes)).toEqual([['entite-absente', 2]]);
      expect(messages(...codes)).toEqual([messageSansDossierFin(2)]);
    });

    it('signale une 995 absente en fin de fichier, sur le numéro de la 001', () => {
      const codes: Code[] = ['000', '001', '100', '990', '999'];
      expect(structure(...codes)).toEqual([['entite-absente', 2]]);
      expect(messages(...codes)).toEqual([messageSansDossierFin(2)]);
    });

    it('signale une 995 sans 001', () => {
      const codes: Code[] = ['000', '995', '999'];
      expect(structure(...codes)).toEqual([['entite-mal-placee', 2]]);
      expect(messages(...codes)).toEqual([messageMalPlacee(2, '995', HORS_DOSSIER)]);
    });

    it('signale une 995 en double, avec la ligne de la première', () => {
      const codes: Code[] = ['000', '001', '100', '990', '995', '995', '999'];
      expect(structure(...codes)).toEqual([['entite-en-double', 6]]);
      expect(messages(...codes)).toEqual([messageEnDouble(6, '995', 5)]);
    });

    it('signale une 100 après la 995', () => {
      const codes: Code[] = ['000', '001', '100', '990', '995', '100', '990', '999'];
      expect(structure(...codes)).toEqual([['entite-mal-placee', 6]]);
      expect(messages(...codes)).toEqual([messageMalPlacee(6, '100', HORS_DOSSIER)]);
    });

    it('signale 3 anomalies pour une 001 absente sur le premier dossier', () => {
      const codes: Code[] = ['000', '100', '990', '100', '990', '995', '999'];
      expect(structure(...codes)).toEqual([
        ['entite-mal-placee', 2],
        ['entite-mal-placee', 4],
        ['entite-mal-placee', 6],
      ]);
      expect(messages(...codes)).toEqual([
        messageMalPlacee(2, '100', HORS_DOSSIER),
        messageMalPlacee(4, '100', HORS_DOSSIER),
        messageMalPlacee(6, '995', HORS_DOSSIER),
      ]);
    });

    it('signale une 001 absente sur un dossier suivant', () => {
      const codes: Code[] = ['000', '001', '100', '990', '995', '100', '990', '995', '999'];
      expect(structure(...codes)).toEqual([
        ['entite-mal-placee', 6],
        ['entite-en-double', 8],
      ]);
      expect(messages(...codes)).toEqual([
        messageMalPlacee(6, '100', HORS_DOSSIER),
        messageEnDouble(8, '995', 5),
      ]);
    });
  });

  describe('entités 100 et 990', () => {
    it('signale une 990 absente avant une 100', () => {
      const codes: Code[] = ['000', '001', '100', '100', '990', '995', '999'];
      expect(structure(...codes)).toEqual([['entite-absente', 3]]);
      expect(messages(...codes)).toEqual([messageSansEvenementFin(3)]);
    });

    it('signale une 990 absente avant une 995', () => {
      const codes: Code[] = ['000', '001', '100', '995', '999'];
      expect(structure(...codes)).toEqual([['entite-absente', 3]]);
    });

    it('signale une 990 absente avant une 001, triée après la 995 absente de la 001', () => {
      const codes: Code[] = ['000', '001', '100', '001', '100', '990', '995', '999'];
      expect(structure(...codes)).toEqual([
        ['entite-absente', 2],
        ['entite-absente', 3],
      ]);
      expect(messages(...codes)).toEqual([messageSansDossierFin(2), messageSansEvenementFin(3)]);
    });

    it('signale une 990 absente en fin de fichier', () => {
      const codes: Code[] = ['000', '001', '100', '999'];
      expect(structure(...codes)).toEqual([
        ['entite-absente', 2],
        ['entite-absente', 3],
      ]);
    });

    it('signale une 990 sans 100', () => {
      const codes: Code[] = ['000', '001', '990', '995', '999'];
      expect(structure(...codes)).toEqual([['entite-mal-placee', 3]]);
      expect(messages(...codes)).toEqual([messageMalPlacee(3, '990', HORS_EVENEMENT)]);
    });

    it('signale une 990 en double, avec la ligne de la première', () => {
      const codes: Code[] = ['000', '001', '100', '990', '990', '995', '999'];
      expect(structure(...codes)).toEqual([['entite-en-double', 5]]);
      expect(messages(...codes)).toEqual([messageEnDouble(5, '990', 4)]);
    });

    it('signale une 990 mal placée après une 995 qui a fermé l évènement sans 990', () => {
      const codes: Code[] = ['000', '001', '100', '995', '990', '999'];
      expect(structure(...codes)).toEqual([
        ['entite-absente', 3],
        ['entite-mal-placee', 5],
      ]);
      expect(messages(...codes)).toEqual([
        messageSansEvenementFin(3),
        messageMalPlacee(5, '990', HORS_EVENEMENT),
      ]);
    });

    it('signale une 100 avant toute 001, sans cascade sur la suite', () => {
      const codes: Code[] = ['000', '100', '990', '001', '995', '999'];
      expect(structure(...codes)).toEqual([['entite-mal-placee', 2]]);
      expect(messages(...codes)).toEqual([messageMalPlacee(2, '100', HORS_DOSSIER)]);
    });

    it('ouvre un évènement même quand la 100 est mal placée : ses filles ne sont pas signalées', () => {
      const codes: Code[] = ['000', '100', '110', '400', '405', '990', '001', '995', '999'];
      expect(structure(...codes)).toEqual([['entite-mal-placee', 2]]);
    });
  });

  describe('filles de l évènement', () => {
    const UNIQUES_EVT = ['110', '115', '120', '130', '135', '155', '180'] as const;

    it.each(UNIQUES_EVT)('signale la %s hors évènement, avant toute 100', (code) => {
      const codes: Code[] = ['000', '001', code, '100', '990', '995', '999'];
      expect(structure(...codes)).toEqual([['entite-mal-placee', 3]]);
      expect(messages(...codes)).toEqual([messageMalPlacee(3, code, HORS_EVENEMENT)]);
    });

    it.each(UNIQUES_EVT)('signale la %s après la 990', (code) => {
      const codes: Code[] = ['000', '001', '100', '990', code, '995', '999'];
      expect(structure(...codes)).toEqual([['entite-mal-placee', 5]]);
      expect(messages(...codes)).toEqual([messageMalPlacee(5, code, HORS_EVENEMENT)]);
    });

    it.each(UNIQUES_EVT)('signale la %s en double, avec la ligne de la première', (code) => {
      expect(structure(...dansEvt(code, code))).toEqual([['entite-en-double', 5]]);
      expect(messages(...dansEvt(code, code))).toEqual([messageEnDouble(5, code, 4)]);
    });

    it.each(UNIQUES_EVT)('signale deux anomalies pour la %s en triple', (code) => {
      expect(structure(...dansEvt(code, code, code))).toEqual([
        ['entite-en-double', 5],
        ['entite-en-double', 6],
      ]);
      expect(messages(...dansEvt(code, code, code))).toEqual([
        messageEnDouble(5, code, 4),
        messageEnDouble(6, code, 4),
      ]);
    });

    it.each(UNIQUES_EVT)('accepte la %s dans deux évènements différents', (code) => {
      const codes: Code[] = ['000', '001', '100', code, '990', '100', code, '990', '995', '999'];
      expect(structure(...codes)).toEqual([]);
    });

    it.each(['125', '400'] as const)('signale la %s hors évènement, avant toute 100', (code) => {
      const codes: Code[] = ['000', '001', code, '100', '990', '995', '999'];
      expect(structure(...codes)).toEqual([['entite-mal-placee', 3]]);
      expect(messages(...codes)).toEqual([messageMalPlacee(3, code, HORS_EVENEMENT)]);
    });

    it.each(['125', '400'] as const)('signale la %s après la 990', (code) => {
      const codes: Code[] = ['000', '001', '100', '990', code, '995', '999'];
      expect(structure(...codes)).toEqual([['entite-mal-placee', 5]]);
      expect(messages(...codes)).toEqual([messageMalPlacee(5, code, HORS_EVENEMENT)]);
    });

    it('ne signale pas les filles d une 400 placée après la 990 : seule la 400 l est', () => {
      const codes: Code[] = ['000', '001', '100', '990', '400', '405', '410', '995', '999'];
      expect(structure(...codes)).toEqual([['entite-mal-placee', 5]]);
    });

    it('accepte plusieurs 125 dans un évènement', () => {
      expect(structure(...dansEvt('125', '125', '125'))).toEqual([]);
    });
  });

  describe('filles du bénéficiaire', () => {
    const UNIQUES_BENEF = ['405', '410', '411', '800'] as const;
    const MULTIPLES_BENEF = ['485', '490', '700'] as const;
    const TOUTES = [...UNIQUES_BENEF, ...MULTIPLES_BENEF] as const;

    it.each(TOUTES)('signale la %s sans 400', (code) => {
      expect(structure(...dansEvt(code))).toEqual([['entite-mal-placee', 4]]);
      expect(messages(...dansEvt(code))).toEqual([messageMalPlacee(4, code, HORS_BENEFICIAIRE)]);
    });

    it.each(TOUTES)('signale la %s après la 990', (code) => {
      const codes: Code[] = ['000', '001', '100', '400', '990', code, '995', '999'];
      expect(structure(...codes)).toEqual([['entite-mal-placee', 6]]);
      expect(messages(...codes)).toEqual([messageMalPlacee(6, code, HORS_BENEFICIAIRE)]);
    });

    it.each(TOUTES)('signale la %s après une nouvelle 100', (code) => {
      const codes: Code[] = ['000', '001', '100', '400', '100', code, '990', '995', '999'];
      expect(structure(...codes)).toEqual([
        ['entite-absente', 3],
        ['entite-mal-placee', 6],
      ]);
      expect(messages(...codes)).toEqual([
        messageSansEvenementFin(3),
        messageMalPlacee(6, code, HORS_BENEFICIAIRE),
      ]);
    });

    it.each(TOUTES)('signale la %s après la 995', (code) => {
      const codes: Code[] = ['000', '001', '100', '400', '990', '995', code, '999'];
      expect(structure(...codes)).toEqual([['entite-mal-placee', 7]]);
    });

    it.each(UNIQUES_BENEF)('signale la %s en double dans le même bénéficiaire', (code) => {
      expect(structure(...dansBenef(code, code))).toEqual([['entite-en-double', 6]]);
      expect(messages(...dansBenef(code, code))).toEqual([messageEnDouble(6, code, 5)]);
    });

    it.each(UNIQUES_BENEF)('signale deux anomalies pour la %s en triple', (code) => {
      expect(messages(...dansBenef(code, code, code))).toEqual([
        messageEnDouble(6, code, 5),
        messageEnDouble(7, code, 5),
      ]);
    });

    it.each(UNIQUES_BENEF)('accepte la %s dans deux bénéficiaires différents', (code) => {
      expect(structure(...dansEvt('400', code, '400', code))).toEqual([]);
    });

    it.each(MULTIPLES_BENEF)('accepte plusieurs %s dans le même bénéficiaire', (code) => {
      expect(structure(...dansBenef(code, code, code))).toEqual([]);
    });
  });

  describe('scénarios composés', () => {
    it.each([300, 25, 24, 1])('signale un fichier tronqué à %i octets dans une 405', (longueur) => {
      const codes: Code[] = ['000', '001', '100', '400', '405'];
      const lignes = lignesDepuisCodes(codes);
      lignes[4] = ligneSynthetique('405').slice(0, longueur);
      const lecture = lireLignes(lignes);
      expect(couples(lecture)).toEqual([
        ['entite-absente', null],
        ['entite-absente', 2],
        ['entite-absente', 3],
        ['longueur-ligne', 5],
      ]);
      expect(bloquantes(lecture).map((a) => a.message)).toEqual([
        MESSAGE_999_ABSENTE,
        messageSansDossierFin(2),
        messageSansEvenementFin(3),
        messageLongueur(5, longueur),
      ]);
    });

    it('signale un fichier tronqué juste après une 990', () => {
      const codes: Code[] = ['000', '001', '100', '400', '405', '990'];
      expect(structure(...codes)).toEqual([
        ['entite-absente', null],
        ['entite-absente', 2],
      ]);
      expect(messages(...codes)).toEqual([MESSAGE_999_ABSENTE, messageSansDossierFin(2)]);
    });

    it('signale deux fichiers concaténés avec saut final : 999 puis 000 mal placées', () => {
      const premier = fichierSynthetique(lignesDepuisCodes(SQUELETTE), { sautFinal: true });
      const second = fichierSynthetique(lignesDepuisCodes(SQUELETTE));
      const lecture = lireAc056(concatener(premier, second));
      expect(couples(lecture)).toEqual([
        ['entite-mal-placee', 6],
        ['entite-mal-placee', 7],
      ]);
      expect(bloquantes(lecture).map((a) => a.message)).toEqual([
        'Ligne 6 : entité 999 mal placée, attendue en dernière ligne.',
        'Ligne 7 : entité 000 mal placée, attendue en première ligne.',
      ]);
    });

    it('signale deux fichiers concaténés sans saut final : ligne de 1400 octets', () => {
      const premier = fichierSynthetique(lignesDepuisCodes(SQUELETTE));
      const second = fichierSynthetique(lignesDepuisCodes(SQUELETTE));
      const lecture = lireAc056(concatener(premier, second));
      // La 999 du premier fichier et la 000 du second forment la ligne 6, lue comme une 999.
      expect(lecture.fichier.lignes[5]?.origine).toHaveLength(1400);
      expect(couples(lecture)).toEqual([
        ['longueur-ligne', 6],
        ['entite-mal-placee', 6],
      ]);
      expect(bloquantes(lecture)[0]?.message).toBe(messageLongueur(6, 1400));
    });

    // Limite documentée : une 400 absente sur un bénéficiaire qui n'est pas le premier n'est pas
    // détectable comme telle. Ses filles sont rattachées au bénéficiaire précédent : les uniques
    // (405, 410) sont signalées en double, les multiples (485, 700) ne le sont pas.
    it('fige la limite d une 400 absente sur un bénéficiaire qui n est pas le premier', () => {
      const codes = dansEvt('400', '405', '410', '485', '405', '410', '485', '700');
      expect(structure(...codes)).toEqual([
        ['entite-en-double', 8],
        ['entite-en-double', 9],
      ]);
      expect(messages(...codes)).toEqual([
        messageEnDouble(8, '405', 5),
        messageEnDouble(9, '410', 6),
      ]);
    });
  });

  describe('forme des anomalies', () => {
    it('trie le niveau fichier d abord, puis par numéro de ligne', () => {
      const codes: Code[] = ['001', '100'];
      expect(structure(...codes)).toEqual([
        ['entite-absente', null],
        ['entite-absente', null],
        ['entite-absente', 1],
        ['entite-absente', 2],
      ]);
      expect(messages(...codes)).toEqual([
        MESSAGE_000_ABSENTE,
        MESSAGE_999_ABSENTE,
        messageSansDossierFin(1),
        messageSansEvenementFin(2),
      ]);
    });

    it('place mal placée avant 990 absente pour une même 100', () => {
      const codes: Code[] = ['000', '100', '999'];
      expect(structure(...codes)).toEqual([
        ['entite-mal-placee', 2],
        ['entite-absente', 2],
      ]);
      expect(messages(...codes)).toEqual([
        messageMalPlacee(2, '100', HORS_DOSSIER),
        messageSansEvenementFin(2),
      ]);
    });

    it('place les anomalies de format avant celles de structure sur une même ligne', () => {
      const lecture = lireCodes(['000', '100', '999'], { fin: ['\r\n', '\n', '\r\n'] });
      expect(lecture.anomalies.map((a) => [a.code, a.ligne])).toEqual([
        ['fin-de-ligne-lf', 2],
        ['entite-mal-placee', 2],
        ['entite-absente', 2],
      ]);
    });

    it('conserve le numéro d origine après des lignes vides', () => {
      const [l000, l001, l110, l100, l990, l995, l999] = lignesDepuisCodes([
        '000',
        '001',
        '110',
        '100',
        '990',
        '995',
        '999',
      ]) as [string, string, string, string, string, string, string];
      // Numéros d'origine : 000=1, 001=4, 110=7, 100=8, 990=9, 995=10, 999=11.
      const lecture = lireLignes([l000, '', '', l001, '', '', l110, l100, l990, l995, l999]);
      expect(couples(lecture)).toEqual([['entite-mal-placee', 7]]);
      expect(lecture.anomalies.filter((a) => a.code === 'ligne-vide').map((a) => a.ligne)).toEqual([
        2, 3, 5, 6,
      ]);
    });

    it('marque bloquantes les anomalies de structure et non bloquantes celles de format', () => {
      // BOM, fin LF, ligne vide, fin CR, plus une 110 hors évènement et une 999 absente.
      const lignes = [
        ...lignesDepuisCodes(['000', '001', '110']),
        '',
        ...lignesDepuisCodes(['100', '990', '995']),
      ];
      const lecture = lireLignes(lignes, {
        bom: true,
        fin: ['\r\n', '\n', '\r\n', '\r\n', '\r', '\r\n', '\r\n'],
        sautFinal: true,
      });
      const codes = new Set(lecture.anomalies.map((a) => a.code));
      for (const code of CODES_FORMAT) expect(codes.has(code as never)).toBe(true);
      expect(codes.has('entite-mal-placee')).toBe(true);
      expect(codes.has('entite-absente')).toBe(true);
      for (const anomalie of lecture.anomalies) {
        expect([anomalie.code, anomalie.bloquante]).toEqual([
          anomalie.code,
          !CODES_FORMAT.includes(anomalie.code),
        ]);
      }
    });

    it('marque bloquantes tous les codes de structure', () => {
      const lectures = [
        lireAc056(new Uint8Array()),
        lireLignes(lignesAvec(dansEvt('110'), 3, 'ABC')),
        lireCodes(dansEvt('110', null, '110', '125')),
        lireCodes(['001', '100', '110', '110', '405', '995']),
      ];
      const codes = new Set(lectures.flatMap((l) => bloquantes(l).map((a) => a.code)));
      expect([...codes].sort()).toEqual([
        'entite-absente',
        'entite-en-double',
        'entite-inconnue',
        'entite-mal-placee',
        'fichier-vide',
        'longueur-ligne',
      ]);
      expect(
        lectures
          .flatMap((l) => l.anomalies)
          .every((a) => CODES_FORMAT.includes(a.code) || a.bloquante),
      ).toBe(true);
    });

    it('gèle les anomalies et leur liste', () => {
      const lecture = lireCodes(['001', '100', null, '110', '110', '405', '995', '995']);
      expect(lecture.anomalies.length).toBeGreaterThan(5);
      expect(Object.isFrozen(lecture.anomalies)).toBe(true);
      expect(lecture.anomalies.every((a) => Object.isFrozen(a))).toBe(true);
    });

    it('gèle l anomalie fichier-vide', () => {
      const [anomalie] = lireAc056(new Uint8Array()).anomalies;
      expect(Object.isFrozen(anomalie)).toBe(true);
    });
  });

  describe('divergence 6 : écriture identique des fichiers mal formés', () => {
    const lignes405 = (longueur: number) => ligneSynthetique('405').slice(0, longueur);
    const squelette = lignesDepuisCodes(SQUELETTE);

    const cas: readonly (readonly [string, Uint8Array])[] = [
      ['fichier vide', new Uint8Array()],
      ['BOM seul', fichierSynthetique([], { bom: true })],
      ['000 absente', fichierSynthetique(lignesDepuisCodes(['001', '100', '990', '995', '999']))],
      ['999 absente', fichierSynthetique(lignesDepuisCodes(['000', '001', '100', '990', '995']))],
      ['990 et 995 absentes', fichierSynthetique(lignesDepuisCodes(['000', '001', '100', '999']))],
      ['000 en double', fichierSynthetique(lignesDepuisCodes(['000', '000', '999']))],
      ['999 au milieu', fichierSynthetique(lignesDepuisCodes(['000', '999', '001', '995']))],
      ['filles sans parent', fichierSynthetique(lignesDepuisCodes(['000', '405', '110', '999']))],
      [
        'uniques en double',
        fichierSynthetique(lignesDepuisCodes(dansBenef('405', '405', '110', '110'))),
      ],
      ['code inconnu', fichierSynthetique(lignesDepuisCodes(dansEvt(null, '110')))],
      [
        'code inconnu non numérique',
        fichierSynthetique(
          lignesAvec(dansEvt('110'), 3, ligneSynthetique('400', { numEntite: 'ABC' })),
        ),
      ],
      ['ligne de 699 octets', fichierSynthetique(lignesAvec(dansBenef('405'), 4, lignes405(699)))],
      [
        'ligne de 701 octets',
        fichierSynthetique(lignesAvec(dansBenef('405'), 4, lignes405(700) + ' ')),
      ],
      ['ligne de 10 octets', fichierSynthetique(lignesAvec(dansBenef('405'), 4, 'ABCDEFGHIJ'))],
      [
        'fichier tronqué dans une 405',
        fichierSynthetique([...squelette.slice(0, 3), lignes405(300)]),
      ],
      [
        'fichier tronqué avec ligne coupée à 1 octet',
        fichierSynthetique([...squelette.slice(0, 3), 'X']),
      ],
      [
        'deux fichiers avec saut final',
        concatener(
          fichierSynthetique(squelette, { sautFinal: true }),
          fichierSynthetique(squelette),
        ),
      ],
      [
        'deux fichiers sans saut final',
        concatener(fichierSynthetique(squelette), fichierSynthetique(squelette)),
      ],
      [
        'BOM, fins LF et CR, saut final',
        fichierSynthetique(lignesDepuisCodes(['000', '110', '405', '999']), {
          bom: true,
          fin: ['\n', '\r', '\r\n', '\n'],
          sautFinal: true,
        }),
      ],
      [
        'octets de contrôle et non ASCII dans une ligne inconnue',
        fichierSynthetique(['\x00\x01\xE9\xFF'.repeat(40), ...squelette]),
      ],
    ];

    it.each(cas)('réécrit à l identique : %s', (_nom, octets) => {
      const sortie = ecrireAc056(lireAc056(octets).fichier);
      expect(empreinteSha256(sortie)).toBe(empreinteSha256(octets));
    });
  });
});

/** Concatène deux contenus sans rien insérer entre eux. */
function concatener(premier: Uint8Array, second: Uint8Array): Uint8Array {
  const resultat = new Uint8Array(premier.length + second.length);
  resultat.set(premier, 0);
  resultat.set(second, premier.length);
  return resultat;
}

// ---------------------------------------------------------------------------------------------
// Garantie : un fichier sans anomalie bloquante rattache chaque ligne exactement une fois, avec la
// 000 en tête et la 999 en dernier. Vérifiée sur des lignes `LigneAc056` construites directement
// (origine de 700 octets), sans relire de fichier, puis `controlerStructure` et `construireHierarchie`.
// ---------------------------------------------------------------------------------------------

const ORIGINE_700 = repeterOctet(' ', 700);
const LIGNES_PAR_CODE = new Map<string, LigneAc056[]>();

/** Ligne brute de 700 octets portant le code voulu (mémorisée : elle est immuable). */
function ligneDeCode(code: Code, numero: number): LigneAc056 {
  const cle = code ?? 'null';
  let lignes = LIGNES_PAR_CODE.get(cle);
  if (lignes === undefined) {
    lignes = [];
    LIGNES_PAR_CODE.set(cle, lignes);
  }
  let ligne = lignes[numero];
  if (ligne === undefined) {
    ligne = Object.freeze({
      nature: 'brute' as const,
      code,
      numero,
      origine: ORIGINE_700,
      finDeLigne: '\r\n' as const,
    });
    lignes[numero] = ligne;
  }
  return ligne;
}

interface BilanGarantie {
  /** Vrai si `controlerStructure` ne signale aucune anomalie. */
  readonly sansAnomalie: boolean;
  /** Description de la violation de la garantie, ou null. */
  readonly violation: string | null;
}

function verifierGarantie(codes: readonly Code[]): BilanGarantie {
  const lignes = codes.map((code, i) => ligneDeCode(code, i + 1));
  if (controlerStructure(lignes).length > 0) return { sansAnomalie: false, violation: null };

  const fichier: FichierAc056 = { bom: false, lignes, ...construireHierarchie(lignes) };
  const comptes = compterRattachements(fichier);
  const defauts: string[] = [];
  comptes.forEach((compte, i) => {
    if (compte !== 1)
      defauts.push(`ligne ${i + 1} (${codes[i] ?? 'inconnue'}) rattachée ${compte} fois`);
  });
  if (codes[0] !== '000') defauts.push('première ligne différente de 000');
  if (codes.at(-1) !== '999') defauts.push('dernière ligne différente de 999');
  return {
    sansAnomalie: true,
    violation: defauts.length === 0 ? null : `${codes.join(' ')} : ${defauts.join(', ')}`,
  };
}

/** Accumule les violations et compte les suites sans anomalie (pour exclure un test vide). */
class Compteur {
  suites = 0;
  sansAnomalie = 0;
  readonly violations: string[] = [];

  verifier(codes: readonly Code[]): void {
    const bilan = verifierGarantie(codes);
    this.suites++;
    if (bilan.sansAnomalie) this.sansAnomalie++;
    if (bilan.violation !== null && this.violations.length < 10)
      this.violations.push(bilan.violation);
  }
}

/** Toutes les suites non vides de longueur ≤ `longueurMax` sur `alphabet`. */
function pourToutesLesSuites(
  alphabet: readonly Code[],
  longueurMax: number,
  visiter: (suite: readonly Code[]) => void,
): void {
  const suite: Code[] = [];
  const parcourir = (): void => {
    if (suite.length > 0) visiter(suite);
    if (suite.length === longueurMax) return;
    for (const code of alphabet) {
      suite.push(code);
      parcourir();
      suite.pop();
    }
  };
  parcourir();
}

describe('garantie : sans anomalie bloquante, chaque ligne est rattachée exactement une fois', () => {
  const ALPHABET: readonly Code[] = [
    '000',
    '001',
    '100',
    '110',
    '125',
    '400',
    '405',
    '485',
    '990',
    '995',
    '999',
  ];
  const LONGUEUR_EXHAUSTIVE = 5;

  it(`vaut pour toutes les suites jusqu à ${LONGUEUR_EXHAUSTIVE} lignes sur 11 codes`, () => {
    const compteur = new Compteur();
    pourToutesLesSuites(ALPHABET, LONGUEUR_EXHAUSTIVE, (suite) => compteur.verifier(suite));
    expect(compteur.suites).toBe(
      Array.from({ length: LONGUEUR_EXHAUSTIVE }, (_, i) => ALPHABET.length ** (i + 1)).reduce(
        (somme, n) => somme + n,
        0,
      ),
    );
    expect(compteur.sansAnomalie).toBeGreaterThan(0);
    expect(compteur.violations).toEqual([]);
  });

  it('vaut pour des suites aléatoires à graine fixe sur les 22 codes et le code inconnu', () => {
    const alphabet: readonly Code[] = [...CODES_ENTITE, null];
    expect(CODES_ENTITE).toHaveLength(22);
    let graine = 20260413;
    const tirer = (borne: number): number => {
      graine = (Math.imul(graine, 1103515245) + 12345) & 0x7fffffff;
      return (graine >>> 8) % borne;
    };

    const compteur = new Compteur();
    for (let essai = 0; essai < 5000; essai++) {
      const longueur = 1 + tirer(30);
      const suite = Array.from(
        { length: longueur },
        () => alphabet[tirer(alphabet.length)] ?? null,
      );
      // Une suite sur deux est encadrée par 000 et 999, pour que la garantie soit souvent exercée.
      if (essai % 2 === 0 && longueur >= 2) {
        suite[0] = '000';
        suite[longueur - 1] = '999';
      }
      compteur.verifier(suite);
    }
    expect(compteur.suites).toBe(5000);
    expect(compteur.sansAnomalie).toBeGreaterThan(0);
    expect(compteur.violations).toEqual([]);
  });

  it('vaut pour les mutations de lignesCompletes() : suppression, duplication, déplacement, insertion', () => {
    const base: Code[] = lignesCompletes().map((ligne) => ligne.slice(22, 25) as CodeEntite);
    expect(base).toHaveLength(138);
    const compteur = new Compteur();
    compteur.verifier(base);
    expect(compteur.sansAnomalie).toBe(1);

    const insertions: readonly Code[] = [
      '000',
      '001',
      '100',
      '110',
      '400',
      '405',
      '990',
      '995',
      '999',
      null,
    ];
    for (let i = 0; i < base.length; i++) {
      compteur.verifier(base.filter((_, j) => j !== i));
      compteur.verifier(base.flatMap((code, j) => (j === i ? [code, code] : [code])));
      for (let j = 0; j < base.length; j++) {
        if (j === i) continue;
        const sans = base.filter((_, k) => k !== i);
        compteur.verifier([...sans.slice(0, j), base[i] ?? null, ...sans.slice(j)]);
      }
    }
    for (let position = 0; position <= base.length; position++) {
      for (const code of insertions) {
        compteur.verifier([...base.slice(0, position), code, ...base.slice(position)]);
      }
    }

    // 138 suppressions, 138 duplications, 138 x 137 déplacements, 139 x 10 insertions, 1 base.
    expect(compteur.suites).toBe(1 + 138 + 138 + 138 * 137 + 139 * 10);
    expect(compteur.sansAnomalie).toBeGreaterThan(1);
    expect(compteur.violations).toEqual([]);
  });
});

describe('performance du lecteur sur un fichier synthétique 10 fois plus gros', () => {
  const REPETITIONS = 3;

  function mediane(valeurs: readonly number[]): number {
    const triees = [...valeurs].sort((a, b) => a - b);
    return triees[Math.floor(triees.length / 2)] ?? Number.NaN;
  }

  it('lit environ 5 400 lignes sans dérive quadratique (garde-fou large, mesure indicative)', async ({
    annotate,
  }) => {
    const octets = fichierSynthetique(lignesCompletes({ dossiers: 80 }));
    expect(lireAc056(octets).fichier.lignes).toHaveLength(5442);

    const durees: number[] = [];
    for (let i = 0; i < REPETITIONS; i++) {
      const debut = performance.now();
      const lecture = lireAc056(octets);
      durees.push(performance.now() - debut);
      expect(lecture.anomalies).toEqual([]);
    }
    const ms = mediane(durees);
    await annotate(
      `Lecture synthétique 10x : ${octets.length} octets, 5442 lignes, médiane ${ms.toFixed(0)} ms sur ${REPETITIONS} mesures.`,
    );
    expect(ms).toBeLessThan(5000);
  });
});
