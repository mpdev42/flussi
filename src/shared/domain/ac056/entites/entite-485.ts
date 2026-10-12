import { alpha, zoneNonDecrite } from './champs';
import { entete, RANG_MODIFIABLE } from './entete';
import type { DescriptionEntite } from './types';

export const ENTITE_485: DescriptionEntite = {
  code: '485',
  brute: false,
  champs: [
    ...entete(RANG_MODIFIABLE),
    alpha('code', 26, 6, { trim: true, affiche: true, maxLength: 6 }),
    // maxLength 9 pour une longueur de 10 : écart de Lazarus conservé tel quel.
    alpha('valeur', 32, 10, { trim: true, affiche: true, maxLength: 9 }),
    zoneNonDecrite(42),
  ],
};
