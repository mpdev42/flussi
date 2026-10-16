import { randomUUID } from 'node:crypto';
import * as fsPromises from 'node:fs/promises';
import { connect } from 'node:net';
import { join } from 'node:path';
import type { ChiffrementMachine } from './dpapi';
import {
  ARGUMENT_ECRITURE_SECRETS,
  CODES_ECRITURE,
  TAILLE_MAX_BLOB,
  cheminCanal,
} from './elevation';
import { decoderSecrets } from './secrets-format';

// Mode écriture de Flussi, côté processus élevé : lancé par le Flussi de l'utilisateur
// (`elevation.ts`) avec `--flussi-ecrire-secrets=<canal>`. Il lit le blob chiffré sur le canal nommé,
// vérifie qu'il se déchiffre (DPAPI) et se décode, puis écrit `secrets.bin` dans le dossier protégé
// (temporaire dans le même dossier, `sync`, renommage : droits hérités du dossier). Aucune fenêtre,
// aucune configuration, aucun journal. Jamais de contenu dans une sortie console ni dans une erreur.

const NOM_FICHIER = 'secrets.bin';
const MOTIF_CANAL = /^flussi-secrets-[0-9a-f-]{36}$/;

/** Délai de lecture du canal : le processus élevé ne doit jamais rester suspendu. */
const DELAI_CANAL_MS = 15_000;

/** Descripteur ouvert en écriture : sous-ensemble de `FileHandle`. */
export interface FichierEcriture {
  write(octets: Uint8Array): Promise<unknown>;
  sync(): Promise<void>;
  close(): Promise<void>;
}

/** Sous-ensemble injectable de `node:fs/promises`. */
export interface SystemeFichiersEcriture {
  open(chemin: string, drapeaux: 'wx'): Promise<FichierEcriture>;
  rename(ancien: string, nouveau: string): Promise<void>;
  unlink(chemin: string): Promise<void>;
}

const systemeFichiersDisque: SystemeFichiersEcriture = {
  open: (chemin, drapeaux) => fsPromises.open(chemin, drapeaux),
  rename: (ancien, nouveau) => fsPromises.rename(ancien, nouveau),
  unlink: (chemin) => fsPromises.unlink(chemin),
};

/**
 * Nom du canal si la ligne de commande demande le mode écriture et qu'il est valide, sinon null
 * (un argument invalide laisse Flussi démarrer normalement).
 */
export function canalEcritureDemande(argv: readonly string[]): string | null {
  for (const argument of argv) {
    if (!argument.startsWith(ARGUMENT_ECRITURE_SECRETS)) continue;
    const nom = argument.slice(ARGUMENT_ECRITURE_SECRETS.length);
    return MOTIF_CANAL.test(nom) ? nom : null;
  }
  return null;
}

/** Lit tout le canal (1 Mio au plus). Rejette si le canal est inaccessible, trop gros ou trop lent. */
function lireCanal(chemin: string): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const morceaux: Buffer[] = [];
    let taille = 0;
    let termine = false;

    const connexion = connect(chemin);
    const minuterie = setTimeout(() => finir(new Error('délai dépassé')), DELAI_CANAL_MS);

    function finir(erreur: Error | null): void {
      if (termine) return;
      termine = true;
      clearTimeout(minuterie);
      if (erreur === null) {
        resolve(Buffer.concat(morceaux));
      } else {
        connexion.destroy();
        reject(erreur);
      }
    }

    connexion.on('data', (morceau: Buffer) => {
      taille += morceau.length;
      if (taille > TAILLE_MAX_BLOB) finir(new Error('blob trop volumineux'));
      else morceaux.push(morceau);
    });
    connexion.on('end', () => finir(null));
    connexion.on('error', (erreur) => finir(erreur));
    connexion.on('close', () => finir(new Error('canal fermé')));
  });
}

function codeSortieDisque(erreur: unknown): number {
  const code = (erreur as NodeJS.ErrnoException | null)?.code;
  return code === 'EPERM' || code === 'EACCES' ? CODES_ECRITURE.droits : CODES_ECRITURE.systeme;
}

/**
 * Reçoit le blob, le contrôle et l'écrit. Renvoie un code de `CODES_ECRITURE` (code de sortie du
 * processus). Ne lève jamais.
 */
export async function ecrireSecretsDepuisCanal(parametres: {
  nomCanal: string;
  /** `%ProgramData%\Flussi`. */
  dossier: string;
  chiffrement: ChiffrementMachine;
  fs?: SystemeFichiersEcriture;
  /** Lecture complète du canal ; 1 Mio au plus. */
  connecter?: (chemin: string) => Promise<Uint8Array>;
}): Promise<number> {
  try {
    const { nomCanal, dossier, chiffrement } = parametres;
    const fs = parametres.fs ?? systemeFichiersDisque;
    const connecter = parametres.connecter ?? lireCanal;

    let chiffre: Uint8Array;
    try {
      chiffre = await connecter(cheminCanal(nomCanal));
    } catch {
      return CODES_ECRITURE.canal;
    }
    if (chiffre.length > TAILLE_MAX_BLOB) return CODES_ECRITURE.canal;

    // Un blob qui ne se déchiffre pas ou ne se décode pas ne doit jamais remplacer secrets.bin
    try {
      if (!decoderSecrets(chiffrement.dechiffrer(chiffre)).ok) return CODES_ECRITURE.contenu;
    } catch {
      return CODES_ECRITURE.contenu;
    }

    const temporaire = join(dossier, `${NOM_FICHIER}.${randomUUID()}.tmp`);
    let ouvert: FichierEcriture;
    try {
      ouvert = await fs.open(temporaire, 'wx');
    } catch (erreur) {
      return codeSortieDisque(erreur);
    }

    try {
      try {
        await ouvert.write(chiffre);
        await ouvert.sync();
      } catch (erreur) {
        try {
          await ouvert.close();
        } catch {
          // L'erreur d'origine prime
        }
        throw erreur;
      }
      await ouvert.close();
      // Renommage dans le même dossier : le fichier garde les droits hérités du dossier
      await fs.rename(temporaire, join(dossier, NOM_FICHIER));
      return CODES_ECRITURE.ok;
    } catch (erreur) {
      try {
        await fs.unlink(temporaire);
      } catch {
        // Au mieux : le temporaire ne contient que le blob chiffré
      }
      return codeSortieDisque(erreur);
    }
  } catch {
    return CODES_ECRITURE.inattendu;
  }
}
