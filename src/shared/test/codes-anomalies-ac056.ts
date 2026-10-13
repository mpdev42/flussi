// Codes d'anomalie AC056 partagés par les tests du domaine.
import type { CodeAnomalie } from '@shared/domain/ac056/modele';

/** Anomalies de format du fichier (non bloquantes) : BOM, fins de ligne, lignes vides. */
export const CODES_FORMAT: readonly CodeAnomalie[] = [
  'bom',
  'fin-de-ligne-lf',
  'fin-de-ligne-cr',
  'ligne-vide',
];
