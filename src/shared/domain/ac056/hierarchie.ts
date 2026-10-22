// Rattachement des lignes à leur parent, à la manière de `AjouterEntite` de `uac056.pas` :
// des curseurs (dossier, évènement, bénéficiaire courants), le dernier gagne, aucun curseur
// n'est fermé par une 990/995/999. Le code est lu sur la ligne, quelle que soit sa nature.
//
// Fichier de rejet MSP : MSP ne fabrique pas de 001 en tête de dossier, il la place après la 995
// (ou l'omet), et la 000 et la 999 se retrouvent à la fin. Un dossier est donc une suite de lignes
// de mêmes 17 premiers octets (émetteur et numéro de dossier) : un changement de clé ouvre un
// dossier, la 001 s'y rattache sans toucher aux curseurs, la 000 et la 999 restent hors dossier
// (divergence 7 : pas de lignes fabriquées comme dans Lazarus).
// MSP peut aussi renvoyer une 700 sans la 400 de son bénéficiaire : comme `AjouterEntite700`
// (`uac056.pas:736-757`), une 700 sans bénéficiaire courant dans un évènement ouvre un bénéficiaire
// implicite (`e400: null`, aucune ligne fabriquée), qui reste le bénéficiaire courant : les 700 et
// les autres filles qui suivent s'y rattachent, jusqu'à la prochaine 400 ou 100, ou jusqu'au
// changement de clé de dossier, qui remet aussi l'évènement et le bénéficiaire courants (implicite
// compris) à zéro : une 700 du dossier suivant ne s'y rattache jamais.
import type { BeneficiaireAc056, DossierAc056, EvenementAc056, FichierAc056 } from './modele';
import type { LigneAc056, Provenance } from './modele';
import type { Octets } from './octets';
import { cleDossierRejet } from './rejet';

export type HierarchieAc056 = Pick<FichierAc056, 'e000' | 'dossiers' | 'e999'>;

/** Version modifiable d'un nœud pendant la construction (figée à la fin). */
type Modifiable<T> = {
  -readonly [K in keyof T]: T[K] extends readonly (infer U)[] ? Modifiable<U>[] : T[K];
};

function figerBeneficiaire(noeud: Modifiable<BeneficiaireAc056>): BeneficiaireAc056 {
  Object.freeze(noeud.e485);
  Object.freeze(noeud.e490);
  Object.freeze(noeud.e700);
  return Object.freeze(noeud);
}

function figerEvenement(noeud: Modifiable<EvenementAc056>): EvenementAc056 {
  Object.freeze(noeud.e125);
  const beneficiaires = Object.freeze(noeud.beneficiaires.map(figerBeneficiaire));
  return Object.freeze({ ...noeud, beneficiaires });
}

function figerDossier(noeud: Modifiable<DossierAc056>): DossierAc056 {
  const evenements = Object.freeze(noeud.evenements.map(figerEvenement));
  return Object.freeze({ ...noeud, evenements });
}

function nouveauBeneficiaire(e400: number | null): Modifiable<BeneficiaireAc056> {
  return {
    e400,
    e405: null,
    e410: null,
    e411: null,
    e800: null,
    e485: [],
    e490: [],
    e700: [],
  };
}

export function construireHierarchie(
  lignes: readonly LigneAc056[],
  provenance: Provenance = 'veos',
): HierarchieAc056 {
  const rejet = provenance === 'rejet';
  let e000: number | null = null;
  let e999: number | null = null;
  const dossiers: Modifiable<DossierAc056>[] = [];
  let dossier: Modifiable<DossierAc056> | null = null;
  let evenement: Modifiable<EvenementAc056> | null = null;
  let beneficiaire: Modifiable<BeneficiaireAc056> | null = null;
  /** Clé (17 premiers octets) du dossier courant, rejet seulement. */
  let cleDossier: Octets | null = null;

  lignes.forEach((ligne, i) => {
    if (rejet && ligne.code !== null && ligne.code !== '000' && ligne.code !== '999') {
      const cle = cleDossierRejet(ligne.origine);
      if (dossier === null || cle !== cleDossier) {
        dossier = { e001: null, evenements: [], e995: null };
        dossiers.push(dossier);
        cleDossier = cle;
        evenement = null;
        beneficiaire = null;
      }
    }

    switch (ligne.code) {
      case '000':
        e000 = i;
        break;
      case '001':
        if (rejet) {
          // Le dossier est déjà ouvert par la clé : la 001 s'y rattache, le dernier gagne.
          if (dossier) dossier.e001 = i;
          break;
        }
        dossier = { e001: i, evenements: [], e995: null };
        dossiers.push(dossier);
        evenement = null;
        beneficiaire = null;
        break;
      case '100':
        evenement = null;
        if (dossier) {
          evenement = {
            e100: i,
            e110: null,
            e115: null,
            e120: null,
            e130: null,
            e135: null,
            e155: null,
            e180: null,
            e125: [],
            beneficiaires: [],
            e990: null,
          };
          dossier.evenements.push(evenement);
        }
        beneficiaire = null;
        break;
      case '110':
      case '115':
      case '120':
      case '130':
      case '135':
      case '155':
      case '180':
        if (evenement) evenement[`e${ligne.code}`] = i;
        break;
      case '125':
        evenement?.e125.push(i);
        break;
      case '400':
        beneficiaire = null;
        if (evenement) {
          beneficiaire = nouveauBeneficiaire(i);
          evenement.beneficiaires.push(beneficiaire);
        }
        break;
      case '405':
      case '410':
      case '411':
      case '800':
        if (beneficiaire) beneficiaire[`e${ligne.code}`] = i;
        break;
      case '700':
        // Rejet : bénéficiaire implicite (Lazarus : `if not b_entite400_creee`, uac056.pas:740).
        if (rejet && beneficiaire === null && evenement) {
          beneficiaire = nouveauBeneficiaire(null);
          evenement.beneficiaires.push(beneficiaire);
        }
        beneficiaire?.e700.push(i);
        break;
      case '485':
      case '490':
        beneficiaire?.[`e${ligne.code}`].push(i);
        break;
      case '990':
        if (evenement) evenement.e990 = i;
        break;
      case '995':
        if (dossier) dossier.e995 = i;
        break;
      case '999':
        e999 = i;
        break;
      case null:
        break;
    }
  });

  return { e000, dossiers: Object.freeze(dossiers.map(figerDossier)), e999 };
}
