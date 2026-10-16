import { randomUUID } from 'node:crypto';
import { createServer, type Socket } from 'node:net';
import type { ApiElevationWindows } from './api-windows';

// Type seul (effacé à la compilation) : ce module ne charge jamais `api-windows` ni `koffi`
export type { ApiElevationWindows };

// Écriture de `%ProgramData%\Flussi\secrets.bin` par Flussi lui-même, relancé en administrateur.
// Flussi ne tourne jamais en administrateur : le compte administrateur dédié ne voit pas le lecteur
// `P:` (un `subst` de la session de l'utilisateur).
//
// Déroulement (côté Flussi de l'utilisateur) : le blob déjà chiffré (DPAPI) est servi par un canal
// nommé à usage unique ; `Flussi.exe` est relancé élevé (`ShellExecuteExW`, verbe `runas`, une seule
// invite UAC) avec le seul nom du canal en argument ; le processus élevé lit le blob, le contrôle et
// l'écrit (voir `ecriture-secrets.ts`) ; on attend sa fin et son code de sortie.
//
// Aucun interpréteur de commandes, aucune commande copier / déplacer / supprimer, aucun fichier
// temporaire des secrets hors du dossier protégé : ni secret ni chemin sur la ligne de commande.

/** Argument de la ligne de commande qui demande le mode écriture, suivi du nom du canal. */
export const ARGUMENT_ECRITURE_SECRETS = '--flussi-ecrire-secrets=';

/** Codes de sortie du mode écriture, partagés par le parent et l'enfant. */
export const CODES_ECRITURE = {
  ok: 0,
  inattendu: 2,
  contenu: 3,
  droits: 4,
  canal: 5,
  systeme: 6,
} as const;

/** Taille maximale du blob échangé par le canal (le fichier réel fait quelques kio). */
export const TAILLE_MAX_BLOB = 1024 * 1024;

/** Chemin Windows d'un canal nommé. */
export function cheminCanal(nom: string): string {
  return `\\\\.\\pipe\\${nom}`;
}

export type ResultatEcritureElevee =
  | { ok: true }
  /** Invite UAC fermée ou refusée. */
  | { ok: false; annule: true }
  /** Autre échec : erreur de lancement, code de sortie du processus élevé. */
  | { ok: false; annule: false; detail: string };

/** Canal ouvert par le Flussi de l'utilisateur. */
export interface CanalSecrets {
  /** Arrête d'écouter et coupe les connexions restantes. Ne lève jamais. */
  fermer(): Promise<void>;
}

/** Code Windows ERROR_CANCELLED : l'utilisateur a refusé ou fermé l'invite UAC. */
const CODE_ANNULE = 1223;

const LIBELLES_CODES: Readonly<Record<number, string>> = {
  [CODES_ECRITURE.inattendu]: 'erreur inattendue',
  [CODES_ECRITURE.contenu]: 'contenu refusé',
  [CODES_ECRITURE.droits]: 'écriture refusée (droits)',
  [CODES_ECRITURE.canal]: 'canal',
  [CODES_ECRITURE.systeme]: 'erreur système',
};

function messageErreur(erreur: unknown): string {
  return erreur instanceof Error ? erreur.message : String(erreur);
}

/**
 * Serveur réel : écoute le canal nommé et, à la PREMIÈRE connexion, envoie le blob puis ferme la
 * connexion ; il cesse d'écouter dès cette première connexion. Sans effet visible (aucune invite).
 */
export function creerCanalReel(nom: string, blob: Uint8Array): Promise<CanalSecrets> {
  return new Promise((resolve, reject) => {
    const connexions = new Set<Socket>();

    const serveur = createServer((connexion) => {
      connexions.add(connexion);
      connexion.on('close', () => connexions.delete(connexion));
      // Un client qui disparaît n'est pas une erreur du parent : le code de sortie en rend compte
      connexion.on('error', () => undefined);
      serveur.close();
      connexion.end(blob);
    });

    serveur.once('error', reject);
    serveur.listen(cheminCanal(nom), () => {
      serveur.off('error', reject);
      serveur.on('error', () => undefined);
      resolve({
        fermer: () =>
          new Promise<void>((fin) => {
            for (const connexion of connexions) connexion.destroy();
            if (serveur.listening) serveur.close(() => fin());
            else fin();
          }),
      });
    });
  });
}

function resultatDepuisCode(code: number): ResultatEcritureElevee {
  if (code === CODES_ECRITURE.ok) return { ok: true };
  const libelle = LIBELLES_CODES[code];
  return {
    ok: false,
    annule: false,
    detail: libelle === undefined ? `code ${code}` : `${libelle} (code ${code})`,
  };
}

/**
 * Écrit `blob` (déjà chiffré) dans `secrets.bin` par un Flussi élevé. Ne lève jamais.
 * L'API Windows et le canal sont injectés : seul `src/main/index.ts` branche la vraie API.
 */
export async function ecrireEnAdministrateur(
  parametres: { blob: Uint8Array; executable: string },
  api: ApiElevationWindows,
  creerCanal: (nom: string, blob: Uint8Array) => Promise<CanalSecrets> = creerCanalReel,
): Promise<ResultatEcritureElevee> {
  const nom = `flussi-secrets-${randomUUID()}`;

  let canal: CanalSecrets;
  try {
    canal = await creerCanal(nom, parametres.blob);
  } catch (erreur) {
    return { ok: false, annule: false, detail: `canal (${messageErreur(erreur)})` };
  }

  try {
    const lancement = api.lancerEleve(parametres.executable, ARGUMENT_ECRITURE_SECRETS + nom);
    if (!lancement.ok) {
      return lancement.code === CODE_ANNULE
        ? { ok: false, annule: true }
        : { ok: false, annule: false, detail: `lancement (code ${lancement.code})` };
    }
    return resultatDepuisCode(await api.attendreFin(lancement.processus));
  } catch (erreur) {
    return { ok: false, annule: false, detail: messageErreur(erreur) };
  } finally {
    try {
      await canal.fermer();
    } catch {
      // Au mieux : le canal ne contient que le blob chiffré
    }
  }
}
