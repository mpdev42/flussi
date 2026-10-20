import { alpha, num, zoneNonDecrite } from './champs';
import { entete } from './entete';
import { DEPARTEMENTS } from './valeurs/departements';
import { NATURES_VOIE } from './valeurs/natures-voie';
import { PAYS } from './valeurs/pays';
import type { DescriptionEntite } from './types';

export const ENTITE_120: DescriptionEntite = {
  code: '120',
  brute: false,
  champs: [
    ...entete(),
    alpha('pointRemiseCourrier', 26, 50),
    alpha('complementGeographique', 76, 50, {
      trim: true,
      affiche: true,
      libelle: 'Complément géographique',
      modifiable: true,
      maxLength: 50,
    }),
    alpha('numeroVoie', 126, 9, {
      trim: true,
      affiche: true,
      libelle: 'Numéro de la voie',
      modifiable: true,
      maxLength: 9,
    }),
    alpha('codeBtq', 135, 2, {
      trim: true,
      affiche: true,
      libelle: 'Bis, ter, quater',
      valeursAutorisees: [
        { code: 'B', libelle: 'Bis' },
        { code: 'T', libelle: 'Ter' },
        { code: 'Q', libelle: 'Quater' },
        { code: 'C', libelle: 'Quinquies' },
      ],
    }),
    alpha('codeNatureVoie', 137, 5, {
      trim: true,
      affiche: true,
      libelle: 'Nature de la voie',
      valeursAutorisees: NATURES_VOIE,
    }),
    alpha('libelleVoie', 142, 50, {
      trim: true,
      affiche: true,
      libelle: 'Libellé de la voie',
      modifiable: true,
      maxLength: 50,
    }),
    alpha('mentionParticuliereDistribution', 192, 50),
    alpha('lieuDit', 242, 50, {
      trim: true,
      affiche: true,
      libelle: 'Lieu-dit',
      modifiable: true,
      maxLength: 50,
    }),
    // maxLength 5 pour une longueur de 10 : écart repris tel quel de l'écran Lazarus.
    alpha('codePostalLocalite', 292, 10, {
      trim: true,
      affiche: true,
      libelle: 'Code postal',
      modifiable: true,
      maxLength: 5,
    }),
    alpha('libelleLocalite', 302, 50, {
      trim: true,
      affiche: true,
      libelle: 'Ville',
      modifiable: true,
      maxLength: 50,
    }),
    num('codeCedex', 352, 5),
    alpha('nomBureauCedex', 357, 26),
    alpha('codeDepartement', 383, 3, {
      trim: true,
      affiche: true,
      libelle: 'Département',
      valeursAutorisees: DEPARTEMENTS,
    }),
    alpha('codePays', 386, 3, {
      trim: true,
      affiche: true,
      libelle: 'Pays',
      valeursAutorisees: PAYS,
    }),
    alpha('codeTypeAdresse', 389, 4, {
      trim: true,
      affiche: true,
      libelle: "Type d'adresse",
      valeursAutorisees: [
        { code: 'DOM', libelle: 'Adresse domicile' },
        { code: 'PROF', libelle: 'Adresse professionnelle' },
      ],
    }),
    num('nbRetoursNpai', 393, 2),
    num('adresseListeRobinson', 395, 1),
    num('interdictionEnvoiPub', 396, 1),
    num('idfsysRelationPersPrinc', 397, 8),
    num('idfsysAdressePersPrinc', 405, 8),
    alpha('typeLienAdressePersPrinc', 413, 1),
    zoneNonDecrite(414),
  ],
};
