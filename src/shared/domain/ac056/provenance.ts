// Provenance d'un fichier AC056 d'après son nom, à parité de `ChargerFichierAc056` :
// `FFichierRejet := s_fichier.StartsWith(C_S_PREFIXE_FICHIER_REJET)`, `s_fichier` étant le nom
// sans chemin (`fmain.pas:2706-2707`), sensible à la casse. Le contenu n'est jamais consulté. Le domaine ne lit pas de fichier : l'appelant passe
// le nom seul, sans chemin.
import type { Provenance } from './modele';

/** Préfixe des fichiers de rejet déposés par MSP dans `/Retrait`. */
export const PREFIXE_FICHIER_REJET = 'AC056COUR_REJ_';

/** `rejet` si le nom commence par `AC056COUR_REJ_` (casse comprise), sinon `veos`. */
export function provenanceDepuisNom(nom: string): Provenance {
  return nom.startsWith(PREFIXE_FICHIER_REJET) ? 'rejet' : 'veos';
}
