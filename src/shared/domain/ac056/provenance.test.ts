// Provenance d'après le nom : parité `s_fichier.StartsWith(C_S_PREFIXE_FICHIER_REJET)`
// (`fmain.pas:2706-2707`), sensible à la casse, sur le nom seul.
import { describe, expect, it } from 'vitest';
import { PREFIXE_FICHIER_REJET, provenanceDepuisNom } from './provenance';

describe('provenanceDepuisNom', () => {
  it('a pour préfixe de rejet AC056COUR_REJ_', () => {
    expect(PREFIXE_FICHIER_REJET).toBe('AC056COUR_REJ_');
  });

  it.each([
    'AC056COUR_REJ_20261019.txt',
    'AC056COUR_REJ_',
    'AC056COUR_REJ_sans-extension',
    'AC056COUR_REJ_X.TXT',
  ])('reconnaît un rejet : %s', (nom) => {
    expect(provenanceDepuisNom(nom)).toBe('rejet');
  });

  it.each([
    ['nom VEOS', 'AC056COUR_20261019.txt'],
    ['préfixe en minuscules', 'ac056cour_rej_20261019.txt'],
    ['préfixe en casse mixte', 'AC056Cour_REJ_20261019.txt'],
    ['préfixe incomplet', 'AC056COUR_REJ.txt'],
    ['préfixe au milieu du nom', 'copie AC056COUR_REJ_20261019.txt'],
    ['espace en tête', ' AC056COUR_REJ_20261019.txt'],
    ['nom vide', ''],
  ])('renvoie veos pour un %s', (_cas, nom) => {
    expect(provenanceDepuisNom(nom)).toBe('veos');
  });
});
