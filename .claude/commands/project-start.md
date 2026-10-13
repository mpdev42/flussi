---
model: opus
effort: xhigh
---

# /project-start — Bootstrap d'un nouveau projet

> Cette skill génère l'infrastructure complète d'un nouveau projet (CLAUDE.md, settings, squelette projet, fichiers de doc). Elle prend des décisions structurantes : un modèle moins capable risque de produire un bootstrap incohérent.

---

## Bloc de confirmation modèle

Avant toute autre action, affiche le message suivant et **attends ma réponse explicite. Ne continue pas sans réponse** :

> Calibrage attendu : **Opus**, effort **`xhigh`**.
> Si l'effort actif n'est pas `xhigh`, tape `/effort xhigh` avant de répondre `ok` (puis `/effort high` une fois la skill terminée, pour revenir à ton réglage habituel).

Continue uniquement après un `ok` ou équivalent explicite.

---

Pas d'argument — la skill lit toujours `docs/project-description.md` dans le répertoire courant.

<context>
Le dossier `.claude/` à la racine du projet est déjà en place au moment où cette skill s'exécute. Il a été copié depuis le dossier `Claude/` maintenu à part, et contient :

- `.claude/agents/` — fichiers d'agents standards et additionnels
- `.claude/commands/` — fichiers des skills (commandes slash)
- `.claude/templates/` — templates de bootstrap par type de projet

La skill ne copie ni ne génère aucun de ces fichiers. Elle les lit et les utilise comme référence.
</context>

---

## Étape 1 — Lire et valider la description

Lis `docs/project-description.md` dans le répertoire courant.

<validation>

**Cas 1 — fichier absent.** Affiche ce message et arrête-toi :

> Le fichier `docs/project-description.md` est introuvable. Crée-le en copiant `.claude/templates/project-description-template.md` puis en le remplissant.
> Si tu n'as pas encore cadré le projet, lance d'abord `/office-hours project` pour produire le bloc de cadrage initial, colle-le dans la description, puis relance `/project-start`.

**Cas 2 — fichier présent, sections obligatoires manquantes.** Vérifie la présence des sections : **Type**, **Déploiement**, **Stack**, **Dev Commands**, **Architecture**.

Si une ou plusieurs manquent, liste précisément ce qui manque et arrête-toi :

> Sections obligatoires manquantes : {liste}. Complète `docs/project-description.md` puis relance `/project-start`.

**Cas 3 — incohérence Stack ↔ Architecture.** Scanne le texte de la section *Architecture* à la recherche de technologies nommément citées qui devraient apparaître dans le tableau *Stack*. Liste indicative à étendre selon les briques connues du type de projet (notamment celles listées dans `template-{PROJECT_TYPE}.md`) :

- Validation : `zod`, `valibot`, `yup`, `joi`
- ORM / accès DB : `drizzle`, `prisma`, `better-sqlite3`, `sqlite`, `postgres`, `mysql`, `redis`, `mongodb`
- État / data fetching : `tanstack-query`, `react-query`, `zustand`, `redux`, `jotai`
- Auth : `msal`, `auth0`, `clerk`, `next-auth`
- HTTP : `axios`, `ky`, `got`

Pour chaque technologie mentionnée dans *Architecture* mais absente du tableau *Stack*, affiche :

> La section **Architecture** mentionne `{tech}`, mais `{tech}` n'apparaît pas dans le tableau **Stack**. Si rien n'est fait, le squelette généré ne préparera pas l'usage de `{tech}` (ni dans `package.json`, ni dans la structure de dossiers).
>
> - `ajouter` — je m'arrête, tu ajoutes `{tech}` à la Stack puis tu relances `/project-start`
> - `retirer` — je m'arrête, tu retires la mention de l'Architecture (ou tu reportes l'usage à une version ultérieure) puis tu relances
> - `continuer` — j'ignore l'incohérence et je génère un squelette qui ne préparera pas `{tech}` (à intégrer manuellement plus tard)

Si plusieurs incohérences sont détectées, traite-les une à une dans l'ordre où elles apparaissent dans le texte de l'*Architecture*. Attends une réponse explicite pour chacune.

- `ajouter` ou `retirer` → sors immédiatement de la skill sans rien générer.
- `continuer` → mémorise la technologie ignorée dans `INCOHERENCES_ACCEPTEES` pour qu'elle apparaisse dans le résumé final de l'étape 10.

**Cas 4 — fichier présent, sections obligatoires OK, mais "Cadrage initial" vide ou absent.** Affiche cette suggestion (sans bloquer le workflow) :

> La section "Cadrage initial" est vide. Tu peux soit la remplir maintenant, soit lancer `/office-hours project` pour produire un bloc de cadrage à coller dans la description, soit démarrer sans cadrage explicite.
> Réponds `cadrer` (je m'arrête, tu lances `/office-hours project`), `compléter` (je m'arrête, tu remplis la section), ou `continuer` pour démarrer sans cadrage.

Attends ma réponse. Continue uniquement après instruction explicite.

</validation>

---

## Étape 2 — Extraire et mémoriser les variables

Depuis la description, extrais les variables suivantes. Note explicitement quand une variable est vide.

| Variable | Source | Vide si |
|----------|--------|---------|
| `PROJECT_NAME` | titre `# Project: …` | jamais (obligatoire) |
| `PROJECT_TYPE` | section Type | jamais (obligatoire) |
| `PROJECT_DEPLOYMENT` | section Déploiement | jamais (obligatoire) |
| `STACK` | tableau Stack | jamais (obligatoire) |
| `ARCHITECTURE` | section Architecture | jamais (obligatoire) |
| `MODES` | tableau Modes de fonctionnement | section absente ou vide |
| `EXTERNAL_SERVICES` | tableau Services externes | section absente ou vide |
| `ENV_VARS` | section Variables d'environnement | section absente ou vide |
| `DEV_COMMANDS` | bloc bash Dev Commands | jamais (obligatoire) |
| `CONVENTIONS` | section Code Conventions | jamais (obligatoire) |
| `MODULES` | section Modules / Domaine | section vide |
| `AGENTS` | cases cochées dans Agents à inclure | aucune cochée |
| `EXTRA_AGENTS` | section Agents additionnels | section absente ou vide |
| `DESIGN` | section Design (cas 1, 2 ou 3) | section absente |
| `CADRAGE` | section Cadrage initial | section absente ou vide |
| `NOTES` | section Notes | section absente ou vide |

Détecte aussi :

- Présence de `DESIGN.md` à la racine du répertoire courant
- Présence du dossier `design/handoff/` (et s'il contient des fichiers)
- Présence du dossier `design/patterns/` (et s'il contient des fichiers `.tsx`)
- Présence du fichier `.claude/templates/template-{PROJECT_TYPE}.md`
- Pour chaque agent listé dans `AGENTS` et `EXTRA_AGENTS` : présence du fichier correspondant dans `.claude/agents/`

<agents_naming>
Convention de nommage des agents standards dans `.claude/agents/` :

| Cocheable | Nom de fichier attendu |
|-----------|-----------------------|
| `test`      | `test-agent.md`           |
| `migration` | `migration-agent.md`      |
| `audit`     | `release-audit-agent.md`  |
| `component` | `component-agent.md`      |
| `feature`   | `feature-agent.md`        |

Pour les agents additionnels, le nom de fichier est `{nom-déclaré}.md` ou `{nom-déclaré}-agent.md` selon ce qui existe réellement dans `.claude/agents/`.
</agents_naming>

---

## Étape 3 — Présenter le plan de génération et attendre validation

Présente-moi un récapitulatif structuré sous ce format :

```markdown
## Plan de génération pour {PROJECT_NAME}

### Documentation et configuration Claude Code
- `CLAUDE.md` — sections incluses : {liste des sections effectivement générées en fonction des données présentes}
- `.claude/settings.json` — permissions adaptées à : {outils/runtimes détectés dans DEV_COMMANDS}

### Agents standards référencés
{Pour chaque agent dans AGENTS :
  - ✓ {nom-de-fichier} — présent dans .claude/agents/
  - ⚠ {nom-de-fichier} — DÉCLARÉ MAIS ABSENT de .claude/agents/ (vérifie ta copie initiale du dossier Claude/)
}

### Agents additionnels
{Pour chaque agent dans EXTRA_AGENTS, vérifier la présence dans .claude/agents/ et marquer ✓ ou ⚠.
Si EXTRA_AGENTS est vide : "_(aucun)_"}

### Squelette projet
- Type : `{PROJECT_TYPE}`
- Template attendu : `.claude/templates/template-{PROJECT_TYPE}.md`
- Statut du template : {présent | ABSENT — la skill s'arrêtera à l'étape 6 si tu valides ce plan}

### Structure de dossiers proposée
{Arbre proposé en fonction du type, de l'architecture et des modules.
Si tu hésites entre deux structures, propose les deux et demande-moi de choisir.
Si l'architecture déclare des couches métier explicites, applique une structure en couches.
Sinon, applique la structure conventionnelle du type de projet.}

### Fichiers de doc et utilitaires
- `docs/roadmap.md` — squelette minimum, à initialiser via `/version-start 0.1.0`
- `docs/backlog.md` — squelette vide structuré, alimenté au fil du projet
- `README.md`
- `.gitignore` — adapté à la stack
{- `.env.example` — si ENV_VARS non vide}
{- `design/.gitkeep` — si DESIGN cas 3}

### Design détecté
{Si DESIGN.md existe à la racine : "✓ DESIGN.md présent, sera référencé dans CLAUDE.md"}
{Si design/handoff/ existe : "✓ design/handoff/ présent, sera référencé dans CLAUDE.md"}
{Si design/patterns/ existe : "✓ design/patterns/ présent, sera référencé dans CLAUDE.md"}
{Si DESIGN cas 3 et rien détecté : "⚠ Aucun design présent, design/.gitkeep sera créé pour préparer le dossier"}
{Si DESIGN cas 1 : "Pas d'UI, section Design omise dans CLAUDE.md"}
```

Termine par :

> Réponds `valider` pour générer, `ajuster <section>` pour modifier une section avant génération, ou `annuler` pour arrêter. **Attends ma réponse, ne continue pas.**

Continue uniquement après un `valider` explicite. Si je demande un ajustement, applique-le et représente le plan complet pour revalidation.

---

## Étape 4 — Générer `CLAUDE.md`

Crée `CLAUDE.md` à la racine du projet. Structure exacte ci-dessous. Omets les sections marquées « omettre si vide » quand les données correspondantes sont absentes.

```markdown
# CLAUDE.md — Référence pour sessions IA

Projet **{PROJECT_NAME}** — {description courte issue de la description}

> La roadmap est dans `docs/roadmap.md`. Le backlog est dans `docs/backlog.md`.
> Centraliser toutes les notes de projet dans ces deux fichiers.

---

## Cadrage initial

{contenu de CADRAGE — omettre cette section si vide}

---

## Stack technique

{tableau STACK}

---

## Base de données

{Si la Stack contient une brique DB (better-sqlite3, drizzle, prisma, sqlite, postgres, mysql, redis, mongodb) :
- **Fichier** : `{nom-du-fichier}.db` — à compléter
- **Emplacement dev** : {chemin local — ex : racine du projet, ignoré par `.gitignore`}
- **Emplacement prod** : {ex : `app.getPath('userData')` pour Electron, ou chemin fixe}
- **ORM** : {nom de l'ORM, ou `aucun — accès direct via {lib}`}
Si aucune brique DB dans la Stack → omettre toute cette section.}

---

## Architecture

{description ARCHITECTURE}

---

## Modes de fonctionnement

{tableau MODES — omettre si vide}

---

## Services externes

{tableau EXTERNAL_SERVICES — omettre si vide}

---

## Variables d'environnement

{liste ENV_VARS — omettre si vide}

---

## Structure des dossiers

{arborescence validée à l'étape 3}

---

## Commandes de développement

{DEV_COMMANDS}

---

## Conventions de code

{CONVENTIONS}

---

## Modules / Entités

{MODULES — liste des modules avec leur description et leurs relations si déclarées}

---

## Design

{Si DESIGN cas 1 (pas d'UI) → omettre toute cette section.

Si DESIGN cas 2 (design produit) :

- **État** : produit
- **Sources figées** :
  - `DESIGN.md` à la racine — tokens du design system (couleurs, typographie, espacements, rayons), produit via `/design-system-bootstrap`. {Si DESIGN.md détecté : "✓ présent"}
  - `design/handoff/` — composants atomiques de référence (Button, Input, Card, Modal…), au format `.html` + `.css` + `.jsx`. Source primaire pour `component-agent`. {Si design/handoff/ détecté avec contenu : "✓ présent et peuplé" sinon si dossier vide ou absent : "⚠ absent ou vide"}
  - `design/patterns/` — patterns d'écran composites (`list.tsx`, `form.tsx`, `list+form.tsx`), au format `.tsx` self-contained uniquement. Produits via `/design-patterns-bootstrap`. Source primaire pour `feature-agent` quand l'item utilise un pattern standard. {Si design/patterns/ détecté avec contenu : "✓ présent et peuplé" sinon : "⚠ absent ou vide — lance /design-patterns-bootstrap pour produire les 3 patterns"}

**Convention de format** : l'asymétrie de format entre les deux dossiers est intentionnelle. `design/handoff/` capture des atomes sous plusieurs représentations (markup pur, styles, composant React) pour que `component-agent` puisse choisir l'angle qui lui sert. `design/patterns/` capture des compositions complètes en un seul fichier `.tsx` self-contained, previewable directement dans Claude Design.

Aucune skill ni agent autre que celles qui produisent ces sources ne les modifie. Pour faire évoluer le design : régénérer via la skill correspondante (`/design-system-bootstrap` pour les tokens, `/design-patterns-bootstrap` pour les patterns — mode régénération ciblée disponible), puis rejouer `/design-system-adapt` si les tokens ont changé.

Si DESIGN cas 3 (à produire) :

- **État** : à faire
- **Plan** : produire dans cet ordre :
  1. `DESIGN.md` + composants atomiques `design/handoff/` via `/design-system-bootstrap` (tokens fondamentaux + atomes Button/Input/Card/Modal au format `.html`/`.css`/`.jsx`).
  2. Patterns d'écran composites `design/patterns/` via `/design-patterns-bootstrap` (list, form, list+form, au format `.tsx` self-contained).
  3. Au cas par cas, écrans sur-mesure `design/handoff/{ecran}.tsx` via `/design-screen-prompt` pour les items marqués `Pattern: custom` dans `version-{X}.md`.

Tant que `DESIGN.md` et `design/patterns/` n'existent pas, les agents UI travaillent sans guide visuel et produisent des composants par défaut. Préviens-moi si tu lances un travail UI avant que le design soit produit.

**Convention de format à venir** : `design/handoff/` contiendra des atomes au format `.html` + `.css` + `.jsx` (plusieurs représentations utiles à `component-agent`). `design/patterns/` contiendra des patterns au format `.tsx` self-contained uniquement (composition complète previewable, instanciée par `feature-agent`).}

---

## Workflow obligatoire

Pour toute tâche de développement (fonctionnalité, bug, refonte) :

1. **Plan d'abord** — propose un plan d'implémentation détaillé.
2. **Attendre validation** — ne pas commencer à coder avant un `ok`, `go` ou `validé` explicite.
3. **Développement** — orchestrer les agents de `.claude/agents/` pour l'implémentation. Lancer en parallèle les agents indépendants.

Faire les Edit/Write sur les fichiers sources via les agents, pas depuis la session principale.
```

---

## Étape 5 — Générer `.claude/settings.json`

Crée `.claude/settings.json` avec des permissions adaptées aux outils déclarés dans `DEV_COMMANDS`. Règle d'autorisation : autoriser un outil si et seulement s'il apparaît dans les Dev Commands ou est nécessaire au workflow git.

Outils communs à reconnaître : `npm`, `yarn`, `pnpm`, `bun`, `cargo`, `pip`, `uv`, `pytest`, `ruff`, `alembic`, `tauri`, `electron-forge`. Ajouter systématiquement `git`.

Exemple si Dev Commands utilise `npm` :

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

Adapte selon la stack réellement déclarée. N'autorise pas ce qui n'apparaît ni dans les commandes ni dans le workflow git.

---

## Étape 6 — Bootstrap du squelette projet

Les templates de bootstrap vivent dans `.claude/templates/template-{PROJECT_TYPE}.md`. Chaque type de projet a son propre fichier (`template-electron.md`, `template-tauri.md`, `template-nextjs.md`, `template-react-spa.md`, `template-node-api.md`, `template-full-stack.md`, `template-other.md`).

Le template construit le **squelette** du projet ; il est **distinct d'un éventuel scaffolder** (moteur CRUD posé ensuite, à l'étape 6 bis). Le template ne suppose aucun scaffolder ; à l'inverse, un scaffolder suppose que le squelette produit ici existe déjà.

<bootstrap>

1. **Lis `.claude/templates/template-{PROJECT_TYPE}.md`**.

2. **Si le template existe** :
   - Applique les instructions qu'il contient pour générer les fichiers du squelette
   - Respecte strictement les `DEV_COMMANDS` déclarés : les scripts générés (par exemple dans `package.json`) doivent correspondre exactement aux commandes déclarées
   - Si l'architecture déclarée comporte des couches métier explicites, applique la structure validée à l'étape 3 plutôt que la structure par défaut du template

3. **Si le template est absent**, affiche ce message et arrête-toi immédiatement (ne génère aucun fichier de squelette, ne passe pas à l'étape 7) :

   > Aucun template `.claude/templates/template-{PROJECT_TYPE}.md` trouvé. Crée-le **dans deneb** via `/template-bootstrap` (il guide la création du template pour ce type, en l'alignant sur le scaffolder de la stack s'il en existe un), puis recopie-le dans `.claude/templates/` et relance `/project-start`. Pour le type `other`, le template doit être créé spécifiquement pour ce projet.

</bootstrap>

---

## Étape 6 bis — (Conditionnel) Proposer la résolution d'un scaffolder

<instructions>
Cette étape ne s'applique que si le projet est susceptible de bénéficier d'un scaffolder (projet à
**CRUD intensif**). Sinon, ignore-la entièrement et passe à l'étape 7 — le comportement par défaut
reste inchangé.

À la différence des autres branches scaffolder de la stack, le garde n'est **pas** ici « si
`scaffold/` existe » : c'est précisément l'étape où `scaffold/` peut **naître** (voir
`.claude/docs/scaffolder-integration.md` §10).

Cette étape suppose que le **squelette est déjà construit** (étape 6). `/scaffolder-resolve` ne copie
que le **moteur** du scaffolder (templates, scripts, runtime-kit), **jamais un squelette** : le
scaffolder s'écrit dans le squelette existant. Si l'étape 6 s'est arrêtée faute de template, on ne
passe pas ici tant que le template n'a pas été créé (`/template-bootstrap`).

Si la stack du projet (déterminée à l'étape 2) ressemble à une combinaison qu'un scaffolder du
catalogue deneb pourrait couvrir, propose :

> Ce projet est à CRUD intensif. Un scaffolder du catalogue deneb peut peut-être générer la couche
> CRUD (persistance, service, transport, écrans) de tes entités. Veux-tu que je lance
> `/scaffolder-resolve` pour chercher un scaffolder correspondant à ta stack ? (Si aucun ne
> correspond, il proposera d'en créer un via `/scaffolder-bootstrap`.)

- Si j'accepte : enchaîne sur `/scaffolder-resolve`. S'il aboutit, le dossier `scaffold/` est créé
  (signal d'activation) ; je remplirai `scaffold/csv/` puis lancerai `/scaffold` plus tard.
- Si je refuse, ou si aucun scaffolder ne correspond : ne crée pas `scaffold/`. Le projet reste en
  mode classique et la suite de `/project-start` se déroule normalement.

Cette étape est **optionnelle** : ne bloque jamais le bootstrap si elle est déclinée.
</instructions>

---

## Étape 7 — Générer les fichiers communs

Une fois l'étape 6 complétée avec succès, génère les fichiers suivants.

### `docs/roadmap.md`

```markdown
# Roadmap — {PROJECT_NAME}

> Ce fichier liste les versions planifiées et leurs items. Chaque version est développée
> via `/version-start` et clôturée via `/version-finalize`.
> Les items terminés sont archivés dans `docs/archives/` à la fin de chaque version.

---

_Aucune version planifiée pour l'instant. Lance `/version-start 0.1.0` pour démarrer la première version — la skill te guidera pour définir les items et les ajoutera ici._
```

### `docs/backlog.md`

```markdown
# Backlog — {PROJECT_NAME}

> Ce fichier centralise les idées d'évolution, bugs connus et questions ouvertes.
> Quand un item est planifié dans une version, il est déplacé dans `docs/roadmap.md`
> (un point reporté rattaché par `/version-start` est déplacé dans `docs/version-{X}.md`).
> Centraliser toutes les notes ici. Ne pas créer d'autre fichier de notes.

---

## Améliorations

_(aucune pour l'instant)_

## Bugs connus

_(aucun pour l'instant)_

## Questions ouvertes

_(aucune pour l'instant)_

## Points reportés

> Actions techniques et décisions issues d'items livrés, reportées hors de leur version.
> Une entrée = l'action, le fichier concerné, l'origine. Le détail reste dans le fichier de
> version d'origine (`docs/version-{X}.md`, puis `docs/archives/` une fois la version finalisée).
> Ne pas confondre avec « Items différés » (idées de fonctionnalités écartées par `/backlog-bootstrap`).

_(aucun pour l'instant)_
```

### `README.md`

```markdown
# {PROJECT_NAME}

{description courte}

## Dev

{DEV_COMMANDS}
```

### `.gitignore`

Adapter à la stack : `node_modules`, `dist`, `build`, `.env`, fichiers DB locaux, `target/`, `__pycache__`, `.venv`, etc. Ne pas inclure de patterns inutiles à la stack réelle.

### `.env.example` (conditionnel)

Si `ENV_VARS` est non vide, génère `.env.example` avec les noms de variables et leurs commentaires de section issus de la description. Toutes les valeurs sont vides. Ce fichier sert de référence, jamais de configuration réelle.

### Dossier `design/` (conditionnel)

- Si `DESIGN` est en cas 3 (à produire), crée le dossier `design/` avec un fichier `.gitkeep`. Mentionne dans le résumé final la séquence à suivre : `/design-system-bootstrap` (DESIGN.md + composants atomiques dans `design/handoff/`), puis `/design-patterns-bootstrap` (3 patterns d'écran dans `design/patterns/`), puis `/design-screen-prompt` au cas par cas pour les écrans `Pattern: custom`.
- Si `DESIGN` est en cas 2 (déjà produit), vérifie la présence des trois sources figées (`DESIGN.md`, `design/handoff/`, `design/patterns/`) et mentionne dans le résumé final celles qui sont en place et celles qui manquent. Si `design/patterns/` est absent ou vide, signale qu'il faudra lancer `/design-patterns-bootstrap` avant le premier `/item-start` qui consomme un pattern standard.

---

## Étape 8 — Intégration GitHub

Cette étape initialise le dépôt git local puis propose la création d'un dépôt distant GitHub privé sous le compte `mpdev42`. Elle s'applique à tous les types de projets.

### 8.1 — Initialiser git localement

Avant toute interaction avec GitHub, garantis qu'un commit `init` existe en local. Vérifie d'abord :

```bash
git rev-parse --verify HEAD
```

<instructions>
- Si la commande échoue (aucun commit, ou pas de dépôt git du tout), exécute la séquence d'initialisation :

  ```bash
  git init
  git add .
  git commit -m "init"
  ```

- Si la commande réussit, un commit existe déjà : ne rejoue rien et continue.
</instructions>

Mémorise le statut « commit init créé pendant la skill » ou « commit init préexistant » pour le résumé final.

### 8.2 — Proposer la création du dépôt distant

Affiche le message suivant et **attends ma réponse. Ne continue pas sans réponse** :

> Veux-tu créer un dépôt GitHub privé pour ce projet ? C'est fortement recommandé : sauvegarde, traçabilité, accès depuis d'autres machines. Réponds `oui` pour continuer la procédure, `plus tard` pour la sauter (le remote pourra être ajouté manuellement plus tard).

<instructions>
Si la réponse est `plus tard` ou équivalent (« non », « pas maintenant », « skip ») :

- Mémorise le statut `GitHub : non créé` pour le résumé final.
- Mémorise le slug par défaut `{NOM_DEPOT}` (PROJECT_NAME en minuscules, espaces remplacés par tirets) — il sera rappelé dans la commande à exécuter plus tard.
- Sors de l'étape 8 et passe à l'étape 9.

Si la réponse est `oui` ou équivalent (« go », « ok ») : enchaîne sur 8.3.
</instructions>

### 8.3 — Vérifier que GitHub CLI est installé et authentifié

Exécute :

```bash
gh auth status
```

<instructions>
Si la commande échoue (gh non installé, ou installé mais non authentifié), affiche ce bloc d'instructions et **arrête l'étape 8** (passe directement à l'étape 9, en mémorisant le statut `GitHub : non créé — gh indisponible`) :

> GitHub CLI n'est pas disponible ou non authentifié.
>
> 1. Installe `gh` depuis https://cli.github.com/ (sur Windows 11 via winget : `winget install --id GitHub.cli`).
> 2. Authentifie-toi : `gh auth login` (choisir GitHub.com, puis SSH comme protocole, puis suivre les invites).
> 3. Vérifie : `gh auth status`.
>
> Une fois fait, relance `/project-start` et reprends à partir de l'étape 8 — les étapes précédentes ne seront pas regénérées si elles ont déjà produit leurs fichiers.

Si la commande réussit (statut authentifié, scopes suffisants) : continue avec 8.4.
</instructions>

### 8.4 — Vérifier que SSH est configuré pour GitHub

Exécute :

```bash
ssh -T git@github.com
```

Cette commande retourne un code de sortie 1 même en cas de succès — c'est la sortie textuelle qui compte, pas le code.

<instructions>
Si la sortie ne contient pas la chaîne « successfully authenticated », affiche le bloc d'instructions ci-dessous et **arrête l'étape 8** (passe à l'étape 9, en mémorisant le statut `GitHub : non créé — SSH non configuré`).

Le bloc à afficher (procédure Windows 11) :

> SSH n'est pas configuré pour GitHub. Suis ces étapes :
>
> **1. Génère une clé SSH** (remplace l'email par celui associé au compte GitHub `mpdev42`) :
> ```
> ssh-keygen -t ed25519 -C "ton-email@example.com"
> ```
> Accepte les chemins par défaut, choisis une passphrase si tu veux.
>
> **2. Démarre le service ssh-agent et ajoute la clé** (PowerShell en administrateur pour la première commande, utilisateur normal pour les suivantes) :
> ```
> Set-Service ssh-agent -StartupType Automatic
> Start-Service ssh-agent
> ssh-add $env:USERPROFILE\.ssh\id_ed25519
> ```
>
> **3. Copie la clé publique dans le presse-papiers** :
> ```
> Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub | Set-Clipboard
> ```
>
> **4. Ajoute la clé sur GitHub** : ouvre https://github.com/settings/ssh/new, colle la clé, donne-lui un titre descriptif (ex : `WIN11-{nom-machine}`), et valide.
>
> **5. Vérifie** : relance `ssh -T git@github.com`. La sortie doit contenir « successfully authenticated ».
>
> Une fois fait, relance `/project-start` et reprends à partir de l'étape 8.

Si la sortie contient « successfully authenticated » : continue avec 8.5.
</instructions>

### 8.5 — Confirmer le nom du dépôt

Calcule le nom proposé par défaut : `{PROJECT_NAME}` converti en slug (minuscules, espaces et caractères non alphanumériques remplacés par des tirets, tirets multiples consolidés).

<example>
- `Project: Mon Outil de Suivi` → `mon-outil-de-suivi`
- `Project: API_Courtage` → `api-courtage`
- `Project: gstack-fork` → `gstack-fork`
</example>

Affiche :

> Le dépôt sera nommé `mpdev42/{NOM_DEPOT_PROPOSÉ}`. Confirme ce nom avec `ok` ou propose un nom différent (ex : `nom: mon-autre-nom`).

Attends ma réponse. Continue uniquement après confirmation explicite. Mémorise le nom retenu sous `{NOM_DEPOT}`.

### 8.6 — Créer le dépôt distant et pousser

Exécute :

```bash
gh repo create mpdev42/{NOM_DEPOT} --private --source=. --remote=origin --push
```

Détail des flags :

- `--private` : dépôt privé (obligatoire — pas de dépôt public depuis cette skill).
- `--source=.` : utilise le répertoire courant comme source.
- `--remote=origin` : nomme le remote `origin`.
- `--push` : pousse le commit `init` (créé en 8.1) sur la branche `main`.

<instructions>
Si la commande échoue :

- Affiche la sortie d'erreur exacte.
- Si l'erreur indique un dépôt déjà existant (`Name already exists on this account`), demande-moi si je veux choisir un autre nom (retour à 8.5) ou abandonner cette étape.
- Si l'erreur indique l'absence de commit, signale-le-moi : le point 8.1 a échoué silencieusement et il faut investiguer manuellement.
- Pour toute autre erreur, demande-moi comment procéder.
- Mémorise le statut `GitHub : non créé — erreur gh repo create` pour le résumé final.

Si la commande réussit :

- Affiche : `Dépôt créé : https://github.com/mpdev42/{NOM_DEPOT}`.
- Mémorise le statut `GitHub : créé` avec l'URL pour le résumé final.
</instructions>

---

## Étape 9 — Smoke-test post-bootstrap

Cette étape vérifie que le squelette généré démarre effectivement. Beaucoup de frictions ne se manifestent qu'au premier `npm run dev` (preload mal configuré, dépendance native non recompilée, alias TS non résolu, etc.) — les détecter ici évite qu'elles ressurgissent au milieu du premier cycle d'item.

### 9.1 — Présenter la procédure et attendre

Affiche le bloc suivant et **attends ma réponse. Ne continue pas sans réponse** :

> Avant de clore le bootstrap, je te recommande de smoke-tester le squelette. Procédure :
>
> 1. Installer les dépendances : `npm install` (ou la commande équivalente selon la stack — voir `CLAUDE.md`).
> {Si `better-sqlite3` dans la Stack : "2. Recompiler le module natif : `npx electron-rebuild`."}
> {Si `prisma` dans la Stack : "2. Initialiser Prisma : `npx prisma init && npx prisma generate`."}
> 3. Lancer la commande dev déclarée : `{commande dev extraite de DEV_COMMANDS}`.
> 4. Vérifier le résultat selon le type de projet :
>    - **`electron` / `tauri` (desktop)** : la fenêtre s'ouvre sans erreur en console. Si `App.tsx` contient un bouton de smoke-test IPC (cas Electron), cliquer dessus et vérifier la réponse attendue (ex : `pong`).
>    - **`web` / `nextjs` / `react-spa`** : le serveur démarre, l'URL est accessible, la page d'accueil s'affiche sans erreur en console.
>    - **`node-api` / `serveur`** : le serveur démarre, le port déclaré est ouvert, le healthcheck répond.
> 5. Reviens me dire :
>    - `ok` — le smoke-test passe, je clos le bootstrap.
>    - `ko <description>` — il y a une erreur, je te recommande la suite à donner.
>    - `skip` — tu préfères passer ; je note dans le résumé final que le smoke-test n'a pas été fait.

### 9.2 — Traiter la réponse

<instructions>
- **`ok`** : mémorise le statut `Smoke-test : passé` pour le résumé final, passe à l'étape 10.
- **`skip`** : mémorise le statut `Smoke-test : non effectué` pour le résumé final, passe à l'étape 10.
- **`ko <description>`** : analyse rapidement la description fournie pour identifier si le symptôme correspond à un piège connu listé dans `.claude/templates/template-{PROJECT_TYPE}.md` (section *Pièges connus*, si elle existe).
  - Si oui : cite l'entrée pertinente avec son fix de référence, propose de l'appliquer puis de relancer le smoke-test (retour à 9.1).
  - Si non : recommande de lancer `/investigate` pour identifier la cause racine, et précise que la skill `/project-start` est terminée — le bootstrap est généré, c'est l'investigation et la correction qui prennent le relais. Mémorise le statut `Smoke-test : échoué — investigation à mener` pour le résumé final, passe à l'étape 10.
</instructions>

---

## Étape 10 — Résumé final

Affiche la liste complète des fichiers créés, l'état des agents référencés et le statut GitHub, groupés par catégorie :

```
Infrastructure Claude Code :
  ✓ CLAUDE.md
  ✓ .claude/settings.json

Agents standards (référencés depuis la description) :
{Pour chaque agent dans AGENTS :
  - ✓ {nom-de-fichier} — présent dans .claude/agents/
  - ⚠ {nom-de-fichier} — DÉCLARÉ MAIS ABSENT de .claude/agents/ (vérifie ta copie initiale du dossier Claude/)
}

Agents additionnels :
{Pour chaque agent dans EXTRA_AGENTS, statut ✓ ou ⚠.
Si EXTRA_AGENTS est vide : "_(aucun)_"}

Squelette projet :
  ✓ {liste des fichiers générés depuis le template}

Fichiers de doc et utilitaires :
  ✓ docs/roadmap.md
  ✓ docs/backlog.md
  ✓ README.md
  ✓ .gitignore
  {✓ .env.example si applicable}
  {✓ design/.gitkeep si applicable}

Incohérences Stack ↔ Architecture acceptées :
{Pour chaque tech dans INCOHERENCES_ACCEPTEES :
  ⚠ {tech} — mentionnée dans Architecture, absente de la Stack. À intégrer manuellement si l'usage est confirmé, ou à retirer de l'Architecture pour éviter la confusion.
}
{Si INCOHERENCES_ACCEPTEES est vide : "_(aucune)_"}

Smoke-test :
  {Cas ok : ✓ passé — le squelette démarre correctement}
  {Cas skip : ⚠ non effectué — à lancer manuellement avant le premier cycle d'item}
  {Cas ko : ✗ échoué — voir investigation en cours / à lancer (`/investigate`)}

Dépôt git local :
  ✓ commit "init" {créé pendant la skill | préexistant}

Dépôt GitHub :
  {Cas créé : ✓ https://github.com/mpdev42/{NOM_DEPOT} (privé, remote 'origin' configuré, branche main poussée)}
  {Cas non créé — choix utilisateur "plus tard" : ⚠ non créé. Pour le créer plus tard :
    gh repo create mpdev42/{NOM_DEPOT} --private --source=. --remote=origin --push}
  {Cas non créé — gh indisponible : ⚠ non créé (gh non installé ou non authentifié). Voir instructions affichées à l'étape 8.}
  {Cas non créé — SSH non configuré : ⚠ non créé (SSH non configuré pour GitHub). Voir instructions affichées à l'étape 8.}
  {Cas non créé — erreur gh repo create : ⚠ non créé (erreur lors de la création). Voir sortie affichée à l'étape 8.}
```

Si au moins un agent est marqué ⚠, ajoute :

> **Action requise** : un ou plusieurs agents déclarés dans la description sont absents de `.claude/agents/`. Vérifie ta copie initiale du dossier `Claude/` ou retire ces agents de la description du projet.

Si `INCOHERENCES_ACCEPTEES` est non vide, ajoute :

> **Action requise** : une ou plusieurs technologies mentionnées dans l'*Architecture* n'ont pas été intégrées au squelette ({liste des techs}). Soit tu les ajoutes manuellement à la Stack et au code généré, soit tu retires leur mention de l'*Architecture* dans `docs/project-description.md` pour éviter la confusion à long terme.

Puis affiche les prochaines étapes en t'adaptant au contexte du projet :

> **Prochaines étapes :**
> 1. {Si smoke-test non effectué ou skip : "Installer les dépendances et lancer le smoke-test manuel décrit à l'étape 9 — si KO, lancer `/investigate`."}
> 2. {Si applicable} Copier `.env.example` en `.env` et renseigner les valeurs
> 3. {Si DESIGN cas 3} Produire le design dans cet ordre :
>    a. `/design-system-bootstrap` — produit `DESIGN.md` (tokens) et les composants atomiques dans `design/handoff/`.
>    b. `/design-patterns-bootstrap` — produit les 3 patterns d'écran (list, form, list+form) dans `design/patterns/`. À lancer idéalement dans la même conversation Claude Design pour préserver la cohérence visuelle.
>    c. {Si stack shadcn} `/design-system-adapt` — matérialise les tokens shadcn dans le code (CSS variables, palette Tailwind, stubs de composants).
>    d. `/design-screen-prompt` — au cas par cas, pour les items marqués `Pattern: custom` qui sortent des patterns standards.
> 4. {Si DESIGN cas 2 et design/patterns/ absent} Lancer `/design-patterns-bootstrap` pour produire les patterns d'écran avant le premier `/item-start` qui en consomme.
> 5. {Si dépôt GitHub non créé} Configurer le remote plus tard via la commande rappelée ci-dessus
> 6. `/version-start 0.1.0` pour démarrer la première version


---

## Fin de skill — retour au réglage habituel

Si j'ai basculé en `xhigh` au bloc de confirmation, termine en me rappelant : « Pense à repasser en `/effort high` (ton réglage habituel). »
