---
model: opus
effort: high
---

# /design-system-bootstrap — Génération d'un prompt de design system pour Claude Design

## Confirmation du modèle

Cette skill est conçue pour Opus en effort `high`. Le travail principal est éditorial : reformuler le contexte projet en un prompt riche pour Claude Design.

Affiche-moi ce rappel :

> Calibrage attendu : **Opus**, effort **`high`** (ton réglage habituel). Si ce n'est pas ton réglage actif, tape `/model opus` et/ou `/effort high` avant de répondre `ok`.

**Attends ma confirmation explicite (`ok`, `go`, ou équivalent). Ne continue pas tant que je n'ai pas répondu.**

---

## Argument

Pas d'argument. La skill est typiquement appelée après `/project-start`, quand la section *Design* de `docs/project-description.md` est en cas 3 (à produire). Elle peut aussi être lancée manuellement sur un projet existant pour redéfinir son design system.

---

## Étape 1 — Lecture du contexte projet

Lis dans cet ordre :

1. `docs/project-description.md` — utilisateurs cibles, ton recherché, cadrage initial, contexte métier.
2. `CLAUDE.md` — modules / entités, type de projet, stack technique. Sert à comprendre le contexte sans être mentionné dans le prompt final destiné à Claude Design (Claude Design n'a pas besoin de la stack, seulement du contexte produit).

Si l'un de ces fichiers est introuvable, signale-le et demande à l'utilisateur comment procéder. **Attends ma réponse.**

### Détection d'un design system existant

Vérifie si `DESIGN.md` existe à la racine du projet OU si `design/handoff/` existe et contient des fichiers.

<instructions>
Si l'un des deux est détecté :

- Affiche : « Le projet a déjà un design system (`DESIGN.md` et/ou `design/handoff/` détecté). Veux-tu en générer un nouveau (qui remplacera l'ancien) ou annuler ? »
- Attends ma réponse.
- Si `annuler` : sors de la skill.
- Si l'utilisateur valide la régénération : continue. Garde en mémoire qu'il faudra rappeler à l'utilisateur, dans les instructions finales (étape 5), que les anciens fichiers seront écrasés.
</instructions>

### Détection du consommateur shadcn

Pour adapter le livrable demandé à Claude Design, détecte si le projet est destiné à consommer le design system via **shadcn/ui** :

- présence d'un fichier `components.json` à la racine, **ou**
- mention de `shadcn` dans la section *Stack* de `CLAUDE.md`.

<instructions>
Mémorise un flag `shadcnDetected` (booléen). Il pilote :
- l'étape 3 (le prompt demandera à Claude Design de produire **en plus** un bloc *Semantic tokens (shadcn-compatible)* dans `DESIGN.md`) ;
- l'étape 5 (les instructions finales mentionneront `/design-system-adapt` comme étape suivante).

Cette détection ne change rien au reste du prompt — elle ajoute uniquement une exigence de **nommage de tokens** au livrable. Voir l'encadré « Note sur la révélation de la stack » dans l'étape 3.
</instructions>

---

## Étape 2 — Affinage du brief design

Le contenu de `project-description.md` ne suffit pas à produire un excellent prompt design. Pose les questions suivantes **une par une**. Attends ma réponse complète à chaque question avant de passer à la suivante.

<instructions>
Ne reformule pas la question si elle me paraît floue — laisse-moi répondre comme je le veux. Ne synthétise rien à ce stade. Ne donne aucun avis sur ma réponse à ce stade.
</instructions>

1. Quel ton visuel pour cette application ? (ex : sobre et corporate, chaleureux et productif, ludique, médical/clinique, éditorial)
2. Quelles applications ou produits sont une bonne référence visuelle pour ce que tu veux ? Et lesquels veux-tu explicitement éviter ?
3. Mode sombre, mode clair, ou les deux ?
4. Y a-t-il une couleur d'accent que tu veux imposer (corporate, préférence personnelle), ou tu laisses Claude Design proposer ?

---

## Étape 3 — Construction du prompt Claude Design

Sur la base du contexte projet (étape 1) et de l'affinage (étape 2), construis un prompt **en anglais** (Claude Design fonctionne mieux en anglais), riche et structuré.

<context>
Le prompt doit donner à Claude Design tout ce dont il a besoin pour produire un design system complet, opinioné, prêt à l'emploi — pas un point de départ qui nécessiterait d'autres décisions.

Structure attendue du prompt :

1. **Application context** — qui l'utilise, dans quel contexte métier, sur quelle fréquence d'usage. Reformulation des informations de `project-description.md` en termes business, sans mention de la stack.
2. **Visual tone** — réponse à la question 1 de l'étape 2.
3. **Visual references** — réponse à la question 2 de l'étape 2 (inspirations + à éviter).
4. **Color modes** — réponse à la question 3 (light, dark, ou both).
5. **Accent color** — réponse à la question 4, ou « open to your suggestion » si rien d'imposé.
6. **Deliverables** — demande explicite de :
   - Un fichier `DESIGN.md` contenant tous les tokens fondamentaux : palette couleurs (primary, secondary, accent, neutres, sémantiques success/warning/error/info, avec valeurs light et dark si applicable), typographie (familles, échelle, styles h1-h6/body/caption/labels), espacements, rayons, ombres, courbes d'animation. Valeurs concrètes (hex, rem, ms), pas de placeholders.
   - **Si `shadcnDetected` est vrai** : ajouter à la demande la sous-section suivante (à intégrer telle quelle dans le prompt en anglais) :
     ```
     Additionally, in DESIGN.md, include a section titled "Semantic tokens (shadcn-compatible)" that maps the brand palette to the following standard CSS variable names, in both light and dark modes:
       --background, --foreground,
       --card, --card-foreground,
       --popover, --popover-foreground,
       --primary, --primary-foreground,
       --secondary, --secondary-foreground,
       --muted, --muted-foreground,
       --accent, --accent-foreground,
       --destructive, --destructive-foreground,
       --border, --input, --ring,
       --radius
     Provide concrete values (HSL triplets without the hsl() wrapper, as used by the standard convention, e.g. "222.2 84% 4.9%"). These are not a request to produce code in any framework — they are a standard CSS variable naming convention used by the downstream tooling that consumes this design system. The brand palette (e.g. sand-50…900, brand-50…900) must remain exposed as well, as the human-readable reference.
     ```
   - Un dossier `handoff/` contenant des composants React fonctionnels : Button (variants + tailles), Input (avec label, erreur, hint), Textarea, Select, Checkbox, Radio, Switch, Card, Modal/Dialog, Alert (info/success/warning/error), Badge/Tag, Tooltip, Loading/Spinner/Skeleton. Pour chaque composant, tous les états (default, hover, focus, disabled, loading où applicable).
7. **Constraints** — le design system doit être cohérent, opinioné, prêt à l'emploi, et servir de **référence stricte** pour tous les écrans futurs de l'application.
</context>

<instructions>
Le prompt produit doit être en anglais, en Markdown, prêt à être collé tel quel dans Claude Design. Pas de méta-commentaire en français à l'intérieur du bloc.

**Note sur la révélation de la stack.** La règle générale reste : ne mentionne pas la stack technique du projet (React, Tauri, Electron, TypeScript, etc.) dans le prompt destiné à Claude Design. Les composants `handoff/` peuvent rester en JavaScript / classes CSS maison — ils servent de référence visuelle, pas de drop-in. **Exception unique** : quand `shadcnDetected` est vrai, le bloc *Semantic tokens (shadcn-compatible)* est ajouté à `DESIGN.md`. C'est une convention de nommage CSS standard, pas une demande de code dans un framework — elle ne révèle rien sur la stack au sens où on demanderait du JSX en TypeScript ou une intégration spécifique. Le pontage technique reste à la charge de `/design-system-adapt`, qui s'exécute dans le projet.
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

Affiche le prompt validé dans un bloc clairement délimité, suivi de la marche à suivre.

<instructions>
Choisis l'un des deux blocs ci-dessous selon la valeur de `shadcnDetected` (étape 1).

**Bloc A — `shadcnDetected` est faux** :

```
1. Va sur https://claude.ai/design et démarre une nouvelle conversation.
2. Colle le prompt ci-dessus.
3. Itère avec Claude Design jusqu'à un résultat qui te convient.
4. Récupère les fichiers produits :
   - Le `DESIGN.md` → à déposer à la racine du projet.
   - Les composants React → à déposer dans `design/handoff/` du projet.
5. Une fois les fichiers en place, mets à jour `CLAUDE.md` (section *Design*) :
   remplace la mention « cas 3 — à produire » par « cas 2 — design produit, références dans `DESIGN.md` et `design/handoff/` ».
```

**Bloc B — `shadcnDetected` est vrai** :

```
1. Va sur https://claude.ai/design et démarre une nouvelle conversation.
2. Colle le prompt ci-dessus.
3. Itère avec Claude Design jusqu'à un résultat qui te convient. Vérifie que `DESIGN.md` contient bien la section *Semantic tokens (shadcn-compatible)*.
4. Récupère les fichiers produits :
   - Le `DESIGN.md` → à déposer à la racine du projet.
   - Les composants React → à déposer dans `design/handoff/` du projet (référence visuelle, pas de drop-in).
5. Lance `/design-system-adapt` pour matérialiser les tokens shadcn dans `src/renderer/src/styles/index.css`, étendre `tailwind.config.js` avec la palette brand, et obtenir la liste des `npx shadcn@latest add` à exécuter (et les stubs `.tsx` pour les composants sans équivalent shadcn).
6. Une fois `/design-system-adapt` exécutée, mets à jour `CLAUDE.md` (section *Design*) :
   remplace la mention « cas 3 — à produire » par « cas 2 — design produit, tokens matérialisés via `/design-system-adapt`, références dans `DESIGN.md` et `design/handoff/` ».
```

Si l'étape 1 a détecté un design system existant et que l'utilisateur a validé la régénération, ajoute en tête de la marche à suivre choisie un avertissement :

> ⚠ Les fichiers `DESIGN.md` et `design/handoff/` existants seront écrasés par les nouveaux. Sauvegarde-les si tu veux pouvoir les comparer ou y revenir. Si `/design-system-adapt` a déjà été exécutée auparavant, prévois de la rejouer après le nouveau dépôt — elle est idempotente.
</instructions>

---

## Règle absolue

<instructions>
Cette skill N'ÉCRIT JAMAIS dans aucun fichier du projet. Elle produit uniquement un prompt à coller dans Claude Design et des instructions à suivre. Aucune commande `Write`, `Edit`, ni manipulation de fichier source autorisée pendant l'exécution. C'est l'utilisateur qui dépose les fichiers produits par Claude Design dans le projet, puis lance `/design-system-adapt` (si stack shadcn) pour le pontage technique.
</instructions>
