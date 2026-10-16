import * as fsPromises from 'node:fs/promises';
import { join } from 'node:path';
import { TAILLE_MAX_CLE_PRIVEE } from './cle-privee';
import type { ChiffrementMachine } from './dpapi';
import type { ResultatEcritureElevee } from './elevation';
import { decoderSecrets, encoderSecrets, type ContenuSecrets } from './secrets-format';

// Coffre des secrets techniques : `%ProgramData%\Flussi\secrets.bin`, chiffré par DPAPI au niveau
// de la machine. Entrées-sorties : le chiffrement, le système de fichiers et l'écriture élevée sont
// injectables. Aucune valeur de secret dans les résultats d'erreur : seulement des codes et des
// messages natifs.
//
// Flussi n'est jamais lancé en administrateur : DPAPI (portée machine) fonctionne pour un compte
// standard, donc le nouveau fichier est chiffré par Flussi, en mémoire, puis confié à une nouvelle
// instance de Flussi relancée en administrateur (une invite UAC) qui l'écrit dans le dossier
// protégé (`elevation.ts`, `ecriture-secrets.ts`). Aucun fichier temporaire hors de ce dossier.

const NOM_FICHIER = 'secrets.bin';

/** Sous-ensemble injectable de `node:fs/promises`. */
export interface SystemeFichiersSecrets {
  readFile(chemin: string): Promise<Uint8Array>;
  stat(chemin: string): Promise<{ size: number }>;
}

const systemeFichiersDisque: SystemeFichiersSecrets = {
  readFile: (chemin) => fsPromises.readFile(chemin),
  stat: (chemin) => fsPromises.stat(chemin),
};

export type LectureSecrets =
  | { etat: 'absent' }
  | { etat: 'lisible'; secrets: ContenuSecrets }
  /** Échec de déchiffrement (message natif) ou `contenu invalide`. */
  | { etat: 'illisible'; cause: string }
  /** Lecture disque autre que « fichier absent ». */
  | { etat: 'erreur'; code: string };

export type EcritureSecrets =
  | { ok: true }
  /** Invite de contrôle de compte (UAC) fermée ou refusée. */
  | { ok: false; raison: 'annule' }
  | {
      ok: false;
      raison: 'chiffrement' | 'elevation' | 'verification';
      detail: string;
    };

export interface CoffreSecrets {
  /** `%ProgramData%\Flussi`. */
  readonly dossier: string;
  /** `{dossier}\secrets.bin`. */
  readonly fichier: string;
  /** null si DPAPI est disponible, sinon la cause lisible. */
  indisponibilite(): string | null;
  /** Ne lève jamais. */
  lire(): Promise<LectureSecrets>;
  /**
   * Chiffre en mémoire, confie le blob à un Flussi relancé en administrateur (une invite UAC) qui
   * l'écrit, puis relit `secrets.bin` pour vérifier. Ne lève jamais.
   */
  ecrire(secrets: ContenuSecrets): Promise<EcritureSecrets>;
}

function codeErreur(erreur: unknown): string {
  const code = (erreur as NodeJS.ErrnoException | null)?.code;
  return typeof code === 'string' ? code : 'erreur inconnue';
}

function messageErreur(erreur: unknown): string {
  return erreur instanceof Error ? erreur.message : String(erreur);
}

export function creerCoffreSecrets(parametres: {
  dossier: string;
  chiffrement: ChiffrementMachine;
  /**
   * Écriture du blob chiffré par un Flussi élevé : obligatoire, seul `src/main/index.ts` branche
   * la vraie (jamais de défaut).
   */
  ecrireEleve: (blob: Uint8Array) => Promise<ResultatEcritureElevee>;
  fs?: SystemeFichiersSecrets;
}): CoffreSecrets {
  const { dossier, chiffrement, ecrireEleve } = parametres;
  const fs = parametres.fs ?? systemeFichiersDisque;
  const fichier = join(dossier, NOM_FICHIER);

  return {
    dossier,
    fichier,

    indisponibilite: () => chiffrement.indisponibilite(),

    async lire() {
      let chiffre: Uint8Array;
      try {
        chiffre = await fs.readFile(fichier);
      } catch (erreur) {
        const code = codeErreur(erreur);
        return code === 'ENOENT' ? { etat: 'absent' } : { etat: 'erreur', code };
      }

      let clair: Uint8Array;
      try {
        clair = chiffrement.dechiffrer(chiffre);
      } catch (erreur) {
        return { etat: 'illisible', cause: messageErreur(erreur) };
      }

      const contenu = decoderSecrets(clair);
      return contenu.ok
        ? { etat: 'lisible', secrets: contenu.secrets }
        : { etat: 'illisible', cause: 'contenu invalide' };
    },

    async ecrire(secrets) {
      let chiffre: Uint8Array;
      try {
        chiffre = chiffrement.chiffrer(encoderSecrets(secrets));
      } catch (erreur) {
        return { ok: false, raison: 'chiffrement', detail: messageErreur(erreur) };
      }

      let ecriture: ResultatEcritureElevee;
      try {
        ecriture = await ecrireEleve(chiffre);
      } catch (erreur) {
        return { ok: false, raison: 'elevation', detail: messageErreur(erreur) };
      }
      if (!ecriture.ok) {
        return ecriture.annule
          ? { ok: false, raison: 'annule' }
          : { ok: false, raison: 'elevation', detail: ecriture.detail };
      }

      // Vérification : l'écriture élevée peut réussir sans que le fichier attendu soit en place
      let ecrit: Uint8Array;
      try {
        ecrit = await fs.readFile(fichier);
      } catch (erreur) {
        return { ok: false, raison: 'verification', detail: codeErreur(erreur) };
      }
      if (!Buffer.from(ecrit).equals(Buffer.from(chiffre))) {
        return { ok: false, raison: 'verification', detail: 'contenu différent' };
      }
      return { ok: true };
    },
  };
}

export type LectureFichierCle =
  | { ok: true; octets: Uint8Array }
  | { ok: false; refus: 'trop-volumineux' }
  | { ok: false; code: string };

/** Lit le fichier d'une clé privée choisie par l'utilisateur (taille contrôlée avant lecture). */
export async function lireFichierCle(
  chemin: string,
  fs: SystemeFichiersSecrets = systemeFichiersDisque,
): Promise<LectureFichierCle> {
  try {
    const infos = await fs.stat(chemin);
    if (infos.size > TAILLE_MAX_CLE_PRIVEE) return { ok: false, refus: 'trop-volumineux' };
    return { ok: true, octets: await fs.readFile(chemin) };
  } catch (erreur) {
    return { ok: false, code: codeErreur(erreur) };
  }
}
