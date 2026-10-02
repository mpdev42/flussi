# /version-finalize — Finaliser une version

Argument attendu : `{version}`
Exemple : `/version-finalize 1.2.0`

---

Tu vas clôturer officiellement une version du projet. Suis ces étapes dans l'ordre.

## Argument

Depuis `$ARGUMENTS`, extrais :
- `VERSION` — ex: `1.2.0`

## Étape 1 — Vérifications préalables

Lis `CLAUDE.md` pour récupérer les commandes de test et lint du projet.

Exécute dans l'ordre (en utilisant les commandes déclarées dans CLAUDE.md) :

```bash
{commande test}
{commande lint}
```

Arrête-toi si les tests ou le lint échouent. Corrige avant de continuer.

## Étape 1bis — Audit de cohérence transversale

Lance `release-audit-agent` avec le prompt suivant :

> Audite la cohérence transversale du projet. Vérifie la cohérence entre les couches définies dans CLAUDE.md et produis un rapport de divergences.

**Si des divergences sont signalées** : arrête-toi, présente le rapport et attends la décision de l'utilisateur avant de continuer.

**Si aucune divergence** : continue à l'étape suivante.

## Étape 1ter — Revue pré-release

Lance `/code-review release`.

**Si des points bloquants sont signalés** (section 5 du rapport non vide, OU checklist critique non cochée sans justification) : arrête le workflow, présente le rapport et demande :

- `corriger` → sortir du command, laisser l'utilisateur agir
- `ignorer` → continuer ET noter dans le résumé final : « Revue release ignorée malgré N point(s) bloquant(s) : <liste> »
- `annuler` → sortir du command

**Si aucun bloquant** : continuer.

## Étape 2 — Bump de version

Lis `CLAUDE.md` pour identifier la stack du projet et mets à jour la version dans les fichiers appropriés :

- Si le projet contient `frontend/package.json` → mets à jour le champ `"version"` avec `{VERSION}`
- Si le projet contient `backend/pyproject.toml` → mets à jour le champ `version` dans `[project]` avec `{VERSION}`
- Si le projet a un `package.json` à la racine → mets à jour le champ `"version"` avec `{VERSION}`
- Si le projet est Rust/Tauri → mets à jour `Cargo.toml` et `tauri.conf.json`

Adapte selon la stack réelle déclarée dans CLAUDE.md.

## Étape 3 — Build production

Lis `CLAUDE.md` pour récupérer la commande de build du projet. Exécute-la.

Si la commande échoue, diagnostique et corrige avant de continuer.

Note le chemin ou le nom de l'artefact généré — il sera mentionné dans le résumé final.

## Étape 4 — Mettre à jour `CHANGELOG.md`

Lis `docs/version-{VERSION}.md` pour extraire la liste des items réalisés.

Insère une nouvelle section **en tête** du fichier `CHANGELOG.md` (avant la première section existante) :

```markdown
## [{VERSION}] — {date du jour YYYY-MM-DD}

### {Titre de la version}

- **Item 1** — description courte
- **Item 2** — description courte
```

Si `CHANGELOG.md` n'existe pas, crée-le.

## Étape 5 — Archiver le fichier de version

```bash
git mv docs/version-{VERSION}.md docs/archives/version-{VERSION}.md
```

Si le dossier `docs/archives/` n'existe pas, crée-le d'abord.

## Étape 6 — Nettoyer `docs/roadmap.md`

Dans `docs/roadmap.md` :
- Supprime entièrement la section correspondant à `v{VERSION}` (titre + items) — son contenu est archivé
- Vérifie que la prochaine version est bien identifiée dans le fichier

## Étape 7 — Commit et tag

```bash
git add .
git commit -m "v{VERSION} — Finalisation (version bump, CHANGELOG, archives)"
git tag v{VERSION}
```

Le push doit être effectué manuellement (authentification requise) :

```bash
git push origin main --tags
```

## Étape 8 — Résumé

Confirme :
- Fichiers de version mis à jour : [liste des fichiers bumpés avec leur chemin]
- Entrée ajoutée dans `CHANGELOG.md`
- Fichier archivé : `docs/archives/version-{VERSION}.md`
- Tag git créé : `v{VERSION}`
- Push à effectuer manuellement : `git push origin main --tags`
- Artefact généré : [chemin/nom]
