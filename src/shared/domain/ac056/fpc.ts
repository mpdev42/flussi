// Primitives Free Pascal reproduites à l'octet : `Trim` (unité System), `AddCharR` (StrUtils) et
// `StrToInt`.
import type { Bourrage } from './entites';
import { joindreOctets, repeterOctet, sousOctets, type Octets } from './octets';

/** `Trim` FPC : retire en tête et en fin tout octet <= 0x20. Garde 0x7F, 0x80, 0xA0, 0xFF. */
export function trimFpc(valeur: Octets): Octets {
  let debut = 0;
  let fin = valeur.length;
  while (debut < fin && valeur.charCodeAt(debut) <= 0x20) debut++;
  while (fin > debut && valeur.charCodeAt(fin - 1) <= 0x20) fin--;
  return sousOctets(valeur, debut, fin);
}

/** Côté droit de `Trim` FPC : retire en fin tout octet <= 0x20, garde la tête (même définition). */
export function trimDroiteFpc(valeur: Octets): Octets {
  let fin = valeur.length;
  while (fin > 0 && valeur.charCodeAt(fin - 1) <= 0x20) fin--;
  return sousOctets(valeur, 0, fin);
}

/** `AddCharR` : bourrage à droite jusqu'à `longueur`, jamais de troncature. */
export function addCharR(caractere: Bourrage, valeur: Octets, longueur: number): Octets {
  if (valeur.length >= longueur) return valeur;
  return joindreOctets([valeur, repeterOctet(caractere, longueur - valeur.length)]);
}

const OCTET_ESPACE = 0x20;
const OCTET_TABULATION = 0x09;
const OCTET_PLUS = 0x2b;
const OCTET_MOINS = 0x2d;
const OCTET_ZERO = 0x30;
const OCTET_NUL = 0x00;
const ENTIER_MAX = 2 ** 31 - 1;

/** Valeur d'un chiffre (0-9, A-F, a-f) en octet, ou -1. */
function valeurChiffre(octet: number): number {
  if (octet >= 0x30 && octet <= 0x39) return octet - 0x30;
  if (octet >= 0x41 && octet <= 0x46) return octet - 0x41 + 10;
  if (octet >= 0x61 && octet <= 0x66) return octet - 0x61 + 10;
  return -1;
}

/**
 * `StrToInt` FPC 3.2 (`InitVal` puis `fpc_Val_SInt_ShortStr`) : null = `EConvertError`.
 * Espaces et tabulations de tête ignorés, signe, préfixe de base (`$`, `x`, `X`, `0x`, `%`, `&`),
 * zéros de tête, un NUL arrête la lecture. Rien ne suit un chiffre invalide : `'5 '` échoue.
 * Entier 32 bits signé, comme `Integer` de FPC.
 */
export function strToIntFpc(valeur: Octets): number | null {
  const n = valeur.length;
  const octet = (i: number) => valeur.charCodeAt(i);
  let i = 0;

  while (i < n && (octet(i) === OCTET_ESPACE || octet(i) === OCTET_TABULATION)) i++;

  let negatif = false;
  if (i < n && octet(i) === OCTET_MOINS) {
    negatif = true;
    i++;
  } else if (i < n && octet(i) === OCTET_PLUS) {
    i++;
  }

  let base = 10;
  if (i < n) {
    const o = octet(i);
    if (o === 0x24 || o === 0x78 || o === 0x58) {
      base = 16; // `$`, `x`, `X`
      i++;
    } else if (o === 0x25) {
      base = 2; // `%`
      i++;
    } else if (o === 0x26) {
      base = 8; // `&`
      i++;
    } else if (o === OCTET_ZERO && i + 1 < n && (octet(i + 1) === 0x78 || octet(i + 1) === 0x58)) {
      base = 16; // `0x`
      i += 2;
    }
  }

  // Zéros de tête, sauf le dernier caractère (il porte la valeur 0).
  while (i < n - 1 && octet(i) === OCTET_ZERO) i++;
  if (i >= n) return null;

  // Un NUL juste après les zéros de tête n'est un succès que si ces zéros existent.
  if (octet(i) === OCTET_NUL) return i > 0 && octet(i - 1) === OCTET_ZERO ? 0 : null;

  let resultat = 0;
  for (; i < n; i++) {
    const o = octet(i);
    if (o === OCTET_NUL) break;
    const chiffre = valeurChiffre(o);
    if (chiffre < 0 || chiffre >= base) return null;
    resultat = resultat * base + chiffre;
    if (resultat > ENTIER_MAX + 1) return null;
  }

  if (!negatif) return resultat > ENTIER_MAX ? null : resultat;
  return resultat === 0 ? 0 : -resultat;
}
