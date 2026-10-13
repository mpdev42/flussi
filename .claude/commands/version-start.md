---
model: opus
effort: high
---

# /version-start — Démarrer une nouvelle version

Argument attendu : `{version}` (ex : `1.2.0`).

---

## Bloc de confirmation modèle

<instructions>
Avant toute action, affiche ce bloc et attends ma confirmation explicite. Ne continue pas sans réponse.

> Cette skill est prévue pour tourner en **Opus** avec un effort **`high`**.
> Si ce n'est pas ton réglage actif, tape `/model opus` et/ou `/effort high` avant de répondre `ok`.

Attends ma réponse. Ne continue pas.
</instructions>

## Argument

Depuis `$ARGUMENTS`, extrais `VERSION` (ex : `1.2.0`).

## Étape 1 — Lire le contexte

Lis `docs/roadmap.md` et extrais tous les items de la section `v{VERSION}`.

<instructions>
Si la section `v{VERSION}` est absente de `docs/roadmap.md`, affiche :

> "La version v{VERSION} n'est pas encore définie dans `docs/roadmap.md`. Décris les items que tu veux inclure dans cette version et je les ajouterai."

Attends ma réponse. Ajoute les items dans `docs/roadmap.md`. **Mémorise que `docs/roadmap.md` a été modifié** — cette information sera réutilisée à l'étape 7 pour le commit. Puis continue.

Si la section existait déjà : `docs/roadmap.md` n'est pas modifié à cette étape.
</instructions>

Lis aussi `CLAUDE.md` pour connaître les conventions, l'architecture et les contraintes du projet.

Lis enfin `docs/backlog.md` pour reprendre les points ouverts laissés par les versions précédentes.

<instructions>
Extrais de `docs/backlog.md` :
- les entrées de la section « Points reportés » qui ciblent `v{VERSION}` (sous-section `### v{VERSION} — …`), ainsi que celles qui ciblent une version **antérieure** à `v{VERSION}` (échéance dépassée — sinon un point laissé ne serait plus jamais repris) ;
- parmi les sous-sections module ou service de « Points reportés », la sous-section `### Dette technique (sans échéance)` et la section « Questions ouvertes », les entrées qui concernent les modules des items de la version (module nommé, fichier cité, fonctionnalité touchée).

Format attendu d'une entrée (défini par `/item-finish`) : `- {action ou question} — `{fichier}` (v{X}, item {N})`. Les entrées sans origine (par exemple les questions issues de `/backlog-bootstrap`) sont traitées de la même façon.

Mémorise ces points pour l'étape 2. Si `docs/backlog.md` est absent, s'il ne contient pas de section « Points reportés », ou si aucune entrée ne correspond, ne mémorise rien et continue normalement : la suite de la skill se déroule alors exactement comme sans backlog.
</instructions>

## Étape 2 — Présenter les items extraits

Affiche :
- La version identifiée
- La liste des items avec leur description telle qu'elle apparaît dans la roadmap, numérotés dans l'ordre de la roadmap
- Si des points ont été extraits du backlog à l'étape 1 : leur liste, groupée par section du backlog (aperçu, sans décision à ce stade)

Attends ma validation que la liste des items est complète. Ne continue pas sans réponse.

### Points repris du backlog

<instructions>
Si aucun point n'a été extrait à l'étape 1, passe directement à l'étape 3.

Sinon, une fois la liste des items validée, affiche :

> Je vais te présenter les {N} points ouverts repris du backlog, un par un. Pour chacun, réponds :
>
> - `rattacher <item>` — le point devient une contrainte ou une sous-tâche de cet item dans `docs/version-{VERSION}.md` (désigne l'item par son numéro dans la liste ci-dessus ou par son titre) ; il sera retiré du backlog
> - `laisser` — le point reste au backlog
> - `abandonner <raison>` — le point est retiré du backlog ; la raison sera tracée dans `docs/version-{VERSION}.md`
>
> Pour accélérer, tu peux à tout moment répondre `tout laisser restant` : les points restants (point courant inclus, s'il n'a pas encore été traité) restent au backlog.

Puis présente chaque point dans l'ordre du backlog. Format :

> **Point {i}/{N} — {section du backlog} › {sous-section}**
>
> {entrée telle qu'elle figure dans le backlog, origine incluse}
>
> Réponse : `rattacher <item>`, `laisser`, `abandonner <raison>`, ou `tout laisser restant` ?

Traitement de chaque réponse :

- `rattacher <item>` : si l'item désigné ne fait pas partie de la liste validée, signale-le et redemande. Sinon, mémorise le rattachement, passe au suivant.
- `laisser` : mémorise, passe au suivant.
- `abandonner <raison>` : si la raison est vide, redemande : « La raison est obligatoire. Pourquoi abandonnes-tu ce point ? ». Une fois la raison reçue, mémorise-la avec le point, passe au suivant.
- `tout laisser restant` : marque tous les points restants comme laissés, sors de la boucle.
- Toute autre réponse : redemande la décision sans avancer.

Ne groupe jamais la validation : point par point. **N'écris rien à cette étape** — les décisions sont appliquées à l'étape 5, une fois les items conservés et l'ordre fixés. Un rattachement suit l'item, pas son numéro provisoire.
</instructions>

## Étape 3 — Interview des items

Pour chaque item, engage une conversation **item par item**. Attends ma réponse avant de passer au suivant.

<instructions>
Pour chaque item, pose d'abord la question YAGNI :

> "Cet item a-t-il toujours du sens aujourd'hui ? Si on ne le faisait pas dans cette version, qu'est-ce qui se passerait ?"

Attends ma réponse.

- Si ma réponse indique que l'item n'apporte rien (ex : "rien", "ça resterait pareil", "personne ne le demande") : propose de retirer l'item de la version et de le remettre dans `docs/backlog.md`. Demande confirmation. Si des points du backlog avaient été rattachés à cet item à l'étape 2 et que le retrait est confirmé, ces points repassent en `laisser` (ils restent au backlog) : signale-le.
- Si ma réponse justifie l'item : enchaîne sur la question du pattern d'écran (ci-dessous), puis sur les questions d'affinage classiques (titre, décisions techniques, contraintes connues, cas limites, fichiers probablement impactés).
</instructions>

### Question du pattern d'écran

Pour chaque item conservé, pose la question suivante avant l'affinage technique :

<instructions>
> "Quel pattern d'écran utilise cet item ?
> - `list` — Liste seule, en lecture/sélection (référentiel non modifié ici, données calculées/importées, journal/historique/audit) — aucun formulaire de saisie
> - `form` — Liste + formulaire sur écrans séparés : une page liste pour naviguer + des pages création/édition distinctes (le pattern CRUD par défaut)
> - `list+form` — Liste + formulaire sur le même écran : sélectionner une ligne remplit le formulaire, création/édition sans changer de page (référentiels code/libellé)
> - `custom` — Écran sur-mesure ne rentrant dans aucun pattern (dashboard/KPI, wizard, formulaire isolé sans liste, écran composite) — déclenchera `/design-screen-prompt` avant `/item-start`
> - `aucun` — Item sans écran (backend pur, refacto, migration, schéma DB)"

Attends ma réponse. Mémorise la valeur du pattern pour cet item — elle servira aux étapes 3bis, 4 et 5.

Si je réponds `custom`, ajoute après ma réponse :

> "Noté. Pour cet item, tu devras lancer `/design-screen-prompt` avant `/item-start`. Cette décision sera tracée dans `version-{VERSION}.md` et `/item-start` te bloquera si l'écran n'a pas été produit."

Si je réponds une valeur hors liste, signale l'erreur et redemande.
</instructions>

### Option office-hours

Pour chaque item, mentionne explicitement cette option avant les questions d'affinage technique :

> "Si tu veux un cadrage plus poussé sur cet item, on peut basculer sur `/office-hours feature` avant de continuer ici."

## Étape 3 bis — Vérification de cohérence pattern × design/patterns/

<instructions>
Une fois l'interview de tous les items terminée, agrège les patterns déclarés (hors `aucun` et `custom`) et vérifie pour chacun la présence du fichier correspondant dans `design/patterns/` :

| Valeur déclarée | Fichier(s) attendu(s) |
|---|---|
| `list` | `design/patterns/list.tsx` |
| `form` | `design/patterns/list.tsx` ET `design/patterns/form.tsx` |
| `list+form` | `design/patterns/list+form.tsx` |

Liste les fichiers manquants. **N'effectue pas de blocage** — le blocage interviendra plus tard, au moment de `/item-start`. Ici, on est encore en phase de cadrage, et il est légitime de poser la version avant d'avoir produit les patterns (cas typique : projet fraîchement bootstrappé).

Si des fichiers manquent, affiche :

> ⚠ Les patterns suivants sont déclarés dans la version mais absents de `design/patterns/` :
> - {liste des fichiers manquants}
>
> Lance `/design-patterns-bootstrap` avant de démarrer le premier `/item-start` qui en consomme. La skill `/item-start` te bloquera tant que les fichiers ne sont pas en place.

Si tous les fichiers sont présents, ou si aucun item n'a déclaré de pattern non-`custom`/`aucun`, n'affiche rien et continue silencieusement.
</instructions>

## Étape 3 ter — (Conditionnel — projet scaffoldé) Entités scaffoldées

<instructions>
Cette étape ne s'applique que si le dossier `scaffold/` existe à la racine. Sinon, ignore-la
entièrement : le comportement par défaut ci-dessus reste inchangé.

Lis `scaffold/csv/entities.csv` (CSV `;`, UTF-8 avec BOM — retire le BOM). La colonne `name` liste les
entités scaffoldées. Pour chaque item de la version, détermine s'il **touche une entité scaffoldée**
(son titre/description mentionne un `name`, ou ses libellés `listTitle`/`menuTitle`) — voir
`.claude/docs/scaffolder-integration.md` §5.

Pour chaque item touchant une entité scaffoldée :
- Note que son écran sera **généré par `/scaffold`** (pas construit à la main) ; la maquette
  `design/patterns/` correspondante reste la référence visuelle (via le runtime-kit, approche hybride).
- **Vérifie la cohérence du pattern** : le `Pattern` déclaré à l'étape 3 doit correspondre au
  `screenPattern` de l'entité dans `entities.csv` (même vocabulaire : `list` / `form` / `list+form`).
  En cas d'écart, signale-le :

  > ⚠ L'item « {titre} » déclare `Pattern: {pattern}` mais l'entité scaffoldée « {name} » a
  > `screenPattern: {screenPattern}` dans `scaffold/csv/entities.csv`. Aligne l'un sur l'autre (corrige
  > le `Pattern` de l'item, ou le `screenPattern` du CSV) avant de générer.

  Attends ma décision sur chaque écart.

**N'ajoute aucun champ** dans le fichier de version : l'appartenance au scaffolder est dérivée des CSV,
jamais saisie.
</instructions>

## Étape 4 — Proposer un ordre de réalisation

Sur la base des items conservés, propose un ordre de réalisation sous forme de tableau :

| # | Item | Pattern | Justification |
|---|------|---------|---------------|

La colonne `Pattern` reprend la valeur déclarée à l'étape 3 pour chaque item. La justification couvre les dépendances, les risques et la complexité.

Attends ma validation ou mes ajustements. Ne continue pas sans réponse.

## Étape 5 — Créer le fichier de version

Crée `docs/version-{VERSION}.md` avec la structure suivante :

<context>
- **Titre + objectif général** de la version
- **Items conservés**, numérotés selon l'ordre validé. Pour chaque item, dans cet ordre :
  - `**Statut**` : valeur initiale `À faire`
  - `**Pattern**` : valeur recueillie à l'étape 3 (`list`, `form`, `list+form`, `custom`, ou `aucun`)
  - `**Description**` : description complète
  - Décisions techniques, contraintes, cas limites, fichiers impactés
  - `**Repris du backlog**` : uniquement si des points ont été rattachés à l'item à l'étape 2. Une ligne par point, formulée comme une contrainte ou une sous-tâche, suivie de son origine `(v{X}, item {N})` — le détail se retrouve dans le fichier de version d'origine (`docs/archives/version-{X}.md`).
- **Section "Items retirés (YAGNI)"** : liste les items écartés à l'étape 3 avec leur justification. Conserve cette section pour traçabilité, même vide (mentionner alors "Aucun item retiré").
- **Section "Points du backlog abandonnés"** : uniquement si au moins un point a été abandonné à l'étape 2. Une ligne par point : l'entrée du backlog, origine incluse, suivie de la raison de l'abandon.
- **Tableau "Ordre de réalisation"** validé à l'étape 4, avec sa colonne `Pattern`.

Exemple de format pour un item :

```
### 2. CRUD Service

**Statut** : À faire
**Pattern** : list+form

**Description** — Gestion complète (création, lecture, modification, suppression) des services...

**Décisions techniques** : ...
```

Pour un item sans écran, le format reste identique avec `**Pattern** : aucun`. Cette explicitation lève l'ambiguïté entre « pattern oublié » et « volontairement absent ».

Note importante sur le cycle de vie de chaque item :
Chaque item peut accumuler une rubrique "Bloquants ignorés" au fil du cycle (alimentée par `/item-finish`). Cette rubrique est facultative — elle apparaît uniquement si au moins un bloquant a été ignoré pour l'item, et son format est défini par `/item-finish`. Ne crée pas la rubrique vide à la création du fichier.
</context>

Si `docs/archives/` contient des versions précédentes, respecte leur format de présentation — sauf pour le champ `Pattern`, qui est nouveau et doit être ajouté même si les versions archivées ne le portaient pas.

<instructions>
Si des points du backlog ont été rattachés ou abandonnés à l'étape 2, mets ensuite à jour `docs/backlog.md` :
- retire chaque entrée rattachée (elle est désormais planifiée dans la version, selon la règle « déplacé quand planifié » du backlog) et chaque entrée abandonnée ;
- supprime les sous-sections `###` de « Points reportés » devenues vides ;
- ne touche pas aux entrées laissées.

**Mémorise que `docs/backlog.md` a été modifié** — cette information sera réutilisée aux étapes 6 et 7. Si aucun point n'a été rattaché ni abandonné, `docs/backlog.md` n'est pas modifié.
</instructions>

## Étape 6 — Validation finale du fichier

Affiche ce message et attends ma réponse :

> "Le fichier `docs/version-{VERSION}.md` est créé. Relis-le et dis-moi si tu veux des ajustements. Quand tu es satisfait, dis-le explicitement et je ferai le commit.
> **Important : ne ferme pas cette conversation avant le commit — l'état de la skill n'est pas persisté entre sessions.**"

Si `docs/backlog.md` a été modifié à l'étape 5, ajoute au message la liste des entrées retirées du backlog (rattachées, avec l'item de rattachement, ou abandonnées), pour que je relise aussi ce fichier.

Si je demande des ajustements, modifie le fichier et redemande validation. Ne continue pas tant que je n'ai pas validé explicitement.

## Étape 7 — Commit

Une fois la validation reçue :

```bash
git add docs/version-{VERSION}.md
```

<instructions>
Si `docs/roadmap.md` a été modifié à l'étape 1 (cas où la section `v{VERSION}` était initialement absente et où tu as ajouté les items à la roadmap), ajoute-le aussi au commit :

```bash
git add docs/roadmap.md
```

Sinon, n'exécute pas cette commande.

De même, si `docs/backlog.md` a été modifié à l'étape 5 (points rattachés ou abandonnés), ajoute-le au commit :

```bash
git add docs/backlog.md
```

Sinon, n'exécute pas cette commande.
</instructions>

Puis :

```bash
git commit -m "v{VERSION} — Initialisation"
```
