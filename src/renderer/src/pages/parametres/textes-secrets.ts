// Textes de la section « Secrets techniques » (séparés de la vue : la règle react-refresh refuse
// qu'un fichier de composant exporte autre chose que des composants).

export const TITRE_SECRETS = 'Secrets techniques';

/** Espace insécable (U+00A0) avant les deux-points : typographie française. */
export const DESCRIPTION_DEV = 'Mode développement : valeurs lues dans le fichier .env.';
export const DESCRIPTION_MODIFIABLE =
  "La modification demande l'identifiant et le mot de passe d'un compte administrateur, dans une fenêtre Windows, au moment d'enregistrer.";

export const MESSAGE_CHARGEMENT = 'Chargement…';
export const PREFIXE_ERREUR_CHARGEMENT = "Les secrets n'ont pas pu être lus :";

export const LIBELLE_MODIFIER = 'Modifier les secrets';
export const LIBELLE_FORMULAIRE = 'Modifier les secrets techniques';

export const LIBELLE_NOUVEAU_MOT_DE_PASSE = 'Nouveau mot de passe';
export const AIDE_MOT_DE_PASSE = 'Laisser vide pour ne pas changer.';

export const LIBELLE_CHOISIR_CLE = 'Choisir la clé…';
export const LIBELLE_CONTROLE_CLE = 'Contrôle de la clé…';
export const AIDE_CLE = 'PPK version 2 ou OpenSSH, sans phrase secrète.';
export const prefixeClePrete = (format: string): string => `Clé prête (${format})`;

export const LIBELLE_ENREGISTRER = 'Enregistrer';
export const LIBELLE_ENREGISTREMENT = 'Enregistrement…';
export const LIBELLE_ANNULER = 'Annuler';

export const STATUT_ENV = 'Renseigné dans le .env';
export const STATUT_NON_RENSEIGNE = 'Non renseigné';
export const prefixeStatutRenseigne = (date: string): string => `Renseigné le ${date}`;
