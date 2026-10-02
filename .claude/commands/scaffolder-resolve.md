---
model: opus
effort: high
---

# /scaffolder-resolve — Résoudre un scaffolder du catalogue deneb

Cherche, dans le catalogue de scaffolders de deneb, un scaffolder qui matche la stack du projet
courant, et copie son dossier dans le projet — créant ainsi le dossier `scaffold/` qui sert de
signal d'activation. Typiquement appelée pendant `/project-blueprint` ou `/project-start`.

Voir `.claude/docs/scaffolder-integration.md` pour le contexte d'ensemble.

---

## Bloc de confirmation modèle

<instructions>
Avant toute action, affiche ce bloc et attends ma confirmation explicite. Ne continue pas sans réponse.

> Cette skill est prévue pour tourner en **Opus** avec un effort **`high`**.
> Si ce n'est pas ton réglage actif, tape `/model opus` et/ou `/effort high` avant de répondre `ok`.

Attends ma réponse. Ne continue pas.
</instructions>

## Chemin canonique de deneb

Le catalogue des scaffolders vit dans deneb, au chemin canonique :

```
C:\Dev\Projets\deneb\scaffolders\
```

Chaque sous-dossier (hors `_shared/`) est un scaffolder niveau 2. Si ce chemin n'existe pas sur la
machine, signale-le et arrête-toi — deneb est introuvable, la résolution est impossible.

## Étape 1 — Déterminer la stack du projet

Lis, dans cet ordre, ce qui existe :
1. `CLAUDE.md` à la racine du projet (section stack technique / architecture).
2. À défaut, `docs/project-description.md` (section Stack).

Extrais les **axes de stack** du projet, selon la granularité des scaffolders (4-5 axes) :
méta-framework, ORM, base de données, framework UI, couche transport.

<instructions>
Si tu ne peux pas déterminer un axe avec certitude, ne devine pas : affiche les axes que tu as
identifiés et demande-moi de compléter les manquants. Attends ma réponse avant de continuer.
</instructions>

## Étape 2 — Énumérer le catalogue

Liste les sous-dossiers de `C:\Dev\Projets\deneb\scaffolders\` en excluant `_shared/`. Pour chacun,
lis son `scaffolder.yaml` et relève : `slug`, `version`, et le bloc `stack` (les axes supportés).

<instructions>
**Cas catalogue vide.** Si aucun sous-dossier de scaffolder n'existe (hors `_shared/`), affiche :

> Le catalogue de scaffolders de deneb est actuellement vide — aucun scaffolder vers lequel résoudre.
> Pour créer un scaffolder adapté à cette stack, lance `/scaffolder-bootstrap`. Le projet continue
> sans scaffolder (la stack Claude fonctionne en mode classique).

Sors de la skill. (C'est le comportement attendu dans l'état actuel du catalogue.)
</instructions>

## Étape 3 — Matcher la stack

Compare les axes du projet (étape 1) aux axes `stack` de chaque scaffolder (étape 2).

<instructions>
- **Match complet** (tous les axes connus du projet correspondent) : présente le scaffolder candidat
  (slug, version, axes) et demande validation avant copie.
- **Match partiel ou plusieurs candidats** : présente le ou les candidats avec, pour chacun, les axes
  qui correspondent et ceux qui divergent. Demande-moi lequel utiliser, ou si je préfère créer un
  nouveau scaffolder via `/scaffolder-bootstrap`.
- **Aucun match** : affiche :

  > Aucun scaffolder du catalogue ne correspond à la stack du projet ({rappel des axes}).
  > Lance `/scaffolder-bootstrap` pour en créer un à partir de la spec niveau 1.

  Sors de la skill.

Attends ma validation explicite avant toute copie. Ne copie rien sans réponse.
</instructions>

## Étape 4 — Copier le scaffolder dans le projet

Copie le contenu de `C:\Dev\Projets\deneb\scaffolders\{slug}\` vers `scaffold/` à la racine du projet.

<instructions>
Copie ce qui est nécessaire pour faire tourner la génération : `scaffolder.yaml`, `templates/`,
`scripts/`, `runtime-kit/`, `docs/`, `README.md`, et les fichiers de configuration du moteur
(`package.json`, `tsconfig.json`, `.prettierrc.json` s'ils existent).

**Exclus** le harnais de développement/test du scaffolder : `node_modules/`, `examples/`,
`target-template/`, les lockfiles (`pnpm-lock.yaml`, etc.), `build-smoke.ps1`, et tout artefact de
build. En cas de doute sur un élément, demande-moi.

Si `scaffold/` existe déjà : ne l'écrase pas silencieusement. Signale-le et propose plutôt
`/scaffold-sync` (mise à jour d'un scaffolder déjà résolu).
</instructions>

## Étape 5 — Initialiser le dossier de CSV niveau 3

Assure-toi que `scaffold/csv/` existe. S'il est absent ou vide, crée les **4 fichiers CSV** du format
niveau 3 avec **uniquement leur ligne d'en-tête** (l'utilisateur les remplira) :
`entities.csv`, `fields.csv`, `validations.csv`, `relations.csv`. Les en-têtes exactes sont définies
dans `scaffolders/_shared/entity-description-format.md` (et complétées par les
`extensionColumns` éventuelles du `scaffolder.yaml`). Encodage UTF-8 avec BOM, délimiteur `;`.

## Étape 6 — Rapport et suite

Affiche un récapitulatif :
- Scaffolder résolu (slug, version) et axes matchés.
- Contenu copié dans `scaffold/` ; fichiers CSV initialisés dans `scaffold/csv/`.
- Rappel : la présence de `scaffold/` **active** désormais le scaffolder pour ce projet.

Puis indique la suite :

> Prochaines étapes :
> 1. Décris tes entités dans `scaffold/csv/` (entities, fields, validations, relations).
> 2. Lance `/scaffold` pour générer le code (premier passage : installe aussi le runtime-kit).
>
> Détail du format des CSV : `scaffold/` (ou `scaffolders/_shared/entity-description-format.md` dans deneb).
