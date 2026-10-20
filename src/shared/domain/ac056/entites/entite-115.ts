import { alpha, num, zoneNonDecrite } from './champs';
import { entete } from './entete';
import { CIVILITES } from './valeurs/civilites';
import type { DescriptionEntite } from './types';

export const ENTITE_115: DescriptionEntite = {
  code: '115',
  brute: false,
  champs: [
    ...entete(),
    num('rangPersonne', 26, 2, { affiche: true, libelle: 'Rang de la personne', maxLength: 2 }),
    alpha('refExterne', 28, 20),
    alpha('codeCivilite', 48, 6, {
      trim: true,
      affiche: true,
      libelle: 'Code civilité',
      valeursAutorisees: CIVILITES,
    }),
    alpha('codeTitre', 54, 6),
    alpha('nom', 60, 50, {
      trim: true,
      affiche: true,
      libelle: 'Nom',
      modifiable: true,
      maxLength: 50,
    }),
    alpha('prenom1', 110, 20, {
      trim: true,
      affiche: true,
      libelle: 'Prénom',
      modifiable: true,
      maxLength: 20,
    }),
    alpha('prenom2', 130, 20),
    alpha('prenom3', 150, 20),
    alpha('prenom4', 170, 20),
    alpha('numInsee', 190, 13, {
      trim: true,
      affiche: true,
      libelle: 'N° INSEE',
      modifiable: true,
      maxLength: 13,
    }),
    num('idfsysPersPrinc', 203, 8),
    num('facettePersPrinc', 211, 1),
    num('idfsysNomPersPrinc', 212, 8),
    alpha('typeLienNomPersPrinc', 220, 1),
    alpha('nomJeuneFille', 221, 50),
    zoneNonDecrite(271),
  ],
};
