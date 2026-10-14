// Contrôle des noms relatifs passés par les services. Pur : aucun appel au système de fichiers.
// Un service ne sort jamais de son emplacement, et ne produit jamais un nom que Windows
// transformerait en silence (point ou espace final, nom réservé, flux NTFS).

export type ResultatChemin = { ok: true; segments: string[] } | { ok: false; raison: string };

const SEPARATEURS = /[\\/]/;
const LECTEUR_EN_TETE = /^[A-Za-z]:/;
const CARACTERES_INTERDITS = '<>:"|?*';
// CON, PRN, AUX, NUL, COM0-9 et LPT0-9 (avec les exposants ¹ ² ³), CONIN$ et CONOUT$ (périphériques
// de la console), avec ou sans extension, casse ignorée. Le `$` de CONIN$ et CONOUT$ est un
// caractère autorisé : il faut donc les refuser ici.
const NOMS_RESERVES = /^(CON|PRN|AUX|NUL|COM[0-9¹²³]|LPT[0-9¹²³]|CONIN\$|CONOUT\$)$/i;

function refus(raison: string): ResultatChemin {
  return { ok: false, raison };
}

/** Un caractère interdit sous Windows : `< > : " | ? *` (`:` couvre les flux NTFS) ou U+0000 à U+001F. */
function contientCaractereInterdit(segment: string): boolean {
  for (let i = 0; i < segment.length; i++) {
    if (segment.charCodeAt(i) < 0x20 || CARACTERES_INTERDITS.includes(segment.charAt(i))) {
      return true;
    }
  }
  return false;
}

function raisonSegment(segment: string): string | null {
  if (segment === '') return 'segment vide interdit';
  if (segment === '.') return 'segment « . » interdit';
  if (segment === '..') return 'segment « .. » interdit';
  if (contientCaractereInterdit(segment)) {
    return 'caractère interdit sous Windows dans le nom (< > : " | ? * ou caractère de contrôle)';
  }
  if (segment.endsWith('.') || segment.endsWith(' ')) {
    return 'un nom ne peut pas se terminer par un point ou une espace';
  }
  // Réservé avec ou sans extension (NUL.txt), et même avec des espaces avant le point
  const base = segment.split('.')[0]?.trimEnd() ?? '';
  if (NOMS_RESERVES.test(base)) return 'nom réservé par Windows';
  return null;
}

/**
 * Découpe un nom relatif (séparateurs `/` et `\` acceptés) en segments, ou donne la raison du
 * refus. Le nom vide est refusé : l'appelant qui accepte la racine (`lister`) traite ce cas
 * avant d'appeler cette fonction.
 */
export function decouperCheminRelatif(nom: string): ResultatChemin {
  if (nom === '') return refus('nom vide interdit');
  if (LECTEUR_EN_TETE.test(nom) || SEPARATEURS.test(nom.charAt(0))) {
    return refus('chemin absolu interdit');
  }

  const segments = nom.split(SEPARATEURS);
  for (const segment of segments) {
    const raison = raisonSegment(segment);
    if (raison) return refus(raison);
  }
  return { ok: true, segments };
}
