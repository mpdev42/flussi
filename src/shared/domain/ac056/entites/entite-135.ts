import { alpha, num, zoneNonDecrite } from './champs';
import { entete } from './entete';
import type { DescriptionEntite } from './types';

export const ENTITE_135: DescriptionEntite = {
  code: '135',
  brute: false,
  champs: [
    // Lazarus écrit numEvt avec AddCharR('0', …, 2), sans effet : la valeur lue fait 3 octets
    // et AddCharR ne tronque pas.
    ...entete(),
    num('rangPersonne', 26, 2, { affiche: true, libelle: 'Rang de la personne', maxLength: 2 }),
    alpha('refExterne', 28, 20),
    num('numPersSouscriptrice', 48, 8),
    num('idfsysPersSouscr', 56, 8),
    num('facettePersSouscr', 64, 1),
    zoneNonDecrite(65),
  ],
};
