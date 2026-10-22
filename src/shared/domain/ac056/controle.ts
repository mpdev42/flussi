// Contrôle d'un fichier AC056 lu : port de `ControlerEvenement` de `ucontrole.pas` (jeux de
// caractères, rangs, codes imposés) et deux divergences validées :
// - divergence 4 : un rang non numérique, là où Lazarus plante sur `StrToInt`, devient une anomalie
//   `rang-non-numerique`, dont le message dit quel rang (bénéficiaire ou personne) ;
// - divergence 5 : tout octet de contrôle, DEL ou >= 0x80 dans un champ de n'importe quelle ligne
//   de code connu devient une anomalie `caractere-interdit` (un seul message par champ), au
//   message propre à Flussi : libellé de l'écran (`designationChamp`) et position du premier octet.
// Passe séparée de `lireAc056` : les rejets ne sont jamais contrôlés et l'écran recontrôle après
// chaque modification. Les messages ne contiennent que des codes d'entité, des noms de champ et des
// positions, jamais une valeur lue (donnée personnelle). Toutes les anomalies sont bloquantes :
// Lazarus refuse l'enregistrement tant qu'il reste une erreur.
// Chaque anomalie porte une `consigne` (texte sous le champ, `DESIGN.md` §9.2) : ce qui ne va pas
// et ce qui est attendu. Le `message` des règles de Lazarus reste son texte exact (relevé PIEGES).
import { designationChamp } from './designation-champ';
import { ENTITES, type CodeEntite, type DescriptionChamp } from './entites';
import { trimFpc, strToIntFpc } from './fpc';
import {
  estOctetInterdit,
  estTexteValide,
  JEU_LISTE_1,
  JEU_LISTE_2,
  JEU_LISTE_3,
  JEU_NUMERIQUE,
  type JeuCaracteres,
} from './jeux-caracteres';
import { lireValeurs } from './lecteur';
import type { AnomalieAc056, CodeAnomalie, FichierAc056, LigneAc056 } from './modele';
import type { CibleChamp } from './modification';
import type { Octets } from './octets';

/** Exporté, comme `REGLES`, pour les tests de parité (`controle.lazarus.test.ts`). */
export interface Verdict {
  readonly code: CodeAnomalie;
  readonly message: string;
  /** Texte sous le champ, sans la mention VEOS d'un champ non modifiable (`creerAnomalie`). */
  readonly consigne: string;
}

/** Règle de Lazarus sur un champ ; `verifier` renvoie le verdict d'échec, ou null si conforme. */
export interface RegleLazarus {
  readonly champ: DescriptionChamp;
  readonly verifier: (valeur: Octets, typeAssure: string) => Verdict | null;
}

/** Anomalie à trier : par ligne, puis position du champ, puis ordre des règles. */
interface Constat {
  readonly position: number;
  readonly ordre: number;
  readonly anomalie: AnomalieAc056;
}

/** Ordre de `caractere-interdit` à champ égal : après toutes les règles de Lazarus. */
const ORDRE_OCTET_INTERDIT = Number.MAX_SAFE_INTEGER;

// Libellés de Lazarus (`frmMain.edt…` et messages de `ucontrole.pas`), clé `entité:champ`.
// Un champ absent de la table reçoit un libellé technique (position en octets).
const LIBELLES: Readonly<Record<string, string>> = {
  '115:nom': 'le nom',
  '115:prenom1': 'le prénom',
  '115:numInsee': 'le numéro INSEE',
  '120:complementGeographique': 'le complément géographique',
  '120:numeroVoie': 'le numéro de voie',
  '120:libelleVoie': 'le libellé de la voie',
  '120:lieuDit': 'le lieu-dit',
  '120:codePostalLocalite': 'le code postal',
  '120:libelleLocalite': 'le libellé de la localité',
  '125:valeurCoordonneeCommunication': 'la valeur',
  '400:rang': 'le rang de bénéficiaire',
  '400:rangPersonne': 'le rang de personne',
  '405:rang': 'le rang de bénéficiaire',
  '405:nom': 'le nom',
  '405:prenom1': 'le prénom',
  '405:numInsee': 'le numéro INSEE',
  '405:nomJeuneFille': 'le nom de jeune fille',
  '410:rang': 'le rang de bénéficiaire',
  '485:rang': 'le rang de bénéficiaire',
  '485:code': 'le code',
  '485:valeur': 'la valeur',
  '490:rang': 'le rang de bénéficiaire',
  '490:code': 'le code',
  '490:valeur': 'la valeur',
  '700:rang': 'le rang de bénéficiaire',
  '800:rang': 'le rang de bénéficiaire',
  '800:rangPersonne': 'le rang de personne',
};

function libelleDe(entite: CodeEntite, champ: DescriptionChamp): string {
  return (
    LIBELLES[`${entite}:${champ.nom}`] ??
    `le champ ${champ.nom} (octets ${champ.position} à ${champ.position + champ.longueur - 1})`
  );
}

function messageNonAutorise(entite: CodeEntite, champ: DescriptionChamp): string {
  return `Entité ${entite} : caractère non autorisé dans ${libelleDe(entite, champ)}`;
}

/**
 * Fin de la consigne d'un champ non modifiable à l'écran (code et valeur des 485 et 490, octet
 * interdit hors des 23 champs modifiables) : décision 4 de l'item 2 de la v0.3.0.
 */
export const CONSIGNE_VEOS = 'À corriger dans VEOS.';

// Consignes des jeux de `uconstantes.pas` (détail dans `jeux-caracteres.ts`), caractère par caractère.
const CONSIGNES_JEU: ReadonlyMap<JeuCaracteres, string> = new Map([
  [
    JEU_LISTE_1,
    'Caractère non autorisé : lettres majuscules sans accent, chiffres, espace, tiret, apostrophe, barre oblique et point seulement.',
  ],
  [
    JEU_LISTE_2,
    'Caractère non autorisé : lettres sans accent (majuscules ou minuscules), chiffres, espace, tiret, tiret bas, apostrophe, barre oblique, point et arobase seulement.',
  ],
  [
    JEU_LISTE_3,
    'Caractère non autorisé : lettres majuscules sans accent et chiffres seulement, sans espace.',
  ],
  [JEU_NUMERIQUE, 'Caractère non autorisé : chiffres seulement.'],
]);

/** Divergence 5 : message propre à Flussi, avec le libellé de l'écran et l'octet fautif. */
function messageOctetInterdit(entite: CodeEntite, champ: DescriptionChamp, octet: number): string {
  return `Entité ${entite} : caractère interdit dans le champ ${designationChamp(champ)}, octet ${octet}.`;
}

const CONSIGNE_OCTET_INTERDIT =
  'Caractère interdit (lettre accentuée, caractère invisible ou spécial) : seuls les caractères sans accent sont acceptés.';

function champDe(entite: CodeEntite, nom: string): DescriptionChamp {
  const champ = ENTITES[entite].champs.find((c) => c.nom === nom);
  if (champ === undefined) throw new Error(`Entité ${entite} : champ ${nom} inconnu.`);
  return champ;
}

// Fabriques de règles, dans l'ordre d'écriture de `ucontrole.pas`.

/** `is_texte_valide(valeur, jeu)`. */
function jeuAutorise(entite: CodeEntite, nom: string, jeu: JeuCaracteres): RegleLazarus {
  const champ = champDe(entite, nom);
  const consigne = CONSIGNES_JEU.get(jeu);
  if (consigne === undefined)
    throw new Error(`Entité ${entite} : jeu du champ ${nom} sans consigne.`);
  const refus: Verdict = {
    code: 'caractere-non-autorise',
    message: messageNonAutorise(entite, champ),
    consigne,
  };
  return { champ, verifier: (valeur) => (estTexteValide(valeur, jeu) ? null : refus) };
}

/** `Length(s_code_postal_localite) <> 5`, en octets (valeur rognée). */
function codePostalDeCinqChiffres(): RegleLazarus {
  const refus: Verdict = {
    code: 'code-postal-longueur',
    message: 'Entité 120 : le code postal doit être composé de 5 chiffres',
    consigne: 'Longueur incorrecte : le code postal doit compter 5 chiffres.',
  };
  return {
    champ: champDe('120', 'codePostalLocalite'),
    verifier: (valeur) => (valeur.length === 5 ? null : refus),
  };
}

/** Code ou valeur imposé : `conforme` est la condition Pascal satisfaite (`not (s_code = '…')`). */
function valeurImposee(
  entite: CodeEntite,
  nom: string,
  message: string,
  consigne: string,
  conforme: (valeur: Octets) => boolean,
): RegleLazarus {
  const refus: Verdict = {
    code: 'valeur-imposee',
    message: `Entité ${entite} : ${message}`,
    consigne,
  };
  return { champ: champDe(entite, nom), verifier: (valeur) => (conforme(valeur) ? null : refus) };
}

/** Seuil de rang à ne pas atteindre (`StrToInt(…) >= seuil`) et assurés concernés. */
interface SeuilRang {
  readonly seuil: number;
  readonly assures: string;
}

// `ucontrole.pas` : `>= 21` pour ASSPRI et CONJOI, `>= 40` pour ENFANT (lignes 152 à 291).
const SEUIL_ADULTE: SeuilRang = { seuil: 21, assures: 'un assuré principal ou un conjoint' };
const SEUIL_ENFANT: SeuilRang = { seuil: 40, assures: 'un enfant' };

/** Seuil selon le type d'assuré ; null = aucun contrôle de rang. */
function seuilRang(typeAssure: string): SeuilRang | null {
  if (typeAssure === 'ASSPRI' || typeAssure === 'CONJOI') return SEUIL_ADULTE;
  if (typeAssure === 'ENFANT') return SEUIL_ENFANT;
  return null;
}

/**
 * Rang de bénéficiaire ou de personne, jugé avec le type d'assuré de la 400 du bénéficiaire.
 * Autre type (vide, `ASCEND`, `AUTRE`…) : aucun contrôle, même non numérique (évaluation courte de
 * Pascal). Type concerné et rang non numérique : divergence 4.
 */
function rangCoherent(
  entite: CodeEntite,
  nom: 'rang' | 'rangPersonne',
  nature: 'bénéficiaire' | 'personne',
): RegleLazarus {
  // Verdicts figés par seuil : la consigne cite le maximum du type d'assuré.
  const verdicts = new Map(
    [SEUIL_ADULTE, SEUIL_ENFANT].map((seuil) => {
      const maximum = `${seuil.seuil - 1} au plus pour ${seuil.assures}`;
      const incoherent: Verdict = {
        code: 'rang-incoherent',
        message: `Entité ${entite} : rang de ${nature} incohérent`,
        consigne: `Rang trop élevé : ${maximum}.`,
      };
      const nonNumerique: Verdict = {
        code: 'rang-non-numerique',
        message: `Entité ${entite} : rang de ${nature} non numérique`,
        consigne: `Rang non numérique : saisissez 2 chiffres, ${maximum}.`,
      };
      return [seuil, { incoherent, nonNumerique }] as const;
    }),
  );
  return {
    champ: champDe(entite, nom),
    verifier: (valeur, typeAssure) => {
      const seuil = seuilRang(typeAssure);
      if (seuil === null) return null;
      const { incoherent, nonNumerique } = verdicts.get(seuil)!;
      const rang = strToIntFpc(valeur);
      if (rang === null) return nonNumerique;
      return rang >= seuil.seuil ? incoherent : null;
    },
  };
}

const rangBeneficiaire = (entite: CodeEntite) => rangCoherent(entite, 'rang', 'bénéficiaire');
const rangPersonne = (entite: CodeEntite) => rangCoherent(entite, 'rangPersonne', 'personne');

/**
 * Règles par entité, dans l'ordre de `ControlerEvenement`. Exporté pour les tests de parité avec
 * `ucontrole.pas`, pas par `index.ts`.
 */
export const REGLES: Readonly<Partial<Record<CodeEntite, readonly RegleLazarus[]>>> = {
  '115': [
    jeuAutorise('115', 'nom', JEU_LISTE_1),
    jeuAutorise('115', 'prenom1', JEU_LISTE_1),
    jeuAutorise('115', 'numInsee', JEU_LISTE_3),
  ],
  '120': [
    jeuAutorise('120', 'complementGeographique', JEU_LISTE_1),
    jeuAutorise('120', 'numeroVoie', JEU_LISTE_1),
    jeuAutorise('120', 'libelleVoie', JEU_LISTE_1),
    jeuAutorise('120', 'lieuDit', JEU_LISTE_1),
    jeuAutorise('120', 'codePostalLocalite', JEU_NUMERIQUE),
    codePostalDeCinqChiffres(),
    jeuAutorise('120', 'libelleLocalite', JEU_LISTE_1),
  ],
  '125': [jeuAutorise('125', 'valeurCoordonneeCommunication', JEU_LISTE_2)],
  '400': [rangBeneficiaire('400'), rangPersonne('400')],
  '405': [
    rangBeneficiaire('405'),
    jeuAutorise('405', 'nom', JEU_LISTE_1),
    jeuAutorise('405', 'prenom1', JEU_LISTE_1),
    jeuAutorise('405', 'numInsee', JEU_LISTE_3),
    jeuAutorise('405', 'nomJeuneFille', JEU_LISTE_1),
  ],
  '410': [rangBeneficiaire('410')],
  '485': [
    rangBeneficiaire('485'),
    valeurImposee(
      '485',
      'code',
      'le code doit être égal à COEFCO',
      'Code non accepté : COEFCO attendu.',
      (valeur) => valeur === 'COEFCO',
    ),
    valeurImposee(
      '485',
      'valeur',
      'la valeur doit être égale à COUPLE',
      'Valeur non acceptée : COUPLE attendue.',
      (valeur) => valeur === 'COUPLE',
    ),
  ],
  '490': [
    rangBeneficiaire('490'),
    valeurImposee(
      '490',
      'code',
      'le code doit être égal à COEFCO ou REDAN',
      'Code non accepté : COEFCO ou REDAN attendu.',
      (valeur) => valeur === 'COEFCO' || trimFpc(valeur) === 'REDAN',
    ),
    valeurImposee(
      '490',
      'valeur',
      'la valeur doit être égale à NON',
      'Valeur non acceptée : NON attendue.',
      (valeur) => valeur === 'NON',
    ),
  ],
  '700': [rangBeneficiaire('700')],
  '800': [rangBeneficiaire('800'), rangPersonne('800')],
};

/** Entités que Lazarus ne contrôle que si leur `s_num_dossier_n` n'est pas vide. */
const PRESENCE_CONDITIONNELLE: ReadonlySet<CodeEntite> = new Set([
  '115',
  '120',
  '405',
  '410',
  '800',
]);

/** Valeurs des champs d'une ligne ; null pour une ligne que Lazarus ne découpe pas en champs. */
function valeursDe(ligne: LigneAc056 | undefined): Readonly<Record<string, Octets>> | null {
  if (ligne === undefined) return null;
  if (ligne.nature === 'decrite') return ligne.valeurs;
  if (ligne.code === null || ENTITES[ligne.code].brute) return null;
  return lireValeurs(ENTITES[ligne.code], ligne.origine);
}

/**
 * Complément de la consigne du rang de bénéficiaire d'une 400 (décision 5 de l'item 3 de la
 * v0.3.0) : les lignes filles (405, 410, 485, 490, 700, 800) portent leur propre rang, que Flussi
 * ne corrige pas à leur place (parité Lazarus).
 */
export const CONSIGNE_RANG_400 = 'Corrigez aussi le rang des autres lignes de ce bénéficiaire.';

/**
 * Anomalie de contrôle. La consigne d'un champ que l'écran ne permet pas de modifier se termine
 * par `CONSIGNE_VEOS` ; celle du rang de bénéficiaire d'une 400, par `CONSIGNE_RANG_400`.
 */
function creerAnomalie(
  ligne: LigneAc056,
  champ: DescriptionChamp,
  { code, message, consigne }: Verdict,
): AnomalieAc056 {
  const complement = !champ.modifiable
    ? CONSIGNE_VEOS
    : ligne.code === '400' && champ.nom === 'rang'
      ? CONSIGNE_RANG_400
      : null;
  return Object.freeze({
    code,
    ligne: ligne.numero,
    message,
    bloquante: true,
    champ: champ.nom,
    consigne: complement === null ? consigne : `${consigne} ${complement}`,
  });
}

/** Champ qui contient un octet interdit, et position dans la ligne (base 1) du premier. */
interface OctetInterdit {
  readonly champ: DescriptionChamp;
  readonly octet: number;
}

/**
 * Champs d'une ligne qui contiennent un octet interdit, avec la position du premier. Les octets
 * examinés sont ceux de `origine` (ce qu'a retiré `trimFpc` en bordure compte), sauf pour un champ
 * modifié : on examine alors la valeur saisie, dont le premier octet prend la position du champ.
 * Au-delà de la fin du dernier champ (ligne trop longue), les octets sont rattachés au dernier champ.
 */
function champsAvecOctetInterdit(ligne: LigneAc056, entite: CodeEntite): OctetInterdit[] {
  const champs = ENTITES[entite].champs;
  const modifies = ligne.nature === 'decrite' ? ligne.champsModifies : undefined;
  const trouves: OctetInterdit[] = [];
  const { origine } = ligne;

  // `k` ne fait qu'avancer : les champs sont triés par position. Un champ trouvé n'est signalé
  // qu'une fois, on saute donc à sa fin.
  let k = 0;
  for (let i = 0; i < origine.length; i++) {
    if (!estOctetInterdit(origine.charCodeAt(i))) continue;
    while (k + 1 < champs.length && champs[k + 1]!.position - 1 <= i) k++;
    const champ = champs[k]!;
    const dernier = k === champs.length - 1;
    const fin = champ.position - 1 + champ.longueur;
    if (!dernier && i >= fin) continue;
    if (!modifies?.includes(champ.nom)) trouves.push({ champ, octet: i + 1 });
    i = dernier ? origine.length : fin - 1;
  }

  if (ligne.nature === 'decrite' && modifies) {
    for (const nom of modifies) {
      const valeur = ligne.valeurs[nom];
      if (valeur === undefined) continue;
      for (let i = 0; i < valeur.length; i++) {
        if (!estOctetInterdit(valeur.charCodeAt(i))) continue;
        const champ = champDe(entite, nom);
        trouves.push({ champ, octet: champ.position + i });
        break;
      }
    }
  }
  return trouves;
}

/**
 * Contrôle complet d'un fichier lu. Les règles de Lazarus ne portent que sur les lignes
 * rattachées à la hiérarchie (parité « le dernier gagne » : une entité unique en double non
 * rattachée n'est pas contrôlée) ; la divergence 5 porte sur toutes les lignes de code connu.
 * Résultat trié par numéro de ligne, position du champ puis ordre des règles.
 */
export function controlerAc056(fichier: FichierAc056): AnomalieAc056[] {
  // Parité Lazarus : `if not FFichierRejet then ControlerEvenements`. Un rejet n'est jamais contrôlé.
  if (fichier.provenance === 'rejet') return [];
  const { lignes } = fichier;
  const constats: Constat[] = [];
  /** Par indice de ligne : champs en échec sur un jeu de caractères (pas de doublon D5). */
  const refusesParJeu = new Map<number, Set<string>>();

  function controlerRegles(indice: number | null, typeAssure: string): void {
    if (indice === null) return;
    const ligne = lignes[indice];
    if (ligne === undefined || ligne.code === null) return;
    const regles = REGLES[ligne.code];
    const valeurs = valeursDe(ligne);
    if (regles === undefined || valeurs === null) return;
    if (PRESENCE_CONDITIONNELLE.has(ligne.code) && valeurs.numDossier === '') return;

    regles.forEach((regle, ordre) => {
      const valeur = valeurs[regle.champ.nom];
      if (valeur === undefined) return;
      const verdict = regle.verifier(valeur, typeAssure);
      if (verdict === null) return;
      constats.push({
        position: regle.champ.position,
        ordre,
        anomalie: creerAnomalie(ligne, regle.champ, verdict),
      });
      if (verdict.code === 'caractere-non-autorise') {
        const refuses = refusesParJeu.get(indice) ?? new Set<string>();
        refuses.add(regle.champ.nom);
        refusesParJeu.set(indice, refuses);
      }
    });
  }

  for (const dossier of fichier.dossiers) {
    for (const evenement of dossier.evenements) {
      controlerRegles(evenement.e115, '');
      controlerRegles(evenement.e120, '');
      for (const e125 of evenement.e125) controlerRegles(e125, '');

      for (const beneficiaire of evenement.beneficiaires) {
        // Bénéficiaire implicite (e400 null) : propre aux rejets, jamais contrôlés (garde de typage).
        const e400 = beneficiaire.e400;
        const typeAssure = e400 === null ? '' : (valeursDe(lignes[e400])?.typeAssure ?? '');
        controlerRegles(beneficiaire.e400, typeAssure);
        controlerRegles(beneficiaire.e405, typeAssure);
        controlerRegles(beneficiaire.e410, typeAssure);
        for (const e485 of beneficiaire.e485) controlerRegles(e485, typeAssure);
        for (const e490 of beneficiaire.e490) controlerRegles(e490, typeAssure);
        for (const e700 of beneficiaire.e700) controlerRegles(e700, typeAssure);
        controlerRegles(beneficiaire.e800, typeAssure);
      }
    }
  }

  lignes.forEach((ligne, indice) => {
    if (ligne.code === null) return;
    const refuses = refusesParJeu.get(indice);
    for (const { champ, octet } of champsAvecOctetInterdit(ligne, ligne.code)) {
      if (refuses?.has(champ.nom)) continue;
      constats.push({
        position: champ.position,
        ordre: ORDRE_OCTET_INTERDIT,
        anomalie: creerAnomalie(ligne, champ, {
          code: 'caractere-interdit',
          message: messageOctetInterdit(ligne.code, champ, octet),
          consigne: CONSIGNE_OCTET_INTERDIT,
        }),
      });
    }
  });

  // Tri stable sur le numéro de ligne (nul exclu : toute anomalie de contrôle a une ligne).
  return constats
    .sort(
      (a, b) =>
        (a.anomalie.ligne ?? 0) - (b.anomalie.ligne ?? 0) ||
        a.position - b.position ||
        a.ordre - b.ordre,
    )
    .map((constat) => constat.anomalie);
}

/**
 * Anomalies d'un seul champ (`cible.ligne` = numéro de ligne d'origine) : celles du contrôle
 * complet, filtrées sur cette ligne et ce champ. Le résultat dépend de la hiérarchie (type
 * d'assuré de la 400), d'où un contrôle complet plutôt qu'un calcul isolé.
 */
export function controlerChamp(fichier: FichierAc056, cible: CibleChamp): AnomalieAc056[] {
  return controlerAc056(fichier).filter(
    (anomalie) => anomalie.ligne === cible.ligne && anomalie.champ === cible.champ,
  );
}
