// Saisie d'un champ à l'écran (sortie du champ) : modification en mémoire, puis recontrôle de la
// ligne modifiée seule. Divergence validée (backlog v0.1.0, item 5) : Lazarus (`ControlerEvenement`
// sur `OnExit`) vide les erreurs de tout l'évènement et ne rejoue que les règles de la donnée ;
// Flussi remplace les anomalies de contrôle de la ligne par celles de son nouveau contrôle.
// Un texte identique à l'affichage n'est ignoré que sur un champ sans erreur (voir `saisirChamp`).
// Garde-fous du domaine (item 3 de la v0.3.0), en plus de ceux de l'écran : aucune saisie dans un
// fichier en anomalie de structure (`fichier-mal-forme`), ni dans un champ que l'écran garde en
// lecture seule (`champ-verrouille`, règle `peutCorriger`, parité `VerrouillerComposants`).
//
// Pourquoi la ligne suffit : chaque règle de `controle.ts` ne lit qu'un champ de sa ligne, plus le
// type d'assuré de la 400 du bénéficiaire (non modifiable) et le n° de dossier de la ligne (non
// modifiable) ; la divergence 5 ne lit que la ligne (octets d'origine, valeur saisie pour un champ
// corrigé). Modifier un champ ne change donc le contrôle d'aucune autre ligne, ni la hiérarchie, ni
// la structure (longueur et code des lignes, inchangés). Les anomalies de lecture décrivent le
// fichier lu et sont gardées telles quelles ; l'analyse du fichier écrit (`preparerEnregistrement`)
// les recalcule : un encodage incohérent disparaît par exemple si le seul champ fautif est corrigé.
import { bilanAnalyse, familleAnomalie, type AnalyseAc056 } from './analyse';
import { designationChamp } from './designation-champ';
import { ENTITES, type DescriptionChamp } from './entites';
import type { IndexLignesAc056 } from './index-lignes';
import { controlerAc056 } from './controle';
import type { AnomalieAc056, FichierAc056, LigneDecrite } from './modele';
import { modifierChamp, type CibleChamp, type CodeErreurModification } from './modification';
import { texteDepuisOctets } from './octets';

/** Refus d'une saisie : ceux de `modifierChamp`, plus les garde-fous de la saisie à l'écran. */
export type CodeErreurSaisie = CodeErreurModification | 'fichier-mal-forme' | 'champ-verrouille';

/** Erreur de saisie, compatible avec `ErreurModification`. Message en français, sans valeur. */
export interface ErreurSaisie {
  readonly code: CodeErreurSaisie;
  readonly message: string;
}

export type ResultatSaisie =
  | { readonly ok: true; readonly analyse: AnalyseAc056 }
  | { readonly ok: false; readonly erreur: ErreurSaisie };

/** Ce qui décide si un champ se corrige à l'écran. */
export interface EtatCorrection {
  /** Champ modifiable dans Lazarus (`DescriptionChamp.modifiable`, l'un des 23). */
  readonly modifiable: boolean;
  /** Champ en erreur (`champEnErreur`). */
  readonly enErreur: boolean;
  /** Champ déjà corrigé pendant la session (`champsModifies` de sa ligne). */
  readonly corrige: boolean;
  /** Fichier VEOS sans anomalie de structure (`analyse.structure === 0`). */
  readonly fichierModifiable: boolean;
}

/**
 * Règle unique de l'écran et du domaine : un champ se corrige s'il est modifiable dans Lazarus,
 * dans un fichier sans anomalie de structure, et s'il est en erreur ou déjà corrigé (décisions 3
 * et 4 de l'item 2, décision 2 de l'item 3 de la v0.3.0).
 */
export function peutCorriger({
  modifiable,
  enErreur,
  corrige,
  fichierModifiable,
}: EtatCorrection): boolean {
  return modifiable && fichierModifiable && (enErreur || corrige);
}

/**
 * Vrai si le champ `cible` est en erreur : une anomalie **bloquante** porte sur sa ligne (numéro
 * d'origine) et sur ce champ. C'est le filtre de l'écran (anomalies bloquantes de la ligne, puis
 * celles du champ). Seules les anomalies de contrôle portent `champ` : les anomalies de lecture et
 * de structure, même bloquantes, ne mettent donc aucun champ en erreur.
 */
export function champEnErreur(anomalies: readonly AnomalieAc056[], cible: CibleChamp): boolean {
  return anomalies.some((a) => a.bloquante && a.ligne === cible.ligne && a.champ === cible.champ);
}

function refus(code: CodeErreurSaisie, message: string): ResultatSaisie {
  return Object.freeze({ ok: false as const, erreur: Object.freeze({ code, message }) });
}

/**
 * Indice dans `fichier.lignes` de la ligne numéro `numero`, d'après l'index. Un index qui ne
 * correspond pas au fichier (indice absent ou d'une autre ligne) est un invariant violé : erreur
 * levée, plutôt qu'un recontrôle vide qui ferait disparaître les erreurs de la ligne sans bruit.
 */
function indiceDeLigne(fichier: FichierAc056, index: IndexLignesAc056, numero: number): number {
  const indice = index.indices.get(numero);
  if (indice === undefined || fichier.lignes[indice]?.numero !== numero) {
    throw new Error(`Index des lignes incohérent avec le fichier : ligne ${numero}.`);
  }
  return indice;
}

/**
 * Anomalies de contrôle de la ligne d'indice `indice`, dans l'ordre de `controlerAc056` : le
 * contrôle complet, filtré sur cette ligne (mesure : voir `saisie.test.ts`). Lève une erreur si
 * l'indice ne désigne aucune ligne du fichier.
 */
export function controlerLigne(
  fichier: FichierAc056,
  _index: IndexLignesAc056,
  indice: number,
): AnomalieAc056[] {
  const ligne = fichier.lignes[indice];
  if (ligne === undefined) {
    throw new Error(`Indice de ligne hors du fichier : ${indice}.`);
  }
  return controlerAc056(fichier).filter((a) => a.ligne === ligne.numero);
}

/** Ligne décrite et champ modifiable de Lazarus visés par `cible`, sinon null. */
function champModifiableDe(
  analyse: AnalyseAc056,
  index: IndexLignesAc056,
  cible: CibleChamp,
): { readonly ligne: LigneDecrite; readonly champ: DescriptionChamp } | null {
  const indice = index.indices.get(cible.ligne);
  const ligne = indice === undefined ? undefined : analyse.fichier.lignes[indice];
  if (ligne?.nature !== 'decrite' || ligne.numero !== cible.ligne) return null;
  const champ = ENTITES[ligne.code].champs.find((c) => c.nom === cible.champ);
  return champ?.modifiable === true ? { ligne, champ } : null;
}

/** Vrai si `texte` est le texte affiché du champ modifiable, inchangé. */
function estInchange(
  analyse: AnalyseAc056,
  index: IndexLignesAc056,
  cible: CibleChamp,
  texte: string,
): boolean {
  if (analyse.fichier.provenance === 'rejet') return false;
  const valeur = champModifiableDe(analyse, index, cible)?.ligne.valeurs[cible.champ];
  return valeur !== undefined && texteDepuisOctets(valeur) === texte;
}

/**
 * Saisie de `texte` dans le champ `cible` : `modifierChamp`, puis recontrôle de la ligne. Les
 * anomalies de contrôle de la ligne (reconnues à leur code) sont remplacées ; celles de lecture et
 * de structure sont gardées, à la place que leur donnerait `analyserAc056` (lecture puis contrôle,
 * tri stable par ligne).
 *
 * Parité `Modified` du `TEdit` (« l'utilisateur a frappé quelque chose ») : l'écran n'appelle
 * `saisirChamp` qu'après une frappe dans le champ, même si le texte final est celui affiché ; un
 * champ quitté sans frappe n'appelle rien. Texte identique au texte affiché :
 * - champ sans erreur (`champEnErreur`) : rien n'est fait, l'analyse reçue est renvoyée telle
 *   quelle (même objet), avant tout refus ;
 * - champ en erreur : la saisie est appliquée. Le texte affiché peut différer des octets lus (une
 *   tabulation de tête retirée par `Trim` reste dans `origine` et la divergence 5 la signale) :
 *   ressaisir le texte visible corrige alors l'erreur. Un texte qui contient U+FFFD (octets UTF-8
 *   invalides affichés puis retapés) est refusé par `modifierChamp` (`caractere-illisible`).
 *
 * Refus propres à la saisie (fichier VEOS seulement ; un rejet est refusé par `modifierChamp`) :
 * - `fichier-mal-forme` : le fichier a une anomalie de structure (`analyse.structure > 0`) ;
 * - `champ-verrouille` : champ modifiable de Lazarus que `peutCorriger` laisse en lecture seule
 *   (ni en erreur, ni déjà corrigé). Les autres champs gardent le refus de `modifierChamp`
 *   (`champ-non-modifiable`, `champ-inconnu`, `ligne-non-decrite`, `ligne-introuvable`).
 *
 * `index` doit être celui du fichier de `analyse` (`indexerLignes` au chargement) : sinon, erreur
 * levée (invariant violé), jamais un recontrôle silencieusement vide.
 */
export function saisirChamp(
  analyse: AnalyseAc056,
  index: IndexLignesAc056,
  cible: CibleChamp,
  texte: string,
): ResultatSaisie {
  const enErreur = champEnErreur(analyse.anomalies, cible);
  if (!enErreur && estInchange(analyse, index, cible, texte)) {
    return Object.freeze({ ok: true, analyse });
  }

  if (analyse.fichier.provenance !== 'rejet') {
    if (analyse.structure > 0) {
      return refus(
        'fichier-mal-forme',
        "Fichier mal formé : aucun champ ne se corrige dans Flussi. Relancez l'export dans VEOS.",
      );
    }
    const vise = champModifiableDe(analyse, index, cible);
    const corrige = vise?.ligne.champsModifies?.includes(cible.champ) ?? false;
    if (
      vise !== null &&
      !peutCorriger({ modifiable: true, enErreur, corrige, fichierModifiable: true })
    ) {
      return refus(
        'champ-verrouille',
        `Entité ${vise.ligne.code} : champ ${designationChamp(vise.champ)} sans erreur, non modifiable.`,
      );
    }
  }

  const resultat = modifierChamp(analyse.fichier, cible, texte);
  if (!resultat.ok) return resultat;

  const { fichier } = resultat;
  const indice = indiceDeLigne(fichier, index, cible.ligne);
  const gardees: AnomalieAc056[] = analyse.anomalies.filter(
    (a) => a.ligne !== cible.ligne || familleAnomalie(a.code) !== 'controle',
  );
  // Ajoutées en fin : le tri stable de `bilanAnalyse` les place après la lecture de leur ligne.
  return Object.freeze({
    ok: true,
    analyse: bilanAnalyse(fichier, [...gardees, ...controlerLigne(fichier, index, indice)]),
  });
}
