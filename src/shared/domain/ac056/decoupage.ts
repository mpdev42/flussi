// Découpage en lignes d'un fichier AC056, à parité de `ReadLn` de Free Pascal : fin de ligne
// LF, CRLF ou CR seul. Les lignes vides sont comprises, il n'y a pas de ligne fantôme finale.
import { octetsDepuisTableau, type Octets } from './octets';
import type { FinDeLigne } from './modele';

export interface LigneDecoupee {
  readonly numero: number;
  readonly octets: Octets;
  readonly finDeLigne: FinDeLigne;
}

export interface Decoupage {
  readonly bom: boolean;
  readonly lignes: readonly LigneDecoupee[];
}

export function decouperLignes(octets: Uint8Array): Decoupage {
  const bom = octets.length >= 3 && octets[0] === 0xef && octets[1] === 0xbb && octets[2] === 0xbf;
  const lignes: LigneDecoupee[] = [];
  const ajouter = (debut: number, fin: number, finDeLigne: FinDeLigne): void => {
    lignes.push({
      numero: lignes.length + 1,
      octets: octetsDepuisTableau(octets.subarray(debut, fin)),
      finDeLigne,
    });
  };

  let debut = bom ? 3 : 0;
  let i = debut;
  while (i < octets.length) {
    const octet = octets[i];
    if (octet === 0x0a) {
      ajouter(debut, i, '\n');
      i += 1;
      debut = i;
    } else if (octet === 0x0d) {
      if (octets[i + 1] === 0x0a) {
        ajouter(debut, i, '\r\n');
        i += 2;
      } else {
        ajouter(debut, i, '\r');
        i += 1;
      }
      debut = i;
    } else {
      i += 1;
    }
  }
  if (debut < octets.length) ajouter(debut, octets.length, '');

  return { bom, lignes: Object.freeze(lignes.map((ligne) => Object.freeze(ligne))) };
}
