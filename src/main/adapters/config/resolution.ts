import { win32 } from 'node:path';
import {
  CLES_CONFIGURATION,
  CLES_DEV,
  CLES_SECRETES,
  MODES,
  contientCaractereControle,
  estCheminDossier,
  type CleConfiguration,
  type Configuration,
  type Mode,
} from '@shared/schemas/config';
import type { OriginesConfiguration } from '@shared/types';

// Résolution pure de la configuration : aucune entrée-sortie, testable sans Electron.

export type ContexteConfiguration = 'installee' | 'dev';

export interface SourceConfiguration {
  contexte: ContexteConfiguration;
  /** Chemin de config.json (installée) ou du .env (dev), cité dans les messages. */
  fichier: string;
  /**
   * Clés lues dans ce fichier ({} si le .env est absent en dev). Seule source de valeurs :
   * les variables d'environnement du processus ne sont jamais consultées.
   */
  valeursFichier: Record<string, unknown>;
}

export interface ErreurConfiguration {
  /** Chemin du fichier (config.json ou .env). */
  source: string;
  cle?: string;
  /** Jamais de valeur, sauf celle de FLUSSI_ENV. */
  message: string;
}

export type ResultatConfiguration =
  | { ok: true; configuration: Configuration; origines: OriginesConfiguration }
  | { ok: false; erreurs: ErreurConfiguration[] };

/** Racine de travail par défaut du mode prod (dossiers IN, OUT et Journal dérivés). */
export const DOSSIER_TRAVAIL_PROD =
  'P:\\Siege\\Service administratif\\MATH\\APIVIA Transfert\\Transferts';

/** Noms fixes des sous-dossiers de la racine de travail (disposition de Lazarus). */
const SOUS_DOSSIER_IN = 'IN';
const SOUS_DOSSIER_OUT = 'OUT';
const SOUS_DOSSIER_JOURNAL = 'Journal';

const MESSAGE_TRAVAIL_MANQUANT =
  'manquant : chemin absolu du dossier de travail attendu (il contient IN, OUT et Journal).';

const MESSAGE_CHEMIN =
  'chemin absolu attendu (lecteur « X:\\… » ou réseau « \\\\serveur\\partage\\… »).';

const MESSAGE_CONTROLE_DEV =
  "caractère de contrôle dans le chemin (saut de ligne ?) : dans le .env, n'entourez pas le chemin de guillemets doubles.";

const MESSAGE_CONTROLE_INSTALLEE =
  'caractère de contrôle dans le chemin (saut de ligne ?) : dans config.json, chaque barre oblique inverse doit être doublée (\\\\).';

function contient(liste: readonly string[], cle: string): boolean {
  return liste.includes(cle);
}

export function resoudreConfiguration(source: SourceConfiguration): ResultatConfiguration {
  const { contexte, fichier, valeursFichier } = source;
  const enDev = contexte === 'dev';
  const erreurs: ErreurConfiguration[] = [];
  const clesEnErreur = new Set<string>();

  const signaler = (origine: string, cle: string | undefined, message: string): void => {
    erreurs.push(
      cle === undefined ? { source: origine, message } : { source: origine, cle, message },
    );
    if (cle !== undefined) clesEnErreur.add(cle);
  };

  // 1. Clés du fichier
  for (const [cle, valeur] of Object.entries(valeursFichier)) {
    if (contient(CLES_CONFIGURATION, cle)) {
      if (typeof valeur !== 'string') signaler(fichier, cle, 'texte attendu.');
    } else if (contient(CLES_SECRETES, cle)) {
      if (!enDev) {
        signaler(
          fichier,
          cle,
          "un secret ne doit pas figurer dans config.json : il est saisi par l'administrateur dans l'application.",
        );
      }
    } else if (!(enDev && contient(CLES_DEV, cle))) {
      signaler(fichier, cle, 'clé inconnue (faute de frappe ?).');
    }
  }

  // 2. Lecture : seules les valeurs du fichier comptent ; une valeur vide vaut absence
  const lire = (cle: CleConfiguration): string | undefined => {
    const duFichier = valeursFichier[cle];
    return typeof duFichier === 'string' && duFichier !== '' ? duFichier : undefined;
  };

  // 3. Mode
  let mode: Mode | null = null;
  if (!clesEnErreur.has('FLUSSI_ENV')) {
    const brut = lire('FLUSSI_ENV');
    if (!brut) {
      signaler(fichier, 'FLUSSI_ENV', 'absent ou vide, « recette » ou « prod » attendu.');
    } else if (!(MODES as readonly string[]).includes(brut)) {
      signaler(fichier, 'FLUSSI_ENV', `« ${brut} » reçu, « recette » ou « prod » attendu.`);
    } else {
      mode = brut as Mode;
      if (enDev && mode === 'prod') {
        signaler(
          fichier,
          'FLUSSI_ENV',
          'le mode prod est refusé en développement : le travail en production se fait avec Flussi installé.',
        );
      }
    }
  }

  // 4. Racine de travail : valeur vérifiée, sinon défaut du mode prod. IN, OUT et Journal en sont dérivés.
  const verifierTravail = (): string | undefined => {
    const cle: CleConfiguration = 'STOCKAGE_DOSSIER_TRAVAIL';
    if (clesEnErreur.has(cle)) return undefined;
    const retenue = lire(cle);
    if (!retenue) return undefined;
    if (contientCaractereControle(retenue)) {
      signaler(fichier, cle, enDev ? MESSAGE_CONTROLE_DEV : MESSAGE_CONTROLE_INSTALLEE);
      return undefined;
    }
    if (!estCheminDossier(retenue)) {
      signaler(fichier, cle, MESSAGE_CHEMIN);
      return undefined;
    }
    return retenue;
  };

  const racineLue = verifierTravail();
  const travail = racineLue ?? (mode === 'prod' ? DOSSIER_TRAVAIL_PROD : undefined);

  // Racine absente en recette. Tant que le mode est inconnu, on ignore si le défaut prod s'applique.
  if (travail === undefined && mode !== null && !clesEnErreur.has('STOCKAGE_DOSSIER_TRAVAIL')) {
    signaler(fichier, 'STOCKAGE_DOSSIER_TRAVAIL', MESSAGE_TRAVAIL_MANQUANT);
  }

  if (erreurs.length > 0 || mode === null || travail === undefined) {
    return { ok: false, erreurs };
  }

  // Le mode est toujours lu dans le fichier (sans valeur par défaut) ; la racine peut venir du défaut
  const origineFichier = enDev ? 'env' : 'config';

  return {
    ok: true,
    configuration: {
      mode,
      dossiers: {
        travail,
        in: win32.join(travail, SOUS_DOSSIER_IN),
        out: win32.join(travail, SOUS_DOSSIER_OUT),
        journal: win32.join(travail, SOUS_DOSSIER_JOURNAL),
      },
    },
    origines: {
      fichier,
      mode: origineFichier,
      travail: racineLue ? origineFichier : 'defaut',
    },
  };
}
