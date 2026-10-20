// Présentation d'un champ AC056 à l'écran : police, largeur et texte affiché (listes et dates en
// lecture seule, affichées comme du texte, décision 6 de l'item 2 de la v0.3.0).
import {
  CONSIGNE_VEOS,
  valeurAffichee,
  type AnomalieAc056,
  type DescriptionChamp,
  type Octets,
} from '@shared/domain/ac056';

/** Largeur maximale (en caractères) au-delà de laquelle un champ prend toute la largeur. */
const LARGEUR_MAX_CARACTERES = 24;

const NOM_DE_CODE = /^(code|num|rang|cle)/;

export interface PresentationChamp {
  /** Police à chasse fixe : codes, numéros et rangs, pas les listes (« CODE - Libellé ») ni les dates. */
  readonly mono: boolean;
  /** Largeur en caractères d'un champ à chasse fixe court ; absente : toute la largeur. */
  readonly largeurCaracteres?: number;
}

export function presentationChamp(champ: DescriptionChamp): PresentationChamp {
  const mono =
    champ.valeursAutorisees === undefined &&
    champ.type !== 'date' &&
    (champ.type === 'numerique' || NOM_DE_CODE.test(champ.nom));
  if (!mono) return { mono };
  const largeur = champ.maxLength ?? champ.longueur;
  return largeur <= LARGEUR_MAX_CARACTERES ? { mono, largeurCaracteres: largeur } : { mono };
}

export const SUFFIXE_ABSENT_DE_LA_LISTE = '(absent de la liste)';
export const SUFFIXE_DATE_INVALIDE = '(date invalide)';

/**
 * Texte affiché dans le champ : valeur lisible (« CODE - Libellé », JJ/MM/AAAA), ou valeur brute
 * suivie de « (absent de la liste) » pour un code inconnu et de « (date invalide) » pour une date
 * illisible. Le suffixe est dans la valeur : visible, lu par les lecteurs d'écran, jamais masqué
 * par un message d'erreur.
 */
export function texteChampAffiche(champ: DescriptionChamp, valeur: Octets): string {
  const { texte, etat } = valeurAffichee(champ, valeur);
  if (etat === 'inconnue') return `${texte.trimEnd()} ${SUFFIXE_ABSENT_DE_LA_LISTE}`;
  if (etat === 'invalide') return `${texte.trimEnd()} ${SUFFIXE_DATE_INVALIDE}`;
  return texte;
}

/**
 * Texte d'une anomalie sous le champ : la consigne (ce qui ne va pas et ce qui est attendu,
 * DESIGN.md §9.2), à défaut le message, qui reste le texte de Lazarus (journal, liste des erreurs).
 */
export function texteAnomalie(anomalie: AnomalieAc056): string {
  return anomalie.consigne ?? anomalie.message;
}

/**
 * Message sous un champ : les textes de ses anomalies bout à bout, ou undefined sans anomalie.
 * La mention VEOS (`CONSIGNE_VEOS`, fin des consignes d'un champ jamais modifiable) n'apparaît
 * qu'une fois, à la fin, même si plusieurs anomalies la portent. `consigneVeos` l'ajoute aussi : champ
 * normalement modifiable que l'écran verrouille parce que le fichier est mal formé (le domaine ne
 * l'ajoute qu'aux champs qui ne sont jamais modifiables).
 */
export function messageChamp(
  anomalies: readonly AnomalieAc056[],
  consigneVeos = false,
): string | undefined {
  if (anomalies.length === 0) return undefined;
  let avecConsigneVeos = consigneVeos;
  const textes: string[] = [];
  for (const anomalie of anomalies) {
    const texte = texteAnomalie(anomalie);
    if (texte.endsWith(CONSIGNE_VEOS)) {
      avecConsigneVeos = true;
      const sans = texte.slice(0, -CONSIGNE_VEOS.length).trimEnd();
      if (sans !== '') textes.push(sans);
    } else {
      textes.push(texte);
    }
  }
  if (avecConsigneVeos) textes.push(CONSIGNE_VEOS);
  return textes.join(' ');
}

/**
 * Vrai si l'écran laisse modifier le champ d'une ligne décrite d'un fichier VEOS : champ modifiable
 * de Lazarus, fichier sans anomalie de structure (décision 4) et champ en erreur, ou déjà corrigé
 * pendant la session (décision 3). `anomalies` : les anomalies bloquantes de ce champ.
 */
export function champModifiable(
  champ: DescriptionChamp,
  anomalies: readonly AnomalieAc056[],
  corrige: boolean,
  fichierModifiable: boolean,
): boolean {
  return champ.modifiable && fichierModifiable && (corrige || anomalies.length > 0);
}

/** Anomalies bloquantes par numéro de ligne d'origine (les autres ne marquent rien à l'écran). */
export function anomaliesBloquantesParLigne(
  anomalies: readonly AnomalieAc056[],
): Map<number, AnomalieAc056[]> {
  const parLigne = new Map<number, AnomalieAc056[]>();
  for (const anomalie of anomalies) {
    if (!anomalie.bloquante || anomalie.ligne === null) continue;
    const liste = parLigne.get(anomalie.ligne);
    if (liste) liste.push(anomalie);
    else parLigne.set(anomalie.ligne, [anomalie]);
  }
  return parLigne;
}
