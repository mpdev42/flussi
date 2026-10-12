import { alpha, num, zoneNonDecrite } from './champs';
import { entete, RANG_MODIFIABLE } from './entete';
import type { DescriptionEntite } from './types';
import { CIVILITES } from './valeurs/civilites';

export const ENTITE_405: DescriptionEntite = {
  code: '405',
  brute: false,
  champs: [
    ...entete(RANG_MODIFIABLE),
    alpha('codeCivilite', 26, 6, { trim: true, affiche: true, valeursAutorisees: CIVILITES }),
    alpha('codeTitre', 32, 6),
    alpha('nom', 38, 50, { trim: true, affiche: true, modifiable: true, maxLength: 50 }),
    alpha('prenom1', 88, 20, { trim: true, affiche: true, modifiable: true, maxLength: 20 }),
    alpha('prenom2', 108, 20),
    alpha('prenom3', 128, 20),
    alpha('prenom4', 148, 20),
    alpha('numInsee', 168, 13, { trim: true, affiche: true, modifiable: true, maxLength: 13 }),
    alpha('nomJeuneFille', 181, 50, {
      trim: true,
      affiche: true,
      modifiable: true,
      maxLength: 50,
    }),
    num('idfsysPersPrinc', 231, 8),
    num('idfsysNomPersPrinc', 239, 8),
    alpha('typeLien', 247, 1),
    zoneNonDecrite(248),
  ],
};
