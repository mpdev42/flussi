import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type {
  ConfigurationPublique,
  DossierTravail,
  DemandeEnregistrementSecrets,
  EmplacementAc056,
  EnregistrementAc056,
  EtatJournal,
  EtatSecrets,
  LigneJournal,
  LigneJournalSession,
  ListeAc056,
  OuvertureAc056,
  ResultatOuvertureDossier,
  ResultatPreparationCle,
  ResultatSecret,
  ResultatStockage,
  SessionJournal,
} from '@shared/types';
import type { DemandeEnregistrementAc056 } from '@shared/schemas/ac056';

const api = {
  ping: (): Promise<string> => ipcRenderer.invoke('app:ping'),
  config: {
    lire: (): Promise<ConfigurationPublique> => ipcRenderer.invoke('config:lire'),
    ouvrirDossier: (dossier: DossierTravail): Promise<ResultatOuvertureDossier> =>
      ipcRenderer.invoke('config:ouvrir-dossier', dossier),
  },
  secrets: {
    /** Statuts seulement ; aucun canal ne relit une valeur. */
    etat: (): Promise<EtatSecrets> => ipcRenderer.invoke('secrets:etat'),
    /** Le sélecteur de fichier est ouvert par le main : aucun chemin ne vient de l'écran. */
    preparerCle: (): Promise<ResultatPreparationCle> => ipcRenderer.invoke('secrets:preparer-cle'),
    abandonnerCle: (): Promise<void> => ipcRenderer.invoke('secrets:abandonner-cle'),
    /** Un seul enregistrement, donc une seule invite de contrôle de compte. */
    enregistrer: (demande: DemandeEnregistrementSecrets): Promise<ResultatSecret> =>
      ipcRenderer.invoke('secrets:enregistrer', demande),
  },
  ac056: {
    /** Fichiers `.txt` de IN et OUT, du plus récent au plus ancien. */
    lister: (): Promise<ListeAc056> => ipcRenderer.invoke('ac056:lister'),
    /** Un emplacement logique et un nom de fichier : jamais un chemin. */
    ouvrir: (fichier: { emplacement: EmplacementAc056; nom: string }): Promise<OuvertureAc056> =>
      ipcRenderer.invoke('ac056:ouvrir', fichier),
    /** Corrections saisies : le main relit, applique, vérifie puis écrit le fichier. */
    enregistrer: (demande: DemandeEnregistrementAc056): Promise<EnregistrementAc056> =>
      ipcRenderer.invoke('ac056:enregistrer', demande),
    /** Fichier aux corrections non enregistrées (`null` : aucun), pour la confirmation à la fermeture. */
    signalerModifications: (fichier: { emplacement: EmplacementAc056; nom: string } | null): void =>
      ipcRenderer.send('ac056:modifications', { fichier }),
  },
  journal: {
    annees: (): Promise<ResultatStockage<string[]>> => ipcRenderer.invoke('journal:annees'),
    sessions: (annee: string, mois: string): Promise<ResultatStockage<SessionJournal[]>> =>
      ipcRenderer.invoke('journal:sessions', { annee, mois }),
    lire: (chemin: string): Promise<ResultatStockage<LigneJournal[]>> =>
      ipcRenderer.invoke('journal:lire', chemin),
    etat: (): Promise<EtatJournal> => ipcRenderer.invoke('journal:etat'),
    /** Abonnement à `journal:etat-change` ; renvoie la fonction de désabonnement. */
    surEtat: (rappel: (etat: EtatJournal) => void): (() => void) => {
      const ecouteur = (_event: IpcRendererEvent, etat: EtatJournal): void => rappel(etat);
      ipcRenderer.on('journal:etat-change', ecouteur);
      return () => {
        ipcRenderer.removeListener('journal:etat-change', ecouteur);
      };
    },
    /** Lignes de la session en cours depuis le début. */
    lignesSession: (): Promise<LigneJournalSession[]> =>
      ipcRenderer.invoke('journal:lignes-session'),
    /** Abonnement à `journal:ligne-ajoutee` ; renvoie la fonction de désabonnement. */
    surLigne: (rappel: (ligne: LigneJournalSession) => void): (() => void) => {
      const ecouteur = (_event: IpcRendererEvent, ligne: LigneJournalSession): void =>
        rappel(ligne);
      ipcRenderer.on('journal:ligne-ajoutee', ecouteur);
      return () => {
        ipcRenderer.removeListener('journal:ligne-ajoutee', ecouteur);
      };
    },
  },
};

contextBridge.exposeInMainWorld('api', api);

export type Api = typeof api;
