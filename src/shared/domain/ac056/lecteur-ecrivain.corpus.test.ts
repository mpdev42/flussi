// Parité sur le corpus réel (P:, dossier IN) : lecture sans anomalie, hiérarchie complète et
// réécriture identique à l'octet près. Aucune valeur du corpus n'est affichée : seuls fichier,
// ligne, octet, entité et champ sont rapportés. Les comparaisons se font par SHA-256.
// Aucune E/S pendant la collecte : tout est lu dans les `it`.
import { describe, expect, it } from 'vitest';
import { decrireEcartAc056, empreinteSha256 } from '@shared/test/comparaison-ac056';
import { decrireCorpus, listerCorpus, lireCorpus, localiserEcart } from '@shared/test/corpus';
import type { CodeEntite } from './entites';
import { ecrireAc056 } from './ecrivain';
import { lireAc056 } from './lecteur';
import type { FichierAc056, LectureAc056 } from './modele';

const CODES_BRUTS_ADMIS: readonly (CodeEntite | null)[] = ['000', '001', '990', '995', '999'];

interface FichierLu {
  nom: string;
  octets: Uint8Array;
  lecture: LectureAc056;
}

/** Lit tous les fichiers .txt de IN\ (appelé depuis les `it` uniquement). */
function lireTousLesFichiers(): FichierLu[] {
  return listerCorpus('IN')
    .filter((nom) => nom.endsWith('.txt'))
    .map((nom) => {
      const octets = lireCorpus('IN', nom);
      return { nom, octets, lecture: lireAc056(octets) };
    });
}

/** Indices de `lignes` rattachés à la hiérarchie, avec leur nombre d'occurrences. */
function compterRattachements(fichier: FichierAc056): number[] {
  const comptes = new Array<number>(fichier.lignes.length).fill(0);
  const compter = (indice: number | null) => {
    if (indice !== null) comptes[indice] = (comptes[indice] ?? 0) + 1;
  };
  compter(fichier.e000);
  for (const dossier of fichier.dossiers) {
    compter(dossier.e001);
    for (const evt of dossier.evenements) {
      compter(evt.e100);
      [evt.e110, evt.e115, evt.e120, evt.e130, evt.e135, evt.e155, evt.e180].forEach(compter);
      evt.e125.forEach(compter);
      for (const benef of evt.beneficiaires) {
        compter(benef.e400);
        [benef.e405, benef.e410, benef.e411, benef.e800].forEach(compter);
        benef.e485.forEach(compter);
        benef.e490.forEach(compter);
        benef.e700.forEach(compter);
      }
      compter(evt.e990);
    }
    compter(dossier.e995);
  }
  compter(fichier.e999);
  return comptes;
}

decrireCorpus('Lecteur et écrivain AC056 sur le corpus réel (IN)', () => {
  it('contient au moins un fichier .txt', () => {
    expect(lireTousLesFichiers().length).toBeGreaterThan(0);
  });

  describe('lecture', () => {
    it('ne produit aucune anomalie', () => {
      const ecarts = lireTousLesFichiers().flatMap(({ nom, lecture }) =>
        lecture.anomalies.map((a) =>
          a.ligne === null ? `${nom} : ${a.code}` : `${nom} : ${a.code} ligne ${a.ligne}`,
        ),
      );
      expect(ecarts).toEqual([]);
    });

    it('ne laisse en ligne brute que les entités 000, 001, 990, 995 et 999', () => {
      const ecarts = lireTousLesFichiers().flatMap(({ nom, lecture }) =>
        lecture.fichier.lignes
          .filter((l) => l.nature === 'brute' && !CODES_BRUTS_ADMIS.includes(l.code))
          .map((l) => `${nom} : ligne ${l.numero} brute (entité ${l.code ?? 'inconnue'})`),
      );
      expect(ecarts).toEqual([]);
    });

    it('rattache chaque ligne exactement une fois à la hiérarchie', () => {
      const ecarts = lireTousLesFichiers().flatMap(({ nom, lecture }) => {
        const { fichier } = lecture;
        return compterRattachements(fichier).flatMap((compte, indice) =>
          compte === 1
            ? []
            : [
                `${nom} : ligne ${fichier.lignes[indice]?.numero} (entité ${fichier.lignes[indice]?.code ?? 'inconnue'}) rattachée ${compte} fois`,
              ],
        );
      });
      expect(ecarts).toEqual([]);
    });

    it('trouve un 000 et un 999 dans chaque fichier', () => {
      const ecarts = lireTousLesFichiers().flatMap(({ nom, lecture }) => [
        ...(lecture.fichier.e000 === null ? [`${nom} : 000 absente`] : []),
        ...(lecture.fichier.e999 === null ? [`${nom} : 999 absente`] : []),
      ]);
      expect(ecarts).toEqual([]);
    });

    it('termine la dernière ligne sans saut final (format VEOS)', () => {
      const ecarts = lireTousLesFichiers()
        .filter(({ lecture }) => lecture.fichier.lignes.at(-1)?.finDeLigne !== '')
        .map(({ nom }) => `${nom} : saut final présent`);
      expect(ecarts).toEqual([]);
    });
  });

  describe('écriture', () => {
    it('réécrit chaque fichier à l identique, octet pour octet (SHA-256)', () => {
      const ecarts: string[] = [];
      for (const { nom, octets, lecture } of lireTousLesFichiers()) {
        const sortie = ecrireAc056(lecture.fichier);
        if (empreinteSha256(sortie) === empreinteSha256(octets)) continue;

        const ecart = localiserEcart(octets, sortie);
        ecarts.push(
          ecart === null
            ? `${nom} : empreintes différentes`
            : decrireEcartAc056(nom, ecart, lecture.fichier),
        );
      }
      expect(ecarts).toEqual([]);
    });
  });
});
