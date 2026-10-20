// En-tête commun aux 22 entités AC056 (octets 1 à 25).
import { alpha, num, type OptionsChamp } from './champs';
import { figerProfond } from './gel';
import type { DescriptionChamp } from './types';

/** Options de saisie d'un rang modifiable dans Lazarus (TEdit, MaxLength 2), sans libellé. */
export const RANG_MODIFIABLE: OptionsChamp = figerProfond({
  affiche: true,
  modifiable: true,
  maxLength: 2,
});

/** Rang de bénéficiaire modifiable (`edtNNNRangBeneficiaire`), libellé « Rang bénéficiaire ». */
export const RANG_BENEFICIAIRE: OptionsChamp = figerProfond({
  ...RANG_MODIFIABLE,
  libelle: 'Rang bénéficiaire',
});

/** En-tête commun aux 22 entités, octets 1 à 25. `rang` : options du rang de bénéficiaire (s_rang_n). */
export function entete(rang: OptionsChamp = {}): DescriptionChamp[] {
  return [
    alpha('numEmetteur', 1, 9),
    num('numDossier', 10, 8),
    num('numEvt', 18, 3),
    num('rang', 21, 2, rang),
    num('numEntite', 23, 3),
  ];
}
