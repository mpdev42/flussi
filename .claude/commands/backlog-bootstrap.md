---
model: opus
effort: high
---

# /backlog-bootstrap — Amorce ou enrichit le backlog d'un projet

## Confirmation du modèle

Cette skill est conçue pour **Opus** en effort `high`. Le travail consiste à raisonner sur le contexte d'un projet pour proposer des items de backlog pertinents, puis à orchestrer une validation item par item — c'est du jugement éditorial qui justifie ce modèle.

Affiche-moi ce rappel :

> Calibrage attendu : **Opus**, effort **`high`** (ton réglage habituel). Si ce n'est pas ton réglage actif, tape `/model opus` et/ou `/effort high` avant de répondre `ok`.

**Attends ma confirmation explicite (`ok`, `go`, ou équivalent). Ne continue pas tant que je n'ai pas répondu.**

---

## Argument

Argument attendu : `{scope}` parmi `init` ou `enrich`.

- `/backlog-bootstrap init` : à appeler AU DÉMARRAGE du projet, juste après `/project-start`. Le backlog est vide ou quasi vide. Cette invocation produit une **première vague** d'items pour amorcer le travail.
- `/backlog-bootstrap enrich` : à appeler PLUS TARD dans la vie du projet, quand on veut enrichir un backlog existant. Cette invocation s'appuie sur les versions livrées et le backlog existant pour proposer des items complémentaires.

Depuis `$ARGUMENTS`, extrais `SCOPE` (premier mot, insensible à la casse).

- Si `SCOPE` est vide → afficher l'aide intégrée (en bas de ce fichier) et arrêter.
- Si `SCOPE` n'est pas dans `{init, enrich}` → afficher l'aide avec la mention : « Scope inconnu : `{SCOPE}`. Did you mean : {suggestion} ? » et arrêter.

---

## Étape 1 — Lecture du contexte projet

Lis intégralement les deux fichiers suivants :

- `docs/project-description.md` — description du projet (cadrage, stack, architecture, modules, design).
- `CLAUDE.md` — référence opérationnelle du projet.

<context>
Si `/project-blueprint` a été utilisé en amont, `docs/project-description.md` contient les sections techniques complètes (Stack, Architecture, Modules, Design). Sinon, ces sections peuvent être incomplètes — c'est acceptable, mais le travail de cette skill sera moins riche : signale-le à l'utilisateur si tu détectes des sections vides ou très lacunaires.
</context>

### 1.1 — Gestion des fichiers manquants

- Si `docs/project-description.md` est introuvable :
  - Pour `SCOPE = init` → arrêter avec : « `docs/project-description.md` est introuvable. Cette skill ne peut pas amorcer un backlog sans contexte projet. Lance d'abord `/office-hours project` puis `/project-start`. »
  - Pour `SCOPE = enrich` → arrêter avec : « `docs/project-description.md` est introuvable. Cette skill ne peut pas enrichir un backlog sans contexte projet. »

- Si `CLAUDE.md` est introuvable, quel que soit le scope → arrêter avec : « `CLAUDE.md` est introuvable. Cette skill ne peut pas s'exécuter sans le fichier de référence projet. Lance `/project-start` pour le générer. »

<instructions>
Ne reformule rien à ce stade — la reformulation arrive à l'étape 3. Note simplement les éléments structurants : nom du projet, utilisateurs cibles, problème résolu, modules déclarés, hors-scope, contraintes techniques, mode(s) de fonctionnement, services externes, type de projet (Tauri / Electron / web / autre).
</instructions>

---

## Étape 2 — Lecture du contexte spécifique au scope

### 2.1 — Pour `SCOPE = init`

Vérifie l'état de `docs/backlog.md` :

- Si `docs/backlog.md` est introuvable → continue sans bloquer (le bloc à coller pourra être placé dans un nouveau fichier).
- Si `docs/backlog.md` existe et contient **moins de 5 items** (toutes catégories confondues) → continue.
- Si `docs/backlog.md` contient **5 items ou plus** → affiche :

  > Le backlog contient déjà {N} items. Tu voulais peut-être lancer `/backlog-bootstrap enrich` ? Réponds :
  >
  > - `continuer init` pour poursuivre quand même en mode init
  > - `basculer enrich` pour reprendre en mode enrichissement (je relis le contexte spécifique à enrich et je continue)
  > - `annuler` pour sortir de la skill

  Attends ma réponse.

  Traitement de la réponse :

  - `continuer init` → reste en `SCOPE = init`, passe à l'étape 3.
  - `basculer enrich` → modifie `SCOPE` en `enrich`, applique l'étape 2.2 (lecture du contexte enrich) puis continue normalement.
  - `annuler` → sors de la skill sans action supplémentaire.

### 2.2 — Pour `SCOPE = enrich`

Lis dans cet ordre :

- `docs/backlog.md` intégralement — pour connaître les items déjà au backlog.
- **Section « Items différés » de `docs/backlog.md`** s'il en contient une. Extrais cette liste séparément (item + date de report + raison du report fournie à l'époque). Conserve-la comme candidats à reconsidérer dans le travail de l'étape 4.
- Tous les fichiers `docs/archives/version-*.md` — pour comprendre ce qui a été livré dans les versions précédentes.
- `docs/roadmap.md` — pour identifier ce qui est planifié pour la version courante (ces items ne doivent **pas** être re-proposés).
- `docs/version-{VERSION}.md` s'il existe (version en cours, non archivée) — même règle : items non re-proposés.

<instructions>
Si `docs/backlog.md` est introuvable, signale : « `docs/backlog.md` est introuvable. En mode `enrich`, j'attends un backlog existant à enrichir. Lance plutôt `/backlog-bootstrap init` pour amorcer un backlog vierge. » et arrête.

Si `docs/archives/` n'existe pas ou est vide, signale : « Aucune version archivée détectée. Le mode `enrich` est plus efficace après au moins une livraison. Tu peux continuer quand même, mais les items proposés seront moins ancrés sur du retour réel. » Demande confirmation avant de continuer.

Si `docs/roadmap.md` est introuvable, signale-le et continue (sans filtre roadmap).

Si la section « Items différés » est absente du backlog, ce n'est pas une erreur — c'est simplement qu'aucun item n'a été différé jusqu'ici.
</instructions>

---

## Étape 3 — Reformulation du contexte et confirmation

Présente en 4 à 6 lignes ce que tu as compris du projet.

### 3.1 — Pour `SCOPE = init`

- Objectif du projet (problème résolu, valeur apportée).
- Utilisateurs cibles.
- Modules ou entités principaux déclarés.
- Périmètre de la v0.1 si identifiable depuis la description.

### 3.2 — Pour `SCOPE = enrich`

- Objectif du projet (rappel court).
- Ce qui a déjà été livré (versions archivées, items principaux par version).
- Ce qui est planifié dans la version courante (sans détailler les items).
- Ce qui semble manquer ou mériter d'être anticipé.
- Mention explicite si des items différés ont été détectés dans le backlog (« {M} items différés détectés, ils seront examinés pour réactivation éventuelle »).

### 3.3 — Validation

Termine par :

> Est-ce que ma compréhension est correcte ? Réponds `oui` pour continuer, ou corrige-moi.

**Attends ma réponse.** Si je corrige, prends en compte et reformule. Continue uniquement après validation explicite.

---

## Étape 4 — Génération d'items candidats

Cette étape est **interne** : tu réfléchis et tu listes, mais tu ne présentes rien encore à l'utilisateur. Le format de présentation est défini à l'étape 5.

<instructions>
Pour générer des items pertinents, inspire-toi de :

- Les modules déclarés dans `docs/project-description.md` et `CLAUDE.md`.
- Les fonctionnalités typiques d'applications similaires (à partir de tes connaissances uniquement, sans recherche web).
- Les cas limites probables pour le domaine métier (caractères spéciaux, données absentes, limites de taille, encodages, dates, fuseaux horaires, devises, doublons, accents, casse).
- Les besoins opérationnels classiques (import / export, validation de saisie, prévisualisation, recherche, filtrage, tri, pagination, archivage, audit, sauvegarde, restauration, journalisation).
- Les cas particuliers liés au type de projet :
  - Tauri / Electron : permissions OS, packaging, signature, mise à jour automatique, démarrage au boot, intégration tray, raccourcis clavier globaux.
  - Web : SEO, accessibilité, responsive, gestion d'état asynchrone, cache navigateur, performances.
  - Full-stack : authentification, gestion de sessions, rate limiting, gestion des erreurs réseau, mode dégradé hors ligne.
</instructions>

### 4.0 — (Conditionnel — projet scaffoldé) Items CRUD des entités scaffoldées

<instructions>
Cette sous-étape ne s'applique que si le dossier `scaffold/` existe à la racine. Sinon, ignore-la
entièrement : le comportement par défaut reste inchangé.

Lis `scaffold/csv/entities.csv` (colonnes `name`, `listTitle`/`menuTitle`, `screenPattern`). Pour
chaque entité scaffoldée **non encore couverte** par un item du backlog, de la roadmap ou de la version
courante, génère un **item CRUD candidat** dans la catégorie *Améliorations fonctionnelles*, par
exemple :

> Gérer les {libellé de l'entité} — liste et {création/édition, selon `screenPattern`}.

Le pattern d'écran de l'item découle directement du `screenPattern` de l'entité (`list` / `form` /
`list+form` — même vocabulaire des deux côtés, voir `.claude/docs/scaffolder-integration.md` §6).

Ces candidats traversent la **même validation** à l'étape 5 que les autres items. Ne duplique pas
une entité déjà couverte. La génération du code de ces items se fera plus tard via `/scaffold`
(déclenché par `/item-start`).
</instructions>

### 4.1 — Pour `SCOPE = init`

Vise **15 à 25 items** répartis en trois catégories. Il est attendu que les trois catégories soient peuplées — si tu n'as pas d'idées dans une catégorie, signale-le mais ne force pas le remplissage.

- **Améliorations fonctionnelles** : items qui étendent le périmètre v0.1 (fonctionnalités utiles non incluses, options de confort, raffinements UX).
- **Bugs probables / cas limites** : situations à anticiper (caractères spéciaux, données absentes, limites de taille, encodage, internationalisation, comportements en mode dégradé).
- **Questions ouvertes** : décisions à trancher avant ou pendant le développement, formulées en interrogative (ex : « Faut-il prévoir un mode hors ligne dès la v0.1 ? »).

### 4.2 — Pour `SCOPE = enrich` — nouveaux items

Vise **8 à 15 nouveaux items**, en privilégiant :

- Les items qui s'inspirent des retours probables après livraison de la dernière version (frictions UX, demandes d'extension, patterns observés).
- Les items qui complètent des modules existants (fonctionnalités secondaires non encore traitées, options manquantes).
- Les items qui anticipent une montée en charge ou un changement d'usage (volumétrie, multi-utilisateur, intégration avec d'autres outils).
- Les questions ouvertes liées spécifiquement à ce qui a été livré (ex : « Le module X gagnerait-il à exposer une API d'import en masse ? »).

Réparti dans les mêmes trois catégories que pour `init`.

### 4.3 — Pour `SCOPE = enrich` — réactivation d'items différés

<instructions>
En plus des nouveaux items générés en 4.2, examine les items différés extraits à l'étape 2.2. Pour chaque item différé :

1. Évalue si le contexte projet a évolué depuis le report (versions livrées, modules ajoutés, retours utilisateurs probables, changement de périmètre).
2. Si l'évolution rend l'item à nouveau pertinent, retiens-le comme **candidat à réactiver**. La raison du report initial doit être conservée pour pouvoir la rappeler à l'utilisateur lors de la présentation à l'étape 5.
3. Si l'évolution ne change rien (la raison du report tient toujours), n'inclus pas l'item dans les candidats à présenter — il reste différé sans nouvelle décision.

Les items réactivés viennent **en plus** des 8 à 15 nouveaux items, sans plafond strict mais en restant raisonnable (typiquement 0 à 5 réactivations par session). Ils traversent la même validation à l'étape 5 (`garder` / `préciser` / `reformuler` / `différer` avec nouvelle raison / `écarter`).
</instructions>

### 4.4 — Filtre roadmap (uniquement pour `SCOPE = enrich`)

<instructions>
Avant de présenter les items, élimine ceux qui sont déjà planifiés dans `docs/roadmap.md` ou dans le fichier de version courante. Un item est considéré comme « déjà planifié » s'il recouvre substantiellement le périmètre d'un item roadmap, même s'il est formulé différemment. En cas de doute, garde l'item — l'utilisateur tranchera à l'étape 5.

Élimine également les items qui dupliquent un item déjà présent dans le backlog actif. Même règle : en cas de doute, garde-le. Cette règle ne s'applique pas aux items différés réactivés (par construction, ils sont déjà dans le backlog, mais en section différée).
</instructions>

### 4.5 — Tri par pertinence

Trie l'ensemble des items à présenter (nouveaux + réactivés s'il y en a) dans l'ordre de pertinence décroissante, indépendamment de la catégorie. La pertinence se juge sur :

1. La probabilité que l'item soit retenu (collé à des modules déclarés, à des cas d'usage explicites).
2. L'impact métier (priorité aux items qui débloquent des cas d'usage, plutôt qu'aux raffinements esthétiques).
3. La maturité de la formulation (items concrets et bornés avant items vagues ou exploratoires).

Cet ordre sera utilisé pour la validation item par item à l'étape 5.

---

## Étape 5 — Validation item par item

### 5.1 — Annonce du protocole

Avant de présenter le premier item, affiche :

> Je vais te présenter les {N} items un par un, dans l'ordre de pertinence décroissante. Pour chacun, réponds :
>
> - `garder` — l'item est conservé tel quel dans le backlog actif
> - `préciser` — tu apportes des précisions courtes (contexte, nuance, correction), je les intègre dans la formulation existante sans tout réécrire, l'item enrichi est conservé dans le backlog actif
> - `reformuler` — tu dictes une nouvelle formulation, je remplace l'item par celle-ci, l'item reformulé est conservé dans le backlog actif
> - `différer` — l'item est pertinent dans l'absolu mais écarté du backlog actif pour des raisons circonstancielles (hors scope v0.1, trop tôt, coût/valeur insuffisant à ce stade). Je te demanderai immédiatement la raison du report en une phrase.
> - `écarter` — l'item est rejeté définitivement, non conservé.
>
> Si tu veux accélérer, tu peux à tout moment répondre :
>
> - `tout valider` — je conserve tous les items restants tels quels (dans le backlog actif) et je passe à l'étape suivante
> - `tout écarter restant` — je rejette tous les items restants et je passe à l'étape suivante
>
> Prêt ?

**Attends mon accord avant de commencer.** Ne présente pas le premier item sans réponse.

### 5.2 — Boucle de validation

Présente chaque item dans l'ordre de pertinence décroissante. Format pour chaque item :

> **Item {i}/{N} — Catégorie : {Améliorations | Bugs probables / cas limites | Questions ouvertes}**
>
> {Si item PRÉCÉDEMMENT DIFFÉRÉ : ⟲ Item précédemment différé le {date initiale} — Raison du report initial : « {raison initiale} »}
>
> {Formulation de l'item, une à trois phrases.}
>
> Réponse : `garder`, `préciser`, `reformuler`, `différer`, `écarter`, `tout valider`, ou `tout écarter restant` ?

<instructions>
Pour chaque réponse :

- `garder` → marque l'item comme conservé dans le backlog actif, passe au suivant.
- `préciser` → demande les précisions (« Quelles précisions souhaites-tu apporter ? »). L'utilisateur fournit du contexte additionnel, une nuance, ou une correction ponctuelle. Intègre ces précisions dans la formulation existante : tu **complètes**, **modifies** ou **corriges** ce qui est déjà là, sans repartir de zéro. Re-présente l'item enrichi pour validation, attends `garder`, un nouvel ajustement (`préciser` à nouveau pour itérer), ou un changement de verbe (`reformuler`, `différer`, `écarter`).
- `reformuler` → demande la nouvelle formulation (« Comment souhaites-tu le reformuler ? »). L'utilisateur dicte une nouvelle version qui remplace intégralement l'ancienne. Re-présente l'item reformulé pour validation, attends `garder` ou un nouvel ajustement.
- `différer` → demande immédiatement la raison du report en une phrase courte (« Quelle est la raison du report ? Une phrase courte suffit. »). Mémorise l'item, la raison fournie, et la date du jour (`YYYY-MM-DD`). Passe au suivant. Pour un item précédemment différé qui est à nouveau différé, la **nouvelle** raison et la **nouvelle** date remplacent les anciennes dans le bloc final.
- `écarter` → marque l'item comme rejeté définitivement, passe au suivant.
- `tout valider` → marque tous les items restants (item courant inclus, sauf s'il vient d'être traité) comme conservés dans le backlog actif, sors de la boucle.
- `tout écarter restant` → marque tous les items restants (item courant inclus, sauf s'il vient d'être traité) comme rejetés, sors de la boucle.

Toute autre réponse : redemande la décision sans avancer.

Distinction `préciser` vs `reformuler` : `préciser` part de la formulation existante et l'enrichit (tu fais le travail d'intégration intelligente), `reformuler` la remplace intégralement (l'utilisateur fait le travail de réécriture). En cas d'ambiguïté sur le verbe choisi par l'utilisateur, demande confirmation plutôt que de deviner.

Ne groupe jamais la validation. Item par item, c'est plus long mais c'est ce qui garantit la qualité du backlog.
</instructions>

### 5.3 — Vérification post-boucle

À la sortie de la boucle, compte les items conservés (backlog actif) et les items différés (avec raison). Si les deux compteurs sont à zéro :

> Aucun item retenu ni différé. Tu veux que je relance une nouvelle proposition (par exemple en élargissant le périmètre ou en changeant l'angle), ou tu préfères sortir ?

Attends ma réponse. Si je veux relancer, retourne à l'étape 4 ; sinon, sors de la skill.

---

## Étape 6 — Génération du bloc Markdown final

À partir des items conservés et différés, produis un bloc Markdown structuré, prêt à être collé dans `docs/backlog.md`.

**Format strict :**

```markdown
## Améliorations

- {Item court formulé clairement (avec contexte si nécessaire en note entre parenthèses)}
- ...

## Bugs probables / cas limites

- {Item court formulé clairement}
- ...

## Questions ouvertes

- {Question formulée en interrogative}
- ...

## Items différés

> Items pertinents dans l'absolu mais écartés du backlog actif pour des raisons
> circonstancielles (hors scope v0.1, trop tôt, coût/valeur insuffisant à ce stade).
> À reconsidérer au fil de l'évolution du projet.

- **{Item}** — différé le {date du jour YYYY-MM-DD} : {raison du report fournie par l'utilisateur}
- ...
```

<instructions>
- Si une catégorie ne contient aucun item conservé après validation, **omets entièrement** cette catégorie du bloc (titre + contenu). Cette règle vaut aussi pour la section « Items différés » : si aucun item n'a été différé, ne pas inclure cette section.
- Reprends la formulation telle qu'elle a été validée (après `garder`, `préciser` ou `reformuler`) à l'étape 5. N'introduis pas de nouvelles informations.
- Garde une formulation concise — une à deux lignes par item maximum, exception faite des questions ouvertes qui peuvent nécessiter un peu plus de contexte.
- Conserve l'ordre interne aux catégories tel qu'il résulte du tri par pertinence (étape 4.5), même si la validation a sauté des items.
- Pour la section « Items différés », trie les items par date décroissante (plus récents en haut). En cas d'ex æquo (même date du jour), conserve l'ordre de validation.
</instructions>

---

## Étape 7 — Présentation et instructions

Présente le bloc avec ce message exact :

> Voici le bloc à coller dans `docs/backlog.md`.
>
> - Pour `SCOPE = init` : écrase le contenu actuel des sections correspondantes (le backlog est vierge ou quasi vierge).
> - Pour `SCOPE = enrich` : ajoute aux sections existantes en respectant les rubriques, sans dupliquer les items déjà présents. Si des items précédemment différés ont été réactivés (déplacés vers une catégorie active) ou re-différés avec une nouvelle raison, pense à retirer leur ancienne entrée de la section « Items différés » avant de coller la nouvelle.
>
> Si tu veux ajuster le bloc avant de le coller, dis-le-moi.

Si je demande des ajustements, modifie le bloc et représente-le. Boucle jusqu'à validation explicite ou sortie. Sinon, sors de la skill.

---

## Règle absolue

<instructions>
Cette skill N'ÉCRIT JAMAIS dans aucun fichier du projet. Elle produit uniquement un bloc Markdown à coller. C'est l'utilisateur qui décide où et quand le coller dans `docs/backlog.md`. Aucune commande `Write`, `Edit`, ni manipulation de fichier autorisée pendant l'exécution. Aucun `git add` ni `git commit`.
</instructions>

---

## Aide intégrée

```
/backlog-bootstrap — Amorce ou enrichit le backlog d'un projet

Scopes disponibles :

  init      Amorce le backlog au démarrage du projet (après /project-start).
            Vise 15 à 25 items répartis en trois catégories
            (Améliorations / Bugs probables / Questions ouvertes).

  enrich    Enrichit un backlog existant en cours de vie du projet.
            Vise 8 à 15 nouveaux items, en s'appuyant sur ce qui a
            déjà été livré (versions archivées) et sur le backlog
            existant. Examine aussi les items précédemment différés
            pour proposer une éventuelle réactivation.

Mécanisme de validation par item (étape 5) :

  garder      conserve l'item dans le backlog actif
  préciser    enrichit la formulation existante (contexte, nuance,
              correction) sans tout réécrire ; conserve l'item
  reformuler  remplace intégralement la formulation par une nouvelle
              dictée par l'utilisateur ; conserve l'item
  différer    pertinent mais hors scope ; archive l'item dans la
              section "Items différés" avec date et raison du report
  écarter     rejette l'item définitivement

Usage : /backlog-bootstrap <scope>

La skill produit un bloc Markdown à coller dans docs/backlog.md.
Elle n'écrit pas dans le fichier elle-même.
```
