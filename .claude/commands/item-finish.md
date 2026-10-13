---
model: opus
effort: high
---

# /item-finish — Terminer un item de version

Arguments attendus : `{version} {numéro}` (ex : `1.2.0 3`).

---

## Bloc de confirmation modèle

<instructions>
Avant toute action, affiche ce bloc et attends ma confirmation explicite. Ne continue pas sans réponse.

> Cette skill est prévue pour tourner en **Opus** avec un effort **`high`**.
> Si ce n'est pas ton réglage actif, tape `/model opus` et/ou `/effort high` avant de répondre `ok`.

Attends ma réponse. Ne continue pas.
</instructions>

## Arguments

Depuis `$ARGUMENTS`, extrais :
- `VERSION` — ex : `1.2.0`
- `ITEM` — numéro de l'item, ex : `3`

La branche courante suit le pattern `v{VERSION}/item-{ITEM}-{SLUG}` (le slug a été défini lors de `/item-start`).

## Étape 1 — Vérification préalable

Lis `CLAUDE.md`.

<instructions>
Si le projet déclare une précondition avant les opérations git (par exemple : application desktop fermée, processus serveur arrêté, fichier DB non verrouillé), affiche un rappel explicite et attends ma confirmation.

Si aucune précondition n'est déclarée, passe directement à l'étape suivante.
</instructions>

## Étape 2 — Vérifications qualité

Récupère depuis `CLAUDE.md` la commande de test et la commande de lint. Exécute-les dans cet ordre :

```bash
{commande test depuis CLAUDE.md}
{commande lint depuis CLAUDE.md}
```

<instructions>
- Si les tests échouent : diagnostique et corrige (orchestre `test-agent` ou un autre sub-agent adapté). Relance les tests jusqu'à passage.
- Si le lint échoue : exécute la commande de fix auto si elle est déclarée dans `CLAUDE.md`. Puis relance le lint pour vérifier. S'il reste des erreurs non corrigeables automatiquement, diagnostique et corrige.
- Ne passe à l'étape suivante que quand les deux commandes passent.
</instructions>

## Étape 2 bis — (Conditionnel — projet scaffoldé) Vérification de la frontière généré/custom

<instructions>
Cette étape ne s'applique que si le dossier `scaffold/` existe à la racine. Sinon, ignore-la
entièrement : le comportement par défaut reste inchangé.

Vérifie que la frontière généré/custom a été respectée (voir
`.claude/docs/scaffolder-integration.md` §4) :

1. **Aucun fichier `*.base.*` modifié à la main.** Inspecte le diff de l'item sur les `.base` :

   ```bash
   git diff --name-only main...HEAD -- "*.base.*"
   ```

   S'il en apparaît, ils ne doivent l'être que parce que `/scaffold` les a régénérés à partir d'un
   changement des CSV — jamais à cause d'une édition manuelle. En cas de doute, signale les fichiers
   concernés et demande-moi confirmation avant de continuer.

2. **Idempotence.** Si l'item touchait une entité scaffoldée, relance `/scaffold` : la génération doit
   produire un **diff vide** (le niveau 3 n'a pas changé depuis la dernière génération). Si le diff
   n'est pas vide, c'est qu'un `.base` avait été édité à la main ou que la génération n'avait pas été
   rejouée — corrige avant de commiter.

Tu ne fais que vérifier : n'altère pas le custom et ne touche pas aux CSV à cette étape.
</instructions>

## Étape 3 — Revue de code de l'item

Lance `/code-review item`.

## Étape 4 — Traitement des bloquants

<context>
Définition d'un bloquant pour une revue d'item :
- Verdict du rapport = `BLOQUÉ`
- OU au moins un point en section 2 (Points bloquants)
- OU un point en section 7 (Gestion d'erreurs) avec risque qualifié d'élevé
- OU un point en section 8 (Analyse d'impact) avec un appelant cassé
</context>

<instructions>
Si la revue ne signale aucun bloquant : passe à l'étape suivante.

Si la revue signale au moins un bloquant : présente le rapport et demande :

> "Bloquant(s) détecté(s). Choisis :
> - `corriger` — sortir de la skill et corriger
> - `ignorer <justification>` — continuer en notant la justification
> - `annuler` — abandonner la skill"

Traitement de la réponse :

- `corriger` : sors de la skill. Ne continue pas, ne commit pas.
- `annuler` : sors de la skill.
- `ignorer <justification>` :
  - Si la justification est vide ou se résume au mot "ignorer" sans contexte, redemande : "La justification est obligatoire. Pourquoi acceptes-tu d'ignorer ce(s) bloquant(s) ?". Attends une vraie justification.
  - Une fois la justification reçue, ouvre `docs/version-{VERSION}.md` et trouve l'item {ITEM}. Si la rubrique "Bloquants ignorés" n'existe pas sous l'item, crée-la. Ajoute la justification suivie d'un timestamp ISO (date du jour avec heure si possible). Format :

    ```
    Bloquants ignorés :
    - {timestamp ISO} — {justification}
    ```

    Si la rubrique existe déjà (cas où un bloquant a été ignoré lors d'une exécution précédente sur le même item), ajoute la nouvelle entrée à la suite des entrées existantes, en conservant l'ordre chronologique.
  - Garde la justification en mémoire pour la rappeler dans le résumé final (étape 9).
  - Continue à l'étape suivante.
</instructions>

## Étape 5 — Mettre à jour le fichier de version

Dans `docs/version-{VERSION}.md`, trouve l'item {ITEM} et change son statut :
- `À faire` → `Terminé`

Note dans le même fichier les décisions importantes prises pendant l'implémentation (choix techniques retenus, cas particuliers rencontrés, limitations découvertes). Si rien à noter, n'ajoute rien.

### Points ouverts

<context>
Règle : aucun point ouvert ne doit exister seulement dans le chat. Le fichier de version garde l'historique et le détail ; `docs/backlog.md` porte la liste d'actions, qui survit à l'archivage du fichier de version par `/version-finalize`. Les « Points reportés » sont des actions techniques ou des décisions issues d'un item livré — à ne pas confondre avec la section « Items différés » de `/backlog-bootstrap`, qui recense des idées de fonctionnalités écartées.
</context>

<instructions>
Recense les points ouverts de l'item :
- points non bloquants du rapport `/code-review item` de l'étape 3 (section 3 Points d'attention, 4 Qualité UI, 5 Qualité des tests, 6 Questions ouvertes, et points des sections 7 et 8 qui ne sont pas des bloquants) ;
- limitations découvertes et décisions reportées pendant l'implémentation ;
- points déjà notés sous l'item {ITEM} dans `docs/version-{VERSION}.md` pendant `/item-start`.

Le détail de chaque point est noté sous l'item {ITEM} dans `docs/version-{VERSION}.md`. Classe ensuite chaque point dans l'un des trois cas suivants :

1. **Pour un item suivant de la même version** : rubrique « Point d'attention pour l'item N » sous l'item {ITEM} (l'item qui soulève le point), dans `docs/version-{VERSION}.md`. Rien dans le backlog : `/item-start` de l'item N le retrouvera.
2. **Pour plus tard** (une autre version, un module ou un service, une dette technique sans échéance) : en plus du détail dans le fichier de version, une entrée dans `docs/backlog.md`, section « Points reportés ».
   - Entrées groupées par cible, une sous-section par cible : une version de la roadmap (`### v0.3.0 — {titre}`, titre repris de `docs/roadmap.md` s'il y figure), un module ou un service (`### Service {nom}`, `### Module {nom}`), ou `### Dette technique (sans échéance)`.
   - Une entrée tient en 1 ou 2 lignes : l'action, le fichier concerné et l'origine. Le détail reste dans le fichier de version, sans être dupliqué.
3. **Question pour l'utilisateur ou pour le métier** : une entrée dans `docs/backlog.md`, section « Questions ouvertes », même format que ci-dessus (fichier omis s'il n'y en a pas).

Format d'une entrée de backlog :

```
- {action ou question} — `{fichier}` (v{VERSION}, item {ITEM})
```

Si la section « Points reportés » n'existe pas dans `docs/backlog.md`, crée-la (après « Questions ouvertes ») avec cette note :

```markdown
## Points reportés

> Actions techniques et décisions issues d'items livrés, reportées hors de leur version.
> Une entrée = l'action, le fichier concerné, l'origine. Le détail reste dans le fichier de
> version d'origine (`docs/version-{X}.md`, puis `docs/archives/` une fois la version finalisée).
> Ne pas confondre avec « Items différés » (idées de fonctionnalités écartées par `/backlog-bootstrap`).
```

Crée de même la sous-section cible ou la section « Questions ouvertes » si elles manquent, et `docs/backlog.md` lui-même s'il est absent (titre `# Backlog — {nom du projet}` puis la section nécessaire).

Avant de passer à l'étape 6, vérifie que chaque point recensé est écrit à l'un de ces emplacements. Mémorise la liste `{point → emplacement}` (pour les étapes 6 et 9) et le fait que `docs/backlog.md` a été modifié ou non.

Si aucun point ouvert n'a été relevé, n'écris rien et passe à l'étape suivante.
</instructions>

## Étape 6 — Commit de l'item

Récupère le titre court de l'item depuis `docs/version-{VERSION}.md`.

Liste l'état du dépôt :

```bash
git status --porcelain
```

<instructions>
Analyse la sortie et classe chaque fichier modifié, ajouté ou supprimé en deux groupes :

- **Liés à l'item** : tout ce qui constitue le scope de l'item — code applicatif produit ou modifié pour réaliser la fonctionnalité, tests associés, assets, la mise à jour de `docs/version-{VERSION}.md` faite à l'étape 5, et `docs/backlog.md` s'il a été modifié à l'étape 5 (points ouverts reportés). Ce dernier n'est jamais rangé par défaut parmi les fichiers transverses.
- **Non liés à l'item** : modifications transverses qui se sont glissées pendant l'implémentation mais qui ne font pas partie du scope. Exemples typiques : skills et commands (`.claude/commands/`, `commands/`, `skills/`), agents (`.claude/agents/`, `agents/`), config projet globale (`CLAUDE.md`, `.gitignore`, configs d'outillage), refactos opportunistes hors périmètre, fichiers de template.

En cas de doute sur un fichier, classe-le par défaut en "non lié" et signale-le explicitement.

Présente la séparation et demande validation :

> **Fichiers à inclure dans le commit de l'item :**
> - {liste}
>
> **Fichiers laissés de côté (proposés pour un commit séparé à l'étape 8) :**
> - {liste, ou "aucun"}
>
> **Points ouverts classés à l'étape 5 :**
> - {point} → {emplacement}
> - {ou "aucun"}
>
> Confirmer ? (`oui` / `ajuster <précisions>`)

Si je réponds `ajuster`, applique mes précisions (sur la séparation des fichiers ou sur le classement d'un point, en déplaçant alors son entrée selon les règles de l'étape 5) puis redemande validation.

Mémorise la liste des fichiers non liés pour l'étape 8.
</instructions>

Une fois la séparation validée, ajoute uniquement les fichiers liés puis commit :

```bash
git add -- {chemin1} {chemin2} ...
git commit -m "v{VERSION} Item {ITEM} — {titre court}"
```

Liste explicitement chaque chemin dans `git add` (n'utilise jamais `git add .` ni `git add -A` à cette étape).

## Étape 7 — Merge et nettoyage

```bash
git checkout main
git merge --no-ff v{VERSION}/item-{ITEM}-{SLUG} -m "Merge item {ITEM} de v{VERSION}"
git branch -d v{VERSION}/item-{ITEM}-{SLUG}
```

## Étape 8 — Fichiers restants (si applicable)

<instructions>
Récupère la liste des fichiers non liés mémorisée à l'étape 6.

Si la liste est vide, passe directement à l'étape suivante sans rien afficher.

Sinon, propose :

> Des fichiers transverses ont été modifiés pendant l'implémentation mais ne faisaient pas partie du scope de l'item :
> - {liste}
>
> Que veux-tu en faire ?
> - `commit <message>` — créer un commit séparé sur `main` avec ce message (ex : `commit chore: mise à jour skill item-finish`)
> - `laisser` — laisser ces fichiers non commités, je m'en occuperai manuellement

Si je réponds `commit <message>` :
- Le `<message>` est obligatoire et doit être explicite (ex : `chore: mise à jour skill item-finish`, pas juste `wip` ou `divers`). S'il est vide ou trop vague, redemande un message explicite avant de commiter.
- Une fois le message validé :

```bash
git add .
git commit -m "{message}"
```

À ce stade, `git add .` est sûr : le commit de l'item a déjà été fait à l'étape 6, donc tout ce qui reste correspond aux fichiers transverses listés ci-dessus.

Si je réponds `laisser`, n'ajoute rien et passe à l'étape suivante. Mentionne-le dans le résumé final.
</instructions>

## Étape 9 — Résumé

Présente :
- Ce qui a été fait (fichiers modifiés, sub-agents invoqués)
- Décisions notées dans `docs/version-{VERSION}.md`
- Bloquants ignorés avec leur justification, si applicable
- Commits créés (commit de l'item + éventuel commit de fichiers transverses)
- Fichiers transverses laissés non commités, si applicable
- Points ouverts, si applicable : pour chacun, l'endroit où il a été écrit (`docs/version-{VERSION}.md` › Point d'attention pour l'item N, `docs/backlog.md` › Points reportés › {cible}, ou `docs/backlog.md` › Questions ouvertes)

<instructions>
Un point ouvert qui ne serait écrit nulle part est une erreur. Si tu en détectes un en rédigeant le résumé, signale-le explicitement comme tel, écris-le selon les règles de l'étape 5, et indique que le fichier modifié reste à commiter.
</instructions>

Termine le résumé par exactement cette ligne, mot pour mot :

> Pour publier : `git push origin main`
