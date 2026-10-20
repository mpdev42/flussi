// Analyse complète au chargement (`analyserAc056`) : lecture puis contrôle, anomalies fusionnées et
// triées, compteurs, résultat clonable pour l'IPC. Fichiers synthétiques uniquement.
import { describe, expect, it } from 'vitest';
import {
  enChaineBinaire,
  enOctetsBruts,
  fichierSynthetique,
  lignesCompletes,
  lignesRejet,
} from '@shared/test/ac056-synthetique';
import { avecChamp } from '@shared/test/controle-ac056';
import { analyserAc056, bilanAnalyse, familleAnomalie, type AnalyseAc056 } from './analyse';
import { controlerAc056 } from './controle';
import { lireAc056 } from './lecteur';
import type { AnomalieAc056, CodeAnomalie } from './modele';
import { CODES_STRUCTURE } from './structure';

/** Famille attendue de chaque code (liste exhaustive, comme la table de `analyse.ts`). */
const FAMILLES_ATTENDUES: Record<CodeAnomalie, ReturnType<typeof familleAnomalie>> = {
  bom: 'lecture',
  'fin-de-ligne-lf': 'lecture',
  'fin-de-ligne-cr': 'lecture',
  'ligne-vide': 'lecture',
  'ctrl-z-final': 'lecture',
  'encodage-incoherent': 'lecture',
  'fichier-vide': 'structure',
  'longueur-ligne': 'structure',
  'entite-inconnue': 'structure',
  'entite-mal-placee': 'structure',
  'entite-en-double': 'structure',
  'entite-absente': 'structure',
  'caractere-non-autorise': 'controle',
  'caractere-interdit': 'controle',
  'code-postal-longueur': 'controle',
  'rang-incoherent': 'controle',
  'rang-non-numerique': 'controle',
  'valeur-imposee': 'controle',
};

/** Indice (base 0) de la première ligne de code `code`. */
const indiceDe = (lignes: readonly string[], code: string) =>
  lignes.findIndex((ligne) => ligne.slice(22, 25) === code);

/**
 * Fichier VEOS qui mêle toutes les sortes d'anomalies :
 * - BOM et Ctrl-Z final (niveau fichier, non bloquantes) ;
 * - ligne 2 vide (non bloquante) ;
 * - la 405 avec un nom refusé (contrôle, bloquant) et, sur la même ligne, une fin LF ;
 * - une 110 en double dans le premier évènement (structure, bloquante).
 */
function fichierMelange(): { octets: Uint8Array; numero405: number; numero110: number } {
  const lignes = lignesCompletes({ dossiers: 1 });
  const i405 = indiceDe(lignes, '405');
  lignes[i405] = avecChamp(lignes[i405] ?? '', '405', 'nom', 'D#PONT');
  const i110 = indiceDe(lignes, '110');
  lignes.splice(i110 + 1, 0, lignes[i110] ?? '');
  lignes.splice(1, 0, '');
  // Après les insertions : la 405 a glissé de 2 lignes, la 110 en double de 1 (ligne vide).
  const fins = lignes.map((_l, i) => (i === i405 + 2 ? ('\n' as const) : ('\r\n' as const)));
  const corps = enChaineBinaire(fichierSynthetique(lignes, { bom: true, fin: fins }));
  return {
    octets: enOctetsBruts(`${corps}\x1A`),
    numero405: i405 + 3,
    numero110: i110 + 3,
  };
}

describe('analyserAc056', () => {
  describe('fichier VEOS conforme', () => {
    it('renvoie le fichier lu sans anomalie et des compteurs à 0', () => {
      const octets = fichierSynthetique(lignesCompletes());
      const analyse = analyserAc056(octets, 'veos');
      expect(analyse.fichier).toEqual(lireAc056(octets).fichier);
      expect(analyse.anomalies).toEqual([]);
      expect([
        analyse.erreurs,
        analyse.nonBloquantes,
        analyse.structure,
        analyse.lignesRejetees,
      ]).toEqual([0, 0, 0, 0]);
    });
  });

  describe('fichier VEOS avec anomalies de lecture et de contrôle', () => {
    it('fusionne lecture et contrôle : niveau fichier d abord, puis par ligne', () => {
      const { octets, numero405, numero110 } = fichierMelange();
      const analyse = analyserAc056(octets, 'veos');
      expect(analyse.anomalies.map((a) => [a.code, a.ligne, a.bloquante])).toEqual([
        ['bom', null, false],
        ['ctrl-z-final', null, false],
        ['ligne-vide', 2, false],
        ['entite-en-double', numero110, true],
        ['fin-de-ligne-lf', numero405, false],
        ['caractere-non-autorise', numero405, true],
      ]);
    });

    it('garde, à ligne égale, la lecture avant le contrôle', () => {
      const { octets, numero405 } = fichierMelange();
      const memeLigne = analyserAc056(octets, 'veos').anomalies.filter(
        (a) => a.ligne === numero405,
      );
      expect(memeLigne.map((a) => a.code)).toEqual(['fin-de-ligne-lf', 'caractere-non-autorise']);
    });

    it('contient exactement les anomalies de lireAc056 et de controlerAc056', () => {
      const { octets } = fichierMelange();
      const lecture = lireAc056(octets);
      const attendues = [...lecture.anomalies, ...controlerAc056(lecture.fichier)];
      const analyse = analyserAc056(octets, 'veos');
      expect(analyse.anomalies).toHaveLength(attendues.length);
      expect(analyse.anomalies).toEqual(expect.arrayContaining(attendues));
    });

    it('compte les erreurs, les non bloquantes et les anomalies de structure', () => {
      const analyse = analyserAc056(fichierMelange().octets, 'veos');
      expect(analyse.erreurs).toBe(2);
      expect(analyse.nonBloquantes).toBe(4);
      expect(analyse.structure).toBe(1);
      expect(analyse.lignesRejetees).toBe(0);
    });

    it('compte en structure chaque code de structure, et lui seul', () => {
      const lignes = lignesCompletes({ dossiers: 1 });
      // Ligne courte (longueur-ligne), code inconnu, 999 retirée (entite-absente).
      const corps = [lignes[0] ?? '', 'COURTE', ' '.repeat(700), ...lignes.slice(1, -1)];
      const analyse = analyserAc056(fichierSynthetique(corps), 'veos');
      const deStructure = analyse.anomalies.filter((a) =>
        (CODES_STRUCTURE as readonly string[]).includes(a.code),
      );
      expect(deStructure.map((a) => a.code).sort()).toEqual([
        'entite-absente',
        'entite-inconnue',
        'longueur-ligne',
      ]);
      expect(analyse.structure).toBe(3);
    });

    it('compte fichier-vide comme anomalie de structure', () => {
      const analyse = analyserAc056(new Uint8Array(), 'veos');
      expect(analyse.anomalies.map((a) => a.code)).toEqual(['fichier-vide']);
      expect([analyse.erreurs, analyse.structure]).toEqual([1, 1]);
    });
  });

  describe('fichier de rejet', () => {
    it('ne contrôle pas et compte les lignes portant un message MSP', () => {
      const lignes = lignesRejet({
        message: (code, indice) => (code === '405' && indice < 20 ? 'Erreur de test' : undefined),
      });
      const avecMessage = lignes.filter((l) => l.length > 718).length;
      expect(avecMessage).toBeGreaterThan(0);
      const analyse = analyserAc056(fichierSynthetique(lignes), 'rejet');
      expect(analyse.anomalies).toEqual([]);
      expect(analyse.lignesRejetees).toBe(avecMessage);
      expect([analyse.erreurs, analyse.nonBloquantes, analyse.structure]).toEqual([0, 0, 0]);
    });

    it('signale les anomalies de lecture d un rejet sans contrôle (ligne trop courte)', () => {
      const lignes = lignesRejet();
      lignes[1] = (lignes[1] ?? '').slice(0, 700);
      const analyse = analyserAc056(fichierSynthetique(lignes), 'rejet');
      expect(analyse.anomalies.map((a) => [a.code, a.ligne])).toEqual([['longueur-ligne', 2]]);
      expect([analyse.erreurs, analyse.structure]).toEqual([1, 1]);
    });
  });

  describe('résultat transmis par l IPC (clonage structuré)', () => {
    /** Vérifie récursivement qu'une valeur n'est faite que de types simples ; renvoie les chemins fautifs. */
    function nonSimples(valeur: unknown, chemin = 'analyse'): string[] {
      if (valeur === null) return [];
      const type = typeof valeur;
      if (type === 'string' || type === 'boolean') return [];
      if (type === 'number') return Number.isFinite(valeur) ? [] : [chemin];
      if (Array.isArray(valeur)) return valeur.flatMap((v, i) => nonSimples(v, `${chemin}[${i}]`));
      if (type === 'object' && Object.getPrototypeOf(valeur) === Object.prototype) {
        return Object.entries(valeur as Record<string, unknown>).flatMap(([cle, v]) =>
          nonSimples(v, `${chemin}.${cle}`),
        );
      }
      return [`${chemin} (${type})`];
    }

    const analyses: [string, AnalyseAc056][] = [
      ['VEOS avec anomalies', analyserAc056(fichierMelange().octets, 'veos')],
      [
        'rejet avec messages',
        analyserAc056(
          fichierSynthetique(
            lignesRejet({ message: (code) => (code === '405' ? 'Erreur' : undefined) }),
          ),
          'rejet',
        ),
      ],
    ];

    it.each(analyses)(
      '%s : structuredClone donne un résultat égal en profondeur',
      (_cas, analyse) => {
        expect(structuredClone(analyse)).toStrictEqual(analyse);
      },
    );

    it.each(analyses)(
      '%s : seulement objets simples, tableaux, chaînes, nombres, booléens et null',
      (_cas, analyse) => {
        expect(nonSimples(analyse)).toEqual([]);
      },
    );
  });
});

describe('bilanAnalyse', () => {
  it('trie par ligne (niveau fichier d abord), de façon stable, et recalcule les compteurs', () => {
    const { fichier } = lireAc056(fichierSynthetique(lignesCompletes({ dossiers: 1 })));
    const a = (code: CodeAnomalie, ligne: number | null, bloquante: boolean): AnomalieAc056 => ({
      code,
      ligne,
      message: code,
      bloquante,
    });
    const bilan = bilanAnalyse(fichier, [
      a('caractere-non-autorise', 5, true),
      a('fin-de-ligne-lf', 5, false),
      a('entite-en-double', 3, true),
      a('bom', null, false),
      a('rang-incoherent', 5, true),
    ]);
    expect(bilan.anomalies.map((x) => [x.ligne, x.code])).toEqual([
      [null, 'bom'],
      [3, 'entite-en-double'],
      [5, 'caractere-non-autorise'],
      [5, 'fin-de-ligne-lf'],
      [5, 'rang-incoherent'],
    ]);
    expect([bilan.erreurs, bilan.nonBloquantes, bilan.structure, bilan.lignesRejetees]).toEqual([
      3, 2, 1, 0,
    ]);
    expect(Object.isFrozen(bilan)).toBe(true);
    expect(Object.isFrozen(bilan.anomalies)).toBe(true);
  });

  it('donne le même résultat qu analyserAc056 sur la lecture puis le contrôle', () => {
    const { octets } = fichierMelange();
    const lecture = lireAc056(octets);
    expect(
      bilanAnalyse(lecture.fichier, [...lecture.anomalies, ...controlerAc056(lecture.fichier)]),
    ).toEqual(analyserAc056(octets, 'veos'));
  });
});

describe('familleAnomalie', () => {
  it('range en structure exactement les codes de CODES_STRUCTURE', () => {
    const codes = Object.keys(FAMILLES_ATTENDUES) as CodeAnomalie[];
    expect(codes.filter((code) => familleAnomalie(code) === 'structure').sort()).toEqual(
      [...CODES_STRUCTURE].sort(),
    );
  });

  it('range en contrôle tous les codes produits par controlerAc056, et eux seuls', () => {
    const codes = Object.keys(FAMILLES_ATTENDUES) as CodeAnomalie[];
    expect(codes.filter((code) => familleAnomalie(code) === 'controle').sort()).toEqual([
      'caractere-interdit',
      'caractere-non-autorise',
      'code-postal-longueur',
      'rang-incoherent',
      'rang-non-numerique',
      'valeur-imposee',
    ]);
    for (const code of codes) expect(familleAnomalie(code)).toBe(FAMILLES_ATTENDUES[code]);
  });
});
