---
model: sonnet
effort: high
---

# /design-system-adapt — Pontage entre handoff Claude Design et code projet

## Confirmation du modèle

Cette skill est conçue pour Sonnet en effort `high` (alternative acceptable : Opus en effort `high`, ton réglage habituel). Le travail est principalement mécanique — lire `DESIGN.md`, écrire des fichiers de configuration aux bons emplacements, lister des commandes — avec quelques décisions ciblées sur les composants sans équivalent shadcn.

Affiche-moi ce rappel :

> Calibrage attendu : **Sonnet**, effort **`high`** (alternative acceptable : rester en Opus). Pour basculer, tape `/model sonnet` avant de répondre `ok` (puis `/model opus` une fois la skill terminée, pour revenir à ton réglage habituel).

**Attends ma confirmation explicite (`ok`, `go`, ou équivalent). Ne continue pas tant que je n'ai pas répondu.**

---

## Argument

Argument optionnel : `--dry-run` pour produire le plan complet sans rien écrire (utile pour comparer avant / après si l'on régénère le design system).

Exemples :
- `/design-system-adapt`
- `/design-system-adapt --dry-run`

Cette skill est typiquement appelée **immédiatement après** que `DESIGN.md` et les fichiers de `design/handoff/` ont été déposés dans le projet (étape suivant `/design-system-bootstrap`). Elle est **idempotente** : rejouable autant de fois que nécessaire si `DESIGN.md` change.

---

## Rôle de la skill

<context>
Contrairement à `/design-system-bootstrap` (qui ne produit qu'un prompt et n'écrit nulle part), cette skill **écrit dans le projet**. Elle comble l'écart entre :

- ce que Claude Design produit : `DESIGN.md` (tokens, dont un bloc *Semantic tokens (shadcn-compatible)*) et `design/handoff/*.jsx` (composants React non typés, classes CSS maison `sg-btn`, etc., utiles comme référence visuelle uniquement) ;
- ce que la stack du projet attend : `src/renderer/src/styles/index.css` avec les CSS variables shadcn aux noms attendus, `tailwind.config.js` étendu avec la palette brand, composants `.tsx` shadcn dans `src/renderer/src/components/ui/`.

Cette skill ne touche **jamais** à `DESIGN.md` (qui reste la source de vérité canonique) ni à `design/handoff/` (qui reste référence visuelle intacte). Elle écrit uniquement dans le code applicatif.
</context>

---

## Étape 1 — Vérification des pré-requis

Vérifie dans cet ordre :

1. **`DESIGN.md` existe à la racine.** Sinon, affiche : « `DESIGN.md` est introuvable. Lance d'abord `/design-system-bootstrap` puis dépose le fichier produit par Claude Design. » et sors.
2. **`design/handoff/` existe et contient au moins un fichier.** Sinon, affiche un avertissement : « `design/handoff/` est vide ou absent. La skill peut quand même matérialiser les tokens, mais ne pourra pas inférer la liste des composants shadcn à installer. Veux-tu continuer ? » et attends ma réponse.
3. **Stack compatible.** Vérifie la présence d'au moins un de ces marqueurs : `components.json` à la racine, mention de `shadcn` dans la section *Stack* de `CLAUDE.md`, ou `tailwindcss` dans le `package.json`. Si aucun n'est présent, affiche : « Cette skill cible les projets utilisant Tailwind + shadcn/ui. Aucun marqueur détecté. Veux-tu continuer quand même (mode best-effort) ou annuler ? » et attends ma réponse.
4. **Lis `CLAUDE.md`** pour identifier les conventions du projet : langue du code, emplacement réel des sources renderer (peut différer de `src/renderer/src/` selon le type de projet — voir étape 2.1).

<instructions>
Si l'argument `--dry-run` a été passé, mémorise-le : tout l'étape 5 (écriture) sera remplacée par un affichage du diff prévu, sans aucun `Write` ni `Edit`.
</instructions>

---

## Étape 2 — Lecture et inventaire

### 2.1 — Détection des chemins cibles

Détermine où vivent les fichiers à modifier :

- **`components.json`** : si présent à la racine, lis-le pour extraire les alias (`tailwind.css`, `aliases.components`, etc.). Si absent, repli sur les conventions par défaut selon le type de projet :
  - Projet Electron (`template-electron.md`) : `src/renderer/src/styles/index.css`, `src/renderer/src/components/ui/`
  - Projet Tauri : `src/styles/index.css`, `src/components/ui/`
  - Projet Next.js / React SPA : `src/app/globals.css` ou `src/styles/globals.css`, `src/components/ui/`
- **`tailwind.config.js`** ou **`tailwind.config.ts`** : repère le fichier existant. S'il n'existe pas, signale-le et propose de le créer.

Si aucun emplacement n'est clairement détecté, affiche les hypothèses retenues et demande validation. **Attends ma réponse.**

### 2.2 — Extraction des tokens depuis `DESIGN.md`

Parcours `DESIGN.md` pour identifier :

- **Bloc *Semantic tokens (shadcn-compatible)*** (idéalement présent grâce à `/design-system-bootstrap` enrichi). Extrait les valeurs des variables `--background`, `--foreground`, `--primary`, etc. en light et dark.
- **Palette brand** (sand-50…900, brand-50…900, ou nommage équivalent). Extrait les valeurs hex de toutes les nuances.
- **Rayons** (`--radius` et autres si déclarés).
- **Ombres** (si présentes en bloc structuré).
- **Typographie** (familles, échelle de tailles).

<instructions>
Si le bloc *Semantic tokens (shadcn-compatible)* n'existe pas dans `DESIGN.md` (par exemple parce que le design system a été produit avant l'évolution de `/design-system-bootstrap`), affiche :

> Le bloc *Semantic tokens (shadcn-compatible)* est absent de `DESIGN.md`. Je peux :
> - `inférer` — déduire les valeurs des variables shadcn depuis la palette brand (ex : `--primary` = brand-600, `--background` = sand-50 / sand-950, etc.). Tu valideras le mapping avant écriture.
> - `compléter` — sortir de la skill pour que tu ajoutes le bloc à `DESIGN.md` à la main, puis relance.
> - `annuler` — sortir.

Attends ma réponse. Si `inférer` : produis le mapping et fais-le valider à l'étape 4 avant de générer `index.css`.
</instructions>

### 2.3 — Inventaire des composants dans `design/handoff/`

Liste les composants visibles dans `design/handoff/` (qu'il s'agisse d'un seul fichier `components.jsx` exposant plusieurs composants, ou de plusieurs fichiers individuels). Pour chaque composant détecté, classe-le :

- **A — équivalent shadcn natif** : Button, Input, Textarea, Select, Checkbox, Radio (RadioGroup), Switch, Card, Dialog (Modal), Alert, Badge, Tooltip, Skeleton, Label, Separator, Popover, Dropdown Menu, Tabs, Accordion, Avatar, Progress, Toast (Sonner), Sheet, Command, Calendar, Form, Table, Toggle, ToggleGroup, ScrollArea, AspectRatio, HoverCard, Menubar, NavigationMenu, ContextMenu, Collapsible, Resizable.
- **B — pas d'équivalent shadcn natif** : tout le reste (Spinner custom, Field wrapper centralisant label/hint/error, layouts spécifiques, etc.).

Mémorise la liste des composants A (à installer via CLI) et B (à stuber localement).

---

## Étape 3 — Construction du plan

Sur la base de l'étape 2, construis un plan structuré comprenant :

1. **Fichiers à créer ou modifier** :
   - `src/renderer/src/styles/index.css` (ou équivalent selon 2.1) — bloc `@layer base { :root { ... } .dark { ... } }` avec les variables shadcn aux valeurs extraites de `DESIGN.md`. Si le fichier existe et contient déjà un `@layer base`, fusion intelligente (remplacer le bloc existant, conserver le reste).
   - `tailwind.config.js` — extension avec :
     - `darkMode: 'class'` si non présent
     - `theme.extend.colors` enrichi des couleurs sémantiques shadcn (background, foreground, primary, etc., référencées comme `hsl(var(--background))`)
     - `theme.extend.colors.sand` et `theme.extend.colors.brand` (ou autres palettes brand) avec les valeurs hex extraites de `DESIGN.md`
     - `theme.extend.borderRadius` avec les valeurs custom si présentes dans `DESIGN.md`
     - `theme.extend.boxShadow` avec les ombres custom si présentes
   - `components.json` — si absent, à créer avec : `style: "new-york"`, `tailwind.cssVariables: true`, alias cohérents avec les chemins détectés en 2.1.
   - Stubs `.tsx` pour les composants de la classe B (cf. 2.3) dans `src/renderer/src/components/ui/`. Chaque stub :
     - utilise les utilities Tailwind et les CSS variables matérialisées
     - s'inspire visuellement du `.jsx` correspondant dans `design/handoff/` (mêmes proportions, mêmes états)
     - est typé en TypeScript, exporte un composant avec une API minimale et propre
     - sans logique métier — un composant UI pur

2. **Commandes à exécuter** (la skill ne les exécute pas elle-même, elle les liste) :
   - `npx shadcn@latest init` si `components.json` vient d'être créé
   - `npx shadcn@latest add {composant}` pour chaque composant de la classe A, à concaténer en une seule ligne pour gagner du temps : `npx shadcn@latest add button input textarea select checkbox radio-group switch card dialog alert badge tooltip skeleton`

3. **Fichiers volontairement non touchés** :
   - `DESIGN.md` (source de vérité)
   - `design/handoff/` (référence visuelle)
   - les composants shadcn déjà présents dans `src/renderer/src/components/ui/` (la skill ne les écrase pas — elle ne génère que les manquants en classe B)

---

## Étape 4 — Validation utilisateur

Présente le plan complet avec :

- la liste des fichiers à créer ou modifier (chemin + nature de la modification)
- pour chaque fichier modifié, un extrait représentatif du contenu prévu (pas le fichier complet — un échantillon montrant le pattern)
- la liste des composants classés A (à installer via CLI) et B (à stuber)
- la liste des commandes shadcn à exécuter
- le rappel des fichiers volontairement non touchés
- un avertissement spécifique si `index.css` ou `tailwind.config.js` contient des personnalisations qui pourraient être affectées par la fusion

Demande :

> Voici le plan d'adaptation. Tu valides l'écriture, tu ajustes (précise quoi), ou tu annules ?

<instructions>
- `valider` : passe à l'étape 5 (écriture).
- `ajuster <précisions>` : modifie le plan selon les précisions, re-présente pour validation.
- `annuler` : sors de la skill sans rien écrire.

Si l'argument `--dry-run` a été passé : ne propose pas l'option `valider`. Affiche uniquement le plan, signale que rien ne sera écrit, et sors.

Boucle sur l'ajustement tant que je n'ai pas validé explicitement.
</instructions>

---

## Étape 5 — Écriture

Écris les fichiers prévus au plan, dans l'ordre suivant :

1. `components.json` (si à créer)
2. `src/renderer/src/styles/index.css` (ou équivalent) — fusion intelligente si fichier existant
3. `tailwind.config.js` — fusion intelligente avec l'existant (préserve les `content`, `plugins`, etc.)
4. Stubs `.tsx` dans `src/renderer/src/components/ui/` — un fichier par composant de classe B

<instructions>
Pour chaque fichier modifié (pas créé) : lis-le intégralement avant écriture pour préserver le contenu non concerné par la modification. Ne fais jamais d'écrasement aveugle.

Pour `tailwind.config.js`, si le fichier utilise une syntaxe incompatible (CommonJS vs ESM, `defineConfig` ou non), adapte-toi. En cas de doute, signale et demande.

Pour les stubs `.tsx`, respecte la langue du code déclarée dans `CLAUDE.md` (commentaires, noms de variables internes). Les noms de composants restent en anglais (Button, Spinner, Field) — convention React.
</instructions>

---

## Étape 6 — Récapitulatif et étapes suivantes

Affiche un récapitulatif structuré :

1. **Fichiers créés** : chemin de chaque fichier nouveau.
2. **Fichiers modifiés** : chemin + nature du changement (fusion, remplacement de bloc, etc.).
3. **Commandes à exécuter maintenant** :
   ```bash
   npx shadcn@latest init    # si components.json vient d'être créé
   npx shadcn@latest add button input textarea select checkbox radio-group switch card dialog alert badge tooltip skeleton
   # (adapter la liste à ce qui a réellement été détecté en classe A)
   ```
   Avertis que ces commandes sont à lancer manuellement par l'utilisateur — la skill ne les exécute pas.
4. **Vérification visuelle recommandée** : « Une fois les composants shadcn installés, compare visuellement quelques composants installés (`button.tsx` par exemple) avec leur équivalent dans `design/handoff/`. Si l'écart est trop marqué, c'est que les variables shadcn de `index.css` ne reflètent pas fidèlement la palette brand — ajuste `DESIGN.md` puis relance `/design-system-adapt`. »
5. **Mise à jour `CLAUDE.md`** : rappelle de basculer la section *Design* en cas 2 si ce n'est pas déjà fait.

---

## Règles absolues

<instructions>
- **Ne jamais toucher à `DESIGN.md`.** C'est la source de vérité, lue mais non modifiée.
- **Ne jamais toucher aux fichiers de `design/handoff/`.** Ils restent référence visuelle intacte.
- **Ne jamais écraser un composant shadcn déjà installé** dans `src/renderer/src/components/ui/`. La skill ne génère que les stubs de classe B.
- **Ne jamais exécuter `npx shadcn add` automatiquement.** La skill liste les commandes — l'utilisateur les exécute.
- **Idempotence stricte** : rejouer la skill sur un projet déjà adapté doit converger vers le même résultat (pas d'accumulation de blocs dupliqués dans `index.css` ou `tailwind.config.js`).
- **En mode `--dry-run`** : aucun appel `Write`, `Edit`, ni `Bash` modifiant le filesystem. Lecture seule.
</instructions>


---

## Fin de skill — retour au réglage habituel

Si j'ai basculé sur Sonnet au bloc de confirmation, termine en me rappelant : « Pense à repasser en `/model opus` (ton réglage habituel). »
