# template-electron.md — Bootstrap d'un projet Electron

## Préambule

Ce template est lu par `/project-start` à son étape 6 (Bootstrap du squelette projet). Il décrit comment générer le squelette d'un projet de type `electron` — application desktop avec processus principal (Node.js) et processus renderer (Chromium).

Avant toute génération, lire les sections suivantes de `docs/project-description.md` :

- **Stack** — détermine les paquets npm à inclure et les fichiers de config à créer
- **Architecture** — peut imposer des couches métier supplémentaires (services, repositories) qui se traduisent par des dossiers additionnels sous `src/main/`
- **Dev Commands** — les scripts du `package.json` doivent en être la **copie exacte** (à une exception près quand la Stack contient `electron` — cf. §2.1)
- **Modules / Domaine** — déclenche la création de dossiers vides par module dans `src/main/ipc/` et `src/renderer/src/services/`
- **Design** — si une référence à `DESIGN.md` ou `design/handoff/` existe, ne rien y toucher (cf. section 1)

Si la Stack déclarée contient une brique inhabituelle non reconnue par ce template, **ne rien générer** et appliquer la procédure de la section 6.

---

## 1. Structure de dossiers à générer

Arborescence de base à créer à la racine du projet :

```
src/
  main/
    index.ts
    ipc/
  preload/
    index.ts
    index.d.ts
  renderer/
    src/
      components/
        ui/
      hooks/
      pages/
      services/
      styles/
        index.css
      App.tsx
      main.tsx
    index.html
  shared/
    types/
      index.ts

resources/
build/
scripts/
```

### Adaptations conditionnelles

- Si la Stack mentionne une lib de validation (`zod`, `valibot`, `yup`), créer aussi `src/shared/schemas/`. Sinon, ne pas créer ce dossier.
- Si la section **Dev Commands** inclut un script `test:e2e`, créer à la racine l'arborescence Playwright suivante :
  - `e2e/specs/` — specs versionnés écrits à la main (smoke tests, scénarios critiques régressifs). Contient au moins le smoke initial généré en §2.11.
  - `e2e/fixtures/` — helpers partagés (lancement Electron, données de test). Contient au moins `electron.ts` généré en §2.11.
  - **Ne pas créer** `e2e/qa-runs/` au bootstrap — ce dossier est créé à la demande par la skill `/qa` lors de son premier run en mode automatisé, et il est gitignoré (cf. §4.1).
- Si la section **Architecture** de `docs/project-description.md` déclare des couches métier supplémentaires (ex : services métier dédiés, repositories), créer les dossiers correspondants sous `src/main/` selon les Modules déclarés. Exemple : si l'architecture déclare une couche Service, créer `src/main/services/` ; si elle déclare une couche Repository, créer `src/main/repositories/`.
- Si `design/handoff/` existe déjà à la racine, ne pas le toucher et ne pas le regénérer. Mentionner sa présence dans le résumé final de `/project-start`.
- Le sous-dossier `src/renderer/src/components/ui/` n'est créé qu'avec un `.gitkeep` à ce stade. Il sera peuplé ultérieurement par `npx shadcn@latest add` (voir section 2.4) et par `/design-system-adapt` (stubs pour les composants sans équivalent shadcn).

---

## 2. Fichiers de configuration à générer

### 2.1 — `package.json`

À placer à la racine. Champs à remplir :

- `name` : slug du `PROJECT_NAME` (minuscules, espaces et caractères non alphanumériques remplacés par tirets, tirets multiples consolidés)
- `version` : `"0.1.0"`
- `description` : description courte du projet (issue de la première ligne de `docs/project-description.md`)
- `main` : `"out/main/index.cjs"` (sortie standard d'`electron-vite`)
- `type` : `"module"` si la Stack ou les conventions indiquent ESM ; sinon ne pas inclure ce champ
- `scripts` : **copie exacte** des commandes déclarées dans la section **Dev Commands**. Aucun script supplémentaire, aucun script omis. Reprendre les noms tels qu'ils apparaissent dans la déclaration (`dev`, `test`, `build`, `package`, `lint`, `lint:fix`, `format`, `typecheck`, `test:e2e`, etc.).

  **Exception pour le script `dev` quand la Stack contient `electron`** : la valeur déclarée dans Dev Commands (typiquement `electron-vite dev`) n'est pas copiée telle quelle dans `package.json`. Elle est encapsulée dans le wrapper `scripts/dev.mjs` (cf. §3.9), et le `package.json` reçoit `"dev": "node scripts/dev.mjs"`. Justification : §7.3.

  Cette exception ne s'applique qu'au script `dev`. Tout autre script qui spawne Electron en mode GUI (par ex. un `test:e2e` Playwright qui relance l'app, un `package:test` post-build) doit aussi passer par un wrapper équivalent — voir §7.3 pour le pattern à reproduire.

  **Cas Playwright** : si `playwright` figure dans la Stack et que Dev Commands déclare `test:e2e`, le script `test:e2e` du `package.json` reçoit `"node scripts/e2e.mjs"`. Le wrapper est généré en §3.10. La même règle s'applique à toute variante (`test:e2e:ui`, `test:e2e:debug`, etc.) — toutes pointent vers le wrapper avec leurs arguments en aval (`node scripts/e2e.mjs --ui`, `node scripts/e2e.mjs --debug`).
- `dependencies` et `devDependencies` : uniquement les paquets nécessaires à la Stack déclarée, dérivés selon la table 2.2 ci-dessous.

### 2.2 — Table de dérivation Stack → paquets

Pour chaque brique de Stack rencontrée, ajouter les paquets correspondants :

| Brique déclarée | Paquets à ajouter | Section |
|---|---|---|
| `electron` (toujours présent) | `electron`, `electron-builder` | devDependencies |
| `electron-vite` | `electron-vite`, `vite` | devDependencies |
| `react` + `typescript` | `react`, `react-dom` (deps) / `@types/react`, `@types/react-dom`, `typescript`, `@vitejs/plugin-react` (devDeps) | runtime / dev |
| `tailwindcss` | `tailwindcss`, `postcss`, `autoprefixer` | devDependencies |
| `shadcn/ui` | `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react` (deps) / `tailwindcss-animate` (devDep). Les composants shadcn eux-mêmes s'installent par CLI au démarrage (cf. 2.4). | runtime / dev |
| `better-sqlite3` | `better-sqlite3` (dep), `@types/better-sqlite3`, `electron-rebuild` (devDeps) | runtime / dev |
| `drizzle` | `drizzle-orm` (dep), `drizzle-kit` (devDep) | runtime / dev |
| `prisma` | `@prisma/client` (dep), `prisma` (devDep) | runtime / dev |
| `zod` | `zod` | dependencies |
| `vitest` | `vitest`, `@vitest/ui` (devDeps), `jsdom` si tests de composants React | devDependencies |
| `playwright` | `@playwright/test` | devDependencies |
| `eslint` | `eslint`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh` | devDependencies |
| `prettier` | `prettier`, `eslint-config-prettier` | devDependencies |

### 2.3 — Gestion des versions

Ne pas figer de numéros de version précis dans le template. Pour chaque paquet listé en 2.2, utiliser la valeur `"latest"` dans le `package.json` généré. L'utilisateur résoudra les versions effectives via `npm install` à l'issue du bootstrap.

Mentionner explicitement dans le résumé final de `/project-start` la commande `npm install` à exécuter.

Le résumé final de /project-start doit signaler que package-lock.json (généré par npm install) servira de référence de versions à long terme — ne pas utiliser latest en production.

### 2.4 — Avertissements à remonter dans le résumé final

Si certaines briques sont présentes dans la Stack, ajouter un avertissement dans le résumé final de `/project-start` :

- `better-sqlite3` présent → avertir que `npx electron-rebuild` doit être exécuté après `npm install` pour recompiler le module natif contre la version d'Electron utilisée.
- `shadcn/ui` présent → avertir que :
  - les **dépendances peer** de shadcn (`class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `tailwindcss-animate`) sont déjà incluses dans le `package.json` (cf. 2.2) ;
  - le `components.json` est pré-généré (cf. 2.5), pas besoin de lancer `npx shadcn@latest init` ;
  - les **composants shadcn s'installent à la demande** via `npx shadcn@latest add {composant}`. Les composants spécifiques à installer pour ce projet seront listés par `/design-system-adapt` après dépôt de `DESIGN.md` — ne pas les installer à l'aveugle au bootstrap.
- `prisma` présent → avertir que `npx prisma init` puis `npx prisma generate` sont à exécuter avant le premier lancement.

### 2.5 — `components.json` (si shadcn dans la Stack)

À générer à la racine. Contenu :

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/renderer/src/styles/index.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

Adapter les chemins de `tailwind.config` et `tailwind.css` si la structure dévie de la convention Electron standard.

Créer également `src/renderer/src/lib/utils.ts` avec le helper `cn` standard de shadcn :

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### 2.6 — `electron.vite.config.ts`

À générer si `electron-vite` est dans la Stack (cas standard). Contenu :

- Trois configurations exportées : `main`, `preload`, `renderer`
- Le `preload` doit forcer la sortie en CJS (`index.js`) via `rollupOptions`. Cette contrainte est **non négociable** : Electron charge le preload via `require()` quand `sandbox: false`, et l'ESM en preload demande une configuration Electron additionnelle non couverte par ce template. Sans cette contrainte, et si `package.json` contient `"type": "module"`, electron-vite émet `out/preload/index.mjs` alors que `src/main/index.ts` (§3.1) attend `out/preload/index.js` — le preload n'est jamais chargé, `contextBridge.exposeInMainWorld` ne tourne pas, et `window.api` reste `undefined` au runtime. Cf. piège §7.1.
- Le `main` doit également forcer la sortie en CJS via `rollupOptions`, avec extension `.cjs`. Sans cette contrainte, et si `package.json` contient `"type": "module"`, electron-vite émet `out/main/index.js` interprété comme ESM par Node — or les imports nommés depuis le CJS d'Electron (`import { app, BrowserWindow } from 'electron'`) échouent en ESM avec Node 24+. L'extension `.cjs` court-circuite le `"type": "module"` du `package.json` et garantit le chargement en CJS. Cf. piège §7.2.
- Le renderer utilise `@vitejs/plugin-react`
- Alias `@` pointant vers `src/renderer/src`
- Si Tailwind présent dans la Stack : ne pas configurer Tailwind ici (la configuration vit dans `postcss.config.js`)

Squelette à respecter strictement :

```ts
import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  main: {
    build: {
      outDir: 'out/main',
      rollupOptions: {
        output: {
          format: 'cjs',
          entryFileNames: 'index.cjs',
        },
      },
    },
  },
  preload: {
    build: {
      outDir: 'out/preload',
      rollupOptions: {
        output: {
          format: 'cjs',
          entryFileNames: 'index.js',
        },
      },
    },
  },
  renderer: {
    plugins: [react()],
    resolve: {
      alias: { '@': resolve(__dirname, 'src/renderer/src') },
    },
  },
});
```

### 2.7 — `tsconfig.json` et `tsconfig.node.json`

Générer un `tsconfig.json` à la racine avec :

- `target: "ES2022"`, `module: "ESNext"`, `moduleResolution: "Bundler"`
- `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`
- `jsx: "react-jsx"`
- `paths` cohérents avec l'alias `@` défini dans `electron.vite.config.ts` et avec les alias déclarés dans `components.json` (cf. 2.5)
- Si `playwright` figure dans la Stack : ajouter `"exclude": ["e2e", "node_modules", "out", "dist", "release"]`. Justification : le dossier `e2e/` a son propre tsconfig (cf. §2.11.2) avec `lib: ["DOM", ...]` pour les callbacks `page.evaluate()` ; sans `exclude` au niveau racine, les fichiers e2e seraient typecheckés deux fois avec des configurations contradictoires (lib DOM absente côté racine → erreurs sur `window`, `document`).

Générer un `tsconfig.node.json` minimal pour les fichiers de configuration Node (build, vite.config, etc.).

### 2.8 — Lint et formatage

- Si `eslint` est dans la Stack : générer `eslint.config.js` (flat config, format recommandé pour ESLint 9+) avec les plugins React et TypeScript activés.
- Si `prettier` est dans la Stack : générer `.prettierrc` minimal (par défaut : `{"semi": true, "singleQuote": true, "trailingComma": "all"}` — laisser l'utilisateur ajuster).

### 2.9 — Tailwind (si déclaré dans la Stack)

Générer :

- `postcss.config.js` avec les plugins `tailwindcss` et `autoprefixer`
- `tailwind.config.js` selon que `shadcn` est présent ou non :

**Cas A — `tailwind` seul (sans shadcn)** :

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{ts,tsx,html}'],
  theme: { extend: {} },
  plugins: [],
};
```

**Cas B — `tailwind` + `shadcn`** : `tailwind.config.js` enrichi avec `darkMode: 'class'`, le mapping shadcn standard (`background`, `foreground`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `input`, `ring`, `card`, `popover` référencés comme `hsl(var(--…))`), `borderRadius` paramétré sur `var(--radius)`, et le plugin `tailwindcss-animate`. Laisser des blocs `extend.colors` vides (`brand: {}`, `sand: {}` ou équivalent) qui seront remplis par `/design-system-adapt` après dépôt de `DESIGN.md`. Squelette :

```js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./src/renderer/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Palettes brand — remplies par /design-system-adapt depuis DESIGN.md
        brand: {},
        sand: {},
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
```

### 2.10 — Vitest (si déclaré dans la Stack)

Générer `vitest.config.ts` à la racine. Si la Stack inclut React, configurer `environment: "jsdom"` pour permettre les tests de composants.

### 2.11 — Playwright (si déclaré dans la Stack)

À générer dès que `playwright` figure dans la Stack et que Dev Commands déclare `test:e2e`.

#### 2.11.1 — `playwright.config.ts` à la racine

À placer à la racine du projet (pas dans `e2e/`) pour que `npx playwright test` la détecte automatiquement. Contenu :

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  testMatch: ['specs/**/*.spec.ts', 'qa-runs/**/*.spec.ts'],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  outputDir: 'test-results',
  timeout: 60_000,
  expect: { timeout: 5_000 },
});
```

Justifications :

- `workers: 1` et `fullyParallel: false` : Electron ne se parallélise pas proprement (chaque instance est un process lourd, et plusieurs instances simultanées peuvent saturer le binding natif `_electron`). Mieux vaut sérialiser.
- Deux dossiers couverts par `testMatch` : `specs/` (versionnés, écrits à la main) et `qa-runs/` (jetables, générés par la skill `/qa`). Voir §1 pour la sémantique des dossiers.
- Pas de `webServer` : on lance Electron buildé via le helper §2.11.3, pas un dev server.
- Timeouts généreux car le démarrage Electron coûte plusieurs secondes au cold start.

#### 2.11.2 — `e2e/tsconfig.json`

Sans tsconfig dédié, le dossier `e2e/` hérite du tsconfig racine, qui est calibré pour l'app (renderer + main) et ne contient ni `lib: DOM` complet ni `include` du dossier `e2e/`. Conséquences observées : les types `Window`, `document`, `HTMLElement` n'existent pas dans les callbacks `page.evaluate()`, et l'augmentation `Window.api` (cf. §3.3) n'est pas vue car `src/shared/types/` n'est pas inclus dans le contexte de compilation des specs.

Générer `e2e/tsconfig.json` avec :

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "types": ["node"],
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  },
  "include": ["**/*.ts", "../src/shared/types/**/*"]
}
```

Trois points :

- `lib: ["ES2022", "DOM", "DOM.Iterable"]` : indispensable pour que les callbacks `page.evaluate(() => window.api.ping())` typecheckent. Le `window` global et l'API DOM doivent être visibles.
- `types: ["node"]` : Node est nécessaire pour `process`, `path`, `__dirname` côté fixtures.
- `include: ["**/*.ts", "../src/shared/types/**/*"]` : embarque le `window.d.ts` partagé (§3.3) pour que `window.api` soit typé dans les `evaluate`. Sans cet include, `window.api.ping()` lèverait une erreur TS dans le smoke spec.

#### 2.11.3 — `e2e/fixtures/electron.ts`

Helper partagé de lancement de l'application Electron buildée. Utilisé par tous les specs.

```ts
import { _electron, type ElectronApplication, type Page } from '@playwright/test';
import path from 'node:path';

const MAIN_ENTRY = path.resolve(process.cwd(), 'out/main/index.cjs');

/**
 * Lance l'application Electron buildée et retourne l'app + sa première fenêtre.
 *
 * Pré-requis :
 * - `npm run build` doit avoir été exécuté avant (sortie attendue dans `out/`).
 * - Le wrapper `scripts/e2e.mjs` (§3.10) neutralise ELECTRON_RUN_AS_NODE en amont.
 * - Playwright est lancé depuis la racine du projet (cas garanti par `npm run test:e2e` qui
 *   passe par le wrapper). `process.cwd()` est donc la racine, et `out/main/index.cjs` est
 *   accessible. Cf. piège §7.4 sur le choix de `process.cwd()` plutôt que `__dirname`.
 *
 * Toujours appeler `app.close()` en fin de test (ou via fixture afterEach) pour ne pas
 * laisser de processus Electron orphelin.
 *
 * Retour : `{ app, page }` — la propriété est nommée `page` (et non `window`) pour ne pas
 * masquer le `window` global du renderer dans les callbacks `page.evaluate(() => ...)`.
 * Cf. piège §7.5.
 */
export async function launchApp(): Promise<{ app: ElectronApplication; page: Page }> {
  const app = await _electron.launch({
    args: [MAIN_ENTRY],
    timeout: 30_000,
  });
  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  return { app, page };
}
```

Le chemin `out/main/index.cjs` suit la convention §2.6 (sortie CJS du main). Si une déviation projet impose un autre chemin, adapter la chaîne passée à `path.resolve` en conséquence (toujours en partant de `process.cwd()`).

#### 2.11.4 — `e2e/specs/smoke.spec.ts`

Premier spec versionné, équivalent e2e du smoke-test IPC du renderer (§3.5). Garantit qu'au bootstrap, l'app démarre, ouvre une fenêtre, et expose le pont IPC.

```ts
import { test, expect } from '@playwright/test';
import { launchApp } from '../fixtures/electron';

test('smoke — l\'app démarre et ouvre une fenêtre', async () => {
  const { app, page } = await launchApp();

  // La fenêtre a un titre non vide
  const title = await page.title();
  expect(title).toBeTruthy();

  // Le pont IPC est exposé : window.api est défini côté renderer
  const apiExposed = await page.evaluate(() => typeof window.api !== 'undefined');
  expect(apiExposed).toBe(true);

  // Le handler IPC `ping` répond `pong` (cf. §3.1, §3.2)
  const pong = await page.evaluate(() => window.api.ping());
  expect(pong).toBe('pong');

  await app.close();
});
```

Ce spec sert de canari : tant qu'il passe, la chaîne main + preload + renderer est saine. Un `npm run test:e2e` qui le casse signale qu'une régression de chargement (cf. pièges §7.1, §7.2, §7.3) est apparue.

À l'intérieur des callbacks `page.evaluate(() => ...)`, `window` désigne le `window` global du renderer (le DOM `Window`, augmenté par `src/shared/types/window.d.ts`). C'est la raison pour laquelle le helper retourne `{ app, page }` et non `{ app, window }` — cf. piège §7.5.

#### 2.11.5 — Ne pas exécuter `npx playwright install`

Le runner `_electron` n'utilise pas les binaires Chromium / Firefox / WebKit téléchargés par `playwright install`. Il pilote directement le binaire Electron du projet. Donc **ne pas** exécuter `npx playwright install` au bootstrap, et ne pas en mentionner la nécessité dans le résumé final de `/project-start`.

Si un projet ajoute plus tard des tests Playwright qui ciblent un vrai navigateur (cas non standard pour ce template), l'utilisateur devra alors lancer `npx playwright install` manuellement.

### 2.12 — Packaging electron-builder

Générer `electron-builder.yml` à la racine (préféré au champ `build` dans `package.json` pour la lisibilité). Contenu :

- `appId` : `com.mpdev42.{slug-du-projet}` — placer un placeholder explicite (chaîne `PLACEHOLDER-ORGANISATION` par exemple) et signaler dans le résumé final de `/project-start` qu'il doit être complété par l'utilisateur
- `productName` : `PROJECT_NAME`
- `directories.output` : `release/`
- `files` : `out/**`, `resources/**`, `package.json`
- Cible Windows uniquement (`nsis`) par défaut, sauf si `docs/project-description.md` déclare explicitement un déploiement multi-plateforme dans la section **Déploiement**

---

## 3. Fichiers de base à générer

### 3.1 — `src/main/index.ts`

Squelette du processus principal Electron, contenant :

- Import de `app`, `BrowserWindow`, `ipcMain` depuis `electron`
- Création d'une `BrowserWindow` avec `webPreferences` configurés ainsi : `preload` pointant vers le fichier preload buildé, `contextIsolation: true`, `nodeIntegration: false`, `sandbox: false` (nécessaire pour `contextBridge` avec preload ESM)
- Chargement du renderer : utiliser `process.env.ELECTRON_RENDERER_URL` en dev, sinon charger le `file://` du build
- Gestion des événements de cycle de vie : `ready`, `window-all-closed`, `activate` (pour macOS si déploiement multi-plateforme)
- Un handler IPC d'exemple : `ipcMain.handle('ping', () => 'pong')` pour démontrer le pattern et permettre une vérification immédiate de la chaîne IPC

### 3.2 — `src/preload/index.ts`

Pattern à respecter strictement :

- Utiliser `contextBridge.exposeInMainWorld('api', { ... })`
- Exposer une fonction par méthode IPC (ex : `ping: () => ipcRenderer.invoke('ping')`)
- Ne **jamais** exposer `ipcRenderer` brut au renderer
- Exporter le type de l'API à la fin du fichier via `export type Api = typeof api;` — ce type est consommé par `src/shared/types/window.d.ts` (cf. §3.3) pour augmenter le type global `Window.api`. Sans cet export, l'augmentation devrait dupliquer la signature de l'API, et toute évolution du preload demanderait une mise à jour manuelle du fichier `.d.ts`.

Squelette à reproduire :

```ts
import { contextBridge, ipcRenderer } from 'electron';

const api = {
  ping: (): Promise<string> => ipcRenderer.invoke('ping'),
};

contextBridge.exposeInMainWorld('api', api);

export type Api = typeof api;
```

**Ne jamais** placer un bloc `declare global { interface Window { api: ... } }` dans ce fichier. L'augmentation globale vit dans `src/shared/types/window.d.ts` (cf. §3.3). Justification : un `declare global` dans le preload n'est visible que dans les fichiers qui importent depuis le preload, ce qui n'est ni le cas du renderer (qui consomme `window.api` sans import) ni le cas des specs Playwright (qui ne touchent jamais aux fichiers preload). Le fichier `shared/types/window.d.ts` est inclus à la fois par le tsconfig du renderer et par celui de `e2e/` (cf. §2.11.2), donc l'augmentation y est visible des deux côtés.

### 3.3 — `src/shared/types/window.d.ts`

Augmentation globale du type `Window` côté renderer et côté tests e2e. Génère ce fichier dès qu'un preload est en place (cas standard du template).

```ts
import type { Api } from '../../preload';

declare global {
  interface Window {
    api: Api;
  }
}

export {};
```

Trois points à respecter strictement :

- **Pas de `src/preload/index.d.ts`** : ce fichier n'est pas généré. L'ancienne convention (où le `.d.ts` du preload portait le `declare global`) ne fonctionnait correctement que pour le renderer ; côté tests e2e, le fichier n'était pas inclus par le tsconfig de `e2e/` et `window.api` apparaissait alors comme `any` ou levait une erreur de type. La seule source de vérité de l'augmentation `Window.api` est ce fichier dans `src/shared/types/`.
- **`export {};` final** : sans cette ligne, TypeScript traite le fichier comme un script ambiant et le `declare global` peut être ignoré dans certaines configurations (notamment `moduleDetection: "force"`). L'`export {}` force le statut de module et garantit la prise en compte de l'augmentation.
- **Import via `import type`** : importer le type `Api` depuis `../../preload` (re-exporté en §3.2). Utiliser `import type` plutôt qu'un `import` runtime — le code preload ne doit jamais être chargé côté renderer ni dans les specs.

### 3.4 — `src/renderer/src/main.tsx`

Point d'entrée React standard : `ReactDOM.createRoot(document.getElementById('root')!).render(<App />)`.

Si Tailwind est présent dans la Stack, importer `./styles/index.css` en tête du fichier.

### 3.5 — `src/renderer/src/App.tsx`

Composant minimal :

- Titre `Hello {PROJECT_NAME}` (interpoler la valeur réelle)
- Un bouton qui appelle `window.api.ping()` au clic et affiche le résultat — ce bouton sert de smoke-test de la chaîne IPC dès le premier lancement
- Si Tailwind est présent : utiliser quelques classes utilitaires (ex : `flex`, `p-4`, `text-xl`) pour démontrer que le styling fonctionne

### 3.6 — `src/renderer/src/styles/index.css`

Trois variantes selon la Stack :

**Cas A — pas de Tailwind** : fichier vide avec un commentaire `/* Styles globaux */`.

**Cas B — Tailwind seul** :

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Cas C — Tailwind + shadcn** :

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Variables shadcn — placeholders neutres, à matérialiser via /design-system-adapt
       après dépôt de DESIGN.md. Format : HSL triplet sans wrapper hsl(). */
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

Ces valeurs neutres permettent au projet de builder et d'afficher les composants shadcn dès le bootstrap, sans attendre `DESIGN.md`. Quand `/design-system-adapt` s'exécute, ces blocs sont remplacés par les valeurs dérivées de la palette brand.

### 3.7 — `src/renderer/index.html`

Squelette HTML5 minimal avec une div `<div id="root"></div>` et un `<script type="module" src="/src/main.tsx">`. Charset UTF-8, viewport responsive.

### 3.8 — `src/shared/types/index.ts`

Fichier vide avec un commentaire `// Types partagés entre main et renderer`.

Le dossier `src/shared/types/` accueille aussi `window.d.ts` (cf. §3.3), qui porte l'augmentation globale `Window.api`. Les deux fichiers cohabitent sans interférence : `index.ts` est destiné aux types métier qu'on importe explicitement (`import type { Foo } from '@shared/types'`), tandis que `window.d.ts` est un module d'augmentation global qui n'est jamais importé.

### 3.9 — `scripts/dev.mjs`

À générer systématiquement dès que la Stack contient `electron`. C'est le wrapper référencé par l'exception du §2.1.

Si Dev Commands déclare une commande de dev différente de `electron-vite dev` (cas non standard), adapter la chaîne passée à `spawn`. Pour le cas standard (`electron-vite` dans la Stack), reprendre le contenu suivant tel quel — le commentaire d'en-tête fait partie de la valeur pédagogique du fichier et doit être conservé :

```js
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
```

### 3.10 — `scripts/e2e.mjs` (si Playwright dans la Stack)

À générer dès que `playwright` figure dans la Stack et que Dev Commands déclare `test:e2e`. C'est le wrapper référencé par §2.1 pour le script `test:e2e` du `package.json`.

Justification : Playwright lui-même tourne en pure Node, donc il ne crashe pas sur la fuite `ELECTRON_RUN_AS_NODE`. En revanche, les specs qui appellent `_electron.launch()` héritent de la variable et le binaire Electron lancé pour le test démarre alors en mode Node — le test crashe avant d'avoir ouvert la fenêtre. Le wrapper neutralise la variable une fois pour toutes au niveau du parent ; tous les sous-process (Playwright et les Electrons qu'il spawne) héritent de l'env nettoyé.

Le wrapper doit aussi forwarder les arguments CLI pour que les variantes (`--ui`, `--debug`, `--headed`, ou un chemin de spec ciblé) restent utilisables.

```js
/**
 * Wrapper Playwright e2e — neutralise ELECTRON_RUN_AS_NODE avant de lancer playwright test.
 *
 * Même contexte que scripts/dev.mjs (cf. §7.3) : VSCode pose ELECTRON_RUN_AS_NODE=1 dans
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
```

**Pré-requis runtime** : le wrapper suppose que `npm run build` a été exécuté avant. Playwright lance Electron contre `out/main/index.cjs` (cf. helper §2.11.3), donc une absence de build se traduit par un échec immédiat « ENOENT ». Mentionner ce pré-requis dans le résumé final de `/project-start` : « Pour lancer les tests e2e, exécuter `npm run build && npm run test:e2e` au moins la première fois. »

---

## 4. Fichiers utilitaires complémentaires

### 4.1 — Compléments au `.gitignore`

`/project-start` génère déjà un `.gitignore` standard à son étape 7. S'assurer que les patterns spécifiques à Electron y figurent. Si certains manquent, les ajouter :

```
out/
dist/
release/
*.log
.vite-cache/
node_modules/
```

Si `better-sqlite3` est dans la Stack, ajouter aussi :

```
*.db
*.db-journal
```

Si `playwright` est dans la Stack, ajouter aussi :

```
e2e/qa-runs/
test-results/
playwright-report/
```

`e2e/qa-runs/` accueille les specs jetables générés par la skill `/qa` (créé à la demande, non versionné). `test-results/` et `playwright-report/` sont les dossiers d'artefacts Playwright (screenshots d'échec, traces, rapport HTML).

### 4.2 — `README.md`

Ne pas générer ni regénérer. `/project-start` s'en charge à son étape 7.

---

## 5. Comportement face à la section Modules

Si `docs/project-description.md` déclare une section **Modules / Domaine** avec une ou plusieurs entités, créer pour chaque module deux dossiers vides :

- `src/main/ipc/{module-en-kebab-case}/`
- `src/renderer/src/services/{module-en-kebab-case}/`

Convention de slug : nom du module en minuscules, espaces remplacés par tirets. Exemples : `Service` → `service/` ; `Collaborateur` → `collaborateur/` ; `Bandeau saisonnier` → `bandeau-saisonnier/`.

Placer un fichier `.gitkeep` dans chaque dossier pour qu'ils soient versionnés malgré leur vacuité initiale.

**Aucun fichier de code applicatif** n'est généré dans ces dossiers. Ils sont prêts à être remplis par `feature-agent` (ou un autre agent adapté) lors du premier `/item-start` qui les concernera.

Si la section **Modules** est vide ou absente, ne créer aucun dossier de module ; `src/main/ipc/` et `src/renderer/src/services/` restent vides à ce stade.

---

## 6. Cas non gérés et procédure de fallback

Si la Stack déclarée contient une brique non listée dans la table 2.2 (exemples : un bundler autre qu'`electron-vite` comme Webpack ou esbuild en standalone, un ORM autre que `better-sqlite3` / `drizzle` / `prisma`, une UI library inattendue), `/project-start` doit :

1. **S'arrêter immédiatement** à l'étape 6, avant toute génération de fichier.
2. **Lister explicitement** les briques non reconnues, en citant le contenu exact de la section Stack telle qu'elle apparaît dans `docs/project-description.md`.
3. **Afficher** ce message à l'utilisateur :

   > La Stack contient des briques non gérées par `template-electron.md` :
   > - {liste des briques non reconnues}
   >
   > Choisis :
   > - `partiel` — générer le squelette de base sans intégrer ces briques (à intégrer manuellement après bootstrap)
   > - `corriger` — sortir de `/project-start`, modifier `docs/project-description.md`, puis relancer
   > - `annuler` — sortir de `/project-start`

4. **Attendre la réponse explicite** de l'utilisateur. Ne rien générer tant que la réponse n'est pas reçue.

Traitement de la réponse :

- `partiel` : générer le squelette en omettant les briques non reconnues. Lister à la fin du résumé final de `/project-start`, sous une rubrique « Briques non intégrées », l'ensemble des éléments laissés de côté avec un rappel explicite qu'ils sont à intégrer manuellement.
- `corriger` ou `annuler` : sortir de `/project-start` sans rien générer.

Les avertissements remontés par le template (rubriques "Briques non intégrées", "Avertissements") doivent apparaître clairement dans le résumé final de /project-start, sous des sections nommées.

---

## 7. Pièges connus et leur correction

Cette section capitalise les frictions rencontrées sur des projets réels bootstrappés depuis ce template. Format de chaque entrée : **symptôme observé → cause racine → fix de référence**. À enrichir au fil des projets : si une nouvelle friction apparaît, lancer `/investigate` pour identifier la cause, puis recopier la conclusion ici sous le même format.

### 7.1 — Démarrage : preload non chargé, `window.api` undefined

**Symptôme** — `npm run dev` produit en console les deux erreurs cumulées suivantes :

```
Unable to load preload script: .../out/preload/index.js
Uncaught TypeError: Cannot read properties of undefined (reading 'ping')
```

Le clic sur le bouton de smoke-test IPC dans `App.tsx` (§3.5) échoue.

**Cause racine** — `package.json` contient `"type": "module"`. Sans bloc `rollupOptions` explicite dans la section `preload` de `electron.vite.config.ts`, electron-vite émet `out/preload/index.mjs` (ESM). Or `src/main/index.ts` charge `../preload/index.js` (CJS). Le preload n'est jamais chargé, donc `contextBridge.exposeInMainWorld('api', …)` ne s'exécute jamais, donc `window.api` reste `undefined`. Les deux erreurs sont une cascade du même problème : mauvaise extension de sortie du preload.

**Fix** — Vérifier que `electron.vite.config.ts` contient bien le bloc `rollupOptions` de la section `preload` prescrit en §2.6 (`format: 'cjs'`, `entryFileNames: 'index.js'`). Si ce n'est pas le cas (template appliqué avant cette correction, ou config modifiée manuellement) :

1. Ajouter le bloc dans la section `preload`.
2. Supprimer le dossier `out/` pour forcer un rebuild propre.
3. Relancer `npm run dev`.

Aucune modification de `src/main/index.ts`, `src/preload/index.ts` ou `package.json` n'est nécessaire — le chemin `../preload/index.js` du main est correct, c'est la sortie du preload qui doit s'y conformer.

### 7.2 — Démarrage : main non chargé, erreur sur les imports d'Electron

**Symptôme** — `npm run dev` produit l'une des erreurs suivantes au lancement du processus principal :

```
SyntaxError: Cannot use import statement outside a module
```

ou

```
SyntaxError: The requested module 'electron' does not provide an export named 'app'
```

La fenêtre Electron ne s'ouvre pas.

**Cause racine** — `package.json` contient `"type": "module"`. Sans bloc `rollupOptions` explicite dans la section `main` de `electron.vite.config.ts`, deux scénarios cassent au runtime selon ce qu'electron-vite émet :

- Sortie CJS sous extension `.js` : Node 24 interprète le fichier comme ESM (à cause de `"type": "module"`) et rejette `require` / `module.exports`.
- Sortie ESM : les imports nommés depuis le module `electron` (distribué en CJS) échouent car l'interop named-imports-from-CJS de Node 24 ne reconnaît pas statiquement les exports d'Electron.

Dans les deux cas, le main ne démarre pas.

**Fix** — Vérifier que `electron.vite.config.ts` contient bien le bloc `rollupOptions` prescrit en §2.6 pour la section `main` (`format: 'cjs'`, `entryFileNames: 'index.cjs'`) et que `package.json` pointe `"main": "out/main/index.cjs"`. Si ce n'est pas le cas (template appliqué avant cette correction, ou config modifiée manuellement) :

1. Ajouter le bloc dans la section `main` de `electron.vite.config.ts`.
2. Mettre à jour le champ `"main"` dans `package.json` pour pointer `out/main/index.cjs`.
3. Supprimer le dossier `out/` pour forcer un rebuild propre.
4. Relancer `npm run dev`.

Aucune modification de `src/main/index.ts` n'est nécessaire — c'est l'extension de sortie et l'entrée du `package.json` qui doivent s'aligner.

### 7.3 — Démarrage : `npm run dev` plante avec `app.requestSingleInstanceLock is not a function` (ou symptôme équivalent sur un autre membre de l'API Electron)

**Symptôme** — Au lancement de `npm run dev` depuis un terminal hébergé par VSCode, Cursor, Claude Code ou tout autre outil basé sur Electron, le processus principal crashe immédiatement avec une erreur du type :

```
TypeError: electron.app.requestSingleInstanceLock is not a function
```

ou un autre `TypeError` sur un membre de `electron.app` / `electron.BrowserWindow`. Le crash se produit avant l'ouverture de la fenêtre. Aucun problème depuis un terminal Windows natif (`cmd`, PowerShell, Windows Terminal hors VSCode).

**Cause racine** — Les terminaux hébergés par un parent Electron héritent de la variable d'environnement `ELECTRON_RUN_AS_NODE=1`, posée par le parent pour faire tourner ses propres extensions / sous-process via le binaire Electron embarqué. Quand le `npm run dev` du projet lance à son tour Electron, le binaire détecte cette variable et démarre en mode Node pur : `require('electron')` retourne alors le chemin du binaire (une chaîne) au lieu de l'objet API. Le premier accès à `electron.app.*` lève le `TypeError`.

Cette fuite est documentée côté VSCode comme bug upstream depuis 2020 ([microsoft/vscode#137510](https://github.com/microsoft/vscode/issues/137510), [#113687](https://github.com/microsoft/vscode/issues/113687)) et n'a pas vocation à disparaître côté outils. La défense est donc côté projet.

**Fix** — Le wrapper `scripts/dev.mjs` (§3.9) supprime la variable de `process.env` avant de spawner `electron-vite`, et le `package.json` pointe `"dev": "node scripts/dev.mjs"` (§2.1). Si un projet a été bootstrappé avant cette correction (template antérieur, ou wrapper supprimé) :

1. Créer `scripts/dev.mjs` avec le contenu prescrit en §3.9.
2. Remplacer `"dev": "electron-vite dev"` par `"dev": "node scripts/dev.mjs"` dans `package.json`.
3. Relancer `npm run dev`.

**Piège classique à éviter** — Le réflexe naturel est d'utiliser `cross-env ELECTRON_RUN_AS_NODE= electron-vite dev`. Cela **ne fonctionne pas** sur Electron 41+ : le binaire teste `process.env.ELECTRON_RUN_AS_NODE !== undefined`, donc la chaîne vide active aussi le mode Node. Seul `delete process.env.ELECTRON_RUN_AS_NODE` (ou un `unset` shell équivalent avant le lancement) neutralise effectivement la variable. C'est la raison pour laquelle on passe par un wrapper Node plutôt que par `cross-env` ou une syntaxe inline.

**Pattern à reproduire pour d'autres scripts Electron-GUI** — Tout futur script qui spawne Electron en mode GUI (Playwright e2e qui relance l'app, packagers post-build qui lancent un smoke-test, sub-process IPC dans un test) est soumis à la même fuite et doit appliquer le même pattern : `delete process.env.ELECTRON_RUN_AS_NODE` dans un wrapper Node avant le `spawn`. Si plus de deux scripts de ce type apparaissent, factoriser le sanitize dans un `scripts/electron-launcher.mjs` partagé.

### 7.4 — Playwright : `__dirname` ou `import.meta.url` cassent la résolution de chemin dans les fixtures et specs

**Symptôme** — Au lancement de `npm run test:e2e`, le helper `e2e/fixtures/electron.ts` ou un spec qui calcule un chemin via `__dirname` ou `import.meta.url` lève une erreur du type `ReferenceError: __dirname is not defined` ou `SyntaxError: Cannot use 'import.meta' outside a module`. Le test échoue avant même que `_electron.launch()` soit appelé.

**Cause racine** — Playwright transforme les fichiers `.ts` du dossier de tests via son propre transformer interne (basé sur Babel/SWC selon les versions). Ce transformer ne reproduit pas fidèlement la sémantique CommonJS ni la sémantique ESM module : selon la combinaison `package.json#type` + `tsconfig.module` + version de `@playwright/test`, soit `__dirname` n'est pas injecté (sortie ESM-like sans le shim), soit `import.meta.url` n'est pas reconnu (sortie CJS-like). Le résultat est instable d'une version à l'autre, et un projet qui marchait peut casser après un `npm update`.

**Fix** — Calculer les chemins absolus à partir de `process.cwd()` plutôt que depuis le fichier courant :

```ts
// Au lieu de :
const MAIN_ENTRY = path.resolve(__dirname, '../../out/main/index.cjs');

// Écrire :
const MAIN_ENTRY = path.resolve(process.cwd(), 'out/main/index.cjs');
```

`process.cwd()` est stable : Playwright est lancé via `npm run test:e2e` depuis la racine du projet (cf. wrapper §3.10), donc `process.cwd()` est toujours la racine. Le helper §2.11.3 applique cette convention par défaut.

**Limitation** — Si Playwright est lancé depuis un autre répertoire (cas non standard, par exemple `cd e2e && npx playwright test`), `process.cwd()` change et la résolution casse. Documenter dans le `README.md` du projet que les e2e se lancent uniquement depuis la racine via `npm run test:e2e`.

### 7.5 — Tests Playwright : `window` shadowed dans les callbacks `page.evaluate`

**Symptôme** — Un spec qui destructure le retour de `launchApp()` en `{ app, window }` et utilise ensuite `window.evaluate(() => window.api.ping())` voit le second `window` résoudre vers la `Page` Playwright (la variable locale) au lieu du `window` global du DOM. TypeScript signale `Property 'api' does not exist on type 'Page'`, et au runtime l'`evaluate` lève une erreur de sérialisation puisqu'il tente de sérialiser la `Page` dans le contexte du renderer.

**Cause racine** — JavaScript résout les identifiants par chaîne de portée. Dans le callback de `evaluate`, le moteur cherche `window` d'abord dans la closure du test, où la destructuration `{ app, window }` a posé une variable locale qui shadow le `window` global du renderer. Le callback étant sérialisé puis exécuté dans le contexte du renderer, le `window` capturé n'est pas du tout celui qu'on attend.

**Fix** — Le helper §2.11.3 retourne `{ app, page }` (et non `{ app, window }`). Tous les specs doivent destructurer en `{ app, page }`. Dans les callbacks `page.evaluate(() => ...)`, `window` désigne alors le `window` global du renderer, augmenté par `src/shared/types/window.d.ts` (§3.3) — la propriété `window.api` est typée et accessible.

**Pattern à reproduire** — Tout helper Playwright qui retourne une fenêtre / page doit la nommer `page` ou un nom non-DOM. N'utiliser `window` comme nom de variable que pour désigner explicitement le `window` du renderer dans un callback `evaluate`.