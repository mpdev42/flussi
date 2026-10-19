// Découpage en lignes d'un fichier AC056, à parité de `ReadLn` de Free Pascal : fin de ligne
// LF, CRLF ou CR seul. Les lignes vides sont comprises, il n'y a pas de ligne fantôme finale.
// Ctrl-Z (0x1A) : sous Windows, FPC arrête la lecture au premier 0x1A (`CtrlZMarksEOF = true`,
// `rtl/win/syswinh.inc`) et Lazarus boucle `repeat ReadLn … until EOF` (`fmain.pas:2719-2730`).
// Les 0x1A de la toute fin du fichier sont donc retirés avant le découpage (et signalés). Un 0x1A
// suivi d'autres octets reste dans sa ligne (divergence : Lazarus tronquerait le fichier).
import { octetsDepuisTableau, type Octets } from './octets';
import type { FinDeLigne } from './modele';

const CTRL_Z = 0x1a;

export interface LigneDecoupee {
  readonly numero: number;
  readonly octets: Octets;
  readonly finDeLigne: FinDeLigne;
}

export interface Decoupage {
  readonly bom: boolean;
  /** Un ou plusieurs 0x1A retirés de la toute fin du fichier. */
  readonly ctrlZFinal: boolean;
  readonly lignes: readonly LigneDecoupee[];
}

export function decouperLignes(octets: Uint8Array): Decoupage {
  let longueur = octets.length;
  while (longueur > 0 && octets[longueur - 1] === CTRL_Z) longueur -= 1;
  const ctrlZFinal = longueur < octets.length;

  const bom = longueur >= 3 && octets[0] === 0xef && octets[1] === 0xbb && octets[2] === 0xbf;
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
  while (i < longueur) {
    const octet = octets[i];
    if (octet === 0x0a) {
      ajouter(debut, i, '\n');
      i += 1;
      debut = i;
    } else if (octet === 0x0d) {
      if (i + 1 < longueur && octets[i + 1] === 0x0a) {
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
  if (debut < longueur) ajouter(debut, longueur, '');

  return {
    bom,
    ctrlZFinal,
    lignes: Object.freeze(lignes.map((ligne) => Object.freeze(ligne))),
  };
}
