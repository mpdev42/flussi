/**
 * Wrapper Vitest — lance Vitest depuis la racine du projet avec la lettre de lecteur en majuscule.
 *
 * Contexte : VS Code fournit aux sessions Claude Code (et à leurs agents) un répertoire de
 * travail dont la lettre de lecteur est en minuscule (`c:\Dev\Projets\flussi`). Vitest normalise
 * sa racine en `C:/…`, mais les fichiers de test chargent `vitest` par un chemin `c:/…` : le
 * module est alors instancié deux fois et toutes les suites échouent sur le premier `describe`
 * avec `TypeError: Cannot read properties of undefined (reading 'config')`.
 *
 * Solution : calculer la racine du projet, mettre sa lettre de lecteur en majuscule, puis lancer
 * Vitest avec ce répertoire de travail. Sans effet hors Windows. Les arguments sont transmis tels
 * quels (`npm test -- fpc.test`) et le code de sortie de Vitest est propagé.
 */
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const racine = dirname(dirname(fileURLToPath(import.meta.url))).replace(/^[a-z]:/, (lecteur) =>
  lecteur.toUpperCase(),
);

const proc = spawn(
  process.execPath,
  [join(racine, 'node_modules', 'vitest', 'vitest.mjs'), ...process.argv.slice(2)],
  {
    cwd: racine,
    stdio: 'inherit',
  },
);

proc.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 0)));
