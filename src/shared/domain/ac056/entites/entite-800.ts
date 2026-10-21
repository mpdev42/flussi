import { alpha, num, zoneNonDecrite } from './champs';
import { entete, RANG_BENEFICIAIRE, RANG_MODIFIABLE } from './entete';
import type { DescriptionEntite } from './types';

export const ENTITE_800: DescriptionEntite = {
  code: '800',
  brute: false,
  champs: [
    ...entete(RANG_BENEFICIAIRE),
    // Trim + bourrage '0' : Lazarus réécrit un rang blanc en zéros ; Flussi recopie la ligne telle
    // quelle tant que le champ n'est pas corrigé (décision 4 de l'item 3 de la v0.3.0).
    num('rangPersonne', 26, 2, { ...RANG_MODIFIABLE, trim: true, libelle: 'Rang personne' }),
    alpha('indicActionRefExterne', 28, 1),
    num('facetteRefExterne', 29, 1),
    alpha('codeSystemeExterne', 30, 10),
    alpha('refExterne', 40, 30, {
      trim: true,
      affiche: true,
      libelle: 'Référence externe',
      maxLength: 30,
    }),
    alpha('motCle1', 70, 30),
    alpha('valeur2', 100, 30),
    alpha('motCle2', 130, 30),
    alpha('valeur3', 160, 30),
    alpha('motCle3', 190, 30),
    alpha('valeur4', 220, 30),
    alpha('motCle4', 250, 30),
    alpha('valeur5', 280, 30),
    alpha('motCle5', 310, 30),
    zoneNonDecrite(340),
  ],
};
