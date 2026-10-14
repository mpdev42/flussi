import { contextBridge, ipcRenderer } from 'electron';
import type { ConfigurationPublique } from '@shared/types';

const api = {
  ping: (): Promise<string> => ipcRenderer.invoke('app:ping'),
  config: {
    lire: (): Promise<ConfigurationPublique> => ipcRenderer.invoke('config:lire'),
  },
};

contextBridge.exposeInMainWorld('api', api);

export type Api = typeof api;
