import type { ConfigurationPublique } from '@shared/types';

/** Configuration non secrète de l'application, résolue par le main au démarrage. */
export function lireConfiguration(): Promise<ConfigurationPublique> {
  return window.api.config.lire();
}
