import { _electron, type ElectronApplication, type Page } from '@playwright/test';
import path from 'node:path';

const MAIN_ENTRY = path.resolve(process.cwd(), 'out/main/index.cjs');

/**
 * Lance l'application Electron buildée et retourne l'app + sa première fenêtre.
 *
 * Pré-requis :
 * - Le wrapper `scripts/e2e.mjs` rebuild l'app dans `out/` et neutralise ELECTRON_RUN_AS_NODE
 *   avant de lancer Playwright.
 * - Playwright est lancé depuis la racine du projet (cas garanti par `npm run test:e2e` qui
 *   passe par le wrapper). `process.cwd()` est donc la racine, et `out/main/index.cjs` est
 *   accessible. `process.cwd()` est préféré à `__dirname`, instable sous le transformer Playwright.
 *
 * Toujours appeler `app.close()` en fin de test (ou via fixture afterEach) pour ne pas
 * laisser de processus Electron orphelin.
 *
 * Retour : `{ app, page }` — la propriété est nommée `page` (et non `window`) pour ne pas
 * masquer le `window` global du renderer dans les callbacks `page.evaluate(() => ...)`.
 */
export async function launchApp(): Promise<{
  app: ElectronApplication;
  page: Page;
}> {
  const app = await _electron.launch({
    args: [MAIN_ENTRY],
    timeout: 30_000,
  });
  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  return { app, page };
}
