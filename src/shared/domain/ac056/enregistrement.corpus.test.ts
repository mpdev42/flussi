// Préparation de l'enregistrement (`preparerEnregistrement`) sur le corpus réel (P:) :
// - MODIFIES : la correction de la note, rejouée sur l'original de IN, donne le fichier enregistré
//   par Lazarus (SHA-256, saut final de Lazarus ajouté : divergence 8), sauf les cas de
//   `CAS_REFUS_RANG_INCOMPLET` (rang saisi sur un seul chiffre), qui attendent chacun le refus
//   `valeur-trop-courte` (décision 1 de l'item 3 de la v0.3.0) ; au moins
//   `MINIMUM_FICHIERS_CORPUS.MODIFIES` cas comparés par empreinte ;
// - IN : sans correction, le fichier préparé est identique à l'original, ou n'en diffère que par
//   les lignes vides et les 0x1A finaux supprimés (comparé par empreinte à l'attendu).
// Aucune valeur du corpus n'est affichée : fichier, code, ligne, octet, entité et champ seulement.
import { expect, it } from 'vitest';
import {
  decrireEcartAc056,
  empreinteSha256,
  sansCtrlZFinal,
  sansLignesVides,
} from '@shared/test/comparaison-ac056';
import {
  decrireCorpus,
  decrireSousDossierCorpus,
  listerCorpus,
  lireCorpus,
  localiserEcart,
  MINIMUM_FICHIERS_CORPUS,
} from '@shared/test/corpus';
import {
  avecSautFinalLazarus,
  CAS_REFUS_RANG_INCOMPLET,
  inventorierModifies,
} from '@shared/test/modifies-ac056';
import { preparerEnregistrement } from './enregistrement';
import { lireAc056 } from './lecteur';

decrireSousDossierCorpus('MODIFIES', 'Enregistrement AC056 sur le corpus réel (MODIFIES)', () => {
  it('reproduit chaque fichier enregistré par Lazarus (SHA-256), ou refuse un rang incomplet', async ({
    annotate,
  }) => {
    const ecarts: string[] = [];
    let comparees = 0;
    let refusees = 0;

    for (const m of inventorierModifies().modifications) {
      const nomAttendu = `${m.base}.txt`;
      const octetsOriginal = lireCorpus('IN', m.original);
      const original = lireAc056(octetsOriginal).fichier;
      const resultat = preparerEnregistrement(octetsOriginal, 'veos', [
        { ligne: m.ligne, champ: m.champ, texte: m.valeur },
      ]);

      if (CAS_REFUS_RANG_INCOMPLET.includes(m.base)) {
        if (
          !resultat.ok &&
          resultat.code === 'correction-refusee' &&
          resultat.indice === 0 &&
          resultat.erreur.code === 'valeur-trop-courte'
        ) {
          refusees++;
        } else {
          ecarts.push(`${m.base} : refus valeur-trop-courte attendu`);
        }
        continue;
      }
      if (!resultat.ok) {
        ecarts.push(
          resultat.code === 'correction-refusee'
            ? `${m.base} : ${resultat.code} ${resultat.erreur.code}`
            : `${m.base} : ${resultat.code}`,
        );
        continue;
      }

      comparees++;
      if (resultat.champsModifies !== 1) {
        ecarts.push(`${m.base} : ${resultat.champsModifies} champs modifiés au lieu de 1`);
      }
      const attendu = lireCorpus('MODIFIES', nomAttendu);
      const obtenu = avecSautFinalLazarus(resultat.octets, original);
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
});

decrireCorpus('Enregistrement AC056 sur le corpus réel (IN)', () => {
  it('sans correction : identique, ou seulement lignes vides et 0x1A finaux supprimés', () => {
    const noms = listerCorpus('IN').filter((nom) => nom.endsWith('.txt'));
    expect(noms.length).toBeGreaterThanOrEqual(MINIMUM_FICHIERS_CORPUS.IN);
    const ecarts: string[] = [];

    for (const nom of noms) {
      const octets = lireCorpus('IN', nom);
      const resultat = preparerEnregistrement(octets, 'veos', []);
      if (!resultat.ok) {
        ecarts.push(`${nom} : ${resultat.code}`);
        continue;
      }
      if (resultat.champsModifies !== 0) ecarts.push(`${nom} : champs modifiés`);
      if (resultat.identique) continue;
      if (resultat.lignesVides === 0 && !resultat.ctrlZ) {
        ecarts.push(`${nom} : différent sans ligne vide ni 0x1A final`);
      }
      // Attendu construit indépendamment du lecteur : l'original sans ses lignes vides ni ses 0x1A
      // finaux (le corpus n'a pas de ligne vide aujourd'hui).
      const attendu = sansLignesVides(sansCtrlZFinal(octets));
      if (empreinteSha256(resultat.octets) !== empreinteSha256(attendu)) {
        const ecart = localiserEcart(attendu, resultat.octets);
        ecarts.push(
          ecart === null
            ? `${nom} : empreintes différentes`
            : decrireEcartAc056(nom, ecart, lireAc056(octets).fichier),
        );
      }
    }

    expect(ecarts).toEqual([]);
  });
});
