import type { Configuration } from '@shared/schemas/config';
import type { DossierTravail, ResultatOuvertureDossier } from '@shared/types';

export interface ServiceParametres {
  /** Ouvre un dossier de travail dans l'Explorateur. Ne lève jamais : l'échec est dans le résultat. */
  ouvrirDossier(dossier: DossierTravail): Promise<ResultatOuvertureDossier>;
}

export interface DependancesParametres {
  dossiers: Configuration['dossiers'];
  /** Sémantique de `shell.openPath` : chaîne vide si succès, sinon le message d'erreur. */
  ouvrirChemin: (chemin: string) => Promise<string>;
}

/** Désignation du dossier dans les messages (« Le dossier … (chemin) »). */
const DESIGNATIONS: Record<DossierTravail, string> = {
  travail: 'de travail',
  in: 'IN',
  out: 'OUT',
  journal: 'Journal',
};

export function creerServiceParametres({
  dossiers,
  ouvrirChemin,
}: DependancesParametres): ServiceParametres {
  return {
    async ouvrirDossier(dossier) {
      const chemin = dossiers[dossier];
      const echec = (cause: string): ResultatOuvertureDossier => ({
        ok: false,
        message: `Le dossier ${DESIGNATIONS[dossier]} (${chemin}) n'a pas pu être ouvert dans l'Explorateur : ${cause}`,
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
