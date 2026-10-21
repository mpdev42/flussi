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

/**
 * Contenu sans ses lignes vides : ce que l'écrivain doit reproduire d'un fichier VEOS qui en
 * contient (supprimées à l'enregistrement, avec leur fin de ligne). Découpage indépendant du
 * lecteur : fins de ligne CRLF, LF ou CR, BOM UTF-8 de tête conservé, dernière ligne sans fin de
 * ligne gardée telle quelle.
 */
export function sansLignesVides(octets: Uint8Array): Uint8Array {
  const bom = octets[0] === 0xef && octets[1] === 0xbb && octets[2] === 0xbf;
  const parties: Uint8Array[] = [octets.subarray(0, bom ? LONGUEUR_BOM : 0)];
  let debut = bom ? LONGUEUR_BOM : 0;
  let i = debut;
  while (i < octets.length) {
    const octet = octets[i];
    if (octet !== 0x0d && octet !== 0x0a) {
      i += 1;
      continue;
    }
    const fin = octet === 0x0d && octets[i + 1] === 0x0a ? i + 2 : i + 1;
    if (i > debut) parties.push(octets.subarray(debut, fin));
    debut = fin;
    i = fin;
  }
  if (debut < octets.length) parties.push(octets.subarray(debut));

  const resultat = new Uint8Array(parties.reduce((total, p) => total + p.length, 0));
  let position = 0;
  for (const partie of parties) {
    resultat.set(partie, position);
    position += partie.length;
  }
  return resultat;
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
