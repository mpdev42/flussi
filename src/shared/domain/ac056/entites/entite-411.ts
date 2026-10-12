import { alpha, date, num, zoneNonDecrite } from './champs';
import { entete } from './entete';
import type { DescriptionEntite } from './types';

// Aucun champ affiché : l'onglet est vide dans Lazarus.
export const ENTITE_411: DescriptionEntite = {
  code: '411',
  brute: false,
  champs: [
    ...entete(),
    alpha('indicActionAttestation', 26, 1, { trim: true }),
    alpha('typeAttestationAcs', 27, 5),
    date('dateDebutAttestationAcs', 32, 8, { trim: true }),
    date('dateFinAttestationAcs', 40, 8, { trim: true }),
    num('montantAideAccordee', 48, 16),
    zoneNonDecrite(64),
  ],
};
