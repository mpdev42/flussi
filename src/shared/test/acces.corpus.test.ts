// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { decrireCorpus, listerCorpus, lireCorpus } from './corpus';

// Aucune assertion sur un contenu : uniquement des noms, des longueurs et des compteurs.
decrireCorpus('Accès au corpus AC056', () => {
  describe('IN', () => {
    it('contient au moins un fichier .txt', () => {
      const fichiers = listerCorpus('IN').filter((nom) => nom.endsWith('.txt'));
      expect(fichiers.length).toBeGreaterThan(0);
    });

    it('contient uniquement des fichiers lisibles et non vides', () => {
      const vides = listerCorpus('IN')
        .filter((nom) => nom.endsWith('.txt'))
        .filter((nom) => lireCorpus('IN', nom).length === 0);
      expect(vides).toHaveLength(0);
    });
  });

  describe('OUT', () => {
    it('contient au moins un fichier de rejet AC056COUR_REJ_*', () => {
      const rejets = listerCorpus('OUT').filter((nom) => nom.startsWith('AC056COUR_REJ_'));
      expect(rejets.length).toBeGreaterThan(0);
    });

    it('contient uniquement des rejets lisibles et non vides', () => {
      const vides = listerCorpus('OUT')
        .filter((nom) => nom.startsWith('AC056COUR_REJ_'))
        .filter((nom) => lireCorpus('OUT', nom).length === 0);
      expect(vides).toHaveLength(0);
    });
  });
});
