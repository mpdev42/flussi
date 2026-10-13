// Contrôle d'un fichier AC056 lu : port de `ControlerEvenement` de `ucontrole.pas` (jeux de
// caractères, rangs, codes imposés) et deux divergences validées :
// - divergence 4 : un rang non numérique, là où Lazarus plante sur `StrToInt`, devient une anomalie
//   `rang-non-numerique` ;
// - divergence 5 : tout octet de contrôle, DEL ou >= 0x80 dans un champ de n'importe quelle ligne
//   de code connu devient une anomalie `caractere-interdit` (un seul message par champ).
// Passe séparée de `lireAc056` : les rejets ne sont jamais contrôlés et l'écran recontrôle après
// chaque modification. Les messages ne contiennent que des codes d'entité, des noms de champ et des
// positions, jamais une valeur lue (donnée personnelle). Toutes les anomalies sont bloquantes :
// Lazarus refuse l'enregistrement tant qu'il reste une erreur.
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

function champDe(entite: CodeEntite, nom: string): DescriptionChamp {
  const champ = ENTITES[entite].champs.find((c) => c.nom === nom);
  if (champ === undefined) throw new Error(`Entité ${entite} : champ ${nom} inconnu.`);
  return champ;
}

// Fabriques de règles, dans l'ordre d'écriture de `ucontrole.pas`.

/** `is_texte_valide(valeur, jeu)`. */
function jeuAutorise(entite: CodeEntite, nom: string, jeu: JeuCaracteres): RegleLazarus {
  const champ = champDe(entite, nom);
  const refus: Verdict = {
    code: 'caractere-non-autorise',
    message: messageNonAutorise(entite, champ),
  };
  return { champ, verifier: (valeur) => (estTexteValide(valeur, jeu) ? null : refus) };
}

/** `Length(s_code_postal_localite) <> 5`, en octets (valeur rognée). */
function codePostalDeCinqChiffres(): RegleLazarus {
  const refus: Verdict = {
    code: 'code-postal-longueur',
    message: 'Entité 120 : le code postal doit être composé de 5 chiffres',
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
  conforme: (valeur: Octets) => boolean,
): RegleLazarus {
  const refus: Verdict = { code: 'valeur-imposee', message: `Entité ${entite} : ${message}` };
  return { champ: champDe(entite, nom), verifier: (valeur) => (conforme(valeur) ? null : refus) };
}

/** Seuil de rang à ne pas atteindre selon le type d'assuré ; null = aucun contrôle de rang. */
function seuilRang(typeAssure: string): number | null {
  if (typeAssure === 'ASSPRI' || typeAssure === 'CONJOI') return 21;
  if (typeAssure === 'ENFANT') return 40;
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
  const incoherent: Verdict = {
    code: 'rang-incoherent',
    message: `Entité ${entite} : rang de ${nature} incohérent`,
  };
  const nonNumerique: Verdict = {
    code: 'rang-non-numerique',
    message: `Entité ${entite} : rang non numérique`,
  };
  return {
    champ: champDe(entite, nom),
    verifier: (valeur, typeAssure) => {
      const seuil = seuilRang(typeAssure);
      if (seuil === null) return null;
      const rang = strToIntFpc(valeur);
      if (rang === null) return nonNumerique;
      return rang >= seuil ? incoherent : null;
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
      (valeur) => valeur === 'COEFCO',
    ),
    valeurImposee(
      '485',
      'valeur',
      'la valeur doit être égale à COUPLE',
      (valeur) => valeur === 'COUPLE',
    ),
  ],
  '490': [
    rangBeneficiaire('490'),
    valeurImposee(
      '490',
      'code',
      'le code doit être égal à COEFCO ou REDAN',
      (valeur) => valeur === 'COEFCO' || trimFpc(valeur) === 'REDAN',
    ),
    valeurImposee('490', 'valeur', 'la valeur doit être égale à NON', (valeur) => valeur === 'NON'),
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

function creerAnomalie(
  ligne: LigneAc056,
  champ: DescriptionChamp,
  code: CodeAnomalie,
  message: string,
): AnomalieAc056 {
  return Object.freeze({ code, ligne: ligne.numero, message, bloquante: true, champ: champ.nom });
}

/**
 * Champs d'une ligne qui contiennent un octet interdit. Les octets examinés sont ceux de
 * `origine` (ce qu'a retiré `trimFpc` en bordure compte), sauf pour un champ modifié : on examine
 * alors la valeur saisie. Au-delà de la fin du dernier champ (ligne trop longue), les octets sont
 * rattachés au dernier champ.
 */
function champsAvecOctetInterdit(ligne: LigneAc056, entite: CodeEntite): DescriptionChamp[] {
  const champs = ENTITES[entite].champs;
  const modifies = ligne.nature === 'decrite' ? ligne.champsModifies : undefined;
  const trouves: DescriptionChamp[] = [];
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
    if (!modifies?.includes(champ.nom)) trouves.push(champ);
    i = dernier ? origine.length : fin - 1;
  }

  if (ligne.nature === 'decrite' && modifies) {
    for (const nom of modifies) {
      const valeur = ligne.valeurs[nom];
      if (valeur === undefined) continue;
      for (let i = 0; i < valeur.length; i++) {
        if (!estOctetInterdit(valeur.charCodeAt(i))) continue;
        trouves.push(champDe(entite, nom));
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
        anomalie: creerAnomalie(ligne, regle.champ, verdict.code, verdict.message),
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
        const typeAssure = valeursDe(lignes[beneficiaire.e400])?.typeAssure ?? '';
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
    for (const champ of champsAvecOctetInterdit(ligne, ligne.code)) {
      if (refuses?.has(champ.nom)) continue;
      constats.push({
        position: champ.position,
        ordre: ORDRE_OCTET_INTERDIT,
        anomalie: creerAnomalie(
          ligne,
          champ,
          'caractere-interdit',
          messageNonAutorise(ligne.code, champ),
        ),
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
