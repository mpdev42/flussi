// Index des lignes : rattachement de chaque ligne à son évènement, son bénéficiaire, son entité
// et son rang dans une liste ; lignes hors évènement ; numéro d'origine → indice.
import { describe, expect, it } from 'vitest';
import {
  fichierSynthetique,
  ligneRejetSynthetique,
  ligneSynthetique,
  lignesCompletes,
  lignesRejet,
} from '@shared/test/ac056-synthetique';
import { dansBeneficiaire, dansEvenement, lire } from '@shared/test/controle-ac056';
import { compterRattachements } from '@shared/test/rattachements-ac056';
import type { CodeEntite } from './entites';
import { indexerLignes } from './index-lignes';
import { lireAc056 } from './lecteur';

describe('indexerLignes', () => {
  const lignes = lignesCompletes({ dossiers: 2 });
  const fichier = lire(lignes);
  const index = indexerLignes(fichier);

  it('liste les évènements de tous les dossiers dans l ordre du fichier', () => {
    expect(index.evenements.map((e) => e.dossier)).toEqual([0, 0, 1, 1]);
    expect(index.evenements.map((e) => e.noeud)).toEqual(
      fichier.dossiers.flatMap((d) => d.evenements),
    );
  });

  it('rattache le premier évènement ligne par ligne', () => {
    // 000, 001, puis 100 … 990 du premier évènement (33 lignes).
    const premier = index.rattachements.slice(0, 2 + 33);
    expect(premier.slice(0, 2)).toEqual([null, null]);
    expect(
      premier.slice(2).map((r) => [r?.evenement, r?.beneficiaire, r?.entite, r?.rang]),
    ).toEqual([
      [0, null, '100', 0],
      [0, null, '110', 0],
      [0, null, '115', 0],
      [0, null, '120', 0],
      [0, null, '125', 0],
      [0, null, '125', 1],
      [0, null, '130', 0],
      [0, null, '135', 0],
      [0, null, '155', 0],
      [0, null, '180', 0],
      ...[0, 1].flatMap((b) => [
        [0, b, '400', 0],
        [0, b, '405', 0],
        [0, b, '410', 0],
        [0, b, '411', 0],
        [0, b, '485', 0],
        [0, b, '485', 1],
        [0, b, '490', 0],
        [0, b, '490', 1],
        [0, b, '700', 0],
        [0, b, '700', 1],
        [0, b, '800', 0],
      ]),
      [0, null, '990', 0],
    ]);
  });

  it('ne rattache ni 000, ni 001, ni 995, ni 999', () => {
    const horsEvenement = fichier.lignes
      .filter((_l, i) => index.rattachements[i] === null)
      .map((l) => l.code);
    expect(horsEvenement).toEqual(['000', '001', '995', '001', '995', '999']);
  });

  it('rattache exactement les lignes de la hiérarchie sous un évènement', () => {
    const comptes = compterRattachements(fichier);
    fichier.lignes.forEach((l, i) => {
      const sousEvenement = comptes[i] === 1 && !['000', '001', '995', '999'].includes(l.code!);
      expect(index.rattachements[i] !== null, `ligne ${l.numero}`).toBe(sousEvenement);
    });
  });

  it('donne l indice de chaque numéro d origine, lignes vides exclues', () => {
    const avecVide = lire([lignes[0]!, '', ...lignes.slice(1)]);
    const indexVide = indexerLignes(avecVide);
    expect(indexVide.indices.get(1)).toBe(0);
    expect(indexVide.indices.has(2)).toBe(false);
    expect(indexVide.indices.get(3)).toBe(1);
    expect(indexVide.indices.size).toBe(avecVide.lignes.length);
  });

  it('laisse hors évènement la première entité unique en double (le dernier gagne)', () => {
    const r = indexerLignes(lire(dansEvenement(ligneSynthetique('110'), ligneSynthetique('110'))));
    expect(r.rattachements.slice(3, 5)).toEqual([
      null,
      { evenement: 0, beneficiaire: null, entite: '110', rang: 0 },
    ]);
  });

  it('laisse hors évènement les filles sans 400 et les lignes de code inconnu', () => {
    const r = indexerLignes(
      lire(dansEvenement(ligneSynthetique('405'), ligneSynthetique('700'), ' '.repeat(700))),
    );
    expect(r.rattachements.slice(3, 6)).toEqual([null, null, null]);
  });

  it('rattache une ligne brute de code connu (400 de 699 octets) et ses filles', () => {
    const r = indexerLignes(
      lire(dansEvenement(ligneSynthetique('400').slice(0, 699), ligneSynthetique('405'))),
    );
    expect(r.rattachements.slice(3, 5)).toEqual([
      { evenement: 0, beneficiaire: 0, entite: '400', rang: 0 },
      { evenement: 0, beneficiaire: 0, entite: '405', rang: 0 },
    ]);
  });

  it('numérote les bénéficiaires d un évènement', () => {
    const r = indexerLignes(
      lire(dansBeneficiaire('ASSPRI', ligneSynthetique('700'), ligneSynthetique('400'))),
    );
    expect(r.rattachements.slice(3, 6).map((x) => [x?.beneficiaire, x?.entite])).toEqual([
      [0, '400'],
      [0, '700'],
      [1, '400'],
    ]);
  });

  it('indexe un fichier de rejet (dossiers d après la clé)', () => {
    const rejet = lireAc056(fichierSynthetique(lignesRejet({ dossiers: 2 })), 'rejet').fichier;
    const r = indexerLignes(rejet);
    expect(r.evenements.map((e) => e.dossier)).toEqual([0, 0, 1, 1]);
    expect(r.rattachements.filter((x) => x !== null)).toHaveLength(4 * 33);
  });

  it('rattache au bénéficiaire implicite d un rejet la 700 sans 400 et les filles qui suivent', () => {
    const lignesRejetees = ['100', '405', '700', '700', '410', '400', '700', '990', '995'].map(
      (code) => ligneRejetSynthetique(code as CodeEntite, 1),
    );
    const rejet = lireAc056(fichierSynthetique(lignesRejetees), 'rejet');
    expect(rejet.anomalies.map((a) => [a.code, a.ligne])).toEqual([['entite-mal-placee', 2]]);
    const r = indexerLignes(rejet.fichier);
    expect(r.rattachements.map((x) => x && [x.beneficiaire, x.entite, x.rang])).toEqual([
      [null, '100', 0],
      null,
      [0, '700', 0],
      [0, '700', 1],
      [0, '410', 0],
      [1, '400', 0],
      [1, '700', 0],
      [null, '990', 0],
      null,
    ]);
    expect(r.evenements[0]?.noeud.beneficiaires.map((b) => b.e400)).toEqual([null, 5]);
  });

  it('renvoie un index figé', () => {
    expect(Object.isFrozen(index)).toBe(true);
    expect(Object.isFrozen(index.rattachements)).toBe(true);
    expect(Object.isFrozen(index.evenements)).toBe(true);
  });
});
