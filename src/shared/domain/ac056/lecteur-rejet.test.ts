// Lecture d'un fichier de rejet MSP (`lireAc056(octets, 'rejet')`) : lignes, messages, anomalies de
// format et d'encodage, lecture seule. Fichiers synthétiques uniquement (émetteur TEST).
// La structure et la hiérarchie d'un rejet sont testées dans `structure-rejet.test.ts`.
import { describe, expect, it } from 'vitest';
import {
  enChaineBinaire,
  enWindows1252,
  fichierSynthetique,
  ligneRejet,
  ligneSynthetique,
  lignesCompletes,
  lignesRejet,
  type OptionsFichierSynthetique,
} from '@shared/test/ac056-synthetique';
import { REJETS } from './codes-rejet';
import { controlerAc056, controlerChamp } from './controle';
import { ecrireAc056 } from './ecrivain';
import { CODES_ENTITE, ENTITES } from './entites';
import { lireAc056 } from './lecteur';
import type { LectureAc056, LigneAc056, LigneDecrite } from './modele';
import { modifierChamp } from './modification';

const L405 = ligneSynthetique('405', { nom: 'DUPONT', prenom1: 'TEST' });

function lireRejet(lignes: readonly string[], options?: OptionsFichierSynthetique): LectureAc056 {
  return lireAc056(fichierSynthetique(lignes, options), 'rejet');
}

function lireVeos(lignes: readonly string[], options?: OptionsFichierSynthetique): LectureAc056 {
  return lireAc056(fichierSynthetique(lignes, options));
}

function decrite(ligne: LigneAc056 | undefined): LigneDecrite {
  if (ligne?.nature !== 'decrite') throw new Error('ligne décrite attendue');
  return ligne;
}

const codeDe = (ligne: string) => ligne.slice(22, 25);

const encodage = (lecture: LectureAc056) =>
  lecture.anomalies.filter((a) => a.code === 'encodage-incoherent');

const lignesDeCode = (lecture: LectureAc056, code: string) =>
  lecture.fichier.lignes.filter((ligne) => ligne.code === code);

describe('lireAc056 en provenance rejet', () => {
  describe('nature et valeurs des lignes', () => {
    it('décrit une ligne de 718 octets au code connu et non brut', () => {
      const ligne = decrite(lireRejet([ligneRejet(L405)]).fichier.lignes[0]);
      expect(ligne.nature).toBe('decrite');
      expect(ligne.code).toBe('405');
      expect(ligne.valeurs.nom).toBe('DUPONT');
    });

    it('lit les mêmes valeurs que la même ligne de 700 octets en VEOS', () => {
      const veos = decrite(lireVeos([L405]).fichier.lignes[0]);
      const rejet = decrite(lireRejet([ligneRejet(L405)]).fichier.lignes[0]);
      expect(rejet.valeurs).toEqual(veos.valeurs);
    });

    it('lit les mêmes valeurs quand la ligne porte un message : le message n entre dans aucun champ', () => {
      const veos = decrite(lireVeos([L405]).fichier.lignes[0]);
      const rejet = decrite(lireRejet([ligneRejet(L405, 'Un message \xE9')]).fichier.lignes[0]);
      expect(rejet.valeurs).toEqual(veos.valeurs);
    });

    it.each(CODES_ENTITE.filter((code) => !ENTITES[code].brute))(
      'lit les mêmes valeurs en rejet et en VEOS pour l entité %s',
      (code) => {
        const ligne = ligneSynthetique(code);
        const veos = decrite(lireVeos([ligne]).fichier.lignes[0]);
        const rejet = decrite(lireRejet([ligneRejet(ligne, 'Message')]).fichier.lignes[0]);
        expect(rejet.valeurs).toEqual(veos.valeurs);
      },
    );

    it.each(['000', '001', '990', '995', '999'] as const)(
      'garde brute la ligne %s de 718 octets avec son code',
      (code) => {
        const ligne = lireRejet([ligneRejet(ligneSynthetique(code))]).fichier.lignes[0];
        expect(ligne?.nature).toBe('brute');
        expect(ligne?.code).toBe(code);
      },
    );

    it('conserve l origine entière : ligne AC056, identification MSP et message, octet pour octet', () => {
      const origine = ligneRejet(L405, 'Message \xE9\x80 ');
      const { fichier } = lireRejet([origine, ligneRejet(L405)]);
      expect(fichier.lignes[0]?.origine).toBe(origine);
      expect(fichier.lignes[1]?.origine).toHaveLength(718);
    });

    it('garde brute une ligne au code inconnu, avec un code null', () => {
      const ligne = lireRejet([ligneRejet(ligneSynthetique('400', { numEntite: '123' }))]).fichier
        .lignes[0];
      expect(ligne?.nature).toBe('brute');
      expect(ligne?.code).toBeNull();
    });
  });

  describe('longueur minimale de 718 octets', () => {
    it('garde brute une ligne de 717 octets, avec son code, et signale la longueur', () => {
      const lecture = lireRejet([ligneRejet(L405).slice(0, 717)]);
      const ligne = lecture.fichier.lignes[0];
      expect(ligne?.nature).toBe('brute');
      expect(ligne?.code).toBe('405');
      const longueur = lecture.anomalies.filter((a) => a.code === 'longueur-ligne');
      expect(longueur).toEqual([
        {
          code: 'longueur-ligne',
          ligne: 1,
          message: "Ligne 1 : 717 octets au lieu d'au moins 718.",
          bloquante: true,
        },
      ]);
    });

    it('signale une ligne de 700 octets (ligne de fichier VEOS) lue comme rejet', () => {
      const lecture = lireRejet([L405]);
      expect(lecture.fichier.lignes[0]?.nature).toBe('brute');
      expect(
        lecture.anomalies.filter((a) => a.code === 'longueur-ligne').map((a) => a.message),
      ).toEqual(["Ligne 1 : 700 octets au lieu d'au moins 718."]);
    });

    it('ne signale pas la longueur d une ligne de 718 octets ni d une ligne avec message', () => {
      const lecture = lireRejet([ligneRejet(L405), ligneRejet(L405, 'Message')]);
      expect(lecture.anomalies.filter((a) => a.code === 'longueur-ligne')).toEqual([]);
    });

    it('signale en VEOS une ligne de rejet de 718 octets (mode VEOS inchangé : 700 exactement)', () => {
      const lecture = lireVeos([ligneRejet(L405)]);
      expect(lecture.fichier.lignes[0]?.nature).toBe('brute');
      expect(
        lecture.anomalies.filter((a) => a.code === 'longueur-ligne').map((a) => a.message),
      ).toEqual(['Ligne 1 : 718 octets au lieu de 700.']);
    });
  });

  describe('message MSP de chaque ligne', () => {
    const MESSAGES: Readonly<Record<string, string>> = {
      '990': 'Message 990',
      '995': 'Message 995',
      '411': 'Message 411 \xE9',
    };
    const lecture = lireRejet(lignesRejet({ message: (code) => MESSAGES[code] }));

    it.each(['990', '995', '411'])('porte le message sur chaque ligne %s', (code) => {
      const lignes = lignesDeCode(lecture, code);
      expect(lignes.length).toBeGreaterThan(0);
      expect(lignes.map((ligne) => ligne.rejet?.message)).toEqual(
        lignes.map(() => enMessage(MESSAGES[code]!)),
      );
    });

    it('porte le message sur une ligne brute (990, 995) comme sur une ligne décrite (411)', () => {
      expect(lignesDeCode(lecture, '990')[0]?.nature).toBe('brute');
      expect(lignesDeCode(lecture, '995')[0]?.nature).toBe('brute');
      expect(lignesDeCode(lecture, '411')[0]?.nature).toBe('decrite');
    });

    it('rattache l explication d erreur inconnue à un message non reconnu', () => {
      const rejet = lignesDeCode(lecture, '990')[0]?.rejet;
      expect(rejet).toEqual({
        message: 'Message 990',
        code: null,
        explication: 'Erreur inconnue. Contactez le service informatique.',
      });
    });

    it('rattache le code ERRxxx et son explication à un message reconnu, accents compris', () => {
      const texte = REJETS.find((d) => d.code === 'ERR001')!.recherches[0]!.texte;
      expect(texte).toContain('é');
      const { fichier } = lireRejet([ligneRejet(ligneSynthetique('411'), enWindows1252(texte))]);
      expect(fichier.lignes[0]?.rejet).toEqual({
        message: texte,
        code: 'ERR001',
        explication: 'Aide ERR001',
      });
    });

    it('n ajoute pas de propriété rejet aux lignes de 718 octets', () => {
      const sansMessage = lecture.fichier.lignes.filter(
        (ligne) => !['990', '995', '411'].includes(ligne.code ?? ''),
      );
      expect(sansMessage.length).toBeGreaterThan(100);
      for (const ligne of sansMessage) expect(ligne).not.toHaveProperty('rejet');
    });

    it('n ajoute pas de propriété rejet à une ligne dont le message est fait de blancs', () => {
      const ligne = lireRejet([ligneRejet(L405, '   \t')]).fichier.lignes[0];
      expect(ligne).not.toHaveProperty('rejet');
    });

    it('ne lit aucun message en provenance VEOS, même sur une ligne de plus de 718 octets', () => {
      const octets = fichierSynthetique(lignesRejet({ message: (code) => MESSAGES[code] }));
      for (const lecture of [lireAc056(octets), lireAc056(octets, 'veos')]) {
        expect(lecture.fichier.lignes.filter((l) => 'rejet' in l)).toEqual([]);
      }
    });
  });

  describe('anomalies de format : aucune en rejet', () => {
    const lignes = lignesRejet();

    it('ne signale aucune anomalie pour un rejet CRLF', () => {
      expect(lireRejet(lignes).anomalies).toEqual([]);
    });

    it('ne signale aucune anomalie pour un rejet CRLF avec saut final', () => {
      expect(lireRejet(lignes, { sautFinal: true }).anomalies).toEqual([]);
    });

    it('ne signale pas les fins de ligne LF', () => {
      expect(lireRejet(lignes, { fin: '\n', sautFinal: true }).anomalies).toEqual([]);
    });

    it('ne signale pas les fins de ligne CR', () => {
      expect(lireRejet(lignes, { fin: '\r', sautFinal: true }).anomalies).toEqual([]);
    });

    it('conserve néanmoins la fin de ligne de chaque ligne', () => {
      const { fichier } = lireRejet(lignes.slice(0, 3), {
        fin: ['\n', '\r', '\r\n'],
        sautFinal: true,
      });
      expect(fichier.lignes.map((ligne) => ligne.finDeLigne)).toEqual(['\n', '\r', '\r\n']);
    });

    it('ne signale pas les lignes vides et garde la numérotation d origine', () => {
      const avecVides = [...lignes.slice(0, 3), '', '', ...lignes.slice(3), ''];
      const lecture = lireRejet(avecVides);
      expect(lecture.anomalies).toEqual([]);
      expect(lecture.fichier.lignes).toHaveLength(lignes.length);
      expect(lecture.fichier.lignes[3]?.numero).toBe(6);
    });

    it('ne signale pas le BOM comme anomalie de format : seul l encodage est signalé', () => {
      const lecture = lireRejet(lignes, { bom: true });
      expect(lecture.fichier.bom).toBe(true);
      expect(lecture.anomalies.map((a) => a.code)).toEqual(['encodage-incoherent']);
    });

    it('signale les mêmes anomalies de format en VEOS sur le même contenu (comparaison)', () => {
      const veos = lireVeos(lignesCompletes(), { fin: '\n', bom: true });
      expect(veos.anomalies.map((a) => a.code)).toEqual(['bom', 'fin-de-ligne-lf']);
    });
  });

  describe('provenance', () => {
    it('recopie rejet dans le fichier lu', () => {
      expect(lireRejet(lignesRejet()).fichier.provenance).toBe('rejet');
    });

    it('recopie veos quand le second argument est veos', () => {
      expect(lireAc056(fichierSynthetique(lignesCompletes()), 'veos').fichier.provenance).toBe(
        'veos',
      );
    });

    it('vaut veos sans second argument, comportement VEOS inchangé', () => {
      const octets = fichierSynthetique(lignesCompletes());
      const sans = lireAc056(octets);
      expect(sans.fichier.provenance).toBe('veos');
      expect(sans).toEqual(lireAc056(octets, 'veos'));
      expect(sans.anomalies).toEqual([]);
      expect(sans.fichier.e999).toBe(137);
      expect(sans.fichier.dossiers.every((dossier) => dossier.e001 !== null)).toBe(true);
    });

    it('signale toujours un fichier de rejet vide', () => {
      const lecture = lireAc056(new Uint8Array(), 'rejet');
      expect(lecture.anomalies.map((a) => [a.code, a.bloquante])).toEqual([['fichier-vide', true]]);
      expect(lecture.fichier.provenance).toBe('rejet');
    });

    it('signale un BOM seul en rejet : encodage puis fichier vide', () => {
      const lecture = lireAc056(new Uint8Array([0xef, 0xbb, 0xbf]), 'rejet');
      expect(lecture.anomalies.map((a) => a.code)).toEqual(['encodage-incoherent', 'fichier-vide']);
    });

    it('ne lève jamais en rejet, même sur des octets quelconques', () => {
      let graine = 777;
      const hasard = Uint8Array.from({ length: 5000 }, () => {
        graine = (graine * 1103515245 + 12345) & 0x7fffffff;
        return graine & 0xff;
      });
      expect(() => lireAc056(hasard, 'rejet')).not.toThrow();
      for (let octet = 0; octet < 256; octet++) {
        expect(() => lireAc056(new Uint8Array([octet]), 'rejet')).not.toThrow();
      }
    });
  });
});

/** Message attendu : les octets Windows-1252 de `MESSAGES` lus en Unicode. */
function enMessage(octets: string): string {
  return new TextDecoder('windows-1252').decode(Uint8Array.from(octets, (c) => c.charCodeAt(0)));
}

describe('encodage incohérent avec la provenance', () => {
  describe('rejet', () => {
    it('signale un rejet UTF-8 avec BOM', () => {
      const lecture = lireRejet(lignesRejet(), { bom: true });
      expect(encodage(lecture)).toHaveLength(1);
    });

    it('signale un rejet UTF-8 accentué sans BOM', () => {
      const lecture = lireRejet(
        lignesRejet({ message: (code) => (code === '990' ? '\xC3\xA9' : undefined) }),
      );
      expect(lecture.fichier.bom).toBe(false);
      expect(lecture.anomalies.map((a) => a.code)).toEqual(['encodage-incoherent']);
    });

    it('signale un accent UTF-8 dans la ligne AC056 (octets 1 à 700) comme dans le message', () => {
      const ligne = ligneSynthetique('405', { nom: 'CAF\xC3\xA9' });
      expect(encodage(lireRejet([ligneRejet(ligne)]))).toHaveLength(1);
    });

    it('ne signale pas un rejet Windows-1252 accentué', () => {
      const lecture = lireRejet(
        lignesRejet({
          message: (code) => (code === '990' ? 'Assur\xE9 radi\xE9e \x80 l\x92an' : undefined),
        }),
      );
      expect(lecture.anomalies).toEqual([]);
    });

    it('ne signale pas un accent Windows-1252 dans la ligne AC056 (octets 1 à 700)', () => {
      const ligne = ligneSynthetique('405', { nom: 'CAF\xE9' });
      expect(encodage(lireRejet([ligneRejet(ligne)]))).toEqual([]);
    });

    it('ne signale pas un rejet en ASCII pur', () => {
      expect(encodage(lireRejet(lignesRejet({ message: () => 'Message ASCII' })))).toEqual([]);
    });

    it('signale une seule fois l anomalie, même avec beaucoup de lignes accentuées en UTF-8', () => {
      const lecture = lireRejet(lignesRejet({ message: () => '\xC3\xA9\xC3\xA8' }));
      expect(encodage(lecture)).toHaveLength(1);
    });

    it('produit une anomalie non bloquante, sans ligne, qui nomme les deux encodages', () => {
      const [anomalie] = encodage(lireRejet(lignesRejet(), { bom: true }));
      expect(anomalie?.bloquante).toBe(false);
      expect(anomalie?.ligne).toBeNull();
      expect(anomalie?.message).toContain('UTF-8');
      expect(anomalie?.message).toContain('Windows-1252');
      expect(Object.isFrozen(anomalie)).toBe(true);
    });

    it('ne cite aucune valeur lue dans le message d anomalie', () => {
      const lecture = lireRejet(
        lignesRejet({ message: (code) => (code === '990' ? 'ZQXWVALEUR\xC3\xA9' : undefined) }),
      );
      const [anomalie] = encodage(lecture);
      expect(anomalie?.message).not.toContain('ZQXW');
      expect(anomalie?.message).not.toContain('VALEUR');
    });
  });

  describe('VEOS', () => {
    const nomWindows1252 = ligneSynthetique('405', { nom: 'CAF\xE9' });

    it('signale un octet Windows-1252 dans un nom', () => {
      const [anomalie, ...autres] = encodage(lireVeos([nomWindows1252]));
      expect(autres).toEqual([]);
      expect(anomalie?.message).toContain('Windows-1252');
    });

    it('signale un fichier VEOS complet dont un nom est en Windows-1252', () => {
      const lignes = lignesCompletes();
      lignes[lignes.findIndex((ligne) => codeDe(ligne) === '405')] = nomWindows1252;
      expect(encodage(lireVeos(lignes))).toHaveLength(1);
    });

    it('produit une anomalie non bloquante, sans ligne, sans valeur lue', () => {
      const [anomalie] = encodage(lireVeos([ligneSynthetique('405', { nom: 'ZQXW\xE9' })]));
      expect(anomalie?.bloquante).toBe(false);
      expect(anomalie?.ligne).toBeNull();
      expect(anomalie?.message).not.toContain('ZQXW');
      expect(Object.isFrozen(anomalie)).toBe(true);
    });

    it('ne signale pas un accent UTF-8 valide', () => {
      const lecture = lireVeos([ligneSynthetique('405', { nom: 'CAF\xC3\xA9' })]);
      expect(encodage(lecture)).toEqual([]);
    });

    it('ne signale pas un fichier VEOS en ASCII pur', () => {
      expect(encodage(lireVeos(lignesCompletes()))).toEqual([]);
    });

    it('ne signale pas un fichier VEOS UTF-8 avec BOM : seul le BOM l est', () => {
      const lecture = lireVeos(lignesCompletes(), { bom: true });
      expect(lecture.anomalies.map((a) => a.code)).toEqual(['bom']);
    });

    it('place l anomalie d encodage au niveau fichier, avant les anomalies de ligne', () => {
      const lecture = lireVeos(['ABC', nomWindows1252]);
      expect(lecture.anomalies[0]?.code).toBe('encodage-incoherent');
      expect(lecture.anomalies[0]?.ligne).toBeNull();
    });
  });
});

describe('lecture seule d un rejet', () => {
  /** Rejet dont la 405 porte un nom accentué (octet Windows-1252) et dont un message est accentué. */
  function rejetAccentue() {
    const base = lignesCompletes();
    const indice405 = base.findIndex((ligne) => codeDe(ligne) === '405');
    base[indice405] = ligneSynthetique('405', { nom: 'CAF\xE9' });
    const lignes = base.map((ligne) =>
      ligneRejet(ligne, codeDe(ligne) === '990' ? enWindows1252('Assuré radiée') : ''),
    );
    return { base, lignes, ligne405: indice405 + 1 };
  }

  describe('controlerAc056 et controlerChamp', () => {
    it('renvoie une liste vide pour un rejet dont un message est accentué', () => {
      const { lignes } = rejetAccentue();
      const { fichier } = lireRejet(lignes);
      expect(controlerAc056(fichier)).toEqual([]);
    });

    it('produirait pourtant des anomalies sur la même ligne en VEOS', () => {
      const { base } = rejetAccentue();
      const { fichier } = lireVeos(base);
      expect(controlerAc056(fichier).map((a) => [a.code, a.champ])).toEqual([
        ['caractere-non-autorise', 'nom'],
      ]);
    });

    it('renvoie une liste vide pour un champ de rejet qui échoue en VEOS', () => {
      const { base, lignes, ligne405 } = rejetAccentue();
      const cible = { ligne: ligne405, champ: 'nom' };
      expect(controlerChamp(lireVeos(base).fichier, cible).length).toBeGreaterThan(0);
      expect(controlerChamp(lireRejet(lignes).fichier, cible)).toEqual([]);
    });

    it('renvoie une liste vide pour un rejet sans accent non plus', () => {
      expect(controlerAc056(lireRejet(lignesRejet()).fichier)).toEqual([]);
    });
  });

  describe('modifierChamp', () => {
    it('refuse avec le code fichier-rejet, même sur un champ modifiable d une ligne décrite', () => {
      const { lignes, ligne405 } = rejetAccentue();
      const { fichier } = lireRejet(lignes);
      expect(decrite(fichier.lignes[ligne405 - 1]).code).toBe('405');
      const resultat = modifierChamp(fichier, { ligne: ligne405, champ: 'nom' }, 'AUTRE');
      expect(resultat.ok).toBe(false);
      if (!resultat.ok) {
        expect(resultat.erreur.code).toBe('fichier-rejet');
        expect(resultat.erreur.message).toContain('lecture seule');
      }
    });

    it('refuse avant tout autre contrôle : ligne introuvable, champ inconnu, saut de ligne', () => {
      const { fichier } = lireRejet(lignesRejet());
      for (const [cible, valeur] of [
        [{ ligne: 9999, champ: 'nom' }, 'X'],
        [{ ligne: 1, champ: 'inexistant' }, 'X'],
        [{ ligne: 1, champ: 'nom' }, 'A\nB'],
      ] as const) {
        const resultat = modifierChamp(fichier, cible, valeur);
        expect(resultat.ok ? 'ok' : resultat.erreur.code).toBe('fichier-rejet');
      }
    });

    it('accepte la même modification en VEOS (le refus tient à la provenance)', () => {
      const { base, ligne405 } = rejetAccentue();
      const resultat = modifierChamp(
        lireVeos(base).fichier,
        { ligne: ligne405, champ: 'nom' },
        'AUTRE',
      );
      expect(resultat.ok).toBe(true);
    });
  });

  describe('ecrireAc056', () => {
    it('lève une erreur pour un rejet', () => {
      const { fichier } = lireRejet(lignesRejet());
      expect(() => ecrireAc056(fichier)).toThrow(/lecture seule/);
    });

    it('lève une erreur pour un rejet vide', () => {
      const { fichier } = lireAc056(new Uint8Array(), 'rejet');
      expect(() => ecrireAc056(fichier)).toThrow(/lecture seule/);
    });

    it('réécrit toujours un fichier VEOS à l identique', () => {
      const octets = fichierSynthetique(lignesCompletes());
      const sortie = ecrireAc056(lireAc056(octets).fichier);
      expect(enChaineBinaire(sortie)).toBe(enChaineBinaire(octets));
    });
  });
});
