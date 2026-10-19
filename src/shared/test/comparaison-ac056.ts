// Aides de comparaison pour les tests de parité AC056 sur le corpus réel.
// Jamais de valeur du corpus dans un message : seulement fichier, ligne, octet, entité, champ.
import { createHash } from 'node:crypto';
import { ENTITES, LONGUEUR_LIGNE } from '@shared/domain/ac056/entites';
import type { FichierAc056 } from '@shared/domain/ac056/modele';
import { decrireEcart } from './corpus';

const LONGUEUR_BOM = 3;

/**
 * Contenu sans ses octets 0x1A (Ctrl-Z) de la toute fin : ce que l'écrivain doit reproduire d'un
 * fichier VEOS terminé par Ctrl-Z (retirés à la lecture, parité `CtrlZMarksEOF` de FPC). Vue sur le
 * même tampon, sans copie.
 */
export function sansCtrlZFinal(octets: Uint8Array): Uint8Array {
  let longueur = octets.length;
  while (longueur > 0 && octets[longueur - 1] === 0x1a) longueur -= 1;
  return octets.subarray(0, longueur);
}

/** Empreinte SHA-256 (hexadécimale) d'un contenu. */
export function empreinteSha256(octets: Uint8Array): string {
  return createHash('sha256').update(octets).digest('hex');
}

/**
 * Décrit un écart (de `localiserEcart`) : `fichier : ligne L, octet O`, complété par
 * `, entité {code}, champ {nom}` déduits de la ligne et de la position dans le fichier lu.
 * La ligne est celle de `localiserEcart` (comptée aux octets LF) : elle correspond au `numero`
 * d'une ligne du fichier tant que les fins de ligne sont CRLF ou LF. Le champ n'est donné que
 * pour une ligne de 700 octets. Ne révèle jamais une valeur.
 */
export function decrireEcartAc056(
  nom: string,
  ecart: { ligne: number; octet: number },
  fichier: Pick<FichierAc056, 'bom' | 'lignes'>,
): string {
  const base = decrireEcart(nom, ecart);
  const ligne = fichier.lignes.find((l) => l.numero === ecart.ligne);
  if (ligne === undefined || ligne.code === null) return base;

  const octet = ecart.octet - (ecart.ligne === 1 && fichier.bom ? LONGUEUR_BOM : 0);
  const avecEntite = `${base}, entité ${ligne.code}`;
  if (ligne.origine.length !== LONGUEUR_LIGNE || octet < 1 || octet > LONGUEUR_LIGNE) {
    return avecEntite;
  }

  const champ = ENTITES[ligne.code].champs.find(
    (c) => octet >= c.position && octet < c.position + c.longueur,
  );
  return champ === undefined ? avecEntite : `${avecEntite}, champ ${champ.nom}`;
}
