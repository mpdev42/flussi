import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseEnv } from 'node:util';
import {
  resoudreConfiguration,
  type ErreurConfiguration,
  type ResultatConfiguration,
} from './resolution';

// Entrées-sorties de la configuration. Les paramètres sont injectés : testable sans Electron.

export interface ParametresChargement {
  /** `app.isPackaged` : application installée (config.json) ou développement (.env). */
  estInstallee: boolean;
  /** Dossier %ProgramData% (application installée). */
  dossierProgramData: string;
  /** Dossier courant, où se trouve le .env (dev). */
  dossierCourant: string;
}

type LectureFichier = { ok: true; texte: string } | { ok: false; absent: boolean; erreur: string };

function lireTexte(chemin: string): LectureFichier {
  try {
    // BOM UTF-8 retiré (PowerShell 5.1 en écrit un)
    return { ok: true, texte: readFileSync(chemin, 'utf8').replace(/^\uFEFF/, '') };
  } catch (erreur) {
    const code = (erreur as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') return { ok: false, absent: true, erreur: 'fichier introuvable.' };
    return {
      ok: false,
      absent: false,
      erreur: `fichier illisible (${code ?? 'erreur inconnue'}).`,
    };
  }
}

function echec(source: string, message: string): ResultatConfiguration {
  return { ok: false, erreurs: [{ source, message }] };
}

function chargerInstallee(parametres: ParametresChargement): ResultatConfiguration {
  const fichier = join(parametres.dossierProgramData, 'Flussi', 'config.json');
  const lecture = lireTexte(fichier);
  if (!lecture.ok) {
    return echec(
      fichier,
      lecture.absent ? 'fichier introuvable, il est obligatoire.' : lecture.erreur,
    );
  }

  let contenu: unknown;
  try {
    contenu = JSON.parse(lecture.texte);
  } catch {
    // Le détail de l'erreur de syntaxe est omis : il peut citer un extrait du contenu
    return echec(fichier, 'JSON invalide.');
  }
  if (typeof contenu !== 'object' || contenu === null || Array.isArray(contenu)) {
    return echec(fichier, 'un objet JSON de clés à plat est attendu.');
  }

  return resoudreConfiguration({
    contexte: 'installee',
    fichier,
    valeursFichier: contenu as Record<string, unknown>,
  });
}

function chargerDev(parametres: ParametresChargement): ResultatConfiguration {
  const fichier = join(parametres.dossierCourant, '.env');
  const lecture = lireTexte(fichier);
  if (!lecture.ok && !lecture.absent) return echec(fichier, lecture.erreur);

  // parseEnv plutôt que process.loadEnvFile : il faut les clés du fichier (clés inconnues),
  // et les mots de passe ne doivent pas être versés dans process.env. Les variables du processus
  // sont ignorées : un terminal peut en porter une copie figée du .env.
  const valeursFichier = lecture.ok ? parseEnv(lecture.texte) : {};

  return resoudreConfiguration({ contexte: 'dev', fichier, valeursFichier });
}

/** Charge et résout la configuration. config.json n'est jamais lu en dev, le .env jamais installé. */
export function chargerConfiguration(parametres: ParametresChargement): ResultatConfiguration {
  return parametres.estInstallee ? chargerInstallee(parametres) : chargerDev(parametres);
}

/** Texte de la boîte de dialogue de refus, groupé par fichier. */
export function formaterErreurs(erreurs: ErreurConfiguration[]): string {
  const parSource = new Map<string, ErreurConfiguration[]>();
  for (const erreur of erreurs) {
    const groupe = parSource.get(erreur.source) ?? [];
    groupe.push(erreur);
    parSource.set(erreur.source, groupe);
  }

  const blocs = [...parSource.entries()].map(([source, groupe]) => {
    const lignes = groupe.map((e) => (e.cle ? `- ${e.cle} : ${e.message}` : `- ${e.message}`));
    return [`Fichier : ${source}`, ...lignes].join('\n');
  });

  return [
    'La configuration de Flussi est invalide.',
    blocs.join('\n\n'),
    'Contactez le service informatique.',
  ].join('\n\n');
}
