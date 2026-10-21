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
  marquerCorriges,
  sansNumDossier,
} from '@shared/test/controle-ac056';
import { analyserAc056, bilanAnalyse, familleAnomalie, type AnalyseAc056 } from './analyse';
import { compterAnomalies } from './compteurs';
import { controlerAc056 } from './controle';
import { ENTITES } from './entites';
import { indexerLignes } from './index-lignes';
import { lireAc056 } from './lecteur';
import type { FichierAc056 } from './modele';
import {
  champEnErreur,
  controlerLigne,
  peutCorriger,
  saisirChamp,
  type ResultatSaisie,
} from './saisie';

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

/**
 * Lecture d'un fichier dont les champs modifiables (de toutes les lignes, ou de `numeros`) sont
 * marqués comme déjà corrigés : `saisirChamp` les accepte alors, en erreur ou non.
 */
function chargerCorriges(
  lignes: readonly string[],
  numeros?: readonly number[],
  options?: OptionsFichierSynthetique,
): { readonly lecture: Chargement['lecture']; readonly fichier: FichierAc056 } {
  const { fichier, anomalies } = lireAc056(fichierSynthetique(lignes, options));
  return { lecture: anomalies, fichier: marquerCorriges(fichier, numeros) };
}

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

  it('introduit une erreur dans un champ déjà corrigé, sans toucher l analyse reçue', () => {
    const { lecture, fichier } = chargerCorriges(dansEvenement(ligne('115', { nom: 'DUPONT' })));
    const analyse = recalculee(lecture, fichier);
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

  describe('fichier en anomalie de structure : refus fichier-mal-forme', () => {
    // 115 en double : la ligne 4 est perdue (le dernier gagne), la ligne 5 est en erreur.
    const lignes = dansEvenement(ligne('115', { nom: 'D#PONT' }), ligne('115', { nom: 'D#PONT' }));
    const MAL_FORME = {
      code: 'fichier-mal-forme',
      message:
        "Fichier mal formé : aucun champ ne se corrige dans Flussi. Relancez l'export dans VEOS.",
    };

    it('refuse même un champ en erreur', () => {
      const { analyse } = charger(lignes);
      expect(analyse.structure).toBe(1);
      expect(analyse.anomalies.map((a) => [a.ligne, a.code])).toEqual([
        [5, 'entite-en-double'],
        [5, 'caractere-non-autorise'],
      ]);
      const index = indexerLignes(analyse.fichier);
      expect(saisirChamp(analyse, index, { ligne: 5, champ: 'nom' }, 'DUPONT')).toEqual({
        ok: false,
        erreur: MAL_FORME,
      });
    });

    it('refuse un champ déjà corrigé et un champ sans erreur', () => {
      const { lecture, fichier } = chargerCorriges(lignes, [4]);
      const analyse = recalculee(lecture, fichier);
      const index = indexerLignes(analyse.fichier);
      expect(saisirChamp(analyse, index, { ligne: 4, champ: 'nom' }, 'A')).toEqual({
        ok: false,
        erreur: MAL_FORME,
      });
      expect(saisirChamp(analyse, index, { ligne: 5, champ: 'prenom1' }, 'A')).toEqual({
        ok: false,
        erreur: MAL_FORME,
      });
    });

    it('garde le raccourci avant le refus : texte inchangé d un champ sans erreur', () => {
      const { analyse } = charger(lignes);
      const index = indexerLignes(analyse.fichier);
      expect(reussie(saisirChamp(analyse, index, { ligne: 5, champ: 'prenom1' }, ''))).toBe(
        analyse,
      );
    });
  });

  describe('champ sans erreur ni correction : refus champ-verrouille', () => {
    it('refuse la saisie d un champ modifiable sans erreur, sans citer la valeur', () => {
      const { analyse } = charger(dansEvenement(ligne('115', { nom: 'DUPONT', prenom1: 'J#AN' })));
      const index = indexerLignes(analyse.fichier);
      expect(saisirChamp(analyse, index, { ligne: 4, champ: 'nom' }, 'SECRET')).toEqual({
        ok: false,
        erreur: {
          code: 'champ-verrouille',
          message: 'Entité 115 : champ « Nom » sans erreur, non modifiable.',
        },
      });
    });

    it('laisse modifier un champ déjà corrigé, même sans erreur (décision 2)', () => {
      const { analyse, lecture } = charger(dansEvenement(ligne('115', { nom: 'D#PONT' })));
      const index = indexerLignes(analyse.fichier);
      const cible = { ligne: 4, champ: 'nom' };
      const corrigee = reussie(saisirChamp(analyse, index, cible, 'DUPONT'));
      expect(corrigee.erreurs).toBe(0);
      const encore = reussie(saisirChamp(corrigee, index, cible, 'DURAND'));
      expect(encore.fichier.lignes[3]).toMatchObject({ champsModifies: ['nom'] });
      expect(encore).toEqual(recalculee(lecture, encore.fichier));
    });

    it('garde les refus de modifierChamp pour un champ jamais modifiable', () => {
      const { analyse } = charger(dansEvenement(ligne('115')));
      const index = indexerLignes(analyse.fichier);
      expect(saisirChamp(analyse, index, { ligne: 4, champ: 'codeCivilite' }, 'M')).toMatchObject({
        ok: false,
        erreur: { code: 'champ-non-modifiable' },
      });
      expect(saisirChamp(analyse, index, { ligne: 4, champ: 'inexistant' }, 'M')).toMatchObject({
        ok: false,
        erreur: { code: 'champ-inconnu' },
      });
      expect(saisirChamp(analyse, index, { ligne: 1, champ: 'nom' }, 'M')).toMatchObject({
        ok: false,
        erreur: { code: 'ligne-non-decrite' },
      });
    });

    it('refuse un rang sur un seul chiffre (valeur-trop-courte)', () => {
      const { analyse } = charger(dansBeneficiaire('ENFANT', ligne('700', { rang: '40' })));
      const index = indexerLignes(analyse.fichier);
      expect(saisirChamp(analyse, index, { ligne: 5, champ: 'rang' }, '5')).toEqual({
        ok: false,
        erreur: { code: 'valeur-trop-courte', message: 'Saisissez 2 chiffres, par exemple 05.' },
      });
    });
  });

  it('juge le rang avec le type d assuré de la 400 (ENFANT : seuil 40)', () => {
    const lignes = dansBeneficiaire('ENFANT', ligne('700', { rang: '40' }));
    const { analyse, lecture } = charger(lignes);
    expect(analyse.anomalies.map((a) => [a.ligne, a.code])).toEqual([[5, 'rang-incoherent']]);
    const index = indexerLignes(analyse.fichier);
    const apres = reussie(saisirChamp(analyse, index, { ligne: 5, champ: 'rang' }, '39'));
    expect(apres.anomalies).toEqual([]);
    // Un rang non numérique ne se saisit plus (précision B3) : seul le seuil reste à juger.
    expect(saisirChamp(apres, index, { ligne: 5, champ: 'rang' }, 'XX')).toMatchObject({
      ok: false,
      erreur: { code: 'valeur-trop-courte' },
    });
    const pire = reussie(saisirChamp(apres, index, { ligne: 5, champ: 'rang' }, '45'));
    expect(pire.anomalies.map((a) => a.code)).toEqual(['rang-incoherent']);
    expect(pire).toEqual(recalculee(lecture, pire.fichier));
  });

  it('renvoie l erreur de modification sans analyse', () => {
    const { analyse } = charger(dansEvenement(ligne('115', { nom: 'D#PONT' })));
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
    // Fichier qui mêle : BOM, ligne vide, fin LF, ENFANT, ASCEND, CONJOI, rang non numérique,
    // libellé de voie en minuscules. Sans anomalie de structure : la saisie y serait refusée.
    // Tous les champs modifiables sont marqués comme déjà corrigés, pour être tous saisissables.
    const base = lignesCompletes({ dossiers: 1 });
    const i400 = base.findIndex((l) => l.slice(22, 25) === '400');
    const i120 = base.findIndex((l) => l.slice(22, 25) === '120');
    base[i120] = ligne('120', { libelleVoie: 'rue' });
    const lignes = [
      ...base.slice(0, i400),
      ligneSynthetique('400', { typeAssure: 'ENFANT', rang: '40', rangPersonne: '41' }),
      ligne('405', { rang: '39', nom: 'ENFANT' }),
      ligne('700', { rang: '40' }),
      ligneSynthetique('400', { typeAssure: 'ASCEND', rang: '99' }),
      ligne('485', { rang: 'XX' }),
      ligneSynthetique('400', { typeAssure: 'CONJOI' }),
      ligne('405', { rang: '21' }),
      ...base.slice(i400),
    ];
    lignes.splice(2, 0, '');
    const fins = lignes.map((_l, i) => (i === 6 ? ('\n' as const) : ('\r\n' as const)));
    const corps = enChaineBinaire(fichierSynthetique(lignes, { bom: true, fin: fins }));
    const octets = enOctetsBruts(corps);
    const VALEURS = ['A', 'D#PONT', 'é', '\t', '40', '39', '21', '20', 'XX', '', '12345', '1234'];

    it('chaque saisie, sur chaque ligne décrite', () => {
      const { fichier: lu, anomalies: lecture } = lireAc056(octets);
      const analyse = recalculee(lecture, marquerCorriges(lu));
      expect(analyse.structure).toBe(0);
      expect(analyse.erreurs).toBeGreaterThan(0);
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
            if (!resultat.ok) {
              // Seuls refus attendus : longueur (trop longue, ou rang incomplet).
              expect(['valeur-trop-longue', 'valeur-trop-courte']).toContain(resultat.erreur.code);
              continue;
            }
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
    // Champ marqué comme corrigé : sans contrôle, il n'est jamais en erreur.
    const vide = marquerCorriges(sansNumDossier(fichier, 4), [4]);
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
    const numeros = numerosDe(lignes, '405');
    const numero = numeros[Math.floor(numeros.length / 2)]!;
    // Le nom de cette 405 est marqué comme corrigé : il reste saisissable sans erreur.
    const { fichier, anomalies: lecture } = lireAc056(octets);
    const analyse = recalculee(lecture, marquerCorriges(fichier, [numero]));
    expect(analyse.anomalies).toEqual(analyserAc056(octets, 'veos').anomalies);
    const index = indexerLignes(analyse.fichier);

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

describe('peutCorriger', () => {
  it.each([
    [true, true, false, true, true],
    [true, false, true, true, true],
    [true, true, true, true, true],
    [true, false, false, true, false],
    [false, true, true, true, false],
    [true, true, true, false, false],
    [true, true, false, false, false],
  ])(
    'modifiable %s, en erreur %s, corrigé %s, fichier modifiable %s : %s',
    (modifiable, enErreur, corrige, fichierModifiable, attendu) => {
      expect(peutCorriger({ modifiable, enErreur, corrige, fichierModifiable })).toBe(attendu);
    },
  );
});

describe('champEnErreur', () => {
  // Fichier qui mêle anomalies de lecture (BOM, LF), de structure et de contrôle.
  const lignes = dansBeneficiaire(
    'CONJOI',
    ligne('405', { rang: '25', nom: 'A!', prenom1: '\tB' }),
    ligne('410', { rang: '2X' }),
    ligne('410'),
  );
  const fins = lignes.map((_l, i) => (i === 4 ? ('\n' as const) : ('\r\n' as const)));
  const analyse = analyserAc056(fichierSynthetique(lignes, { bom: true, fin: fins }), 'veos');

  it('ne trouve un champ que sur les anomalies de contrôle', () => {
    expect(analyse.anomalies.some((a) => familleAnomalie(a.code) !== 'controle')).toBe(true);
    for (const a of analyse.anomalies) {
      if (a.champ !== undefined) expect(familleAnomalie(a.code)).toBe('controle');
    }
  });

  it('donne le même résultat que le filtre de l écran et que la famille de contrôle', () => {
    let enErreur = 0;
    for (const l of analyse.fichier.lignes) {
      if (l.nature !== 'decrite') continue;
      for (const champ of ENTITES[l.code].champs) {
        const cible = { ligne: l.numero, champ: champ.nom };
        // Écran : anomalies bloquantes de la ligne, puis celles du champ.
        const ecran = analyse.anomalies
          .filter((a) => a.bloquante && a.ligne === l.numero)
          .some((a) => a.champ === champ.nom);
        const controle = analyse.anomalies.some(
          (a) =>
            a.bloquante &&
            a.ligne === l.numero &&
            a.champ === champ.nom &&
            familleAnomalie(a.code) === 'controle',
        );
        expect(champEnErreur(analyse.anomalies, cible)).toBe(ecran);
        expect(champEnErreur(analyse.anomalies, cible)).toBe(controle);
        if (ecran) enErreur++;
      }
    }
    expect(enErreur).toBeGreaterThanOrEqual(3);
  });
});
