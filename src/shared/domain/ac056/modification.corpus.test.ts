// Parité de la modification avec Lazarus sur le corpus réel (P:, dossier MODIFIES). Convention du
// dossier et lecture des notes : `@shared/test/modifies-ac056`.
//
// Les cas de `CAS_REFUS_RANG_INCOMPLET` (rang saisi sur un seul chiffre) attendent le refus
// `valeur-trop-courte` (décision 1 de l'item 3 de la v0.3.0 : Lazarus écrivait « 50 » pour « 5 »),
// chacun constaté ; les autres sont comparés au fichier de Lazarus par SHA-256, au moins
// `MINIMUM_FICHIERS_CORPUS.MODIFIES` cas.
//
// Aucune valeur du corpus n'est affichée : seuls fichier, code d'erreur, ligne, octet, entité et
// champ sont rapportés. Les comparaisons se font par SHA-256. Aucune E/S pendant la collecte.
import { describe, expect, it } from 'vitest';
import { decrireEcartAc056, empreinteSha256 } from '@shared/test/comparaison-ac056';
import {
  decrireSousDossierCorpus,
  lireCorpus,
  localiserEcart,
  MINIMUM_FICHIERS_CORPUS,
} from '@shared/test/corpus';
import {
  avecSautFinalLazarus,
  CAS_REFUS_RANG_INCOMPLET,
  inventorierModifies,
} from '@shared/test/modifies-ac056';
import { ecrireAc056 } from './ecrivain';
import { lireAc056 } from './lecteur';
import { modifierChamp } from './modification';

decrireSousDossierCorpus('MODIFIES', 'Modification AC056 sur le corpus réel (MODIFIES)', () => {
  describe('inventaire', () => {
    it(`contient au moins ${MINIMUM_FICHIERS_CORPUS.MODIFIES} paires fichier et note`, () => {
      expect(inventorierModifies().modifications.length).toBeGreaterThanOrEqual(
        MINIMUM_FICHIERS_CORPUS.MODIFIES,
      );
    });

    it('associe chaque .txt à une note et chaque note à un .txt', () => {
      expect(inventorierModifies().ecartsAppairage).toEqual([]);
    });

    it('a des notes valides : clés complètes, ligne numérique, original présent dans IN', () => {
      expect(inventorierModifies().ecartsNotes).toEqual([]);
    });
  });

  describe('modification', () => {
    it('reproduit chaque fichier enregistré par Lazarus, octet pour octet (SHA-256), ou refuse un rang incomplet', async ({
      annotate,
    }) => {
      const ecarts: string[] = [];
      let comparees = 0;
      let refusees = 0;

      for (const m of inventorierModifies().modifications) {
        const nomAttendu = `${m.base}.txt`;
        const lectureOriginal = lireAc056(lireCorpus('IN', m.original));
        const resultat = modifierChamp(
          lectureOriginal.fichier,
          { ligne: m.ligne, champ: m.champ },
          m.valeur,
        );

        if (CAS_REFUS_RANG_INCOMPLET.includes(m.base)) {
          if (resultat.ok) ecarts.push(`${m.base} : refus valeur-trop-courte attendu`);
          else if (resultat.erreur.code !== 'valeur-trop-courte') {
            ecarts.push(`${m.base} : ${resultat.erreur.code} au lieu de valeur-trop-courte`);
          } else refusees++;
          continue;
        }
        if (!resultat.ok) {
          ecarts.push(`${m.base} : ${resultat.erreur.code}`);
          continue;
        }

        comparees++;
        const attendu = lireCorpus('MODIFIES', nomAttendu);
        const obtenu = avecSautFinalLazarus(ecrireAc056(resultat.fichier), lectureOriginal.fichier);
        if (empreinteSha256(obtenu) === empreinteSha256(attendu)) continue;
        const ecart = localiserEcart(attendu, obtenu);
        ecarts.push(
          ecart === null
            ? `${nomAttendu} : empreintes différentes`
            : decrireEcartAc056(nomAttendu, ecart, lireAc056(attendu).fichier),
        );
      }

      await annotate(`MODIFIES : ${comparees} cas comparés, ${refusees} refus de rang attendus.`);
      expect(ecarts).toEqual([]);
      expect(refusees).toBe(CAS_REFUS_RANG_INCOMPLET.length);
      expect(comparees).toBeGreaterThanOrEqual(MINIMUM_FICHIERS_CORPUS.MODIFIES);
    });

    it('relit et réécrit chaque fichier de Lazarus à l identique (point fixe)', () => {
      const ecarts: string[] = [];

      for (const m of inventorierModifies().modifications) {
        const nom = `${m.base}.txt`;
        const octets = lireCorpus('MODIFIES', nom);
        const lecture = lireAc056(octets);
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
