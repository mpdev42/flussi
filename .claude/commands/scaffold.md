---
model: opus
effort: high
---

# /scaffold — Générer le code depuis le format niveau 3

Déclenche la génération du scaffolder à partir des CSV de `scaffold/csv/` : validation, tri
topologique, écriture des fichiers `.base` (toujours réécrits), préservation du custom, régénération
des agrégateurs. Invocable **manuellement**, ou déclenchée **automatiquement** par `/item-start`
quand un item touche une entité scaffoldée.

Voir `.claude/docs/scaffolder-integration.md` (frontière généré/custom, détection des entités).

---

## Bloc de confirmation modèle

<instructions>
Avant toute action, affiche ce bloc et attends ma confirmation explicite. Ne continue pas sans réponse.

> Cette skill est prévue pour tourner en **Opus** avec un effort **`high`**.
> Si ce n'est pas ton réglage actif, tape `/model opus` et/ou `/effort high` avant de répondre `ok`.

Attends ma réponse. Ne continue pas.

**Exception :** si cette skill est déclenchée automatiquement depuis `/item-start` (et non lancée à la
main), saute le bloc de confirmation — le modèle a déjà été confirmé par la skill orchestratrice.
</instructions>

## Étape 1 — Vérifier qu'un scaffolder est actif

<instructions>
Vérifie la présence du dossier `scaffold/` à la racine du projet.

Si `scaffold/` est absent, affiche :

> Aucun scaffolder actif dans ce projet (pas de dossier `scaffold/`). Rien à générer. Pour résoudre un
> scaffolder depuis le catalogue deneb, lance `/scaffolder-resolve`.

Sors de la skill.
</instructions>

## Étape 2 — Lire la configuration du scaffolder

Lis `scaffold/scaffolder.yaml` et relève :
- `generateCommand` — la commande de génération propre au scaffolder (ex. `scaffold` lancée via le
  gestionnaire de paquets `packageManager`, donnant p. ex. `pnpm run scaffold`).
- `io.csvDir` (par défaut `scaffold/csv`) et `io.outDir` (par défaut `src`).

<instructions>
Le moteur de génération **appartient au scaffolder** (il vit dans `scaffold/scripts/`). Cette skill ne
réimplémente rien : elle prépare, lance la commande déclarée, et rend compte.
</instructions>

## Étape 3 — Vérifier les pré-requis

<instructions>
- Vérifie que `scaffold/csv/` existe et contient au moins `entities.csv`. S'il est vide, affiche un
  rappel de remplir les CSV (format : `scaffolders/_shared/entity-description-format.md` côté deneb,
  ou la doc copiée dans `scaffold/`) et sors.
- Vérifie que les dépendances du moteur sont installées (présence de `node_modules` là où le
  scaffolder l'attend). Si elles manquent, indique la commande d'installation (`packageManager`
  install) et demande si je veux que tu la lances. Attends ma réponse.
</instructions>

## Étape 4 — Lancer la génération

Exécute la `generateCommand` du scaffolder.

<instructions>
Le moteur réalise, dans l'ordre : validation pré-génération (s'il détecte une incohérence du niveau 3,
il **n'écrit rien** et remonte toutes les erreurs) → tri topologique sur les clés étrangères →
écriture des fichiers `.base` (toujours réécrits) et des fichiers custom (uniquement s'ils sont
absents) → régénération des agrégateurs par énumération → formatage.

**Premier passage :** le moteur installe aussi le **runtime-kit** dans `src/` (created-once). Les
passages suivants ne le réécrasent pas.

Si la validation échoue : relaie **intégralement** les erreurs remontées par le moteur, n'invente pas
de correctif, et n'écris rien d'autre. La correction se fait dans les CSV, puis on relance `/scaffold`.
</instructions>

## Étape 5 — Rapport

À l'issue d'une génération réussie, présente un récapitulatif :
- Entités traitées (depuis `scaffold/csv/entities.csv`).
- Fichiers `.base` écrits ou mis à jour.
- Fichiers custom **créés** (premiers passages) vs **préservés** (déjà présents, non touchés).
- Agrégateurs régénérés (barrel, registre transport, contrat client, pont preload, routing,
  navigation).
- Runtime-kit : installé (premier passage) ou inchangé.

Rappelle la garantie d'idempotence : relancer `/scaffold` sans changement du niveau 3 produit un diff
vide ; le custom n'est jamais écrasé.

<instructions>
Si cette skill a été déclenchée par `/item-start`, termine sobrement (pas de message de clôture
autonome) : le contrôle revient à la skill orchestratrice, qui poursuit avec les sub-agents (lesquels
n'étendent que via les fichiers custom et les hooks, jamais les `.base`).
</instructions>
