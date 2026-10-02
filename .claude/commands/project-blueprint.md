---
model: opus
effort: high
---

# /project-blueprint — Cadrage technique avant `/project-start`

## Confirmation du modèle

Cette skill est conçue pour Opus en effort `high`. Elle joue un rôle d'advisor technique : elle propose, argumente, écoute, ajuste. Le travail est éditorial et nécessite du jugement — pas de l'exécution mécanique.

Affiche-moi ce rappel :

> Calibrage attendu : **Opus**, effort **`high`** (ton réglage habituel). Si ce n'est pas ton réglage actif, tape `/model opus` et/ou `/effort high` avant de répondre `ok`.

**Attends ma confirmation explicite (`ok`, `go`, ou équivalent). Ne continue pas tant que je n'ai pas répondu.**

---

## Argument

Pas d'argument. La skill lit toujours `docs/project-description.md` dans le répertoire courant.

Cette skill est typiquement appelée **après** `/office-hours project` (et collage du bloc de cadrage métier) et **avant** `/project-start`. Son rôle est de combler le trou entre le cadrage métier (qui ne donne aucun avis) et le bootstrap projet (qui exige les sections techniques déjà remplies).

---

## Rôle de la skill

<context>
Contrairement à `/office-hours` qui est un facilitateur neutre interdit de donner un avis, cette skill est un **conseiller technique**. Sur chaque décision structurante (type d'application, stack, architecture, etc.), elle :

1. **Lit le cadrage métier** déjà présent dans `docs/project-description.md` (utilisateurs, problème, v0.1, hors scope).
2. **Propose une recommandation argumentée**, ancrée sur le cadrage, en expliquant pourquoi.
3. **Présente les alternatives** plausibles avec leurs trade-offs, sans noyer l'utilisateur.
4. **Demande validation** : valider, ajuster, ou discuter.
5. **Boucle sur la discussion** tant que l'utilisateur n'est pas convaincu.
6. **Mémorise la décision validée** pour la restituer dans le bloc final.

À la fin, produit un bloc Markdown structuré, prêt à être collé section par section dans `docs/project-description.md`. La skill n'écrit dans aucun fichier — c'est l'utilisateur qui copie.
</context>

---

## Étape 1 — Lecture du cadrage projet

Lis `docs/project-description.md` dans le répertoire courant.

<instructions>
**Cas 1 — fichier absent.** Affiche :

> Le fichier `docs/project-description.md` est introuvable. Crée-le en copiant `.claude/templates/project-description-template.md` et remplis au moins la section *Cadrage initial* (idéalement via `/office-hours project`) avant de relancer `/project-blueprint`.

Sors de la skill.

**Cas 2 — fichier présent, section *Cadrage initial* vide ou absente.** Affiche :

> La section *Cadrage initial* de `docs/project-description.md` est vide. Sans cadrage métier, je ne peux pas argumenter mes recommandations techniques.
>
> Réponds :
> - `cadrer` — je sors de la skill, tu lances `/office-hours project`, tu colles le bloc, puis tu me relances.
> - `continuer quand même` — je pose les questions sans pouvoir m'appuyer sur le cadrage métier.
> - `annuler` — je sors de la skill.

Attends ma réponse. Continue uniquement après instruction explicite.

**Cas 3 — fichier présent et cadrage rempli.** Lis intégralement le cadrage initial. Note les éléments structurants (utilisateurs, problème, v0.1, hors scope, critère de succès, outil existant) qui serviront à argumenter chaque recommandation.
</instructions>

Affiche un court préambule :

- Confirme que le cadrage a été lu (en 2-3 lignes synthétiques de ce qui a été retenu).
- Annonce la liste des sections qui vont être traitées (Type / Déploiement, Stack, Architecture, Modes, Services externes, Variables d'environnement, Dev Commands, Code Conventions, Modules / Domaine, Design, Agents à inclure, Agents additionnels).
- Rappel : à chaque section, tu proposes, j'arbitre. La skill n'écrit dans aucun fichier. À la fin, un bloc à coller dans `docs/project-description.md`.

**Attends mon `ok` avant de démarrer la première section.**

---

## Étape 2 — Parcours des sections

Traite les sections **dans l'ordre listé ci-dessous**, **une par une**. Pour chaque section, applique le pattern suivant :

<instructions>
**Pattern par section** :

1. **Recommandation argumentée** : présente ta proposition en t'appuyant explicitement sur des éléments du cadrage (cite-les). Maximum 5-8 lignes — pas un essai.
2. **Alternatives crédibles** : liste 1 à 3 alternatives plausibles avec leur trade-off principal en une ligne chacune. Pas plus.
3. **Question explicite** : termine par : « Tu valides cette proposition, tu ajustes, ou on en discute ? »
4. **Attente** : ne continue pas tant que je n'ai pas répondu.
5. **Traitement de la réponse** :
   - `valider` (ou `ok`, `go`) → mémorise la décision et passe à la section suivante.
   - `ajuster <précisions>` → modifie ta proposition selon mes précisions, re-présente, attends à nouveau.
   - `discuter` ou question → engage la conversation. Réponds, écoute, propose à nouveau quand le sujet est clarifié. Boucle jusqu'à validation explicite.
   - `passer` → la section est laissée vide dans le bloc final, avec mention « à compléter manuellement ». Passe à la suivante.
   - `stop` → arrête le parcours, passe directement à l'étape 3 avec ce qui a été décidé jusque-là.
6. **Sections optionnelles** : pour les sections marquées optionnelles ci-dessous, demande d'abord si la section est pertinente avant de proposer un contenu. Si non pertinente, la marquer comme « à supprimer » dans le bloc final.

**Règle de cohérence** : à chaque nouvelle section, prends en compte les décisions déjà validées. Une recommandation de stack qui contredirait une décision de type est un bug — relis tes décisions précédentes avant de proposer.

**Garde-fou — sujets hors cadrage** : la skill traite **uniquement** les 12 sections listées ci-dessous (Type, Déploiement, Stack, Architecture, Modes, Services externes, Variables d'environnement, Dev Commands, Code Conventions, Modules, Design, Agents). Si la conversation glisse vers un sujet d'implémentation qui ne rentre dans aucune de ces sections — algorithme de génération, format de stockage de données, stratégie d'optimisation, choix d'encodage, format de sortie de fichiers, structure d'un payload, etc. — n'invente pas une section pour l'accueillir. Réponds explicitement :

> « Cette décision relève d'un cycle d'item, pas du cadrage projet. Je la note pour le rappel post-skill — tu pourras la déposer dans `docs/backlog.md` section *Questions ouvertes* après `/project-start`, et elle sera reprise au moment du `/version-start 0.1.0` ou du `/item-start` correspondant. »

Mémorise alors le sujet et le contenu de la discussion sous une liste interne « décisions d'implémentation différées » qui sera restituée à l'étape 4 (rappel post-skill). Puis reviens à la section en cours du cadrage.
</instructions>

### Sections à parcourir, dans l'ordre

#### 2.1 — Type et Déploiement *(décision liée)*

Ces deux sections sont traitées ensemble car elles sont interdépendantes (le type contraint fortement le déploiement). Présente une recommandation conjointe.

Valeurs possibles pour Type : `electron`, `tauri`, `nextjs`, `react-spa`, `node-api`, `full-stack`, `other`.
Valeurs possibles pour Déploiement : `desktop`, `web`, `serveur`, `cli`, `desktop+serveur`.

<context>
Indices à exploiter dans le cadrage :
- Utilisateur unique sur poste local + besoin d'accès à des APIs système ou réseau interne → desktop (Electron ou Tauri).
- Plusieurs utilisateurs distribués → web ou full-stack.
- Pas d'UI, traitement automatisé → CLI ou serveur.
- Mention explicite de Node.js, MSAL, ou écosystème npm lourd → Electron favorisé sur Tauri.
- Mention explicite de légèreté, performance native, ou refus d'embarquer Chromium → Tauri favorisé.
</context>

#### 2.2 — Stack technique

Tableau Stack à remplir : Runtime, Framework, UI, DB, Build, Tests, Quality.

Recommande une stack cohérente avec le type validé en 2.1. Argumente chaque choix structurant (framework, DB notamment) sur la base du cadrage et des standards courants pour ce type d'application.

<instructions>
- Pour les choix qui n'ont pas d'enjeu décisif (ex : Tests = Vitest plutôt que Jest sur un projet Vite — ça se discute mais ce n'est pas structurant), propose ta valeur par défaut sans noyer l'utilisateur dans la justification.
- Pour les choix structurants (framework UI, DB, langage backend), argumente plus longuement et liste explicitement 1-2 alternatives.
- Si la stack standard du type est évidente (ex : Tauri = Rust + Vite + framework JS au choix), ne réinvente pas — propose la combinaison conventionnelle et mentionne que c'est le défaut éprouvé.
</instructions>

#### 2.3 — Architecture

Décrire les couches de l'application. Le template propose un exemple en 4-5 niveaux (Renderer → hooks → Transport → Service → Persistence) — c'est un point de départ, pas une obligation.

Adapte la profondeur à la complexité du projet :

<instructions>
- v0.1 simple, mono-utilisateur, pas de DB → 2-3 couches suffisent (UI → Service → éventuellement Persistence).
- Application desktop avec IPC, DB locale, plusieurs modules → la structure complète a du sens.
- API ou serveur → couches Routes → Controllers → Services → Repositories.
- CLI → souvent juste Commands → Services.

Présente l'arborescence proposée en code-block ASCII, comme dans le template. Explicite la responsabilité de chaque couche en une ligne.
</instructions>

#### 2.4 — Modes de fonctionnement *(optionnel)*

Demande d'abord : « L'application a-t-elle plusieurs modes distincts (au-delà du classique dev/prod) ? Par exemple : online/offline, single-user/multi-user, dev/staging/prod, etc. »

- Si non : marque la section comme « à supprimer » dans le bloc final.
- Si oui : recueille les modes et propose un tableau.

#### 2.5 — Services externes *(optionnel)*

Demande d'abord : « Le projet dépend-il de services ou APIs externes ? (Microsoft Graph, OAuth, paiement, email, stockage cloud, IA, etc.) »

- Si non : marque la section comme « à supprimer ».
- Si oui : pour chaque service, propose une ligne de tableau avec Service, Usage, Type d'accès (REST, SDK, OAuth, clé API, etc.). Demande validation du tableau complet.

#### 2.6 — Variables d'environnement *(optionnel, lié à 2.5)*

Si la section 2.5 a identifié des services externes, propose automatiquement les variables d'environnement correspondantes (URL, clés, secrets), regroupées par catégorie.

Si aucun service externe n'a été identifié, demande quand même : « Y a-t-il d'autres variables d'environnement nécessaires (chemin de DB locale, port d'écoute, niveau de log, etc.) ? »

- Si rien : marque la section comme « à supprimer ».
- Sinon : propose le bloc `.env` template (noms uniquement, jamais de valeurs).

#### 2.7 — Dev Commands

Sur la base de la stack validée en 2.2, propose les commandes standard correspondantes :

- start (lancer en dev)
- test
- build
- lint
- lint:fix
- format (si applicable)

Présente le bloc `bash` complet et demande validation. L'utilisateur peut ajuster (ex : préférer `pnpm` à `npm`, ajouter une commande spécifique).

#### 2.8 — Code Conventions

Propose les défauts pour les cinq champs suivants en une seule passe, puis applique le pattern de l'étape 2 (présente la proposition complète, demande `valides / ajustes / discutes`, boucle si ajustement) :

- **Langue du code** (FR ou EN — commentaires, nommage DB, messages d'erreur internes)
- **Langue de l'interface** (FR ou EN — labels utilisateur)
- **Nommage** : propose la convention standard du langage (camelCase TypeScript, snake_case Python/DB, etc.)
- **Style** : propose l'outil de lint correspondant (ESLint + config standard, ruff, etc.)
- **Principes** : KISS, DRY, YAGNI, SOLID — proposés par défaut. L'utilisateur peut en retirer ou en ajouter.

Format à reproduire dans le bloc final de l'étape 3 (le contenu de la section *Code Conventions*, à coller tel quel dans `docs/project-description.md`) :

```markdown
- **Langue du code** : {valeur validée}
- **Langue de l'interface** : {valeur validée}
- **Nommage** : {convention validée}
- **Style** : {outil validé}
- **Principes** : {liste validée, séparée par virgules}
```

Cette structure est ensuite copiée verbatim par `/project-start` dans la section *Conventions de code* de `CLAUDE.md` — donc ce que tu valides ici est exactement ce que les agents liront ensuite.

#### 2.9 — Modules / Domaine

À partir du cadrage initial (problème à résoudre, v0.1), déduis les modules ou entités principales et propose une liste argumentée.

<example>
Pour un projet de gestion de signatures Outlook avec collaborateurs et bandeaux saisonniers, les modules probables sont :
- `Collaborateur` : fiche d'un employé (nom, fonction, email, options de signature)
- `Signature` : modèle de signature généré
- `Bandeau` : bandeau saisonnier injectable dans une signature

Propose ce type de découpage en l'ancrant sur des éléments du cadrage. L'utilisateur peut ajouter, retirer, fusionner.
</example>

Si le cadrage est trop maigre pour proposer un découpage crédible, dis-le explicitement et demande à l'utilisateur de lister les entités qu'il a en tête.

#### 2.10 — Design

Trois cas possibles dans le template :
- **Cas 1** : pas d'interface utilisateur (CLI, worker, API).
- **Cas 2** : interface présente, design déjà produit (`DESIGN.md` et/ou `design/handoff/`).
- **Cas 3** : interface présente, design à produire plus tard.

<instructions>
Le cas 1 est déductible de la décision de type/déploiement (CLI ou serveur sans UI = cas 1 automatique, à confirmer). Pour les autres types, demande explicitement : « Tu as déjà produit un design (DESIGN.md, handoff Claude Design), ou il sera produit plus tard ? »

- Cas 1 : marque le cas, les deux autres sont à supprimer du fichier final.
- Cas 2 : demande à l'utilisateur de confirmer l'emplacement (`DESIGN.md` racine, `design/handoff/`, autre).
- Cas 3 : rappelle que `/design-system-bootstrap` est la skill prévue pour produire `DESIGN.md` après `/project-start`.
</instructions>

#### 2.11 — Agents à inclure

Cinq agents standards possibles : `test`, `migration`, `audit`, `component`, `feature`.

Propose les cases à cocher en argumentant chaque inclusion ou exclusion à partir des décisions précédentes :

<instructions>
- `test` → recommandé pour quasi tout projet. Exclure seulement pour un script jetable.
- `migration` → inclure si une DB est dans la stack (validée en 2.2).
- `audit` → inclure si l'architecture (validée en 2.3) comporte plusieurs couches transversales (UI + transport + service + DB par exemple). Sur 2 couches, c'est over-engineering.
- `component` → inclure si une bibliothèque de composants partagés est prévue (à demander explicitement si pas évident depuis le cadrage).
- `feature` → inclure si l'utilisateur veut déléguer des features complètes à un agent plutôt que d'orchestrer manuellement. Recommandé sur les projets avec plusieurs modules.

Présente la liste cochée/décochée et demande validation.
</instructions>

#### 2.12 — Agents additionnels *(optionnel)*

Demande : « As-tu besoin d'un agent métier spécifique à ce projet ? Par exemple : un agent dédié à la génération HTML pour les signatures, un agent dédié à l'appel d'une API métier complexe, etc. »

- Si non : marque la section comme « à supprimer ».
- Si oui : pour chaque agent, recueille `nom-agent` (slug) et description du périmètre.

---

## Étape 3 — Synthèse en bloc Markdown

Une fois toutes les sections traitées (ou interruption via `stop`), produis un bloc Markdown structuré, prêt à être collé section par section dans `docs/project-description.md`.

<instructions>
**Vérification préalable — anti-section-inventée** : avant de produire le bloc, relis mentalement les sections que tu t'apprêtes à inclure et vérifie que **chacune** correspond à l'une des 12 sections autorisées du template (Type, Déploiement, Stack, Architecture, Modes, Services externes, Variables d'environnement, Dev Commands, Code Conventions, Modules, Design, Agents — incluant Agents à inclure et Agents additionnels). Si une section autre apparaît dans ton brouillon mental, **c'est un bug** : retire-la, déplace son contenu dans la liste « décisions d'implémentation différées » (cf. garde-fou de l'étape 2), et signale-le à l'utilisateur dans le rappel post-skill.

**Format du bloc final** :

- Reprends la structure exacte des sections du template `project-description-template.md` pour faciliter le copier-coller.
- Pour chaque section décidée : contenu validé.
- Pour chaque section marquée « à supprimer » : indique-le explicitement avec une mention :

  ```markdown
  > **À SUPPRIMER** : pas pertinent pour ce projet (raison brève).
  ```

- Pour chaque section marquée « passer » ou non atteinte (cas `stop`) : indique :

  ```markdown
  > **À COMPLÉTER MANUELLEMENT** : la skill a été interrompue avant traitement de cette section.
  ```

Le bloc complet doit être en français, structuré selon les sections du template, prêt à remplacer les placeholders du template tels qu'ils sont.
</instructions>

Présente le bloc avec ce message :

> Voici le bloc de cadrage technique. Pour chaque section, copie le contenu correspondant dans `docs/project-description.md` à la place du placeholder du template.
>
> Veux-tu ajuster une décision avant de finaliser ?

Si je demande des ajustements, modifie le bloc et représente-le. Sinon, sors de la skill.

---

## Étape 4 — Rappel post-skill

Après présentation du bloc validé, affiche en clôture :

```
Prochaines étapes :
1. Coller chaque section du bloc dans docs/project-description.md (à la place des placeholders).
2. Vérifier que .claude/templates/template-{TYPE}.md existe (le créer sinon).
3. Lancer /project-start pour générer CLAUDE.md, settings, squelette projet et fichiers de doc.
```

<instructions>
**Restitution des décisions d'implémentation différées** : si pendant la skill une ou plusieurs discussions ont été détournées par le garde-fou de l'étape 2 (sujets hors cadrage), affiche-les après les prochaines étapes, sous la forme :

```
Décisions d'implémentation différées (à reprendre plus tard) :
- {sujet 1} — {synthèse de ce qui a été discuté en 1-2 lignes}
- {sujet 2} — {synthèse}
…
```

Ajoute la consigne :

> Dépose ces points dans `docs/backlog.md` section *Questions ouvertes* après `/project-start`. Ils seront repris au moment du `/version-start 0.1.0` ou du `/item-start` correspondant.

**Restitution des sections retirées par la vérification anti-section-inventée** : si l'étape 3 a retiré une section qui s'était glissée dans ton brouillon mental, signale-le explicitement :

> Note : pendant la rédaction du bloc final, j'ai détecté que la section « {nom de la section retirée} » ne fait pas partie des 12 sections du cadrage projet. Je l'ai retirée du bloc et basculée dans les décisions d'implémentation différées ci-dessus.

Si aucune décision n'a été différée et qu'aucune section n'a été retirée, ne mentionne ni l'une ni l'autre — pas de bruit inutile.
</instructions>

---

## Règle absolue

<instructions>
Cette skill N'ÉCRIT JAMAIS dans aucun fichier du projet. Elle produit uniquement un bloc Markdown à coller. C'est l'utilisateur qui édite `docs/project-description.md`. Aucune commande `Write`, `Edit`, ni manipulation de fichier source autorisée pendant l'exécution.

Cette règle est non-négociable même si l'utilisateur demande explicitement à la skill d'écrire dans le fichier — refuser et rappeler que la responsabilité de l'édition revient à l'utilisateur, comme pour `/office-hours`, `/design-system-bootstrap` et `/design-screen-prompt`.

**Liste figée des sections autorisées dans le bloc final** — la structure du bloc Markdown produit à l'étape 3 reproduit **exclusivement** les 12 sections suivantes du template `project-description-template.md`, dans cet ordre :

1. Type
2. Déploiement
3. Stack
4. Architecture
5. Modes de fonctionnement *(optionnel)*
6. Services externes *(optionnel)*
7. Variables d'environnement *(optionnel)*
8. Dev Commands
9. Code Conventions
10. Modules / Domaine
11. Design
12. Agents à inclure
13. Agents additionnels *(optionnel)*

Aucune autre section ne peut être inventée, ajoutée, ou greffée — y compris si l'utilisateur l'évoque pendant la conversation. Toute discussion qui sortirait de ces sections est traitée par le garde-fou de l'étape 2 et restituée à l'étape 4 sous forme de « décisions d'implémentation différées ». La structure du bloc final est verrouillée.
</instructions>

---

## Aide intégrée

```
/project-blueprint — Cadrage technique avant /project-start

Pas d'argument.

Pré-requis :
  - docs/project-description.md existe
  - section "Cadrage initial" remplie (idéalement via /office-hours project)

Position dans le cycle :
  /office-hours project  →  cadrage métier  (n'écrit pas)
       ↓
  Coller le bloc dans docs/project-description.md (cadrage initial)
       ↓
  /project-blueprint     →  cadrage technique  (n'écrit pas)
       ↓
  Coller le bloc dans docs/project-description.md (sections techniques)
       ↓
  /project-start         →  bootstrap effectif (génère les fichiers)
```
