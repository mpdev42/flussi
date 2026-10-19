import type { CibleFichierAc056 } from '@shared/schemas/ac056';
import type { ListeAc056, OuvertureAc056 } from '@shared/types';

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
