// Source : docs/reference/lazarus/fmain.lfm, propriété Items.Strings de cbb115CodeCivilite, cbb405CodeCivilite.
// Recopie mot pour mot (ordre, doublons, coquilles, espaces de fin). Affichage uniquement :
// Lazarus ne contrôle jamais ces valeurs.
import { figerProfond } from '../gel';
import type { ValeurAutorisee } from '../types';

export const CIVILITES: readonly ValeurAutorisee[] = figerProfond([
  { code: 'M', libelle: 'Monsieur' },
  { code: 'MME', libelle: 'Madame' },
]);
