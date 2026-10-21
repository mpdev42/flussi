import { ipcMain, type WebContents } from 'electron';
import {
  enregistrementAc056Schema,
  fichierAc056Schema,
  modificationsAc056Schema,
} from '@shared/schemas/ac056';
import type { EnregistrementAc056 } from '@shared/types/ac056';
import type { ServiceAc056 } from '../../services/ac056';

/** Réponse à un émetteur non autorisé : générique, elle ne dit rien du refus. */
const REFUS_EMETTEUR: EnregistrementAc056 = {
  ok: false,
  erreur: { code: 'erreur-systeme', message: 'erreur système inattendue' },
};

interface DependancesAc056 {
  service: ServiceAc056;
  /** Vrai seulement pour la page de la fenêtre principale (branchée dans `src/main/index.ts`). */
  estEmetteurAutorise: (emetteur: WebContents) => boolean;
}

/**
 * Canaux `ac056:lister` (sans entrée), `ac056:ouvrir` (un seul argument `{ emplacement, nom }`),
 * `ac056:enregistrer` (emplacement, nom, empreinte et corrections) et `ac056:modifications`
 * (envoi sans réponse : fichier aux corrections non enregistrées). Les entrées sont validées par
 * zod : une entrée invalide rejette l'appel sans appeler le service, sauf pour
 * `ac056:modifications`, où elle est ignorée, comme un émetteur autre que la fenêtre principale.
 * `ac056:enregistrer` est réservé à la fenêtre principale : un autre émetteur reçoit l'erreur générique.
 * Les erreurs d'accès aux fichiers sont renvoyées typées dans le résultat, sans chemin Windows.
 */
export function enregistrerHandlersAc056({ service, estEmetteurAutorise }: DependancesAc056): void {
  ipcMain.handle('ac056:lister', () => service.lister());

  ipcMain.handle('ac056:ouvrir', (_event, entree: unknown) => {
    const { emplacement, nom } = fichierAc056Schema.parse(entree);
    return service.ouvrir(emplacement, nom);
  });

  // Seul canal qui écrit sur le stockage : réservé à la page de la fenêtre principale. Un autre
  // émetteur reçoit l'erreur générique, sans validation ni appel au service.
  ipcMain.handle(
    'ac056:enregistrer',
    (event, entree: unknown): ReturnType<ServiceAc056['enregistrer']> => {
      if (!estEmetteurAutorise(event.sender)) return Promise.resolve(REFUS_EMETTEUR);
      return service.enregistrer(enregistrementAc056Schema.parse(entree));
    },
  );

  ipcMain.on('ac056:modifications', (event, entree: unknown) => {
    if (!estEmetteurAutorise(event.sender)) return;
    const demande = modificationsAc056Schema.safeParse(entree);
    if (!demande.success) return;
    service.signalerModifications(demande.data.fichier);
  });
}
