// Parité sur le corpus réel (P:) : la zone non décrite des entités non brutes ne contient que des
// espaces. Aucune valeur du corpus n'est affichée : seuls fichier, ligne et octet sont rapportés.
import { describe, expect, it } from 'vitest';
import { decrireCorpus, decrireEcart, listerCorpus, lireCorpus } from '@shared/test/corpus';
import {
  CODES_ENTITE,
  ENTITES,
  LONGUEUR_CODE_ENTITE,
  LONGUEUR_LIGNE,
  POSITION_CODE_ENTITE,
  type CodeEntite,
} from './index';

const LF = 0x0a;
const CR = 0x0d;
const ESPACE = 0x20;

/** Découpe les octets en lignes sur LF, en retirant un CR final. */
function decouperLignes(octets: Uint8Array): Uint8Array[] {
  const lignes: Uint8Array[] = [];
  let debut = 0;
  for (let i = 0; i <= octets.length; i++) {
    if (i === octets.length || octets[i] === LF) {
      if (i === octets.length && debut === i) break;
      let fin = i;
      if (fin > debut && octets[fin - 1] === CR) fin--;
      lignes.push(octets.subarray(debut, fin));
      debut = i + 1;
    }
  }
  return lignes;
}

/** Code d'entité (octets 23 à 25, ASCII) d'une ligne, ou null s'il n'en est pas un. */
function codeEntite(ligne: Uint8Array): CodeEntite | null {
  let texte = '';
  for (let i = 0; i < LONGUEUR_CODE_ENTITE; i++) {
    texte += String.fromCharCode(ligne[POSITION_CODE_ENTITE - 1 + i] ?? 0);
  }
  return (CODES_ENTITE as readonly string[]).includes(texte) ? (texte as CodeEntite) : null;
}

decrireCorpus('Entités AC056 sur le corpus réel', () => {
  describe('zoneNonDecrite', () => {
    it('ne contient que des espaces dans les lignes de 700 octets des entités non brutes', () => {
      const ecarts: string[] = [];
      let lignesControlees = 0;

      for (const fichier of listerCorpus('IN').filter((nom) => nom.endsWith('.txt'))) {
        const lignes = decouperLignes(lireCorpus('IN', fichier));

        lignes.forEach((ligne, index) => {
          if (ligne.length !== LONGUEUR_LIGNE) return;
          const code = codeEntite(ligne);
          if (code === null || ENTITES[code].brute) return;

          const zone = ENTITES[code].champs.find((c) => c.nom === 'zoneNonDecrite');
          if (!zone) {
            ecarts.push(decrireEcart(fichier, { ligne: index + 1, octet: 1 }));
            return;
          }

          lignesControlees++;
          const debut = zone.position - 1;
          for (let i = debut; i < debut + zone.longueur; i++) {
            if (ligne[i] !== ESPACE) {
              ecarts.push(decrireEcart(fichier, { ligne: index + 1, octet: i + 1 }));
              break;
            }
          }
        });
      }

      expect(lignesControlees).toBeGreaterThan(0);
      expect(ecarts).toEqual([]);
    });
  });
});
