// Types partagés entre main et renderer

import type { Configuration } from '../schemas/config';

/** Configuration résolue non secrète, renvoyée par le canal IPC `config:lire`. */
export type ConfigurationPublique = Configuration & { version: string };
