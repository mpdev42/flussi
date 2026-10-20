// Parité sur le corpus réel (P:, dossier IN) : lecture sans anomalie, hiérarchie complète,
// réécriture identique à l'octet près (aux 0x1A finaux près, retirés à la lecture) et performance de la lecture suivie du contrôle complet. Aucune valeur du corpus n'est affichée : seuls fichier,
// ligne, octet, entité et champ sont rapportés. Les comparaisons se font par SHA-256.
// Aucune E/S pendant la collecte : tout est lu dans les `it`.
import { describe, expect, it } from 'vitest';
import { decrireEcartAc056, empreinteSha256, sansCtrlZFinal } from '@shared/test/comparaison-ac056';
import {
  decrireCorpus,
  listerCorpus,
  lireCorpus,
  localiserEcart,
  MINIMUM_FICHIERS_CORPUS,
} from '@shared/test/corpus';
import { compterRattachements } from '@shared/test/rattachements-ac056';
import { controlerAc056 } from './controle';
import type { CodeEntite } from './entites';
import { ecrireAc056 } from './ecrivain';
import { lireAc056 } from './lecteur';
import type { LectureAc056 } from './modele';

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

decrireCorpus('Lecteur et écrivain AC056 sur le corpus réel (IN)', () => {
  it(`contient au moins ${MINIMUM_FICHIERS_CORPUS.IN} fichiers .txt`, () => {
    expect(lireTousLesFichiers().length).toBeGreaterThanOrEqual(MINIMUM_FICHIERS_CORPUS.IN);
  });

  describe('lecture', () => {
    // Seule exception : le Ctrl-Z final, non bloquant et retiré à l'enregistrement (compté par
    // `ctrl-z.corpus.test.ts`).
    it('ne produit aucune anomalie, hors Ctrl-Z final', () => {
      const ecarts = lireTousLesFichiers().flatMap(({ nom, lecture }) =>
        lecture.anomalies
          .filter((a) => a.code !== 'ctrl-z-final')
          .map((a) =>
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
    it('réécrit chaque fichier à l identique, octet pour octet, sans les 0x1A finaux (SHA-256)', () => {
      const ecarts: string[] = [];
      for (const { nom, octets, lecture } of lireTousLesFichiers()) {
        const sortie = ecrireAc056(lecture.fichier);
        const attendu = sansCtrlZFinal(octets);
        if (empreinteSha256(sortie) === empreinteSha256(attendu)) continue;

        const ecart = localiserEcart(attendu, sortie);
        ecarts.push(
          ecart === null
            ? `${nom} : empreintes différentes`
            : decrireEcartAc056(nom, ecart, lecture.fichier),
        );
      }
      expect(ecarts).toEqual([]);
    });
  });

  describe('performance', () => {
    it('lit et contrôle le plus gros fichier de IN en moins d 1 s', async ({ annotate }) => {
      const fichiers = listerCorpus('IN')
        .filter((nom) => nom.endsWith('.txt'))
        .map((nom) => ({ nom, octets: lireCorpus('IN', nom) }));
      expect(fichiers.length).toBeGreaterThanOrEqual(MINIMUM_FICHIERS_CORPUS.IN);
      const plusGros = fichiers.reduce((a, b) => (b.octets.length > a.octets.length ? b : a), {
        nom: '',
        octets: new Uint8Array(),
      });

      // Échauffement, puis médiane de 5 mesures de la lecture suivie du contrôle complet.
      const echauffement = lireAc056(plusGros.octets).fichier;
      controlerAc056(echauffement);
      const nombreLignes = echauffement.lignes.length;
      const durees: number[] = [];
      const dureesLecture: number[] = [];
      for (let i = 0; i < 5; i++) {
        const debut = performance.now();
        const { fichier } = lireAc056(plusGros.octets);
        const finLecture = performance.now();
        controlerAc056(fichier);
        durees.push(performance.now() - debut);
        dureesLecture.push(finLecture - debut);
      }
      const mediane = (valeurs: number[]) => valeurs.sort((a, b) => a - b)[2] ?? Number.NaN;

      await annotate(
        `${plusGros.nom} : ${plusGros.octets.length} octets, ${nombreLignes} lignes, lecture + contrôle médiane ${mediane(durees).toFixed(1)} ms (lecture seule ${mediane(dureesLecture).toFixed(1)} ms) sur 5 mesures.`,
      );
      expect(mediane(durees)).toBeLessThan(1000);
    });
  });
});
