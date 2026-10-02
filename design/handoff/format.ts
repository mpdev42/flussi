/**
 * French formats for Flussi. IBM Plex has no U+202F (narrow no-break space) glyph, which
 * Intl uses as the fr-FR thousands separator: we swap it for U+00A0 so figures stay aligned.
 */
const NBSP = ' ';
const fix = (s: string) => s.replace(/ /g, NBSP);

/** 02/10/2026 */
export function formatDate(d: Date): string {
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
}
/** 02/10/2026 à 08:12 */
export function formatDateTime(d: Date): string {
  const t = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(d);
  return `${formatDate(d)} à ${t}`;
}
/** 1 234,56 */
export function formatNumber(n: number, fractionDigits = 2): string {
  return fix(new Intl.NumberFormat('fr-FR', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }).format(n));
}
/** 1 234,56 € */
export function formatAmount(n: number): string {
  return fix(new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n));
}
/** 2,4 Mo — French byte units (octets). */
export function formatBytes(bytes: number): string {
  const units = ['o', 'Ko', 'Mo', 'Go'];
  let v = bytes, i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${fix(new Intl.NumberFormat('fr-FR', { maximumFractionDigits: i === 0 ? 0 : 1 }).format(v))}${NBSP}${units[i]}`;
}
