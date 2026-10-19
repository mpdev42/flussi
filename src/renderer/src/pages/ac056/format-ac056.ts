import type { AnalyseAc056 } from '@shared/domain/ac056';

import { pluralize } from '@/lib/pluralize';

/** Nombre de fichiers affichés d'un coup dans une carte, et à chaque « Afficher les fichiers suivants ». */
export const TAILLE_TRANCHE = 100;

const INCONNU = '—';

const deuxChiffres = (n: number): string => String(n).padStart(2, '0');

/** ISO 8601 (UTC) → `17/10/2026 à 08:05` en heure locale ; `—` si absente ou illisible. */
export function formaterDateHeure(iso: string | null): string {
  if (iso === null) return INCONNU;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return INCONNU;
  const jour = `${deuxChiffres(date.getDate())}/${deuxChiffres(date.getMonth() + 1)}/${date.getFullYear()}`;
  return `${jour} à ${deuxChiffres(date.getHours())}:${deuxChiffres(date.getMinutes())}`;
}

/**
 * Taille en octets → `612 Ko` (arrondi à l'unité, 1 Ko minimum pour un fichier non vide) ou
 * `3,9 Mo` (une décimale, virgule) ; `—` si inconnue. Base 1024, comme l'Explorateur.
 */
export function formaterTaille(octets: number | null): string {
  if (octets === null || !Number.isFinite(octets) || octets < 0) return INCONNU;
  const ko = octets === 0 ? 0 : Math.max(1, Math.round(octets / 1024));
  if (ko < 1024) return `${ko} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`;
}

/**
 * Cause en minuscules sans point final (`ErreurAc056.message`) → phrase : première lettre en
 * majuscule, point final.
 */
export function causeEnPhrase(cause: string): string {
  const texte = cause.trim();
  if (texte === '') return texte;
  const phrase = texte.charAt(0).toUpperCase() + texte.slice(1);
  return /[.!?…]$/.test(phrase) ? phrase : `${phrase}.`;
}

/** Anomalie « fichier-vide » de l'analyse (aucune ligne AC056), ou `undefined`. */
export function anomalieFichierVide(analyse: AnalyseAc056) {
  return analyse.anomalies.find((anomalie) => anomalie.code === 'fichier-vide');
}

/** `Aucun fichier`, `1 fichier · du plus récent au plus ancien`, `3 fichiers · …`. */
export function descriptionCarte(nombre: number): string {
  if (nombre === 0) return 'Aucun fichier';
  return `${nombre} ${pluralize(nombre, 'fichier', 'fichiers')} · du plus récent au plus ancien`;
}
