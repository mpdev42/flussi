// Fabrique de fichiers AC056 synthétiques (données manifestement fictives) pour les tests.
// - Indépendante du lecteur et de l'écrivain : elle ne dépend que de la description des entités
//   (`ENTITES`), pour que les tests du domaine ne s'appuient pas sur le code qu'ils vérifient.
// - Les « chaînes binaires » ont 1 caractère U+0000..U+00FF par octet (ISO-8859-1), comme
//   `Octets` du domaine.
import { ENTITES, type CodeEntite } from '@shared/domain/ac056/entites';

/** Fin de ligne d'un fichier synthétique (le `FinDeLigne` du domaine admet aussi ''). */
export type FinDeLigneSynthetique = '\r\n' | '\n' | '\r';

export interface OptionsFichierSynthetique {
  /**
   * Fin de ligne : une valeur pour toutes les lignes, ou un tableau avec une fin par ligne
   * (de même taille que `lignes`). Défaut : CRLF.
   */
  readonly fin?: FinDeLigneSynthetique | readonly FinDeLigneSynthetique[];
  /** Préfixe BOM UTF-8 (EF BB BF). Défaut : false. */
  readonly bom?: boolean;
  /**
   * Fin de ligne après la dernière ligne. Défaut : false, comme les fichiers VEOS (pas de saut
   * final). Avec un tableau `fin`, la dernière fin du tableau n'est écrite que si `sautFinal`.
   */
  readonly sautFinal?: boolean;
}

const BOM = '\xEF\xBB\xBF';

function verifierOctets(chaine: string, contexte: string): void {
  for (let i = 0; i < chaine.length; i++) {
    if (chaine.charCodeAt(i) > 0xff) {
      throw new Error(`${contexte} : caractère > 0xFF en position ${i + 1}`);
    }
  }
}

/** Chaîne binaire → octets (1 caractère = 1 octet). Lève si un caractère dépasse 0xFF. */
export function enOctetsBruts(chaine: string): Uint8Array {
  verifierOctets(chaine, 'enOctetsBruts');
  const octets = new Uint8Array(chaine.length);
  for (let i = 0; i < chaine.length; i++) octets[i] = chaine.charCodeAt(i);
  return octets;
}

/** Octets → chaîne binaire (1 octet = 1 caractère). */
export function enChaineBinaire(octets: Uint8Array): string {
  let chaine = '';
  for (let i = 0; i < octets.length; i += 8192) {
    chaine += String.fromCharCode(...octets.subarray(i, i + 8192));
  }
  return chaine;
}

/**
 * Ligne AC056 de 700 caractères pour une entité.
 * Par défaut chaque champ vaut son caractère de bourrage répété (espaces ou zéros) : la ligne est
 * stable à la réécriture. `numEntite` vaut le code. Une valeur fournie est placée à gauche puis
 * bourrée avec le bourrage du champ. Lève sur un champ inconnu, une valeur plus longue que le
 * champ ou un caractère > 0xFF.
 */
export function ligneSynthetique(
  code: CodeEntite,
  valeurs: Readonly<Record<string, string>> = {},
): string {
  const champs = ENTITES[code].champs;
  for (const nom of Object.keys(valeurs)) {
    if (!champs.some((champ) => champ.nom === nom)) {
      throw new Error(`Entité ${code} : champ ${nom} inconnu`);
    }
  }

  return champs
    .map((champ) => {
      const valeur = valeurs[champ.nom] ?? (champ.nom === 'numEntite' ? code : '');
      verifierOctets(valeur, `Entité ${code}, champ ${champ.nom}`);
      if (valeur.length > champ.longueur) {
        throw new Error(
          `Entité ${code}, champ ${champ.nom} : valeur de ${valeur.length} octets pour ${champ.longueur}`,
        );
      }
      return valeur + champ.bourrage.repeat(champ.longueur - valeur.length);
    })
    .join('');
}

/** Extrait un champ d'une ligne de 700 caractères (position et longueur de la description). */
export function extraireChamp(ligne: string, code: CodeEntite, nom: string): string {
  const champ = ENTITES[code].champs.find((c) => c.nom === nom);
  if (!champ) throw new Error(`Entité ${code} : champ ${nom} inconnu`);
  return ligne.slice(champ.position - 1, champ.position - 1 + champ.longueur);
}

/**
 * Octets d'un fichier à partir de lignes (chaînes binaires, sans fin de ligne).
 * Défauts : CRLF, pas de BOM, pas de saut final.
 */
export function fichierSynthetique(
  lignes: readonly string[],
  options: OptionsFichierSynthetique = {},
): Uint8Array {
  const { fin = '\r\n', bom = false, sautFinal = false } = options;
  if (typeof fin !== 'string' && fin.length !== lignes.length) {
    throw new Error(`fin : ${fin.length} fins pour ${lignes.length} lignes`);
  }

  let contenu = bom ? BOM : '';
  lignes.forEach((ligne, i) => {
    const finLigne = typeof fin === 'string' ? fin : fin[i]!;
    const derniere = i === lignes.length - 1;
    contenu += ligne + (derniere && !sautFinal ? '' : finLigne);
  });
  return enOctetsBruts(contenu);
}

/** En-tête fictif d'une ligne : émetteur TEST, dossier, évènement, rang. */
function entete(dossier: number, evenement: number, rang: string): Record<string, string> {
  return {
    numEmetteur: 'TEST',
    numDossier: String(dossier).padStart(8, '0'),
    numEvt: String(evenement).padStart(3, '0'),
    rang,
  };
}

function lignesBeneficiaire(dossier: number, evenement: number, rang: number): string[] {
  const r = String(rang).padStart(2, '0');
  const e = entete(dossier, evenement, r);
  return [
    ligneSynthetique('400', {
      ...e,
      rangPersonne: r,
      refExterne: `REF${rang}`,
      typeAssure: rang === 1 ? 'ASSPRI' : 'CONJOI',
    }),
    ligneSynthetique('405', { ...e, nom: 'DUPONT', prenom1: 'TEST', numInsee: '1000000000000' }),
    ligneSynthetique('410', e),
    ligneSynthetique('411', e),
    ligneSynthetique('485', { ...e, code: 'COEFCO', valeur: 'COUPLE' }),
    ligneSynthetique('485', { ...e, code: 'COEFCO', valeur: 'COUPLE' }),
    ligneSynthetique('490', { ...e, code: 'COEFCO', valeur: 'NON' }),
    ligneSynthetique('490', { ...e, code: 'REDAN', valeur: 'NON' }),
    ligneSynthetique('700', { ...e, codeAssureur: 'TEST', codeProduit: 'PRODUIT1' }),
    ligneSynthetique('700', { ...e, codeAssureur: 'TEST', codeProduit: 'PRODUIT2' }),
    ligneSynthetique('800', { ...e, rangPersonne: r, refExterne: `EXT${rang}` }),
  ];
}

function lignesEvenement(dossier: number, evenement: number): string[] {
  const e = entete(dossier, evenement, '00');
  return [
    ligneSynthetique('100', { ...e, numContratIndiv: `CTR${dossier}`, echPrinc: '0101' }),
    ligneSynthetique('110', e),
    ligneSynthetique('115', { ...e, nom: 'DUPONT', prenom1: 'TEST' }),
    ligneSynthetique('120', {
      ...e,
      libelleVoie: 'RUE DE TEST',
      codePostalLocalite: '99999',
      libelleLocalite: 'TESTVILLE',
    }),
    ligneSynthetique('125', { ...e, valeurCoordonneeCommunication: 'test1@example.invalid' }),
    ligneSynthetique('125', { ...e, valeurCoordonneeCommunication: 'test2@example.invalid' }),
    ligneSynthetique('130', e),
    ligneSynthetique('135', e),
    ligneSynthetique('155', e),
    ligneSynthetique('180', e),
    ...lignesBeneficiaire(dossier, evenement, 1),
    ...lignesBeneficiaire(dossier, evenement, 2),
    ligneSynthetique('990', e),
  ];
}

/**
 * Fichier complet fictif, conforme aux contrôles (aucune anomalie de `controlerAc056`) : 000, puis `dossiers` dossiers (001 … 995, 2 par défaut) de 2 évènements
 * (100, 110, 115, 120, 125 x2, 130, 135, 155, 180, 2 bénéficiaires, 990), puis 999.
 * Un bénéficiaire : 400, 405, 410, 411, 485 x2, 490 x2, 700 x2, 800 (11 lignes).
 * Par défaut 138 lignes ; chaque dossier en ajoute 68.
 */
export function lignesCompletes({ dossiers = 2 }: { dossiers?: number } = {}): string[] {
  const lignes = [ligneSynthetique('000', entete(0, 0, '00'))];
  for (let dossier = 1; dossier <= dossiers; dossier++) {
    lignes.push(ligneSynthetique('001', entete(dossier, 0, '00')));
    for (const evenement of [1, 2]) lignes.push(...lignesEvenement(dossier, evenement));
    lignes.push(ligneSynthetique('995', entete(dossier, 0, '00')));
  }
  lignes.push(ligneSynthetique('999', entete(0, 0, '00')));
  return lignes;
}

/** Une ligne synthétique par code ; `null` donne une ligne de 700 espaces (code inconnu). */
export function lignesDepuisCodes(codes: readonly (CodeEntite | null)[]): string[] {
  return codes.map((code) => (code === null ? ' '.repeat(700) : ligneSynthetique(code)));
}

// ---------------------------------------------------------------------------------------------
// Fichiers de rejet MSP : ligne AC056 de 700 octets, identification MSP de 18 octets (701 à 718),
// message en Windows-1252 (719 et suivants). Une ligne sans message fait 718 octets.
// ---------------------------------------------------------------------------------------------

/** Identification MSP fictive (octets 701 à 718) : 9 chiffres, un espace, 8 alphanumériques. */
export const IDENTIFICATION_MSP_FICTIVE = '000000001 TESTID01';

/** Caractères hors Latin-1 de Windows-1252 utiles aux tests (octets 0x80 à 0x9F). */
const WINDOWS_1252_SPECIAUX: Readonly<Record<string, string>> = { '€': '\x80', '’': '\x92' };

/**
 * Texte → chaîne binaire Windows-1252 (1 caractère = 1 octet). Les caractères Latin-1 (é, à…) ont
 * le même octet qu'en Unicode, plus « € » (0x80) et « ’ » (0x92). Lève sur tout autre caractère.
 */
export function enWindows1252(texte: string): string {
  return Array.from(texte, (caractere) => {
    const special = WINDOWS_1252_SPECIAUX[caractere];
    if (special !== undefined) return special;
    const code = caractere.codePointAt(0) ?? 0;
    if (code > 0xff || (code >= 0x80 && code <= 0x9f)) {
      throw new Error(`enWindows1252 : caractère non géré U+${code.toString(16).toUpperCase()}`);
    }
    return caractere;
  }).join('');
}

/** Ligne de rejet : ligne AC056 de 700 caractères, identification MSP fictive et message éventuel. */
export function ligneRejet(ligne: string, message = ''): string {
  if (ligne.length !== 700)
    throw new Error(`ligneRejet : ${ligne.length} caractères au lieu de 700`);
  verifierOctets(message, 'ligneRejet, message');
  return ligne + IDENTIFICATION_MSP_FICTIVE + message;
}

/**
 * Ligne de rejet fictive d'une entité d'un dossier : émetteur TEST et numéro de dossier sur 8
 * chiffres (octets 1 à 17, clé de dossier). Utiliser le dossier 0 pour la 000 et la 999, comme
 * `lignesCompletes`.
 */
export function ligneRejetSynthetique(code: CodeEntite, dossier: number, message = ''): string {
  const cle = { numEmetteur: 'TEST', numDossier: String(dossier).padStart(8, '0') };
  return ligneRejet(ligneSynthetique(code, cle), message);
}

export interface OptionsLignesRejet {
  /** Nombre de dossiers de `lignesCompletes`. Défaut : 2. */
  readonly dossiers?: number;
  /**
   * Message (chaîne binaire Windows-1252) d'une ligne, d'après son code et son rang (base 0) dans
   * le fichier de rejet. Aucun message si la fonction renvoie `undefined` (ligne de 718 octets).
   */
  readonly message?: (code: CodeEntite, indice: number) => string | undefined;
}

/**
 * Fichier de rejet fictif dans l'ordre réel de MSP, d'après `lignesCompletes` : pour chaque
 * dossier, les évènements (100 … 990), la 995, puis la 001 ; la 000 et la 999 à la fin. Chaque
 * ligne reçoit l'identification MSP fictive, puis son message éventuel.
 */
export function lignesRejet({ dossiers = 2, message }: OptionsLignesRejet = {}): string[] {
  const corps: string[] = [];
  let ligne000 = '';
  let ligne999 = '';
  let ligne001: string | null = null;
  for (const ligne of lignesCompletes({ dossiers })) {
    const code = ligne.slice(22, 25);
    if (code === '000') ligne000 = ligne;
    else if (code === '999') ligne999 = ligne;
    else if (code === '001') ligne001 = ligne;
    else {
      corps.push(ligne);
      if (code === '995' && ligne001 !== null) {
        corps.push(ligne001);
        ligne001 = null;
      }
    }
  }
  return [...corps, ligne000, ligne999].map((ligne, indice) =>
    ligneRejet(ligne, message?.(ligne.slice(22, 25) as CodeEntite, indice)),
  );
}

/** Messages MSP fictifs de `lignesRejetVarie` (texte Unicode, écrit en Windows-1252). */
export const MESSAGES_REJET_VARIE = Object.freeze({
  /** ERR009 : texte exact de sa recherche de début. */
  err009: 'Incohérence du centre de paiement',
  /** Aucun code : « Erreur inconnue » (divergence 10). */
  inconnu: 'Garantie absente du référentiel de test',
  /** ERR021 : égalité stricte. */
  err021: "Pas d'enregistrement de fin d'évènement",
  /** ERR027 : début, puis deux contenus (et non ERR010, dont le second contenu diffère). */
  err027:
    "La garantie TEST01 de l'assuré de rang 01 ne peut etre radiée car elle n'existe pas pour le contrat CTR1",
  /** Aucun code, sur la 995 (hors évènement). */
  dossier: 'Dossier rejeté par le contrôle de test',
});

/**
 * Repères de `lignesRejetVarie` : numéros de ligne (base 1) et contenu attendu, pour les tests du
 * domaine, de l'écran (DOM) et e2e.
 */
export const REPERES_REJET_VARIE = Object.freeze({
  /** Nombre de lignes du fichier. */
  lignes: 17,
  /** Lignes qui portent un message, dans l'ordre. */
  lignesRejetees: Object.freeze([5, 6, 10, 12, 14]),
  /** 400 de l'assuré principal (évènement 1, bénéficiaire 1) : message ERR009. */
  ligne400Err009: 5,
  /** 700 de l'assuré principal : message inconnu. */
  ligne700Inconnu: 6,
  /** 405 du conjoint (évènement 1, bénéficiaire 2), sans message : nom et prénom accentués. */
  ligne405Accent: 8,
  /** Nom et prénom de la 405, octets Windows-1252 0xC9 (« É »). */
  nom405: 'BÉGUIN',
  prenom405: 'ÉLODIE',
  /** 990 de l'évènement 1 : message ERR021. */
  ligne990Err021: 10,
  /** 700 sans 400 de l'évènement 2 : bénéficiaire implicite, message ERR027. */
  ligne700Implicite: 12,
  /** 995 du dossier : message inconnu, hors évènement. */
  ligne995: 14,
});

/**
 * Fichier de rejet fictif varié, dans l'ordre de MSP (un dossier, 001 après la 995, 000 et 999 à
 * la fin), données manifestement fictives (émetteur TEST, dossier 1) :
 *
 * | Ligne | Entité | Contenu                                              | Message MSP              |
 * | ----- | ------ | ---------------------------------------------------- | ------------------------ |
 * | 1     | 100    | évènement 001, contrat CTR1                          |                          |
 * | 2     | 110    |                                                      |                          |
 * | 3     | 115    | DUPONT TEST                                          |                          |
 * | 4     | 120    |                                                      |                          |
 * | 5     | 400    | rang 01, ASSPRI                                      | ERR009                   |
 * | 6     | 700    | rang 01                                              | inconnu                  |
 * | 7     | 400    | rang 02, CONJOI                                      |                          |
 * | 8     | 405    | rang 02, BÉGUIN ÉLODIE (0xC9 en Windows-1252)        |                          |
 * | 9     | 700    | rang 02                                              |                          |
 * | 10    | 990    |                                                      | ERR021                   |
 * | 11    | 100    | évènement 002                                        |                          |
 * | 12    | 700    | rang 01, sans 400 : bénéficiaire implicite           | ERR027                   |
 * | 13    | 990    |                                                      |                          |
 * | 14    | 995    |                                                      | inconnu (hors évènement) |
 * | 15    | 001    |                                                      |                          |
 * | 16    | 000    | dossier 0                                            |                          |
 * | 17    | 999    | dossier 0                                            |                          |
 *
 * Messages : `MESSAGES_REJET_VARIE` ; repères : `REPERES_REJET_VARIE`. Lecture sans anomalie
 * (`lireAc056(fichierSynthetique(lignesRejetVarie()), 'rejet')`) : 2 évènements, 2 bénéficiaires
 * dans le premier, 1 bénéficiaire implicite (`e400: null`) dans le second, 5 lignes rejetées dont
 * 1 hors évènement.
 */
export function lignesRejetVarie(): string[] {
  const m = MESSAGES_REJET_VARIE;
  const evt1 = entete(1, 1, '00');
  const evt2 = entete(1, 2, '00');
  const rang = (evenement: Record<string, string>, r: string) => ({ ...evenement, rang: r });
  const lignes: [string, string?][] = [
    [ligneSynthetique('100', { ...evt1, numContratIndiv: 'CTR1', echPrinc: '0101' })],
    [ligneSynthetique('110', evt1)],
    [ligneSynthetique('115', { ...evt1, nom: 'DUPONT', prenom1: 'TEST' })],
    [
      ligneSynthetique('120', {
        ...evt1,
        codePostalLocalite: '99999',
        libelleLocalite: 'TESTVILLE',
      }),
    ],
    [
      ligneSynthetique('400', { ...rang(evt1, '01'), rangPersonne: '01', typeAssure: 'ASSPRI' }),
      m.err009,
    ],
    [ligneSynthetique('700', { ...rang(evt1, '01'), codeAssureur: 'TEST' }), m.inconnu],
    [ligneSynthetique('400', { ...rang(evt1, '02'), rangPersonne: '02', typeAssure: 'CONJOI' })],
    [
      ligneSynthetique('405', {
        ...rang(evt1, '02'),
        nom: enWindows1252(REPERES_REJET_VARIE.nom405),
        prenom1: enWindows1252(REPERES_REJET_VARIE.prenom405),
      }),
    ],
    [ligneSynthetique('700', { ...rang(evt1, '02'), codeAssureur: 'TEST' })],
    [ligneSynthetique('990', evt1), m.err021],
    [ligneSynthetique('100', { ...evt2, numContratIndiv: 'CTR1', echPrinc: '0101' })],
    [ligneSynthetique('700', { ...rang(evt2, '01'), codeAssureur: 'TEST' }), m.err027],
    [ligneSynthetique('990', evt2)],
    [ligneSynthetique('995', entete(1, 0, '00')), m.dossier],
    [ligneSynthetique('001', entete(1, 0, '00'))],
    [ligneSynthetique('000', entete(0, 0, '00'))],
    [ligneSynthetique('999', entete(0, 0, '00'))],
  ];
  return lignes.map(([ligne, message]) =>
    ligneRejet(ligne, message === undefined ? '' : enWindows1252(message)),
  );
}
