// Entités conservées comme ligne brute : en-tête puis données non interprétées.
// - La 001 lit `numDossier` (10/8) dans Lazarus (`AjouterEntite001`).
// - Pour 000, 990, 995 et 999, Lazarus ne lit que le code d'entité (23 à 25) : le reste de
//   l'en-tête est indicatif.
// Rien n'est affiché ni modifiable.
import { alpha } from './champs';
import { entete } from './entete';
import { LONGUEUR_LIGNE, type CodeEntite, type DescriptionEntite } from './types';

function entiteBrute(code: CodeEntite): DescriptionEntite {
  return {
    code,
    brute: true,
    champs: [...entete(), alpha('donnees', 26, LONGUEUR_LIGNE - 25)],
  };
}

export const ENTITE_000: DescriptionEntite = entiteBrute('000');
export const ENTITE_001: DescriptionEntite = entiteBrute('001');
export const ENTITE_990: DescriptionEntite = entiteBrute('990');
export const ENTITE_995: DescriptionEntite = entiteBrute('995');
export const ENTITE_999: DescriptionEntite = entiteBrute('999');
