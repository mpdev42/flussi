---
model: sonnet
effort: high
---

# /document-release — Mise à jour de la documentation utilisateur après release

## Confirmation du modèle

Cette skill est conçue pour **Sonnet** en effort `high`. Une alternative acceptable est **Opus** en effort `high` (ton réglage habituel) quand l'utilisateur veut une analyse plus prudente sur des fichiers de doc longs ou ambigus.

Affiche-moi ce rappel :

> Calibrage attendu : **Sonnet**, effort **`high`** (alternative acceptable : rester en Opus). Pour basculer, tape `/model sonnet` avant de répondre `ok` (puis `/model opus` une fois la skill terminée, pour revenir à ton réglage habituel).

**Attends ma confirmation explicite (`ok`, `go`, ou équivalent). Ne continue pas tant que je n'ai pas répondu.**

---

## Argument

Pas d'argument. La skill est typiquement invoquée par `/version-finalize`, mais peut aussi être lancée manuellement après un release déjà tagué.

---

## Étape 1 — Identification de la dernière version

Exécute :

```bash
git describe --tags --abbrev=0
```

- Si un tag est retourné (ex : `v1.2.0`), c'est la version active. Mémorise-la dans `VERSION_COURANTE`.
- Si aucun tag n'est retourné, signale : « Aucun tag git trouvé. Cette skill ne peut s'exécuter qu'après un premier `/version-finalize`. » Sors de la skill.

Lis `docs/archives/version-{VERSION_COURANTE}.md` pour récupérer :

- La liste des items réalisés dans cette version
- Leur description complète
- Les décisions techniques notées pendant l'implémentation

Si ce fichier est introuvable, signale-le et demande à l'utilisateur de fournir le chemin correct. **Attends sa réponse.**

---

## Étape 2 — Identification du tag précédent et du diff

Exécute :

```bash
git tag --sort=-version:refname | head -2
```

Le premier tag retourné est `VERSION_COURANTE`. Le second, s'il existe, est `VERSION_PRECEDENTE`.

- Si `VERSION_PRECEDENTE` existe :

```bash
git diff VERSION_PRECEDENTE..VERSION_COURANTE -- README.md docs/
git log VERSION_PRECEDENTE..VERSION_COURANTE --oneline
```

- Si `VERSION_PRECEDENTE` n'existe pas (premier release) :

```bash
git log VERSION_COURANTE --oneline -- README.md docs/
```

---

## Étape 3 — Identification des fichiers de doc utilisateur candidats

Liste les fichiers de doc utilisateur potentiellement à mettre à jour :

- `README.md` à la racine du projet, s'il existe.
- Tous les fichiers `*.md` dans `docs/` qui ne sont **pas** :
  - dans `docs/archives/`
  - `docs/roadmap.md`
  - `docs/backlog.md`
  - `docs/version-*.md`
  - `docs/project-description.md`

Présente la liste à l'utilisateur sous forme de puces avec chemin complet.

Demande : « Voici les fichiers candidats à mise à jour. Tu valides cette liste, tu en retires, tu en ajoutes ? »

**Attends ma réponse avant de continuer.**

---

## Étape 4 — Analyse fichier par fichier

Pour chaque fichier validé à l'étape 3 :

1. Lis son contenu actuel intégralement.
2. Compare avec les items réalisés dans la version (depuis `docs/archives/version-{VERSION_COURANTE}.md`) et avec le diff produit à l'étape 2.
3. Identifie les sections potentiellement obsolètes :
   - Fonctionnalité décrite dans le fichier mais modifiée par la version.
   - Écran ou parcours décrit qui n'existe plus après la version.
   - Paramètre, option, ou commande dont la signature a changé.

<instructions>
Une section n'est obsolète que si le diff entre `VERSION_PRECEDENTE` et `VERSION_COURANTE` la contredit explicitement. Une section qui « pourrait » être améliorée mais que rien dans le diff ne contredit n'est PAS obsolète : elle doit apparaître uniquement dans le résumé final (étape 7), section *Sections potentiellement améliorables*, sans modification.

Ne propose aucune modification fondée sur ce que tu sais en général de ce type de produit. Toute modification doit s'appuyer sur :
- une ligne précise du fichier actuel, et
- un élément précis du diff ou du fichier de version archivé.

Si tu ne peux pas pointer ces deux éléments, ne propose pas de modification.
</instructions>

---

## Étape 5 — Proposition de mise à jour, fichier par fichier

Pour chaque fichier où des modifications sont proposées, présente :

```markdown
### Fichier : `{chemin}`

**Sections concernées** :
- Ligne {n}-{m} : {description courte de l'obsolescence, avec référence au diff}

**Diff proposé** :

```diff
- {ligne actuelle}
+ {ligne proposée}
```

{répéter pour chaque section concernée}
```

Demande validation FICHIER PAR FICHIER. Ne groupe jamais plusieurs fichiers dans une même demande de validation.

Pour chaque fichier, attends l'une de ces trois réponses :

- `valider` → la modification sera appliquée.
- `ajuster` → l'utilisateur précise ce qu'il veut, tu reproposes le diff.
- `ignorer ce fichier` → aucune modification sur ce fichier.

**Attends ma réponse pour chaque fichier avant de passer au suivant.**

Si un fichier ne nécessite aucune modification (rien d'obsolète détecté), signale-le explicitement et passe au suivant sans demander de validation.

---

## Étape 6 — Application des modifications validées

Une fois toutes les validations reçues :

1. Applique uniquement les modifications validées (`valider`) sur les fichiers correspondants.
2. **Ne fais aucun `git commit`** :
   - Si la skill est appelée par `/version-finalize`, le commit sera fait par le `git add .` de `version-finalize`.
   - Si la skill est lancée manuellement, signale à l'utilisateur qu'il doit faire le commit lui-même, et donne-lui la commande exacte : `git add {liste des fichiers modifiés} && git commit -m "doc — mise à jour pour v{VERSION_COURANTE}"`.

---

## Étape 7 — Résumé final

Produis un résumé structuré :

```markdown
# Résumé — Mise à jour doc utilisateur — {VERSION_COURANTE}

## Fichiers mis à jour
- `{chemin}` — {résumé court des modifications appliquées}
{...}

## Fichiers ignorés (sur ta demande)
- `{chemin}` — ignoré
{...}

## Fichiers où aucune mise à jour n'était nécessaire
- `{chemin}` — RAS
{...}

## Sections potentiellement améliorables (non modifiées)
- `{chemin}:{ligne}` — {description courte} — non démontrablement obsolète d'après le diff. À revoir manuellement si besoin.
{...}
```

---

## Règles absolues

<instructions>
1. Ne pas inventer des sections de documentation qui n'existent pas dans le fichier original. Toute proposition doit s'appuyer sur le contenu actuel du fichier ET sur le diff entre les deux tags.
2. Ne modifier que ce qui est démontrablement obsolète. Si une section pourrait bénéficier d'une mise à jour mais que rien dans le diff ne le justifie, la mentionner dans le résumé final (étape 7) sans la modifier.
3. Ne pas créer de nouveau fichier de documentation. Cette skill ne fait que mettre à jour des fichiers existants.
4. Ne pas commiter. Le commit est de la responsabilité de l'utilisateur ou de `/version-finalize`.
5. Demander validation fichier par fichier — jamais grouper.
6. Aucune modification ne peut être appliquée sans une réponse `valider` explicite à l'étape 5.
</instructions>


---

## Fin de skill — retour au réglage habituel

Si j'ai basculé sur Sonnet au bloc de confirmation, termine en me rappelant : « Pense à repasser en `/model opus` (ton réglage habituel). »
