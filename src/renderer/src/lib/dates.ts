/** `2026-10-14` → `14/10/2026`. */
export function formaterDate(date: string): string {
  const [annee, mois, jour] = date.split('-');
  return `${jour}/${mois}/${annee}`;
}
