import { describe, expect, it } from 'vitest';
import {
  LONGUEUR_MAX_MOT_DE_PASSE,
  DESIGNATIONS_DOSSIER,
  DESIGNATIONS_SECRET,
  DOSSIERS_TRAVAIL,
  MOTS_DE_PASSE,
  SECRETS_TECHNIQUES,
  dossierTravailSchema,
  enregistrementSecretsSchema,
} from './parametres';
import { configurationSchema } from './config';

describe('listes du module Parametres', () => {
  it('DOSSIERS_TRAVAIL couvre exactement les clés de Configuration.dossiers', () => {
    const cles = Object.keys(configurationSchema.shape.dossiers.shape);
    expect([...DOSSIERS_TRAVAIL].sort()).toEqual(cles.sort());
  });

  it('DESIGNATIONS_DOSSIER couvre exactement DOSSIERS_TRAVAIL', () => {
    expect(Object.keys(DESIGNATIONS_DOSSIER).sort()).toEqual([...DOSSIERS_TRAVAIL].sort());
    for (const designation of Object.values(DESIGNATIONS_DOSSIER)) {
      expect(designation).not.toBe('');
    }
  });

  it('DESIGNATIONS_SECRET couvre exactement SECRETS_TECHNIQUES', () => {
    expect(Object.keys(DESIGNATIONS_SECRET).sort()).toEqual([...SECRETS_TECHNIQUES].sort());
    for (const designation of Object.values(DESIGNATIONS_SECRET)) {
      expect(designation).not.toBe('');
    }
  });

  it('les désignations de secrets sont distinctes', () => {
    const designations = Object.values(DESIGNATIONS_SECRET);
    expect(new Set(designations).size).toBe(designations.length);
  });

  it('MOTS_DE_PASSE est inclus dans SECRETS_TECHNIQUES, sans la clé privée', () => {
    for (const cle of MOTS_DE_PASSE) expect(SECRETS_TECHNIQUES).toContain(cle);
    expect(MOTS_DE_PASSE).not.toContain('msp-sftp-cle-privee');
    expect(SECRETS_TECHNIQUES).toContain('msp-sftp-cle-privee');
  });

  it('les clés de motsDePasse du schéma sont exactement MOTS_DE_PASSE', () => {
    const accepte = Object.fromEntries(MOTS_DE_PASSE.map((cle) => [cle, 'valeur-fictive']));
    expect(
      enregistrementSecretsSchema.safeParse({ motsDePasse: accepte, cle: false }).success,
    ).toBe(true);
    for (const cle of SECRETS_TECHNIQUES.filter((s) => !MOTS_DE_PASSE.includes(s as never))) {
      expect(
        enregistrementSecretsSchema.safeParse({ motsDePasse: { [cle]: 'x' }, cle: false }).success,
      ).toBe(false);
    }
  });
});

describe('dossierTravailSchema', () => {
  it.each(DOSSIERS_TRAVAIL)('accepte %s', (dossier) => {
    expect(dossierTravailSchema.parse(dossier)).toBe(dossier);
  });

  it.each(['IN', '..', 'C:\\Windows', ''])('refuse %j', (valeur) => {
    expect(dossierTravailSchema.safeParse(valeur).success).toBe(false);
  });
});

describe('enregistrementSecretsSchema', () => {
  const IGA = 'iga-ftp-mot-de-passe';
  const MSP = 'msp-sftp-mot-de-passe';
  const valide = { motsDePasse: { [IGA]: 'valeur-fictive' }, cle: false };

  it.each([
    ['un mot de passe', valide],
    ['l’autre mot de passe', { motsDePasse: { [MSP]: 'valeur-fictive' }, cle: false }],
    ['deux mots de passe', { motsDePasse: { [IGA]: 'a', [MSP]: 'b' }, cle: false }],
    ['la clé seule', { motsDePasse: {}, cle: true }],
    ['un mot de passe et la clé', { motsDePasse: { [IGA]: 'a' }, cle: true }],
    ['deux mots de passe et la clé', { motsDePasse: { [IGA]: 'a', [MSP]: 'b' }, cle: true }],
    ['espaces et accents', { motsDePasse: { [IGA]: ' é à ' }, cle: false }],
  ])('accepte : %s', (_cas, entree) => {
    const analyse = enregistrementSecretsSchema.safeParse(entree);
    expect(analyse.success).toBe(true);
    if (analyse.success) expect(analyse.data).toEqual(entree);
  });

  it('accepte de 1 à 256 caractères', () => {
    expect(LONGUEUR_MAX_MOT_DE_PASSE).toBe(256);
    for (const longueur of [1, 256]) {
      const demande = { motsDePasse: { [IGA]: 'a'.repeat(longueur) }, cle: false };
      expect(enregistrementSecretsSchema.safeParse(demande).success).toBe(true);
    }
  });

  it.each([
    ['non-objet', 'texte'],
    ['nombre', 42],
    ['null', null],
    ['indéfini', undefined],
    ['tableau', [valide]],
    ['objet vide', {}],
    ['motsDePasse absent', { cle: true }],
    ['motsDePasse null', { motsDePasse: null, cle: true }],
    ['motsDePasse tableau', { motsDePasse: [], cle: true }],
    ['cle absent', { motsDePasse: { [IGA]: 'a' } }],
    ['cle chaîne', { motsDePasse: { [IGA]: 'a' }, cle: 'true' }],
    ['cle nombre', { motsDePasse: { [IGA]: 'a' }, cle: 1 }],
    ['aucun changement', { motsDePasse: {}, cle: false }],
    ['mot de passe indéfini seul', { motsDePasse: { [IGA]: undefined }, cle: false }],
    ['clé inconnue', { motsDePasse: { autre: 'a' }, cle: false }],
    ['clé privée dans motsDePasse', { motsDePasse: { 'msp-sftp-cle-privee': 'a' }, cle: false }],
    ['valeur vide', { motsDePasse: { [IGA]: '' }, cle: true }],
    ['257 caractères', { motsDePasse: { [IGA]: 'a'.repeat(257) }, cle: false }],
    ['saut de ligne', { motsDePasse: { [IGA]: 'a\nb' }, cle: false }],
    ['caractère nul', { motsDePasse: { [IGA]: 'a\u0000' }, cle: false }],
    ['tabulation', { motsDePasse: { [IGA]: 'a\tb' }, cle: false }],
    ['valeur nombre', { motsDePasse: { [IGA]: 1234 }, cle: false }],
    ['valeur null', { motsDePasse: { [IGA]: null }, cle: false }],
    ['valeur objet', { motsDePasse: { [IGA]: { a: 1 } }, cle: false }],
    ['propriété en plus à la racine', { ...valide, extra: 1 }],
    ['propriété en plus dans motsDePasse', { motsDePasse: { [IGA]: 'a', extra: 1 }, cle: false }],
    ['ancienne forme { cle, valeur }', { cle: IGA, valeur: 'a' }],
  ])('refuse : %s', (_cas, entree) => {
    expect(enregistrementSecretsSchema.safeParse(entree).success).toBe(false);
  });
});
