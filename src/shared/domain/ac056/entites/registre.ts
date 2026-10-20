// Registre des 22 entités AC056, décrites d'après Lazarus (`uac056.pas` pour les positions,
// `fmain.lfm` pour l'écran), gelé en profondeur (l'écran le lit).
import { ENTITE_000, ENTITE_001, ENTITE_990, ENTITE_995, ENTITE_999 } from './brutes';
import { ENTITE_100 } from './entite-100';
import { ENTITE_110 } from './entite-110';
import { ENTITE_115 } from './entite-115';
import { ENTITE_120 } from './entite-120';
import { ENTITE_125 } from './entite-125';
import { ENTITE_130 } from './entite-130';
import { ENTITE_135 } from './entite-135';
import { ENTITE_155 } from './entite-155';
import { ENTITE_180 } from './entite-180';
import { ENTITE_400 } from './entite-400';
import { ENTITE_405 } from './entite-405';
import { ENTITE_410 } from './entite-410';
import { ENTITE_411 } from './entite-411';
import { ENTITE_485 } from './entite-485';
import { ENTITE_490 } from './entite-490';
import { ENTITE_700 } from './entite-700';
import { ENTITE_800 } from './entite-800';
import { figerProfond } from './gel';
import type { CodeEntite, DescriptionEntite } from './types';

export const ENTITES: Readonly<Record<CodeEntite, DescriptionEntite>> = figerProfond({
  '000': ENTITE_000,
  '001': ENTITE_001,
  '100': ENTITE_100,
  '110': ENTITE_110,
  '115': ENTITE_115,
  '120': ENTITE_120,
  '125': ENTITE_125,
  '130': ENTITE_130,
  '135': ENTITE_135,
  '155': ENTITE_155,
  '180': ENTITE_180,
  '400': ENTITE_400,
  '405': ENTITE_405,
  '410': ENTITE_410,
  '411': ENTITE_411,
  '485': ENTITE_485,
  '490': ENTITE_490,
  '700': ENTITE_700,
  '800': ENTITE_800,
  '990': ENTITE_990,
  '995': ENTITE_995,
  '999': ENTITE_999,
});
