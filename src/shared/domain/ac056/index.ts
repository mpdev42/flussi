// Domaine pur AC056 : description des entités, lecture, écriture et modification d'un champ.
export * from './entites';
export { ecrireAc056 } from './ecrivain';
export { lireAc056 } from './lecteur';
export type {
  AnomalieAc056,
  BeneficiaireAc056,
  CodeAnomalie,
  DossierAc056,
  EvenementAc056,
  FichierAc056,
  FinDeLigne,
  LectureAc056,
  LigneAc056,
  LigneBrute,
  LigneDecrite,
} from './modele';
export { modifierChamp } from './modification';
export type {
  CibleChamp,
  CodeErreurModification,
  ErreurModification,
  ResultatModification,
} from './modification';
export { octetsDepuisTexte, texteDepuisOctets } from './octets';
export type { Octets } from './octets';
