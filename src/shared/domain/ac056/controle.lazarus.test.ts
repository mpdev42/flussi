// Parité du contrôle avec la source Lazarus `ucontrole.pas` (copie conforme, UTF-8, CRLF), sans
// corpus : le fichier ne contient que du code et des messages, aucune donnée personnelle.
// 1. Le source est analysé : chaque appel de `ajouter_controle_erreur` donne un contrôle (entité,
//    variable Pascal, condition, message littéral).
// 2. Chaque contrôle est vérifié par le comportement de `controlerAc056` sur un fichier synthétique
//    issu de `lignesCompletes()` (conforme) qui ne viole que ce contrôle.
// 3. Réciproquement, les règles de `controle.ts` ne produisent que les 28 messages de Lazarus.
// Un écart est décrit par entité, champ, message attendu et message obtenu.
import { describe, expect, it } from 'vitest';
import { lignesCompletes } from '@shared/test/ac056-synthetique';
import { avecChamp, controle } from '@shared/test/controle-ac056';
import { lireSourceLazarus, nomFlussi, valeurLitteral } from '@shared/test/source-lazarus';
import { REGLES } from './controle';
import { ENTITES, type CodeEntite } from './entites';
import type { AnomalieAc056, CodeAnomalie } from './modele';
import type { Octets } from './octets';

// Analyse du source Lazarus

type Condition =
  | { readonly nature: 'jeu'; readonly jeu: string }
  | { readonly nature: 'longueur'; readonly longueur: number }
  | { readonly nature: 'rang'; readonly types: readonly string[]; readonly seuil: number }
  | { readonly nature: 'imposee'; readonly acceptes: readonly string[] };

/** Un appel de `ajouter_controle_erreur` et la condition qui le garde. */
interface AppelLazarus {
  readonly entite: CodeEntite;
  readonly variable: string;
  /** Nom Flussi du champ (règle mécanique de l'item 2). */
  readonly champ: string;
  readonly message: string;
  readonly condition: Condition;
}

/** Appels consécutifs de même entité, champ et message (rangs : un appel par type d'assuré). */
interface ControleLazarus {
  readonly entite: CodeEntite;
  readonly champ: string;
  readonly message: string;
  readonly appels: readonly AppelLazarus[];
}

const TYPES_ASSURE_RANG_ELEVE = "((s_type_assure = 'ASSPRI') or (s_type_assure = 'CONJOI'))";

function lireCondition(brute: string): { variable: string; condition: Condition } {
  // Le terme `pdm in [...]` ne concerne que le contrôle d'un seul champ (hors parité complète).
  const texte = brute
    .replace(/\s*and\s*\(pdm in \[[^\]]*\]\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  let m: RegExpMatchArray | null;

  if ((m = texte.match(/^not is_texte_valide\((s_\w+), (C_S_\w+)\)$/))) {
    return { variable: m[1]!, condition: { nature: 'jeu', jeu: m[2]! } };
  }
  if ((m = texte.match(/^\(Length\((s_\w+)\) <> (\d+)\)$/))) {
    return { variable: m[1]!, condition: { nature: 'longueur', longueur: Number(m[2]) } };
  }
  if (texte.startsWith(TYPES_ASSURE_RANG_ELEVE)) {
    m = texte
      .slice(TYPES_ASSURE_RANG_ELEVE.length)
      .match(/^ and \(StrToInt\((s_\w+)\) >= (\d+)\)$/);
    if (m) {
      const condition = {
        nature: 'rang',
        types: ['ASSPRI', 'CONJOI'],
        seuil: Number(m[2]),
      } as const;
      return { variable: m[1]!, condition };
    }
  }
  if ((m = texte.match(/^\(s_type_assure = 'ENFANT'\) and \(StrToInt\((s_\w+)\) >= (\d+)\)$/))) {
    const condition = { nature: 'rang', types: ['ENFANT'], seuil: Number(m[2]) } as const;
    return { variable: m[1]!, condition };
  }
  if ((m = texte.match(/^not \((s_\w+) = ('[^']*')\)$/))) {
    const condition = { nature: 'imposee', acceptes: [valeurLitteral(m[2]!)] } as const;
    return { variable: m[1]!, condition };
  }
  if (
    (m = texte.match(/^not \(\((s_\w+) = ('[^']*')\) or \(Trim\((s_\w+)\) = ('[^']*')\)\)$/)) &&
    m[1] === m[3]
  ) {
    const acceptes = [valeurLitteral(m[2]!), valeurLitteral(m[4]!)];
    return { variable: m[1]!, condition: { nature: 'imposee', acceptes } };
  }
  throw new Error(`Condition de ucontrole.pas non reconnue : ${texte}`);
}

const MOTIF_APPEL =
  /if\s+(.+?)\s+then\s+ajouter_controle_erreur\(s_num_dossier_n, s_num_evt_n, ace, frmMain\.(edt\d{3}\w*), ('(?:[^']|'')*')\);/g;

const SOURCE = lireSourceLazarus('ucontrole.pas');

const APPELS: readonly AppelLazarus[] = [...SOURCE.matchAll(MOTIF_APPEL)].map((m) => {
  const message = valeurLitteral(m[3]!);
  const entite = message.match(/^Entité (\d{3}) : /)?.[1];
  if (entite === undefined || !(entite in ENTITES)) {
    throw new Error(`Message sans entité reconnue : ${message}`);
  }
  if (m[2]!.slice(3, 6) !== entite) {
    throw new Error(`${message} : contrôle ${m[2]} d'une autre entité`);
  }
  const { variable, condition } = lireCondition(m[1]!);
  return { entite: entite as CodeEntite, variable, champ: nomFlussi(variable), message, condition };
});

const CONTROLES: readonly ControleLazarus[] = APPELS.reduce<ControleLazarus[]>((groupes, appel) => {
  const dernier = groupes.at(-1);
  if (
    dernier?.entite === appel.entite &&
    dernier.champ === appel.champ &&
    dernier.message === appel.message
  ) {
    return [...groupes.slice(0, -1), { ...dernier, appels: [...dernier.appels, appel] }];
  }
  return [...groupes, { ...appel, appels: [appel] }];
}, []);

const controlesDe = (nature: Condition['nature']) =>
  CONTROLES.filter((c) => c.appels[0]!.condition.nature === nature);

// Accès typés aux conditions (le contrôle d'un test sait de quelle nature est son appel).
function conditionDe<N extends Condition['nature']>(
  appel: AppelLazarus,
  nature: N,
): Extract<Condition, { nature: N }> {
  if (appel.condition.nature !== nature) {
    throw new Error(`${appel.message} : condition ${appel.condition.nature}, ${nature} attendu`);
  }
  return appel.condition as Extract<Condition, { nature: N }>;
}
const jeuDe = (appel: AppelLazarus): string => conditionDe(appel, 'jeu').jeu;
const longueurDe = (appel: AppelLazarus): number => conditionDe(appel, 'longueur').longueur;
const rangDe = (appel: AppelLazarus) => conditionDe(appel, 'rang');
const acceptesDe = (appel: AppelLazarus): readonly string[] =>
  conditionDe(appel, 'imposee').acceptes;

const libelle = (c: ControleLazarus): string => `${c.entite} ${c.champ} : ${c.message}`;

// Fabrique des fichiers synthétiques

interface Scenario {
  readonly lignes: string[];
  /** Numéro de ligne (base 1) de la ligne modifiée. */
  readonly numero: number;
}

const codeDe = (ligne: string): string => ligne.slice(22, 25);

/**
 * `lignesCompletes()` (un dossier) dont la première ligne `entite` a le champ `champ` à `valeur`.
 * Si `typeAssure` est donné, la 400 du bénéficiaire (la dernière 400 avant la ligne) le reçoit.
 */
function scenario(
  entite: CodeEntite,
  champ: string,
  valeur: string,
  typeAssure?: string,
): Scenario {
  const lignes = lignesCompletes({ dossiers: 1 });
  const i = lignes.findIndex((ligne) => codeDe(ligne) === entite);
  if (i < 0) throw new Error(`Entité ${entite} absente de lignesCompletes()`);

  if (typeAssure !== undefined) {
    let e400 = i;
    while (codeDe(lignes[e400]!) !== '400') e400--;
    lignes[e400] = avecChamp(lignes[e400]!, '400', 'typeAssure', typeAssure);
  }
  lignes[i] = avecChamp(lignes[i]!, entite, champ, valeur);
  return { lignes, numero: i + 1 };
}

const decrire = (anomalies: readonly AnomalieAc056[]): string =>
  anomalies.length === 0
    ? 'aucune anomalie'
    : anomalies.map((a) => `ligne ${a.ligne} ${a.champ} « ${a.message} »`).join(' ; ');

/**
 * Écart entre le comportement attendu (une anomalie de Lazarus sur le champ de la ligne modifiée,
 * ou aucune) et le résultat de `controlerAc056`, ou null.
 */
function ecart(
  c: ControleLazarus,
  s: Scenario,
  erreurAttendue: boolean,
  cas: string,
): string | null {
  const anomalies = controle(s.lignes);
  const attendu = erreurAttendue ? [[s.numero, c.champ, c.message]] : [];
  const obtenu = anomalies.map((a) => [a.ligne, a.champ, a.message]);
  if (JSON.stringify(obtenu) === JSON.stringify(attendu)) return null;
  const voulu = erreurAttendue
    ? `ligne ${s.numero} ${c.champ} « ${c.message} »`
    : 'aucune anomalie';
  return `Entité ${c.entite}, champ ${c.champ}, ${cas} : attendu ${voulu}, obtenu ${decrire(anomalies)}`;
}

// Oracle des jeux de caractères de `uconstantes.pas` (hors dépôt), d'après `docs/version-0.1.0.md`.
const JEUX: Readonly<Record<string, RegExp>> = {
  C_S_NUMERIQUE: /^[0-9]$/,
  C_S_LISTE_3: /^[0-9A-Z]$/,
  C_S_LISTE_1: /^[0-9A-Z \-'/.]$/,
  C_S_LISTE_2: /^[0-9A-Za-z \-'/._@]$/,
};

/** Caractères ASCII imprimables, de l'espace au tilde. */
const IMPRIMABLES = Array.from({ length: 95 }, (_, i) => String.fromCharCode(0x20 + i));

describe('Analyse de ucontrole.pas', () => {
  it('trouve les 37 appels de ajouter_controle_erreur', () => {
    const appelsDuSource = SOURCE.match(/ajouter_controle_erreur\(s_num_dossier_n/g) ?? [];
    expect(appelsDuSource).toHaveLength(37);
    expect(APPELS).toHaveLength(37);
  });

  it('regroupe les 37 appels en 28 contrôles, chacun avec un message distinct', () => {
    expect(CONTROLES).toHaveLength(28);
    expect(new Set(CONTROLES.map((c) => c.message)).size).toBe(28);
  });

  it('classe les 28 contrôles : 14 jeux, 1 longueur, 9 rangs, 4 valeurs imposées', () => {
    expect(controlesDe('jeu')).toHaveLength(14);
    expect(controlesDe('longueur')).toHaveLength(1);
    expect(controlesDe('rang')).toHaveLength(9);
    expect(controlesDe('imposee')).toHaveLength(4);
  });

  it('donne à chaque contrôle un champ qui existe dans la description de son entité', () => {
    const inconnus = CONTROLES.filter(
      (c) => !ENTITES[c.entite].champs.some((champ) => champ.nom === c.champ),
    ).map(
      (c) => `Entité ${c.entite} : champ ${c.champ} (variable ${c.appels[0]!.variable}) inconnu`,
    );
    expect(inconnus).toEqual([]);
  });

  it('dérive le nom Flussi des variables Pascal', () => {
    expect(nomFlussi('s_nom')).toBe('nom');
    expect(nomFlussi('s_prenom_1')).toBe('prenom1');
    expect(nomFlussi('s_num_insee')).toBe('numInsee');
    expect(nomFlussi('s_rang_n')).toBe('rang');
    expect(nomFlussi('s_rang_personne_n')).toBe('rangPersonne');
    expect(nomFlussi('s_code_postal_localite')).toBe('codePostalLocalite');
    expect(nomFlussi('s_nom_jeune_fille')).toBe('nomJeuneFille');
    expect(nomFlussi('s_valeur_coordonnee_communication')).toBe('valeurCoordonneeCommunication');
  });

  it('reconnaît les jeux, les seuils de rang et les valeurs imposées du source', () => {
    const jeux = new Set(controlesDe('jeu').map((c) => jeuDe(c.appels[0]!)));
    expect([...jeux].sort()).toEqual([
      'C_S_LISTE_1',
      'C_S_LISTE_2',
      'C_S_LISTE_3',
      'C_S_NUMERIQUE',
    ]);

    // Chaque contrôle de rang a deux appels : ASSPRI ou CONJOI à partir de 21, ENFANT à partir de 40.
    const rangs = controlesDe('rang').map((c) =>
      c.appels.map(rangDe).map((r) => `${r.types.join('+')}>=${r.seuil}`),
    );
    expect(rangs).toEqual(Array(9).fill(['ASSPRI+CONJOI>=21', 'ENFANT>=40']));

    const imposees = controlesDe('imposee').map(
      (c) => `${c.entite} ${c.champ} ${acceptesDe(c.appels[0]!)}`,
    );
    expect(imposees).toEqual([
      '485 code COEFCO',
      '485 valeur COUPLE',
      '490 code COEFCO,REDAN',
      '490 valeur NON',
    ]);
  });
});

describe('Parité par le comportement : jeux de caractères', () => {
  it.each(controlesDe('jeu').map((c) => [libelle(c), c] as const))('%s', (_nom, c) => {
    const jeu = jeuDe(c.appels[0]!);
    const oracle = JEUX[jeu];
    if (oracle === undefined) throw new Error(`Jeu ${jeu} sans oracle`);
    const ecarts: string[] = [];

    // Le caractère est placé en 2e position, entouré de chiffres : une espace n'est pas rognée.
    // Cinq octets : le code postal garde sa longueur de 5.
    for (const caractere of IMPRIMABLES) {
      const s = scenario(c.entite, c.champ, `1${caractere}111`);
      const mauvais = ecart(
        c,
        s,
        !oracle.test(caractere),
        `caractère 0x${caractere.charCodeAt(0).toString(16)}`,
      );
      if (mauvais !== null) ecarts.push(mauvais);
    }

    // Une valeur vide est valide (sauf le code postal, qui doit avoir 5 octets).
    if (c.champ !== 'codePostalLocalite') {
      const mauvais = ecart(c, scenario(c.entite, c.champ, ''), false, 'valeur vide');
      if (mauvais !== null) ecarts.push(mauvais);
    }
    expect(ecarts).toEqual([]);
  });
});

describe('Parité par le comportement : longueur du code postal', () => {
  it.each(controlesDe('longueur').map((c) => [libelle(c), c] as const))('%s', (_nom, c) => {
    const longueur = longueurDe(c.appels[0]!);
    const ecarts: string[] = [];
    // Chiffres seuls : le jeu de caractères n'est jamais en cause.
    for (let n = 0; n <= 8; n++) {
      const mauvais = ecart(
        c,
        scenario(c.entite, c.champ, '1'.repeat(n)),
        n !== longueur,
        `${n} chiffre(s)`,
      );
      if (mauvais !== null) ecarts.push(mauvais);
    }
    expect(ecarts).toEqual([]);
  });
});

describe('Parité par le comportement : rangs', () => {
  const TYPES = ['ASSPRI', 'CONJOI', 'ENFANT', 'ASCEND', 'AUTRE', ''];
  const RANGS = ['00', '01', '20', '21', '22', '39', '40', '41', '99'];

  it.each(controlesDe('rang').map((c) => [libelle(c), c] as const))('%s', (_nom, c) => {
    const ecarts: string[] = [];
    for (const type of TYPES) {
      for (const rang of RANGS) {
        const erreur = c.appels.some((appel) => {
          const { types, seuil } = rangDe(appel);
          return types.includes(type) && Number(rang) >= seuil;
        });
        const mauvais = ecart(
          c,
          scenario(c.entite, c.champ, rang, type),
          erreur,
          `type d'assuré « ${type} », rang ${rang}`,
        );
        if (mauvais !== null) ecarts.push(mauvais);
      }
    }
    expect(ecarts).toEqual([]);
  });
});

describe('Parité par le comportement : valeurs imposées', () => {
  it.each(controlesDe('imposee').map((c) => [libelle(c), c] as const))('%s', (_nom, c) => {
    const acceptes = acceptesDe(c.appels[0]!);
    const [premier] = acceptes as [string];
    // Valeurs acceptées, puis valeurs refusées : autre mot, vide, minuscules, préfixe.
    const valeurs = [...acceptes, 'AUTRE', '', premier.toLowerCase(), premier.slice(0, -1)];
    const ecarts: string[] = [];
    for (const valeur of valeurs) {
      const mauvais = ecart(
        c,
        scenario(c.entite, c.champ, valeur),
        !acceptes.includes(valeur),
        `valeur de ${valeur.length} octet(s) ${acceptes.includes(valeur) ? 'imposée' : 'refusée'}`,
      );
      if (mauvais !== null) ecarts.push(mauvais);
    }
    expect(ecarts).toEqual([]);
  });
});

describe('Parité réciproque : les règles de controle.ts ne produisent que les messages de Lazarus', () => {
  const CODES_LAZARUS: ReadonlySet<CodeAnomalie> = new Set([
    'caractere-non-autorise',
    'code-postal-longueur',
    'rang-incoherent',
    'valeur-imposee',
  ]);
  const VALEURS_SONDE = [
    '',
    '#',
    '1',
    '5',
    '12',
    '21',
    '40',
    '99',
    'a',
    'A',
    'AUTRE',
    'COEFCO',
    'REDAN',
    'NON',
    'COUPLE',
    '1234',
    'ZZ',
  ];
  const TYPES_SONDE = ['', 'ASSPRI', 'CONJOI', 'ENFANT', 'ASCEND'];

  const entitesLazarus = [...new Set(CONTROLES.map((c) => c.entite))];

  /** Messages de code Lazarus qu'une règle peut produire, sur une batterie de valeurs et de types. */
  function messagesPossibles(regle: { verifier: (v: Octets, t: string) => unknown }): string[] {
    const messages = new Set<string>();
    for (const valeur of VALEURS_SONDE) {
      for (const type of TYPES_SONDE) {
        const verdict = regle.verifier(valeur as Octets, type) as {
          code: CodeAnomalie;
          message: string;
        } | null;
        if (verdict !== null && CODES_LAZARUS.has(verdict.code)) messages.add(verdict.message);
      }
    }
    return [...messages].sort();
  }

  it('porte des règles sur les mêmes entités que ucontrole.pas', () => {
    expect(Object.keys(REGLES).sort()).toEqual([...entitesLazarus].sort());
  });

  it.each(entitesLazarus.map((e) => [e] as const))(
    'entité %s : mêmes champs, dans le même ordre que ucontrole.pas',
    (entite) => {
      const attendu = CONTROLES.filter((c) => c.entite === entite).map((c) => c.champ);
      const obtenu = (REGLES[entite] ?? []).map((r) => r.champ.nom);
      expect(obtenu, `Entité ${entite}`).toEqual(attendu);
    },
  );

  it.each(entitesLazarus.map((e) => [e] as const))(
    'entité %s : chaque règle ne produit que le message de son contrôle',
    (entite) => {
      const ecarts: string[] = [];
      const controles = CONTROLES.filter((c) => c.entite === entite);
      (REGLES[entite] ?? []).forEach((regle, i) => {
        const attendu = controles[i]!;
        const obtenu = messagesPossibles(regle);
        if (JSON.stringify(obtenu) !== JSON.stringify([attendu.message])) {
          ecarts.push(
            `Entité ${entite}, champ ${regle.champ.nom} : message attendu « ${attendu.message} », ` +
              `obtenu ${obtenu.map((m) => `« ${m} »`).join(', ') || 'aucun'}`,
          );
        }
      });
      expect(ecarts).toEqual([]);
    },
  );

  it('produit exactement l’ensemble des 28 messages littéraux de ucontrole.pas', () => {
    const produits = new Set(
      Object.values(REGLES).flatMap((regles) => regles.flatMap(messagesPossibles)),
    );
    const litteraux = new Set(CONTROLES.map((c) => c.message));
    expect(litteraux.size).toBe(28);
    expect([...produits].sort()).toEqual([...litteraux].sort());
  });
});
