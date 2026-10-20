import { alpha, num, zoneNonDecrite } from './champs';
import { entete } from './entete';
import type { DescriptionEntite } from './types';

export const ENTITE_180: DescriptionEntite = {
  code: '180',
  brute: false,
  champs: [
    ...entete(),
    num('rangPersonne', 26, 2, { affiche: true, libelle: 'Rang de la personne', maxLength: 2 }),
    alpha('refExterne', 28, 20),
    alpha('modePaiement', 48, 2, {
      trim: true,
      affiche: true,
      libelle: 'Mode de paiement',
      valeursAutorisees: [{ code: 'V', libelle: 'Virement' }],
    }),
    alpha('monnaiePaiement', 50, 5),
    alpha('attentionDe', 55, 30),
    num('idfsysPersDestPresta', 85, 8),
    num('idfsysRelationPersDestPresta', 93, 8),
    num('facettePersDestPresta', 101, 1),
    alpha('indicAlerteRbt', 102, 1),
    alpha('reportDonprc', 103, 1),
    zoneNonDecrite(104),
  ],
};
