// Source : docs/reference/lazarus/fmain.lfm, propriété Items.Strings de cbb100CodeContexte.
// Recopie mot pour mot (ordre, doublons, coquilles, espaces de fin). Affichage uniquement :
// Lazarus ne contrôle jamais ces valeurs.
import { figerProfond } from '../gel';
import type { ValeurAutorisee } from '../types';

export const CONTEXTES: readonly ValeurAutorisee[] = figerProfond([
  { code: 'CONJ', libelle: 'Adjonction conjoint' },
  { code: 'ENF', libelle: 'Adjonction enfant' },
  { code: 'NVNE', libelle: 'Adjonction nouveau-né' },
  { code: 'COUR', libelle: 'Affaire nouvelle' },
  {
    code: 'ADR3',
    libelle: 'Changement d’adresse avec chgt département (pour produits avec zonier)',
  },
  { code: 'CAD', libelle: 'Changement d’adresse sans chgt département' },
  { code: 'CODA', libelle: 'Changement d’apporteur' },
  { code: 'AUGT', libelle: 'Changement de garantie augmentation' },
  { code: 'DIGT', libelle: 'Changement de garantie diminution' },
  { code: 'PROD', libelle: 'Changement de garantie tarif' },
  { code: 'DSTP', libelle: 'Déstoppage' },
  { code: 'MADL', libelle: 'Envoi informations Loi Madelin' },
  { code: 'CCS', libelle: 'Modification bénéficiaire catégorie sociale' },
  { code: 'NAIS', libelle: 'Modification bénéficiaire date de naissance' },
  { code: 'FANP', libelle: 'Modification bénéficiaire nom, prénom et nom de jeune fille' },
  { code: 'RO', libelle: 'Modification bénéficiaire RO (numéro, caisse)' },
  { code: 'TEL', libelle: 'Modification communications' },
  { code: 'RIBP', libelle: 'Modification de RIB' },
  { code: 'CENT', libelle: 'Radiation contrat obligatoire' },
  { code: 'CASS', libelle: 'Radiation dans les délais statutaires' },
  { code: 'RDC2', libelle: 'Radiation décès conjoint' },
  { code: 'RDC1', libelle: 'Radiation décès enfant' },
  { code: 'IPC', libelle: 'Radiation immatriculation personnelle conjoint' },
  { code: 'IPE', libelle: 'Radiation immatriculation personnelle enfant' },
  { code: 'ACRA', libelle: 'Réactivation bénéficiaire' },
  { code: 'ACRC', libelle: 'Réactivation famille' },
  { code: 'CI', libelle: 'Renouvellement ACS' },
  { code: 'CMU', libelle: 'Résiliation famille CMU' },
  { code: 'CENT', libelle: 'Résiliation famille contrat obligatoire' },
  { code: 'OFF', libelle: 'Résiliation famille contrat remplacé par un autre contrat' },
  { code: 'CASS', libelle: 'Résiliation famille dans les délais statutaires' },
  { code: 'DC', libelle: 'Résiliation famille décès assuré' },
  { code: 'OFF', libelle: 'Résiliation famille fin de portabilité' },
  { code: 'IMPE', libelle: 'Résiliation famille immatriculation personnelle assuré' },
  { code: 'NPAY', libelle: 'Résiliation famille non-paiement' },
  { code: 'SAEF', libelle: 'Sans effet' },
  { code: 'FDRO', libelle: 'Stoppage' },
]);
