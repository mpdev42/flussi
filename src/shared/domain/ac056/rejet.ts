// Lignes d'un fichier de rejet MSP : octets 1 à 700 = ligne AC056, 701 à 718 = identification MSP
// (conservée brute dans `origine`), 719 et suivants = message en Windows-1252. Une ligne sans
// message fait exactement 718 octets. Un rejet est en lecture seule : il n'est ni contrôlé, ni
// modifié, ni réécrit.
import { identifierRejet } from './codes-rejet';
import { LONGUEUR_LIGNE } from './entites';
import { trimDroiteFpc } from './fpc';
import type { MessageRejet } from './modele';
import { sousOctets, texteWindows1252, type Octets } from './octets';

/** Octets de l'identification MSP (701 à 718). */
const LONGUEUR_IDENTIFICATION_MSP = 18;

/** Longueur d'une ligne de rejet sans message. */
export const LONGUEUR_MINIMALE_REJET = LONGUEUR_LIGNE + LONGUEUR_IDENTIFICATION_MSP;

/** Position (base 1) du premier octet du message. */
export const POSITION_MESSAGE_REJET = LONGUEUR_MINIMALE_REJET + 1;

/** Octets de la clé de dossier : émetteur (1 à 9) et numéro de dossier (10 à 17). */
const LONGUEUR_CLE_DOSSIER = 17;

/**
 * Clé de dossier d'une ligne de rejet. MSP range chaque dossier sous un même émetteur et un même
 * numéro : un dossier est une suite de lignes de même clé (la 000 et la 999 ont la leur).
 */
export function cleDossierRejet(origine: Octets): Octets {
  return sousOctets(origine, 0, LONGUEUR_CLE_DOSSIER);
}

/**
 * Message MSP d'une ligne de rejet, ou `undefined` si elle n'en porte pas (718 octets, ou espaces
 * seuls). Parité Lazarus : `Trim` de la ligne entière puis `Copy(ligne, 719, …)`, d'où les espaces
 * de tête du message conservés et ceux de fin retirés. Le décodage par zones (message seul décodé)
 * évite le décalage de Lazarus, où un caractère accentué dans les octets 1 à 718 déplace le `Copy`.
 */
export function messageRejet(origine: Octets): MessageRejet | undefined {
  if (origine.length <= LONGUEUR_MINIMALE_REJET) return undefined;
  const message = texteWindows1252(trimDroiteFpc(sousOctets(origine, POSITION_MESSAGE_REJET - 1)));
  if (message === '') return undefined;
  return Object.freeze({ message, ...identifierRejet(message) });
}
