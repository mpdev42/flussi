// Fiches de l'écran : une par entité décrite champ par champ, d'après les onglets `tsEntiteNNN` de
// `fmain.lfm` (titre en gras `lblNNNTitre`, champs affichés dans l'ordre vertical `Top` de
// l'écran Lazarus). Vérifié contre `fmain.lfm` par `fiches.lazarus.test.ts`.
import { figerProfond } from './gel';
import { ENTITES } from './registre';
import type { CodeEntite, DescriptionChamp } from './types';

/** Entités qui ont une fiche : toutes sauf les lignes brutes (000, 001, 990, 995, 999). */
export const CODES_FICHE = figerProfond([
  '100',
  '110',
  '115',
  '120',
  '125',
  '130',
  '135',
  '155',
  '180',
  '400',
  '405',
  '410',
  '411',
  '485',
  '490',
  '700',
  '800',
] as const satisfies readonly CodeEntite[]);

/** Code d'une entité qui a une fiche à l'écran. */
export type CodeFiche = (typeof CODES_FICHE)[number];

export interface DescriptionFiche {
  /** Titre en gras de la fiche Lazarus (`lblNNNTitre`). */
  readonly titre: string;
  /** Noms Flussi des champs affichés, de haut en bas. */
  readonly champs: readonly string[];
}

export const FICHES: Readonly<Record<CodeFiche, DescriptionFiche>> = figerProfond({
  '100': {
    titre: 'Identification de l’évènement',
    champs: [
      'typeContrat',
      'numContratIndiv',
      'numContratCollectif',
      'codeGroupeAssures',
      'codeEntiteRattachement',
      'dateEffetActe',
      'dateEffetCotisation',
      'dateVente',
      'dateDemande',
      'codeOffre',
      'codeReseau',
      'echPrinc',
      'groupeGestion',
      'centreGestion',
      'codeContexte',
    ],
  },
  '110': { titre: 'Données générales', champs: ['dateEffet', 'ancienContrat'] },
  '115': {
    titre: 'Nom de la personne principale',
    champs: ['rangPersonne', 'codeCivilite', 'nom', 'prenom1', 'numInsee'],
  },
  '120': {
    titre: 'Adresse principale',
    champs: [
      'complementGeographique',
      'numeroVoie',
      'codeBtq',
      'codeNatureVoie',
      'libelleVoie',
      'lieuDit',
      'codePostalLocalite',
      'libelleLocalite',
      'codeDepartement',
      'codePays',
      'codeTypeAdresse',
    ],
  },
  '125': {
    titre: 'Communications principales',
    champs: ['codeTypeCoordonnee', 'codeNatureCommunication', 'valeurCoordonneeCommunication'],
  },
  '130': {
    titre: 'RIB principal',
    champs: [
      'codeBanque',
      'codeGuichet',
      'numeroCompte',
      'cleControle',
      'titulaireCompte',
      'codePays',
      'codeDevise',
    ],
  },
  '135': { titre: 'Identification du souscripteur', champs: ['rangPersonne'] },
  '155': { titre: 'Identification du payeur', champs: ['rangPersonne', 'debutPrelevement'] },
  '180': {
    titre: 'Identification du destinataire des prestations',
    champs: ['rangPersonne', 'modePaiement'],
  },
  '400': {
    titre: 'Identification de l’assuré',
    champs: [
      'dateAnciennete',
      'rang',
      'rangPersonne',
      'typeAssure',
      'codePays',
      'codeDepartement',
      'situationFamille',
      'codeSexe',
      'dateNaissance',
      'categorieSociale',
      'codeInsee',
      'cleInsee',
    ],
  },
  '405': {
    titre: 'Nom de l’assuré',
    champs: ['rang', 'codeCivilite', 'nom', 'prenom1', 'numInsee', 'nomJeuneFille'],
  },
  '410': {
    titre: 'Informations RO de l’assuré',
    champs: [
      'rang',
      'dateNaissance',
      'rangNaissance',
      'numeroRo',
      'cleRo',
      'codeGrandRegime',
      'codeCaisseRo',
      'codeCentrePaiement',
    ],
  },
  // Onglet vide dans Lazarus, sans titre : titre d'après le contenu de l'entité (attestation ACS).
  '411': { titre: 'Attestation ACS de l’assuré', champs: [] },
  '485': { titre: 'Critère', champs: ['rang', 'code', 'valeur'] },
  '490': { titre: 'Valeur souscription', champs: ['rang', 'code', 'valeur'] },
  // Fiche sans titre dans Lazarus (pas de `lbl700Titre`) : « Garantie » (décision 7 de l'item 2).
  '700': {
    titre: 'Garantie',
    champs: [
      'rang',
      'codeAssureur',
      'codeProduit',
      'codeGarantie',
      'codeConditionVente',
      'ancienneteGarantieSouscr',
      'appliquerStageCv',
      'dateFinStage1',
      'codeStage1',
      'typeGarantieAssemblee',
    ],
  },
  '800': {
    titre: 'Références externes d’une personne',
    champs: ['rang', 'rangPersonne', 'refExterne'],
  },
});

function descriptionsAffichees(code: CodeFiche): readonly DescriptionChamp[] {
  return FICHES[code].champs.map((nom) => {
    const champ = ENTITES[code].champs.find((c) => c.nom === nom);
    if (champ === undefined) throw new Error(`Fiche ${code} : champ ${nom} inconnu.`);
    return champ;
  });
}

const CHAMPS_AFFICHES: Readonly<Record<CodeFiche, readonly DescriptionChamp[]>> = figerProfond(
  Object.fromEntries(CODES_FICHE.map((code) => [code, descriptionsAffichees(code)])) as Record<
    CodeFiche,
    readonly DescriptionChamp[]
  >,
);

/** Descriptions des champs affichés de la fiche `code`, de haut en bas (ordre de `FICHES`). */
export function champsAffiches(code: CodeFiche): readonly DescriptionChamp[] {
  return CHAMPS_AFFICHES[code];
}
