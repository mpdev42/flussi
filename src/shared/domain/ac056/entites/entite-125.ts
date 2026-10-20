import { alpha, num, zoneNonDecrite } from './champs';
import { entete } from './entete';
import type { DescriptionEntite } from './types';

export const ENTITE_125: DescriptionEntite = {
  code: '125',
  brute: false,
  champs: [
    ...entete(),
    alpha('codeTypeCoordonnee', 26, 4, {
      trim: true,
      affiche: true,
      libelle: 'Type',
      valeursAutorisees: [
        { code: 'DOM', libelle: 'Domicile' },
        { code: 'MPCP', libelle: 'Mail' },
        { code: 'MOB', libelle: 'Portable' },
        { code: 'PROF', libelle: 'Professionnel' },
      ],
    }),
    alpha('codeNatureCommunication', 30, 4, {
      trim: true,
      affiche: true,
      libelle: 'Nature',
      valeursAutorisees: [
        { code: 'FAX', libelle: 'Fax' },
        { code: 'MAIL', libelle: 'E-mail' },
        { code: 'TELP', libelle: 'Téléphone' },
      ],
    }),
    alpha('valeurCoordonneeCommunication', 34, 50, {
      trim: true,
      affiche: true,
      libelle: 'Valeur',
      modifiable: true,
      maxLength: 50,
    }),
    num('idfsysPersPrinc', 84, 8),
    num('idfsysCommPersPrinc', 92, 8),
    alpha('typeLienAdressePersPrinc', 100, 1),
    zoneNonDecrite(101),
  ],
};
