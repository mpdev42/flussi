// Lecture d'un fichier AC056 : découpage en lignes (parité ReadLn), découpage des lignes de
// 700 octets en champs (parité `Copy` + `Trim` de `GetEntiteXXXLigne`), rattachement hiérarchique,
// contrôle de structure (anomalies bloquantes). Ne lève jamais : les écarts deviennent des anomalies.
// Un fichier de rejet MSP (`provenance` = `rejet`) est lu de la même façon, avec des lignes d'au
// moins 718 octets dont le message (octets 719 et suivants) est rattaché à son code `ERRxxx`.
import { decouperLignes, type LigneDecoupee } from './decoupage';
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
import type { AnomalieAc056, FichierAc056, LectureAc056, LigneAc056, Provenance } from './modele';
import { estUtf8Valide, sousOctets, tableauDepuisOctets, type Octets } from './octets';
import { LONGUEUR_MINIMALE_REJET, messageRejet } from './rejet';
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

const OCTET_NON_ASCII = /[\x80-\xff]/;

/**
 * Anomalie d'encodage : un fichier VEOS doit être en UTF-8, un rejet en Windows-1252. L'ASCII pur
 * est valide pour les deux, donc jamais signalé. Non bloquante, sans valeur lue dans le message.
 * `ligne` : première ligne en cause (UTF-8 invalide pour un fichier VEOS ; premier octet non ASCII
 * pour un rejet), null si aucune ne l'est (rejet réduit à un BOM et à de l'ASCII). Les fins de
 * ligne étant de l'ASCII, le fichier est de l'UTF-8 valide si et seulement si chaque ligne l'est.
 */
function anomalieEncodage(
  octets: Uint8Array,
  provenance: Provenance,
  bom: boolean,
  lignes: readonly LigneDecoupee[],
): AnomalieAc056 | null {
  const anomalie = (ligne: number | null, debut: string, fin = ''): AnomalieAc056 =>
    Object.freeze({
      code: 'encodage-incoherent' as const,
      ligne,
      message: `${debut}${ligne === null ? '' : ` (première ligne concernée : ${ligne})`}${fin}.`,
      bloquante: false,
    });

  if (provenance === 'veos') {
    if (estUtf8Valide(octets)) return null;
    const fautive = lignes.find((l) => !estUtf8Valide(tableauDepuisOctets(l.octets)));
    return anomalie(
      fautive?.numero ?? null,
      "Le fichier semble encodé en Windows-1252 au lieu d'UTF-8",
    );
  }
  // Un BOM est propre à l'UTF-8 ; sinon il faut un octet >= 0x80 (l'ASCII pur ne dit rien).
  const utf8 = bom || (octets.some((octet) => octet >= 0x80) && estUtf8Valide(octets));
  if (!utf8) return null;
  const fautive = lignes.find((l) => OCTET_NON_ASCII.test(l.octets));
  return anomalie(
    fautive?.numero ?? null,
    'Le fichier de rejet semble encodé en UTF-8 au lieu de Windows-1252',
    ' : les accents des messages seront mal affichés',
  );
}

export function lireAc056(octets: Uint8Array, provenance: Provenance = 'veos'): LectureAc056 {
  const rejet = provenance === 'rejet';
  const { bom, ctrlZFinal, lignes: decoupees } = decouperLignes(octets);
  const lignes: LigneAc056[] = [];
  const anomalies: AnomalieAc056[] = [];
  const numerosLf: number[] = [];
  const numerosCr: number[] = [];

  for (const decoupee of decoupees) {
    const { numero, octets: origine, finDeLigne } = decoupee;
    if (finDeLigne === '\n') numerosLf.push(numero);
    if (finDeLigne === '\r') numerosCr.push(numero);

    if (origine.length === 0) {
      // Les messages de format parlent d'enregistrement, qui n'existe pas pour un rejet.
      if (!rejet) {
        anomalies.push(
          Object.freeze({
            code: 'ligne-vide' as const,
            ligne: numero,
            message: `Ligne ${numero} vide : elle sera supprimée à l'enregistrement.`,
            bloquante: false,
          }),
        );
      }
      continue;
    }

    const code = codeEntite(origine);
    const message = rejet ? messageRejet(origine) : undefined;
    // Pas de clé `rejet` à `undefined` : la propriété est absente d'une ligne sans message.
    const commune = {
      numero,
      origine,
      finDeLigne,
      ...(message === undefined ? {} : { rejet: message }),
    };
    const longueurAttendue = rejet
      ? origine.length >= LONGUEUR_MINIMALE_REJET
      : origine.length === LONGUEUR_LIGNE;
    if (longueurAttendue && code !== null && !ENTITES[code].brute) {
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

  if (bom && !rejet) {
    anomalies.push(
      Object.freeze({
        code: 'bom' as const,
        ligne: null,
        message: "Le fichier commence par un BOM UTF-8, conservé à l'enregistrement.",
        bloquante: false,
      }),
    );
  }
  // Ctrl-Z final : retiré par le découpage (parité `CtrlZMarksEOF` de FPC), ignoré dans un rejet.
  if (ctrlZFinal && !rejet) {
    anomalies.push(
      Object.freeze({
        code: 'ctrl-z-final' as const,
        ligne: null,
        message: "Caractère de fin de fichier (Ctrl-Z) : il sera supprimé à l'enregistrement.",
        bloquante: false,
      }),
    );
  }
  for (const anomalie of [
    anomalieFinDeLigne('\n', rejet ? [] : numerosLf),
    anomalieFinDeLigne('\r', rejet ? [] : numerosCr),
    anomalieEncodage(octets, provenance, bom, decoupees),
  ]) {
    if (anomalie) anomalies.push(anomalie);
  }

  anomalies.push(...controlerStructure(lignes, provenance));

  // Niveau fichier d'abord, puis numéro de ligne croissant (tri stable).
  anomalies.sort((a, b) => (a.ligne ?? 0) - (b.ligne ?? 0));

  const fichier: FichierAc056 = Object.freeze({
    provenance,
    bom,
    lignes: Object.freeze(lignes),
    ...construireHierarchie(lignes, provenance),
  });
  return Object.freeze({ fichier, anomalies: Object.freeze(anomalies) });
}
