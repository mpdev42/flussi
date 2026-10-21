import type { CibleFichierAc056, DemandeEnregistrementAc056 } from '@shared/schemas/ac056';
import type { EnregistrementAc056, ListeAc056, OuvertureAc056 } from '@shared/types';

/** Fichiers `.txt` de `IN` et de `OUT`, du plus récent au plus ancien. */
export function listerFichiersAc056(): Promise<ListeAc056> {
  return window.api.ac056.lister();
}

/**
 * Lit, analyse et contrôle un fichier ; le main trace le chargement au journal. La cible est un
 * emplacement logique et un nom, jamais un chemin.
 */
export function ouvrirFichierAc056(cible: CibleFichierAc056): Promise<OuvertureAc056> {
  return window.api.ac056.ouvrir(cible);
}

/**
 * Enregistre les corrections saisies : le main applique, vérifie puis écrit le fichier. Aucun
 * chemin, seulement l'emplacement logique, le nom, l'empreinte d'ouverture et les saisies.
 */
export function enregistrerFichierAc056(
  demande: DemandeEnregistrementAc056,
): Promise<EnregistrementAc056> {
  return window.api.ac056.enregistrer(demande);
}

/**
 * Signale au main le fichier aux corrections non enregistrées (`null` : aucun). Le main s'en sert
 * pour la confirmation à la fermeture de la fenêtre.
 */
export function signalerModificationsAc056(cible: CibleFichierAc056 | null): void {
  window.api.ac056.signalerModifications(cible);
}
