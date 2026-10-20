// Gel en profondeur des tables de description (l'écran les lit : aucune ne doit être modifiable).

/**
 * Gèle `valeur` et, récursivement, tous les objets et tableaux qu'elle contient. Les références
 * sont conservées (une liste partagée reste la même liste). Renvoie `valeur`.
 */
export function figerProfond<T>(valeur: T): T {
  if (typeof valeur === 'object' && valeur !== null) {
    Object.freeze(valeur);
    for (const enfant of Object.values(valeur)) figerProfond(enfant);
  }
  return valeur;
}
