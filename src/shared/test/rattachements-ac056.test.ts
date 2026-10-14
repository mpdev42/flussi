import { describe, expect, it } from 'vitest';
import type { CodeEntite } from '@shared/domain/ac056/entites';
import { lireAc056 } from '@shared/domain/ac056/lecteur';
import {
  fichierSynthetique,
  ligneRejetSynthetique,
  lignesCompletes,
  lignesDepuisCodes,
  lignesRejet,
} from './ac056-synthetique';
import { compterRattachements } from './rattachements-ac056';

describe('compterRattachements', () => {
  it('compte une fois chaque ligne d un fichier complet', () => {
    const { fichier } = lireAc056(fichierSynthetique(lignesCompletes()));
    const comptes = compterRattachements(fichier);
    expect(comptes).toHaveLength(138);
    expect(comptes.every((compte) => compte === 1)).toBe(true);
  });

  it('compte une fois chaque ligne du squelette', () => {
    const lignes = lignesDepuisCodes(['000', '001', '100', '990', '995', '999']);
    const { fichier } = lireAc056(fichierSynthetique(lignes));
    expect(compterRattachements(fichier)).toEqual([1, 1, 1, 1, 1, 1]);
  });

  it('renvoie 0 pour une entité unique en double : la dernière gagne', () => {
    const lignes = lignesDepuisCodes(['000', '001', '100', '110', '110', '990', '995', '999']);
    const { fichier } = lireAc056(fichierSynthetique(lignes));
    expect(compterRattachements(fichier)).toEqual([1, 1, 1, 0, 1, 1, 1, 1]);
  });

  it('renvoie 0 pour une fille sans parent', () => {
    const { fichier } = lireAc056(fichierSynthetique(lignesDepuisCodes(['000', '405', '999'])));
    expect(compterRattachements(fichier)).toEqual([1, 0, 1]);
  });

  it('renvoie 0 pour une ligne de code inconnu', () => {
    const { fichier } = lireAc056(fichierSynthetique(lignesDepuisCodes(['000', null, '999'])));
    expect(compterRattachements(fichier)).toEqual([1, 0, 1]);
  });

  it('renvoie un tableau vide sans ligne', () => {
    expect(compterRattachements(lireAc056(new Uint8Array()).fichier)).toEqual([]);
  });

  it('compte une fois chaque ligne d un rejet MSP complet', () => {
    const lignes = lignesRejet();
    const { fichier } = lireAc056(fichierSynthetique(lignes), 'rejet');
    const comptes = compterRattachements(fichier);
    expect(comptes).toHaveLength(138);
    expect(comptes.every((compte) => compte === 1)).toBe(true);
  });

  it('gère un dossier de rejet sans 001 (e001 à null) : chaque autre ligne compte une fois', () => {
    const lignes = ['100', '990', '995', '000', '999'].map((code) =>
      ligneRejetSynthetique(code as CodeEntite, code === '000' || code === '999' ? 0 : 1),
    );
    const { fichier } = lireAc056(fichierSynthetique(lignes), 'rejet');
    expect(fichier.dossiers[0]?.e001).toBeNull();
    expect(compterRattachements(fichier)).toEqual([1, 1, 1, 1, 1]);
  });

  it('compte 0 pour une 001 en double dans un rejet : la dernière gagne', () => {
    const lignes = [
      ligneRejetSynthetique('100', 1),
      ligneRejetSynthetique('990', 1),
      ligneRejetSynthetique('995', 1),
      ligneRejetSynthetique('001', 1),
      ligneRejetSynthetique('001', 1),
    ];
    const { fichier } = lireAc056(fichierSynthetique(lignes), 'rejet');
    expect(compterRattachements(fichier)).toEqual([1, 1, 1, 0, 1]);
  });

  it('rattache la 001 qui suit la 995 d un rejet (e001 = ligne 3)', () => {
    const lignes = ['100', '990', '995', '001', '000', '999'].map((code) =>
      ligneRejetSynthetique(code as CodeEntite, code === '000' || code === '999' ? 0 : 1),
    );
    const { fichier } = lireAc056(fichierSynthetique(lignes), 'rejet');
    expect(fichier.dossiers[0]?.e001).toBe(3);
    expect(compterRattachements(fichier)).toEqual([1, 1, 1, 1, 1, 1]);
  });
});
