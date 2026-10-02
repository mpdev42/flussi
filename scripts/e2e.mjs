/**
 * Wrapper Playwright e2e — neutralise ELECTRON_RUN_AS_NODE, rebuild l'app, puis lance playwright test.
 *
 * Même contexte que scripts/dev.mjs : VSCode pose ELECTRON_RUN_AS_NODE=1 dans
 * l'extensionHost. Playwright lui-même tourne en pure Node, donc ne crashe pas, mais les
 * specs qui spawnent Electron via `_electron.launch()` héritent de la variable et le binaire
 * Electron démarre alors en mode Node — le test crashe avant d'avoir ouvert la fenêtre.
 *
 * Solution : delete avant le spawn, l'env nettoyé est hérité par tous les sous-process
 * (playwright et les Electrons lancés par les specs).
 *
 * Les specs lancent l'app buildée (out/), pas les sources : le build est refait à chaque
 * lancement pour ne jamais tester une version périmée.
 */
import { spawn } from 'child_process';

delete process.env.ELECTRON_RUN_AS_NODE;

// Commande passée en string unique pour éviter DEP0190 (args tableau + shell:true)
function lancer(cmd) {
  return new Promise((resolve) => {
    const proc = spawn(cmd, [], {
      stdio: 'inherit',
      shell: true,
      env: process.env,
    });
    proc.on('exit', (code) => resolve(code ?? 0));
  });
}

const codeBuild = await lancer('electron-vite build');
if (codeBuild !== 0) {
  process.exit(codeBuild);
}

const args = process.argv.slice(2);
process.exit(await lancer(['npx', 'playwright', 'test', ...args].join(' ')));
