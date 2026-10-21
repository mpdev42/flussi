// Préparation de l'enregistrement (`correctionsAc056`, `preparerEnregistrement`) : refus, octets
// écrits, exceptions à la règle « octet par octet » (lignes vides, 0x1A finaux), champs modifiés
// comptés par différence, report de `champsModifies` sur l'analyse du fichier écrit, équivalence
// avec la saisie à l'écran, chaîne complète et performance. Fichiers synthétiques uniquement.
import { describe, expect, it } from 'vitest';
import {
  enChaineBinaire,
  enOctetsBruts,
  fichierSynthetique,
  lignesCompletes,
  lignesRejet,
} from '@shared/test/ac056-synthetique';
import { avecChamp, dansBeneficiaire, dansEvenement, ligne } from '@shared/test/controle-ac056';
import { analyserAc056 } from './analyse';
import { ecrireAc056 } from './ecrivain';
import {
  correctionsAc056,
  preparerEnregistrement,
  type CorrectionAc056,
  type ResultatPreparation,
} from './enregistrement';
import { indexerLignes } from './index-lignes';
import { lireAc056 } from './lecteur';
import type { FichierAc056, LigneDecrite } from './modele';
import { modifierChamp } from './modification';
import { texteDepuisOctets } from './octets';
import { saisirChamp } from './saisie';

type Reussie = Extract<ResultatPreparation, { ok: true }>;

function reussie(resultat: ResultatPreparation): Reussie {
  if (!resultat.ok) throw new Error(`échec inattendu : ${resultat.code}`);
  return resultat;
}

function modifie(fichier: FichierAc056, ligne: number, champ: string, texte: string): FichierAc056 {
  const resultat = modifierChamp(fichier, { ligne, champ }, texte);
  if (!resultat.ok) throw new Error(`échec inattendu : ${resultat.erreur.code}`);
  return resultat.fichier;
}

function decrite(l: FichierAc056['lignes'][number] | undefined): LigneDecrite {
  if (l?.nature !== 'decrite') throw new Error('ligne décrite attendue');
  return l;
}

/** Numéros (base 1) des lignes de code `code`. */
const numerosDe = (lignes: readonly string[], code: string) =>
  lignes.flatMap((texte, i) => (texte.slice(22, 25) === code ? [i + 1] : []));

const COMPLET = lignesCompletes({ dossiers: 1 });
const OCTETS_COMPLETS = fichierSynthetique(COMPLET);
const [N405, N405_BIS] = numerosDe(COMPLET, '405') as [number, number];
const [N115] = numerosDe(COMPLET, '115') as [number];

describe('correctionsAc056', () => {
  it('ne renvoie rien pour un fichier sans modification', () => {
    expect(correctionsAc056(lireAc056(OCTETS_COMPLETS).fichier)).toEqual([]);
  });

  it('une correction par champ modifié, dans l ordre du fichier puis des champs', () => {
    let fichier = lireAc056(OCTETS_COMPLETS).fichier;
    fichier = modifie(fichier, N405_BIS, 'prenom1', 'JEAN');
    fichier = modifie(fichier, N405, 'prenom1', 'LOUIS');
    fichier = modifie(fichier, N405, 'nom', 'MARTIN');
    fichier = modifie(fichier, N405, 'nom', 'DURAND');
    fichier = modifie(fichier, N115, 'nom', 'DUPONT');
    expect(correctionsAc056(fichier)).toEqual([
      { ligne: N115, champ: 'nom', texte: 'DUPONT' },
      { ligne: N405, champ: 'nom', texte: 'DURAND' },
      { ligne: N405, champ: 'prenom1', texte: 'LOUIS' },
      { ligne: N405_BIS, champ: 'prenom1', texte: 'JEAN' },
    ]);
  });

  it.each(['Éloïse', 'CAFÉ €', '\uD834\uDD1E', '\uFEFFX', '', 'A\tB', 'X  Y'])(
    'rend le texte saisi à l identique (%j)',
    (texte) => {
      const fichier = modifie(lireAc056(OCTETS_COMPLETS).fichier, N405, 'nom', texte);
      expect(correctionsAc056(fichier)).toEqual([{ ligne: N405, champ: 'nom', texte }]);
    },
  );

  it.each([
    ['  X ', 'X'],
    ['\tDUPONT', 'DUPONT'],
    ['   ', ''],
  ])('rend la valeur gardée, rognée pour un champ trimé (%j)', (saisi, texte) => {
    const fichier = modifie(lireAc056(OCTETS_COMPLETS).fichier, N405, 'nom', saisi);
    expect(correctionsAc056(fichier)).toEqual([{ ligne: N405, champ: 'nom', texte }]);
  });
});

describe('preparerEnregistrement : refus', () => {
  it('refuse un fichier de rejet', () => {
    const octets = fichierSynthetique(lignesRejet({ dossiers: 1 }));
    expect(preparerEnregistrement(octets, 'rejet', [])).toEqual({
      ok: false,
      code: 'fichier-rejet',
    });
  });

  it('refuse un fichier en anomalie de structure', () => {
    const lignes = dansEvenement(ligne('110'), ligne('110'));
    expect(preparerEnregistrement(fichierSynthetique(lignes), 'veos', [])).toEqual({
      ok: false,
      code: 'fichier-mal-forme',
    });
  });

  it('refuse un fichier vide', () => {
    expect(preparerEnregistrement(new Uint8Array(), 'veos', [])).toEqual({
      ok: false,
      code: 'fichier-mal-forme',
    });
  });

  it('s arrête à la première correction refusée, avec son indice et l erreur', () => {
    const corrections: CorrectionAc056[] = [
      { ligne: N405, champ: 'nom', texte: 'MARTIN' },
      { ligne: N405, champ: 'rang', texte: '5' },
      { ligne: 999, champ: 'nom', texte: 'X' },
    ];
    expect(preparerEnregistrement(OCTETS_COMPLETS, 'veos', corrections)).toEqual({
      ok: false,
      code: 'correction-refusee',
      indice: 1,
      erreur: { code: 'valeur-trop-courte', message: 'Saisissez 2 chiffres, par exemple 05.' },
    });
  });

  it.each([' 5', '5 ', 'A5'])('refuse un rang %j : chiffres seuls (précision B3)', (texte) => {
    const resultat = preparerEnregistrement(OCTETS_COMPLETS, 'veos', [
      { ligne: N405, champ: 'rang', texte },
    ]);
    expect(resultat).toMatchObject({
      ok: false,
      code: 'correction-refusee',
      indice: 0,
      erreur: { code: 'valeur-trop-courte' },
    });
  });

  it.each([
    [{ ligne: 999, champ: 'nom', texte: 'X' }, 'ligne-introuvable'],
    [{ ligne: N405, champ: 'codeCivilite', texte: 'M' }, 'champ-non-modifiable'],
    [{ ligne: N405, champ: 'nom', texte: 'A\nB' }, 'saut-de-ligne'],
    [{ ligne: N405, champ: 'nom', texte: 'N'.repeat(51) }, 'valeur-trop-longue'],
    [{ ligne: N405, champ: 'nom', texte: '\uD834' }, 'caractere-illisible'],
  ] as const)('refuse %j : %s', (correction, code) => {
    const resultat = preparerEnregistrement(OCTETS_COMPLETS, 'veos', [correction]);
    expect(resultat).toMatchObject({ ok: false, code: 'correction-refusee', indice: 0 });
    expect(!resultat.ok && resultat.code === 'correction-refusee' && resultat.erreur.code).toBe(
      code,
    );
  });
});

describe('preparerEnregistrement : octets écrits', () => {
  it('sans correction ni défaut : identique au fichier lu', () => {
    const resultat = reussie(preparerEnregistrement(OCTETS_COMPLETS, 'veos', []));
    expect(resultat.identique).toBe(true);
    expect(enChaineBinaire(resultat.octets)).toBe(enChaineBinaire(OCTETS_COMPLETS));
    expect(resultat).toMatchObject({ champsModifies: 0, lignesVides: 0, ctrlZ: false });
  });

  it('supprime les lignes vides et les 0x1A finaux, et les compte', () => {
    const avecDefauts = [...COMPLET];
    avecDefauts.splice(3, 0, '');
    avecDefauts.splice(1, 0, '');
    const octets = enOctetsBruts(`${enChaineBinaire(fichierSynthetique(avecDefauts))}\x1A\x1A`);
    const resultat = reussie(preparerEnregistrement(octets, 'veos', []));
    expect(resultat.identique).toBe(false);
    expect(enChaineBinaire(resultat.octets)).toBe(enChaineBinaire(OCTETS_COMPLETS));
    expect(resultat).toMatchObject({ champsModifies: 0, lignesVides: 2, ctrlZ: true });
  });

  it('conserve BOM, fins de ligne et absence de saut final', () => {
    const octets = fichierSynthetique(COMPLET, { bom: true, fin: '\n', sautFinal: true });
    const resultat = reussie(preparerEnregistrement(octets, 'veos', []));
    expect(resultat.identique).toBe(true);
  });

  it('recopie une ligne que Lazarus réécrirait (Trim, bourrage) : identique (décision 4)', () => {
    const lignes = [...COMPLET];
    lignes[N405 - 1] = avecChamp(lignes[N405 - 1]!, '405', 'nom', ' DUPONT');
    lignes[N405_BIS - 1] = avecChamp(lignes[N405_BIS - 1]!, '405', 'prenom1', '\tJEAN');
    const octets = fichierSynthetique(lignes);
    const resultat = reussie(preparerEnregistrement(octets, 'veos', []));
    expect(resultat.identique).toBe(true);
    expect(enChaineBinaire(resultat.octets)).toBe(enChaineBinaire(octets));
    expect(resultat.champsModifies).toBe(0);
  });

  it('ne change que le champ corrigé : la tabulation d un autre champ reste (et son erreur)', () => {
    const lignes = [...COMPLET];
    lignes[N405 - 1] = avecChamp(lignes[N405 - 1]!, '405', 'prenom1', '\tJEAN');
    const octets = fichierSynthetique(lignes);
    expect(analyserAc056(octets, 'veos').anomalies.map((a) => [a.ligne, a.champ])).toEqual([
      [N405, 'prenom1'],
    ]);
    const corrections = [{ ligne: N405, champ: 'nom', texte: 'MARTIN' }];
    const resultat = reussie(preparerEnregistrement(octets, 'veos', corrections));
    const attendu = [...lignes];
    attendu[N405 - 1] = avecChamp(attendu[N405 - 1]!, '405', 'nom', 'MARTIN');
    expect(enChaineBinaire(resultat.octets)).toBe(enChaineBinaire(fichierSynthetique(attendu)));
    expect(resultat.champsModifies).toBe(1);
    expect(resultat.analyse.anomalies.map((a) => [a.ligne, a.champ])).toEqual([[N405, 'prenom1']]);
  });

  it('idempotent : un second enregistrement sans saisie ne réécrit rien (précision B2)', () => {
    const corrections = [{ ligne: N405, champ: 'nom', texte: ' DUPONT' }];
    const premier = reussie(preparerEnregistrement(OCTETS_COMPLETS, 'veos', corrections));
    expect(correctionsAc056(premier.analyse.fichier)).toEqual([
      { ligne: N405, champ: 'nom', texte: 'DUPONT' },
    ]);
    const second = reussie(
      preparerEnregistrement(premier.octets, 'veos', correctionsAc056(premier.analyse.fichier)),
    );
    expect(second.identique).toBe(true);
    expect(second.champsModifies).toBe(0);
    expect(correctionsAc056(second.analyse.fichier)).toEqual(
      correctionsAc056(premier.analyse.fichier),
    );
  });

  it('écrit les corrections, même sur un champ sans erreur (décision 2)', () => {
    const corrections = [{ ligne: N405, champ: 'nom', texte: 'MARTIN' }];
    const resultat = reussie(preparerEnregistrement(OCTETS_COMPLETS, 'veos', corrections));
    const attendu = [...COMPLET];
    attendu[N405 - 1] = avecChamp(attendu[N405 - 1]!, '405', 'nom', 'MARTIN');
    expect(enChaineBinaire(resultat.octets)).toBe(enChaineBinaire(fichierSynthetique(attendu)));
    expect(resultat.identique).toBe(false);
  });

  it('compte les champs modifiés par différence d octets', () => {
    const corrections: CorrectionAc056[] = [
      { ligne: N405, champ: 'nom', texte: 'MARTIN' },
      { ligne: N405, champ: 'prenom1', texte: 'TEST' }, // texte d'origine : inchangé
      { ligne: N405_BIS, champ: 'nom', texte: 'DUPONT  ' }, // espaces de bourrage : inchangé
      { ligne: N405_BIS, champ: 'prenom1', texte: 'JEAN' },
      { ligne: N405, champ: 'nom', texte: 'DURAND' }, // même champ : compté une fois
    ];
    const resultat = reussie(preparerEnregistrement(OCTETS_COMPLETS, 'veos', corrections));
    expect(resultat.champsModifies).toBe(2);
    expect(correctionsAc056(resultat.analyse.fichier)).toHaveLength(4);
  });

  it('corrections qui rendent les octets d origine : identique, aucun champ modifié', () => {
    const corrections = [
      { ligne: N405, champ: 'nom', texte: 'MARTIN' },
      { ligne: N405, champ: 'nom', texte: 'DUPONT' },
    ];
    const resultat = reussie(preparerEnregistrement(OCTETS_COMPLETS, 'veos', corrections));
    expect(resultat.identique).toBe(true);
    expect(resultat.champsModifies).toBe(0);
  });
});

describe('preparerEnregistrement : analyse du fichier écrit', () => {
  const lignes = [...COMPLET];
  lignes.splice(2, 0, '');
  const octets = fichierSynthetique(lignes);
  // Numéros dans le fichier lu : la ligne vide décale les suivantes d'une ligne.
  const corrections: CorrectionAc056[] = [
    { ligne: N405 + 1, champ: 'nom', texte: 'D#PONT' },
    { ligne: N405_BIS + 1, champ: 'prenom1', texte: 'JEAN' },
  ];
  const resultat = reussie(preparerEnregistrement(octets, 'veos', corrections));

  it('est l analyse d une réouverture, numéros du fichier écrit', () => {
    const reouverture = analyserAc056(resultat.octets, 'veos');
    expect(resultat.analyse.anomalies).toEqual(reouverture.anomalies);
    expect(resultat.analyse.anomalies.map((a) => [a.ligne, a.champ, a.code])).toEqual([
      [N405, 'nom', 'caractere-non-autorise'],
    ]);
    expect(resultat.analyse.erreurs).toBe(1);
  });

  it('reporte champsModifies ligne par ligne et garde la même hiérarchie', () => {
    const lu = lireAc056(octets).fichier;
    const ecrit = resultat.analyse.fichier;
    expect(ecrit.dossiers).toEqual(lu.dossiers);
    expect(ecrit.e000).toBe(lu.e000);
    expect(ecrit.e999).toBe(lu.e999);
    expect(ecrit.lignes.map((l) => l.code)).toEqual(lu.lignes.map((l) => l.code));
    const modifiees = ecrit.lignes.flatMap((l) =>
      l.nature === 'decrite' && l.champsModifies ? [[l.numero, l.champsModifies]] : [],
    );
    expect(modifiees).toEqual([
      [N405, ['nom']],
      [N405_BIS, ['prenom1']],
    ]);
    expect(correctionsAc056(ecrit)).toEqual([
      { ligne: N405, champ: 'nom', texte: 'D#PONT' },
      { ligne: N405_BIS, champ: 'prenom1', texte: 'JEAN' },
    ]);
  });

  it('est figée et traverse le clonage structuré (IPC)', () => {
    expect(Object.isFrozen(resultat)).toBe(true);
    expect(Object.isFrozen(resultat.analyse)).toBe(true);
    expect(Object.isFrozen(resultat.analyse.fichier.lignes)).toBe(true);
    expect(Object.isFrozen(decrite(resultat.analyse.fichier.lignes[N405 - 1]))).toBe(true);
    expect(structuredClone(resultat)).toEqual(resultat);
  });

  it('laisse modifiable un champ corrigé et enregistré, même sans erreur (décision 2)', () => {
    const analyse = resultat.analyse;
    const index = indexerLignes(analyse.fichier);
    const encore = saisirChamp(analyse, index, { ligne: N405_BIS, champ: 'prenom1' }, 'PAUL');
    expect(encore.ok).toBe(true);
    const verrouille = saisirChamp(analyse, index, { ligne: N405_BIS, champ: 'nom' }, 'PAUL');
    expect(verrouille).toMatchObject({ ok: false, erreur: { code: 'champ-verrouille' } });
  });
});

describe('équivalence avec la saisie à l écran et chaîne complète', () => {
  // Fichier en erreur : 405 nom (« ! »), 120 code postal (4 chiffres), rang d'un ENFANT (40).
  const lignes = dansBeneficiaire(
    'ENFANT',
    ligne('405', { nom: 'A!', prenom1: 'JEAN' }),
    ligne('700', { rang: '40' }),
  );
  lignes.splice(3, 0, ligne('120', { codePostalLocalite: '1234' }));
  const octets = fichierSynthetique(lignes);
  const saisies = [
    { ligne: 6, champ: 'nom', texte: 'ÉLODIE' },
    { ligne: 4, champ: 'codePostalLocalite', texte: '12345' },
    { ligne: 7, champ: 'rang', texte: '39' },
    { ligne: 6, champ: 'nom', texte: 'MARTIN' },
  ];

  /** Analyse après les saisies à l'écran, dans l'ordre. */
  function apresSaisies() {
    let analyse = analyserAc056(octets, 'veos');
    const index = indexerLignes(analyse.fichier);
    expect(analyse.erreurs).toBe(3);
    for (const { ligne: l, champ, texte } of saisies) {
      const resultat = saisirChamp(analyse, index, { ligne: l, champ }, texte);
      if (!resultat.ok) throw new Error(`saisie refusée : ${resultat.erreur.code}`);
      analyse = resultat.analyse;
    }
    return analyse;
  }

  it('donne les octets de ecrireAc056 après la même suite de saisirChamp', () => {
    const analyse = apresSaisies();
    const resultat = reussie(
      preparerEnregistrement(octets, 'veos', correctionsAc056(analyse.fichier)),
    );
    expect(enChaineBinaire(resultat.octets)).toBe(enChaineBinaire(ecrireAc056(analyse.fichier)));
    expect(resultat.champsModifies).toBe(3);
  });

  it('saisie, corrections, préparation, relecture : aucune erreur nouvelle, valeurs relues', () => {
    const analyse = apresSaisies();
    expect(analyse.erreurs).toBe(0);
    const corrections = correctionsAc056(analyse.fichier);
    const resultat = reussie(preparerEnregistrement(octets, 'veos', corrections));
    const relue = analyserAc056(resultat.octets, 'veos');
    expect(relue.erreurs).toBe(0);
    expect(relue.anomalies).toEqual([]);
    for (const { ligne: l, champ, texte } of corrections) {
      const valeur = decrite(relue.fichier.lignes.find((x) => x.numero === l)).valeurs[champ]!;
      expect(texteDepuisOctets(valeur)).toBe(texte);
    }
    expect(corrections.map((c) => c.texte)).toEqual(['12345', 'MARTIN', '39']);
  });

  it('garde les erreurs restantes : enregistrement possible avec des erreurs', () => {
    const resultat = reussie(
      preparerEnregistrement(octets, 'veos', [{ ligne: 7, champ: 'rang', texte: '39' }]),
    );
    expect(resultat.analyse.erreurs).toBe(2);
  });
});

describe('performance (non bloquante)', () => {
  // 81 dossiers : 5 510 lignes de 700 octets (3,9 Mo), taille d'un gros AC056.
  it('prépare 50 corrections sur un fichier de 3,9 Mo en moins de 3 s (objectif 1,5 s, mesuré seul)', async ({
    annotate,
  }) => {
    const lignes = lignesCompletes({ dossiers: 81 });
    const octets = fichierSynthetique(lignes);
    expect(octets.length).toBeGreaterThan(3_850_000);
    const numeros = numerosDe(lignes, '405');
    const corrections = Array.from({ length: 50 }, (_v, i) => ({
      ligne: numeros[(i * 37) % numeros.length]!,
      champ: i % 2 === 0 ? 'nom' : 'prenom1',
      texte: `NOM${i}`,
    }));
    preparerEnregistrement(octets, 'veos', corrections); // échauffement
    const durees: number[] = [];
    for (let i = 0; i < 3; i++) {
      const debut = performance.now();
      reussie(preparerEnregistrement(octets, 'veos', corrections));
      durees.push(performance.now() - debut);
    }
    durees.sort((a, b) => a - b);
    const mediane = durees[1]!;
    await annotate(
      `${lignes.length} lignes, 50 corrections : médiane ${mediane.toFixed(1)} ms sur 3 mesures.`,
    );
    // Assertion large : la mesure ne doit pas faire échouer la suite complète, lancée en parallèle.
    expect(mediane).toBeLessThan(3000);
  }, 60_000);
});
