// Texte affiché d'un champ AC056 à l'écran (listes et dates en lecture seule, affichées comme du
// texte, décision 6 de l'item 2 de la v0.3.0) :
// - liste : entrée trouvée à parité de `SetComboIndex` (`fmain.pas:3230-3258`), affichée
//   « CODE - Libellé » ; code absent de la liste : code brut, état `inconnue` (Lazarus : vide) ;
// - date AAAAMMJJ : JJ/MM/AAAA d'après `GetDateFromAc056` (`fmain.pas:3676`) ; vide : rien
//   (Lazarus : 30/12/1899) ; invalide : valeur brute, état `invalide` ;
// - autre champ : texte décodé.
// Décodage selon la provenance (`texteValeur`) : UTF-8 pour un fichier VEOS, Windows-1252 pour un
// rejet MSP (sinon un accent d'un rejet s'afficherait U+FFFD). Provenance toujours exigée : aucun
// appel ne peut l'oublier.
import type { DescriptionChamp, ValeurAutorisee } from './entites';
import { trimFpc } from './fpc';
import type { Provenance } from './modele';
import { texteDepuisOctets, texteWindows1252, type Octets } from './octets';

/**
 * Texte d'une valeur lue, décodé selon la provenance du fichier : Windows-1252 pour un rejet (jamais
 * U+FFFD), UTF-8 non fatal pour un fichier VEOS (U+FFFD sur un octet invalide).
 */
export function texteValeur(valeur: Octets, provenance: Provenance): string {
  return provenance === 'rejet' ? texteWindows1252(valeur) : texteDepuisOctets(valeur);
}

/** `inconnue` : code absent de la liste ; `invalide` : date illisible. */
export type EtatValeurAffichee = 'normal' | 'vide' | 'inconnue' | 'invalide';

export interface ValeurAffichee {
  readonly texte: string;
  readonly etat: EtatValeurAffichee;
}

/** Texte de l'entrée dans `fmain.lfm` : « CODE - Libellé », ou '' pour l'entrée vide. */
export function texteEntree(entree: ValeurAutorisee): string {
  return entree.code === '' && entree.libelle === '' ? '' : `${entree.code} - ${entree.libelle}`;
}

/** Majuscules ASCII seules, comme `SameText` de FPC (les lettres accentuées ne sont pas pliées). */
const majusculesAscii = (texte: string): string =>
  texte.replace(/[a-z]/g, (lettre) => lettre.toUpperCase());

/**
 * Entrée de la liste du champ pour `valeur`, à parité de `SetComboIndex` : première entrée dont
 * le texte commence par `valeur + ' - '`, casse ASCII ignorée (`StartsWith(s_rec, True)`). La
 * valeur est prise telle que lue (rognée si le champ l'est). null : champ sans liste ou code
 * absent (Lazarus : `ItemIndex := -1`). Une valeur vide ne trouve jamais l'entrée vide de
 * `situationFamille` (' - ' n'est le début d'aucune entrée).
 */
export function entreeListe(
  champ: DescriptionChamp,
  valeur: Octets,
  provenance: Provenance,
): ValeurAutorisee | null {
  const liste = champ.valeursAutorisees;
  if (liste === undefined) return null;
  const recherche = majusculesAscii(`${texteValeur(valeur, provenance)} - `);
  return liste.find((entree) => majusculesAscii(texteEntree(entree)).startsWith(recherche)) ?? null;
}

const CHIFFRES_DATE = /^\d{8}$/;

function joursDuMois(annee: number, mois: number): number {
  if (mois === 2) {
    const bissextile = (annee % 4 === 0 && annee % 100 !== 0) || annee % 400 === 0;
    return bissextile ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(mois) ? 30 : 31;
}

/**
 * Date AAAAMMJJ (rognée, comme `trim(ps_date)`) en JJ/MM/AAAA, ou null si elle n'est pas une date
 * du calendrier (années 1 à 9999, comme `StrToDate`).
 */
function dateAffichee(valeur: Octets): string | null {
  if (!CHIFFRES_DATE.test(valeur)) return null;
  const annee = Number(valeur.slice(0, 4));
  const mois = Number(valeur.slice(4, 6));
  const jour = Number(valeur.slice(6, 8));
  if (annee < 1 || mois < 1 || mois > 12 || jour < 1 || jour > joursDuMois(annee, mois)) {
    return null;
  }
  return `${valeur.slice(6, 8)}/${valeur.slice(4, 6)}/${valeur.slice(0, 4)}`;
}

export function valeurAffichee(
  champ: DescriptionChamp,
  valeur: Octets,
  provenance: Provenance,
): ValeurAffichee {
  const texte = texteValeur(valeur, provenance);

  if (champ.type === 'date') {
    const rognee = trimFpc(valeur);
    if (rognee === '') return Object.freeze({ texte: '', etat: 'vide' });
    const date = dateAffichee(rognee);
    return Object.freeze(
      date === null
        ? { texte, etat: 'invalide' as const }
        : { texte: date, etat: 'normal' as const },
    );
  }

  if (texte === '') return Object.freeze({ texte: '', etat: 'vide' });

  if (champ.valeursAutorisees !== undefined) {
    const entree = entreeListe(champ, valeur, provenance);
    return Object.freeze(
      entree === null
        ? { texte, etat: 'inconnue' as const }
        : { texte: texteEntree(entree), etat: 'normal' as const },
    );
  }

  return Object.freeze({ texte, etat: 'normal' });
}
