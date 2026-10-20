// Désignation d'un champ dans un message Flussi (hors messages de Lazarus, repris tels quels) :
// libellé de l'écran quand le champ est affiché, sinon nom technique et positions en octets.
import type { DescriptionChamp } from './entites';

/** « Nom », ou `numEmetteur (octets 1 à 9)` pour un champ sans libellé. */
export function designationChamp(champ: DescriptionChamp): string {
  if (champ.libelle !== undefined) return `« ${champ.libelle} »`;
  return `${champ.nom} (octets ${champ.position} à ${champ.position + champ.longueur - 1})`;
}
