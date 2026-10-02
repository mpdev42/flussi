---
model: opus
effort: xhigh
---

# /scaffolder-bootstrap — Créer un nouveau scaffolder dans deneb

Guide la **création d'un nouveau scaffolder** dans le catalogue deneb, à partir de la spec niveau 1 —
**jamais** par duplication d'un scaffolder existant. Appelée quand `/scaffolder-resolve` n'a trouvé
aucun scaffolder correspondant à la stack du projet.

Cette skill **orchestre** le prompt de création réutilisable
`scaffolders/_shared/scaffolder-bootstrap-prompt.md` : elle le charge, recueille les paramètres, en
déroule la méthode, et vérifie les preuves de validation. Voir aussi
`.claude/docs/scaffolder-integration.md`.

---

## Bloc de confirmation modèle

<instructions>
Avant toute action, affiche ce bloc et attends ma confirmation explicite. Ne continue pas sans réponse.

> Cette skill est prévue pour tourner en **Opus** avec un effort **`xhigh`** : créer un scaffolder est
> le travail le plus lourd du catalogue (templates + moteur de génération + preuves de validation).
> Si l'effort actif n'est pas `xhigh`, tape `/effort xhigh` avant de répondre `ok` (puis `/effort high` une fois la skill terminée, pour revenir à ton réglage habituel).

Attends ma réponse. Ne continue pas.
</instructions>

## Où s'exécute cette skill

Un scaffolder se crée **dans deneb**, au chemin canonique :

```
C:\Dev\Projets\deneb\scaffolders\{slug}\
```

<instructions>
Si la conversation est ouverte dans deneb, tu travailles directement dans `scaffolders/`. Si elle est
ouverte dans un projet utilisateur, signale-le : le scaffolder doit être créé dans deneb (chemin
canonique ci-dessus), pas dans le projet. Propose de poursuivre en ciblant ce chemin, ou de relancer
la skill depuis une conversation ouverte dans deneb. Attends ma réponse.
</instructions>

## Étape 1 — Lire le cahier des charges

Lis intégralement, dans cet ordre :
1. `scaffolders/_shared/spec.md` — spec niveau 1 (artefacts, frontière généré/custom, garanties,
   relations, validation).
2. `scaffolders/_shared/entity-description-format.md` — format niveau 3 (les 4 CSV).
3. `scaffolders/_shared/scaffolder-bootstrap-prompt.md` — la **recette** que cette skill déroule.
4. `CLAUDE.md` de deneb — conventions du méta-projet (frontière `.base`/custom, patterns d'écran,
   décisions actées).

Le prompt de bootstrap est la source de vérité de la méthode. Cette skill ne le réécrit pas : elle
l'applique.

## Étape 2 — Recueillir les axes de la stack cible

Demande-moi les axes de la stack à supporter (granularité 4-5 axes) :
- méta-framework, ORM, base de données, framework UI, couche transport.

<instructions>
Si la skill a été appelée à la suite de `/scaffolder-resolve` (échec de résolution), reprends les
axes déjà identifiés pour le projet et demande-moi seulement de confirmer/compléter.

Dérive un `slug` en minuscules-tirets à partir des axes (ex. `electron-drizzle-sqlite-react`).
Présente-le et attends ma validation.
</instructions>

## Étape 3 — Vérifier l'absence de doublon

Vérifie que `scaffolders/{slug}/` n'existe pas déjà dans deneb.

<instructions>
- S'il existe : ne l'écrase pas. Signale-le et demande-moi si je veux le faire évoluer (hors périmètre
  de cette skill — c'est une modification manuelle ou une re-création explicite) ou choisir un autre
  slug. Sors si je n'en choisis pas un nouveau.
- S'il n'existe pas : continue.
</instructions>

## Étape 4 — Plan d'implémentation

Suivant la section « Méthode recommandée » du prompt de bootstrap, présente d'abord un **plan** avant
toute écriture : structure du scaffolder à produire (`scaffolder.yaml`, `README.md`, `templates/`,
`scripts/`, `runtime-kit/`), choix d'outils concrets pour chaque rôle abstrait de la spec, et les
**7 écarts imposés** par rapport à un scaffolder de référence (généralisation de `.base`, agrégateurs
par énumération + compagnons, tri topologique, frontière std/custom déclarative, validation
pré-génération « n'écrit rien si incohérent », service classe `.base` + custom à 9 hooks, validation
partagée client/serveur).

Attends ma validation du plan. Ne produis aucun fichier avant.

## Étape 5 — Produire le scaffolder

Une fois le plan validé, produis les livrables dans `scaffolders/{slug}/`, conformément au prompt de
bootstrap :
- `scaffolder.yaml` — slug, axes de stack, version, `specVersion`, `io` (csvDir/outDir),
  `extensionColumns`, mapping `artifacts` (nom canonique → chemin réel de la stack).
- `README.md` — description, installation dans un projet, commande de génération, frontière
  généré/custom.
- `templates/` — un template par artefact canonique.
- `scripts/` — le moteur (parse CSV, valide selon §9 du format, tri topologique, rend les templates,
  écrit `.base`/custom, régénère les agrégateurs par énumération).
- `runtime-kit/` — la couche runtime partagée installée une fois côté projet (voir l'approche hybride,
  `.claude/docs/scaffolder-integration.md` §9).

## Étape 6 — Preuves de validation

Rappelle et, dans la mesure du possible, vérifie les **4 preuves** attendues par le prompt de
bootstrap :
1. **Reconstruction + diff** d'un jeu d'entités de référence (les seuls écarts doivent être les 7
   imposés).
2. **Idempotence** : deux générations consécutives sans changement du niveau 3 → diff vide.
3. **Préservation du custom** : un fichier custom survit à une régénération ; le `.base` est réécrit.
4. **Smoke test** : l'application cible compile/démarre avec les artefacts générés.

<instructions>
Documente le résultat de chaque preuve réalisable. Pour ce qui n'est pas testable dans le contexte
courant, dis-le explicitement plutôt que de l'affirmer.
</instructions>

## Étape 7 — Fin

Récapitule le scaffolder créé (slug, version, axes, preuves passées). Indique la suite :

> Le scaffolder `{slug}` est créé dans le catalogue deneb. Pense à le **committer dans deneb**.
> Tu peux maintenant lancer `/scaffolder-resolve` dans ton projet pour le copier et activer `scaffold/`.

Rappelle qu'une évolution ultérieure de la spec niveau 1 devra être propagée à ce scaffolder.


---

## Fin de skill — retour au réglage habituel

Si j'ai basculé en `xhigh` au bloc de confirmation, termine en me rappelant : « Pense à repasser en `/effort high` (ton réglage habituel). »
