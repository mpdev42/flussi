import { ipcMain } from 'electron';
import { dossierTravailSchema, enregistrementSecretsSchema } from '@shared/schemas/parametres';
import type { ConfigurationPublique } from '@shared/types';
import type { ServiceParametres, ServiceSecrets } from '../../services/parametres';

interface DependancesParametres {
  configuration: ConfigurationPublique;
  parametres: ServiceParametres;
  secrets: ServiceSecrets;
}

/**
 * Canal `config:lire` : configuration résolue non secrète, avec ses origines (pas d'entrée).
 * Canal `config:ouvrir-dossier` : le renderer envoie un nom de dossier (`travail`, `in`, `out`,
 * `journal`), jamais un chemin ; un nom invalide rejette l'appel (erreur de programmation). L'échec
 * d'ouverture est renvoyé typé dans le résultat.
 *
 * Canaux `secrets:*` : aucun ne renvoie ni n'accepte de chemin, et aucun ne relit une valeur.
 * - `secrets:etat` : statuts seulement (sans entrée).
 * - `secrets:preparer-cle` : sans entrée, le sélecteur de fichier est ouvert par le main, qui
 *   contrôle la clé et la garde en mémoire ; l'écran reçoit seulement le libellé du format.
 * - `secrets:abandonner-cle` : sans entrée, le main oublie la clé préparée.
 * - `secrets:enregistrer` : écriture seule `{ motsDePasse, cle }`, un seul enregistrement (une
 *   seule invite de contrôle de compte) pour tous les changements. Un échec de validation lève une
 *   erreur générique : le détail de zod pourrait citer la valeur saisie.
 */
export function enregistrerHandlersParametres({
  configuration,
  parametres,
  secrets,
}: DependancesParametres): void {
  ipcMain.handle('config:lire', () => configuration);

  ipcMain.handle('config:ouvrir-dossier', (_event, dossier: unknown) =>
    parametres.ouvrirDossier(dossierTravailSchema.parse(dossier)),
  );

  ipcMain.handle('secrets:etat', () => secrets.etat());

  ipcMain.handle('secrets:preparer-cle', () => secrets.preparerCle());

  ipcMain.handle('secrets:abandonner-cle', () => {
    secrets.abandonnerCle();
  });

  ipcMain.handle('secrets:enregistrer', (_event, entree: unknown) => {
    const analyse = enregistrementSecretsSchema.safeParse(entree);
    if (!analyse.success) {
      throw new Error('secrets:enregistrer : entrée invalide.');
    }
    return secrets.enregistrer(analyse.data);
  });
}
