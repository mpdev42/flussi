---
model: opus
effort: high
---

# /premortem — Anticiper les modes d'échec avant engagement

## Confirmation du modèle

Cette skill est conçue pour Opus en effort `high`.

Affiche-moi ce rappel :

> Calibrage attendu : **Opus**, effort **`high`** (ton réglage habituel). Si ce n'est pas ton réglage actif, tape `/model opus` et/ou `/effort high` avant de répondre `ok`.

**Attends ma confirmation explicite (`ok`, `go`, ou équivalent). Ne continue pas tant que je n'ai pas répondu.**

---

## Argument

Argument attendu : `{scope}` parmi `project` ou `version {VERSION}`.

- `/premortem project` : appelée AVANT `/project-start`, après que `docs/project-description.md` est complète (cadrage initial + cadrage technique). Vise un projet entier.
- `/premortem version {VERSION}` : appelée APRÈS `/version-start {VERSION}` et AVANT `/document-validation version {VERSION}`. Vise une version structurante.

Depuis `$ARGUMENTS`, extrais `SCOPE` (premier mot, insensible à la casse) et, si `SCOPE = version`, `VERSION` (deuxième token, format `X.Y.Z`).

- Si `SCOPE` est vide → afficher l'aide intégrée (en bas de ce fichier) et arrêter.
- Si `SCOPE` n'est pas dans `{project, version}` → afficher l'aide avec la mention : « Scope inconnu : `{SCOPE}`. Did you mean : {suggestion} ? » et arrêter.
- Si `SCOPE = version` et `VERSION` absente ou mal formée → afficher l'aide avec la mention : « Scope `version` requiert un numéro de version au format `X.Y.Z`. » et arrêter.

---

## Étape 1 — Annonce et démarrage

Affiche un court préambule à l'utilisateur :

- Le scope retenu (`project` ou `version {VERSION}`).
- Le rappel du cadre psychologique : « Nous allons nous projeter à 6 mois. Ce {projet|version} a échoué. Nous cherchons pourquoi. »
- Le rappel des étapes : lecture du contexte → vérification du seuil minimum → génération des modes d'échec → validation → instruction parallèle → synthèse → rapport.
- Le rappel : la skill produit un rapport `docs/premortem/premortem-{scope}-{date}.md`. Aucune autre modification de fichier.

**Attends mon `ok` avant de poursuivre.**

---

## Étape 2 — Lecture du contexte

La liste des fichiers à lire dépend du scope, parce que le contexte disponible diffère radicalement entre l'avant-bootstrap et l'après-bootstrap.

### Pour `SCOPE = project`

À ce stade du Cycle 1, `/project-start` n'a pas encore tourné. `CLAUDE.md`, `docs/roadmap.md`, `docs/backlog.md` n'existent pas. Seul le cadrage manuel est disponible.

Lis :
1. `docs/project-description.md` — cadrage initial complet (cadrage métier ET cadrage technique)

Vérifie que les sections techniques (Stack, Architecture, Modules, Déploiement) sont remplies. Si elles ne le sont pas, arrête la skill et signale : « `/project-blueprint` doit avoir été passée et le bloc technique collé dans `docs/project-description.md` avant `/premortem project`. »

### Pour `SCOPE = version`

À ce stade du Cycle 2, le projet est bootstrappé et la version est initialisée. Lis dans cet ordre :

1. `CLAUDE.md` — architecture, stack, conventions
2. `docs/project-description.md` — cadrage initial
3. `docs/version-{VERSION}.md` — items prévus pour la version
4. `docs/roadmap.md` — pour situer la version dans l'arc général

### Synthèse (commune aux deux scopes)

Note explicitement ce que tu retiens en trois lignes :

```markdown
- **Objet du pre-mortem** : {1 phrase pour décrire le projet ou la version}
- **Utilisateurs ciblés** : {qui — commerciaux, direction, support, externe ?}
- **Critère de succès retenu** : {comment on saura que c'est réussi}
```

Demande confirmation que cette synthèse est correcte. **Attends ma réponse avant de continuer.**

Si l'une des trois lignes ne peut pas être remplie depuis les fichiers lus (information manquante), pose UNE question ciblée pour la combler. Pas de questionnaire — un trou à la fois, jusqu'à ce que les trois lignes soient remplies.

---

## Étape 3 — Génération des modes d'échec (raw pre-mortem)

Génère une liste exhaustive mais non padded de modes d'échec. Chaque mode :

- 1 à 2 phrases maximum
- Spécifique à CE projet (pas un conseil générique applicable partout)
- Ancré dans les détails du cadrage lu à l'étape 2
- Représente une menace réelle (pas un edge case improbable)

Le nombre dépend du projet. Certains en ont 4, d'autres 9. Ne pad pas pour atteindre un quota, ne tronque pas pour faire court.

### Angles à considérer (guides, pas catégories obligatoires)

Sans imposer ces catégories dans la sortie, balaye mentalement les angles suivants pour ne pas en oublier un :

<angles>
**Angles « utilisateurs internes captifs »** (les commerciaux, la direction, le support du cabinet)
- Non-adoption : l'outil livré, mais l'utilisateur reste sur Excel, le papier, ou son outil actuel
- Mismatch workflow : l'outil ne s'insère pas dans la séquence quotidienne réelle
- Friction d'onboarding : les premiers utilisateurs abandonnent et le bouche-à-oreille tue le déploiement
- Asymétrie de perception : la direction trouve l'outil utile, le terrain ne l'utilise pas
- Charge de saisie : le ratio temps de saisie / valeur perçue penche du mauvais côté

**Angles « secteur courtage »**
- Conformité ACPR / RGPD / IDD / devoir de conseil / traçabilité des actes
- Saisonnalité métier : échéances annuelles, périodes de souscription, pics de renouvellement
- Intégration backoffice : extranets compagnies, formats EDI, outils comptables internes
- Hypothèses sur les données : qualité, complétude, format réel du portefeuille ≠ ce qui était imaginé
- Dépendance fournisseurs : APIs compagnies en panne, formats qui changent sans préavis

**Angles « solo dev »**
- Surestimation de la propre vélocité : la version prévue en 3 semaines en prend 8
- Maintenance impossible solo : un bug critique tombe pendant un congé
- Bug critique non détecté en QA solo : pas de second œil, pas de panel de testeurs
- Délai qui rend l'outil obsolète : un besoin qui a évolué pendant le développement

**Angles « techniques »**
- Stack qui ne tient pas l'usage réel : perfs Tauri/Electron, taille du bundle, démarrage à froid
- Mise à jour qui casse en clientèle : signature, certificats, déploiement Tauri/Electron
- Migration de données ratée : schéma DB modifié sans plan de bascule
- Choix techniques verrouillants : dépendance abandonnée, ORM qui ne suit plus
</angles>

### Présentation à l'utilisateur

Présente les modes d'échec sous forme de liste numérotée :

```markdown
## Modes d'échec identifiés ({N})

1. {mode 1 — 1-2 phrases}
2. {mode 2 — 1-2 phrases}
...
```

Demande mon avis. **Attends ma réponse.**

Trois actions possibles de ma part :

- **`ok`** ou équivalent → on passe à l'étape 4
- **« supprime le N° X »** → tu retires ce mode
- **« ajoute : … »** → tu ajoutes un mode que j'ai en tête
- **« reformule le N° X : … »** → tu reformules

Ré-affiche la liste après ajustement et attends de nouveau mon validation.

---

## Étape 4 — Instruction parallèle des modes d'échec

Pour chaque mode validé, invoque `premortem-agent` **en parallèle** (un agent par mode, simultanément, pas en série).

Pour chaque invocation, passe au sub-agent :

- Le mode d'échec à instruire (texte exact validé à l'étape 3)
- Le scope (`project` ou `version {VERSION}`)
- Le bloc de contexte synthétisé à l'étape 2 (objet, utilisateurs, critère de succès)

<instructions>
Lancement parallèle obligatoire. Ne lance jamais les agents en série — cela double le wall-clock et permet aux récits précédents d'influencer les suivants, ce qui réduit la diversité des angles trouvés.
</instructions>

Attends que tous les sub-agents aient terminé avant de passer à l'étape 5.

---

## Étape 5 — Synthèse

Lis l'ensemble des récits produits par les sub-agents. Produis la synthèse en quatre blocs.

### Bloc 1 — Échec le plus probable

Lequel des modes instruits a la plus forte probabilité de se réaliser, compte tenu du cadrage du projet, du contexte cabinet, et des hypothèses sous-jacentes remontées par les sub-agents ? Pourquoi ? 3 à 5 phrases.

### Bloc 2 — Échec le plus dangereux

Lequel causerait le plus de dégâts s'il se réalisait, même si moins probable ? Quels dégâts précisément (perte de confiance des commerciaux, sanction ACPR, perte de données, blocage de production) ? 3 à 5 phrases.

### Bloc 3 — Hypothèse cachée

À travers les récits, quelle est l'unique hypothèse la plus profonde — celle si évidente pour l'utilisateur qu'il a oublié que c'était une hypothèse ? UNE phrase. Cette section est souvent celle qui apporte le plus de valeur, soigne-la.

### Bloc 4 — Plan révisé

3 à 7 modifications concrètes à apporter au projet ou à la version pour neutraliser ou détecter les modes d'échec instruits.

<instructions>
Chaque révision doit être une action que je peux exécuter cette semaine. Pas « envisager de tester », mais « faire valider la maquette par 3 commerciaux avant de coder ». Pas « surveiller la performance », mais « ajouter un log Sentry sur le démarrage à froid Tauri ». Chaque révision doit pointer vers le mode d'échec qu'elle adresse.
</instructions>

### Bloc 5 — Checklist avant exécution

3 à 5 cases à cocher AVANT de commencer le code (ou pour la version, avant de lancer le premier `/item-start`). Vérifications ponctuelles, pas des tâches longues.

---

## Étape 6 — Écriture du rapport

Crée le dossier `docs/premortem/` s'il n'existe pas.

Écris le rapport dans `docs/premortem/premortem-{scope}-{date YYYY-MM-DD}.md`. Pour `SCOPE = version`, le nom est `premortem-v{VERSION}-{date}.md`.

Format strict du rapport :

```markdown
# Pre-mortem — {scope lisible} — {date}

## Contexte

- **Objet** : {1 phrase}
- **Utilisateurs** : {qui}
- **Critère de succès** : {comment on saura}

## Synthèse

### Échec le plus probable

{bloc 1}

### Échec le plus dangereux

{bloc 2}

### Hypothèse cachée

{bloc 3}

### Plan révisé

- {révision 1} — adresse : {mode N° X}
- {révision 2} — adresse : {mode N° Y}
- ...

### Checklist avant exécution

- [ ] {vérif 1}
- [ ] {vérif 2}
- ...

---

## Modes d'échec instruits

{Pour chaque mode, copier intégralement la sortie du sub-agent : titre, histoire, hypothèse sous-jacente, signaux faibles}
```

---

## Étape 7 — Présentation finale

Présente à l'utilisateur uniquement la section *Synthèse* du rapport (les 5 blocs), pas les modes détaillés. Termine par :

> Rapport complet écrit dans `docs/premortem/{nom-du-fichier}.md`. Décide maintenant : (a) on intègre les révisions du plan dans le cadrage avant de continuer, (b) on continue sans rien changer (le rapport reste comme trace), (c) on annule ou diffère le {projet|version}.

**Attends ma décision.** Si je choisis (a), liste les fichiers à modifier (`docs/project-description.md`, `docs/roadmap.md`, `docs/version-{VERSION}.md` selon le scope) et propose les diffs précis. Si je choisis (b) ou (c), sors de la skill sans modification supplémentaire.

---

## Règle absolue

<instructions>
Cette skill ne modifie qu'UN seul fichier : le rapport de pre-mortem dans `docs/premortem/`. Toute modification du cadrage projet, de la roadmap ou du fichier de version se fait en étape 7 UNIQUEMENT après ma décision explicite, et avec proposition de diff que je valide. Aucune écriture silencieuse dans `docs/project-description.md`, `docs/roadmap.md` ou `docs/version-{VERSION}.md` pendant les étapes 1 à 6.
</instructions>

---

## Aide intégrée

```
/premortem — Anticiper les modes d'échec avant engagement

Scopes disponibles :

  project              Pre-mortem d'un projet entier (à appeler avant
                       /project-start, après que project-description.md
                       est complète)
  version {VERSION}    Pre-mortem d'une version (à appeler après
                       /version-start, avant /document-validation version)

Usage : /premortem <scope> [version]

Exemples :
  /premortem project
  /premortem version 0.2.0
```
