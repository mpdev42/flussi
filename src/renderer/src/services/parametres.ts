import type {
  ConfigurationPublique,
  DemandeEnregistrementSecrets,
  DossierTravail,
  EtatSecrets,
  ResultatOuvertureDossier,
  ResultatPreparationCle,
  ResultatSecret,
} from '@shared/types';

/** Configuration non secrète de l'application, résolue par le main au démarrage. */
export function lireConfiguration(): Promise<ConfigurationPublique> {
  return window.api.config.lire();
}

/** Ouvre un dossier de travail dans l'Explorateur (le main détient le chemin). */
export function ouvrirDossier(dossier: DossierTravail): Promise<ResultatOuvertureDossier> {
  return window.api.config.ouvrirDossier(dossier);
}

/** Statuts des secrets techniques. Jamais une valeur. */
export function lireEtatSecrets(): Promise<EtatSecrets> {
  return window.api.secrets.etat();
}

/**
 * Choix et contrôle de la clé privée : le main ouvre le sélecteur, lit le fichier et garde la clé en
 * mémoire. L'écran ne reçoit que le libellé du format.
 */
export function preparerCle(): Promise<ResultatPreparationCle> {
  return window.api.secrets.preparerCle();
}

/** Oublie la clé préparée côté main. */
export function abandonnerCle(): Promise<void> {
  return window.api.secrets.abandonnerCle();
}

/** Envoie les changements au main (écriture seule : aucun canal ne relit une valeur). */
export function enregistrerSecrets(demande: DemandeEnregistrementSecrets): Promise<ResultatSecret> {
  return window.api.secrets.enregistrer(demande);
}
