/**
 * Wrapper de démarrage dev — neutralise ELECTRON_RUN_AS_NODE avant de lancer electron-vite.
 *
 * Contexte : VSCode pose ELECTRON_RUN_AS_NODE=1 dans l'extensionHost (où tourne Claude Code
 * et d'autres outils de tooling). Cette variable est héritée par tout sous-shell et fait
 * crasher Electron au démarrage (require('electron') retourne le path du binaire au lieu de
 * l'objet API). La simple assignation à chaîne vide ne suffit pas car Electron v41 considère
 * toute valeur définie (y compris "") comme déclencheur du mode Node. Il faut supprimer la
 * variable de process.env avant de spawner electron-vite.
 */
import { spawn } from 'child_process';

delete process.env.ELECTRON_RUN_AS_NODE;

// Commande passée en string unique pour éviter DEP0190 (args tableau + shell:true)
const proc = spawn('electron-vite dev', [], {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

proc.on('exit', (code) => process.exit(code ?? 0));
