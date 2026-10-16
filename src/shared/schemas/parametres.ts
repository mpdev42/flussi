import { z } from 'zod';
import { contientCaractereControle } from './config';

// Schémas du module Parametres. Pur TypeScript : aucun import Node (partagé avec le renderer).

/** Noms des dossiers de travail : exactement les clés de `Configuration.dossiers`. */
export const DOSSIERS_TRAVAIL = ['travail', 'in', 'out', 'journal'] as const;

/** Argument de `config:ouvrir-dossier` : un nom de dossier, jamais un chemin. */
export const dossierTravailSchema = z.enum(DOSSIERS_TRAVAIL);

/** Désignation d'un dossier dans les messages (« Dossier de travail », « Dossier IN »…). */
export const DESIGNATIONS_DOSSIER: Record<(typeof DOSSIERS_TRAVAIL)[number], string> = {
  travail: 'de travail',
  in: 'IN',
  out: 'OUT',
  journal: 'Journal',
};

/** Identifiants des secrets techniques, saisis par l'administrateur. */
export const SECRETS_TECHNIQUES = [
  'iga-ftp-mot-de-passe',
  'msp-sftp-mot-de-passe',
  'msp-sftp-cle-privee',
] as const;

/** Secrets saisis au clavier (la clé privée, elle, est importée depuis un fichier). */
export const MOTS_DE_PASSE = ['iga-ftp-mot-de-passe', 'msp-sftp-mot-de-passe'] as const;

/** Désignation d'un secret dans les messages et le journal. */
export const DESIGNATIONS_SECRET: Record<(typeof SECRETS_TECHNIQUES)[number], string> = {
  'iga-ftp-mot-de-passe': 'Mot de passe FTP IGA',
  'msp-sftp-mot-de-passe': 'Mot de passe SFTP MSP',
  'msp-sftp-cle-privee': 'Clé privée SFTP MSP',
};

export const LONGUEUR_MAX_MOT_DE_PASSE = 256;

const motDePasseSchema = z
  .string()
  .min(1)
  .max(LONGUEUR_MAX_MOT_DE_PASSE)
  .refine((valeur) => !contientCaractereControle(valeur));

/**
 * Argument de `secrets:enregistrer` : écriture seule, aucun canal de relecture. `motsDePasse` ne
 * contient que les mots de passe à changer ; `cle` demande l'enregistrement de la clé préparée
 * (`secrets:preparer-cle`). Au moins un changement. Un échec de validation ne doit jamais citer une
 * valeur (voir le handler IPC).
 */
export const enregistrementSecretsSchema = z
  .strictObject({
    motsDePasse: z.strictObject({
      'iga-ftp-mot-de-passe': motDePasseSchema.optional(),
      'msp-sftp-mot-de-passe': motDePasseSchema.optional(),
    }),
    cle: z.boolean(),
  })
  .refine(
    (demande) => demande.cle || Object.values(demande.motsDePasse).some((v) => v !== undefined),
  );
