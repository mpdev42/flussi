// Ctrl-Z (0x1A) sur le corpus réel (P:) : nombre de fichiers qui en contiennent, en fin de fichier
// ou au milieu, et absence d'anomalie bloquante due à un 0x1A final. Parité `CtrlZMarksEOF` de FPC
// sous Windows (`rtl/win/syswinh.inc`, `fmain.pas:2719-2730`). Seuls des noms de fichier, des codes
// d'anomalie, des numéros de ligne et des nombres sont rapportés, jamais une valeur.
// Aucune E/S pendant la collecte : inventaire et lectures dans les `it`.
import { expect, it } from 'vitest';
import { sansCtrlZFinal } from '@shared/test/comparaison-ac056';
import {
  decrireCorpus,
  listerCorpus,
  lireCorpus,
  resoudreSousDossierCorpus,
  type SousDossierCorpus,
} from '@shared/test/corpus';
import { analyserAc056 } from './analyse';
import type { AnomalieAc056 } from './modele';
import { provenanceDepuisNom } from './provenance';

const CTRL_Z = 0x1a;

/** Fichiers AC056 de chaque sous-dossier : relevés Lazarus et descriptions de modification exclus. */
const SOUS_DOSSIERS: readonly SousDossierCorpus[] = ['IN', 'OUT', 'PIEGES', 'MODIFIES'];
const estAc056 = (nom: string) =>
  nom.endsWith('.txt') && !nom.endsWith('.erreurs.txt') && !nom.endsWith('.modification.txt');

interface FichierCorpus {
  readonly sousDossier: SousDossierCorpus;
  readonly nom: string;
  readonly octets: Uint8Array;
}

/**
 * Noms des fichiers d'un sous-dossier. IN et OUT sont toujours listés (une erreur fait échouer le
 * test). PIEGES et MODIFIES sont ignorés s'ils sont absents ou vides, sauf avec
 * `npm run test:corpus`, où `resoudreSousDossierCorpus` lève une erreur.
 */
function lister(sousDossier: SousDossierCorpus): string[] {
  if (sousDossier === 'IN' || sousDossier === 'OUT') return listerCorpus(sousDossier);
  return resoudreSousDossierCorpus(sousDossier).dossier === null ? [] : listerCorpus(sousDossier);
}

let fichiers: FichierCorpus[] | undefined;

/** Fichiers AC056 du corpus, lus une seule fois (lecteur réseau lent). */
function lireFichiers(): FichierCorpus[] {
  fichiers ??= SOUS_DOSSIERS.flatMap((sousDossier) =>
    lister(sousDossier)
      .filter(estAc056)
      .map((nom) => ({ sousDossier, nom, octets: lireCorpus(sousDossier, nom) })),
  );
  return fichiers;
}

const aCtrlZFinal = (octets: Uint8Array) => sansCtrlZFinal(octets).length < octets.length;
/** Un 0x1A suivi d'au moins un autre octet que 0x1A. */
const aCtrlZAuMilieu = (octets: Uint8Array) => sansCtrlZFinal(octets).includes(CTRL_Z);

/** Résumé d'une anomalie, sans message (le message ne cite jamais de valeur, mais reste inutile). */
const resume = (a: AnomalieAc056) => `${a.code}@${a.ligne ?? 'fichier'}:${a.bloquante}`;

decrireCorpus('Ctrl-Z (0x1A) sur le corpus réel', () => {
  it('compte les fichiers qui contiennent 0x1A, en fin de fichier et au milieu', async ({
    annotate,
  }) => {
    const tous = lireFichiers();
    expect(tous.length).toBeGreaterThan(0);
    for (const sousDossier of SOUS_DOSSIERS) {
      const du = tous.filter((f) => f.sousDossier === sousDossier);
      const fin = du.filter((f) => aCtrlZFinal(f.octets)).length;
      const milieu = du.filter((f) => aCtrlZAuMilieu(f.octets)).length;
      await annotate(
        `${sousDossier} : ${du.length} fichier(s) AC056, ${fin} terminé(s) par 0x1A, ${milieu} avec un 0x1A suivi d'autres octets.`,
      );
    }
  });

  it('ne produit aucune anomalie bloquante due à un 0x1A final', () => {
    const ecarts = lireFichiers()
      .filter((f) => aCtrlZFinal(f.octets))
      .flatMap(({ sousDossier, nom, octets }) => {
        const provenance = provenanceDepuisNom(nom);
        const avec = analyserAc056(octets, provenance).anomalies;
        const sans = analyserAc056(sansCtrlZFinal(octets), provenance).anomalies;
        const ctrlZ = avec.filter((a) => a.code === 'ctrl-z-final');
        const ecartsFichier: string[] = [];
        // VEOS : une seule anomalie non bloquante ; rejet : aucune.
        const attendues = provenance === 'veos' ? 1 : 0;
        if (ctrlZ.length !== attendues || ctrlZ.some((a) => a.bloquante)) {
          ecartsFichier.push(`${sousDossier}\\${nom} : ${ctrlZ.length} anomalie(s) ctrl-z-final`);
        }
        // Hors Ctrl-Z, les anomalies sont exactement celles du fichier sans ses 0x1A finaux.
        const autres = avec.filter((a) => a.code !== 'ctrl-z-final').map(resume);
        if (autres.join('|') !== sans.map(resume).join('|')) {
          ecartsFichier.push(`${sousDossier}\\${nom} : anomalies différentes du fichier sans 0x1A`);
        }
        return ecartsFichier;
      });
    expect(ecarts).toEqual([]);
  });
});
