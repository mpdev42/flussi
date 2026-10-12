// En-tête commun aux 22 entités AC056 (octets 1 à 25).
import { alpha, num, type OptionsChamp } from './champs';
import type { DescriptionChamp } from './types';

/** Options de saisie d'un rang modifiable dans Lazarus (TEdit, MaxLength 2). */
export const RANG_MODIFIABLE: OptionsChamp = { affiche: true, modifiable: true, maxLength: 2 };

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
