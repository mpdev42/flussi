---
model: opus
effort: xhigh
---

# /code-review — Revue de code structurée

## Confirmation du modèle

Cette skill est conçue pour Opus en effort `xhigh`.

Affiche-moi ce rappel :

> Calibrage attendu : **Opus**, effort **`xhigh`**. Si l'effort actif n'est pas `xhigh`, tape `/effort xhigh` avant de répondre `ok` (puis `/effort high` une fois la skill terminée, pour revenir à ton réglage habituel).

**Attends ma confirmation explicite (`ok`, `go`, ou équivalent). Ne continue pas tant que je n'ai pas répondu.**

---

## Argument

Argument attendu : `{template}` parmi `wip`, `item`, `security`, `release`.

Exemples :
- `/code-review wip`
- `/code-review item`
- `/code-review security`
- `/code-review release`

Depuis `$ARGUMENTS`, extrais `TEMPLATE` (premier mot, insensible à la casse).

- Si `TEMPLATE` est vide → afficher l'aide intégrée (en bas de ce fichier) et arrêter.
- Si `TEMPLATE` n'est pas dans `{wip, item, security, release}` → afficher l'aide avec la mention : « Template inconnu : `{TEMPLATE}`. Did you mean : {suggestion} ? » et arrêter.

---

## Règles communes à tous les templates

<instructions>
1. **Read-only strict** : aucun `Edit`, `Write`, ni commande modifiante.
2. **Ne pas relever ce qu'un linter détecte** : pas de style, imports non utilisés, `let`/`const`, espaces.
3. **Bug vs préférence** : un bug casse quelque chose. Une préférence est discutable — marque-la comme telle.
4. **Alternative concrète obligatoire** : pour chaque critique, propose une reformulation ou une approche.
5. **Pas de remplissage** : une section vide reste `RAS`.
6. **Respecter `CLAUDE.md`** : lis-le avant d'évaluer. Ne relève pas comme « violation » ce qui est une convention assumée. Voir l'étape 1 ci-dessous : les conventions actives doivent être listées explicitement avant toute analyse.
7. **Référencer les emplacements** : `file:line` pour chaque point.
8. **Lister tous les findings sans filtrage par gravité** : au moment de la collecte, n'écarte aucun bug détecté. Le tri par gravité intervient uniquement dans la définition du verdict (bloquant ou non), pas avant.
</instructions>

---

## Étape 1 — Lecture des conventions actives

Avant toute analyse, lis `CLAUDE.md` et liste explicitement, dans le rapport, les conventions actives :

- **Langue du code** : ce qui est déclaré dans `CLAUDE.md`, ou « non spécifié dans CLAUDE.md »
- **Langue de l'interface** : ce qui est déclaré, ou « non spécifié dans CLAUDE.md »
- **Principes déclarés** : KISS, DRY, YAGNI, SOLID, ou autres principes explicitement nommés dans `CLAUDE.md`
- **Conventions de nommage** : ce qui est déclaré (ex : camelCase TypeScript, snake_case DB), ou « non spécifié dans CLAUDE.md »

Si une de ces informations est absente, signale-le explicitement plutôt que de supposer une valeur par défaut. Ces conventions servent de référence pour distinguer une violation réelle d'une simple préférence personnelle.

Ce bloc « Conventions actives » apparaît en tête de chaque rapport produit ci-dessous.

---

## Étape 2 — Résolution du scope

### Si `TEMPLATE = wip`

```bash
git status --porcelain
git diff
git diff --cached
```

Si `git status --porcelain` ne retourne rien → afficher « RAS, pas de WIP » et arrêter.

### Si `TEMPLATE = item`

```bash
git branch --show-current
git diff main...HEAD
git log main..HEAD --oneline
git status --porcelain
```

Cascade de résolution du scope :

- Si branche courante = `main` → erreur : « Pas sur une branche d'item. »
- Si commits ahead de `main` (`git log main..HEAD --oneline` non vide) → scope = diff branche (`git diff main...HEAD`).
- Sinon, si WIP non vide (`git status --porcelain` non vide) → scope = WIP. Le rapport est émis au format `item` (avec toutes ses sections, y compris le verdict), mais le bloc d'en-tête contient explicitement la mention :

  > **Scope analysé** : WIP en attente de commit (aucun commit ahead de `main`). Cette revue est typiquement déclenchée depuis `/item-finish` étape 3, qui invoque `/code-review item` avant le commit de l'étape 6.

  Justification : `/item-finish` lance la revue **avant** de committer le travail de l'item, parce que la revue doit pouvoir bloquer le commit en cas de problème détecté. Refuser d'analyser le WIP dans ce cas reviendrait à ne jamais réviser un item — le diff branche est vide par construction à ce moment-là.

- Sinon (ni commits ahead, ni WIP) → erreur : « Rien à réviser. »

### Si `TEMPLATE = security`

```bash
git status --porcelain
```

- Si résultat non vide → scope = `wip`
- Si résultat vide → scope = `item`
- Si ni WIP ni branche d'item → erreur : « Utilise `release` pour un audit global. »

### Si `TEMPLATE = release`

```bash
git describe --tags --abbrev=0
```

- Si un tag est retourné (ex : `v1.1.0`) :

```bash
git diff v1.1.0..HEAD
git log v1.1.0..HEAD --oneline
```

- Si aucun tag : afficher `git log --oneline | head -20` et demander à l'utilisateur le commit de base. **Attends ma réponse.**

---

## Étape 3 — Seuil de confirmation (tous templates)

Compte les fichiers distincts affectés (`git diff --name-only ...`).

- Si > 30 fichiers → afficher la liste et demander confirmation. **Attends ma réponse, ne continue pas.**
- Si ≤ 30 → continuer directement.

---

## Étape 4 — Analyse et rapport

Chaque rapport commence par le bloc de conventions actives produit à l'étape 1, suivi du scope analysé, suivi du contenu spécifique au template.

### Rapport `wip`

```markdown
# Revue WIP

**Conventions actives** : {bloc de l'étape 1}
**Scope** : {liste concise des fichiers modifiés}

## 1. Intention
{une phrase sur ce que le changement cherche à faire}

## 2. Points bloquants
{bugs, régressions. Format : `file:line — description — impact`}

## 3. Points d'attention
{violations KISS/DRY/YAGNI/SOLID. Format : `file:line — principe — description — alternative`}

## 4. Qualité UI
{si le scope contient des fichiers `.tsx` ou JSX. Sinon : RAS.

Trois checks systématiques (cf. règles capitalisées dans `feature-agent.md` et `component-agent.md`) :

- **Validation native non désactivée** : `<form>` qui utilise zod (ou react-hook-form / valibot / yup) sans attribut `noValidate`. Repérable par grep : présence de `useForm`, `zodResolver`, `safeParse`, ou import de `zod` dans le fichier, et absence de `noValidate` sur le `<form>`.
- **Pluralisation manquante** : compteur affiché sans gestion du pluriel. Repérable par regex `\{[^}]+\.length\}\s+\w+s\b` ou template literal équivalent. Exemples : `{services.length} services`, `${count} clients`. Vérifier que le helper `pluralize` (ou `Intl.PluralRules`) est appelé.
- **Titres non sémantiques** : composant titre rendant un `<div>` ou `<span>` au lieu d'une balise heading. Concerne `CardTitle`, `DialogTitle`, `SheetTitle`, et tout composant `…Title` custom. Vérifier le composant source dans `src/renderer/src/components/ui/`.

Format : `file:line — check — description — alternative`.}

## 5. Qualité des tests
{couverture, tests manquants, tests qui ne testent rien}

## 6. Questions ouvertes
{ce que tu n'as pas pu trancher seul}
```

### Rapport `item`

Reprend le rapport `wip` et ajoute :

```markdown
## 7. Gestion d'erreurs
{cas non couverts, propagation. Format : `file:line — cas — risque — traitement recommandé`}

## 8. Analyse d'impact
{symboles publics modifiés et leurs appelants non adaptés. Format : `appelant:line — conséquence`}

## 9. Verdict
`OK POUR MERGE` ou `BLOQUÉ` (avec raison synthétique).
```

<context>
La définition précise de « bloquant » utilisée pour le verdict de cette revue est consommée par `/item-finish` et n'est pas modifiée par cette skill : un bloquant est tout point en section 2, ou en section 7 avec risque élevé, ou en section 8 avec appelant cassé. Les findings de la section 4 (Qualité UI) ne sont pas bloquants par défaut — ils sont consignés et remontés à l'auteur, qui décide du correctif (immédiat ou différé en backlog).
</context>

### Rapport `security`

```markdown
# Revue sécurité

**Conventions actives** : {bloc de l'étape 1}
**Scope analysé** : {fichiers, fonctions concernés}

## 1. Surface
{points d'entrée : handlers exposés, lecture/écriture fichiers, exécution commandes, accès DB, secrets}

## 2. Vulnérabilités
{Format : `file:line — catégorie — scénario — remédiation`
Catégories : injection / validation entrée / secrets / permissions / IPC / exposition / path traversal / race}

## 3. Zones à surveiller
{code où une régression future serait dangereuse}

## 4. Questions ouvertes
```

### Rapport `release`

```markdown
# Revue pré-release

**Conventions actives** : {bloc de l'étape 1}
**Portée** : {items depuis le dernier tag, volume}

## 1. Impact opérationnel
{dépendances ajoutées/modifiées, config requise, plan de rollback}

## 2. Observabilité
{logs pertinents, absence de données sensibles dans les logs, messages d'erreur actionnables}

## 3. Conformité
{données personnelles, RGPD si pertinent — sinon RAS}

## 4. Checklist pré-déploiement
- [ ] Migrations DB générées et commitées (si applicable)
- [ ] Version bumpée dans le fichier de config
- [ ] CHANGELOG mis à jour
- [ ] Fichier de version archivé dans `docs/archives/`
- [ ] Smoke-test du build effectué localement
- [ ] Doc utilisateur à jour (README et docs/ pertinentes)
- [ ] Aucune dépendance ajoutée sans justification

## 5. Points bloquants
{Format : `file:line — description — impact — remédiation`}
```

<context>
La définition précise de « bloquant » utilisée par `/version-finalize` n'est pas modifiée par cette skill : un release est bloqué si la section 5 est non vide, ou si une case critique de la checklist (4) n'est pas cochée sans justification explicite.
</context>

---

## Aide intégrée

```
/code-review — Revue de code structurée

Templates disponibles :

  wip       Revue WIP avant commit (fichiers non commités)
  item      Revue d'item avant merge (diff branche vs main)
  security  Audit sécurité ciblé (WIP ou branche, auto-détecté)
  release   Revue pré-release (diff depuis dernier tag)

Usage : /code-review <template>
```


---

## Fin de skill — retour au réglage habituel

Si j'ai basculé en `xhigh` au bloc de confirmation, termine en me rappelant : « Pense à repasser en `/effort high` (ton réglage habituel). » Uniquement si cette skill a été invoquée directement — pas quand elle est lancée par `/item-finish` ou `/version-finalize`.
