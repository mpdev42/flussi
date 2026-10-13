// Aides des tests de contrôle AC056 : fichiers synthétiques à évènement ou bénéficiaire unique,
// remplacement d'octets ou de champs, lecture des anomalies en tuples.
// Numérotation : `dansEvenement(...)` place le premier code en ligne 4 (000, 001 et 100 avant) ;
// `dansBeneficiaire(...)` met une 400 en ligne 4 et le premier code en ligne 5.
import { controlerAc056 } from '@shared/domain/ac056/controle';
import { ENTITES, type CodeEntite } from '@shared/domain/ac056/entites';
import { lireAc056 } from '@shared/domain/ac056/lecteur';
import type { AnomalieAc056, FichierAc056 } from '@shared/domain/ac056/modele';
import type { Octets } from '@shared/domain/ac056/octets';
import {
  fichierSynthetique,
  ligneSynthetique,
  type OptionsFichierSynthetique,
} from './ac056-synthetique';

export const NON_AUTORISE = 'caractere-non-autorise';
export const INTERDIT = 'caractere-interdit';

/** Lignes d'un évènement : 000 001 100 … 990 995 999. */
export const dansEvenement = (...lignes: string[]): string[] => [
  ligneSynthetique('000'),
  ligneSynthetique('001'),
  ligneSynthetique('100'),
  ...lignes,
  ligneSynthetique('990'),
  ligneSynthetique('995'),
  ligneSynthetique('999'),
];

/** Une 400 de type d'assuré donné (rangs 01), puis `lignes` du bénéficiaire. */
export const dansBeneficiaire = (typeAssure: string, ...lignes: string[]): string[] =>
  dansEvenement(ligneSynthetique('400', { typeAssure, rang: '01', rangPersonne: '01' }), ...lignes);

/** Valeurs qui rendent conformes les 485 et 490 (code et valeur imposés) et la 120 (code postal). */
const CONFORMES: Partial<Record<CodeEntite, Record<string, string>>> = {
  '120': { codePostalLocalite: '12345' },
  '485': { code: 'COEFCO', valeur: 'COUPLE' },
  '490': { code: 'COEFCO', valeur: 'NON' },
};

/** Ligne synthétique conforme aux contrôles, sauf pour les valeurs données. */
export const ligne = (code: CodeEntite, valeurs: Record<string, string> = {}): string =>
  ligneSynthetique(code, { ...CONFORMES[code], ...valeurs });

/** `texte` dont l'octet d'indice `indice` (base 0) vaut `caractere`. */
export const avecOctet = (texte: string, indice: number, caractere: string): string =>
  texte.slice(0, indice) + caractere + texte.slice(indice + 1);

/** `texte` dont le champ `nom` est remplacé par `valeur` (bourrée d'espaces), sans changer la taille. */
export function avecChamp(texte: string, code: CodeEntite, nom: string, valeur: string): string {
  const champ = ENTITES[code].champs.find((c) => c.nom === nom)!;
  const debut = champ.position - 1;
  return (
    texte.slice(0, debut) + valeur.padEnd(champ.longueur, ' ') + texte.slice(debut + champ.longueur)
  );
}

/** Numéros de ligne (base 1) des lignes de code `code`. */
export const numerosDe = (lignes: readonly string[], code: CodeEntite): number[] =>
  lignes.flatMap((texte, i) => (texte.slice(22, 25) === code ? [i + 1] : []));

export function lire(lignes: readonly string[], options?: OptionsFichierSynthetique): FichierAc056 {
  return lireAc056(fichierSynthetique(lignes, options)).fichier;
}

export function controle(
  lignes: readonly string[],
  options?: OptionsFichierSynthetique,
): AnomalieAc056[] {
  return controlerAc056(lire(lignes, options));
}

/** [ligne, champ, code] de chaque anomalie. */
export const triplets = (anomalies: readonly AnomalieAc056[]) =>
  anomalies.map((a) => [a.ligne, a.champ, a.code]);

/** [ligne, champ, code, message] de chaque anomalie. */
export const quadruplets = (anomalies: readonly AnomalieAc056[]) =>
  anomalies.map((a) => [a.ligne, a.champ, a.code, a.message]);

/** Fichier lu dont la ligne `numero` a un `numDossier` vide (impossible à lire sur 700 octets). */
export function sansNumDossier(fichier: FichierAc056, numero: number): FichierAc056 {
  const lignes = fichier.lignes.map((l) =>
    l.numero === numero && l.nature === 'decrite'
      ? { ...l, valeurs: { ...l.valeurs, numDossier: '' as Octets } }
      : l,
  );
  return { ...fichier, lignes };
}
