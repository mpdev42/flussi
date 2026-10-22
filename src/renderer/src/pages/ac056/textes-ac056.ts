// Textes de l'écran AC056 (séparés des composants : la règle react-refresh refuse qu'un fichier de
// composant exporte autre chose que des composants).
import { pluralize } from '@/lib/pluralize';

/** Espace insécable (U+00A0) : typographie française avant « : ». */
export const NB = String.fromCharCode(0xa0);

export const TITRE_ECHEC_CHARGEMENT = "Ce fichier n'a pas pu être chargé";
export const TITRE_FICHIER_ILLISIBLE = "Ce fichier n'est pas un fichier AC056 lisible";
export const TITRE_STRUCTURE = `Ce fichier est mal formé${NB}: relancez l'export VEOS`;
export const MESSAGE_STRUCTURE = `L'enregistrement est refusé${NB}: corriger les champs ne répare pas la structure du fichier. Relancez l'export dans VEOS, puis rechargez le fichier.`;
export const MESSAGE_HORS_EVENEMENT =
  'Début ou fin de fichier, ligne mal placée ou perdue : ces erreurs ne figurent dans aucun évènement.';
export const MESSAGE_AUCUNE_ERREUR = 'Le fichier ne contient aucune erreur.';
/** Fichier corrigé en mémoire qui n'a plus d'erreur (pas encore enregistré). */
export const MESSAGE_PLUS_D_ERREUR = `Le fichier ne contient plus d'erreur${NB}: vous pouvez l'enregistrer.`;

// Enregistrement : retours (une ligne chacun, comme l'alerte du fichier qu'ils remplacent)
export const MESSAGE_ENREGISTRE = 'Fichier enregistré';
export const MESSAGE_A_JOUR = `Le fichier est déjà à jour${NB}: rien à enregistrer`;
export const TITRE_ECHEC_ENREGISTREMENT = `Enregistrement impossible${NB}: le fichier n'a pas été modifié`;
/** L'appel au main a échoué : on ignore si le fichier a été écrit. */
export const TITRE_ENREGISTREMENT_INTERROMPU = `Enregistrement interrompu${NB}: vérifiez le fichier avant de réessayer`;

/** Fichier enregistré alors qu'il contient encore des erreurs (le dépôt chez MSP sera refusé). */
export function messageEnregistreAvecErreurs(n: number): string {
  const suite =
    n <= 1 ? "tant qu'elle n'est pas corrigée." : "tant qu'elles ne sont pas corrigées.";
  return `Fichier enregistré avec ${n} ${pluralize(n, 'erreur', 'erreurs')}${NB}: il ne pourra pas être déposé chez MSP ${suite}`;
}

export const LIBELLE_ENREGISTRER = 'Enregistrer';
export const LIBELLE_ENREGISTREMENT = 'Enregistrement…';
export const LIBELLE_CHANGER_FICHIER = 'Changer de fichier';
export const RAISON_MAL_FORME = 'Fichier mal formé';
export const LIBELLE_MODIFIE = 'Modifié';

export const TITRE_AFFICHAGE_IMPOSSIBLE = 'Affichage du fichier impossible';
export const MESSAGE_AFFICHAGE_IMPOSSIBLE =
  "Une erreur inattendue empêche d'afficher ce fichier. Vos corrections sont conservées : vous pouvez encore les enregistrer.";
/** Un rejet ne se corrige pas : rien à conserver ni à enregistrer. */
export const MESSAGE_AFFICHAGE_REJET_IMPOSSIBLE =
  "Une erreur inattendue empêche d'afficher ce fichier de rejet.";

// Fichier de rejet MSP : message de MSP et explication, par ligne rejetée (item 4 de la v0.3.0)

/** Début du titre de l'encadré d'une ligne, avant « rejetée par MSP ». */
export const SUJET_LIGNE = 'Ligne';
/** Suite du titre de l'encadré, après le sujet (« Ligne », « Ligne 10 (990) de l'évènement »). */
export const TITRE_REJETEE_PAR_MSP = ` rejetée par MSP${NB}· `;
/** Titre de l'encadré quand le message n'a pas de code `ERRxxx` (divergence 10). */
export const LIBELLE_CODE_INCONNU = 'code inconnu';
/** Bénéficiaire implicite : une 700 est arrivée sans sa 400 dans le rejet. */
export const LIBELLE_BENEFICIAIRE_ABSENT = 'Bénéficiaire absent du rejet';
export const TITRE_ENTITE_ABSENTE_REJET = 'Entité absente du rejet';
/** Mention lue par les lecteurs d'écran après le libellé d'un onglet désactivé d'un rejet. */
export const MENTION_ENTITE_ABSENTE_REJET = '(entité absente du rejet)';

/**
 * « Message MSP : « … » » (espaces insécables avant « : » et dans les guillemets). Le message est
 * rogné pour l'affichage seulement : le domaine garde le message brut.
 */
export function messageMsp(message: string): string {
  return `Message MSP${NB}: «${NB}${message.trim()}${NB}»`;
}

/** « Explication : … » (l'explication d'un code sans texte validé n'est pas affichée). */
export function explicationMsp(explication: string): string {
  return `Explication${NB}: ${explication}`;
}

/** Début de la ligne d'une ligne rejetée hors évènement : « Ligne 14 (995) » (entité illisible : numéro seul). */
export function designationLigneRejetee(numero: number, code: string | null): string {
  const ligne = `${SUJET_LIGNE}${NB}${numero}`;
  return code === null ? ligne : `${ligne} (${code})`;
}

/** Titre de l'alerte des lignes rejetées hors de tout évènement (000, 001, 995, 999, lignes perdues). */
export function titreRejetsHorsEvenement(n: number): string {
  return `${n} ${pluralize(n, 'ligne rejetée', 'lignes rejetées')} hors des évènements`;
}

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
/** Description de la boîte « Abandonner les modifications ? » : `n` champs modifiés de `nom`. */
export function messageAbandon(n: number, nom: string): string {
  if (n < 1) {
    return `Les corrections faites dans ${nom} ne sont pas enregistrées. Elles seront perdues si vous ouvrez un autre fichier.`;
  }
  return n === 1
    ? `Le champ modifié de ${nom} n'est pas enregistré. Il sera perdu si vous ouvrez un autre fichier.`
    : `Les ${n} champs modifiés de ${nom} ne sont pas enregistrés. Ils seront perdus si vous ouvrez un autre fichier.`;
}
export const LIBELLE_ABANDON = 'Abandonner les modifications';

export const TITRE_LISTE_INACCESSIBLE = 'Dossiers de travail inaccessibles';
