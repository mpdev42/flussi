import { alpha, date, num, zoneNonDecrite } from './champs';
import { entete } from './entete';
import type { DescriptionEntite } from './types';

export const ENTITE_155: DescriptionEntite = {
  code: '155',
  brute: false,
  champs: [
    ...entete(),
    num('rangPersonne', 26, 2, { affiche: true, libelle: 'Rang de la personne', maxLength: 2 }),
    alpha('refExterne', 28, 20),
    alpha('codePart', 48, 3),
    alpha('qualitePayeur', 51, 1),
    alpha('monnaie', 52, 3),
    alpha('mode', 55, 2),
    alpha('frequenceReglement', 57, 2),
    alpha('frequenceAvisEcheance', 59, 2),
    alpha('typeTerme', 61, 2),
    alpha('echancier', 63, 2),
    date('debutPrelevement', 65, 8, {
      trim: true,
      affiche: true,
      libelle: 'Date début prélèvement',
    }),
    date('finPrelevement', 73, 8),
    alpha('motifFinPrelevement', 81, 2),
    alpha('attentionDe', 83, 30),
    alpha('typePayeur', 113, 1),
    num('idfsysPersSouscr', 114, 8),
    num('idfsysRelationPersSouscr', 122, 8),
    num('facettePersSouscr', 130, 1),
    alpha('eService', 131, 1),
    alpha('reportDonprc', 132, 1),
    alpha('indicPresenceDonneesMandat', 133, 1),
    date('dateSignatureMandat', 134, 8),
    alpha('motifClotureMandant', 142, 5),
    date('dateAnnulationMandat', 147, 8),
    alpha('referenceUniqueMandat', 155, 35),
    zoneNonDecrite(190),
  ],
};
