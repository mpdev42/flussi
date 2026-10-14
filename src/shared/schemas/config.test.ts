import { describe, expect, it } from 'vitest';
import {
  cheminDossierSchema,
  configurationSchema,
  contientCaractereControle,
  estCheminDossier,
} from './config';

describe('contientCaractereControle', () => {
  it.each([
    ['saut de ligne', '\n'],
    ['tabulation', '\t'],
    ['caractère nul', '\0'],
  ])('détecte %s en début, au milieu et en fin de chaîne', (_nom, caractere) => {
    expect(contientCaractereControle(`${caractere}abc`)).toBe(true);
    expect(contientCaractereControle(`ab${caractere}c`)).toBe(true);
    expect(contientCaractereControle(`abc${caractere}`)).toBe(true);
  });

  it('détecte U+001F, dernier caractère de contrôle', () => {
    expect(contientCaractereControle('a\u001fb')).toBe(true);
  });

  it.each(['', 'C:\\Dev\\nouveau', 'P:\\Mon dossier\\é', ' '])('ignore %j', (valeur) => {
    expect(contientCaractereControle(valeur)).toBe(false);
  });
});

describe('estCheminDossier', () => {
  it('refuse un chemin contenant un saut de ligne', () => {
    expect(estCheminDossier('C:\\Dev\nnouveau')).toBe(false);
  });

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
    dossiers: { travail: 'D:\\a', in: 'D:\\a\\IN', out: 'D:\\a\\OUT', journal: 'D:\\a\\Journal' },
  };

  it('accepte une configuration valide, racine comprise', () => {
    expect(configurationSchema.safeParse(valide).success).toBe(true);
  });

  it('refuse une racine nulle ou absente', () => {
    expect(
      configurationSchema.safeParse({ ...valide, dossiers: { ...valide.dossiers, travail: null } })
        .success,
    ).toBe(false);
    const { in: dossierIn, out, journal } = valide.dossiers;
    expect(
      configurationSchema.safeParse({ ...valide, dossiers: { in: dossierIn, out, journal } })
        .success,
    ).toBe(false);
  });

  it('refuse une racine relative', () => {
    expect(
      configurationSchema.safeParse({
        ...valide,
        dossiers: { ...valide.dossiers, travail: 'relatif' },
      }).success,
    ).toBe(false);
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
