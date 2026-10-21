import { z } from 'zod';
import type { CorrectionAc056 } from '../domain/ac056/enregistrement';

// Schémas du module Ac056. Pur TypeScript : aucun import Node (partagé avec le renderer).

/** Dossiers de travail dans lesquels l'écran choisit un fichier AC056. */
export const EMPLACEMENTS_AC056 = ['in', 'out'] as const;
export type EmplacementAc056 = (typeof EMPLACEMENTS_AC056)[number];

export const emplacementAc056Schema = z.enum(EMPLACEMENTS_AC056);

/** Longueur maximale d'un nom de fichier (limite d'un composant de chemin Windows). */
const LONGUEUR_MAX_NOM = 255;

// Barres, deux-points et caractères interdits dans un nom Windows
const CARACTERES_INTERDITS = /[\\/:*?"<>|]/;
const CARACTERE_DE_CONTROLE = /[\u0000-\u001f\u007f]/;

/**
 * Nom d'un fichier AC056 : un nom seul (jamais un chemin), extension `.txt` (casse indifférente,
 * comme le filtre `*.txt` de Lazarus). Le main revalide ensuite par l'adapter `stockage`.
 *
 * Aucune règle sur « .. » : sans séparateur (`\` ou `/`), un nom ne peut pas être un segment `..`
 * (l'extension `.txt` finale l'en empêche), et `a..txt` est un nom NTFS valide.
 */
export const nomFichierAc056Schema = z
  .string()
  .min(1)
  .max(LONGUEUR_MAX_NOM)
  .refine((nom) => !CARACTERES_INTERDITS.test(nom), 'Nom de fichier : caractère interdit')
  .refine((nom) => !CARACTERE_DE_CONTROLE.test(nom), 'Nom de fichier : caractère de contrôle')
  .refine((nom) => /\.txt$/i.test(nom), 'Nom de fichier : extension .txt attendue');

/** Argument de `ac056:ouvrir` : emplacement logique et nom de fichier, jamais un chemin. */
export const fichierAc056Schema = z.strictObject({
  emplacement: emplacementAc056Schema,
  nom: nomFichierAc056Schema,
});
export type CibleFichierAc056 = z.infer<typeof fichierAc056Schema>;

/**
 * Une correction de l'écran (`correctionsAc056`) : le champ (nom Flussi) de la ligne et le texte de
 * la valeur gardée. Le type est celui du domaine (`CorrectionAc056`), vérifié par `satisfies`.
 */
export const correctionAc056Schema = z.strictObject({
  ligne: z.number().int().min(1).max(1_000_000),
  champ: z.string().regex(/^[A-Za-z][A-Za-z0-9]{0,63}$/),
  texte: z.string().max(700),
}) satisfies z.ZodType<CorrectionAc056>;

/**
 * Argument de `ac056:enregistrer` : le fichier ouvert, l'empreinte SHA-256 de ses octets à
 * l'ouverture (le main refuse d'écrire si le fichier a changé depuis) et les corrections saisies,
 * au plus une par couple (ligne, champ).
 */
export const enregistrementAc056Schema = z
  .strictObject({
    emplacement: emplacementAc056Schema,
    nom: nomFichierAc056Schema,
    empreinte: z.string().regex(/^[0-9a-f]{64}$/),
    corrections: z.array(correctionAc056Schema).max(10_000),
  })
  .refine(
    ({ corrections }) =>
      new Set(corrections.map((c) => `${c.ligne}:${c.champ}`)).size === corrections.length,
    { message: 'Corrections : un seul texte par ligne et par champ', path: ['corrections'] },
  );
export type DemandeEnregistrementAc056 = z.infer<typeof enregistrementAc056Schema>;

/** Argument de `ac056:modifications` : le fichier aux corrections non enregistrées, sinon `null`. */
export const modificationsAc056Schema = z.strictObject({ fichier: fichierAc056Schema.nullable() });
