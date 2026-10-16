import type { Configuration } from '@shared/schemas/config';
import { DESIGNATIONS_DOSSIER } from '@shared/schemas/parametres';
import type { DossierTravail, ResultatOuvertureDossier } from '@shared/types';

export { creerServiceSecrets, type DependancesSecrets, type ServiceSecrets } from './secrets';

export interface ServiceParametres {
  /** Ouvre un dossier de travail dans l'Explorateur. Ne lève jamais : l'échec est dans le résultat. */
  ouvrirDossier(dossier: DossierTravail): Promise<ResultatOuvertureDossier>;
}

export interface DependancesParametres {
  dossiers: Configuration['dossiers'];
  /** Sémantique de `shell.openPath` : chaîne vide si succès, sinon le message d'erreur. */
  ouvrirChemin: (chemin: string) => Promise<string>;
}

export function creerServiceParametres({
  dossiers,
  ouvrirChemin,
}: DependancesParametres): ServiceParametres {
  return {
    async ouvrirDossier(dossier) {
      const chemin = dossiers[dossier];
      const echec = (cause: string): ResultatOuvertureDossier => ({
        ok: false,
        // Le titre de l'écran dit déjà « Le dossier n'a pas pu être ouvert » : pas de redite
        message: `Dossier ${DESIGNATIONS_DOSSIER[dossier]} (${chemin}) : ${cause}`,
      });

      try {
        const cause = await ouvrirChemin(chemin);
        return cause === '' ? { ok: true } : echec(cause);
      } catch (erreur: unknown) {
        return echec(erreur instanceof Error ? erreur.message : String(erreur));
      }
    },
  };
}
