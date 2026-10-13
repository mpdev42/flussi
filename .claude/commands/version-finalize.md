---
model: opus
effort: high
---

# /version-finalize — Finaliser une version

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

## Étape 1 — Vérifications qualité

Récupère depuis `CLAUDE.md` la commande de test et la commande de lint. Exécute-les dans cet ordre :

```bash
{commande test depuis CLAUDE.md}
{commande lint depuis CLAUDE.md}
```

Si tests ou lint échouent, arrête-toi. Présente la sortie d'erreur et demande-moi comment procéder. Ne passe pas à l'étape suivante tant que les deux commandes ne passent pas.

## Étape 2 — Audit de cohérence transversale

Invoque le sub-agent `release-audit-agent` (qui tourne en Sonnet par sa configuration native) avec ce prompt :

> "Audite la cohérence transversale du projet. Vérifie la cohérence entre les couches définies dans CLAUDE.md et produis un rapport de divergences."

<instructions>
Si le rapport signale des divergences : présente-le, attends ma décision avant de continuer. Ne corrige pas toi-même — les corrections relèvent des sub-agents spécialisés invoqués hors de cette skill.

Si aucune divergence n'est signalée : continue.
</instructions>

## Étape 3 — Revue pré-release

Lance `/code-review release`.

<context>
Définition d'un bloquant pour une revue release :
- Section 5 (Points bloquants) du rapport non vide
- OU une case critique de la checklist (section 4) non cochée sans justification écrite
</context>

<instructions>
Si la revue ne signale aucun bloquant : continue.

Si au moins un bloquant : présente le rapport et demande :

> "Bloquant(s) détecté(s). Choisis :
> - `corriger` — sortir de la skill et corriger
> - `ignorer <justification>` — continuer en notant la justification
> - `annuler` — abandonner la skill"

Traitement :
- `corriger` ou `annuler` : sors de la skill.
- `ignorer <justification>` : si la justification est vide, redemande. Une fois la justification reçue, garde-la en mémoire — elle sera mentionnée dans le résumé final ET ajoutée au `CHANGELOG.md` à l'étape 7.
</instructions>

## Étape 4 — Bump de version

Lis `CLAUDE.md` (sections Stack technique et Structure des dossiers) pour identifier les fichiers de version présents dans le projet.

<instructions>
Détecte les fichiers de version réellement présents. Exemples possibles selon la stack :
- `package.json` à la racine ou dans un sous-dossier (ex : `frontend/package.json`)
- `pyproject.toml` (champ `version` dans `[project]`)
- `Cargo.toml` (champ `version` dans `[package]`)
- `tauri.conf.json` (champ `version`)

**Avant tout remplacement, lis la version actuellement déclarée dans le premier fichier de version détecté et mémorise-la sous le nom `ANCIENNE_VERSION`.** Cette valeur sera réutilisée à l'étape 13 pour le résumé final. Si plusieurs fichiers déclarent des versions divergentes, signale-le-moi et demande comment procéder avant de continuer.

Pour chaque fichier détecté, remplace la version actuelle par `{VERSION}`. Ne suppose pas la présence d'un fichier non mentionné dans `CLAUDE.md` ou non trouvé dans le projet.

Note la liste des fichiers mis à jour pour le résumé final.
</instructions>

## Étape 5 — Build production

Récupère la commande de build depuis `CLAUDE.md`. Exécute-la.

<instructions>
**Garde-fou packaging** — la commande exécutée à cette étape doit être une compilation de code uniquement (ex : `electron-vite build`, `vite build`, `next build`, `tsc`, `tauri build --no-bundle`). Elle **ne doit jamais** être une commande qui produit un installateur Windows NSIS, un bundle Tauri (`.msi`, `.exe` Setup) ou tout autre artefact nécessitant des privilèges administrateur.

Avant de lancer la commande :

- Si le nom du script est `package`, `dist`, `release`, ou si la commande contient `electron-builder`, `tauri build` (sans `--no-bundle`), `nsis`, ou `--bundles` → **n'exécute pas**. Signale-moi que la commande de build de `CLAUDE.md` ressemble à une commande de packaging et demande confirmation : soit corriger `CLAUDE.md` pour pointer vers la compilation seule, soit confirmer explicitement de sauter cette étape automatique. La création de l'installateur est traitée manuellement à l'étape 12.
- Sinon → exécute la commande normalement.
</instructions>

Si la commande échoue, diagnostique et corrige, ou demande-moi comment procéder. Ne continue pas tant que le build n'est pas vert.

Note le chemin et le nom de l'artefact généré pour le résumé final.

## Étape 6 — Smoke-test du build

<instructions>
Adapte la stratégie au type de projet déclaré dans `CLAUDE.md` (champ Type ou Déploiement) :

- **Type `desktop`** (Electron, Tauri) : lance l'application, attends 5 secondes, vérifie qu'elle est toujours en cours d'exécution, ferme-la proprement.
- **Type `serveur` ou `node-api`** : démarre le serveur en arrière-plan, attends une réponse de healthcheck (ou simplement que le port déclaré soit ouvert), arrête le serveur.
- **Type `cli`** : exécute l'artefact avec `--help` ou `--version` selon ce qui est implémenté dans le projet.
- **Type `web` (SPA, Next.js)** : sers le build via la commande de preview déclarée dans `CLAUDE.md`, vérifie que le serveur démarre sans erreur fatale, arrête.
- **Stratégie non évidente, type combiné (ex : `desktop+serveur`), ou type `other`** : demande-moi explicitement comment smoke-tester. Attends ma réponse avant de continuer.

Vérifie l'absence d'erreur fatale dans la sortie standard et la sortie d'erreur pendant le test.

- Si une erreur fatale est détectée : arrête-toi, présente la sortie et demande-moi comment procéder.
- Si le smoke-test passe : note le résultat (succès, durée, observations) pour le résumé final et continue.
</instructions>

## Étape 7 — Mettre à jour `CHANGELOG.md`

Lis `docs/version-{VERSION}.md` pour extraire la liste des items réalisés.

Insère une nouvelle section **en tête** du fichier `CHANGELOG.md` (avant la première section existante) :

```markdown
## [{VERSION}] — {date du jour YYYY-MM-DD}

### {Titre de la version}

- **Item 1** — description courte
- **Item 2** — description courte
```

<instructions>
Si des bloquants ont été ignorés à l'étape 3, ajoute à la fin de la section une sous-section :

```markdown
### Bloquants ignorés

- {justification 1}
- {justification 2}
```

Si `CHANGELOG.md` n'existe pas, crée-le avec cette section comme première entrée.
</instructions>

## Étape 8 — Mise à jour de la doc utilisateur

<instructions>
Tente d'invoquer la skill `/document-release`.

- Si la skill est disponible : laisse-la mettre à jour `README.md` et toute autre doc utilisateur (par exemple `docs/guide-utilisateur.md` si présent).
- Si la skill n'est pas trouvée : affiche

> "Étape sautée : `/document-release` non trouvée. Mets à jour la doc utilisateur manuellement avant de tager."

  Attends ma confirmation que la doc est à jour avant de continuer.
</instructions>

## Étape 8 bis — Garde-fou des points ouverts

<context>
Une fois archivé, le fichier de version n'est plus relu par aucune skill : `/version-start` ne reprend que `docs/roadmap.md`, `CLAUDE.md` et `docs/backlog.md`. Un point ouvert noté seulement dans `docs/version-{VERSION}.md` serait donc perdu. Le format des entrées du backlog (section « Points reportés » et « Questions ouvertes ») est défini par `/item-finish` (étape 5).
</context>

<instructions>
Relis `docs/version-{VERSION}.md` et `docs/backlog.md`.

Liste les points reportés, non bloquants ou à trancher notés dans le fichier de version, quelle que soit la rubrique qui les porte (« Point d'attention pour l'item N », « Non bloquant, reporté », « Reporté en v{X} », limitations découvertes, décisions ou questions à trancher), qui ne sont :
- **ni réglés par un item suivant** : un « Point d'attention pour l'item N » est considéré comme réglé si l'item N de cette version est `Terminé`, sauf si les notes de l'item N disent le contraire ;
- **ni déjà présents dans `docs/backlog.md`** : compare l'origine `(v{VERSION}, item {N})` et le contenu de l'entrée.

Si la liste est vide, passe à l'étape suivante sans rien afficher.

Sinon, présente les entrées que tu proposes d'ajouter, au format défini par `/item-finish`, groupées par section (« Points reportés » et sa sous-section cible, ou « Questions ouvertes ») :

> ⚠ Ces points ouverts de v{VERSION} ne sont repris nulle part hors du fichier de version, qui va être archivé :
>
> **Points reportés › {cible}**
> - {action} — `{fichier}` (v{VERSION}, item {N})
>
> **Questions ouvertes**
> - {question} — `{fichier}` (v{VERSION}, item {N})
>
> Réponds `ajouter` pour les écrire dans `docs/backlog.md`, ou `ajuster <précisions>` (retirer un point devenu obsolète, changer une cible, reformuler).

Si je réponds `ajuster`, applique mes précisions et représente la liste. Ne continue pas avant un `ajouter`.

Sur `ajouter` : écris les entrées dans `docs/backlog.md`, en créant la section « Points reportés » (avec sa note, cf. `/item-finish` étape 5), la sous-section cible ou la section « Questions ouvertes » si elles manquent. Ce fichier sera inclus dans le commit de l'étape 11. Mémorise le nombre d'entrées ajoutées pour le résumé final.
</instructions>

## Étape 9 — Archiver le fichier de version

```bash
git mv docs/version-{VERSION}.md docs/archives/version-{VERSION}.md
```

Si le dossier `docs/archives/` n'existe pas, crée-le d'abord, puis effectue le `git mv`.

## Étape 10 — Nettoyer `docs/roadmap.md`

Dans `docs/roadmap.md`, supprime entièrement la section correspondant à `v{VERSION}` (titre + items). Son contenu est désormais archivé.

Vérifie que la prochaine version est bien identifiée dans le fichier.

## Étape 11 — Commit et tag

```bash
git add .
git commit -m "v{VERSION} — Finalisation (version bump, CHANGELOG, archives)"
git tag v{VERSION}
```

Le push doit être effectué manuellement (authentification requise) :

```bash
git push origin main --tags
```

## Étape 12 — Packaging de l'installateur (manuel)

<context>
La création d'un installateur Windows requiert des privilèges administrateur : electron-builder (cible NSIS) crée des liens symboliques dans le répertoire de cache et écrit dans des chemins protégés ; les bundles Tauri ont la même contrainte. La skill ne lance donc **jamais** la commande de packaging — elle est explicitement déléguée à l'utilisateur dans un terminal PowerShell élevé.
</context>

<instructions>
Lis le champ **Type** (et au besoin **Déploiement**) dans `CLAUDE.md` pour décider si un installateur doit être produit :

- Type `electron` ou `tauri` avec déploiement contenant `desktop` (`desktop` ou `desktop+serveur`) → applique le bloc ci-dessous.
- Tout autre type (`nextjs`, `react-spa`, `node-api`, `full-stack`, déploiement `web`, `serveur` ou `cli` pur) → **saute cette étape**, mémorise `INSTALLATEUR_PATH = (sans objet)` et passe directement à l'étape 13.

Si le bloc s'applique :

1. Détermine le chemin absolu de la racine du projet courant (le dossier qui contient `CLAUDE.md` et `package.json`) ; mémorise-le sous `CHEMIN_PROJET`.
2. **N'exécute aucune commande de packaging toi-même.** Affiche à l'utilisateur exactement ce message, en substituant `{CHEMIN_PROJET}` par la valeur réelle calculée au point 1 ci-dessus :

> 📦 **Packaging de l'installateur — à exécuter manuellement**
>
> La création de l'installateur nécessite un terminal **PowerShell ouvert en tant qu'administrateur**. Exécute, dans cet ordre :
>
> ```powershell
> cd {CHEMIN_PROJET}
> npm.cmd run package
> ```
>
> 📁 **Le programme d'installation sera généré dans le dossier `release/` à la racine du projet** (chemin complet : `{CHEMIN_PROJET}\release\`).
>
> Une fois l'opération terminée, indique-moi :
> - le chemin complet de l'installateur généré (fichier `.exe` dans `release/`), **ou**
> - `passer` si tu finalises sans produire l'installateur, **ou**
> - `erreur` si la commande a échoué, en collant la sortie pertinente.

3. Attends la réponse. Traitement :
   - **Chemin fourni** : mémorise-le sous `INSTALLATEUR_PATH` pour le résumé final, puis continue à l'étape 13.
   - **`passer`** : note `INSTALLATEUR_PATH = (non produit — finalisation sans installateur)` et continue à l'étape 13.
   - **`erreur`** : présente la sortie, diagnostique. Ne continue pas tant que la situation n'est pas tranchée — soit l'utilisateur corrige et relance la commande manuellement et me donne le chemin, soit il choisit `passer`.
</instructions>

## Étape 13 — Résumé final

Présente, dans cet ordre :

- **Version bumpée : {ANCIENNE_VERSION} → {VERSION}** (utilise la valeur mémorisée à l'étape 4)
- Fichiers de version mis à jour (chemins explicites)
- Entrée ajoutée dans `CHANGELOG.md`
- Fichier archivé : `docs/archives/version-{VERSION}.md`
- Points ouverts versés au backlog par le garde-fou de l'étape 8 bis : {N}, ou « aucun »
- Tag git créé : `v{VERSION}`
- Push à effectuer manuellement : `git push origin main --tags`
- Artefact de build : chemin/nom (sortie de l'étape 5)
- **Installateur** : `{INSTALLATEUR_PATH}` (chemin renseigné à l'étape 12, ou mention « sans objet » / « non produit » selon le cas)
- Smoke-test : succès ou échec (avec détail si échec)
- Bloquants ignorés à la revue release, avec justifications, si applicable
- Doc utilisateur : mise à jour automatique via `/document-release`, ou rappel manuel selon le cas
