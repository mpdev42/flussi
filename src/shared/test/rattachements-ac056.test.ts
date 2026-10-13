import { describe, expect, it } from 'vitest';
import { lireAc056 } from '@shared/domain/ac056/lecteur';
import { fichierSynthetique, lignesCompletes, lignesDepuisCodes } from './ac056-synthetique';
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
});
