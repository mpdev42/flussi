import { win32 } from 'node:path';
import {
  CLES_CONFIGURATION,
  CLES_DEV,
  CLES_SECRETES,
  MODES,
  estCheminDossier,
  type CleConfiguration,
  type Configuration,
  type Mode,
} from '@shared/schemas/config';

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
  { ok: true; configuration: Configuration } | { ok: false; erreurs: ErreurConfiguration[] };

/** Racine de travail par défaut du mode prod (dossiers IN, OUT et Journal dérivés). */
export const DOSSIER_TRAVAIL_PROD =
  'P:\\Siege\\Service administratif\\MATH\\APIVIA Transfert\\Transferts';

const MESSAGE_CHEMIN =
  'chemin absolu attendu (lecteur « X:\\… » ou réseau « \\\\serveur\\partage\\… »).';

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

  // 4 et 5. Dossiers : valeurs par défaut du mode, puis dérivation depuis la racine de travail
  const verifier = (cle: CleConfiguration): string | undefined => {
    if (clesEnErreur.has(cle)) return undefined;
    const retenue = lire(cle);
    if (!retenue) return undefined;
    if (!estCheminDossier(retenue)) {
      signaler(fichier, cle, MESSAGE_CHEMIN);
      return undefined;
    }
    return retenue;
  };

  const travailExplicite = verifier('STOCKAGE_DOSSIER_TRAVAIL');
  const travail = travailExplicite ?? (mode === 'prod' ? DOSSIER_TRAVAIL_PROD : undefined);
  const racine = travail !== undefined && !clesEnErreur.has('STOCKAGE_DOSSIER_TRAVAIL');

  const dossierIn = verifier('STOCKAGE_DOSSIER_IN');
  const dossierOut = verifier('STOCKAGE_DOSSIER_OUT');
  const dossierJournal = verifier('STOCKAGE_DOSSIER_JOURNAL');

  const resolus = {
    in: dossierIn ?? (racine ? win32.join(travail, 'IN') : undefined),
    out: dossierOut ?? (racine ? win32.join(travail, 'OUT') : undefined),
    journal: dossierJournal ?? (racine ? win32.join(travail, 'Journal') : undefined),
  };

  const manquant =
    ((resolus.in === undefined && !clesEnErreur.has('STOCKAGE_DOSSIER_IN')) ||
      (resolus.out === undefined && !clesEnErreur.has('STOCKAGE_DOSSIER_OUT')) ||
      (resolus.journal === undefined && !clesEnErreur.has('STOCKAGE_DOSSIER_JOURNAL'))) &&
    !clesEnErreur.has('STOCKAGE_DOSSIER_TRAVAIL') &&
    mode !== null;
  if (manquant) {
    signaler(
      fichier,
      undefined,
      'STOCKAGE_DOSSIER_TRAVAIL manquant (ou les trois STOCKAGE_DOSSIER_IN, STOCKAGE_DOSSIER_OUT, STOCKAGE_DOSSIER_JOURNAL).',
    );
  }

  if (
    erreurs.length > 0 ||
    mode === null ||
    resolus.in === undefined ||
    resolus.out === undefined ||
    resolus.journal === undefined
  ) {
    return { ok: false, erreurs };
  }

  return {
    ok: true,
    configuration: {
      mode,
      dossiers: {
        travail: travail ?? null,
        in: resolus.in,
        out: resolus.out,
        journal: resolus.journal,
      },
    },
  };
}
