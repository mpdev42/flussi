// Compteurs d'erreurs à chaque niveau : anomalies bloquantes seulement, un ancêtre agrège ses
// descendants, lignes hors évènement et niveau fichier comptés à part.
import { describe, expect, it } from 'vitest';
import { lignesCompletes } from '@shared/test/ac056-synthetique';
import { lire } from '@shared/test/controle-ac056';
import { compterAnomalies, compterParLigne } from './compteurs';
import { indexerLignes } from './index-lignes';
import type { AnomalieAc056 } from './modele';

const lignes = lignesCompletes({ dossiers: 2 });
const fichier = lire(lignes);
const index = indexerLignes(fichier);

/** Numéro d'origine de la ligne d'un évènement, d'un bénéficiaire, d'une entité et d'un rang. */
function numeroDe(evenement: number, beneficiaire: number | null, entite: string, rang = 0) {
  const indice = index.rattachements.findIndex(
    (r) =>
      r !== null &&
      r.evenement === evenement &&
      r.beneficiaire === beneficiaire &&
      r.entite === entite &&
      r.rang === rang,
  );
  return fichier.lignes[indice]!.numero;
}

const anomalie = (ligne: number | null, bloquante = true): AnomalieAc056 => ({
  code: bloquante ? 'caractere-non-autorise' : 'fin-de-ligne-lf',
  ligne,
  message: 'test',
  bloquante,
});

describe('compterAnomalies', () => {
  it('donne des compteurs à 0 sans anomalie, aux dimensions du fichier', () => {
    const c = compterAnomalies(index, []);
    expect(c.parIndice).toHaveLength(fichier.lignes.length);
    expect(c.parIndice.every((n) => n === 0)).toBe(true);
    expect(c.parEvenement).toEqual([0, 0, 0, 0]);
    expect(c.parBeneficiaire).toEqual([
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ]);
    expect(c.parElement[0]).toEqual({
      e125: [0, 0],
      beneficiaires: [
        { e485: [0, 0], e490: [0, 0], e700: [0, 0] },
        { e485: [0, 0], e490: [0, 0], e700: [0, 0] },
      ],
    });
    expect(c.horsEvenement).toBe(0);
  });

  it('agrège une erreur d un élément de liste à chaque niveau', () => {
    const c = compterAnomalies(index, [anomalie(numeroDe(1, 1, '700', 1))]);
    expect(c.parEvenement).toEqual([0, 1, 0, 0]);
    expect(c.parBeneficiaire[1]).toEqual([0, 1]);
    expect(c.parEntiteBeneficiaire[1]![1]!['700']).toBe(1);
    expect(c.parEntiteBeneficiaire[1]![1]!['400']).toBe(0);
    expect(c.parElement[1]!.beneficiaires[1]!.e700).toEqual([0, 1]);
    expect(c.parEntiteEvenement[1]).toEqual({
      '100': 0,
      '110': 0,
      '115': 0,
      '120': 0,
      '125': 0,
      '130': 0,
      '135': 0,
      '155': 0,
      '180': 0,
      '990': 0,
    });
    expect(c.horsEvenement).toBe(0);
  });

  it('compte chaque anomalie : deux sur une 125, une sur la 990', () => {
    const n125 = numeroDe(2, null, '125', 1);
    const c = compterAnomalies(index, [
      anomalie(n125),
      anomalie(n125),
      anomalie(numeroDe(2, null, '990')),
    ]);
    expect(c.parEvenement).toEqual([0, 0, 3, 0]);
    expect(c.parEntiteEvenement[2]!['125']).toBe(2);
    expect(c.parEntiteEvenement[2]!['990']).toBe(1);
    expect(c.parElement[2]!.e125).toEqual([0, 2]);
    expect(c.parBeneficiaire[2]).toEqual([0, 0]);
    const i125 = index.indices.get(n125)!;
    expect(c.parIndice[i125]).toBe(2);
  });

  it('compte une erreur de 400 dans le bénéficiaire, et une de 100 dans l évènement', () => {
    const c = compterAnomalies(index, [
      anomalie(numeroDe(0, 0, '400')),
      anomalie(numeroDe(0, null, '100')),
    ]);
    expect(c.parEvenement[0]).toBe(2);
    expect(c.parBeneficiaire[0]).toEqual([1, 0]);
    expect(c.parEntiteBeneficiaire[0]![0]!['400']).toBe(1);
    expect(c.parEntiteEvenement[0]!['100']).toBe(1);
  });

  it('compte hors évènement : 001, 995, 999, niveau fichier et numéro inconnu', () => {
    const numero = (code: string) => fichier.lignes.find((l) => l.code === code)!.numero;
    const c = compterAnomalies(index, [
      anomalie(numero('001')),
      anomalie(numero('995')),
      anomalie(numero('999')),
      anomalie(null),
      anomalie(99_999),
    ]);
    expect(c.horsEvenement).toBe(5);
    expect(c.parEvenement).toEqual([0, 0, 0, 0]);
    expect(c.parIndice.reduce((a, b) => a + b, 0)).toBe(3);
  });

  it('ignore les anomalies non bloquantes', () => {
    const c = compterAnomalies(index, [
      anomalie(numeroDe(0, null, '110'), false),
      anomalie(null, false),
    ]);
    expect(c.parEvenement).toEqual([0, 0, 0, 0]);
    expect(c.horsEvenement).toBe(0);
  });
});

describe('compterParLigne', () => {
  it('compte des numéros de ligne quelconques (lignes rejetées)', () => {
    const c = compterParLigne(index, [numeroDe(3, 0, '485', 1), numeroDe(3, 0, '800')]);
    expect(c.parEvenement).toEqual([0, 0, 0, 2]);
    expect(c.parElement[3]!.beneficiaires[0]!.e485).toEqual([0, 1]);
    expect(c.parEntiteBeneficiaire[3]![0]!['800']).toBe(1);
  });
});
