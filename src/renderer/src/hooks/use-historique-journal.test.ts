import { describe, expect, it } from 'vitest';
import { fusionnerAnnees, periodeCourante } from './use-historique-journal';

describe('fusionnerAnnees', () => {
  it('ajoute l’année en cours à une liste vide', () => {
    expect(fusionnerAnnees([], '2026')).toEqual(['2026']);
  });

  it('ne duplique pas l’année en cours déjà présente', () => {
    expect(fusionnerAnnees(['2025', '2026'], '2026')).toEqual(['2025', '2026']);
  });

  it('range les années de la plus ancienne à la plus récente', () => {
    expect(fusionnerAnnees(['2026', '2024'], '2025')).toEqual(['2024', '2025', '2026']);
  });

  it('place l’année en cours en dernier si elle est la plus récente', () => {
    expect(fusionnerAnnees(['2024', '2025'], '2026')).toEqual(['2024', '2025', '2026']);
  });

  it('supprime les doublons du journal', () => {
    expect(fusionnerAnnees(['2024', '2024'], '2026')).toEqual(['2024', '2026']);
  });
});

describe('periodeCourante', () => {
  it('donne l’année et le mois sur 2 chiffres (heure locale)', () => {
    expect(periodeCourante(new Date(2026, 9, 14, 9, 15, 0))).toEqual({
      annee: '2026',
      mois: '10',
    });
  });

  it('complète le mois par un zéro', () => {
    expect(periodeCourante(new Date(2026, 0, 31, 23, 59, 59))).toEqual({
      annee: '2026',
      mois: '01',
    });
  });

  it('donne décembre pour le mois 12', () => {
    expect(periodeCourante(new Date(2025, 11, 1)).mois).toBe('12');
  });

  it('utilise la date du jour par défaut', () => {
    const maintenant = new Date();
    expect(periodeCourante().annee).toBe(String(maintenant.getFullYear()));
  });
});
