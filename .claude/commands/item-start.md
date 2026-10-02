---
model: opus
effort: xhigh
---

# /item-start — Démarrer un item de version

Arguments attendus : `{version} {numéro} {slug}` (ex : `1.2.0 3 dark-mode`).

---

## Bloc de confirmation modèle

<instructions>
Avant toute action, affiche ce bloc et attends ma confirmation explicite. Ne continue pas sans réponse.

> Cette skill est prévue pour tourner en **Opus** avec un effort **`xhigh`**.
> Si l'effort actif n'est pas `xhigh`, tape `/effort xhigh` avant de répondre `ok` (puis `/effort high` une fois la skill terminée, pour revenir à ton réglage habituel).

Attends ma réponse. Ne continue pas.
</instructions>

## Arguments

Depuis `$ARGUMENTS`, extrais :
- `VERSION` — ex : `1.2.0`
- `ITEM` — numéro de l'item, ex : `3`
- `SLUG` — slug court pour la branche, ex : `dark-mode`

## Étape 1 — Préparer la branche

```bash
git checkout main
git pull
git checkout -b v{VERSION}/item-{ITEM}-{SLUG}
```

## Étape 2 — Lire le contexte et résoudre la référence design

### 2.1 Lecture du contexte

Lis dans cet ordre :
1. `docs/version-{VERSION}.md` — trouve l'item {ITEM}, lis sa description complète, ses décisions, ses contraintes, ses fichiers impactés. **Note explicitement la valeur du champ `Pattern`** — elle déterminera la référence design utilisée par les sub-agents UI.
2. `CLAUDE.md` — conventions du projet (architecture, nommage, patterns, contraintes techniques, langue de l'interface, langue du code).

### 2.2 Résolution de la référence design

<instructions>
Selon la valeur du champ `Pattern` lu à l'étape 2.1, résous le ou les chemins attendus :

| Valeur de `Pattern` | Chemin(s) attendu(s) |
|---|---|
| `list` | `design/patterns/list.tsx` |
| `form` | `design/patterns/list.tsx` ET `design/patterns/form.tsx` |
| `list+form` | `design/patterns/list+form.tsx` |
| `custom` | un fichier dans `design/handoff/` (résolution interactive ci-dessous) |
| `aucun` | aucun chemin — passe directement à l'étape 2.3 |

**Pour les valeurs de pattern fixes** (`list`, `form`, `list+form`) :

Vérifie l'existence du ou des fichiers attendus.

- Si tous présents : lis-les pour avoir le contexte visuel en tête (pas de validation utilisateur nécessaire à ce stade). Mémorise le ou les chemins — ils seront passés aux sub-agents à l'étape 6.
- Si au moins un manque : **bloque la skill** avec ce message :

  > Le pattern `{pattern}` est déclaré pour cet item, mais le(s) fichier(s) suivant(s) manquent dans `design/patterns/` :
  > - {liste des fichiers manquants}
  >
  > Lance `/design-patterns-bootstrap` (mode bootstrap si aucun pattern n'a encore été produit, ou mode régénération ciblée pour ne refaire que celui-ci), puis relance `/item-start`.

  Sors de la skill.

**Pour `Pattern: custom`** :

1. Liste tous les fichiers `.tsx` présents dans `design/handoff/`.
2. Propose le candidat le plus probable basé sur le titre de l'item (recherche par tokens significatifs : ex. titre "Wizard d'onboarding collaborateur" → cherche `wizard`, `onboarding`, `collaborateur` dans les noms de fichier).
3. Affiche :

   > Cet item est marqué `Pattern: custom`. Voici les écrans disponibles dans `design/handoff/` :
   > {liste numérotée}
   >
   > Lequel utiliser comme référence pour cet item ? (Réponds par le numéro, ou par le nom de fichier. Si l'écran n'a pas encore été produit, dis `manquant` — je te demanderai alors de lancer `/design-screen-prompt`.)

   Si un candidat évident existe, le préfixer dans la liste par « ⭐ Suggéré : ».

4. Attends ma réponse.
   - Si je désigne un fichier : mémorise son chemin pour l'étape 6.
   - Si je dis `manquant` (ou si `design/handoff/` est vide) : bloque la skill avec :

     > Lance `/design-screen-prompt` pour produire l'écran de cet item, dépose le `.tsx` dans `design/handoff/`, puis relance `/item-start`.

     Sors de la skill.

**Pour `Pattern: aucun`** :

Aucune référence design. Continue silencieusement.

**Si le champ `Pattern` est absent du fichier de version** (cas d'un fichier `version-*.md` antérieur à l'introduction du champ) :

Affiche :

> L'item ne porte pas de champ `Pattern`. Cela peut être normal pour une version cadrée avant l'introduction des patterns. Pour cette session, dis-moi :
> - le pattern à utiliser (`list`, `form`, `list+form`, `custom`, `aucun`)
> - ou `aucun` si l'item est purement backend

Attends ma réponse, puis applique la résolution correspondante. Suggère ensuite à la fin de la skill (étape 7) que l'utilisateur ajoute le champ dans `docs/version-{VERSION}.md` pour les sessions futures.
</instructions>

### 2.3 Suite

Une fois la référence design résolue (ou confirmée absente), passe à l'étape 2.4 si un scaffolder est
actif, sinon directement à l'étape 3.

### 2.4 (Conditionnel — projet scaffoldé) Entité scaffoldée et génération

<instructions>
Cette sous-étape ne s'applique que si le dossier `scaffold/` existe à la racine. Sinon, ignore-la
entièrement : le comportement par défaut reste inchangé.

Lis `scaffold/csv/entities.csv` (colonne `name`) et détermine si l'item touche une **entité
scaffoldée** (voir `.claude/docs/scaffolder-integration.md` §5).

Si oui :
1. **Déclenche `/scaffold`** pour (re)générer les artefacts `.base` de l'entité depuis les CSV avant
   d'implémenter. La génération est idempotente : si rien n'a changé au niveau 3, elle produit un diff
   vide ; sinon elle met à jour les `.base` et préserve le custom.
2. Garde en tête, pour l'étape 6, que la persistance, le service, le transport et les pages de cette
   entité sont **générés** (`.base`) : les sub-agents ne les recréent pas et ne les modifient pas. Ils
   étendent uniquement via les fichiers custom (sans `.base`) et les 9 hooks du service custom.
3. La référence design résolue à l'étape 2.2 reste valable comme référence visuelle (elle alimente le
   runtime-kit, approche hybride — `.claude/docs/scaffolder-integration.md` §9).

Si l'item ne touche aucune entité scaffoldée (ou si `scaffold/` est absent) : continue normalement.
</instructions>

## Étape 3 — Explorer le code

À partir de ce que tu viens de lire, identifie les fichiers concernés et explore-les. Comprends l'état actuel du code avant de proposer quoi que ce soit. Si l'exploration révèle d'autres fichiers liés (appelants, dépendances), explore-les aussi.

## Étape 4 — Check-point de compréhension

Présente en 3 à 5 lignes :
- Les fichiers concernés
- Le comportement actuel du code
- Les points d'attention identifiés (zones de risque, dépendances, contraintes techniques rencontrées)
- **La référence design retenue** : chemin(s) du ou des fichier(s) de référence visuelle, ou « aucune » si l'item est sans écran.

<instructions>
Affiche ensuite :

> "Est-ce que ma compréhension est correcte ? Réponds par `oui` ou explique ce que j'ai mal compris."

Attends ma réponse. Ne continue pas.

- Si je dis que tu as mal compris : reprends l'exploration en tenant compte de mes corrections, puis re-présente ta compréhension. Boucle jusqu'à ce que je valide.
- Si je valide : passe à l'étape suivante.
</instructions>

## Étape 5 — Proposer une approche

Présente :
- **Fichiers que tu vas modifier** (chemins explicites)
- **Approche technique** : les choix structurants, sans rentrer dans le détail ligne à ligne
- **Sub-agents que tu vas invoquer** : pour chaque sub-agent prévu (`feature`, `component`, `migration`, `test`), précise quoi lui confier et pourquoi ce choix. **Pour les sub-agents qui produisent du code dans le renderer (UI), précise quelle référence design tu vas leur passer** (chemin de pattern ou de handoff résolu à l'étape 2).

<instructions>
Si tu hésites entre `feature-agent` (code spécifique à un module) et `component-agent` (code partagé entre plusieurs modules) pour une partie du travail, ne tranche pas seul. Pose-moi la question explicitement, par exemple :

> "Pour la modification de X, j'hésite entre `feature-agent` (si c'est spécifique au module Y) et `component-agent` (si c'est destiné à être partagé). Quel est ton choix ?"

Attends ma réponse avant de continuer.
</instructions>

Termine la proposition par :

> "Valide cette approche par `ok`, `go` ou `validé` pour que je commence à coder. Sinon, dis-moi ce qu'il faut ajuster."

Attends ma validation explicite. Ne continue pas sans réponse.

## Étape 6 — Implémenter

Orchestrer les sub-agents de `.claude/agents/` pour réaliser le travail. Lance en parallèle les sub-agents indépendants. Pour les sub-agents qui dépendent du résultat d'un autre (par exemple `test-agent` qui valide le travail de `feature-agent`), enchaîne séquentiellement.

<instructions>
Toute modification de fichier source du projet passe par un sub-agent. Tu n'utilises pas Edit ni Write directement depuis la session principale sur ces fichiers.

Exception : les fichiers de documentation interne (`docs/version-{VERSION}.md` notamment, pour noter une décision en cours de route) peuvent être modifiés depuis la session principale.

Applique les contraintes techniques déclarées dans `CLAUDE.md` (compilation native, ORM, framework, conventions de nommage) à tous les sub-agents que tu orchestres — rappelle-les dans le prompt de chaque sub-agent si elles sont pertinentes pour son travail.

**Référence design à transmettre** :

Pour chaque sub-agent dont le travail produit du code de composant React (typiquement `feature-agent` côté renderer, `component-agent` pour les composants partagés), inclus dans son prompt le ou les chemins de la référence design résolue à l'étape 2 :

- Pour `list` : « Référence visuelle : `design/patterns/list.tsx`. »
- Pour `list+form` : « Référence visuelle : `design/patterns/list+form.tsx`. »
- Pour `form` : « Références visuelles : `design/patterns/list.tsx` (pour la vue liste) et `design/patterns/form.tsx` (pour le formulaire de création/édition). »
- Pour `custom` : « Référence visuelle : `design/handoff/{nom}.tsx`. »

Précise systématiquement au sub-agent que ce fichier est une **référence visuelle d'inspiration**, pas un drop-in à réutiliser tel quel. La logique métier, le routing, les services applicatifs, les hooks restent à la charge du sub-agent. Le pattern donne la structure visuelle (layout, composants, états) ; le sub-agent l'instancie avec les champs réels et la vraie logique de l'item.

Pour les sub-agents qui ne touchent pas à l'UI (`migration-agent`, `test-agent` sur du code non-UI), n'inclus pas de référence design — c'est inutile et brouille leur prompt.

Si l'item est `Pattern: aucun`, n'inclus de référence design dans aucun sub-agent.

**(Si `scaffold/` existe et que l'item touche une entité scaffoldée — cf. étape 2.4)** : rappelle
explicitement à chaque sub-agent de **ne jamais modifier les fichiers `*.base.*`** (générés par
`/scaffold`). Toute extension passe par les fichiers custom (sans `.base`) et les 9 hooks du service
custom (`beforeCreate` / `afterCreate` / …) ; la logique métier non-CRUD est une méthode publique du
service custom. Le `migration-agent`, lui, ne restructure pas le schéma d'une entité scaffoldée (les
tables `.base` sont générées depuis `scaffold/csv/`).
</instructions>

Une fois l'implémentation terminée, présente un récapitulatif :
- Fichiers modifiés
- Sub-agents invoqués (et résultat synthétique de chacun)
- Décisions prises en cours de route, si applicable
- Référence design utilisée (rappel)

## Étape 7 — Fin

Pas de commit, pas de merge, pas de suppression de branche. C'est le rôle de `/item-finish`.

<instructions>
Si à l'étape 2 le champ `Pattern` était absent du fichier de version (cas legacy), termine la skill en suggérant :

> Pour les prochaines sessions sur ce projet, pense à ajouter le champ `Pattern: {valeur résolue}` à cet item dans `docs/version-{VERSION}.md`, juste après le champ `Statut`. Cela évitera la question interactive à chaque relance.

Sinon, termine sobrement.
</instructions>


---

## Fin de skill — retour au réglage habituel

Si j'ai basculé en `xhigh` au bloc de confirmation, termine en me rappelant : « Pense à repasser en `/effort high` (ton réglage habituel). »
