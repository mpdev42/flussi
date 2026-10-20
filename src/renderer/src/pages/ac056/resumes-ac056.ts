// Textes lus dans le fichier pour les listes de l'écran AC056 : colonne des évènements, liste des
// bénéficiaires, fil d'Ariane. Valeurs décodées pour l'affichage, espaces de bourrage retirées.
import {
  texteDepuisOctets,
  type BeneficiaireAc056,
  type EvenementAc056,
  type FichierAc056,
} from '@shared/domain/ac056';

/** Type d'assuré de l'assuré principal : ses nom et prénom viennent de la 115 (`fmain.pas:1696`). */
const ASSURE_PRINCIPAL = 'ASSPRI';

/** Texte d'un champ de la ligne `indice` ; vide si la ligne est absente ou n'est pas découpée. */
export function texteChamp(
  fichier: FichierAc056,
  indice: number | null | undefined,
  nom: string,
): string {
  if (indice === null || indice === undefined) return '';
  const ligne = fichier.lignes[indice];
  if (ligne?.nature !== 'decrite') return '';
  const valeur = ligne.valeurs[nom];
  return valeur === undefined ? '' : texteDepuisOctets(valeur).trim();
}

/** Ligne de la colonne des évènements : valeurs de la 100 (Lazarus : grille `sgEvenements`). */
export interface ResumeEvenement {
  readonly dossier: string;
  readonly numEvt: string;
  readonly contrat: string;
  readonly codeEvt: string;
}

export function resumeEvenement(fichier: FichierAc056, noeud: EvenementAc056): ResumeEvenement {
  return {
    dossier: texteChamp(fichier, noeud.e100, 'numDossier'),
    numEvt: texteChamp(fichier, noeud.e100, 'numEvt'),
    contrat: texteChamp(fichier, noeud.e100, 'numContratIndiv'),
    codeEvt: texteChamp(fichier, noeud.e100, 'codeEvt'),
  };
}

/** Ligne de la liste des bénéficiaires (Lazarus : `ChargerBeneficiaires`). */
export interface ResumeBeneficiaire {
  /** Type d'assuré brut de la 400. */
  readonly lien: string;
  readonly rang: string;
  readonly nom: string;
  readonly prenom: string;
}

/** Nom et prénom sur une ligne, sans espace de trop quand l'un des deux est vide. */
export function nomComplet({ nom, prenom }: Pick<ResumeBeneficiaire, 'nom' | 'prenom'>): string {
  return [nom, prenom].filter(Boolean).join(' ');
}

/**
 * Lien : type d'assuré de la 400, brut. Assuré principal : rang de la personne, nom et prénom de la
 * 115 de l'évènement ; sinon rang, nom et prénom de la 405 du bénéficiaire.
 */
export function resumeBeneficiaire(
  fichier: FichierAc056,
  noeud: EvenementAc056,
  beneficiaire: BeneficiaireAc056,
): ResumeBeneficiaire {
  const lien = texteChamp(fichier, beneficiaire.e400, 'typeAssure');
  if (lien === ASSURE_PRINCIPAL) {
    return {
      lien,
      rang: texteChamp(fichier, noeud.e115, 'rangPersonne'),
      nom: texteChamp(fichier, noeud.e115, 'nom'),
      prenom: texteChamp(fichier, noeud.e115, 'prenom1'),
    };
  }
  return {
    lien,
    rang: texteChamp(fichier, beneficiaire.e405, 'rang'),
    nom: texteChamp(fichier, beneficiaire.e405, 'nom'),
    prenom: texteChamp(fichier, beneficiaire.e405, 'prenom1'),
  };
}
