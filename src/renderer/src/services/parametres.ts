import type {
  ConfigurationPublique,
  DossierTravail,
  ResultatOuvertureDossier,
} from '@shared/types';

/** Configuration non secrète de l'application, résolue par le main au démarrage. */
export function lireConfiguration(): Promise<ConfigurationPublique> {
  return window.api.config.lire();
}

/** Ouvre un dossier de travail dans l'Explorateur (le main détient le chemin). */
export function ouvrirDossier(dossier: DossierTravail): Promise<ResultatOuvertureDossier> {
  return window.api.config.ouvrirDossier(dossier);
}
