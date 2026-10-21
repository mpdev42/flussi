// Enregistrement d'un fichier AC056 corrigé (item 3 de la v0.3.0), en pur : l'écran envoie la liste
// des champs corrigés (`correctionsAc056`), le main relit l'original et la rejoue ici
// (`preparerEnregistrement`), puis écrit les octets obtenus. Aucune entrée-sortie.
// Format écrit : celui de `ecrireAc056` (seuls les octets des champs corrigés changent, décision 4
// remplacée le 2026-10-21 ; champ corrigé écrit comme `EnregistrerFichierAc056`, `fmain.pas:3449`).
// Divergences validées : enregistrement possible avec des erreurs restantes (le dépôt MSP les
// refusera), refus d'un fichier en anomalie de structure, lignes vides et 0x1A finaux supprimés.
// Le main ne vérifie pas que le champ est en erreur (décision 2 : un champ corrigé et enregistré
// reste modifiable jusqu'au changement de fichier) : seulement ce que vérifie `modifierChamp`.
import { analyserAc056, bilanAnalyse, familleAnomalie, type AnalyseAc056 } from './analyse';
import { contenuLigne, ecrireAc056 } from './ecrivain';
import { ENTITES } from './entites';
import { lireAc056 } from './lecteur';
import type { FichierAc056, LigneAc056, Provenance } from './modele';
import { modifierChamp, type ErreurModification } from './modification';
import { sousOctets, texteDepuisOctets } from './octets';

/**
 * Champ corrigé à l'écran : `ligne` = numéro de ligne d'origine, `texte` = valeur gardée par
 * `modifierChamp` (rognée pour un champ trimé). Type unique : le schéma IPC
 * (`correctionAc056Schema`, `@shared/schemas/ac056`) le vérifie par `satisfies`.
 */
export interface CorrectionAc056 {
  readonly ligne: number;
  readonly champ: string;
  readonly texte: string;
}

export type ResultatPreparation =
  | {
      readonly ok: true;
      /** Octets à écrire. */
      readonly octets: Uint8Array;
      /** Vrai si `octets` est égal au fichier lu : rien à enregistrer. */
      readonly identique: boolean;
      /** Analyse du fichier écrit, avec les `champsModifies` des corrections reportés. */
      readonly analyse: AnalyseAc056;
      /** Nombre de champs corrigés dont les octets écrits diffèrent de ceux du fichier lu. */
      readonly champsModifies: number;
      /** Nombre de lignes vides supprimées. */
      readonly lignesVides: number;
      /** Vrai si des 0x1A finaux (Ctrl-Z) ont été supprimés. */
      readonly ctrlZ: boolean;
    }
  | { readonly ok: false; readonly code: 'fichier-rejet' | 'fichier-mal-forme' }
  | {
      readonly ok: false;
      readonly code: 'correction-refusee';
      /** Indice (base 0) de la correction refusée dans la liste reçue. */
      readonly indice: number;
      readonly erreur: ErreurModification;
    };

/**
 * Une correction par champ de `champsModifies`, dans l'ordre du fichier (lignes, puis champs par
 * position). `texte` est le texte de la valeur gardée : `modifierChamp` l'a encodée en UTF-8 depuis
 * un texte bien formé sans U+FFFD (puis rognée de ses octets <= 0x20 de bord pour un champ trimé),
 * le décodage la rend donc à l'identique, et la rejouer redonne la même valeur.
 */
export function correctionsAc056(fichier: FichierAc056): CorrectionAc056[] {
  const corrections: CorrectionAc056[] = [];
  for (const ligne of fichier.lignes) {
    if (ligne.nature !== 'decrite' || ligne.champsModifies === undefined) continue;
    for (const champ of ENTITES[ligne.code].champs) {
      const valeur = ligne.valeurs[champ.nom];
      if (valeur === undefined || !ligne.champsModifies.includes(champ.nom)) continue;
      corrections.push({ ligne: ligne.numero, champ: champ.nom, texte: texteDepuisOctets(valeur) });
    }
  }
  return corrections;
}

function egaux(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * Nombre de champs corrigés dont les octets écrits (`contenuLigne`, seul détenteur du format écrit)
 * diffèrent de ceux de la ligne lue (`origine`).
 */
function compterChampsModifies(fichier: FichierAc056): number {
  let nombre = 0;
  for (const ligne of fichier.lignes) {
    if (ligne.nature !== 'decrite' || ligne.champsModifies === undefined) continue;
    const ecrite = contenuLigne(ligne);
    for (const champ of ENTITES[ligne.code].champs) {
      if (!ligne.champsModifies.includes(champ.nom)) continue;
      const debut = champ.position - 1;
      const fin = debut + champ.longueur;
      if (sousOctets(ecrite, debut, fin) !== sousOctets(ligne.origine, debut, fin)) nombre++;
    }
  }
  return nombre;
}

/**
 * Analyse du fichier écrit, où chaque ligne reprend les `champsModifies` de la ligne corrigée de
 * même indice. Les lignes vides ne sont pas dans `lignes` et l'écrivain réécrit chaque ligne avec
 * sa fin de ligne : les deux fichiers ont les mêmes lignes, dans le même ordre, de même code,
 * donc la même hiérarchie (indices dans `lignes`). Seuls les numéros changent (lignes vides
 * supprimées). Les anomalies sont celles d'une réouverture du fichier écrit (`analyserAc056`).
 */
function analyseReportee(ecrite: AnalyseAc056, corrige: FichierAc056): AnalyseAc056 {
  if (ecrite.fichier.lignes.length !== corrige.lignes.length) {
    throw new Error('Fichier écrit incohérent avec le fichier corrigé : nombre de lignes.');
  }
  const lignes = ecrite.fichier.lignes.map((ligne, indice): LigneAc056 => {
    const source = corrige.lignes[indice];
    if (source?.code !== ligne.code) {
      throw new Error(`Fichier écrit incohérent avec le fichier corrigé : ligne ${ligne.numero}.`);
    }
    if (source.nature !== 'decrite' || source.champsModifies === undefined) return ligne;
    if (ligne.nature !== 'decrite') {
      throw new Error(`Fichier écrit incohérent avec le fichier corrigé : ligne ${ligne.numero}.`);
    }
    return Object.freeze({ ...ligne, champsModifies: source.champsModifies });
  });
  const fichier: FichierAc056 = Object.freeze({ ...ecrite.fichier, lignes: Object.freeze(lignes) });
  return bilanAnalyse(fichier, ecrite.anomalies);
}

/**
 * Rejoue `corrections`, dans l'ordre, sur le fichier lu `octetsLus`, et prépare les octets à
 * écrire. Refuse un rejet (`fichier-rejet`), un fichier en anomalie de structure, fichier vide
 * compris (`fichier-mal-forme`), et s'arrête à la première correction refusée par `modifierChamp`
 * (`correction-refusee`, avec son `indice` et l'`erreur`). Pas de recontrôle par correction : un
 * seul contrôle, celui du fichier écrit. Ne lève que sur un invariant violé (`ErreurEcritureAc056`
 * de l'écrivain, fichier écrit incohérent avec le fichier corrigé).
 */
export function preparerEnregistrement(
  octetsLus: Uint8Array,
  provenance: Provenance,
  corrections: readonly CorrectionAc056[],
): ResultatPreparation {
  if (provenance === 'rejet') {
    return Object.freeze({ ok: false as const, code: 'fichier-rejet' as const });
  }

  const lecture = lireAc056(octetsLus, provenance);
  if (lecture.anomalies.some((a) => familleAnomalie(a.code) === 'structure')) {
    return Object.freeze({ ok: false as const, code: 'fichier-mal-forme' as const });
  }

  let fichier = lecture.fichier;
  for (const [indice, correction] of corrections.entries()) {
    const resultat = modifierChamp(
      fichier,
      { ligne: correction.ligne, champ: correction.champ },
      correction.texte,
    );
    if (!resultat.ok) {
      return Object.freeze({
        ok: false as const,
        code: 'correction-refusee' as const,
        indice,
        erreur: resultat.erreur,
      });
    }
    fichier = resultat.fichier;
  }

  const octets = ecrireAc056(fichier);
  return Object.freeze({
    ok: true as const,
    octets,
    identique: egaux(octets, octetsLus),
    analyse: analyseReportee(analyserAc056(octets, provenance), fichier),
    champsModifies: compterChampsModifies(fichier),
    lignesVides: lecture.anomalies.filter((a) => a.code === 'ligne-vide').length,
    ctrlZ: lecture.anomalies.some((a) => a.code === 'ctrl-z-final'),
  });
}
