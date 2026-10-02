# Cycles de développement

Aide-mémoire personnel pour retrouver d'un coup d'œil **où j'en suis** dans un cycle. Le document décrit les enchaînements de skills et de sub-agents, pas leur fonctionnement interne — pour le détail de chaque skill, voir `.claude/commands/{nom}.md` ; pour les sub-agents, voir `.claude/agents/{nom}.md`. À consulter au début de chaque cycle, ou dès qu'un doute s'installe sur l'étape suivante.

---

## Modèles et efforts

**Réglage de base : Opus, effort `high`** (au-dessus du défaut `medium` d'Opus 5.5). `xhigh` est réservé aux tâches longues ou structurantes (bootstrap, orchestration d'item, investigation, revue de code, création de scaffolder) ; Sonnet aux tâches d'exécution bien cadrées. Ni `medium`, ni `max`.

Le frontmatter `model:` / `effort:` de chaque skill déclare son calibrage, mais son application automatique n'est pas confirmée (le sélecteur VS Code reste sur le réglage de session). Le **bloc de confirmation** en tête de chaque skill reste donc le garde-fou : il affiche le calibrage attendu et la commande à taper si besoin (`/effort xhigh`, `/model sonnet`). `/effort` et `/model` changent aussi le réglage de la session : les skills `xhigh` et Sonnet rappellent en fin de parcours de revenir à `/effort high` ou `/model opus`. Une skill lancée par une autre (`/code-review` depuis `/item-finish`, `/scaffold` depuis `/item-start`) tourne au réglage actif. Les sub-agents, eux, déclarent `model:` et `effort:` (champs documentés), indépendamment du réglage de session.

### Skills (commandes slash)

| Skill | Chemin | Modèle / effort |
|-------|--------|-----------------|
| `/office-hours` | `.claude/commands/office-hours.md` | Opus high |
| `/project-blueprint` | `.claude/commands/project-blueprint.md` | Opus high |
| `/project-start` | `.claude/commands/project-start.md` | Opus xhigh |
| `/premortem` | `.claude/commands/premortem.md` | Opus high |
| `/document-validation` | `.claude/commands/document-validation.md` | Opus high |
| `/design-system-bootstrap` | `.claude/commands/design-system-bootstrap.md` | Opus high |
| `/design-patterns-bootstrap` | `.claude/commands/design-patterns-bootstrap.md` | Opus high |
| `/design-system-adapt` | `.claude/commands/design-system-adapt.md` | Sonnet high (alt. Opus high) |
| `/backlog-bootstrap` | `.claude/commands/backlog-bootstrap.md` | Opus high |
| `/version-start` | `.claude/commands/version-start.md` | Opus high |
| `/design-screen-prompt` | `.claude/commands/design-screen-prompt.md` | Opus high |
| `/item-start` | `.claude/commands/item-start.md` | Opus xhigh |
| `/investigate` | `.claude/commands/investigate.md` | Opus xhigh |
| `/qa` | `.claude/commands/qa.md` | Opus high |
| `/code-review` | `.claude/commands/code-review.md` | Opus xhigh |
| `/item-finish` | `.claude/commands/item-finish.md` | Opus high |
| `/version-finalize` | `.claude/commands/version-finalize.md` | Opus high |
| `/document-release` | `.claude/commands/document-release.md` | Sonnet high (alt. Opus high) |
| `/template-bootstrap` | `.claude/commands/template-bootstrap.md` | Opus high |
| `/scaffolder-resolve` *(si scaffolder)* | `.claude/commands/scaffolder-resolve.md` | Opus high |
| `/scaffolder-bootstrap` *(si scaffolder)* | `.claude/commands/scaffolder-bootstrap.md` | Opus xhigh |
| `/scaffold-sync` *(si scaffolder)* | `.claude/commands/scaffold-sync.md` | Opus high |
| `/scaffold` *(si scaffolder)* | `.claude/commands/scaffold.md` | Opus high |

### Sub-agents

| Agent | Chemin | Modèle | Effort | Rôle |
|-------|--------|--------|--------|------|
| `feature-agent` | `.claude/agents/feature-agent.md` | Sonnet | high | Code applicatif spécifique à un module |
| `component-agent` | `.claude/agents/component-agent.md` | Opus | high | Composants UI génériques partagés |
| `test-agent` | `.claude/agents/test-agent.md` | Sonnet | high | Écriture et exécution des tests |
| `migration-agent` | `.claude/agents/migration-agent.md` | Opus | high | Schéma DB et migrations ORM |
| `premortem-agent` | `.claude/agents/premortem-agent.md` | Sonnet | high | Instruit en parallèle un mode d'échec assigné dans un pre-mortem (read-only) |
| `release-audit-agent` | `.claude/agents/release-audit-agent.md` | Sonnet | high | Audit de cohérence transversale (read-only) |

---

## Où vit la vérité du projet

Après le bootstrap, `project-description.md` devient un fichier d'archive du brief initial. Il n'est plus modifié sauf cas exceptionnel. La vérité opérationnelle du projet vit dans `CLAUDE.md`, qui est la référence lue par toutes les skills à chaque cycle.

Selon le type d'évolution, le fichier à modifier change :

| Type d'évolution | Fichier à modifier |
|---|---|
| Fonctionnalité (ajout, modification, suppression) | `docs/roadmap.md` puis `docs/version-{X}.md` |
| Bug à corriger | `docs/roadmap.md` ou `docs/backlog.md`, puis cycle d'item |
| Structure technique (nouveau module, stack, conventions) | `CLAUDE.md` (édition manuelle) |
| Cadrage stratégique du projet (rare) | `CLAUDE.md` (édition manuelle) |

`project-description.md` reste figé. `CLAUDE.md` évolue avec le projet. Les fichiers `docs/roadmap.md`, `docs/backlog.md`, `docs/version-{X}.md` sont alimentés par les cycles décrits ci-dessous.

Côté design : `DESIGN.md` (tokens), `design/patterns/` (patterns d'écran réutilisables produits via `/design-patterns-bootstrap`) et `design/handoff/` (écrans sur-mesure produits via `/design-screen-prompt`) sont également **figés** une fois en place. Le pontage vers le code projet (CSS variables shadcn, palette Tailwind, stubs `.tsx`) passe par `/design-system-adapt`, qui peut être rejouée à chaque évolution de `DESIGN.md`.

---

## Cycle 1 — Démarrer un projet

**Quand l'utiliser** : nouvelle idée de projet validée mentalement, dossier vide, du post-it à l'application complète.

**Pré-requis** : décision prise de démarrer ; dossier de travail vide ; accès au dépôt deneb (`C:\Dev\Projets\deneb`), d'où la stack Claude est copiée dans `.claude/` à l'étape 1.

**Deux briques à préparer en amont, dans deneb.** Avant de lancer `/project-start`, vérifie que deneb fournit ce dont le projet a besoin. Ne pas confondre ces deux briques distinctes :

| Brique | Rôle | Clé | Créée (dans deneb) par | Consommée dans le projet par |
|---|---|---|---|---|
| **Template** `template-{TYPE}.md` | recette du **squelette** (arborescence, configs, `package.json`) | par **type** de projet | `/template-bootstrap` | `/project-start` (étape 6) |
| **Scaffolder** `scaffolders/{stack}/` | **moteur CRUD** posé *par-dessus* le squelette | par **stack** | `/scaffolder-bootstrap` | `/scaffolder-resolve` (étape 6 bis) puis `/scaffold` |

- **Tout projet** : `Claude/templates/template-{TYPE}.md` doit exister pour le `Type` du projet — sinon `/project-start` s'arrête à l'étape 6. Le créer via `/template-bootstrap` (dans deneb) s'il manque.
- **Projet à CRUD intensif** : en plus, un scaffolder doit matcher la stack — sinon `/scaffolder-resolve` ne résout rien. Le créer via `/scaffolder-bootstrap` (dans deneb) s'il manque. **Template et scaffolder sont couplés** : le template doit produire exactement la structure attendue par le scaffolder (son `README.md` §Installation).

Le **scaffolder ne fournit jamais le squelette** ; il s'écrit dedans. Ordre, donc : préparer template (+ scaffolder si CRUD) dans deneb → recopier `.claude/` à jour dans le projet → `/project-start` construit le **squelette** (template, étape 6) → propose `/scaffolder-resolve` qui pose le **moteur** (étape 6 bis) → remplir `scaffold/csv/` → `/scaffold`.

**Séquence** :

| # | Étape | Chemin | Modèle | Sortie / pause |
|---|-------|--------|--------|----------------|
| 1 | Copier la stack Claude dans `.claude/` (voir bloc commande sous le tableau) | manuel — source `C:\Dev\Projets\deneb\Claude\` | — | `.claude/` peuplé (`agents/`, `commands/`, `templates/`, `docs/`) et `docs/project-description.md` créé depuis le template. |
| 2 | `/office-hours project` *(optionnel mais recommandé)* | `.claude/commands/office-hours.md` | Opus high | Bloc de **cadrage métier** à coller dans `project-description.md`, section *Cadrage initial*. **Pause après chaque question.** |
| 3 | Coller le bloc dans `docs/project-description.md`, section *Cadrage initial* | manuel | — | Cadrage métier en place. |
| 4 | `/project-blueprint` *(optionnel mais recommandé)* | `.claude/commands/project-blueprint.md` | Opus high | Bloc de **cadrage technique** à coller section par section dans `project-description.md` (Type, Déploiement, Stack, Architecture, Conventions, Modules, Design, Agents…). **Pauses à chaque section.** |
| 5 | Coller le bloc technique dans `docs/project-description.md`, sections correspondantes | manuel — `.claude/templates/project-description-template.md` | — | Description complète, prête à être lue par `/project-start`. |
| 5 bis | `/premortem project` *(optionnel mais recommandé)* | `.claude/commands/premortem.md` | Opus high | Rapport `docs/premortem/premortem-project-{date}.md` : modes d'échec instruits + synthèse (échec le plus probable / le plus dangereux / hypothèse cachée / plan révisé / checklist). **Ne modifie que le rapport ; les révisions du cadrage sont proposées en diff et appliquées seulement sur décision explicite.** À lancer une fois `project-description.md` complète (cadrage métier ET technique), avant `/project-start`. |
| 6 | Vérifier que le **template de squelette** `template-{TYPE}.md` existe dans `.claude/templates/` (distinct du scaffolder : c'est lui que `/project-start` consomme à son étape 6). S'il manque, le créer **dans deneb** via `/template-bootstrap`, puis recopier `.claude/`. | `.claude/commands/template-bootstrap.md` *(si à créer)* | Opus high | Template de bootstrap disponible. |
| 7 | `/project-start` | `.claude/commands/project-start.md` | Opus xhigh | `CLAUDE.md`, `.claude/settings.json`, squelette projet, `docs/roadmap.md`, `docs/backlog.md`, `README.md`, `.gitignore`, `.env.example`. **Initialise git localement (`git init` + commit `init`) et propose la création optionnelle d'un dépôt GitHub privé sous `mpdev42` (avec vérifications gh CLI et SSH).** **Pauses aux validations.** |
| 8 | `/document-validation project` *(optionnel)* | `.claude/commands/document-validation.md` | Opus high | PDF de cadrage projet déposé dans `docs/validation/`, à transmettre au donneur d'ordre pour validation. Recommandé si le projet implique d'autres parties prenantes (direction, collègues, donneurs d'ordre). |
| 9 | Installer les dépendances de la stack | manuel | — | Projet buildable. |
| 10 | Si Design cas 3 : `/design-system-bootstrap` *(optionnel)* | `.claude/commands/design-system-bootstrap.md` | Opus high | Prompt à copier dans Claude Design. Une fois itéré, dépôt manuel de `DESIGN.md` à la racine et des composants dans `design/handoff/`. Si stack shadcn détectée, le prompt demande en plus à Claude Design un bloc *Semantic tokens (shadcn-compatible)* dans `DESIGN.md`. |
| 10bis | Si UI : `/design-patterns-bootstrap` *(optionnel mais fortement recommandé)* | `.claude/commands/design-patterns-bootstrap.md` | Opus high | Prompt à copier dans Claude Design — **idéalement dans la conversation existante de l'étape 10** pour garantir la cohérence visuelle. Une fois itéré, dépôt des 3 fichiers `list.tsx`, `form.tsx`, `list+form.tsx` dans `design/patterns/`. Ces patterns deviennent les coquilles visuelles consommées par `/item-start` pour tous les items dont le champ `Pattern` désigne un pattern standard. |
| 11 | Si stack shadcn et `DESIGN.md` déposé : `/design-system-adapt` *(optionnel)* | `.claude/commands/design-system-adapt.md` | Sonnet high | Matérialise les CSS variables shadcn dans `src/renderer/src/styles/index.css`, étend `tailwind.config.js` avec la palette brand (sand, brand, etc.), liste les `npx shadcn@latest add` à exécuter, génère les stubs `.tsx` dans `src/renderer/src/components/ui/` pour les composants sans équivalent shadcn (Spinner, Field, etc.). **Pause de validation du plan avant écriture.** Idempotente : rejouable si `DESIGN.md` change. |
| 12 | Exécuter les `npx shadcn@latest add` listés à l'étape 11 | manuel | — | Composants shadcn installés et customisés selon les tokens du projet. |
| 13 | `/backlog-bootstrap init` *(optionnel mais recommandé)* | `.claude/commands/backlog-bootstrap.md` | Opus high | Bloc de 15-25 items candidats à coller dans `docs/backlog.md`. **Validation item par item** (garder / reformuler / différer / écarter). Mécanisme de mémoire institutionnelle via section *Items différés*. |
| 14 | `/version-start 0.1.0` | `.claude/commands/version-start.md` | Opus high | `docs/version-0.1.0.md` créé et committé. **Pauses successives** : validation des items extraits, interview item par item (incluant la déclaration du champ `Pattern` pour chaque item), validation de l'ordre de réalisation, validation finale du fichier. |

**L'étape 1 en détail** — il n'existe pas de script de copie dans deneb ; cette étape est manuelle. Depuis PowerShell (exécutable depuis n'importe où, remplace `<nouveau-projet>` par le nom du dossier vierge) :

```powershell
$dest = "C:\Dev\Projets\<nouveau-projet>"
New-Item -ItemType Directory -Force "$dest\.claude", "$dest\docs" | Out-Null
Copy-Item "C:\Dev\Projets\deneb\Claude\*" "$dest\.claude\" -Recurse -Force
Copy-Item "$dest\.claude\templates\project-description-template.md" "$dest\docs\project-description.md" -Force
```

Tout le contenu de `Claude/` (dont `docs/`, donc ce fichier et `scaffolder-integration.md`) atterrit sous `.claude/`, comme l'attendent les skills qui y font référence en `.claude/…`. Ouvre ensuite une **nouvelle session Claude Code dans `$dest`** : les slash-commands (`/office-hours`, `/project-blueprint`, `/project-start`, …) ne sont actives que dans le dossier où `.claude/` a été copié, pas depuis deneb.

**Fichiers modifiés au cours du cycle** : `.claude/` (copie initiale de la stack), `docs/project-description.md`, `CLAUDE.md`, `.claude/settings.json`, squelette de projet (selon stack), `docs/roadmap.md`, `docs/backlog.md`, `README.md`, `.gitignore`, `.env.example`, `design/.gitkeep`, `DESIGN.md`, `design/handoff/*.jsx`, `design/patterns/*.tsx`, `src/renderer/src/styles/index.css`, `tailwind.config.js`, `components.json`, `src/renderer/src/components/ui/*.tsx`, `docs/version-0.1.0.md`, éventuellement `docs/premortem/premortem-project-{date}.md`, éventuellement `docs/validation/cadrage-projet-{date}.pdf`.

**Variantes** :
- Pas d'UI prévue → sauter les étapes 10, 10bis, 11, 12 (`/design-system-bootstrap`, `/design-patterns-bootstrap`, `/design-system-adapt`, install shadcn).
- Stack sans shadcn (UI simple, ou autre lib) → sauter les étapes 11 et 12 ; étapes 10 et 10bis restent utilisables pour produire `DESIGN.md` et les patterns comme références visuelles.
- Pas de validation par donneur d'ordre nécessaire (projet purement perso) → sauter l'étape 8 (`/document-validation project`).
- Pas de pre-mortem souhaité (petit projet, risque déjà bien cerné) → sauter l'étape 5 bis (`/premortem project`).
- Stack et architecture maîtrisées sans hésitation → `/project-blueprint` (étapes 4-5) peut être sauté ; remplir directement les sections techniques de `project-description.md`.
- Pas de dépôt GitHub à la création (réponse `plus tard` à `/project-start` étape 8) → la skill rappellera la commande `gh repo create` à exécuter ultérieurement.
- Roadmap initiale vide → `/version-start` guide la définition des items à l'étape 14.
- Backlog vide à amorcer manuellement → sauter l'étape 13 (`/backlog-bootstrap init`).
- Projet à CRUD intensif → après l'étape 7, `/project-start` (étape 6 bis) propose `/scaffolder-resolve` pour résoudre un scaffolder depuis le catalogue deneb. Voir *Variante scaffolder des cycles* plus bas.

---

## Cycle 2 — Ajouter une fonctionnalité

**Quand l'utiliser** : besoin nouveau (utilisateur, idée perso) à intégrer dans une version.

**Pré-requis** : projet déjà bootstrappé ; branche `main` propre.

**Séquence** :

| # | Étape | Chemin | Modèle | Sortie / pause |
|---|-------|--------|--------|----------------|
| 1 | `/office-hours feature` *(optionnel mais recommandé)* | `.claude/commands/office-hours.md` | Opus high | Bloc de cadrage. **Pause après chaque question.** |
| 2 | Coller le bloc dans `docs/roadmap.md` sous la version cible (ou ajouter l'item directement si office-hours sauté) | manuel | — | Item ajouté dans la roadmap. |
| 3 | `/backlog-bootstrap enrich` *(optionnel — quand le backlog est mince ou pour réactiver des items différés)* | `.claude/commands/backlog-bootstrap.md` | Opus high | Bloc d'items candidats à coller dans `docs/backlog.md`. **Validation item par item.** Reconsidère automatiquement les items différés. |
| 4a | Si la version cible n'est PAS encore initialisée : `/version-start {version}` | `.claude/commands/version-start.md` | Opus high | `docs/version-{version}.md` créé. Plusieurs pauses (cf. Cycle 1 étape 14). |
| 4b | Si la version cible EST déjà initialisée : ajouter l'item dans le fichier de version (avec son champ `Pattern`) | manuel | — | Item documenté dans `docs/version-{version}.md`. |
| 4 ter | `/premortem version {VERSION}` *(optionnel — pour une version structurante, après `/version-start`, avant `/document-validation`)* | `.claude/commands/premortem.md` | Opus high | Rapport `docs/premortem/premortem-v{VERSION}-{date}.md` : modes d'échec de la version + synthèse + plan révisé + checklist avant le premier `/item-start`. **Ne modifie que le rapport ; révisions du fichier de version proposées en diff sur décision.** |
| 5 | `/document-validation version {VERSION}` *(optionnel — UNIQUEMENT au démarrage de la version, pas à chaque item)* | `.claude/commands/document-validation.md` | Opus high | PDF de cadrage de version pour validation par le donneur d'ordre. À utiliser au moment de l'initialisation de la version (juste après `/version-start`), quand la version contient des fonctionnalités importantes nécessitant validation explicite. Étape sautée pour les items suivants de la même version. |
| 6 | `/design-screen-prompt` *(uniquement si l'item est marqué `Pattern: custom` dans `docs/version-{version}.md`)* | `.claude/commands/design-screen-prompt.md` | Opus high | Prompt à copier dans Claude Design. Le composant React produit est déposé dans `design/handoff/` et utilisé par `feature-agent` comme référence d'inspiration. Pour les items à pattern standard, l'écran est déjà couvert par `design/patterns/{pattern}.tsx` produit en amont — `/item-start` charge directement le pattern. |
| 7 | `/item-start {version} {numero} {slug}` | `.claude/commands/item-start.md` | Opus xhigh | Branche d'item, plan validé, sub-agents orchestrés (`feature-agent`, `test-agent`, parfois `migration-agent` si DB, parfois `component-agent` si composant partagé). La skill lit le champ `Pattern` de l'item, charge le(s) fichier(s) correspondant(s) dans `design/patterns/` ou `design/handoff/`, et passe les chemins aux sub-agents UI. **Bloque si la référence design attendue est manquante.** **Plusieurs pauses.** |
| 8 | `/qa` *(recommandé si UI)* | `.claude/commands/qa.md` | Opus high | Test utilisateur du flux ajouté. |
| 9 | `/item-finish {version} {numero}` | `.claude/commands/item-finish.md` | Opus high | Lance `/code-review item` en interne (au réglage actif de la session), traite les bloquants, met à jour le fichier de version, commit, merge `--no-ff` sur `main`, supprime la branche. **Pauses si bloquants.** |
| 10 | `git push origin main` *(quand prêt à publier)* | manuel | — | Branche `main` publiée. |
| 11 | Quand tous les items de la version sont terminés : `/version-finalize {version}` | `.claude/commands/version-finalize.md` | Opus high | Bump, build, smoke-test, `CHANGELOG.md`, `/document-release`, archive du fichier de version, tag git. |

**Fichiers modifiés au cours du cycle** : `docs/roadmap.md`, `docs/backlog.md` (si `/backlog-bootstrap enrich`), `docs/version-{version}.md`, code source, tests, éventuellement schéma DB et migrations, `design/handoff/{ecran}.tsx` si l'item est `Pattern: custom`, `README.md` et docs utilisateur (via `/document-release` lors de la finalisation), éventuellement `docs/premortem/premortem-v{VERSION}-{date}.md`, éventuellement `docs/validation/cadrage-v{VERSION}-{date}.pdf`.

**Variantes** :
- Modification cosmétique simple → `/office-hours` peut être sauté.
- Backlog suffisamment fourni → sauter l'étape 3 (`/backlog-bootstrap enrich`).
- Pas de validation par donneur d'ordre → sauter l'étape 5 (qui n'est de toute façon utile qu'au premier item d'une nouvelle version).
- Version mineure ou peu risquée → sauter l'étape 4 ter (`/premortem version`). Réservé aux versions structurantes.
- **Item à pattern standard** (`Pattern: list | form | list+form`) → sauter l'étape 6 (`/design-screen-prompt`). L'écran est déjà couvert par `design/patterns/`. Si le pattern attendu n'a pas encore été produit, `/item-start` bloquera et te demandera de lancer `/design-patterns-bootstrap` d'abord.
- Item sans nouvel écran (`Pattern: aucun` — correction métier, refacto, ajout dans un écran existant) → sauter l'étape 6.
- Application sans UI → sauter `/qa` et `/design-screen-prompt`.
- Plusieurs items dans la version → reboucler entre les étapes 6 et 9 pour chaque item avant d'atteindre l'étape 11.
- Refonte significative du design system en cours de projet (nouveau `DESIGN.md` produit via Claude Design) → relancer `/design-system-adapt` avant les items qui consomment les nouveaux tokens (cycle parallèle, hors séquence d'item). Si les patterns doivent évoluer en conséquence : relancer `/design-patterns-bootstrap` (mode régénération ciblée) — la skill surface les écrans existants qui consomment chaque pattern modifié.
- Item touchant une entité scaffoldée (projet avec `scaffold/`) → `/item-start` déclenche `/scaffold` avant l'implémentation, et les sub-agents n'étendent que via le custom et les hooks. Voir *Variante scaffolder des cycles* plus bas.

---

## Cycle 3 — Modifier une fonctionnalité existante

**Quand l'utiliser** : refonte d'écran, changement de règle métier, optimisation visible d'un comportement existant.

**Pré-requis** : projet en route ; fonctionnalité à modifier identifiée.

**Séquence** :

| # | Étape | Chemin | Modèle | Sortie / pause |
|---|-------|--------|--------|----------------|
| 1 | `/investigate` | `.claude/commands/investigate.md` | Opus xhigh | Rapport read-only sur l'état actuel et la cause du comportement. **Pauses aux validations d'hypothèses.** |
| 2 | Décider : item de version (ce cycle) ou refonte importante (passer au Cycle 2) | manuel | — | Décision tracée. |
| 3 | Ajouter un item dans `docs/roadmap.md` ou directement dans la version active (avec son champ `Pattern`), basé sur les conclusions de `/investigate` | manuel | — | Item documenté. |
| 4 | `/design-screen-prompt` *(uniquement si la modification crée ou refait un écran sur-mesure — `Pattern: custom`)* | `.claude/commands/design-screen-prompt.md` | Opus high | Prompt à copier dans Claude Design pour adapter ou refondre l'écran. Le composant React produit est déposé dans `design/handoff/`. Pour les modifications d'écrans à pattern standard, aucune action ici — `/item-start` consomme directement le pattern existant. |
| 5 | `/item-start {version} {numero} {slug}` | `.claude/commands/item-start.md` | Opus xhigh | Sub-agents typiques : `feature-agent`, `test-agent`, parfois `component-agent` si composant partagé. **Plusieurs pauses.** |
| 6 | `/qa` *(recommandé)* | `.claude/commands/qa.md` | Opus high | Test du flux modifié + d'un flux adjacent pour détecter les régressions visibles. |
| 7 | `/item-finish {version} {numero}` | `.claude/commands/item-finish.md` | Opus high | `/code-review item` automatique, commit, merge, suppression de branche. |

**Fichiers modifiés au cours du cycle** : `docs/roadmap.md` ou `docs/version-{version}.md`, code source, tests, éventuellement `design/handoff/{ecran}.tsx`.

**Variantes** :
- Fix urgent en production → `/investigate` reste obligatoire, mais le cycle d'item peut être compressé (moins d'itérations, un seul commit).
- Modification purement métier sans impact UI (`Pattern: aucun` ou pattern inchangé) → sauter l'étape 4 (`/design-screen-prompt`).
- Modification d'un écran à pattern standard sans changement du pattern → sauter l'étape 4. L'écran sera réaligné par `feature-agent` qui consommera le pattern existant.

---

## Cycle 4 — Supprimer une fonctionnalité existante

**Quand l'utiliser** : fonctionnalité inutile, plus utilisée, ou à retirer pour simplifier le code.

**Pré-requis** : projet en route ; décision de suppression prise. Idéalement, `/office-hours feature` a permis de valider la suppression (YAGNI inversé : « que se passerait-il si on la gardait ? »).

**Séquence** :

| # | Étape | Chemin | Modèle | Sortie / pause |
|---|-------|--------|--------|----------------|
| 1 | `/investigate` | `.claude/commands/investigate.md` | Opus xhigh | Rapport read-only listant tous les usages : code applicatif, données DB, routes/handlers, imports, tests. **Pauses aux validations.** |
| 2 | Ajouter un item dédié dans `docs/roadmap.md` ou la version active, avec checklist : code retiré / schéma DB nettoyé (ou soft-delete) / routes supprimées / tests obsolètes retirés / doc utilisateur à jour | manuel | — | Item avec checklist documenté. |
| 3 | `/item-start {version} {numero} {slug}` | `.claude/commands/item-start.md` | Opus xhigh | Orchestre `feature-agent` (code applicatif), `migration-agent` (schéma DB si applicable), `test-agent` (tests obsolètes). **Plusieurs pauses.** |
| 4 | Avant `/item-finish` : en session principale, demander explicitement à Claude d'invoquer `release-audit-agent` avec ce prompt : « Invoque `release-audit-agent` et demande-lui de vérifier l'absence de toute référence orpheline à la fonctionnalité {nom} qui vient d'être supprimée. » | `.claude/agents/release-audit-agent.md` | Sonnet | Rapport de cohérence ciblé sur la suppression. |
| 5 | `/qa` *(recommandé)* | `.claude/commands/qa.md` | Opus high | Test d'un flux adjacent à celui supprimé pour vérifier l'absence de régression visible. |
| 6 | `/item-finish {version} {numero}` | `.claude/commands/item-finish.md` | Opus high | `/code-review item` automatique — vérifie qu'aucune référence orpheline ne subsiste, commit, merge. |

**Fichiers modifiés au cours du cycle** : `docs/roadmap.md` ou `docs/version-{version}.md`, code source (suppressions), schéma DB, migrations, tests, `README.md` et autres docs utilisateur.

**Variantes** :
- Suppression touchant plusieurs modules → découper en plusieurs items pour éviter un changement massif d'un coup.

---

## Variante scaffolder des cycles

Cette variante ne s'applique **que si le projet contient un dossier `scaffold/`** (signal d'activation
d'un scaffolder). Sans ce dossier, tous les cycles ci-dessus se déroulent à l'identique — toutes les
branches scaffolder sont inertes. Détail complet : `.claude/docs/scaffolder-integration.md`.

Quand un scaffolder est actif, les cycles s'enrichissent ainsi :

- **Cycle 1 (démarrer un projet)** — rappel de la distinction **template ≠ scaffolder** (cf. tableau
  « deux briques » du bloc *Pré-requis* du Cycle 1) : le **squelette** est d'abord construit par le
  template `template-{TYPE}.md` (`/project-start` étape 6) ; le scaffolder n'apporte **pas** de squelette,
  il s'y écrit ensuite. Une fois le squelette en place, `/project-start` (étape 6 bis) propose
  `/scaffolder-resolve`, qui cherche dans le catalogue deneb (`C:\Dev\Projets\deneb\scaffolders\`) un
  scaffolder correspondant à la stack, copie son **moteur** dans le projet (sans squelette) et crée
  `scaffold/`. On remplit ensuite `scaffold/csv/` (entités, champs, validations, relations), puis on
  lance `/scaffold` (le premier passage installe le runtime-kit). Si aucun scaffolder ne correspond,
  `/scaffolder-bootstrap` guide la création d'un nouveau scaffolder dans deneb. Si le template manque,
  `/template-bootstrap` le crée dans deneb (les deux briques se préparent en amont).
- **Cycles 2 & 3 (ajouter / modifier)** — quand un item touche une entité décrite dans
  `scaffold/csv/entities.csv`, `/version-start` (étape 3 ter) vérifie la cohérence du `Pattern` avec le
  `screenPattern` de l'entité, et `/item-start` (étape 2.4) déclenche `/scaffold` avant l'implémentation.
  Persistance, service, transport et pages de l'entité sont **générés** (`.base`) : les sub-agents
  n'étendent que via les fichiers custom et les 9 hooks du service custom, jamais les `.base`.
- **Clôture d'item** — `/item-finish` (étape 2 bis) vérifie la frontière généré/custom : aucun
  `*.base.*` édité à la main, et `/scaffold` rejoué produit un diff vide (idempotence).
- **Backlog** — `/backlog-bootstrap` (étape 4.0) suggère automatiquement les items CRUD à partir des
  entités présentes dans `scaffold/csv/`.
- **Patterns design** — `/design-patterns-bootstrap` ajoute au prompt Claude Design une exigence de
  compatibilité scaffolder (composants séparables, extraits une fois dans le runtime-kit puis instanciés
  par les pages générées — approche hybride).
- **Maintenance** — `/scaffold-sync` re-tire la dernière version du scaffolder depuis deneb (en
  préservant `scaffold/csv/`), sur demande explicite. Un scaffolder est figé par projet tant qu'on ne
  synchronise pas.

**Détection automatique** : l'appartenance d'une entité au scaffolder est dérivée par lecture de
`scaffold/csv/entities.csv` (colonne `name`), jamais saisie dans un fichier de version.

**État actuel** : le catalogue compte deux scaffolders — `electron-drizzle-sqlite-react` (desktop) et
`react-fastify-prisma-postgres-shadcn` (web). `/scaffolder-resolve` peut donc résoudre quand la stack
d'un projet matche l'un d'eux ; sinon il échoue proprement et oriente vers `/scaffolder-bootstrap`.
Côté templates de squelette, seuls `template-electron.md` et `template-full-stack.md` existent
aujourd'hui dans `Claude/templates/` ; pour tout autre type, lancer `/template-bootstrap`.

---

## Notes pratiques

- **Points d'arrêt** : chaque skill demande validation explicite à des moments précis. Ne jamais passer outre — c'est là que se jouent les ajustements de cap. Répondre `ok`, `go`, ou des consignes de correction, jamais le silence.
- **`feature-agent` vs `component-agent`** : le sub-agent invoqué demande explicitement quand le cas est ambigu. Règle simple : si le code touche un composant générique partagé entre modules, c'est `component-agent` (Opus) ; sinon, `feature-agent` (Sonnet). Les deux agents ont la même règle vis-à-vis des références design (`design/patterns/` et `design/handoff/`) : référence visuelle uniquement, jamais de drop-in (cf. section *Référence design* dans chaque agent).
- **`/office-hours`** : protection contre le scope creep et les fausses bonnes idées. À lancer même quand l'idée semble évidente — la friction de cinq minutes évite des semaines de mauvaise direction.
- **`/project-blueprint`** : protection contre les choix techniques solitaires. Comble le trou entre `/office-hours project` (qui ne donne aucun avis) et `/project-start` (qui exige les sections techniques déjà remplies). À sauter seulement quand la stack et l'architecture sont évidentes et déjà décidées.
- **`/premortem`** : protection contre les angles morts avant engagement. Se projette à 6 mois après un échec *acté* et remonte ses causes via `premortem-agent` (un agent par mode d'échec, en parallèle). Deux scopes : `project` (avant `/project-start`, après que `project-description.md` est complète) et `version {VERSION}` (après `/version-start`, avant `/document-validation`). N'écrit qu'un rapport dans `docs/premortem/` ; toute révision du cadrage est proposée en diff et appliquée seulement sur décision explicite. À réserver aux engagements structurants (projet entier, version importante).
- **`/document-validation`** : protection contre les malentendus avec le donneur d'ordre. À utiliser au démarrage d'un projet (scope `project`) pour formaliser le cadrage initial, et avant les versions importantes (scope `version {VERSION}`) pour formaliser ce qui sera développé. Le PDF est à transmettre, signer ou valider par email avant le développement.
- **`/design-system-bootstrap`, `/design-patterns-bootstrap` et `/design-screen-prompt`** : ces trois skills ne génèrent pas de design — elles produisent des prompts à copier dans Claude Design (https://claude.ai/design). Le travail design lui-même se fait là-bas. Aucune des trois n'écrit dans le projet.
  - `/design-system-bootstrap` est appelée une fois après `/project-start` (si projet avec UI). Produit `DESIGN.md` et `design/handoff/`.
  - `/design-patterns-bootstrap` est appelée juste après, idéalement dans la même conversation Claude Design pour préserver la cohérence visuelle. Produit les 3 fichiers de `design/patterns/` (list, form, list+form). Mode régénération ciblée disponible plus tard pour faire évoluer un pattern unique.
  - `/design-screen-prompt` est appelée avant `/item-start` UNIQUEMENT pour les items marqués `Pattern: custom` — les items à pattern standard consomment directement les fichiers de `design/patterns/` produits en amont.
- **`/design-system-adapt`** : pontage entre les fichiers produits par Claude Design (`DESIGN.md`, `design/handoff/`) et le code projet réel (TypeScript + Tailwind + shadcn). Contrairement à `/design-system-bootstrap` (qui ne produit qu'un prompt et n'écrit nulle part), cette skill **écrit** dans le projet : `src/renderer/src/styles/index.css` (CSS variables shadcn), `tailwind.config.js` (palette brand + radii custom), `components.json` si manquant, et stubs `.tsx` dans `src/renderer/src/components/ui/` pour les composants sans équivalent shadcn natif. Idempotente : rejouable si `DESIGN.md` change. À lancer une fois après le dépôt initial de `DESIGN.md` ; à rejouer ensuite à chaque évolution significative du design system. Mode `--dry-run` disponible pour prévisualiser les changements sans rien écrire.
- **`/backlog-bootstrap`** : amorce (`init`) ou enrichit (`enrich`) le backlog. Mécanisme de validation à 4 options (garder / reformuler / différer / écarter) avec section *Items différés* qui sert de mémoire institutionnelle. Les items différés sont automatiquement reconsidérés à chaque `/backlog-bootstrap enrich`, ce qui leur donne une seconde chance quand le contexte évolue.
- **`/investigate`** : protection contre les fix au hasard. **Aucun fix sans investigation préalable**, même quand la cause semble évidente. Le rapport reste utile a posteriori pour documenter la décision.
- **`/qa`** : protection contre les régressions visibles que les tests unitaires manquent. Tests automatisés et `/qa` se complètent — ne jamais considérer l'un comme substitut de l'autre.
- **Intégration GitHub dans `/project-start`** : la skill propose désormais (à son étape 8) de créer un dépôt GitHub privé sous `mpdev42` et de pousser le commit init. C'est optionnel mais fortement recommandé. Pré-requis : `gh` CLI installé et SSH configuré pour GitHub (la skill détecte les manquants et donne les instructions Windows 11).
- **Sources figées du design** : `DESIGN.md`, `design/patterns/` et `design/handoff/` sont des sources de vérité **figées** une fois en place. Aucune skill ni aucun agent autre que celles qui les produisent (`/design-system-bootstrap`, `/design-patterns-bootstrap`, `/design-screen-prompt`) ne les modifie. Pour faire évoluer le design : régénérer via la skill correspondante (mode régénération ciblée pour les patterns), puis rejouer `/design-system-adapt` si les tokens ont changé. La régénération ciblée d'un pattern surface aussi les écrans existants qui le consomment — voir `/design-patterns-bootstrap` étape 6.
- **Champ `Pattern` dans les items de version** : posé par `/version-start` (et par édition manuelle au cas 4b du Cycle 2). Valeurs : `list`, `form`, `list+form`, `custom`, `aucun`. Lu par `/item-start` qui résout la valeur en chemin(s) de fichier dans `design/patterns/` ou `design/handoff/`, et passe la référence aux sub-agents UI. Bloque si le fichier attendu manque.
- **Scaffolder (couche optionnelle)** : si le projet contient un dossier `scaffold/`, voir la section *Variante scaffolder des cycles* ci-dessus et `.claude/docs/scaffolder-integration.md`. Sans ce dossier, la stack se comporte exactement comme décrit dans les cycles standards — toutes les branches scaffolder sont inertes.
