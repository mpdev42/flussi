export {
  LIBELLES_FORMAT_CLE,
  MESSAGES_REFUS_CLE,
  TAILLE_MAX_CLE_PRIVEE,
  analyserClePrivee,
  messageTypePpk,
  type AnalyseClePrivee,
  type FormatClePrivee,
  type RefusClePrivee,
} from './cle-privee';
export { creerChiffrementDpapi, type ChiffrementMachine } from './dpapi';
// `creerApiElevationWindows` (api-windows.ts) n'est volontairement pas réexportée : seul
// `src/main/index.ts` l'importe, directement.
export type { ApiElevationWindows, ResultatLancementEleve } from './api-windows';
export { canalEcritureDemande, ecrireSecretsDepuisCanal } from './ecriture-secrets';
export { CODES_ECRITURE, ecrireEnAdministrateur, type ResultatEcritureElevee } from './elevation';
export { chargerConfiguration, formaterErreurs, type ParametresChargement } from './lecture';
export {
  DOSSIER_TRAVAIL_PROD,
  analyserConfigJson,
  resoudreConfiguration,
  type AnalyseConfigJson,
  type ContexteConfiguration,
  type ErreurConfiguration,
  type ResultatConfiguration,
  type SourceConfiguration,
} from './resolution';
export {
  creerCoffreSecrets,
  lireFichierCle,
  type CoffreSecrets,
  type EcritureSecrets,
  type LectureFichierCle,
  type LectureSecrets,
  type SystemeFichiersSecrets,
} from './secrets';
export { type ContenuSecrets, type SecretEnregistre } from './secrets-format';
