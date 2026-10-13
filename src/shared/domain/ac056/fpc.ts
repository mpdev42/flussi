// Primitives Free Pascal reproduites à l'octet : `Trim` (unité System) et `AddCharR` (StrUtils).
import type { Bourrage } from './entites';
import { joindreOctets, octetsDepuisTexte, sousOctets, type Octets } from './octets';

/** `Trim` FPC : retire en tête et en fin tout octet <= 0x20. Garde 0x7F, 0x80, 0xA0, 0xFF. */
export function trimFpc(valeur: Octets): Octets {
  let debut = 0;
  let fin = valeur.length;
  while (debut < fin && valeur.charCodeAt(debut) <= 0x20) debut++;
  while (fin > debut && valeur.charCodeAt(fin - 1) <= 0x20) fin--;
  return sousOctets(valeur, debut, fin);
}

/** `AddCharR` : bourrage à droite jusqu'à `longueur`, jamais de troncature. */
export function addCharR(caractere: Bourrage, valeur: Octets, longueur: number): Octets {
  if (valeur.length >= longueur) return valeur;
  return joindreOctets([valeur, octetsDepuisTexte(caractere.repeat(longueur - valeur.length))]);
}
