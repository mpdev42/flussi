import { alpha, zoneNonDecrite } from './champs';
import { entete, RANG_BENEFICIAIRE } from './entete';
import type { DescriptionEntite } from './types';

export const ENTITE_490: DescriptionEntite = {
  code: '490',
  brute: false,
  champs: [
    ...entete(RANG_BENEFICIAIRE),
    alpha('code', 26, 6, { trim: true, affiche: true, libelle: 'Code', maxLength: 6 }),
    // maxLength 9 pour une longueur de 20 : écart de Lazarus conservé tel quel.
    alpha('valeur', 32, 20, { trim: true, affiche: true, libelle: 'Valeur', maxLength: 9 }),
    zoneNonDecrite(52),
  ],
};
