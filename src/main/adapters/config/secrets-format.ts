import { z } from 'zod';

// Format du contenu de secrets.bin, avant chiffrement : JSON UTF-8 sans BOM
// `{ format: 1, secrets: { <identifiant>: { valeur, date } } }`. Pur, aucune entrée-sortie.

export interface SecretEnregistre {
  valeur: string;
  /** ISO 8601 UTC (`toISOString`). */
  date: string;
}

export type ContenuSecrets = Record<string, SecretEnregistre>;

const contenuSchema = z.object({
  format: z.literal(1),
  // Les identifiants inconnus sont conservés : une version plus récente peut en avoir ajouté
  secrets: z.record(z.string(), z.strictObject({ valeur: z.string(), date: z.iso.datetime() })),
});

export function encoderSecrets(secrets: ContenuSecrets): Uint8Array {
  return new TextEncoder().encode(JSON.stringify({ format: 1, secrets }));
}

/**
 * Décode le contenu déchiffré. Aucun détail d'échec : le message de `JSON.parse` et celui de zod
 * peuvent recopier un extrait du contenu, donc d'un secret.
 */
export function decoderSecrets(
  octets: Uint8Array,
): { ok: true; secrets: ContenuSecrets } | { ok: false } {
  let contenu: unknown;
  try {
    contenu = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(octets));
  } catch {
    return { ok: false };
  }
  const analyse = contenuSchema.safeParse(contenu);
  return analyse.success ? { ok: true, secrets: analyse.data.secrets } : { ok: false };
}
