// Source : docs/reference/lazarus/fmain.lfm, propriété Items.Strings de cbb400CategorieSociale.
// Recopie mot pour mot (ordre, doublons, coquilles, espaces de fin). Affichage uniquement :
// Lazarus ne contrôle jamais ces valeurs.
import { figerProfond } from '../gel';
import type { ValeurAutorisee } from '../types';

export const CATEGORIES_SOCIALES: readonly ValeurAutorisee[] = figerProfond([
  { code: 'ALSMOS', libelle: 'Alsace-Moselle' },
  { code: 'APP', libelle: 'Apprenti' },
  { code: 'ARTISAN', libelle: 'Artisan TNS' },
  { code: 'COMMERCANT', libelle: 'Commerçant TNS' },
  { code: 'CJTCOLLAB', libelle: 'Conjoint collaborateur' },
  { code: 'CREATEUR ENT', libelle: "Créateur d'entreprise (RG + Loi Madelin < 1 an)" },
  { code: 'DNS', libelle: 'Dirigeant non salarié' },
  { code: 'DIRSAL', libelle: 'Dirigeant salarié' },
  { code: 'ETU', libelle: 'Etudiant' },
  { code: 'FRS', libelle: 'Frontalier de la Suisse' },
  { code: 'MSA', libelle: 'MSA' },
  { code: 'CRPCEN', libelle: 'Notaire' },
  { code: 'PROFLIB', libelle: 'Profession libérale TNS' },
  { code: 'RGLM', libelle: 'Régime général avec loi Madelin' },
  { code: 'SALARIE', libelle: 'Salarié' },
  { code: 'SNCF', libelle: 'SNCF' },
  { code: 'TNS', libelle: 'TNS' },
]);
