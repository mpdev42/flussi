---
model: opus
effort: high
---

# /document-validation — PDF de cadrage pour donneur d'ordre

## Confirmation du modèle

Cette skill est conçue pour **Opus** en effort `high`. Le travail consiste à reformuler du contenu technique en langage métier — c'est du jugement éditorial qui justifie ce modèle.

Affiche-moi ce rappel :

> Calibrage attendu : **Opus**, effort **`high`** (ton réglage habituel). Si ce n'est pas ton réglage actif, tape `/model opus` et/ou `/effort high` avant de répondre `ok`.

**Attends ma confirmation explicite (`ok`, `go`, ou équivalent). Ne continue pas tant que je n'ai pas répondu.**

---

## Argument

Argument attendu : `{scope}` parmi `project` ou `version {VERSION}`.

Exemples :
- `/document-validation project`
- `/document-validation version 1.2.0`

Depuis `$ARGUMENTS`, extrais `SCOPE` (premier mot, insensible à la casse) et, si applicable, `VERSION` (deuxième token).

- Si `SCOPE` est vide → afficher l'aide intégrée (en bas de ce fichier) et arrêter.
- Si `SCOPE` n'est pas dans `{project, version}` → afficher l'aide avec la mention : « Scope inconnu : `{SCOPE}`. Did you mean : {suggestion} ? » et arrêter.
- Si `SCOPE = version` mais `VERSION` est absent → afficher : « L'argument `version` nécessite un numéro de version (ex : `/document-validation version 1.2.0`). » et arrêter.

---

## Étape 1 — Lecture du contexte

Selon le scope retenu, lis les fichiers suivants. Tout fichier requis introuvable provoque l'arrêt de la skill avec un message explicite indiquant le fichier manquant.

### Si `SCOPE = project`

- `docs/project-description.md` — description initiale du projet.
- `CLAUDE.md` — référence opérationnelle du projet.

### Si `SCOPE = version {VERSION}`

- `docs/version-{VERSION}.md` si présent. Sinon, fallback sur `docs/archives/version-{VERSION}.md` (cas où la version a déjà été finalisée et archivée).
- Si aucun des deux n'existe → arrêter avec : « Ni `docs/version-{VERSION}.md` ni `docs/archives/version-{VERSION}.md` n'ont été trouvés. Vérifie le numéro de version. »
- `CLAUDE.md` — pour le contexte projet (nom, utilisateurs, modules), même si la cible est une version spécifique.

<instructions>
Lis intégralement chaque fichier. Note les éléments structurants : nom du projet, utilisateurs cibles, modules, items prévus, ordre de réalisation, items retirés (YAGNI), décisions techniques. Ne reformule rien à ce stade — la reformulation arrive à l'étape 3.
</instructions>

---

## Étape 2 — Identification du donneur d'ordre

Demande à l'utilisateur :

> Qui est le donneur d'ordre pour cette validation ? Choisis :
> - Directeur général
> - Directeur technique
> - Directeur comptable (DRH)
> - Collègue SEO
> - Direction (l'ensemble de la direction)
> - Autre (précise)

**Attends ma réponse.** Mémorise la valeur dans `DONNEUR_ORDRE`. Si la réponse est `Autre`, demande la précision et utilise la formulation fournie.

---

## Étape 3 — Reformulation en langage non technique

Cette étape est le cœur de la skill. Tu reformules le contenu lu à l'étape 1 en langage métier, lisible par un non-développeur.

### Règles de reformulation

<instructions>
- **Pas de jargon technique.** Bannis : `ORM`, `transport`, `endpoint`, `stack`, `migration`, `schéma DB`, `IPC`, `handler`, `service`, `module`, `composant`, `branche`, `commit`, `merge`, `runtime`, `framework`, `build`, `lint`, `tests unitaires`, `couche`, `repository`, `payload`.
- **Pas de noms de technologies dans le corps du texte.** Tauri, Electron, React, Drizzle, Postgres, etc. sont bannis. Si une caractéristique technique est pertinente pour le donneur d'ordre, reformule-la en termes d'usage : « application desktop avec base de données locale », « interface web », « synchronisation avec un serveur central ».
- **Phrases courtes, voix active.** Pas de tournures passives ni de subordinations à rallonge.
- **Bullet points** pour les listes (fonctionnalités, périmètre, critères de succès). Une à deux lignes par puce maximum.
- **Pas d'invention.** Toute affirmation doit s'appuyer sur le contenu lu à l'étape 1. Si une information utile manque (par exemple, durée prévisionnelle), ne l'invente pas — soit tu l'omets, soit tu signales son absence à l'utilisateur avant de continuer.
</instructions>

<example>
Mauvaises reformulations (à éviter) :
- « Le module Clients expose un service via la couche transport vers le renderer Tauri. »
- « Migration ORM Drizzle pour ajouter la colonne `phone` en NOT NULL avec DEFAULT. »

Bonnes reformulations (à viser) :
- « L'écran de gestion des clients permet de créer, modifier et consulter les fiches clients. »
- « Ajout du champ téléphone obligatoire dans la fiche client, avec une valeur par défaut pour les fiches existantes. »
</example>

### Structure selon le scope

#### Si `SCOPE = project`

Produis un document structuré avec ces sections, dans cet ordre :

1. **Objectif du projet** — un à deux paragraphes décrivant le problème résolu et la valeur apportée.
2. **Utilisateurs concernés** — qui se servira concrètement de l'outil.
3. **Périmètre** — deux sous-listes : ce qui sera fait / ce qui ne sera pas fait (issu de la section *Hors scope* du cadrage initial si présente).
4. **Critères de succès** — comment on saura que le projet a réussi.
5. **Roadmap prévisionnelle** — versions à venir avec leurs grands jalons, sans détails techniques.
6. **Validation** — bloc de signature (rempli à l'étape 5).

#### Si `SCOPE = version {VERSION}`

Produis un document structuré avec ces sections, dans cet ordre :

1. **Contexte** — rappel court du projet (2-3 lignes), pour situer la version.
2. **Objectif de cette version** — ce qu'elle apporte concrètement aux utilisateurs.
3. **Fonctionnalités à développer** — chaque item de la version, décrit en langage métier (titre + description courte + bénéfice utilisateur).
4. **Ordre de réalisation et estimation indicative** — si présents dans le fichier source. Si l'estimation n'existe pas, mentionne « Estimation non communiquée à ce stade » plutôt que d'inventer.
5. **Ce qui n'est pas dans cette version** — items retirés (YAGNI) avec leur justification métier, ou mention explicite « Aucun item retiré » si la section est vide ou absente.
6. **Validation** — bloc de signature (rempli à l'étape 5).

---

## Étape 4 — Validation utilisateur du contenu reformulé

Présente le contenu reformulé en intégralité à l'utilisateur, suivi de :

> Voici le contenu prêt à être inséré dans le PDF. Tu valides, tu ajustes, ou tu annules ?

**Attends ma réponse.**

- `valider` → continuer à l'étape 5.
- `ajuster` → demande ce qu'il faut changer, applique les modifications, re-présente le contenu pour une nouvelle validation. Boucle jusqu'à validation explicite.
- `annuler` → sors de la skill.

---

## Étape 5 — Génération du PDF

### 5.1 — Préparer le fichier Markdown source

Détermine le nom du fichier selon le scope :

- Si `SCOPE = project` : `docs/validation/cadrage-projet-{date YYYY-MM-DD}.md`
- Si `SCOPE = version` : `docs/validation/cadrage-v{VERSION}-{date YYYY-MM-DD}.md`

Crée le dossier `docs/validation/` s'il n'existe pas.

<instructions>
Si un fichier portant le même nom existe déjà (cas d'une régénération le même jour), écrase-le sans demander confirmation. La régénération est attendue, par exemple après installation de pandoc/wkhtmltopdf à l'étape 5.2.
</instructions>

Le fichier Markdown contient :

- **Titre principal** :
  - Pour `project` : `# Cadrage de projet — {nom du projet}`
  - Pour `version` : `# Cadrage de version — {nom du projet} — v{VERSION}`
- **En-tête** sous le titre :
  - Projet : `{nom du projet}`
  - Donneur d'ordre désigné : `{DONNEUR_ORDRE}`
  - Date de génération : `{date YYYY-MM-DD}`
- **Contenu reformulé** validé à l'étape 4.
- **Bloc de signature** en bas du document :

```markdown
---

## Validation

**Donneur d'ordre** : {DONNEUR_ORDRE}

| Champ      | Valeur                          |
|------------|---------------------------------|
| Nom        |                                 |
| Date       |                                 |
| Signature  |                                 |

*Signature manuscrite ou validation par email équivalente.*
```

### 5.2 — Vérifier la disponibilité de pandoc et wkhtmltopdf

Exécute :

```bash
pandoc --version
wkhtmltopdf --version
```

<instructions>
Si l'un des deux outils n'est pas disponible, affiche les instructions d'installation pour Windows 11 puis arrête la skill (le fichier Markdown source reste en place pour la prochaine exécution) :

> **Outil manquant** : `{outil}` n'a pas été détecté.
>
> Installation sous Windows 11 :
> - **Pandoc** : télécharger l'installeur `.msi` sur https://pandoc.org/installing.html, exécuter l'installeur, redémarrer le terminal.
> - **wkhtmltopdf** : télécharger la version Windows sur https://wkhtmltopdf.org/downloads.html, exécuter l'installeur, redémarrer le terminal.
>
> Une fois les deux outils installés, relance `/document-validation {scope}` — le fichier Markdown source `{chemin}` est déjà en place et la génération PDF reprendra à partir de lui.
</instructions>

### 5.3 — Générer le PDF

Si les deux outils sont disponibles, exécute :

```bash
pandoc docs/validation/{nom}.md -o docs/validation/{nom}.pdf --pdf-engine=wkhtmltopdf --pdf-engine-opt=--enable-local-file-access -V geometry:margin=2cm -V mainfont="Calibri" -V fontsize=11pt
```

<context>
Cette commande produit un PDF A4 avec marges 2 cm, police Calibri 11pt, sans branding. Calibri est présent par défaut sur Windows 11. Si la commande échoue parce que la police n'est pas trouvée, tente un fallback avec `Arial` puis avec `sans-serif` avant d'abandonner.

Adapte les options si le contenu l'exige (par exemple, si un document de version contient beaucoup d'items, tu peux ajouter `-V fontsize=10pt` pour limiter le nombre de pages).
</context>

### 5.4 — Gérer les erreurs

Si la génération échoue, affiche la sortie d'erreur intégrale et demande :

> La génération PDF a échoué. Sortie d'erreur ci-dessus. Tu veux que je tente un fallback (police différente, options réduites), que je sorte de la skill, ou que tu prennes la main ?

**Attends ma réponse.** N'invente pas de solution sans validation.

---

## Étape 6 — Résumé final

Présente :

```markdown
# Document de validation généré

- **Scope** : {project | version {VERSION}}
- **Donneur d'ordre désigné** : {DONNEUR_ORDRE}
- **Fichier Markdown source** : `docs/validation/{nom}.md`
- **Fichier PDF généré** : `docs/validation/{nom}.pdf`

## Prochaine étape

Envoie le PDF à {DONNEUR_ORDRE} pour validation. Une fois validé (signature manuscrite ou validation par email), tu peux démarrer le développement avec `/version-start` ou `/item-start` selon le scope.
```

---

## Règle absolue

<instructions>
Cette skill ne fait AUCUN `git add` ni `git commit`. Le Markdown source et le PDF générés sont laissés tels quels dans `docs/validation/`. C'est à l'utilisateur de décider :
- soit de les commiter dans le dépôt (pour conserver une trace versionnée des cadrages validés),
- soit de les garder hors du dépôt (en ajoutant `docs/validation/` au `.gitignore`),

selon sa politique de gestion documentaire.

Aucune commande modifiante en dehors de la création des deux fichiers (Markdown source + PDF) et du dossier `docs/validation/`.
</instructions>

---

## Aide intégrée

```
/document-validation — Génère un PDF de cadrage pour donneur d'ordre

Scopes disponibles :
  project              Cadrage du projet entier
  version {VERSION}    Cadrage d'une version spécifique
                       (ex : /document-validation version 1.2.0)

Le PDF est généré dans docs/validation/ avec une mise en page neutre
(pas de branding cabinet).

Outils requis : pandoc et wkhtmltopdf (installeurs Windows respectifs).
```
