import { describe, expect, it } from 'vitest';
import { PREFIXE_FICHIER_REJET, provenanceDepuisNom } from '@shared/domain/ac056/provenance';
import { decrireCorpus, listerCorpus, lireCorpus, MINIMUM_FICHIERS_CORPUS } from './corpus';

// Aucune assertion sur un contenu : uniquement des noms, des longueurs et des compteurs.
decrireCorpus('Accès au corpus AC056', () => {
  describe('IN', () => {
    it(`contient au moins ${MINIMUM_FICHIERS_CORPUS.IN} fichiers .txt`, () => {
      const fichiers = listerCorpus('IN').filter((nom) => nom.endsWith('.txt'));
      expect(fichiers.length).toBeGreaterThanOrEqual(MINIMUM_FICHIERS_CORPUS.IN);
    });

    it('contient uniquement des fichiers lisibles et non vides', () => {
      const vides = listerCorpus('IN')
        .filter((nom) => nom.endsWith('.txt'))
        .filter((nom) => lireCorpus('IN', nom).length === 0);
      expect(vides).toHaveLength(0);
    });
  });

  describe('OUT', () => {
    it(`contient au moins ${MINIMUM_FICHIERS_CORPUS.OUT} fichiers de rejet ${PREFIXE_FICHIER_REJET}*`, () => {
      const rejets = listerCorpus('OUT').filter((nom) => provenanceDepuisNom(nom) === 'rejet');
      expect(rejets.length).toBeGreaterThanOrEqual(MINIMUM_FICHIERS_CORPUS.OUT);
    });

    it('contient uniquement des rejets lisibles et non vides', () => {
      const vides = listerCorpus('OUT')
        .filter((nom) => provenanceDepuisNom(nom) === 'rejet')
        .filter((nom) => lireCorpus('OUT', nom).length === 0);
      expect(vides).toHaveLength(0);
    });
  });
});
