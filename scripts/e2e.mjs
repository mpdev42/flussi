/**
 * Wrapper Playwright e2e — neutralise ELECTRON_RUN_AS_NODE avant de lancer playwright test.
 *
 * Même contexte que scripts/dev.mjs : VSCode pose ELECTRON_RUN_AS_NODE=1 dans
 * l'extensionHost. Playwright lui-même tourne en pure Node, donc ne crashe pas, mais les
 * specs qui spawnent Electron via `_electron.launch()` héritent de la variable et le binaire
 * Electron démarre alors en mode Node — le test crashe avant d'avoir ouvert la fenêtre.
 *
 * Solution : delete avant le spawn, l'env nettoyé est hérité par tous les sous-process
 * (playwright et les Electrons lancés par les specs).
 */
import { spawn } from 'child_process';

delete process.env.ELECTRON_RUN_AS_NODE;

const args = process.argv.slice(2);
const cmd = ['npx', 'playwright', 'test', ...args].join(' ');

const proc = spawn(cmd, [], {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

proc.on('exit', (code) => process.exit(code ?? 0));
