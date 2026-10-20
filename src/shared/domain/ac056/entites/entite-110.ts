import { alpha, date, num, zoneNonDecrite } from './champs';
import { entete } from './entete';
import type { DescriptionEntite } from './types';

export const ENTITE_110: DescriptionEntite = {
  code: '110',
  brute: false,
  champs: [
    ...entete(),
    date('dateEffet', 26, 8, {
      trim: true,
      affiche: true,
      libelle: "Date d'effet 1e souscription",
    }),
    date('dateEffetDerResil', 34, 8),
    date('ancienContrat', 42, 8, { affiche: true, libelle: 'Date ancienneté contrat' }),
    alpha('origineContrat', 50, 2),
    num('indicCmu', 52, 1),
    // Lazarus l'écrit avec AddCharR(' ', …, 1), sans effet : la valeur lue fait 3 octets et
    // AddCharR ne tronque pas.
    alpha('monnaieGestion', 53, 3),
    num('indicAbrogation', 56, 1),
    date('dateDebutSurveillance', 57, 8),
    alpha('motif', 65, 5),
    num('indicAssoFrais', 70, 1),
    alpha('typeAssociation', 71, 6),
    num('indicLoiMadelin', 77, 1),
    num('debutExerciceLoiMad', 78, 4),
    num('indicQuittanceConfiee', 82, 1),
    alpha('typeQuittanceConfiee', 83, 1),
    num('indicTemporaire', 84, 1),
    num('duree', 85, 4),
    num('indicNanti', 89, 1),
    num('indicNoteCouverture', 90, 1),
    num('indicReservesMedic', 91, 1),
    num('indicReservesAutres', 92, 1),
    alpha('motifResil', 93, 5),
    alpha('modaliteResil', 98, 5),
    alpha('societeConcurrente', 103, 9),
    alpha('indicPresenceDonnees', 112, 1),
    alpha('mecanisme1', 113, 1),
    alpha('mecanisme2', 114, 1),
    date('dateAncienDispositif', 115, 8),
    zoneNonDecrite(123),
  ],
};
