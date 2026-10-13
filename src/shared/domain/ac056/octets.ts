// Octets bruts d'un fichier AC056. Lazarus manipule des `AnsiString` (un caractère = un octet) :
// on les représente par une chaîne dont chaque caractère vaut U+0000..U+00FF, un par octet.
// Aucune conversion de jeu de caractères n'est faite sur les données (parité octet par octet).
// Seul fichier autorisé à fabriquer un `Octets` par assertion de type.

declare const MARQUE_OCTETS: unique symbol;

/** Octets bruts : un caractère U+0000..U+00FF par octet. Jamais du texte décodé. */
export type Octets = string & { readonly [MARQUE_OCTETS]: true };

/** Taille des tranches de `String.fromCharCode` (au-delà, RangeError sur une grosse ligne). */
const TAILLE_TRANCHE = 8192;

export function octetsDepuisTableau(tableau: Uint8Array): Octets {
  let resultat = '';
  for (let debut = 0; debut < tableau.length; debut += TAILLE_TRANCHE) {
    resultat += String.fromCharCode(...tableau.subarray(debut, debut + TAILLE_TRANCHE));
  }
  return resultat as Octets;
}

export function tableauDepuisOctets(octets: Octets): Uint8Array {
  const tableau = new Uint8Array(octets.length);
  for (let i = 0; i < octets.length; i++) {
    const code = octets.charCodeAt(i);
    if (code > 0xff) {
      throw new Error(`Octets invalides : caractère au-delà de 0xFF à l'indice ${i}.`);
    }
    tableau[i] = code;
  }
  return tableau;
}

/** Encode un texte en UTF-8. */
export function octetsDepuisTexte(texte: string): Octets {
  return octetsDepuisTableau(new TextEncoder().encode(texte));
}

/** Décode en UTF-8 non fatal (U+FFFD si invalide), pour l'affichage. */
export function texteDepuisOctets(octets: Octets): string {
  return new TextDecoder('utf-8').decode(tableauDepuisOctets(octets));
}

const DECODEUR_WINDOWS_1252 = new TextDecoder('windows-1252');
const DECODEUR_UTF8_STRICT = new TextDecoder('utf-8', { fatal: true });

/**
 * Décode des octets en Windows-1252 (messages des rejets MSP). Ne produit jamais U+FFFD : les
 * 5 octets non définis de CP1252 (0x81, 0x8D, 0x8F, 0x90, 0x9D) deviennent des contrôles C1.
 * Passe par `tableauDepuisOctets` : un décodage `latin1` de la chaîne serait faux (0x80 à 0x9F).
 */
export function texteWindows1252(octets: Octets): string {
  return DECODEUR_WINDOWS_1252.decode(tableauDepuisOctets(octets));
}

/** Vrai si les octets forment de l'UTF-8 valide (l'ASCII pur l'est). */
export function estUtf8Valide(tableau: Uint8Array): boolean {
  try {
    DECODEUR_UTF8_STRICT.decode(tableau);
    return true;
  } catch {
    return false;
  }
}

/** Sous-chaîne d'octets (`slice` d'une chaîne perdrait la marque de type). */
export function sousOctets(octets: Octets, debut: number, fin?: number): Octets {
  return octets.slice(debut, fin) as Octets;
}

/** Concatène des octets (mêmes raisons que `sousOctets`). */
export function joindreOctets(parties: readonly Octets[]): Octets {
  return parties.join('') as Octets;
}

/** Répète un octet (un caractère U+0000..U+00FF) `nombre` fois, sans passer par l'encodage UTF-8. */
export function repeterOctet(caractere: string, nombre: number): Octets {
  if (caractere.length !== 1 || caractere.charCodeAt(0) > 0xff) {
    throw new Error('Octet invalide : un seul caractère U+0000..U+00FF est attendu.');
  }
  if (!Number.isInteger(nombre) || nombre < 0) {
    throw new Error('Nombre de répétitions invalide : un entier positif ou nul est attendu.');
  }
  return caractere.repeat(nombre) as Octets;
}
