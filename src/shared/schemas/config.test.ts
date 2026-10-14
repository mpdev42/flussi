import { describe, expect, it } from 'vitest';
import { cheminDossierSchema, configurationSchema, estCheminDossier } from './config';

describe('estCheminDossier', () => {
  it.each([
    'C:\\x',
    'd:\\Travail\\Flussi',
    'P:\\',
    '\\\\serveur\\partage',
    '\\\\serveur\\partage\\x',
  ])('accepte %j', (chemin) => {
    expect(estCheminDossier(chemin)).toBe(true);
  });

  it.each([
    '',
    'RECETTE',
    'C:/x',
    'C:x',
    '\\\\serveur',
    '\\\\serveur\\',
    '.\\x',
    '/tmp/x',
    ' C:\\x',
  ])('refuse %j', (chemin) => {
    expect(estCheminDossier(chemin)).toBe(false);
  });
});

describe('cheminDossierSchema', () => {
  it('renvoie un message lisible pour un chemin relatif', () => {
    const resultat = cheminDossierSchema.safeParse('relatif');
    expect(resultat.success).toBe(false);
    expect(resultat.error?.issues[0]?.message).toBe('chemin absolu Windows attendu');
  });
});

describe('configurationSchema', () => {
  const valide = {
    mode: 'recette',
    dossiers: { travail: null, in: 'D:\\a', out: 'D:\\b', journal: 'D:\\c' },
  };

  it('accepte une configuration valide, racine nulle comprise', () => {
    expect(configurationSchema.safeParse(valide).success).toBe(true);
  });

  it('refuse un mode inconnu', () => {
    expect(configurationSchema.safeParse({ ...valide, mode: 'Prod' }).success).toBe(false);
  });

  it('refuse une clé en trop (aucun secret ne passe)', () => {
    expect(configurationSchema.safeParse({ ...valide, motDePasse: 'x' }).success).toBe(false);
    expect(
      configurationSchema.safeParse({
        ...valide,
        dossiers: { ...valide.dossiers, extra: 'D:\\x' },
      }).success,
    ).toBe(false);
  });

  it('refuse un dossier relatif', () => {
    expect(
      configurationSchema.safeParse({ ...valide, dossiers: { ...valide.dossiers, in: 'IN' } })
        .success,
    ).toBe(false);
  });
});
