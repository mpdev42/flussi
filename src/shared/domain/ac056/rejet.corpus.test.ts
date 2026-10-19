// Lecture des fichiers de rejet MSP du corpus réel (`OUT\`, préfixe `AC056COUR_REJ_`, P:). Aucune
// valeur du corpus n'est affichée : seuls nom de fichier, numéro de ligne, code d'entité, code
// ERRxxx et nombres sont rapportés. Pas de `toEqual` ni de snapshot sur un contenu du corpus : les
// écarts sont accumulés en texte, puis `expect(ecarts).toEqual([])`.
// Aucune E/S pendant la collecte : inventaire et lectures dans les `it`. Les rejets sont lus une
// seule fois (au premier `it`) puis mémorisés pour les suivants (lecteur réseau lent).
import { expect, it } from 'vitest';
import { decrireSousDossierCorpus, listerCorpus, lireCorpus } from '@shared/test/corpus';
import { compterRattachements } from '@shared/test/rattachements-ac056';
import { controlerAc056 } from './controle';
import { lireAc056 } from './lecteur';
import type { LectureAc056 } from './modele';
import { provenanceDepuisNom } from './provenance';

/** Caractère de remplacement ou contrôle C1 (U+0080 à U+009F) : un décodage Windows-1252 raté. */
const CARACTERE_SUSPECT = /[�\u0080-\u009F]/;
const NON_ASCII = /[^\u0000-\u007F]/;

type RejetLu = { nom: string; lecture: LectureAc056 };

/** Résultat mémorisé de `lireRejets` : une seule lecture de P: pour tous les `it` du fichier. */
let rejets: RejetLu[] | undefined;

/** Rejets du corpus lus en provenance `rejet` (appelé depuis les `it`, lus au premier appel). */
function lireRejets(): RejetLu[] {
  if (rejets === undefined) {
    const noms = listerCorpus('OUT').filter((nom) => provenanceDepuisNom(nom) === 'rejet');
    expect(noms.length).toBeGreaterThan(0);
    rejets = noms.map((nom) => ({ nom, lecture: lireAc056(lireCorpus('OUT', nom), 'rejet') }));
  }
  return rejets;
}

decrireSousDossierCorpus('OUT', 'Lecture des rejets MSP sur le corpus réel (OUT)', () => {
  it('ne produit aucune anomalie de structure ni d encodage', () => {
    const ecarts = lireRejets().flatMap(({ nom, lecture }) =>
      lecture.anomalies.map((a) => `${nom} : ligne ${a.ligne ?? 'fichier'}, ${a.code}`),
    );
    expect(ecarts).toEqual([]);
  });

  it('rattache chaque ligne à la hiérarchie exactement une fois', () => {
    const ecarts = lireRejets().flatMap(({ nom, lecture }) =>
      compterRattachements(lecture.fichier).flatMap((compte, i) => {
        if (compte === 1) return [];
        const ligne = lecture.fichier.lignes[i];
        return [`${nom} : ligne ${ligne?.numero}, entité ${ligne?.code}, rattachée ${compte} fois`];
      }),
    );
    expect(ecarts).toEqual([]);
  });

  it('lit les fichiers en provenance rejet', () => {
    const ecarts = lireRejets()
      .filter(({ lecture }) => lecture.fichier.provenance !== 'rejet')
      .map(({ nom }) => `${nom} : provenance différente de rejet`);
    expect(ecarts).toEqual([]);
  });

  it('décode les messages sans caractère de remplacement (U+FFFD) ni contrôle C1', () => {
    const ecarts = lireRejets().flatMap(({ nom, lecture }) =>
      lecture.fichier.lignes
        .filter((ligne) => ligne.rejet !== undefined && CARACTERE_SUSPECT.test(ligne.rejet.message))
        .map((ligne) => `${nom} : ligne ${ligne.numero}, entité ${ligne.code}, caractère suspect`),
    );
    expect(ecarts).toEqual([]);
  });

  it('décode au moins un caractère non ASCII dans les messages (le décodage Windows-1252 agit)', () => {
    const avecAccent = lireRejets().reduce(
      (total, { lecture }) =>
        total +
        lecture.fichier.lignes.filter((ligne) => NON_ASCII.test(ligne.rejet?.message ?? '')).length,
      0,
    );
    expect(avecAccent).toBeGreaterThan(0);
  });

  it('ne contrôle jamais un rejet : controlerAc056 renvoie une liste vide', () => {
    const ecarts = lireRejets()
      .filter(({ lecture }) => controlerAc056(lecture.fichier).length > 0)
      .map(({ nom }) => `${nom} : contrôle non vide`);
    expect(ecarts).toEqual([]);
  });

  it('compte, à titre indicatif, les messages et leurs codes ERRxxx', async ({ annotate }) => {
    for (const { nom, lecture } of lireRejets()) {
      const messages = lecture.fichier.lignes.flatMap((ligne) =>
        ligne.rejet ? [ligne.rejet] : [],
      );
      const reconnus = messages.filter((rejet) => rejet.code !== null).length;
      const inconnus = messages.filter((rejet) => rejet.code === null);
      const distinctsInconnus = new Set(inconnus.map((rejet) => rejet.message)).size;
      await annotate(
        `${nom} : ${lecture.fichier.lignes.length} ligne(s), ${messages.length} avec message, ${reconnus} reconnu(s) par un ERRxxx, ${inconnus.length} « Erreur inconnue » (${distinctsInconnus} message(s) inconnu(s) distinct(s)).`,
      );
    }
  });
});
