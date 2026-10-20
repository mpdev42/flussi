// Compteurs d'erreurs à chaque niveau de l'écran AC056 (divergence validée : Lazarus ne marque que
// l'onglet) : ligne, évènement, bénéficiaire, entité (onglet), élément d'une liste (125, 485, 490,
// 700), et hors des évènements. Un ancêtre agrège ses descendants (`DESIGN.md` §9.2) : un
// évènement compte ses bénéficiaires et sa 990, un onglet de liste compte tous ses éléments.
// Tableaux indexés par position (évènement de `IndexLignesAc056.evenements`, bénéficiaire de
// `noeud.beneficiaires`, rang dans la liste) : simples, rapides, clonables.
import type { IndexLignesAc056 } from './index-lignes';
import type { AnomalieAc056 } from './modele';

/** Entités comptées au niveau de l'évènement (onglets et encadré de la 990). */
export type CodeEntiteEvenement =
  '100' | '110' | '115' | '120' | '125' | '130' | '135' | '155' | '180' | '990';

/** Entités comptées au niveau du bénéficiaire. */
export type CodeEntiteBeneficiaire = '400' | '405' | '410' | '411' | '485' | '490' | '700' | '800';

/** Compteurs des éléments des listes d'un bénéficiaire, par rang (mêmes noms que le modèle). */
export interface ElementsBeneficiaire {
  readonly e485: readonly number[];
  readonly e490: readonly number[];
  readonly e700: readonly number[];
}

/** Compteurs des éléments des listes d'un évènement, par rang (mêmes noms que le modèle). */
export interface ElementsEvenement {
  readonly e125: readonly number[];
  readonly beneficiaires: readonly ElementsBeneficiaire[];
}

export interface CompteursAc056 {
  /** Par indice de `FichierAc056.lignes`. */
  readonly parIndice: readonly number[];
  /** Par évènement : toutes ses lignes, bénéficiaires et 990 compris. */
  readonly parEvenement: readonly number[];
  /** Par évènement puis bénéficiaire : toutes les lignes du bénéficiaire. */
  readonly parBeneficiaire: readonly (readonly number[])[];
  /** Par évènement : lignes de chaque entité de l'évènement (125 : tous les éléments). */
  readonly parEntiteEvenement: readonly Readonly<Record<CodeEntiteEvenement, number>>[];
  /** Par évènement puis bénéficiaire : lignes de chaque entité (485, 490, 700 : tous les éléments). */
  readonly parEntiteBeneficiaire: readonly (readonly Readonly<
    Record<CodeEntiteBeneficiaire, number>
  >[])[];
  /** Par évènement : éléments des listes 125, puis 485, 490, 700 de chaque bénéficiaire. */
  readonly parElement: readonly ElementsEvenement[];
  /** Lignes rattachées à aucun évènement, numéros inconnus et niveau fichier (`null`). */
  readonly horsEvenement: number;
}

const zerosEvenement = (): Record<CodeEntiteEvenement, number> => ({
  '100': 0,
  '110': 0,
  '115': 0,
  '120': 0,
  '125': 0,
  '130': 0,
  '135': 0,
  '155': 0,
  '180': 0,
  '990': 0,
});

const zerosBeneficiaire = (): Record<CodeEntiteBeneficiaire, number> => ({
  '400': 0,
  '405': 0,
  '410': 0,
  '411': 0,
  '485': 0,
  '490': 0,
  '700': 0,
  '800': 0,
});

/** Versions modifiables pendant le comptage. */
interface ElementsBeneficiaireEnCours {
  e485: number[];
  e490: number[];
  e700: number[];
}
interface ElementsEvenementEnCours {
  e125: number[];
  beneficiaires: ElementsBeneficiaireEnCours[];
}

/**
 * Compte une occurrence par numéro de ligne d'origine (une ligne citée deux fois compte deux
 * fois) ; `null` (niveau fichier) et un numéro absent du fichier comptent hors évènement.
 * Générique : anomalies bloquantes, lignes rejetées d'un fichier MSP…
 */
export function compterParLigne(
  index: IndexLignesAc056,
  numeros: Iterable<number | null>,
): CompteursAc056 {
  const parIndice = new Array<number>(index.rattachements.length).fill(0);
  const parEvenement = new Array<number>(index.evenements.length).fill(0);
  const parBeneficiaire = index.evenements.map(({ noeud }) =>
    new Array<number>(noeud.beneficiaires.length).fill(0),
  );
  const parEntiteEvenement = index.evenements.map(zerosEvenement);
  const parEntiteBeneficiaire = index.evenements.map(({ noeud }) =>
    noeud.beneficiaires.map(zerosBeneficiaire),
  );
  const parElement = index.evenements.map(({ noeud }): ElementsEvenementEnCours => ({
    e125: new Array<number>(noeud.e125.length).fill(0),
    beneficiaires: noeud.beneficiaires.map((b) => ({
      e485: new Array<number>(b.e485.length).fill(0),
      e490: new Array<number>(b.e490.length).fill(0),
      e700: new Array<number>(b.e700.length).fill(0),
    })),
  }));
  let horsEvenement = 0;

  for (const numero of numeros) {
    const indice = numero === null ? undefined : index.indices.get(numero);
    if (indice === undefined) {
      horsEvenement++;
      continue;
    }
    parIndice[indice]!++;
    const r = index.rattachements[indice];
    if (r === null || r === undefined) {
      horsEvenement++;
      continue;
    }
    parEvenement[r.evenement]!++;
    if (r.beneficiaire === null) {
      parEntiteEvenement[r.evenement]![r.entite as CodeEntiteEvenement]++;
      if (r.entite === '125') parElement[r.evenement]!.e125[r.rang]!++;
      continue;
    }
    parBeneficiaire[r.evenement]![r.beneficiaire]!++;
    parEntiteBeneficiaire[r.evenement]![r.beneficiaire]![r.entite as CodeEntiteBeneficiaire]++;
    if (r.entite === '485' || r.entite === '490' || r.entite === '700') {
      parElement[r.evenement]!.beneficiaires[r.beneficiaire]![`e${r.entite}`][r.rang]!++;
    }
  }

  return Object.freeze({
    parIndice,
    parEvenement,
    parBeneficiaire,
    parEntiteEvenement,
    parEntiteBeneficiaire,
    parElement,
    horsEvenement,
  });
}

/** Compteurs des anomalies bloquantes (les non bloquantes ne marquent rien à l'écran). */
export function compterAnomalies(
  index: IndexLignesAc056,
  anomalies: readonly AnomalieAc056[],
): CompteursAc056 {
  const numeros: (number | null)[] = [];
  for (const anomalie of anomalies) if (anomalie.bloquante) numeros.push(anomalie.ligne);
  return compterParLigne(index, numeros);
}
