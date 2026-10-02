---
model: opus
effort: high
---

# /design-patterns-bootstrap — Génération des patterns d'écran de référence

## Confirmation du modèle

Cette skill est conçue pour Opus en effort `high`. Le travail consiste à transformer le design system existant en un prompt riche pour Claude Design, qui produira des coquilles visuelles réutilisables — c'est un travail de jugement éditorial.

Affiche-moi ce rappel :

> Calibrage attendu : **Opus**, effort **`high`** (ton réglage habituel). Si ce n'est pas ton réglage actif, tape `/model opus` et/ou `/effort high` avant de répondre `ok`.

**Attends ma confirmation explicite (`ok`, `go`, ou équivalent). Ne continue pas tant que je n'ai pas répondu.**

---

## Argument

Argument optionnel : nom d'un pattern à régénérer.

- `/design-patterns-bootstrap` — mode **bootstrap** : produit les 3 patterns en une seule conversation Claude Design. Typiquement appelée à l'étape 9bis du Cycle 1, juste après `/design-system-bootstrap`.
- `/design-patterns-bootstrap list+form` — mode **régénération ciblée** : refait un seul pattern. Utilisée plus tard dans la vie du projet, quand un pattern doit évoluer.

Liste fermée des patterns acceptés : `list`, `form`, `list+form`.

Si l'argument fourni n'est pas dans la liste, affiche les valeurs valides et arrête-toi.

---

## Étape 1 — Pré-requis design system

Vérifie la présence du design system :

- `DESIGN.md` à la racine du projet — **obligatoire**.

<instructions>
**Cas 1 — `DESIGN.md` absent.**

Affiche :

> Aucun `DESIGN.md` détecté à la racine du projet. Les patterns s'appuient sur les tokens du design system pour rester cohérents — sans `DESIGN.md`, je ne peux pas produire un prompt utile.
> Lance `/design-system-bootstrap` d'abord, puis reviens.

Sors de la skill.

**Cas 2 — `DESIGN.md` présent.**

Lis-le intégralement. Son contenu sera inclus dans le prompt construit à l'étape 3, pour que Claude Design dispose des tokens même dans une nouvelle conversation.
</instructions>

### Détection du mode

<instructions>
Détermine le mode selon l'argument :

**Mode bootstrap (pas d'argument).**

Vérifie si `design/patterns/` existe et contient déjà des fichiers `.tsx`.

- Si vide ou inexistant : continue.
- Si des fichiers existent : affiche « Le dossier `design/patterns/` contient déjà des patterns. Veux-tu :
  - `écraser` — produire les 3 patterns à neuf (les anciens seront remplacés)
  - `cibler <nom>` — relancer la skill en mode régénération ciblée sur un pattern précis
  - `annuler` — sortir de la skill »

  Attends ma réponse. Si `cibler` ou `annuler` : sors de la skill avec l'instruction appropriée. Si `écraser` : continue, et garde en mémoire qu'il faudra rappeler à l'utilisateur, dans les instructions finales (étape 5), que les anciens fichiers seront écrasés.

**Mode régénération ciblée (argument fourni).**

Vérifie que `design/patterns/{argument}.tsx` existe.

- Si présent : lis-le pour le présenter en référence à Claude Design (« voici la version actuelle, voici ce qui doit changer »). Continue.
- Si absent : affiche « Le pattern `{argument}` n'existe pas encore dans `design/patterns/`. Lance la skill sans argument pour produire les 3 patterns d'un coup, ou vérifie le nom. » Sors de la skill.
</instructions>

---

## Étape 2 — Affinage du brief

Le contenu varie selon le mode.

<instructions>
**Mode bootstrap.**

Pose une seule question, optionnelle :

> Y a-t-il une particularité de l'application qui doit influencer le traitement des patterns ? Exemples : densité d'information attendue (compacte ou aérée), navigation latérale vs en haut, importance des raccourcis clavier, contraintes d'accessibilité spécifiques, ergonomie tactile vs souris. Si rien de particulier : réponds `aucune`.

Attends ma réponse. Cette information, si fournie, sera intégrée dans la section *Application context* du prompt construit à l'étape 3.

**Mode régénération ciblée.**

Pose la question suivante :

> Que veux-tu changer dans le pattern `{argument}` ? Décris ce qui ne te convient plus dans la version actuelle, et ce que tu veux à la place.

Attends ma réponse complète. Ne reformule pas la question.
</instructions>

---

## Étape 3 — Construction du prompt Claude Design

Sur la base du `DESIGN.md` (étape 1) et du brief (étape 2), construis un prompt **en anglais**, riche et structuré.

<context>
Structure attendue du prompt :

1. **Design system reference** — section ouverte par : « Use the following design system as the strict source of truth for all visual decisions. Do not invent new colors, spacing, typography, or component patterns — use only the tokens defined here. »
   - Inclure le **contenu intégral** de `DESIGN.md`. Ne pas tronquer, ne pas résumer. Claude Design n'a pas accès au filesystem du projet.

2. **Application context** — qui utilise l'application, dans quel contexte métier, à quelle fréquence d'usage. Reformulation business courte (3-5 lignes), tirée de `docs/project-description.md` ou `CLAUDE.md` si disponibles. Si une particularité a été mentionnée à l'étape 2, l'inclure ici.

3. **What to produce** — varie selon le mode.

   **Mode bootstrap** : demander trois composants React fonctionnels distincts, un par pattern, dans la même conversation pour garantir la cohérence visuelle. Préciser :

   - Each pattern is a **single self-contained `.tsx` file**, deposit-able as-is in `design/patterns/{pattern-name}.tsx`. **Self-contained means:**
     - **NO imports** of `@/components/ui/*`, shadcn components, or any external component library.
     - Use **plain HTML elements** (`<button>`, `<input>`, `<div>`, `<table>`, `<select>`, etc.) styled with Tailwind utility classes.
     - **Inline the relevant CSS variables from DESIGN.md** in a `<style>` block at the top of each file: a `:root` selector with the color tokens in the format used by DESIGN.md (typically HSL triplets like `222.2 84% 4.9%`), plus a `.dark` selector if dark mode is defined in DESIGN.md.
     - The goal is that each file **renders correctly in the Claude Design preview panel** so the user can iterate visually before depositing the files in their project.
   - Filenames must be exactly: `list.tsx`, `form.tsx`, `list+form.tsx`.
   - These patterns are **visual references**, not production code. The downstream developer (and a code-generation agent) will transpose them to the project's actual stack (typically shadcn + Tailwind + TypeScript) at integration time — focus on nailing the visual intent, not on being technically correct for any specific framework.
   - Each pattern shows **only anonymized placeholder content**: "Item A / Item B / Item C" for list rows, "Field 1 / Field 2" for form fields, "Section title" for headers. **No realistic business content** (no fake customers, no fake services, no domain-specific labels). The patterns must work regardless of the entity they later display.
   - Each pattern includes, **inside the same file**, an internal storyboard: the relevant state variants stacked vertically with section headers ("With data", "Empty state", "Loading", "Error", etc.). This makes the file a complete reference, not just a single state.
   - Visual coherence across the three patterns is **non-negotiable**: same button styles, same row treatment, same form field treatment, same header structure. Produce them in the same conversation specifically so they share visual decisions.

   Then list the three patterns with their role and required states :

   - **`list`** — Read-only or list-first view: a table or row list, full width. Header with global actions placeholder (filter, search, export — buttons only, no logic). No edit form. Also serves as the list half of the `form` pattern (separate-pages CRUD). Required states: with data, empty, loading, error.

   - **`form`** — Full-width create/edit form page: the form half of a separate-pages CRUD, reached from the `list` screen. Group fields into sections if there are many. Primary actions anchored at the bottom (save, cancel). Required states: blank, filled with multiple validation errors, submitting (disabled with spinner), success.

   - **`list+form`** — Compact CRUD on a single screen: a list panel with selectable rows and a form panel together on the same page. Header with primary actions (create, delete). Selecting a row fills the form; the panel switches between "create" and "edit" modes without leaving the page. Required states: list with data + form in edit mode, list empty + create form, form with validation errors, loading.

   **Mode régénération ciblée** : demander uniquement le pattern `{argument}`. Inclure :
   - Le contenu actuel du fichier `design/patterns/{argument}.tsx` sous un titre « Current version (to revise) ».
   - La description de ce qui doit changer (réponse à la question de l'étape 2) sous un titre « What must change ».
   - Le rôle et les états requis de ce pattern (cf. liste ci-dessus).
   - **Les mêmes règles de self-containment que pour le mode bootstrap** (HTML natif, pas d'imports shadcn, CSS variables inline, previewable dans Claude Design).
   - L'exigence que les autres patterns existants restent intacts — ce n'est qu'un fichier qui change.

4. **Constraints** — explicitation finale :
   - Use only DESIGN.md tokens. If a need arises that the design system doesn't cover, extend it explicitly through a new token (and document the new token in the response), do not improvise inline.
   - Each pattern is generic and entity-agnostic. If you find yourself writing "Customer", "Service", "Product", or any specific business term, replace it with "Item", "Field", "Section", "Block".
   - Self-containment is non-negotiable: the patterns must be previewable directly in this Claude Design conversation. If you find yourself reaching for `@/components/ui/Button` or any shadcn import, replace it with `<button>` styled with Tailwind classes that achieve the same visual result. The downstream agent will handle the technical transposition.
</context>

<instructions>
Le prompt produit doit être en anglais, en Markdown, prêt à être collé tel quel dans Claude Design.

Le contenu de `DESIGN.md` doit être copié intégralement — pas de troncature, pas de résumé, même si c'est long. Sans ces tokens, Claude Design improvisera et la cohérence avec le design system existant sera perdue.
</instructions>

<instructions>
**(Conditionnel — projet scaffoldé)** Cette consigne ne s'applique que si le dossier `scaffold/` existe
à la racine. Sinon, ignore-la entièrement : le prompt reste inchangé.

Ajoute au prompt, dans la section *Constraints*, une exigence de **compatibilité scaffolder** :

> Each pattern must be built so that its reusable visual pieces (the list table/rows, the form layout,
> the combined list+form shell) are **cleanly separable** — a developer will extract them **once** into
> a shared runtime layer (a "runtime-kit"), and the scaffolder's generated pages will instantiate them
> with real entity fields. Keep state, layout, and presentation in self-contained blocks; do not
> hard-couple a piece to a single screen, so it can be lifted out and reused as-is.

Cela matérialise l'approche hybride (`.claude/docs/scaffolder-integration.md` §9) : les maquettes
nourrissent une extraction unique vers le runtime-kit, puis les pages générées par le scaffolder
instancient ces composants. Les noms des patterns (`list`, `form`, `list+form`) sont déjà ceux du
scaffolder.
</instructions>

---

## Étape 4 — Validation utilisateur

Présente le prompt construit et demande :

> Voici le prompt à coller dans Claude Design. Tu valides, tu ajustes, ou tu annules ?

<instructions>
- `valider` : passe à l'étape suivante.
- `ajuster <précisions>` : modifie le prompt selon les précisions, re-présente pour validation.
- `annuler` : sors de la skill sans rien produire.

Boucle sur l'ajustement tant que je n'ai pas validé explicitement.
</instructions>

---

## Étape 5 — Instructions d'utilisation

Affiche le prompt validé dans un bloc clairement délimité, suivi de la marche à suivre adaptée au mode.

<instructions>
**Mode bootstrap** :

```
1. Va sur https://claude.ai/design — IDÉALEMENT dans la conversation existante où tu as produit ton DESIGN.md. C'est important : Claude Design garde ainsi en mémoire tes choix visuels et produira les 3 patterns avec un traitement cohérent. Si tu as perdu cette conversation, démarre-en une nouvelle — le prompt est auto-suffisant (DESIGN.md est inclus).
2. Colle le prompt ci-dessus.
3. Itère avec Claude Design jusqu'à un résultat qui te convient. Comme les patterns sont self-contained (HTML natif + Tailwind + CSS variables inline, pas d'imports shadcn), tu peux les **visualiser directement dans le panneau preview de Claude Design** pour ajuster visuellement avant le dépôt. Vérifie en particulier la cohérence visuelle entre les 3 patterns (mêmes boutons, mêmes radii, mêmes états).
4. Récupère les 3 fichiers React produits → à déposer dans `design/patterns/` du projet :
   - `list.tsx`
   - `form.tsx`
   - `list+form.tsx`
5. Une fois en place, ces fichiers sont figés (au même titre que DESIGN.md et design/handoff/). Ils servent de référence visuelle pour `feature-agent` et `component-agent` au moment des `/item-start`. La transposition vers shadcn + TypeScript se fait dans le code applicatif, pas dans les patterns.
```

Si l'étape 1 a détecté un dossier `design/patterns/` non vide et que l'utilisateur a validé l'écrasement, ajoute en tête de la marche à suivre :

> ⚠ Les fichiers existants dans `design/patterns/` seront écrasés par les nouveaux. Sauvegarde-les si tu veux pouvoir les comparer ou y revenir.

**Mode régénération ciblée** :

```
1. Va sur https://claude.ai/design — IDÉALEMENT dans la conversation existante où tu as produit ton DESIGN.md.
2. Colle le prompt ci-dessus.
3. Itère avec Claude Design jusqu'à un résultat qui te convient. Le pattern étant self-contained, tu peux le **visualiser directement dans le panneau preview**. Vérifie aussi qu'il reste visuellement cohérent avec les 2 autres patterns existants (compare avec design/patterns/ avant de remplacer — tu peux ouvrir les fichiers existants côte à côte si besoin).
4. Récupère le fichier React produit → à déposer dans `design/patterns/{argument}.tsx`, en remplaçant l'ancien.
5. Ne quitte pas la skill : passe à l'étape 6.
```

Pour le mode bootstrap, la skill se termine ici. Pour le mode régénération ciblée, continue à l'étape 6.
</instructions>

---

## Étape 6 — Surface des consommateurs (mode régénération ciblée uniquement)

<instructions>
Cette étape ne s'exécute qu'en mode régénération ciblée. En mode bootstrap, sors après l'étape 5.

Scanne tous les fichiers `docs/version-*.md` à la recherche des items dont le `Pattern` consomme le mockup `{argument}` :
- si `{argument}` est `list` : les items `Pattern: list` **et** `Pattern: form` (le pattern `form` compose une liste et un formulaire séparés, donc consomme aussi `list.tsx`) ;
- si `{argument}` est `form` : les items `Pattern: form` ;
- si `{argument}` est `list+form` : les items `Pattern: list+form`.

Pour chaque match, extrais : le numéro de version, le numéro et le titre de l'item, son statut (À faire / En cours / Done — selon le champ Statut de l'item).

Présente un tableau récapitulatif :

| Item | Version | Statut |
|---|---|---|
| {numéro}. {titre} | {version} | {statut} |

Puis affiche :

> Voici les items qui consomment le pattern `{argument}`. Les items en statut « Done » ont été développés sur l'ancienne version du pattern et ne s'aligneront pas automatiquement sur la nouvelle. Trois options :
>
> **1. Ne rien faire** — la divergence visuelle est assumée. Souvent le bon choix : refondre un écran qui marche juste pour la cohérence visuelle est rarement rentable. À l'évolution fonctionnelle suivante de l'écran, l'alignement se fera naturellement via `feature-agent` qui lira le nouveau pattern.
>
> **2. Ajouter un item de refonte ciblée dans `docs/roadmap.md`** — un item par écran à aligner. Recommandé si la divergence est gênante sur un écran précis. Wording suggéré pour chaque item :
>
> ```
> ### Refonte visuelle de l'écran {nom de l'écran}
>
> Aligner l'écran sur la nouvelle version du pattern `{argument}` (refondu le {date}).
> Pas de changement fonctionnel. Référence visuelle : `design/patterns/{argument}.tsx`.
> ```
>
> **3. Ajouter un item de refonte transversale** — un seul item couvrant tous les écrans listés. Recommandé si la divergence est intolérable et touche tout le bloc. Wording suggéré :
>
> ```
> ### Alignement des écrans sur le nouveau pattern `{argument}`
>
> Refondre les écrans suivants pour s'aligner sur la nouvelle version du pattern :
> - {numéro}. {titre} (v{version})
> - ...
>
> Pas de changement fonctionnel. Référence visuelle : `design/patterns/{argument}.tsx`.
> ```
>
> Quelle option choisis-tu ? (`1`, `2`, `3`, ou précise si tu veux un mix — par exemple `2` pour certains items et rien pour les autres.)

Attends ma réponse. La skill ne modifie aucun fichier elle-même — elle te présente le wording à coller dans `docs/roadmap.md` selon ton choix. Si je choisis `1`, sors de la skill avec un message de confirmation. Si je choisis `2` ou `3`, présente le bloc Markdown final à coller dans `docs/roadmap.md`, puis sors.
</instructions>

---

## Règle absolue

<instructions>
Cette skill N'ÉCRIT JAMAIS dans aucun fichier du projet. Elle produit uniquement un prompt à coller dans Claude Design, et — en mode régénération ciblée — un wording d'item à coller dans `docs/roadmap.md`. Aucune commande `Write`, `Edit`, ni manipulation de fichier source autorisée pendant l'exécution. C'est l'utilisateur qui dépose les fichiers produits par Claude Design dans `design/patterns/`, et qui ajoute manuellement les items de refonte dans `docs/roadmap.md` s'il le souhaite.
</instructions>
