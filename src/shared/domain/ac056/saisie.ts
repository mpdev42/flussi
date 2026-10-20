// Saisie d'un champ à l'écran (sortie du champ) : modification en mémoire, puis recontrôle de la
// ligne modifiée seule. Divergence validée (backlog v0.1.0, item 5) : Lazarus (`ControlerEvenement`
// sur `OnExit`) vide les erreurs de tout l'évènement et ne rejoue que les règles de la donnée ;
// Flussi remplace les anomalies de contrôle de la ligne par celles de son nouveau contrôle.
// Un texte identique à l'affichage n'est ignoré que sur un champ sans erreur (voir `saisirChamp`).
//
// Pourquoi la ligne suffit : chaque règle de `controle.ts` ne lit qu'un champ de sa ligne, plus le
// type d'assuré de la 400 du bénéficiaire (non modifiable) et le n° de dossier de la ligne (non
// modifiable) ; la divergence 5 ne lit que la ligne. Modifier un champ ne change donc le contrôle
// d'aucune autre ligne, ni la hiérarchie, ni les anomalies de lecture et de structure.
import { bilanAnalyse, familleAnomalie, type AnalyseAc056 } from './analyse';
import { ENTITES } from './entites';
import type { IndexLignesAc056 } from './index-lignes';
import { controlerAc056 } from './controle';
import type { AnomalieAc056, FichierAc056 } from './modele';
import { modifierChamp, type CibleChamp, type ErreurModification } from './modification';
import { texteDepuisOctets } from './octets';

export type ResultatSaisie =
  | { readonly ok: true; readonly analyse: AnalyseAc056 }
  | { readonly ok: false; readonly erreur: ErreurModification };

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

/** Vrai si le champ porte une anomalie bloquante de contrôle sur cette ligne. */
function estEnErreur(analyse: AnalyseAc056, cible: CibleChamp): boolean {
  return analyse.anomalies.some(
    (a) =>
      a.bloquante &&
      a.ligne === cible.ligne &&
      a.champ === cible.champ &&
      familleAnomalie(a.code) === 'controle',
  );
}

/** Vrai si `texte` est le texte affiché du champ, inchangé. */
function estInchange(
  analyse: AnalyseAc056,
  index: IndexLignesAc056,
  cible: CibleChamp,
  texte: string,
): boolean {
  const indice = index.indices.get(cible.ligne);
  const ligne = indice === undefined ? undefined : analyse.fichier.lignes[indice];
  if (analyse.fichier.provenance === 'rejet' || ligne?.nature !== 'decrite') return false;
  const champ = ENTITES[ligne.code].champs.find((c) => c.nom === cible.champ);
  const valeur = ligne.valeurs[cible.champ];
  return champ?.modifiable === true && valeur !== undefined && texteDepuisOctets(valeur) === texte;
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
 * - champ sans anomalie bloquante de contrôle sur cette ligne : rien n'est fait, l'analyse reçue
 *   est renvoyée telle quelle (même objet) ;
 * - champ en erreur : la saisie est appliquée. Le texte affiché peut différer des octets lus (une
 *   tabulation de tête retirée par `Trim` reste dans `origine` et la divergence 5 la signale) :
 *   ressaisir le texte visible corrige alors l'erreur. Un texte qui contient U+FFFD (octets UTF-8
 *   invalides affichés puis retapés) est refusé par `modifierChamp` (`caractere-illisible`).
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
  if (!estEnErreur(analyse, cible) && estInchange(analyse, index, cible, texte)) {
    return Object.freeze({ ok: true, analyse });
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
