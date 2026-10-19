// Textes de l'écran AC056 (séparés des composants : la règle react-refresh refuse qu'un fichier de
// composant exporte autre chose que des composants).

/** Espace insécable (U+00A0) : typographie française avant « : ». */
export const NB = String.fromCharCode(0xa0);

export const TITRE_ECHEC_CHARGEMENT = "Ce fichier n'a pas pu être chargé";
export const TITRE_FICHIER_ILLISIBLE = "Ce fichier n'est pas un fichier AC056 lisible";
export const TITRE_STRUCTURE = `Ce fichier est mal formé${NB}: relancez l'export VEOS`;
export const MESSAGE_STRUCTURE =
  "Corriger les champs ne répare pas la structure du fichier. Relancez l'export dans VEOS, puis rechargez le fichier.";
export const MESSAGE_AUCUNE_ERREUR = 'Le fichier ne contient aucune erreur.';

export const TITRE_LISTE_INACCESSIBLE = 'Dossiers de travail inaccessibles';
