# /item-finish — Terminer un item de version

Arguments attendus : `{version} {numéro}`
Exemple : `/item-finish 1.2.0 3`

---

Tu vas clôturer l'implémentation d'un item de version. Suis ces étapes dans l'ordre.

## Arguments

Depuis `$ARGUMENTS`, extrais :
- `VERSION` — ex: `1.2.0`
- `ITEM` — numéro de l'item, ex: `3`

La branche courante suit le pattern `v{VERSION}/item-{ITEM}-{SLUG}`.

## Étape 1 — Vérification préalable (si nécessaire)

Lis `CLAUDE.md`. Si le `Type` du projet requiert une précondition avant les opérations git (ex: application fermée, processus arrêté), affiche un rappel et attends la confirmation.

## Étape 2 — Vérifications qualité

Lis `CLAUDE.md` pour récupérer les commandes de test et lint. Exécute-les dans l'ordre :

```bash
{commande test}
{commande lint}
```

- Si les tests échouent → diagnostique et corrige
- Si le lint échoue → exécute la commande de fix auto, puis vérifie à nouveau

## Étape 2bis — Revue de code de l'item

Lance `/code-review item`.

**Si des points bloquants sont signalés** (verdict `BLOQUÉ`, ou point en section 2 « Points bloquants », ou section 6 « Gestion d'erreurs » avec risque élevé, ou section 7 « Analyse d'impact » avec appelant cassé) : arrête, présente le rapport et demande :

- `corriger` → sortir du command, laisser l'utilisateur agir
- `ignorer` → continuer ET noter dans le résumé final : « Revue item ignorée malgré N point(s) bloquant(s) : <liste> »
- `annuler` → sortir du command

**Si aucun bloquant** : continuer.

## Étape 3 — Mettre à jour le fichier de version

Dans `docs/version-{VERSION}.md`, trouve l'item {ITEM} et change son statut :
- `À faire` → `Terminé`

Note toute décision importante prise pendant l'implémentation (choix techniques, cas particuliers, limitations découvertes).

## Étape 4 — Commit

```bash
git add .
git commit -m "v{VERSION} Item {ITEM} — {titre court de l'item}"
```

## Étape 5 — Merge et nettoyage

```bash
git checkout main
git merge v{VERSION}/item-{ITEM}-{SLUG}
git branch -d v{VERSION}/item-{ITEM}-{SLUG}
```

## Étape 6 — Résumé

Indique ce qui a été fait, les décisions notées, et si des points restent ouverts pour les prochains items.

**Termine toujours le résumé par cette ligne, mot pour mot :**

> Pour publier : `git push origin main`
