import { z } from 'zod';

// Schéma de la configuration de Flussi. Pur TypeScript : aucun import Node (partagé avec le renderer).

export const MODES = ['recette', 'prod'] as const;
export type Mode = (typeof MODES)[number];

/** Clés non secrètes, lisibles dans config.json (application installée) ou le .env (dev). */
export const CLES_CONFIGURATION = [
  'FLUSSI_ENV',
  'STOCKAGE_DOSSIER_TRAVAIL',
  'STOCKAGE_DOSSIER_IN',
  'STOCKAGE_DOSSIER_OUT',
  'STOCKAGE_DOSSIER_JOURNAL',
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

export function estCheminDossier(valeur: string): boolean {
  return CHEMIN_DOSSIER.test(valeur);
}

export const cheminDossierSchema = z
  .string()
  .refine(estCheminDossier, { message: 'chemin absolu Windows attendu' });

export const configurationSchema = z.strictObject({
  mode: z.enum(MODES),
  dossiers: z.strictObject({
    /** Racine de travail, ou null quand les trois dossiers sont renseignés séparément. */
    travail: cheminDossierSchema.nullable(),
    in: cheminDossierSchema,
    out: cheminDossierSchema,
    journal: cheminDossierSchema,
  }),
});

/** Configuration résolue. Aucun secret, jamais. */
export type Configuration = z.infer<typeof configurationSchema>;
