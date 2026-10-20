// Description des entités AC056, d'après Lazarus (`uac056.pas` pour les positions, `fmain.lfm`
// pour l'écran) : types, registre `ENTITES` et fiches de l'écran `FICHES`.
export * from './types';
export { ENTITES } from './registre';
export {
  CODES_FICHE,
  FICHES,
  champsAffiches,
  type CodeFiche,
  type DescriptionFiche,
} from './fiches';
