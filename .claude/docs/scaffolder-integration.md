# Intégration du scaffolder dans la stack Claude

Document de référence du chantier d'intégration scaffolder / stack Claude. Décrit **comment** un
scaffolder s'articule avec les skills et les agents de la stack : détection, déclenchement,
frontière généré/custom, les 3+1 skills, cycle de vie. À lire avant de toucher à une skill ou un
agent « enrichi conditionnellement » pour le scaffolder.

> **Règle d'or de tout ce document.** Le scaffolder est une **couche optionnelle**. Sans dossier
> `scaffold/` à la racine d'un projet, la stack se comporte **exactement comme sans ce document**.
> Toute intégration décrite ici est une **branche conditionnelle** ; elle ne s'active qu'en présence
> de `scaffold/`. Aucun comportement par défaut n'est modifié, remplacé ou réécrit.

---

## 1. Rôle et place dans la stack

deneb a deux rôles : faire évoluer la **stack Claude** (dossier `Claude/`) et maintenir un
**catalogue de scaffolders** (dossier `scaffolders/`). Un scaffolder est un générateur de code CRUD
décrit sur **trois niveaux** :

- **Niveau 1 — spec abstraite** (`scaffolders/_shared/spec.md`) : ce qu'un scaffolder doit savoir
  faire, indépendamment de toute stack.
- **Niveau 2 — implémentation** (`scaffolders/{stack}/`) : templates et scripts concrets pour une
  stack précise (méta-framework + ORM + base + UI + transport).
- **Niveau 3 — format de description** (`scaffolders/_shared/entity-description-format.md`) : le
  format multi-CSV que l'utilisateur remplit dans son projet pour décrire ses entités.

deneb est donc à la fois la **source** de la stack Claude (les skills/agents copiés dans chaque
projet) **et** le **catalogue** des scaffolders. Les skills d'intégration ont besoin de connaître le
**chemin canonique** de deneb pour résoudre, copier ou synchroniser un scaffolder :

```
C:\Dev\Projets\deneb
```

Ce chemin est déclaré dans le `~/.claude/CLAUDE.md` global pour être retrouvable depuis n'importe
quel projet.

---

## 2. Signal d'activation

La présence du dossier **`scaffold/`** à la racine d'un projet utilisateur indique que le scaffolder
y est **actif**. Ce dossier est créé par `/scaffolder-resolve` (qui y copie le scaffolder du
catalogue). Sans `scaffold/`, le scaffolder n'est pas actif et la stack fonctionne en mode classique.

C'est l'unique signal. Aucune skill ni aucun agent ne suppose la présence d'un scaffolder ; chacun
**teste l'existence de `scaffold/`** avant d'activer sa branche scaffolder.

---

## 3. Anatomie d'un projet scaffoldé

```
projet-utilisateur/
├── scaffold/                  # le scaffolder copié depuis deneb (signal d'activation)
│   ├── scaffolder.yaml        # axes de stack, version, mapping artefacts, generateCommand
│   ├── templates/             # un template par artefact canonique
│   ├── scripts/               # moteur de génération (parse CSV, valide, tri topo, rend, écrit)
│   └── csv/                   # NIVEAU 3 — rempli par l'utilisateur
│       ├── entities.csv       # une ligne par entité
│       ├── fields.csv         # une ligne par champ
│       ├── validations.csv    # une ligne par règle
│       └── relations.csv      # une ligne par relation N-N
├── src/                       # code applicatif
│   ├── …/{e}.service.base.ts  # GÉNÉRÉ (réécrit à chaque passe) — ne jamais éditer
│   ├── …/{e}.service.ts       # CUSTOM (créé une fois, jamais réécrit)
│   └── …                      # + runtime-kit installé une fois (voir §9)
└── …
```

- **`scaffold/`** est re-synchronisable depuis deneb via `/scaffold-sync` ; on ne l'édite pas à la
  main (sauf le contenu de `scaffold/csv/`, qui appartient à l'utilisateur).
- **`scaffold/csv/`** est la **source de vérité** des entités scaffoldées. C'est ce que lisent les
  skills/agents pour savoir quelles entités sont scaffoldées (voir §5).
- Le **runtime-kit** est une couche d'infrastructure partagée installée **une seule fois** dans
  `src/` à la première génération (voir §9).

---

## 4. Frontière généré / custom

La frontière passe **par fichier**, portée par le **nom** :

| Forme du nom | Statut | Règle |
|---|---|---|
| `*.base.{ext}` (ex. `equipment.service.base.ts`) | **100 % généré** | Réécrit intégralement à chaque génération. **Ne jamais éditer.** |
| `*.{ext}` sans `.base` (ex. `equipment.service.ts`) | **100 % custom** | Créé une seule fois, **jamais réécrit**. |

Un fichier est soit entièrement généré, soit entièrement custom — **jamais un mélange**. Les
mécanismes d'extension qui en découlent :

- **Service** : `{e}.service.base.ts` (généré) expose une classe de base CRUD + **9 hooks** ;
  `{e}.service.ts` (custom) hérite de cette classe, surcharge les hooks et porte la logique métier
  non-CRUD. Les 9 hooks :

  ```
  beforeValidate · beforeCreate · afterCreate · beforeUpdate · afterUpdate
  beforeDelete · afterDelete · beforeFind · afterFind
  ```

  Sémantique transparente par défaut ; lever une exception dans un hook annule l'opération. La
  logique métier non-CRUD est une **méthode publique du service custom**, pas un fichier à part.

- **Écrans** : frontière **déclarative** au niveau 3 via `listMode` / `formMode` (`standard` ⇒ le
  scaffolder génère le composant `.base` ; `custom` ⇒ il ne génère **rien**, le développeur écrit le
  composant à la main). Pas d'éjection, pas de slot.

- **Agrégateurs** (barrel de schéma, registre transport, contrat client, pont preload, routing,
  navigation) : chaque agrégateur `.base` est **régénéré par énumération** des entités et importe un
  **fichier compagnon custom** (sans `.base`, créé une fois) où vivent les ajouts hors scaffolder.

**Conséquence pour les agents et les skills** : en présence de `scaffold/`, ne **jamais** modifier
un fichier `*.base.*`, ni restructurer le schéma d'une entité scaffoldée, ni toucher au runtime-kit.
Toute extension passe par les fichiers custom, les hooks, ou l'édition des CSV suivie de `/scaffold`.

---

## 5. Détection des entités scaffoldées

L'algorithme est défini **une fois ici** et cité (non recopié divergent) par toutes les branches
conditionnelles :

- **Projet scaffoldé** ⇔ le dossier `scaffold/` existe à la racine.
- **Entité scaffoldée** ⇔ son nom figure dans la colonne `name` de `scaffold/csv/entities.csv`
  (CSV délimité par `;`, UTF-8 **avec BOM** — retirer le BOM avant comparaison).
- Un **item de version « touche » une entité scaffoldée** quand son titre ou sa description mentionne
  ce `name` (ou ses libellés `listTitle` / `menuTitle`).

La détection est **dérivée par lecture des CSV**, jamais saisie. Il n'y a **aucun champ** « cette
entité est scaffoldée » dans les fichiers de version ou ailleurs.

---

## 6. Vocabulaire des patterns d'écran

Le vocabulaire de la stack a été **aligné** sur celui du scaffolder (chantier d'intégration, voir
aussi `spec.md` §3). Les 5 valeurs du champ `Pattern` d'un item de version :

| `Pattern` (stack) | `screenPattern` (scaffolder) | Sens |
|---|---|---|
| `list` | `list` | liste seule (lecture/sélection), aucun formulaire |
| `form` | `form` | liste + formulaire sur écrans **séparés** (CRUD par défaut) |
| `list+form` | `list+form` | liste + formulaire sur le **même** écran |
| `custom` | — | écran sur-mesure (dashboard, wizard, composite…), **jamais généré** |
| `aucun` | — (entité backend-only) | pas d'écran |

Le mapping est une **identité** sur `list` / `form` / `list+form` ; `custom` et `aucun` sont des
extensions de la stack que le scaffolder ne génère pas. En présence de `scaffold/`, le `Pattern`
déclaré pour un item touchant une entité scaffoldée **doit** correspondre au `screenPattern` de cette
entité dans `entities.csv` — un écart est un avertissement de cohérence (voir `/version-start`).

---

## 7. Les 3+1 skills

Toutes vivent dans `Claude/commands/` (copiées dans `.claude/commands/` des projets). Les trois
premières connaissent le **chemin canonique** de deneb ; la quatrième opère dans le projet.

| Skill | Rôle | Déclenchement |
|---|---|---|
| `/scaffolder-resolve` | Cherche dans le catalogue `scaffolders/{stack}/` de deneb un scaffolder qui matche la stack du projet, et **copie son dossier** dans le projet → crée `scaffold/`. | Pendant `/project-blueprint` ou `/project-start`. |
| `/scaffolder-bootstrap` | Si aucun scaffolder ne matche : guide la **création** d'un nouveau scaffolder dans deneb à partir de la spec niveau 1 (réutilise `scaffolders/_shared/scaffolder-bootstrap-prompt.md`). | Quand `/scaffolder-resolve` ne trouve rien. |
| `/scaffold-sync` | Re-tire la dernière version d'un scaffolder depuis deneb dans un projet existant, en **préservant `scaffold/csv/`**. | Sur demande explicite. |
| `/scaffold` | Déclenche la **génération** depuis le niveau 3 (lit les CSV, valide, trie, écrit les `.base`, préserve le custom, régénère les agrégateurs). Premier passage : installe le runtime-kit. | Manuel, ou automatiquement par `/item-start` pour une entité scaffoldée. |

`/scaffold` orchestre la génération mais **ne réimplémente pas** le moteur : la génération réelle est
le script propre du scaffolder (`generateCommand` de `scaffolder.yaml`, ex. `pnpm run scaffold`)
vivant dans `scaffold/scripts/`.

**Pendant côté squelette : `/template-bootstrap`.** Ne pas confondre le scaffolder (moteur CRUD, par
**stack**, créé par `/scaffolder-bootstrap`) avec le **template de squelette** `template-{TYPE}.md`
(recette du squelette, par **type** de projet, créé par `/template-bootstrap` et consommé par
`/project-start` à son étape 6). Le template **construit** le squelette ; le scaffolder **s'y écrit**.
Pour une stack qui vise un scaffolder, le template doit produire la structure que ce scaffolder attend
(son `README §Installation`). Les deux briques se préparent en amont, dans deneb.

> **Garde-fou layout (projet scaffoldé).** La section *Architecture* du `project-description.md`
> **décrit** le rangement de la persistance — par entité : `apps/api/src/modules/{e}/…`, la **factory de
> repositories** (`modules/repository-factory.base.ts`/`.ts`), et l'infra ERP partagée (`shared/erp/`) —
> mais elle ne le **prescrit pas** au template : ce layout **fait foi côté scaffolder**. Le template ne
> matérialise **jamais** ces dossiers (cf. `template-full-stack.md` §1 « Adaptations conditionnelles » et
> piège §7.1) ; il ne crée que les couches **hors entités scaffoldées** (jobs, auth custom, intégrations).
> Corollaire pour l'auteur d'un `project-description.md` : ne pas redessiner à la main le layout interne
> du scaffolder — au mieux le **décrire** en renvoyant au scaffolder, pour qu'aucun écart ne réapparaisse.

---

## 8. Cycle de vie dans les cycles de développement

Rappel : ces étapes ne s'activent que si `scaffold/` existe (ou, pour la résolution, si la stack
matche un scaffolder du catalogue). Détail des branches dans `cycles-de-developpement.md`, section
« Variante scaffolder des cycles ».

1. **Cycle 1 (démarrer un projet)** — le **squelette** est d'abord construit par le template
   `template-{TYPE}.md` (`/project-start` étape 6) ; **le scaffolder n'apporte pas de squelette**. Une
   fois le squelette en place, `/project-start` propose `/scaffolder-resolve`. Si un scaffolder matche,
   son **moteur** est copié → `scaffold/` naît. L'utilisateur remplit `scaffold/csv/`, puis lance
   `/scaffold` (qui installe le runtime-kit au premier passage).
2. **Cycle 2/3 (ajouter / modifier une fonctionnalité)** — quand un item touche une entité
   scaffoldée (§5), `/item-start` déclenche `/scaffold` avant l'implémentation. Les pages étant
   générées, les agents n'étendent que via le custom et les hooks.
3. **Clôture d'item** — `/item-finish` vérifie la frontière : aucun `*.base.*` modifié à la main,
   idempotence (re-jouer `/scaffold` produit un diff vide).
4. **Maintenance** — `/scaffold-sync` re-tire le scaffolder depuis deneb quand sa version évolue
   (philosophie : un scaffolder est **figé par projet** tant qu'on ne synchronise pas explicitement).

---

## 9. Approche hybride des patterns design

Le scaffolder **régénère des pages** (`.base`) à chaque passe ; or une maquette Claude Design
contient des choix visuels qu'on ne veut pas perdre à la régénération. Le modèle hybride résout la
tension :

1. **Claude Design produit les maquettes** de patterns (`design/patterns/list.tsx`, `form.tsx`,
   `list+form.tsx`) — coquilles visuelles self-contained, anonymes.
2. **Extraction unique** : à l'installation, les composants visuels réutilisables sont extraits
   **une seule fois** de ces maquettes vers le **runtime-kit** (couche custom, créée une fois,
   qui **survit aux régénérations**).
3. **Instanciation régénérée** : les pages `.base` générées par le scaffolder **instancient** les
   composants du runtime-kit avec les vrais champs de chaque entité. La régénération réécrit les
   pages `.base`, mais le runtime-kit (et donc l'identité visuelle) reste stable.

Les maquettes de `design/patterns/` restent des **références figées** (au même titre que `DESIGN.md`
et `design/handoff/`) : elles nourrissent l'extraction initiale, elles ne sont pas régénérées par le
scaffolder. Le scaffolder de contrôle `electron-drizzle-sqlite-react` a servi à valider ce modèle via
son `runtime-kit/` **avant** d'être sorti du dépôt (cf. §11) ; le principe en reste acquis. Il est
**conceptuel** et ne dépend pas d'une stack ; chaque scaffolder niveau 2 l'implémente avec les outils
de sa stack.

---

## 10. Rétrocompatibilité stricte

Forme standard d'une branche conditionnelle, à respecter dans chaque fichier enrichi :

- **Skills / docs** : une sous-section dédiée, ouverte par le garde *« Cette section ne s'applique
  que si le dossier `scaffold/` existe à la racine. Sinon, ignore-la entièrement : le comportement
  par défaut ci-dessus reste inchangé. »*
- **Agents** : une puce dans « Limites strictes », préfixée `(Si `scaffold/` existe)`.

Cas particulier : `/project-start` est l'endroit où `scaffold/` **naît**. Sa branche n'est donc pas
gardée par « si `scaffold/` existe » mais par « proposer la résolution d'un scaffolder » (qui crée
`scaffold/`).

Le **renommage du vocabulaire des patterns** (`master-detail`/`dashboard` retirés, `form`/`list+form`
réalignés) est, lui, un changement de **cœur, non conditionnel** : il s'applique à tous les projets.
La mise à jour d'un projet existant vers ce nouveau vocabulaire est une **analyse de migration
délibérée** (à demander à Claude au cas par cas), jamais une réinterprétation silencieuse.

---

## 11. État actuel et limites

- **Le catalogue compte deux scaffolders** : `electron-drizzle-sqlite-react` (stack desktop — cœur
  suivi par git, ses harnais de vérification `examples/` restant gitignorés) et
  `react-fastify-prisma-postgres-shadcn` (stack web). `/scaffolder-resolve` peut donc désormais
  résoudre vers un scaffolder quand la stack d'un projet correspond.
- **Ce qui reste à valider de bout en bout en conditions réelles** : la copie par `/scaffolder-resolve`,
  la synchronisation par `/scaffold-sync`, la génération par `/scaffold` dans un vrai projet,
  l'installation du runtime-kit et l'idempotence à l'échelle du projet. Le moteur de chaque scaffolder
  est vérifié isolément (génération, idempotence, préservation du custom, validation pré-génération) ;
  le build complet de l'app cible reste l'étape de smoke suivante.
- La stack reste **pleinement fonctionnelle sans scaffolder** : toutes les branches d'intégration
  sont inertes en l'absence de `scaffold/`.

---

## Voir aussi

- `cycles-de-developpement.md` — section « Variante scaffolder des cycles ».
- `scaffolders/_shared/spec.md` — spec niveau 1 (artefacts, frontière, garanties).
- `scaffolders/_shared/entity-description-format.md` — format niveau 3 (les 4 CSV).
- `scaffolders/_shared/scaffolder-bootstrap-prompt.md` — recette de création d'un scaffolder.
- Skills : `/scaffolder-resolve`, `/scaffolder-bootstrap`, `/scaffold-sync`, `/scaffold`.
