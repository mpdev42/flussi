/**
 * Pluralise un libellé selon la règle française (0 et 1 → singulier).
 * Pour l'anglais, adapter en `n === 1 ? singular : plural`.
 */
export function pluralize(n: number, singular: string, plural: string): string {
  return n <= 1 ? singular : plural;
}
