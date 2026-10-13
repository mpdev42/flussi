// Lecture d'un fichier AC056 : découpage en lignes (parité ReadLn), découpage des lignes de
// 700 octets en champs (parité `Copy` + `Trim` de `GetEntiteXXXLigne`), rattachement hiérarchique,
// contrôle de structure (anomalies bloquantes). Ne lève jamais : les écarts deviennent des anomalies.
import { decouperLignes } from './decoupage';
import {
  CODES_ENTITE,
  ENTITES,
  LONGUEUR_CODE_ENTITE,
  LONGUEUR_LIGNE,
  POSITION_CODE_ENTITE,
  type CodeEntite,
  type DescriptionEntite,
} from './entites';
import { trimFpc } from './fpc';
import { construireHierarchie } from './hierarchie';
import type { AnomalieAc056, FichierAc056, LectureAc056, LigneAc056 } from './modele';
import { sousOctets, type Octets } from './octets';
import { controlerStructure } from './structure';

const CODES_CONNUS: ReadonlySet<string> = new Set(CODES_ENTITE);

/** Code d'entité (octets 23 à 25) s'il est connu, sinon null. */
export function codeEntite(origine: Octets): CodeEntite | null {
  const debut = POSITION_CODE_ENTITE - 1;
  if (origine.length < debut + LONGUEUR_CODE_ENTITE) return null;
  const code = origine.slice(debut, debut + LONGUEUR_CODE_ENTITE);
  return CODES_CONNUS.has(code) ? (code as CodeEntite) : null;
}

/** Valeur de chaque champ : `Copy` puis `Trim` si le champ est trimé. */
export function lireValeurs(
  description: DescriptionEntite,
  origine: Octets,
): Readonly<Record<string, Octets>> {
  const valeurs: Record<string, Octets> = {};
  for (const champ of description.champs) {
    const brut = sousOctets(origine, champ.position - 1, champ.position - 1 + champ.longueur);
    valeurs[champ.nom] = champ.trim ? trimFpc(brut) : brut;
  }
  return Object.freeze(valeurs);
}

/** Anomalie de fin de ligne : une seule, à partir de la première ligne concernée. */
function anomalieFinDeLigne(fin: '\n' | '\r', numeros: readonly number[]): AnomalieAc056 | null {
  const premier = numeros[0];
  if (premier === undefined) return null;
  const nom = fin === '\n' ? 'LF' : 'CR';
  const nombre = numeros.length;
  return Object.freeze({
    code: fin === '\n' ? ('fin-de-ligne-lf' as const) : ('fin-de-ligne-cr' as const),
    ligne: premier,
    message: `Fin de ligne ${nom} au lieu de CRLF à partir de la ligne ${premier} (${nombre} ${nombre === 1 ? 'ligne' : 'lignes'}), conservée à l'enregistrement.`,
    bloquante: false,
  });
}

export function lireAc056(octets: Uint8Array): LectureAc056 {
  const { bom, lignes: decoupees } = decouperLignes(octets);
  const lignes: LigneAc056[] = [];
  const anomalies: AnomalieAc056[] = [];
  const numerosLf: number[] = [];
  const numerosCr: number[] = [];

  for (const decoupee of decoupees) {
    const { numero, octets: origine, finDeLigne } = decoupee;
    if (finDeLigne === '\n') numerosLf.push(numero);
    if (finDeLigne === '\r') numerosCr.push(numero);

    if (origine.length === 0) {
      anomalies.push(
        Object.freeze({
          code: 'ligne-vide' as const,
          ligne: numero,
          message: `Ligne ${numero} vide : elle sera supprimée à l'enregistrement.`,
          bloquante: false,
        }),
      );
      continue;
    }

    const code = codeEntite(origine);
    const commune = { numero, origine, finDeLigne };
    if (origine.length === LONGUEUR_LIGNE && code !== null && !ENTITES[code].brute) {
      lignes.push(
        Object.freeze({
          ...commune,
          nature: 'decrite' as const,
          code,
          valeurs: lireValeurs(ENTITES[code], origine),
        }),
      );
    } else {
      lignes.push(Object.freeze({ ...commune, nature: 'brute' as const, code }));
    }
  }

  if (bom) {
    anomalies.push(
      Object.freeze({
        code: 'bom' as const,
        ligne: null,
        message: "Le fichier commence par un BOM UTF-8, conservé à l'enregistrement.",
        bloquante: false,
      }),
    );
  }
  for (const anomalie of [
    anomalieFinDeLigne('\n', numerosLf),
    anomalieFinDeLigne('\r', numerosCr),
  ]) {
    if (anomalie) anomalies.push(anomalie);
  }

  anomalies.push(...controlerStructure(lignes));

  // Niveau fichier d'abord, puis numéro de ligne croissant (tri stable).
  anomalies.sort((a, b) => (a.ligne ?? 0) - (b.ligne ?? 0));

  const fichier: FichierAc056 = Object.freeze({
    bom,
    lignes: Object.freeze(lignes),
    ...construireHierarchie(lignes),
  });
  return Object.freeze({ fichier, anomalies: Object.freeze(anomalies) });
}
