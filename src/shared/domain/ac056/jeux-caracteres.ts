// Jeux de caractères autorisés dans les champs AC056 contrôlés, et octets interdits partout.
// Les jeux sont reportés de `uconstantes.pas` lignes 70 à 74, fichier hors dépôt (il contient des
// mots de passe en clair). Un jeu est un ensemble d'octets : aucun décodage, le contrôle de
// Lazarus (`is_texte_valide`) porte sur des `AnsiString`, un caractère = un octet.
import type { Octets } from './octets';

export type JeuCaracteres = ReadonlySet<number>;

const octetsDe = (caracteres: string): number[] =>
  Array.from(caracteres, (caractere) => caractere.charCodeAt(0));

/** Octets de `debut` à `fin` inclus (deux caractères ASCII). */
function plage(debut: string, fin: string): number[] {
  const octets: number[] = [];
  for (let o = debut.charCodeAt(0); o <= fin.charCodeAt(0); o++) octets.push(o);
  return octets;
}

const CHIFFRES = plage('0', '9');
const MAJUSCULES = plage('A', 'Z');

/** `NUMERIQUE` : 0 à 9. */
export const JEU_NUMERIQUE: JeuCaracteres = new Set(CHIFFRES);

/** `LISTE_3` : chiffres et majuscules. */
export const JEU_LISTE_3: JeuCaracteres = new Set([...CHIFFRES, ...MAJUSCULES]);

/** `LISTE_1` : chiffres, majuscules, espace, tiret, apostrophe, barre oblique et point. */
export const JEU_LISTE_1: JeuCaracteres = new Set([...JEU_LISTE_3, ...octetsDe(" -'/.")]);

/** `LISTE_2` : `LISTE_1`, minuscules, tiret bas et arobase. */
export const JEU_LISTE_2: JeuCaracteres = new Set([
  ...JEU_LISTE_1,
  ...plage('a', 'z'),
  ...octetsDe('_@'),
]);

/** `is_texte_valide` : chaque octet de la valeur est dans le jeu. Une valeur vide est valide. */
export function estTexteValide(valeur: Octets, jeu: JeuCaracteres): boolean {
  for (let i = 0; i < valeur.length; i++) {
    if (!jeu.has(valeur.charCodeAt(i))) return false;
  }
  return true;
}

/**
 * Octet interdit dans tout champ (divergence 5, absente de Lazarus) : octet de contrôle (< 0x20),
 * DEL (0x7F) et tout octet >= 0x80 (accents, séquences UTF-8 multi-octets).
 */
export function estOctetInterdit(octet: number): boolean {
  return octet < 0x20 || octet === 0x7f || octet >= 0x80;
}
