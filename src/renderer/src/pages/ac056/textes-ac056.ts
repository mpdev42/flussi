// Textes de l'écran AC056 (séparés des composants : la règle react-refresh refuse qu'un fichier de
// composant exporte autre chose que des composants).
import { pluralize } from '@/lib/pluralize';

/** Espace insécable (U+00A0) : typographie française avant « : ». */
export const NB = String.fromCharCode(0xa0);

export const TITRE_ECHEC_CHARGEMENT = "Ce fichier n'a pas pu être chargé";
export const TITRE_FICHIER_ILLISIBLE = "Ce fichier n'est pas un fichier AC056 lisible";
export const TITRE_STRUCTURE = `Ce fichier est mal formé${NB}: relancez l'export VEOS`;
export const MESSAGE_STRUCTURE =
  "Corriger les champs ne répare pas la structure du fichier. Relancez l'export dans VEOS, puis rechargez le fichier.";
export const MESSAGE_HORS_EVENEMENT =
  'Début ou fin de fichier, ligne mal placée ou perdue : ces erreurs ne figurent dans aucun évènement.';
export const MESSAGE_AUCUNE_ERREUR = 'Le fichier ne contient aucune erreur.';

/**
 * Alerte de fichier d'un fichier VEOS qui contient des erreurs (même forme que `MESSAGE_AUCUNE_ERREUR`).
 * `aCorriger` est faux pour un fichier mal formé : tout y est en lecture seule, rien n'est à corriger
 * dans les champs.
 */
export function messageErreursFichier(n: number, aCorriger: boolean): string {
  const compte = `Le fichier contient ${n} ${pluralize(n, 'erreur', 'erreurs')}`;
  return aCorriger ? `${compte} à corriger.` : `${compte}.`;
}

/**
 * Titre de l'encadré des erreurs d'une ligne qui ne tiennent à aucun champ affiché. « Autre(s) » seulement
 * si un champ affiché de la fiche est déjà marqué en erreur (`champMarque`).
 */
export function titreErreursLigne(numero: number, n: number, champMarque: boolean): string {
  const libelle = champMarque
    ? pluralize(n, 'Autre erreur', 'Autres erreurs')
    : pluralize(n, 'Erreur', 'Erreurs');
  return `${libelle} de la ligne ${numero}`;
}

export const TITRE_ABANDON = `Abandonner les modifications${NB}?`;
export const MESSAGE_ABANDON =
  'Les corrections faites dans ce fichier ne sont pas enregistrées. Elles seront perdues.';
export const LIBELLE_ABANDON = 'Abandonner les modifications';

export const TITRE_LISTE_INACCESSIBLE = 'Dossiers de travail inaccessibles';
