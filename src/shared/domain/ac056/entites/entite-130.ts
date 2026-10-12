import { alpha, date, zoneNonDecrite } from './champs';
import { entete } from './entete';
import { PAYS } from './valeurs/pays';
import type { DescriptionEntite } from './types';

export const ENTITE_130: DescriptionEntite = {
  code: '130',
  brute: false,
  champs: [
    ...entete(),
    alpha('codeBanque', 26, 10, { trim: true, affiche: true, maxLength: 10 }),
    alpha('codeGuichet', 36, 10, { trim: true, affiche: true, maxLength: 10 }),
    alpha('numeroCompte', 46, 20, { trim: true, affiche: true, maxLength: 20 }),
    alpha('cleControle', 66, 2, { trim: true, affiche: true, maxLength: 2 }),
    alpha('cleIban', 68, 4),
    alpha('titulaireCompte', 72, 50, { trim: true, affiche: true, maxLength: 50 }),
    alpha('codePays', 122, 3, { trim: true, affiche: true, valeursAutorisees: PAYS }),
    alpha('codeDevise', 125, 3, {
      trim: true,
      affiche: true,
      valeursAutorisees: [{ code: 'EUR', libelle: 'Euro' }],
    }),
    date('dateFinEffet', 128, 8),
    alpha('codePaysIso2', 136, 2),
    alpha('codeBic', 138, 14),
    alpha('codeIban', 152, 30),
    alpha('indicInitRib', 182, 1),
    zoneNonDecrite(183),
  ],
};
