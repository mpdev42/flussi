# /item-start — Démarrer un item de version

Arguments attendus : `{version} {numéro} {slug-branche}`
Exemple : `/item-start 1.2.0 3 dark-mode`

---

Tu vas démarrer l'implémentation d'un item de version. Suis ces étapes dans l'ordre.

## Arguments

Depuis `$ARGUMENTS`, extrais :
- `VERSION` — ex: `1.2.0`
- `ITEM` — numéro de l'item, ex: `3`
- `SLUG` — slug court pour la branche, ex: `dark-mode`

## Étape 1 — Git : préparer la branche

```bash
git checkout main
git pull
git checkout -b v{VERSION}/item-{ITEM}-{SLUG}
```

## Étape 2 — Lire le contexte

Lis ces fichiers :
1. `docs/version-{VERSION}.md` — trouve l'item {ITEM}, lis sa description complète, ses décisions, ses fichiers concernés
2. `CLAUDE.md` — conventions du projet (architecture, nommage, patterns, contraintes techniques)

## Étape 3 — Explorer le code

À partir de ce que tu as lu, identifie les fichiers impactés et explore-les. Comprends l'état actuel du code avant de proposer quoi que ce soit.

## Étape 4 — Résumé et proposition

Présente :
- Ce que tu as compris de l'item (objectif, contraintes, décisions déjà prises)
- Les fichiers que tu vas modifier
- Ton approche proposée

Attends la validation avant de commencer à coder.

## Étape 5 — Implémenter

**OBLIGATOIRE : utilise les agents spécialisés de `.claude/agents/` pour coder.**

Ne fais aucun Edit/Write directement depuis la session principale sur des fichiers sources du projet. Orchestre les agents adaptés au travail à faire et lance-les en parallèle quand ils sont indépendants.

Consulte `CLAUDE.md` pour les contraintes techniques spécifiques au projet (ORM, framework, compilation native, etc.) et applique-les à tous les agents que tu orchestres.

Une fois terminé, présente un récapitulatif de ce qui a été fait.

**Ne pas commit, ne pas merger, ne pas supprimer la branche** — c'est le rôle de `/item-finish`.
