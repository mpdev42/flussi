# /project-start — Bootstrap d'un nouveau projet

Pas d'argument — la skill lit toujours `docs/project-description.md` dans le répertoire courant.

---

Tu vas bootstrapper un nouveau projet à partir de sa description. Suis ces étapes dans l'ordre.

## Étape 1 — Lire et valider la description

Lis `docs/project-description.md` dans le répertoire courant.

Si le fichier est absent, arrête-toi et affiche :

> "Le fichier `docs/project-description.md` est introuvable. Crée-le en copiant le template `project-description-template.md` et en le remplissant, puis relance `/project-start`."

Vérifie que les sections obligatoires sont présentes : **Type**, **Déploiement**, **Stack**, **Dev Commands**, **Architecture**.

Si des sections manquent, liste-les et attends que l'utilisateur complète le fichier avant de continuer.

Extrais et mémorise :
- `PROJECT_NAME` — depuis le titre `# Project: ...`
- `PROJECT_TYPE` — `electron` | `tauri` | `nextjs` | `react-spa` | `node-api` | `full-stack` | `other`
- `PROJECT_DEPLOYMENT` — `desktop` | `web` | `serveur` | `cli` | `desktop+serveur` | combinaison
- `STACK` — tableau Layer/Technology complet
- `ARCHITECTURE` — description des couches
- `MODES` — tableau des modes de fonctionnement (optionnel, vide si absent)
- `EXTERNAL_SERVICES` — tableau des services externes (optionnel, vide si absent)
- `ENV_VARS` — liste des variables d'environnement (optionnel, vide si absent)
- `DEV_COMMANDS` — les commandes bash déclarées
- `CONVENTIONS` — langue code, langue interface, nommage, principes
- `MODULES` — liste des modules/entités
- `AGENTS` — liste des agents standards à inclure
- `EXTRA_AGENTS` — liste des agents additionnels déclarés (optionnel, vide si absent)
- `DESIGN` — outil, état et chemin du handoff bundle (optionnel, vide si absent)
- `ROADMAP` — liste des versions et leurs items depuis la section Roadmap initiale (optionnel, vide si absent)
- `BACKLOG` — liste des améliorations, bugs et questions ouvertes (optionnel, vide si absent)
- `NOTES` — contexte supplémentaire

## Étape 2 — Générer CLAUDE.md

Crée `CLAUDE.md` à la racine du projet. Le fichier doit être la référence complète pour Claude Code dans ce projet. Structure exacte :

```markdown
# CLAUDE.md — Référence pour sessions IA

Projet **{PROJECT_NAME}** — {description courte issue de la description}

> La roadmap est dans `docs/roadmap.md`. Le backlog est dans `docs/backlog.md`.
> Ne jamais créer un nouveau fichier de notes — tout centraliser dans ces deux fichiers.

---

## Stack technique

{tableau Stack depuis la description}

---

## Architecture

{architecture depuis la description}

---

## Modes de fonctionnement

{tableau des modes depuis la description — omettre cette section si MODES est vide}

---

## Services externes

{tableau des services externes depuis la description — omettre cette section si EXTERNAL_SERVICES est vide}

---

## Variables d'environnement

{liste des variables depuis la description — omettre cette section si ENV_VARS est vide}

---

## Structure des dossiers

{structure à adapter selon le type de projet, le déploiement et les modules déclarés}

{Si ARCHITECTURE contient des couches métier explicites (services, domaine, stratégies, pipelines...),
générer une structure en couches :
  src/
    core/        — logique métier pure, indépendante du framework
    services/    — orchestration, coordination entre modules
    data/        — accès aux données, ORM, repositories
    ui/          — composants React, hooks, pages
    workers/     — processus de fond, schedulers (si desktop+serveur ou serveur)
    config/      — configuration, variables d'environnement
    utils/       — utilitaires transversaux
Sinon, générer la structure conventionnelle du type de projet.}

---

## Commandes de développement

{Dev Commands depuis la description}

---

## Conventions de code

{Conventions depuis la description}

- **Langue du code** : {langue code}
- **Langue de l'interface** : {langue interface}

### Principes de conception

- **KISS** — privilégier la solution la plus simple qui fonctionne
- **DRY** — toute logique dupliquée doit être extraite
- **YAGNI** — ne pas implémenter ce qui n'est pas demandé aujourd'hui
- **SOLID** — en particulier : Single Responsibility, Open/Closed, Dependency Inversion

---

## Modules / Entités

{liste des modules depuis la description, avec leurs relations si déclarées}

---

## Design

{si DESIGN est non vide :
  - **Outil** : {outil déclaré}
  - **État** : {état déclaré}
  - **Handoff** : {chemin ou lien déclaré}

  Si l'état est "terminé" et qu'un handoff bundle est disponible, utiliser son contenu
  comme référence pour générer les composants UI plutôt que de partir de zéro.

omettre cette section si DESIGN est vide}

---

## Workflow par défaut

Pour toute tâche de développement, utilise les agents de `.claude/agents/`. Ne code pas directement en session principale.

## Workflow obligatoire

Pour toute tâche (fonctionnalité, bug, refonte) :
1. **Plan d'abord** : propose un plan d'implémentation détaillé
2. **Attendre validation** : ne pas commencer à coder avant validation explicite
3. **Développement** : orchestrer les agents pour l'implémentation

Ne jamais passer à l'étape 2 sans un "ok", "go", "validé" de ta part.
```

Adapte chaque section avec les informations réelles de la description. Omets les sections marquées "omettre si vide" quand les données correspondantes sont absentes.

## Étape 3 — Générer .claude/settings.json

Crée `.claude/settings.json` avec les permissions adaptées aux commandes déclarées dans Dev Commands. Exemple si npm :

```json
{
  "permissions": {
    "allow": [
      "Bash(git *)",
      "Bash(npm run *)",
      "Bash(npm test*)",
      "Bash(npm install *)"
    ]
  }
}
```

Si Cargo/Rust est dans le stack, ajoute les permissions cargo. Si Python, ajoute les permissions pip/pytest/uvicorn/alembic/ruff. Adapte selon le projet.

## Étape 4 — Générer le boilerplate projet

Génère les fichiers de base selon `PROJECT_TYPE`. Respecte strictement les `DEV_COMMANDS` déclarés (les scripts dans `package.json` doivent correspondre exactement).

### Commun à tous les types

**`.env.example`** — si ENV_VARS est non vide :
```env
# Générer à partir de ENV_VARS avec les noms de variables et leurs commentaires de section.
# Toutes les valeurs sont vides. Ce fichier sert de référence, jamais de configuration réelle.
```

**`docs/roadmap.md`** :
```markdown
# Roadmap — {PROJECT_NAME}

> Ce fichier liste les versions planifiées et leurs items. Chaque version est développée
> via `/version-start` et clôturée via `/version-finalize`.
> Les items terminés sont archivés dans `docs/archives/` à la fin de chaque version.

---

{Si ROADMAP est non vide : générer une section par version déclarée avec ses items.}
{Si ROADMAP est vide :
## vX.Y.Z — {titre de la première version}

- Item 1 : description
- Item 2 : description
}
```

**`docs/backlog.md`** :
```markdown
# Backlog — {PROJECT_NAME}

> Ce fichier centralise les idées d'évolution, bugs connus et questions ouvertes.
> Quand un item est planifié dans une version, il est déplacé dans `docs/roadmap.md`.
> Ne jamais créer d'autre fichier de notes — tout centraliser ici.

---

## Améliorations

{Si BACKLOG contient des améliorations : les lister ici. Sinon : _(aucune pour l'instant)_}

## Bugs connus

_(aucun pour l'instant)_

## Questions ouvertes

{Si BACKLOG contient des questions ouvertes : les lister ici. Sinon : _(aucune pour l'instant)_}
```

**`README.md`** minimal :
```markdown
# {PROJECT_NAME}

{description courte}

## Dev

{dev commands}
```

**`.gitignore`** adapté à la stack (node_modules, dist, build, .env, fichiers DB, __pycache__, .venv, etc.)

### Type `electron`

- `package.json` — Electron Forge + Vite, avec tous les scripts de Dev Commands
- `tsconfig.json` — strict: false, paths alias `@/*`
- `forge.config.ts` — config Electron Forge Vite
- `src/main.ts` — point d'entrée Electron (BrowserWindow + IPC init)
- `src/preload.ts` — contextBridge (contextIsolation: true, nodeIntegration: false)
- `src/renderer.tsx` — root React avec ReactDOM.createRoot
- `src/App.tsx` — HashRouter avec routes de base

Si `PROJECT_DEPLOYMENT` contient `+serveur` ou si ARCHITECTURE décrit un worker/scheduler :
- `src/workers/` — répertoire pour les processus de fond
- `src/workers/scheduler.ts` — point d'entrée du scheduler (structure vide commentée)

### Type `tauri`

- `package.json` — Vite frontend, scripts conformes à Dev Commands
- `tsconfig.json`
- `vite.config.ts`
- `src/main.tsx` — root React
- `src/App.tsx` — composant racine
- `src-tauri/Cargo.toml` — dépendances Tauri
- `src-tauri/tauri.conf.json` — configuration Tauri
- `src-tauri/src/lib.rs` — setup Tauri avec invoke handlers
- `src-tauri/src/main.rs` — main Rust

### Type `nextjs`

- `package.json` — Next.js, scripts conformes
- `tsconfig.json`
- `next.config.ts`
- `app/layout.tsx` — RootLayout avec html/body
- `app/page.tsx` — page d'accueil

### Type `react-spa`

- `package.json` — Vite, scripts conformes
- `tsconfig.json`
- `vite.config.ts` — avec alias `@/`
- `index.html`
- `src/main.tsx` — root React
- `src/App.tsx` — composant racine avec routes de base

### Type `node-api`

- `package.json` — Node.js/Express ou Fastify, scripts conformes
- `tsconfig.json`
- `src/index.ts` — point d'entrée, démarrage serveur
- `src/router.ts` — routes de base

### Type `full-stack` ou `other`

Génère la structure la plus adaptée à l'architecture décrite. Si ARCHITECTURE contient des couches métier explicites, applique la structure en couches définie dans la section "Structure des dossiers" de CLAUDE.md. Demande confirmation si le type est ambigu.

### Répertoire design/ — si DESIGN est non vide

Crée le répertoire `design/` à la racine du projet.

- Si l'état est `terminé` et qu'un chemin de handoff bundle est déclaré : vérifie que le répertoire existe et mentionne-le dans le résumé.
- Si l'état est `à faire` ou `en cours` : crée `design/.gitkeep` et ajoute une note dans le résumé invitant à y déposer le handoff bundle une fois le prototypage terminé avant de développer les composants UI.

## Étape 5 — Résumé

Affiche la liste complète des fichiers créés, groupés par catégorie :

```
Infrastructure Claude Code :
  ✓ CLAUDE.md
  ✓ .claude/settings.json

Agents disponibles (depuis .claude/agents/) :
  ✓ test-agent.md
  ✓ release-audit-agent.md
  [✓ migration-agent.md — si inclus]
  [✓ component-agent.md — si inclus]
  [✓ {extra-agent}.md — pour chaque agent additionnel déclaré]

Commands disponibles (depuis .claude/commands/) :
  ✓ project-start.md, version-start.md, version-finalize.md
  ✓ item-start.md, item-finish.md, code-review.md

Boilerplate projet :
  ✓ [liste des fichiers créés]
  [✓ .env.example — si variables d'environnement déclarées]
  ✓ docs/roadmap.md
  ✓ docs/backlog.md
  [✓ design/.gitkeep ou design/handoff/ — si Design déclaré]
```

Puis affiche les prochaines étapes :

> **Prochaines étapes :**
> 1. `git init && git add . && git commit -m "init"`
> 2. `npm install` (ou `cargo build` pour Tauri, ou `pip install -e ".[dev]"` pour Python)
> 3. Copier `.env.example` en `.env` et renseigner les valeurs (si applicable)
> 4. `/version-start 0.1.0` pour démarrer la première version
