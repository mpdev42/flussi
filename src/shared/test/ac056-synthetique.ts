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
    ligneSynthetique('400', { ...e, rangPersonne: r, refExterne: `REF${rang}` }),
    ligneSynthetique('405', { ...e, nom: 'DUPONT', prenom1: 'TEST', numInsee: '1000000000000' }),
    ligneSynthetique('410', e),
    ligneSynthetique('411', e),
    ligneSynthetique('485', { ...e, code: 'TST485', valeur: '1' }),
    ligneSynthetique('485', { ...e, code: 'TST485', valeur: '2' }),
    ligneSynthetique('490', { ...e, code: 'TST490', valeur: '1' }),
    ligneSynthetique('490', { ...e, code: 'TST490', valeur: '2' }),
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
    ligneSynthetique('120', { ...e, libelleVoie: 'RUE DE TEST', libelleLocalite: 'TESTVILLE' }),
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
 * Fichier complet fictif : 000, puis `dossiers` dossiers (001 … 995, 2 par défaut) de 2 évènements
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
