import { z } from 'zod';

// Schéma de la configuration de Flussi. Pur TypeScript : aucun import Node (partagé avec le renderer).

export const MODES = ['recette', 'prod'] as const;
export type Mode = (typeof MODES)[number];

/** Clés non secrètes, lisibles dans config.json (application installée) ou le .env (dev). */
export const CLES_CONFIGURATION = [
  'FLUSSI_ENV',
  'STOCKAGE_DOSSIER_TRAVAIL',
  // Connues mais pas encore résolues : valeurs par défaut et validation en v0.4.0 et v0.5.0
  'VEOS_URL',
  'VEOS_WORKFLOW_EXPORT_ID',
  'IGA_FTP_HOST',
  'IGA_FTP_USER',
  'IGA_FTP_DOSSIER',
  'MSP_SFTP_HOST',
  'MSP_SFTP_PORT',
  'MSP_SFTP_USER',
  'MSP_SFTP_DOSSIER_DEPOT',
  'MSP_SFTP_DOSSIER_RETRAIT',
] as const;
export type CleConfiguration = (typeof CLES_CONFIGURATION)[number];

/** Secrets : acceptés dans le .env en dev seulement, refusés dans config.json, jamais résolus. */
export const CLES_SECRETES = [
  'IGA_FTP_PASSWORD',
  'MSP_SFTP_PASSWORD',
  'MSP_SFTP_CLE_PRIVEE_CHEMIN',
] as const;

/** Clés réservées au développement : acceptées seulement dans le .env (tests). */
export const CLES_DEV = ['AC056_CORPUS_DIR'] as const;

/** Chemin absolu Windows : lecteur (`X:\…`) ou UNC (`\\serveur\partage\…`). */
const CHEMIN_DOSSIER = /^(?:[A-Za-z]:\\|\\\\[^\\/:*?"<>|]+\\[^\\/:*?"<>|]+)/;

/**
 * Vrai si la valeur contient un caractère de contrôle (U+0000 à U+001F), où que ce soit.
 * Typiquement un `\n` produit par un chemin entre guillemets doubles dans le .env,
 * ou par une barre oblique inverse non doublée dans config.json.
 * Test par code de caractère : la règle ESLint `no-control-regex` refuse l'expression régulière.
 */
export function contientCaractereControle(valeur: string): boolean {
  for (let i = 0; i < valeur.length; i += 1) {
    if (valeur.charCodeAt(i) < 0x20) return true;
  }
  return false;
}

export function estCheminDossier(valeur: string): boolean {
  return !contientCaractereControle(valeur) && CHEMIN_DOSSIER.test(valeur);
}

export const cheminDossierSchema = z
  .string()
  .refine(estCheminDossier, { message: 'chemin absolu Windows attendu' });

export const configurationSchema = z.strictObject({
  mode: z.enum(MODES),
  dossiers: z.strictObject({
    /** Racine de travail : `in`, `out` et `journal` en sont dérivés (`IN`, `OUT`, `Journal`). */
    travail: cheminDossierSchema,
    in: cheminDossierSchema,
    out: cheminDossierSchema,
    journal: cheminDossierSchema,
  }),
});

/** Configuration résolue. Aucun secret, jamais. */
export type Configuration = z.infer<typeof configurationSchema>;
