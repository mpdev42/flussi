---
model: opus
effort: high
---

# /scaffold-sync — Re-tirer la dernière version d'un scaffolder depuis deneb

Met à jour le scaffolder d'un projet existant en re-copiant sa dernière version depuis le catalogue
deneb, **en préservant les CSV de l'utilisateur** (`scaffold/csv/`). Philosophie : un scaffolder est
**figé par projet** ; la synchronisation est explicite, à invoquer sur demande.

Voir `.claude/docs/scaffolder-integration.md`.

---

## Bloc de confirmation modèle

<instructions>
Avant toute action, affiche ce bloc et attends ma confirmation explicite. Ne continue pas sans réponse.

> Cette skill est prévue pour tourner en **Opus** avec un effort **`high`**.
> Si ce n'est pas ton réglage actif, tape `/model opus` et/ou `/effort high` avant de répondre `ok`.

Attends ma réponse. Ne continue pas.
</instructions>

## Étape 1 — Vérifier qu'un scaffolder est actif

<instructions>
Vérifie la présence du dossier `scaffold/` à la racine du projet.

Si `scaffold/` est absent, affiche :

> Aucun scaffolder actif dans ce projet (pas de dossier `scaffold/`). Pour en résoudre un depuis le
> catalogue deneb, lance `/scaffolder-resolve`.

Sors de la skill.
</instructions>

## Étape 2 — Lire le scaffolder local

Lis `scaffold/scaffolder.yaml` et relève le `slug` et la `version` actuellement installés dans le
projet.

## Étape 3 — Localiser la source dans deneb

Localise le scaffolder source au chemin canonique :

```
C:\Dev\Projets\deneb\scaffolders\{slug}\
```

<instructions>
- Si le chemin deneb n'existe pas : signale que deneb est introuvable et arrête-toi.
- Si `scaffolders/{slug}/` n'existe pas dans deneb : affiche que le scaffolder `{slug}` n'est plus (ou
  pas) au catalogue, et arrête-toi. Ne touche à rien.
- Sinon : lis son `scaffolder.yaml` et relève sa `version`.
</instructions>

## Étape 4 — Comparer les versions

Affiche la version locale (projet) et la version source (deneb).

<instructions>
- Si elles sont identiques : indique que le projet est déjà à jour, et demande si je veux quand même
  resynchroniser (utile si les templates ont changé sans bump de version). Attends ma réponse.
- Si la source est plus récente : présente le delta de version et continue.
- Si la source est plus ancienne que le projet (cas rare) : signale-le et demande confirmation avant
  de poursuivre (tu t'apprêterais à rétrograder).
</instructions>

## Étape 5 — Annoncer ce qui sera remplacé et préservé

<instructions>
Affiche clairement, et attends ma validation explicite avant toute écriture :

> Synchronisation du scaffolder `{slug}` : {version locale} → {version source}.
> - **Remplacés** (re-copiés depuis deneb) : `scaffold/scaffolder.yaml`, `scaffold/templates/`,
>   `scaffold/scripts/`, et la configuration du moteur.
> - **Préservés** (jamais touchés) : `scaffold/csv/` (tes entités).
>
> Le code déjà généré dans `src/` n'est pas modifié par cette étape — relance `/scaffold` ensuite pour
> régénérer les `.base` avec les nouveaux templates.

Ne continue pas sans validation.
</instructions>

## Étape 6 — Re-copier

Copie depuis `C:\Dev\Projets\deneb\scaffolders\{slug}\` vers `scaffold/` : `scaffolder.yaml`,
`templates/`, `scripts/`, et la configuration du moteur. **Ne touche pas à `scaffold/csv/`.** Exclus
le harnais de test (`node_modules/`, `examples/`, `target-template/`, lockfiles, `build-smoke.ps1`).

<instructions>
**Runtime-kit.** Le runtime-kit vit dans `src/` du projet (installé une fois, custom). Si la nouvelle
version du scaffolder modifie le contrat du runtime-kit, **ne l'écrase pas silencieusement** : signale
que le runtime-kit côté projet peut nécessiter une réconciliation manuelle (compare
`scaffold/runtime-kit/` ou `scaffold/docs/runtime-contract.md` avec ce qui est installé dans `src/`),
et laisse-moi décider. Une couche custom ne se réécrit jamais sans mon accord.
</instructions>

## Étape 7 — Rapport et suite

Récapitule : ancienne et nouvelle version, éléments re-copiés, `scaffold/csv/` préservé, et tout point
de réconciliation runtime-kit signalé. Puis :

> Synchronisation terminée. Relance `/scaffold` pour régénérer les fichiers `.base` avec les nouveaux
> templates. Le custom et tes CSV sont intacts.
