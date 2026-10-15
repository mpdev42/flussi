import { z } from 'zod';

// Schémas du module Parametres. Pur TypeScript : aucun import Node (partagé avec le renderer).

/** Noms des dossiers de travail : exactement les clés de `Configuration.dossiers`. */
export const DOSSIERS_TRAVAIL = ['travail', 'in', 'out', 'journal'] as const;

/** Argument de `config:ouvrir-dossier` : un nom de dossier, jamais un chemin. */
export const dossierTravailSchema = z.enum(DOSSIERS_TRAVAIL);
