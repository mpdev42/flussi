// Saisie d'un champ (`saisirChamp`) : modification en mémoire et recontrôle de la seule ligne
// modifiée. Le résultat doit être exactement l'analyse recalculée en entier sur le fichier modifié
// (lecture d'origine puis contrôle complet). Fichiers synthétiques uniquement.
import { describe, expect, it } from 'vitest';
import {
  enChaineBinaire,
  enOctetsBruts,
  fichierSynthetique,
  ligneSynthetique,
  lignesCompletes,
  lignesRejet,
  type OptionsFichierSynthetique,
} from '@shared/test/ac056-synthetique';
import {
  avecChamp,
  dansBeneficiaire,
  dansEvenement,
  ligne,
  sansNumDossier,
} from '@shared/test/controle-ac056';
import { analyserAc056, bilanAnalyse, type AnalyseAc056 } from './analyse';
import { compterAnomalies } from './compteurs';
import { controlerAc056 } from './controle';
import { ENTITES } from './entites';
import { indexerLignes } from './index-lignes';
import { lireAc056 } from './lecteur';
import type { FichierAc056 } from './modele';
import { controlerLigne, saisirChamp, type ResultatSaisie } from './saisie';

interface Chargement {
  readonly analyse: AnalyseAc056;
  readonly lecture: ReturnType<typeof lireAc056>['anomalies'];
}

function charger(lignes: readonly string[], options?: OptionsFichierSynthetique): Chargement {
  const octets = fichierSynthetique(lignes, options);
  return { analyse: analyserAc056(octets, 'veos'), lecture: lireAc056(octets).anomalies };
}

/** Analyse recalculée en entier sur un fichier modifié : lecture d'origine puis contrôle complet. */
const recalculee = (lecture: Chargement['lecture'], fichier: FichierAc056) =>
  bilanAnalyse(fichier, [...lecture, ...controlerAc056(fichier)]);

function reussie(resultat: ResultatSaisie): AnalyseAc056 {
  if (!resultat.ok) throw new Error(`échec inattendu : ${resultat.erreur.code}`);
  return resultat.analyse;
}

/** Numéros (base 1) des lignes de code `code`. */
const numerosDe = (lignes: readonly string[], code: string) =>
  lignes.flatMap((texte, i) => (texte.slice(22, 25) === code ? [i + 1] : []));

describe('saisirChamp', () => {
  it('ne fait rien si le texte est celui affiché d un champ sans erreur : même analyse', () => {
    // Une erreur sur un autre champ de la ligne ne compte pas.
    const lignes = dansEvenement(ligne('115', { nom: 'DUPONT', prenom1: 'J#AN' }));
    const { analyse } = charger(lignes);
    expect(analyse.erreurs).toBe(1);
    const index = indexerLignes(analyse.fichier);
    const resultat = saisirChamp(analyse, index, { ligne: 4, champ: 'nom' }, 'DUPONT');
    expect(reussie(resultat)).toBe(analyse);
  });

  it('applique le texte affiché d un champ en erreur : nouvelle analyse, même erreur', () => {
    const lignes = dansEvenement(ligne('115', { nom: 'D#PONT' }));
    const { analyse, lecture } = charger(lignes);
    const index = indexerLignes(analyse.fichier);
    const apres = reussie(saisirChamp(analyse, index, { ligne: 4, champ: 'nom' }, 'D#PONT'));
    expect(apres).not.toBe(analyse);
    expect(apres.erreurs).toBe(1);
    expect(apres).toEqual(recalculee(lecture, apres.fichier));
  });

  it('corrige une tabulation de tête retirée par Trim en ressaisissant le même texte', () => {
    const l405 = avecChamp(ligne('405'), '405', 'nom', '\tDUPONT');
    const { analyse, lecture } = charger(dansBeneficiaire('AUTRE', l405));
    expect(analyse.anomalies.map((a) => [a.ligne, a.champ, a.code])).toEqual([
      [5, 'nom', 'caractere-interdit'],
    ]);
    const index = indexerLignes(analyse.fichier);
    const apres = reussie(saisirChamp(analyse, index, { ligne: 5, champ: 'nom' }, 'DUPONT'));
    expect(apres.anomalies).toEqual([]);
    expect(apres.erreurs).toBe(0);
    expect(apres).toEqual(recalculee(lecture, apres.fichier));
  });

  it('refuse un texte qui contient U+FFFD, même identique au texte affiché', () => {
    const l405 = ligne('405', { nom: 'CAF\xE9' }); // octet Windows-1252 : UTF-8 invalide
    const { analyse } = charger(dansBeneficiaire('AUTRE', l405));
    const index = indexerLignes(analyse.fichier);
    expect(saisirChamp(analyse, index, { ligne: 5, champ: 'nom' }, 'CAF\uFFFD')).toEqual({
      ok: false,
      erreur: {
        code: 'caractere-illisible',
        message:
          'Entité 405 : caractère illisible dans le champ « Nom », à remplacer par le bon caractère.',
      },
    });
  });

  it('refuse un code postal en erreur ressaisi plus long que maxLength, et rien d autre', () => {
    const lignes = dansEvenement(ligne('120', { codePostalLocalite: '1234567' }));
    const { analyse } = charger(lignes);
    const index = indexerLignes(analyse.fichier);
    const cible = { ligne: 4, champ: 'codePostalLocalite' };
    expect(saisirChamp(analyse, index, cible, '1234567')).toMatchObject({
      ok: false,
      erreur: { code: 'valeur-trop-longue' },
    });
    expect(reussie(saisirChamp(analyse, index, cible, '12345')).erreurs).toBe(0);
  });

  it('corrige une erreur : l anomalie disparaît et les compteurs suivent', () => {
    const lignes = dansEvenement(ligne('115', { nom: 'D#PONT' }));
    const { analyse, lecture } = charger(lignes);
    expect(analyse.erreurs).toBe(1);
    const index = indexerLignes(analyse.fichier);
    const apres = reussie(saisirChamp(analyse, index, { ligne: 4, champ: 'nom' }, 'DUPONT'));
    expect(apres.anomalies).toEqual([]);
    expect(apres.erreurs).toBe(0);
    expect(apres).toEqual(recalculee(lecture, apres.fichier));
    expect(Object.isFrozen(apres)).toBe(true);
    expect(Object.isFrozen(apres.anomalies)).toBe(true);
  });

  it('introduit une erreur sans toucher l analyse reçue', () => {
    const { analyse, lecture } = charger(dansEvenement(ligne('115', { nom: 'DUPONT' })));
    const index = indexerLignes(analyse.fichier);
    const apres = reussie(saisirChamp(analyse, index, { ligne: 4, champ: 'nom' }, 'D#PONT'));
    expect(apres.anomalies.map((a) => [a.ligne, a.champ, a.code])).toEqual([
      [4, 'nom', 'caractere-non-autorise'],
    ]);
    expect(apres).toEqual(recalculee(lecture, apres.fichier));
    expect(analyse.anomalies).toEqual([]);
  });

  it('garde les anomalies de lecture de la ligne avant son nouveau contrôle', () => {
    const lignes = dansEvenement(ligne('115', { nom: 'D#PONT', prenom1: 'J@N' }));
    const fins = lignes.map((_l, i) => (i === 3 ? ('\n' as const) : ('\r\n' as const)));
    const { analyse, lecture } = charger(lignes, { fin: fins });
    const index = indexerLignes(analyse.fichier);
    const apres = reussie(saisirChamp(analyse, index, { ligne: 4, champ: 'nom' }, 'DUPONT'));
    expect(apres.anomalies.map((a) => [a.ligne, a.code, a.champ])).toEqual([
      [4, 'fin-de-ligne-lf', undefined],
      [4, 'caractere-non-autorise', 'prenom1'],
    ]);
    expect(apres).toEqual(recalculee(lecture, apres.fichier));
  });

  it('garde les anomalies de structure : 115 en double non rattachée (divergence 5 seule)', () => {
    const lignes = dansEvenement(ligne('115', { nom: 'D#PONT' }), ligne('115', { nom: 'D#PONT' }));
    const { analyse, lecture } = charger(lignes);
    // Ligne 4 perdue (le dernier gagne) : seule la ligne 5 est contrôlée par les règles Lazarus.
    expect(analyse.anomalies.map((a) => [a.ligne, a.code])).toEqual([
      [5, 'entite-en-double'],
      [5, 'caractere-non-autorise'],
    ]);
    const index = indexerLignes(analyse.fichier);
    const avecInterdit = reussie(saisirChamp(analyse, index, { ligne: 4, champ: 'nom' }, 'DUPÉ'));
    expect(avecInterdit.anomalies.map((a) => [a.ligne, a.code])).toEqual([
      [4, 'caractere-interdit'],
      [5, 'entite-en-double'],
      [5, 'caractere-non-autorise'],
    ]);
    expect(avecInterdit).toEqual(recalculee(lecture, avecInterdit.fichier));
    const corrigee = reussie(saisirChamp(avecInterdit, index, { ligne: 5, champ: 'nom' }, 'A'));
    expect(corrigee.anomalies.map((a) => [a.ligne, a.code])).toEqual([
      [4, 'caractere-interdit'],
      [5, 'entite-en-double'],
    ]);
    expect(corrigee).toEqual(recalculee(lecture, corrigee.fichier));
  });

  it('juge le rang avec le type d assuré de la 400 (ENFANT : seuil 40)', () => {
    const lignes = dansBeneficiaire('ENFANT', ligne('700', { rang: '40' }));
    const { analyse, lecture } = charger(lignes);
    expect(analyse.anomalies.map((a) => [a.ligne, a.code])).toEqual([[5, 'rang-incoherent']]);
    const index = indexerLignes(analyse.fichier);
    const apres = reussie(saisirChamp(analyse, index, { ligne: 5, champ: 'rang' }, '39'));
    expect(apres.anomalies).toEqual([]);
    const pire = reussie(saisirChamp(apres, index, { ligne: 5, champ: 'rang' }, 'X'));
    expect(pire.anomalies.map((a) => a.code)).toEqual(['rang-non-numerique']);
    expect(pire).toEqual(recalculee(lecture, pire.fichier));
  });

  it('renvoie l erreur de modification sans analyse', () => {
    const { analyse } = charger(dansEvenement(ligne('115')));
    const index = indexerLignes(analyse.fichier);
    expect(saisirChamp(analyse, index, { ligne: 4, champ: 'nom' }, 'A\nB')).toMatchObject({
      ok: false,
      erreur: { code: 'saut-de-ligne' },
    });
    expect(saisirChamp(analyse, index, { ligne: 4, champ: 'codeCivilite' }, 'M')).toMatchObject({
      ok: false,
      erreur: { code: 'champ-non-modifiable' },
    });
    expect(saisirChamp(analyse, index, { ligne: 99, champ: 'nom' }, 'A')).toMatchObject({
      ok: false,
      erreur: { code: 'ligne-introuvable' },
    });
  });

  it('refuse toute saisie dans un fichier de rejet', () => {
    const analyse = analyserAc056(fichierSynthetique(lignesRejet({ dossiers: 1 })), 'rejet');
    const index = indexerLignes(analyse.fichier);
    const numero = analyse.fichier.lignes.find((l) => l.code === '405')!.numero;
    const texte = 'DUPONT';
    expect(saisirChamp(analyse, index, { ligne: numero, champ: 'nom' }, texte)).toMatchObject({
      ok: false,
      erreur: { code: 'fichier-rejet' },
    });
  });

  describe('égale l analyse recalculée en entier, pour chaque champ modifiable', () => {
    // Fichier qui mêle : BOM, ligne vide, fin LF, 115 et 120 en double, ENFANT, ASCEND, rang non
    // numérique, ligne brute de code connu (400 de 699 octets) et ses filles.
    const base = lignesCompletes({ dossiers: 1 });
    const i400 = base.findIndex((l) => l.slice(22, 25) === '400');
    const lignes = [
      ...base.slice(0, i400),
      ligne('115', { nom: 'DOUBLON' }),
      ligne('120', { libelleVoie: 'rue' }),
      ligneSynthetique('400', { typeAssure: 'ENFANT', rang: '40', rangPersonne: '41' }),
      ligne('405', { rang: '39', nom: 'ENFANT' }),
      ligne('700', { rang: '40' }),
      ligneSynthetique('400', { typeAssure: 'ASCEND', rang: '99' }),
      ligne('485', { rang: 'XX' }),
      ligneSynthetique('400', { typeAssure: 'CONJOI' }).slice(0, 699),
      ligne('405', { rang: '21' }),
      ...base.slice(i400),
    ];
    lignes.splice(2, 0, '');
    const fins = lignes.map((_l, i) => (i === 6 ? ('\n' as const) : ('\r\n' as const)));
    const corps = enChaineBinaire(fichierSynthetique(lignes, { bom: true, fin: fins }));
    const octets = enOctetsBruts(corps);
    const VALEURS = ['A', 'D#PONT', 'é', '\t', '40', '39', '21', '20', 'X', '', '12345', '1234'];

    it('chaque saisie, sur chaque ligne décrite', () => {
      const analyse = analyserAc056(octets, 'veos');
      const { anomalies: lecture } = lireAc056(octets);
      const index = indexerLignes(analyse.fichier);
      let saisies = 0;
      for (const l of analyse.fichier.lignes) {
        if (l.nature !== 'decrite') continue;
        for (const champ of ENTITES[l.code].champs.filter((c) => c.modifiable)) {
          for (const texte of VALEURS) {
            const resultat = saisirChamp(
              analyse,
              index,
              { ligne: l.numero, champ: champ.nom },
              texte,
            );
            if (!resultat.ok) continue;
            saisies++;
            expect(resultat.analyse, `ligne ${l.numero}, ${champ.nom}`).toEqual(
              recalculee(lecture, resultat.analyse.fichier),
            );
          }
        }
      }
      expect(saisies).toBeGreaterThan(500);
    }, 60_000);
  });
});

describe('saisirChamp, n° de dossier vide (présence conditionnelle de Lazarus)', () => {
  it('ne contrôle pas la 115 sans n° de dossier, ni avant ni après la saisie', () => {
    const octets = fichierSynthetique(dansEvenement(ligne('115', { nom: 'D#PONT' })));
    const { fichier, anomalies: lecture } = lireAc056(octets);
    const vide = sansNumDossier(fichier, 4);
    const analyse = bilanAnalyse(vide, [...lecture, ...controlerAc056(vide)]);
    expect(analyse.anomalies).toEqual([]);
    const index = indexerLignes(vide);
    const apres = reussie(saisirChamp(analyse, index, { ligne: 4, champ: 'nom' }, 'D@PONT'));
    expect(apres.anomalies).toEqual([]);
    const interdit = reussie(saisirChamp(apres, index, { ligne: 4, champ: 'nom' }, 'DUPÉ'));
    // La divergence 5 porte sur toute ligne de code connu, n° de dossier vide compris.
    expect(interdit.anomalies.map((a) => a.code)).toEqual(['caractere-interdit']);
    expect(interdit).toEqual(recalculee(lecture, interdit.fichier));
  });
});

describe('controlerLigne', () => {
  it('donne les anomalies du contrôle complet de cette ligne, dans le même ordre', () => {
    const lignes = dansBeneficiaire(
      'CONJOI',
      ligne('405', { rang: '25', nom: 'A!', prenom1: 'B@', numInsee: '1 2' }),
    );
    const { analyse } = charger(lignes);
    const index = indexerLignes(analyse.fichier);
    analyse.fichier.lignes.forEach((l, indice) => {
      expect(controlerLigne(analyse.fichier, index, indice)).toEqual(
        controlerAc056(analyse.fichier).filter((a) => a.ligne === l.numero),
      );
    });
  });

  it('lève une erreur pour un indice hors du fichier', () => {
    const { analyse } = charger(dansEvenement(ligne('115')));
    const index = indexerLignes(analyse.fichier);
    const indice = analyse.fichier.lignes.length;
    expect(() => controlerLigne(analyse.fichier, index, indice)).toThrow(
      `Indice de ligne hors du fichier : ${indice}.`,
    );
  });
});

describe('saisirChamp, index incohérent avec le fichier (invariant violé)', () => {
  const lignes = dansEvenement(ligne('115', { nom: 'D#PONT' }));
  const cible = { ligne: 4, champ: 'nom' };
  const message = 'Index des lignes incohérent avec le fichier : ligne 4.';

  it('lève une erreur si la ligne est absente de l index', () => {
    const { analyse } = charger(lignes);
    const index = { ...indexerLignes(analyse.fichier), indices: new Map<number, number>() };
    expect(() => saisirChamp(analyse, index, cible, 'DUPONT')).toThrow(message);
  });

  it('lève une erreur si l index désigne une autre ligne', () => {
    const { analyse } = charger(lignes);
    const index = { ...indexerLignes(analyse.fichier), indices: new Map([[4, 0]]) };
    expect(() => saisirChamp(analyse, index, cible, 'DUPONT')).toThrow(message);
  });

  it('lève une erreur si l index est celui d un autre fichier, plus court', () => {
    const { analyse } = charger(lignes);
    const autre = charger(lignes.slice(0, 2)).analyse;
    expect(() => saisirChamp(analyse, indexerLignes(autre.fichier), cible, 'DUPONT')).toThrow(
      message,
    );
  });
});

describe('mesure de la sortie de champ (non bloquante)', () => {
  /** Médiane et maximum (ms) de `n` exécutions de `fn`. */
  function mesurer(n: number, fn: (i: number) => void): { mediane: number; max: number } {
    const durees: number[] = [];
    for (let i = 0; i < n; i++) {
      const debut = performance.now();
      fn(i);
      durees.push(performance.now() - debut);
    }
    durees.sort((a, b) => a - b);
    return { mediane: durees[Math.floor(n / 2)]!, max: durees.at(-1)! };
  }

  // 81 dossiers : 2 + 68 x 81 = 5 510 lignes de 700 octets (3,9 Mo), taille d'un gros AC056.
  it('saisirChamp puis compterAnomalies sur un fichier de 3,9 Mo', async ({ annotate }) => {
    const lignes = lignesCompletes({ dossiers: 81 });
    expect(lignes.length).toBe(5510);
    const octets = fichierSynthetique(lignes);
    expect(octets.length).toBeGreaterThan(3_850_000);
    const analyse = analyserAc056(octets, 'veos');
    const index = indexerLignes(analyse.fichier);
    const numeros = numerosDe(lignes, '405');
    const numero = numeros[Math.floor(numeros.length / 2)]!;

    let courante = analyse;
    const saisie = mesurer(15, (i) => {
      courante = reussie(saisirChamp(courante, index, { ligne: numero, champ: 'nom' }, `NOM${i}#`));
    });
    const controle = mesurer(15, () => controlerAc056(courante.fichier));
    const compteurs = mesurer(15, () => compterAnomalies(index, courante.anomalies));
    const ms = (m: { mediane: number; max: number }) =>
      `médiane ${m.mediane.toFixed(1)} ms, max ${m.max.toFixed(1)} ms`;
    const message =
      `${lignes.length} lignes : saisirChamp ${ms(saisie)} ; dont controlerAc056 ` +
      `${ms(controle)} ; compterAnomalies ${ms(compteurs)}`;
    console.info(message);
    await annotate(message);
    expect(courante.erreurs).toBe(1);
    // Assertion large : la mesure ne doit pas faire échouer la CI sur une machine lente.
    expect(saisie.mediane).toBeLessThan(5000);
  }, 60_000);
});
