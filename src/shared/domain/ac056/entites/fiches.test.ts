import { describe, expect, it } from 'vitest';
import {
  CODES_ENTITE,
  CODES_FICHE,
  ENTITES,
  FICHES,
  champsAffiches,
  type CodeEntite,
} from './index';

describe('FICHES', () => {
  it('couvre exactement les entités non brutes', () => {
    const nonBrutes = CODES_ENTITE.filter((code) => !ENTITES[code].brute);
    expect([...CODES_FICHE]).toEqual(nonBrutes);
    expect(Object.keys(FICHES).sort()).toEqual([...CODES_FICHE].sort());
  });

  it.each(CODES_FICHE.map((code) => [code] as const))(
    'fiche %s : exactement les champs affichés de l’entité, sans doublon',
    (code) => {
      const affiches = ENTITES[code].champs.filter((c) => c.affiche).map((c) => c.nom);
      const champs = FICHES[code].champs;
      expect(new Set(champs).size).toBe(champs.length);
      expect([...champs].sort()).toEqual([...affiches].sort());
    },
  );

  it('a un titre non vide pour chaque fiche', () => {
    const sansTitre = CODES_FICHE.filter((code) => FICHES[code].titre.trim() === '');
    expect(sansTitre).toEqual([]);
  });

  it('compte 93 champs affichés en tout, aucun pour la 411', () => {
    expect(CODES_FICHE.flatMap((code) => FICHES[code].champs)).toHaveLength(93);
    expect(FICHES['411'].champs).toEqual([]);
  });

  it('commence la fiche 400 par la date d’ancienneté et donne le titre « Garantie » à la 700', () => {
    expect(FICHES['400'].champs[0]).toBe('dateAnciennete');
    expect(FICHES['700'].titre).toBe('Garantie');
  });

  it('est gelée à tous les niveaux, CODES_FICHE compris', () => {
    expect(Object.isFrozen(FICHES)).toBe(true);
    expect(Object.isFrozen(CODES_FICHE)).toBe(true);
    for (const code of CODES_FICHE) {
      expect(Object.isFrozen(FICHES[code])).toBe(true);
      expect(Object.isFrozen(FICHES[code].champs)).toBe(true);
    }
  });
});

describe('champsAffiches', () => {
  it.each(CODES_FICHE.map((code) => [code] as const))(
    'fiche %s : descriptions de ENTITES, dans l’ordre de FICHES',
    (code) => {
      const descriptions = champsAffiches(code);
      expect(descriptions.map((c) => c.nom)).toEqual(FICHES[code].champs);
      for (const description of descriptions) {
        expect(ENTITES[code as CodeEntite].champs).toContain(description);
        expect(description.affiche).toBe(true);
      }
    },
  );

  it('renvoie une liste gelée, la même à chaque appel', () => {
    expect(champsAffiches('120')).toBe(champsAffiches('120'));
    expect(Object.isFrozen(champsAffiches('120'))).toBe(true);
  });
});
