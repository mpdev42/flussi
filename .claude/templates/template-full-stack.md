# template-full-stack.md — Bootstrap d'un monorepo web fullstack

## Préambule

Ce template est lu par `/project-start` à son étape 6 (Bootstrap du squelette projet). Il décrit comment
générer le squelette d'un projet de type `full-stack` : un **monorepo pnpm + Turborepo** avec un front
**React 19 + Vite** (`apps/web`), un back **Fastify + TypeScript** (`apps/api`), un package de contrats
partagés **Zod + types** (`packages/contracts`), un ORM **Prisma** (schéma multi-fichiers `prisma/schema/`
à la racine) sur **PostgreSQL**, et **shadcn/ui + Tailwind** côté front.

Avant toute génération, lire les sections suivantes de `docs/project-description.md` :

- **Stack** — détermine les paquets à inclure et les fichiers de config à créer.
- **Architecture** — peut imposer des couches/dossiers additionnels sous `apps/api/src/`.
- **Dev Commands** — les scripts des `package.json` doivent en être la **copie exacte** (par package).
- **Modules / Domaine** — pour un projet à CRUD intensif, les entités sont décrites dans
  `scaffold/csv/` et **générées par le scaffolder**, pas créées ici (voir §5).
- **Design** — si une référence à `DESIGN.md` / `design/patterns/` existe, ne rien y toucher.

### Alignement obligatoire avec le scaffolder de la stack

Ce template est le **pendant squelette** du scaffolder `react-fastify-prisma-postgres-shadcn`. Le
scaffolder écrit son code CRUD (`.base`) et installe son **runtime-kit** dans le squelette produit ici.
**Le contrat de structure est le `README.md §Installation` du scaffolder** (dans deneb :
`scaffolders/react-fastify-prisma-postgres-shadcn/`) et son `scaffolder.yaml` (mapping `artifacts`,
`aliases`). Toute déviation de structure (dossiers, alias) casse la compilation du code généré.

### Frontière template / runtime-kit / scaffolder — **à respecter strictement**

Trois acteurs écrivent dans le projet. Ne pas empiéter :

| Acteur | Quand | Écrit |
|---|---|---|
| **Ce template** (`/project-start` ét. 6) | au bootstrap | monorepo, configs, points d'entrée légers, stubs de contrats — **rien d'autre** |
| **Runtime-kit** (1er `/scaffold`, créé-une-fois) | après bootstrap | `apps/api/src/server.ts`, `apps/api/src/db/`, `apps/api/src/shared/`, `apps/web/src/App.tsx`, `apps/web/src/lib/`, `apps/web/src/components/` (dont `ui/`) ; *en bi-source : `apps/api/src/shared/erp/erp.client.ts`* |
| **Scaffolder** (chaque `/scaffold`) | après bootstrap | les `*.base.*` par entité + les agrégateurs (`app.base.ts`/`app.ts`, `routes.base.tsx`/`routes.tsx`, `api-registry.base.ts`/`.ts`, `sidebar-links.base.ts`/`.ts`, `prisma/schema/_config.base.prisma`/`_custom.prisma`) ; *en bi-source, la persistance par entité = `{e}.repository.port.base.ts` + `{e}.repository.postgres.base.ts` (générés) + `{e}.repository.erp.ts` (custom), plus l'agrégateur `repository-factory.base.ts`/`.ts`* |

> **Règle d'or (piège §7.1)** : le runtime-kit s'installe en **créé-une-fois** — il n'écrit un fichier
> que s'il est **absent**. Si ce template crée un fichier listé dans la ligne « runtime-kit » ci-dessus,
> la vraie version du runtime-kit sera **silencieusement ignorée** et l'app ne marchera pas. **Ne jamais
> générer ces fichiers ici.** De même, ne jamais générer les agrégateurs ni leurs compagnons (territoire
> scaffolder).

### Conséquence : l'app devient exécutable **après le premier `/scaffold`**

Tant qu'aucune entité n'est scaffoldée, `apps/api` n'a pas de `server.ts` et `apps/web` n'a pas de
`App.tsx` (ils arrivent avec le runtime-kit au 1er `/scaffold`). C'est **normal** : un projet à CRUD
intensif n'a rien à exécuter avant d'avoir scaffoldé sa première entité. Le smoke-test de
`/project-start` (étape 9) se limite donc à : `pnpm install`, `prisma generate`, et `tsc` du package
`contracts`. Le build/exécution complet (api + web) est à faire **après** le premier `/scaffold`. Ce
template doit le signaler dans le résumé final de `/project-start`.

Si la Stack déclarée contient une brique inhabituelle non reconnue, **ne rien générer** et appliquer la
procédure de la section 6.

---

## 1. Structure de dossiers à générer

```
apps/
  api/
    src/
      modules/          # rempli par le scaffolder ({e}.service.base.ts, {e}.routes.base.ts, …)
  web/
    src/
      pages/            # pages générées par le scaffolder
      features/         # écrans générés par le scaffolder
      entities/         # client API généré + registre
      app/              # routing généré
      components/nav/   # navigation générée
      main.tsx          # CRÉÉ ICI (cf. §3)
      index.css         # CRÉÉ ICI (cf. §3)
    index.html          # CRÉÉ ICI
packages/
  contracts/
    src/
      index.ts          # CRÉÉ ICI (cf. §3)
prisma/
  schema/
    .gitkeep            # dossier prêt ; _config.base.prisma + {e}.base.prisma GÉNÉRÉS par /scaffold
```

Ne **pas** créer `apps/api/src/server.ts`, `apps/api/src/db/`, `apps/api/src/shared/`,
`apps/web/src/App.tsx`, `apps/web/src/lib/`, `apps/web/src/components/` : ce sont des fichiers du
runtime-kit (cf. Préambule). Les dossiers `modules/`, `pages/`, `features/`, `entities/`, `app/`,
`components/nav/` peuvent rester absents — le scaffolder les crée au besoin.

### Adaptations conditionnelles

- Si la section **Architecture** déclare des couches métier additionnelles côté API (jobs, events,
  intégrations), créer les dossiers correspondants sous `apps/api/src/`.
- **Exception scaffolder (si `scaffold/` est prévu/présent)** : ne **pas** matérialiser les dossiers de
  **persistance d'une entité scaffoldée** — `modules/{e}/`, repositories (port / impl postgres / impl
  erp), la **factory de repositories** (`modules/repository-factory.base.ts`/`.ts`) et `shared/erp/` —
  **même si la section Architecture les dessine**. Ils relèvent du **scaffolder / runtime-kit** (cf.
  frontière du Préambule, piège §7.1). Pour un projet scaffoldé, l'Architecture **décrit** ce layout (le
  scaffolder en **fait foi**) ; elle ne le **prescrit** pas au template. Seules les couches **hors
  entités** (jobs, events, intégrations, auth custom) donnent lieu à des dossiers créés ici.
- Si `design/patterns/` ou `DESIGN.md` existent déjà, ne pas y toucher ; les mentionner dans le résumé
  final de `/project-start`.

---

## 2. Fichiers de configuration à générer

### 2.1 — Racine du monorepo

**`pnpm-workspace.yaml`** :

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

**`package.json` (racine)** — `private: true`, `name` = slug du `PROJECT_NAME`, `version: "0.1.0"`,
`packageManager: "pnpm@latest"`. Scripts : reprendre la section **Dev Commands** ; à défaut, fournir un
socle via Turborepo et Prisma :

```json
{
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "typecheck": "turbo run typecheck",
    "lint": "turbo run lint",
    "db:generate": "prisma generate --schema ./prisma/schema",
    "db:migrate": "prisma migrate dev --schema ./prisma/schema"
  },
  "prisma": { "schema": "prisma/schema" },
  "devDependencies": {
    "turbo": "latest",
    "prisma": "latest",
    "typescript": "latest",
    "@types/node": "latest"
  }
}
```

> `prisma.schema = "prisma/schema"` + le flag `--schema ./prisma/schema` ciblent le **schéma
> multi-fichiers** que Prisma fusionne (Prisma 6+ supporte nativement les dossiers de schéma). Voir
> piège §7.3.

La génération CRUD elle-même se lance via `/scaffold` (qui exécute le `generateCommand` du scaffolder
copié dans `scaffold/`) — ce template n'a pas à posséder de script `scaffold`.

**`turbo.json`** :

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "dev": { "cache": false, "persistent": true },
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "typecheck": { "dependsOn": ["^build"] },
    "lint": {}
  }
}
```

**`tsconfig.base.json` (racine)** — base partagée, étendue par chaque package :

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "paths": {
      "@contracts/*": ["packages/contracts/src/*"]
    },
    "baseUrl": "."
  }
}
```

**`.env.example`** (et rappeler de copier en `.env`) :

```
# PostgreSQL — utilisé par Prisma (prisma/schema/_config.base.prisma généré)
DATABASE_URL="postgresql://user:password@localhost:5432/{slug}?schema=public"
# Port du serveur Fastify (défaut 3000 ; le proxy Vite y pointe)
PORT=3000
```

> **Si bi-source** (le projet déclare `scaffold/config.json` = `{ "sources": ["postgres", "erp"] }`,
> cf. §5.1) — ajouter au `.env.example` :
>
> ```
> # Source de données active à l'exécution : postgres | erp (défaut postgres).
> # Abandonner l'ERP = repasser à postgres SANS changer de code.
> DATA_SOURCE=postgres
> # ERP_BASE_URL=https://erp.exemple.fr/api
> # ERP_AUTH_TOKEN=
> ```
>
> En mono-source (défaut), ne **pas** ajouter ce bloc : le `.env.example` reste DATABASE_URL + PORT.

### 2.2 — `packages/contracts`

**`packages/contracts/package.json`** : `name: "@app/contracts"`, `version: "0.1.0"`, `type: "module"`,
`main`/`types` pointant `src/index.ts`. Dépendance : `zod` (`latest`). DevDeps : `typescript`.
Script `typecheck: "tsc --noEmit"`.

**`packages/contracts/tsconfig.json`** :

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "rootDir": "src", "paths": { "@contracts/*": ["src/*"] } },
  "include": ["src"]
}
```

### 2.3 — `apps/api`

**`apps/api/package.json`** : `name: "@app/api"`, `type: "module"`. Dépendances : `fastify`,
`@prisma/client`, `zod`, `@app/contracts: "workspace:*"`. DevDeps : `typescript`, `tsx`, `@types/node`,
`prisma`. Scripts (copie exacte de Dev Commands sinon) : `dev: "tsx watch src/server.ts"`,
`build: "tsc"`, `start: "node dist/server.js"`, `typecheck: "tsc --noEmit"`.

> Le `dev` cible `src/server.ts`, fourni par le **runtime-kit** au 1er `/scaffold`. Avant cela, le
> dossier est quasi vide — c'est attendu (cf. Préambule).

**`apps/api/tsconfig.json`** :

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "paths": {
      "@/*": ["src/*"],
      "@contracts/*": ["../../packages/contracts/src/*"]
    }
  },
  "include": ["src"]
}
```

### 2.4 — `apps/web`

**`apps/web/package.json`** : `name: "@app/web"`, `type: "module"`. Dépendances : `react`, `react-dom`,
`react-router-dom`, `react-hook-form`, `@hookform/resolvers`, `zod`, `clsx`, `tailwind-merge`,
`lucide-react`, `@app/contracts: "workspace:*"`. DevDeps : `vite`, `@vitejs/plugin-react`, `typescript`,
`@types/react`, `@types/react-dom`, `tailwindcss`, `postcss`, `autoprefixer`, `tailwindcss-animate`.
Scripts : `dev: "vite"`, `build: "tsc -b && vite build"`, `preview: "vite preview"`,
`typecheck: "tsc --noEmit"`.

**`apps/web/tsconfig.json`** :

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "paths": {
      "@/*": ["src/*"],
      "@contracts/*": ["../../packages/contracts/src/*"]
    }
  },
  "include": ["src"]
}
```

**`apps/web/vite.config.ts`** — alias **et** proxy `/api` vers Fastify (évite tout CORS en dev) :

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@contracts': path.resolve(__dirname, '../../packages/contracts/src'),
    },
  },
  server: {
    proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } },
  },
});
```

**`apps/web/components.json`, `tailwind.config.js`, `postcss.config.js`** — réutiliser tels quels les
blocs shadcn/Tailwind de `template-electron.md` (§2.5 `components.json` avec `"tsx": true`, alias
`@/components`, `@/lib/utils` ; §2.9 cas B `tailwind.config.js` + `tailwindcss-animate`), en adaptant les
chemins à `apps/web` : `tailwind.config.js` `content: ['./index.html', './src/**/*.{ts,tsx}']`,
`components.json` `tailwind.css = "src/index.css"`. Le helper `cn` (`@/lib/utils`) est fourni par le
**runtime-kit** — ne pas le créer ici (cf. §3 et piège §7.1).

### 2.5 — Table de dérivation Stack → paquets

Pour chaque brique de Stack, ajouter les paquets dans le package.json approprié :

| Brique | Paquets | Package cible |
|---|---|---|
| `react` + `vite` | `react`, `react-dom` (deps) / `vite`, `@vitejs/plugin-react`, `@types/react`, `@types/react-dom` (devDeps) | `apps/web` |
| `react-router` | `react-router-dom` (dep) | `apps/web` |
| `react-hook-form` | `react-hook-form`, `@hookform/resolvers` (deps) | `apps/web` |
| `tailwindcss` | `tailwindcss`, `postcss`, `autoprefixer`, `tailwindcss-animate` (devDeps) | `apps/web` |
| `shadcn/ui` | `clsx`, `tailwind-merge`, `lucide-react` (deps) — composants posés par le runtime-kit ; CLI `npx shadcn add` **après** 1er scaffold | `apps/web` |
| `fastify` | `fastify` (dep) | `apps/api` |
| `prisma` | `@prisma/client` (dep, app) ; `prisma` (devDep, racine + app) | `apps/api` + racine |
| `zod` | `zod` (dep) | `packages/contracts` (source unique) + `apps/api` + `apps/web` |
| `turborepo` | `turbo` (devDep) | racine |
| `vitest` | `vitest`, `@vitest/ui` ; `jsdom` si tests de composants React | `apps/web` / `apps/api` |
| `eslint` / `prettier` | mêmes paquets que `template-electron.md` §2.8 | racine ou par package |

### 2.6 — Versions et avertissements

- Versions en `"latest"` (jamais figées) ; `pnpm install` résout, `pnpm-lock.yaml` fige (cf.
  `template-electron.md` §2.3).
- **Avertissements à remonter dans le résumé final de `/project-start`** :
  - `pnpm install` à exécuter à la racine.
  - PostgreSQL requis + `.env` (DATABASE_URL) à renseigner, puis `pnpm db:generate` (et
    `pnpm db:migrate` après le 1er `/scaffold`, quand des modèles existent).
  - **api + web ne se buildent/lancent qu'après le 1er `/scaffold`** (runtime-kit installé alors).
  - Si projet à CRUD : enchaîner `/scaffolder-resolve` (étape 6 bis) → remplir `scaffold/csv/` →
    `/scaffold`.

---

## 3. Fichiers de base à générer

Seulement les points d'entrée légers et les stubs — **jamais** les fichiers runtime-kit/scaffolder.

### 3.1 — `apps/web/index.html`
HTML5 minimal : `<div id="root"></div>` + `<script type="module" src="/src/main.tsx">`. Charset UTF-8,
viewport responsive, `<title>{PROJECT_NAME}</title>`.

### 3.2 — `apps/web/src/main.tsx`
Point d'entrée React. Importe `App` depuis `@/App` (fourni par le runtime-kit au 1er `/scaffold`) :

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import '@/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

### 3.3 — `apps/web/src/index.css`
Reprendre le **cas C (Tailwind + shadcn)** de `template-electron.md` §3.6 (directives `@tailwind` +
variables shadcn neutres `:root`/`.dark` + `@layer base`). Ces valeurs neutres seront remplacées par
`/design-system-adapt` après dépôt de `DESIGN.md`.

### 3.4 — `packages/contracts/src/index.ts`
Barrel des contrats partagés. Le scaffolder écrit les contrats par entité dans
`packages/contracts/src/{e}/` ; ce barrel peut démarrer avec un commentaire et sera étendu au besoin :

```ts
// Contrats partagés client/serveur (types + schémas Zod). Étendu par entité via le scaffolder.
export {};
```

### 3.5 — `prisma/schema/.gitkeep`
Crée le dossier `prisma/schema/` (vide, versionné). `_config.base.prisma` (datasource PostgreSQL +
generator) et `{e}.base.prisma` y sont **générés** par `/scaffold` ; `_custom.prisma` (créé une fois)
accueille les modèles hors scaffolder.

### Ne PAS générer (rappel)
`apps/api/src/server.ts`, `apps/api/src/db/client.ts`, `apps/api/src/shared/*`, `apps/web/src/App.tsx`,
`apps/web/src/lib/*`, `apps/web/src/components/*` (runtime-kit) ; ni `app.base.ts`/`app.ts`,
`routes.base.tsx`/`routes.tsx`, `api-registry.base.ts`/`.ts`, `sidebar-links.base.ts`/`.ts`,
`_config.base.prisma`/`_custom.prisma` (scaffolder). En **bi-source**, ne pas créer non plus
`modules/repository-factory.base.ts`/`.ts`, `{e}/{e}.repository.*` ni `shared/erp/*` (territoire
scaffolder/runtime-kit ; piège §7.1).

---

## 4. Compléments au `.gitignore`

`/project-start` génère un `.gitignore` de base. S'assurer que ces patterns y figurent :

```
node_modules/
dist/
.turbo/
*.log
.env
# Prisma : client généré (si output local)
**/generated/
```

`scaffold/` n'est **pas** ignoré (il est versionné — signal d'activation et source des CSV).

---

## 5. Comportement face à la section Modules

Dans un projet à **CRUD intensif** consommant le scaffolder, les entités/modules ne sont **pas**
matérialisés par ce template : elles sont décrites dans `scaffold/csv/` (`entities.csv`, `fields.csv`,
`validations.csv`, `relations.csv`) et **générées par `/scaffold`** (persistance, service, transport,
écrans, pages, agrégateurs). Ce template ne crée donc **aucun dossier par module** sous `apps/`.

Pour de la logique hors CRUD (auth, jobs, dashboards), les fichiers compagnons custom (`app.ts`,
`routes.tsx`, `api-registry.ts`, `sidebar-links.ts`) — créés une fois par le scaffolder — sont les
points d'extension. Ce template ne les crée pas non plus.

Si le projet **n'utilise pas** de scaffolder (full-stack sans CRUD intensif), créer pour chaque module
déclaré un dossier vide `apps/api/src/modules/{kebab}/` et `apps/web/src/features/{kebab}/` avec
`.gitkeep`, à remplir par `feature-agent`.

### 5.1 — Mode de persistance bi-source (optionnel)

Le scaffolder `react-fastify-prisma-postgres-shadcn` (≥ 1.1.0) sait produire une persistance **bi-source**
(PostgreSQL **ou** ERP REST, basculés globalement par `DATA_SOURCE`). C'est un **mode opt-in** déclaré
côté projet par le fichier **`scaffold/config.json`** = `{ "sources": ["postgres", "erp"] }` (absent ou
`["postgres"]` ⇒ mono-source, défaut). Le scaffolder génère alors, par entité, un port CRUD, son impl
PostgreSQL (générés) et un **squelette d'impl ERP créé une fois** (à compléter par l'`erp-adapter`), plus
une factory pilotée par `DATA_SOURCE`.

Côté **template**, ce mode ne change que le `.env.example` (bloc `DATA_SOURCE` / `ERP_*`, cf. §2.1) :
toute la persistance reste **territoire scaffolder/runtime-kit** (rien à générer ici). **En mono-source
(défaut), la sortie du template est strictement identique** — n'ajouter le bloc `.env` bi-source que si
`scaffold/config.json` déclare `erp`. Garantie d'abandon : repasser à `DATA_SOURCE=postgres` rétablit
tout sans toucher au code.

---

## 6. Cas non gérés et procédure de fallback

Si la Stack contient une brique non listée en §2.5 (autre ORM que Prisma, autre méta-framework que
React+Vite/Fastify, autre transport que HTTP, etc.), `/project-start` doit :

1. **S'arrêter immédiatement** à l'étape 6, avant toute génération.
2. **Lister** les briques non reconnues (texte exact de la section Stack).
3. **Afficher** :

   > La Stack contient des briques non gérées par `template-full-stack.md` :
   > - {liste}
   >
   > Choisis : `partiel` (générer le squelette sans ces briques), `corriger` (sortir, modifier
   > `docs/project-description.md`, relancer), ou `annuler`.

4. **Attendre** la réponse. `partiel` → générer en omettant + lister les éléments laissés de côté dans
   le résumé final ; `corriger`/`annuler` → sortir sans rien générer.

**Cas particulier — pas de scaffolder pour cette stack** : si aucun scaffolder ne matche la stack dans
le catalogue deneb, ce template reste utilisable pour produire le squelette monorepo, mais l'app ne sera
pas peuplée par génération CRUD. Le signaler : envisager `/scaffolder-bootstrap` si du CRUD intensif est
prévu.

---

## 7. Pièges connus et leur correction

Format : **symptôme → cause racine → fix**. À enrichir au fil des projets (via `/investigate`).

### 7.1 — Le runtime-kit n'est pas installé (App.tsx/server.ts manquants ou figés)

**Symptôme** — après le 1er `/scaffold`, `apps/web/src/App.tsx` ou `apps/api/src/server.ts` n'a pas le
contenu attendu du runtime-kit (ou un import du runtime-kit reste introuvable).

**Cause racine** — le template (ou une main trop zélée) a **pré-créé** un fichier appartenant au
runtime-kit. L'installateur du runtime-kit écrit en **créé-une-fois** (n'écrit que si le fichier est
absent), donc un fichier préexistant **bloque** l'installation de la vraie version.

**Fix** — ne jamais générer, depuis ce template, les fichiers de la ligne « runtime-kit » du Préambule.
Si l'erreur est survenue : supprimer le(s) fichier(s) fautif(s) puis relancer `/scaffold` (idempotent),
qui réinstalle alors la version runtime-kit.

### 7.2 — Imports `@/…` ou `@contracts/…` non résolus

**Symptôme** — `tsc` ou `vite build` échoue sur `Cannot find module '@/…'` ou `'@contracts/…'`.

**Cause racine** — l'alias doit être déclaré **à la fois** côté TypeScript (`paths` du `tsconfig` du
package) **et** côté bundler (alias `vite.config.ts` pour le web ; `tsx`/`tsc` suffit côté api via les
`paths`). Une seule des deux déclarations ne suffit pas.

**Fix** — vérifier que `apps/web/tsconfig.json` **et** `apps/web/vite.config.ts` déclarent `@` et
`@contracts` (cf. §2.4), et que `apps/api/tsconfig.json` déclare `@` et `@contracts` (cf. §2.3). Si une
config Vitest est ajoutée, y répliquer les alias.

### 7.3 — Prisma ne voit pas le schéma multi-fichiers

**Symptôme** — `prisma generate` se plaint d'un schéma introuvable ou ne fusionne pas les `*.prisma` de
`prisma/schema/`.

**Cause racine** — Prisma cherche par défaut `prisma/schema.prisma` (fichier unique). Le scaffolder
produit un **dossier** `prisma/schema/` (multi-fichiers).

**Fix** — pointer explicitement le dossier : `prisma.schema = "prisma/schema"` dans le `package.json`
racine **et** flag `--schema ./prisma/schema` sur les commandes (cf. §2.1). Sur une version de Prisma
antérieure à la GA des dossiers de schéma, activer le preview `prismaSchemaFolder`.

### 7.4 — En dev, le front n'atteint pas l'API (404 sur /api)

**Symptôme** — les appels du client (`/api/...`) renvoient 404 ou des erreurs CORS en `pnpm dev`.

**Cause racine** — le proxy Vite n'est pas configuré, ou le serveur Fastify n'écoute pas sur le port
attendu. Le runtime-kit enregistre les modules sous le préfixe `/api` et écoute sur `PORT ?? 3000`.

**Fix** — vérifier le bloc `server.proxy` de `vite.config.ts` (cible `http://localhost:3000`, cf. §2.4)
et que `PORT` (`.env`) est cohérent. Lancer l'API (`pnpm --filter @app/api dev`) avant le front.
