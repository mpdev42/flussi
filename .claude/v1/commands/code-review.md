# /code-review — Revue de code structurée

Argument attendu : `{template}` parmi `wip`, `item`, `security`, `release`.
Exemples :
- `/code-review wip`
- `/code-review item`
- `/code-review security`
- `/code-review release`

Sans argument : affiche l'aide (liste des templates).

---

Tu vas produire une revue de code structurée, **read-only**. Ne modifie aucun fichier. Suis strictement le template demandé.

## Arguments

Depuis `$ARGUMENTS`, extrais `TEMPLATE` (premier mot, insensible à la casse).

- Si `TEMPLATE` est vide → **affiche l'aide** (section « Aide intégrée » ci-dessous) et arrête-toi.
- Si `TEMPLATE` n'est pas dans `{wip, item, security, release}` → affiche l'aide avec la mention : « Template inconnu : `{TEMPLATE}`. Did you mean : {suggestion} ? »

---

## Règles communes à tous les templates

1. **Read-only strict** : aucun `Edit`, `Write`, ni commande modifiante.
2. **Ne pas relever ce qu'un linter détecte** : pas de style, imports non utilisés, `let`/`const`, espaces.
3. **Bug vs préférence** : un bug casse quelque chose. Une préférence est discutable — marque-la comme telle.
4. **Alternative concrète obligatoire** : pour chaque critique, propose une reformulation ou une approche.
5. **Pas de remplissage** : une section vide reste `RAS`.
6. **Respecter `CLAUDE.md`** : lis-le avant d'évaluer. Ne relève pas comme « violation » ce qui est une convention assumée.
7. **Référencer les emplacements** : `file:line` pour chaque point.

---

## Étape 1 — Résolution du scope

### Si `TEMPLATE = wip`

```bash
git status --porcelain
git diff
git diff --cached
```

- Si `git status --porcelain` ne retourne rien → afficher « RAS, pas de WIP » et arrêter.

### Si `TEMPLATE = item`

```bash
git branch --show-current
git diff main...HEAD
git log main..HEAD --oneline
```

- Si branche courante = `main` → erreur : « Pas sur une branche d'item. »
- Si aucun commit ahead de `main` → erreur : « Rien à réviser. »

### Si `TEMPLATE = security`

```bash
git status --porcelain
```

- **Si résultat non vide** → scope = `wip`
- **Si résultat vide** → scope = `item`
- **Si ni WIP ni branche d'item** → erreur : « Utilise `release` pour un audit global. »

### Si `TEMPLATE = release`

```bash
git describe --tags --abbrev=0
```

- Si un tag est retourné (ex : `v1.1.0`) :

```bash
git diff v1.1.0..HEAD
git log v1.1.0..HEAD --oneline
```

- Si **aucun tag** : afficher `git log --oneline | head -20` et demander à l'utilisateur le commit de base.

---

## Étape 2 — Seuil de confirmation (tous templates)

Compte les fichiers distincts affectés (`git diff --name-only ...`).

- **Si > 30 fichiers** : afficher la liste et demander confirmation.
- **Si ≤ 30** : continuer directement.

---

## Étape 3 — Analyse et rapport

### Rapport `wip`

```markdown
# Revue WIP

**Scope** : {liste concise des fichiers modifiés}

## 1. Intention
{une phrase sur ce que le changement cherche à faire}

## 2. Points bloquants
{bugs, régressions. Format : `file:line — description — impact`}

## 3. Points d'attention
{violations KISS/DRY/YAGNI/SOLID. Format : `file:line — principe — description — alternative`}

## 4. Qualité des tests
{couverture, tests manquants, tests qui ne testent rien}

## 5. Questions ouvertes
{ce que tu n'as pas pu trancher seul}
```

### Rapport `item`

Comme `wip`, avec en plus :

```markdown
## 6. Gestion d'erreurs
{cas non couverts, propagation. Format : `file:line — cas — risque — traitement recommandé`}

## 7. Analyse d'impact
{symboles publics modifiés et leurs appelants non adaptés. Format : `appelant:line — conséquence`}

## 8. Verdict
`OK POUR MERGE` ou `BLOQUÉ` (avec raison synthétique).
```

**Règle de verdict** : `BLOQUÉ` si au moins un point en section 2, 6 (risque élevé), ou 7 (appelant cassé).

### Rapport `security`

```markdown
# Revue sécurité

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
- [ ] Fichier de version archivé dans `documentation/Archives/`
- [ ] Build testé localement
- [ ] Aucune dépendance ajoutée sans justification

## 5. Points bloquants
{Format : `file:line — description — impact — remédiation`}
```

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
