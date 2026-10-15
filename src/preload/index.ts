import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type {
  ConfigurationPublique,
  DossierTravail,
  EtatJournal,
  LigneJournal,
  ResultatOuvertureDossier,
  ResultatStockage,
  SessionJournal,
} from '@shared/types';

const api = {
  ping: (): Promise<string> => ipcRenderer.invoke('app:ping'),
  config: {
    lire: (): Promise<ConfigurationPublique> => ipcRenderer.invoke('config:lire'),
    ouvrirDossier: (dossier: DossierTravail): Promise<ResultatOuvertureDossier> =>
      ipcRenderer.invoke('config:ouvrir-dossier', dossier),
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
  },
};

contextBridge.exposeInMainWorld('api', api);

export type Api = typeof api;
